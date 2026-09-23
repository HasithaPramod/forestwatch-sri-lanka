import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  commentReactionBodySchema,
  commentsQuerySchema,
  createCommentBodySchema,
  type ParsedCommentReactionBody,
  type ParsedCommentsQuery,
  type ParsedCreateCommentBody,
} from '@forestwatch/validation';
import { CurrentUser, OptionalUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { RequestUser } from '../auth/types';
import { ZodValidationPipe } from '../common/http/zod.pipe';
import { CommentsService } from './comments.service';

@ApiTags('comments')
@Controller('plantations/:plantationId/comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List comments on a plantation. Guests may read; posting requires authentication.' })
  list(
    @Param('plantationId') plantationId: string,
    @Query(new ZodValidationPipe(commentsQuerySchema)) query: ParsedCommentsQuery,
    @OptionalUser() user?: RequestUser,
  ) {
    return this.comments.list(plantationId, query, user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CITIZEN', 'VOLUNTEER', 'ORGANIZATION_MANAGER', 'FOREST_OFFICER', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Post a comment or a one-level reply. Anonymous posting is not allowed.' })
  create(
    @Param('plantationId') plantationId: string,
    @Body(new ZodValidationPipe(createCommentBodySchema)) body: ParsedCreateCommentBody,
    @CurrentUser() user: RequestUser,
  ) {
    return this.comments.create(plantationId, body, user);
  }

  @Delete(':commentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CITIZEN', 'VOLUNTEER', 'ORGANIZATION_MANAGER', 'FOREST_OFFICER', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a comment you authored, or moderate as an officer or admin.' })
  remove(
    @Param('plantationId') plantationId: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.comments.remove(plantationId, commentId, user);
  }

  @Post(':commentId/reactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CITIZEN', 'VOLUNTEER', 'ORGANIZATION_MANAGER', 'FOREST_OFFICER', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle a Helpful reaction. Guests cannot react.' })
  toggleReaction(
    @Param('plantationId') plantationId: string,
    @Param('commentId') commentId: string,
    @Body(new ZodValidationPipe(commentReactionBodySchema)) body: ParsedCommentReactionBody,
    @CurrentUser() user: RequestUser,
  ) {
    return this.comments.toggleReaction(plantationId, commentId, body, user);
  }

  @Post(':commentId/report')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CITIZEN', 'VOLUNTEER', 'ORGANIZATION_MANAGER', 'FOREST_OFFICER', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Record a comment report in the audit log. Plantation issue reports use POST /plantations/:id/reports.',
  })
  report(
    @Param('plantationId') plantationId: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.comments.report(plantationId, commentId, user);
  }
}
