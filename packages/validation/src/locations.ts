import { PAGINATION } from '@forestwatch/config';
import { z } from 'zod';

export const provinceCodeSchema = z
  .string()
  .trim()
  .regex(/^LK-[1-9]$/, 'provinceCode must be an ISO 3166-2 LK province code');

export const districtCodeSchema = z
  .string()
  .trim()
  .regex(/^LK-[1-9][1-5]$/, 'districtCode must be an ISO 3166-2 LK district code');

export const dsdCodeSchema = z
  .string()
  .trim()
  .regex(/^\d+-\d+-\d+$/, 'dsdCode must be a LIFe DSD prefix');

export const gndCodeSchema = z
  .string()
  .trim()
  .regex(/^\d+-\d+-\d+-\d+$/, 'gndCode must be a LIFe GND code');

export const districtsQuerySchema = z.object({
  provinceCode: provinceCodeSchema.optional(),
});

export const dsdsQuerySchema = z.object({
  districtCode: districtCodeSchema.optional(),
});

export const gndsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.defaultPage),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.maxLimit)
    .default(PAGINATION.defaultLimit),
  dsdCode: dsdCodeSchema,
  q: z.string().trim().min(1).max(80).optional(),
});

export type DistrictsQuery = z.input<typeof districtsQuerySchema>;
export type DsdsQuery = z.input<typeof dsdsQuerySchema>;
export type GndsQuery = z.input<typeof gndsQuerySchema>;
export type ParsedGndsQuery = z.output<typeof gndsQuerySchema>;
