import { PAGINATION } from '@forestwatch/config';
import {
  LOCATION_VISIBILITY,
  PLANTATION_TYPES,
  PLANTATION_VERIFICATION_STATUSES,
  type LocationVisibility,
  type PlantationType,
  type PlantationVerificationStatus,
} from '@forestwatch/types';
import { z } from 'zod';
import { districtCodeSchema, dsdCodeSchema, gndCodeSchema, provinceCodeSchema } from './locations';

const plantationTypeTuple = PLANTATION_TYPES as unknown as [PlantationType, ...PlantationType[]];
const verificationTuple = PLANTATION_VERIFICATION_STATUSES as unknown as [
  PlantationVerificationStatus,
  ...PlantationVerificationStatus[],
];
const visibilityTuple = LOCATION_VISIBILITY as unknown as [LocationVisibility, ...LocationVisibility[]];

export const plantationTypeSchema = z.enum(plantationTypeTuple);
export const plantationVerificationStatusSchema = z.enum(verificationTuple);
export const locationVisibilitySchema = z.enum(visibilityTuple);

export const plantationSpeciesInputSchema = z.object({
  speciesId: z.string().uuid(),
  quantity: z.number().int().positive().max(10_000_000),
});

export const plantationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.defaultPage),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.maxLimit)
    .default(PAGINATION.defaultLimit),
  q: z.string().trim().min(1).max(80).optional(),
  campaignId: z.string().uuid().optional(),
  speciesId: z.string().uuid().optional(),
  provinceCode: provinceCodeSchema.optional(),
  districtCode: districtCodeSchema.optional(),
  dsdCode: dsdCodeSchema.optional(),
  gndCode: gndCodeSchema.optional(),
  type: plantationTypeSchema.optional(),
  verificationStatus: plantationVerificationStatusSchema.optional(),
  scope: z.enum(['public', 'mine', 'assigned', 'all']).default('public'),
});

const plantationFieldsSchema = z.object({
  name: z.string().trim().min(3).max(160),
  description: z.string().trim().min(1).max(8000).optional().nullable(),
  type: plantationTypeSchema,
  campaignId: z.string().uuid().optional().nullable(),
  organizationId: z.string().uuid().optional().nullable(),
  clientUuid: z.string().uuid().optional().nullable(),
  latitude: z.number().gte(5).lte(10.5),
  longitude: z.number().gte(79).lte(82.5),
  provinceCode: provinceCodeSchema,
  districtCode: districtCodeSchema,
  dsdCode: dsdCodeSchema.optional().nullable(),
  gndCode: gndCodeSchema.optional().nullable(),
  plantingDate: z.coerce.date(),
  treeCount: z.number().int().positive().max(10_000_000),
  areaHectares: z.number().positive().max(1_000_000).optional().nullable(),
  locationVisibility: locationVisibilitySchema.optional(),
  verificationStatus: plantationVerificationStatusSchema.optional(),
  species: z.array(plantationSpeciesInputSchema).min(1).max(50),
});

function issueSpeciesTotal(
  value: { treeCount?: number; species?: Array<{ quantity: number }> },
  ctx: z.RefinementCtx,
): void {
  if (value.treeCount && value.species && value.species.length > 0) {
    const total = value.species.reduce((sum, row) => sum + row.quantity, 0);
    if (total !== value.treeCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'species quantities must sum to treeCount',
        path: ['species'],
      });
    }
  }
}

export const createPlantationBodySchema = plantationFieldsSchema
  .extend({
    locationVisibility: locationVisibilitySchema.optional().default('PUBLIC_APPROXIMATE'),
  })
  .superRefine(issueSpeciesTotal);

export const updatePlantationBodySchema = plantationFieldsSchema.partial().superRefine((value, ctx) => {
  if (Object.keys(value).length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'At least one field is required',
    });
  }
  issueSpeciesTotal(value, ctx);
});

export type PlantationsQuery = z.input<typeof plantationsQuerySchema>;
export type ParsedPlantationsQuery = z.output<typeof plantationsQuerySchema>;
export type ParsedCreatePlantationBody = z.output<typeof createPlantationBodySchema>;
export type ParsedUpdatePlantationBody = z.output<typeof updatePlantationBodySchema>;

export type CreatePlantationBody = {
  name: string;
  description?: string | null;
  type: PlantationType;
  campaignId?: string | null;
  organizationId?: string | null;
  clientUuid?: string | null;
  latitude: number;
  longitude: number;
  provinceCode: string;
  districtCode: string;
  dsdCode?: string | null;
  gndCode?: string | null;
  plantingDate: string;
  treeCount: number;
  areaHectares?: number | null;
  locationVisibility?: LocationVisibility;
  verificationStatus?: PlantationVerificationStatus;
  species: Array<{ speciesId: string; quantity: number }>;
};

export type UpdatePlantationBody = Partial<CreatePlantationBody>;
