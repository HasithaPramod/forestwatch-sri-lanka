import { PAGINATION } from '@forestwatch/config';
import {
  REPORT_CATEGORIES,
  REPORT_STATUSES,
  type ReportCategory,
  type ReportStatus,
} from '@forestwatch/types';
import { z } from 'zod';

const categoryTuple = REPORT_CATEGORIES as unknown as [ReportCategory, ...ReportCategory[]];
const statusTuple = REPORT_STATUSES as unknown as [ReportStatus, ...ReportStatus[]];

export const reportCategorySchema = z.enum(categoryTuple);
export const reportStatusSchema = z.enum(statusTuple);

export const reportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.defaultPage),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.maxLimit)
    .default(PAGINATION.defaultLimit),
  plantationId: z.string().uuid().optional(),
  category: reportCategorySchema.optional(),
  status: reportStatusSchema.optional(),
  scope: z.enum(['mine', 'assigned', 'all']).optional(),
});

export const createReportBodySchema = z
  .object({
    clientUuid: z.string().uuid().optional().nullable(),
    category: reportCategorySchema,
    description: z.string().trim().min(8).max(8000),
  })
  .strict();

export const updateReportBodySchema = z
  .object({
    status: reportStatusSchema,
  })
  .strict();

export type ReportsQuery = z.input<typeof reportsQuerySchema>;
export type ParsedReportsQuery = z.output<typeof reportsQuerySchema>;
export type ParsedCreateReportBody = z.output<typeof createReportBodySchema>;
export type ParsedUpdateReportBody = z.output<typeof updateReportBodySchema>;

export type CreateReportBody = {
  clientUuid?: string | null;
  category: ReportCategory;
  description: string;
};

export type UpdateReportBody = {
  status: ReportStatus;
};
