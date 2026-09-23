import { PAGINATION } from '@forestwatch/config';
import {
  VERIFICATION_DECISIONS,
  VERIFICATION_SUBJECT_TYPES,
  type VerificationDecision,
  type VerificationSubjectType,
} from '@forestwatch/types';
import { z } from 'zod';

const subjectTuple = VERIFICATION_SUBJECT_TYPES as unknown as [
  VerificationSubjectType,
  ...VerificationSubjectType[],
];
const decisionTuple = VERIFICATION_DECISIONS as unknown as [VerificationDecision, ...VerificationDecision[]];

export const verificationSubjectTypeSchema = z.enum(subjectTuple);
export const verificationDecisionSchema = z.enum(decisionTuple);

export const verificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.defaultPage),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.maxLimit)
    .default(PAGINATION.defaultLimit),
  subjectType: verificationSubjectTypeSchema,
  subjectId: z.string().uuid(),
});

export const createVerificationBodySchema = z
  .object({
    subjectType: verificationSubjectTypeSchema,
    subjectId: z.string().uuid(),
    decision: verificationDecisionSchema,
    notes: z.string().trim().min(3).max(4000).optional().nullable(),
  })
  .strict();

export type VerificationsQuery = z.input<typeof verificationsQuerySchema>;
export type ParsedVerificationsQuery = z.output<typeof verificationsQuerySchema>;
export type ParsedCreateVerificationBody = z.output<typeof createVerificationBodySchema>;
export type CreateVerificationBody = {
  subjectType: VerificationSubjectType;
  subjectId: string;
  decision: VerificationDecision;
  notes?: string | null;
};
