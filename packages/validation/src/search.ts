import { PAGINATION } from '@forestwatch/config';
import { SEARCH_KINDS, type SearchKind } from '@forestwatch/types';
import { z } from 'zod';
import { districtCodeSchema, dsdCodeSchema, gndCodeSchema, provinceCodeSchema } from './locations';

const searchKindTuple = SEARCH_KINDS as unknown as [SearchKind, ...SearchKind[]];

export const searchKindSchema = z.enum(searchKindTuple);

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2).max(80),
  kind: searchKindSchema.optional(),
  page: z.coerce.number().int().min(1).default(PAGINATION.defaultPage),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.maxLimit)
    .default(PAGINATION.defaultLimit),
});

export const statsQuerySchema = z.object({
  provinceCode: provinceCodeSchema.optional(),
  districtCode: districtCodeSchema.optional(),
  dsdCode: dsdCodeSchema.optional(),
  gndCode: gndCodeSchema.optional(),
  campaignId: z.string().uuid().optional(),
  speciesId: z.string().uuid().optional(),
  year: z.coerce.number().int().min(1990).max(2100).optional(),
});

export type SearchQuery = z.input<typeof searchQuerySchema>;
export type ParsedSearchQuery = z.output<typeof searchQuerySchema>;
export type StatsQuery = z.input<typeof statsQuerySchema>;
export type ParsedStatsQuery = z.output<typeof statsQuerySchema>;
