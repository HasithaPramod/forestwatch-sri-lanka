import { PAGINATION } from '@forestwatch/config';
import { NATIVE_STATUSES, type NativeStatus } from '@forestwatch/types';
import { z } from 'zod';

const nativeStatusTuple = NATIVE_STATUSES as unknown as [NativeStatus, ...NativeStatus[]];

export const nativeStatusSchema = z.enum(nativeStatusTuple);

export const speciesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.defaultPage),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.maxLimit)
    .default(PAGINATION.defaultLimit),
  q: z.string().trim().min(1).max(80).optional(),
  nativeStatus: nativeStatusSchema.optional(),
  includeInactive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

const speciesFieldsSchema = z.object({
  scientificName: z.string().trim().min(3).max(120),
  commonEnglishName: z.string().trim().min(1).max(80),
  sinhalaName: z.string().trim().min(1).max(80),
  tamilName: z.string().trim().min(1).max(80),
  nativeStatus: nativeStatusSchema.optional(),
  description: z.string().trim().min(10).max(8000),
  imageKey: z.string().trim().min(1).max(500).optional().nullable(), // ignored; keys are written only by the upload endpoints
  active: z.boolean().optional(),
});

export const createSpeciesBodySchema = speciesFieldsSchema.extend({
  nativeStatus: nativeStatusSchema.optional().default('UNKNOWN'),
  active: z.boolean().optional().default(true),
});

export const updateSpeciesBodySchema = speciesFieldsSchema.partial().superRefine((value, ctx) => {
  if (Object.keys(value).length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'At least one field is required',
    });
  }
});

export type SpeciesQuery = z.input<typeof speciesQuerySchema>;
export type ParsedSpeciesQuery = z.output<typeof speciesQuerySchema>;
export type ParsedCreateSpeciesBody = z.output<typeof createSpeciesBodySchema>;
export type ParsedUpdateSpeciesBody = z.output<typeof updateSpeciesBodySchema>;

export type CreateSpeciesBody = {
  scientificName: string;
  commonEnglishName: string;
  sinhalaName: string;
  tamilName: string;
  nativeStatus?: NativeStatus;
  description: string;
  imageKey?: string | null;
  active?: boolean;
};

export type UpdateSpeciesBody = Partial<CreateSpeciesBody>;
