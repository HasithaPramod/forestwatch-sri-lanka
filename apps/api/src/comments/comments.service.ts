import { Injectable, Optional } from '@nestjs/common';
import { isAdmin, isOfficer } from '@forestwatch/auth';
import { Prisma } from '@forestwatch/database';
import type {
  AuthenticatedRole,
  CommentAuthor,
  CommentListPage,
  CommentNode,
  CommentReactionType,
  CommentReportResult,
} from '@forestwatch/types';
import { buildPaginationMeta } from '@forestwatch/utils';
import type { ParsedCommentReactionBody, ParsedCommentsQuery, ParsedCreateCommentBody } from '@forestwatch/validation';
import type { RequestUser } from '../auth/types';
import { ApiException } from '../common/http/api-exception';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const authorSelect = {
  id: true,
  displayName: true,
  roles: { select: { role: { select: { code: true } } } },
} satisfies Prisma.UserSelect;

const reactionSelect = {
  userId: true,
  type: true,
} satisfies Prisma.CommentReactionSelect;

const commentInclude = {
  user: { select: authorSelect },
  reactions: { select: reactionSelect },
  replies: {
    include: {
      user: { select: authorSelect },
      reactions: { select: reactionSelect },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.CommentInclude;

type CommentRecord = Prisma.CommentGetPayload<{ include: typeof commentInclude }>;
type ReplyRecord = CommentRecord['replies'][number];
type PlantationAccess = {
  id: string;
  createdById: string;
  verificationStatus: string;
  organization: { createdById: string } | null;
};

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  async list(plantationId: string, query: ParsedCommentsQuery, user?: RequestUser): Promise<CommentListPage> {
    await this.requireVisiblePlantation(plantationId, user);
    const where: Prisma.CommentWhereInput = { plantationId, parentId: null };
    const [rows, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        include: commentInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.comment.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toNode(row, user)),
      meta: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
    };
  }

  async create(plantationId: string, input: ParsedCreateCommentBody, user: RequestUser): Promise<CommentNode> {
    await this.requireVisiblePlantation(plantationId, user);

    let parentUserId: string | null = null;
    if (input.parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: input.parentId },
        select: { id: true, plantationId: true, parentId: true, userId: true },
      });
      if (!parent || parent.plantationId !== plantationId) {
        throw new ApiException(404, 'COMMENT_NOT_FOUND', 'Parent comment not found');
      }
      if (parent.parentId) {
        throw new ApiException(400, 'VALIDATION_ERROR', 'Replies can only be added to a top-level comment');
      }
      parentUserId = parent.userId;
    }

    const created = await this.prisma.comment.create({
      data: {
        plantationId,
        userId: user.id,
        parentId: input.parentId ?? null,
        body: input.body,
      },
      include: commentInclude,
    });

    await this.audit('COMMENT_CREATED', user.id, created.id);
    if (parentUserId) {
      await this.notifications?.notify({
        userId: parentUserId,
        actorId: user.id,
        type: 'COMMENT_REPLY',
        title: 'New reply to your comment',
        body: input.body.slice(0, 180),
        payload: { plantationId, commentId: created.id, parentId: input.parentId },
      });
    }
    return this.toNode(created, user);
  }

  async remove(plantationId: string, commentId: string, user: RequestUser): Promise<{ deleted: true }> {
    await this.requireVisiblePlantation(plantationId, user);
    const comment = await this.findOnPlantation(plantationId, commentId);
    if (!this.canModerate(user, comment.userId)) {
      throw new ApiException(403, 'FORBIDDEN', 'Insufficient role');
    }

    await this.prisma.comment.delete({ where: { id: comment.id } });
    await this.audit('COMMENT_DELETED', user.id, comment.id);
    return { deleted: true };
  }

  async toggleReaction(
    plantationId: string,
    commentId: string,
    input: ParsedCommentReactionBody,
    user: RequestUser,
  ): Promise<CommentNode> {
    await this.requireVisiblePlantation(plantationId, user);
    await this.findOnPlantation(plantationId, commentId);
    const type: CommentReactionType = input.type;

    const existing = await this.prisma.commentReaction.findUnique({
      where: { commentId_userId_type: { commentId, userId: user.id, type } },
    });
    if (existing) {
      await this.prisma.commentReaction.delete({
        where: { commentId_userId_type: { commentId, userId: user.id, type } },
      });
      await this.audit('COMMENT_REACTION_REMOVED', user.id, commentId);
    } else {
      await this.prisma.commentReaction.create({
        data: { commentId, userId: user.id, type },
      });
      await this.audit('COMMENT_REACTION_ADDED', user.id, commentId);
    }

    const updated = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: commentInclude,
    });
    if (!updated) {
      throw new ApiException(404, 'COMMENT_NOT_FOUND', 'Comment not found');
    }
    return this.toNode(updated, user);
  }

  async report(plantationId: string, commentId: string, user: RequestUser): Promise<CommentReportResult> {
    await this.requireVisiblePlantation(plantationId, user);
    const comment = await this.findOnPlantation(plantationId, commentId);
    if (comment.userId === user.id) {
      throw new ApiException(400, 'VALIDATION_ERROR', 'You cannot report your own comment');
    }

    await this.prisma.auditLog.create({
      data: {
        action: 'COMMENT_REPORTED',
        actorId: user.id,
        entityType: 'comment',
        entityId: comment.id,
        metadata: { plantationId },
      },
    });
    return { reported: true };
  }

  private async findOnPlantation(plantationId: string, commentId: string) {
    if (!UUID_RE.test(commentId)) {
      throw new ApiException(404, 'COMMENT_NOT_FOUND', 'Comment not found');
    }
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, plantationId: true, userId: true },
    });
    if (!comment || comment.plantationId !== plantationId) {
      throw new ApiException(404, 'COMMENT_NOT_FOUND', 'Comment not found');
    }
    return comment;
  }

  private async requireVisiblePlantation(plantationId: string, user?: RequestUser): Promise<PlantationAccess> {
    if (!UUID_RE.test(plantationId)) {
      throw new ApiException(404, 'PLANTATION_NOT_FOUND', 'Plantation not found');
    }
    const plantation = await this.prisma.plantation.findUnique({
      where: { id: plantationId },
      select: {
        id: true,
        createdById: true,
        verificationStatus: true,
        organization: { select: { createdById: true } },
      },
    });
    if (!plantation || !this.canViewPlantation(user, plantation)) {
      throw new ApiException(404, 'PLANTATION_NOT_FOUND', 'Plantation not found');
    }
    return plantation;
  }

  private canViewPlantation(user: RequestUser | undefined, plantation: PlantationAccess): boolean {
    if (plantation.verificationStatus === 'VERIFIED') {
      return true;
    }
    if (!user) {
      return false;
    }
    if (isOfficer(user.roles) || isAdmin(user.roles)) {
      return true;
    }
    return plantation.createdById === user.id || plantation.organization?.createdById === user.id;
  }

  private canModerate(user: RequestUser, authorId: string): boolean {
    return user.id === authorId || isOfficer(user.roles) || isAdmin(user.roles);
  }

  private async audit(action: string, actorId: string, entityId: string): Promise<void> {
    await this.prisma.auditLog.create({
      data: { action, actorId, entityType: 'comment', entityId },
    });
  }

  private toNode(row: CommentRecord | ReplyRecord, user?: RequestUser): CommentNode {
    const helpful = row.reactions.filter((reaction) => reaction.type === 'HELPFUL');
    const replies = 'replies' in row ? row.replies.map((reply) => this.toNode(reply, user)) : [];
    return {
      id: row.id,
      plantationId: row.plantationId,
      parentId: row.parentId,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      author: toAuthor(row.user),
      helpfulCount: helpful.length,
      reacted: Boolean(user && helpful.some((reaction) => reaction.userId === user.id)),
      editable: Boolean(user && this.canModerate(user, row.userId)),
      replies,
    };
  }
}

function toAuthor(user: { id: string; displayName: string; roles: Array<{ role: { code: string } }> }): CommentAuthor {
  const roles = user.roles.map((row) => row.role.code) as AuthenticatedRole[];
  return {
    id: user.id,
    displayName: user.displayName,
    officer: isOfficer(roles),
  };
}
