import { PAGINATION } from '@forestwatch/config';
import type { HealthCondition } from '@forestwatch/types';
import { z } from 'zod';
import { healthConditionSchema } from './monitoring';

export const inspectionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.defaultPage),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.maxLimit)
    .default(PAGINATION.defaultLimit),
});

export const createInspectionBodySchema = z
  .object({
    clientUuid: z.string().uuid().optional().nullable(),
    inspectedAt: z.coerce.date().optional(),
    latitude: z.number().gte(5).lte(10.5).optional().nullable(),
    longitude: z.number().gte(79).lte(82.5).optional().nullable(),
    gpsAccuracyMeters: z.number().positive().max(10_000).optional().nullable(),
    estimatedTreeCount: z.number().int().nonnegative().max(10_000_000).optional().nullable(),
    estimatedSurvivalPct: z.number().min(0).max(100).optional().nullable(),
    condition: healthConditionSchema,
    notes: z.string().trim().min(8).max(8000),
    recommendedAction: z.string().trim().min(3).max(2000).optional().nullable(),
  })
  .strict();

export type InspectionsQuery = z.input<typeof inspectionsQuerySchema>;
export type ParsedInspectionsQuery = z.output<typeof inspectionsQuerySchema>;
export type ParsedCreateInspectionBody = z.output<typeof createInspectionBodySchema>;
export type CreateInspectionBody = {
  clientUuid?: string | null;
  inspectedAt?: string | Date;
  latitude?: number | null;
  longitude?: number | null;
  gpsAccuracyMeters?: number | null;
  estimatedTreeCount?: number | null;
  estimatedSurvivalPct?: number | null;
  condition: HealthCondition;
  notes: string;
  recommendedAction?: string | null;
};
