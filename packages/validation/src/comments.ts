import { PAGINATION } from '@forestwatch/config';
import { COMMENT_REACTION_TYPES, type CommentReactionType } from '@forestwatch/types';
import { z } from 'zod';

const reactionTuple = COMMENT_REACTION_TYPES as unknown as [CommentReactionType, ...CommentReactionType[]];

export const commentReactionTypeSchema = z.enum(reactionTuple);

export const commentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.defaultPage),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.maxLimit)
    .default(PAGINATION.defaultLimit),
});

export const createCommentBodySchema = z
  .object({
    body: z.string().trim().min(1).max(2000),
    parentId: z.string().uuid().optional().nullable(),
  })
  .strict();

export const commentReactionBodySchema = z
  .object({
    type: commentReactionTypeSchema.optional().default('HELPFUL'),
  })
  .strict();

export type CommentsQuery = z.input<typeof commentsQuerySchema>;
export type ParsedCommentsQuery = z.output<typeof commentsQuerySchema>;
export type ParsedCreateCommentBody = z.output<typeof createCommentBodySchema>;
export type ParsedCommentReactionBody = z.output<typeof commentReactionBodySchema>;

export type CreateCommentBody = {
  body: string;
  parentId?: string | null;
};

export type CommentReactionBody = {
  type?: CommentReactionType;
};
