import { MAP } from '@forestwatch/config';
import { z } from 'zod';
import { districtCodeSchema, dsdCodeSchema, gndCodeSchema, provinceCodeSchema } from './locations';
import { plantationTypeSchema, plantationVerificationStatusSchema } from './plantations';

export const bboxQuerySchema = z
  .string()
  .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, 'bbox must be west,south,east,north')
  .transform((value, ctx) => {
    const [west, south, east, north] = value.split(',').map(Number) as [number, number, number, number];
    if (![west, south, east, north].every((part) => Number.isFinite(part))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'bbox must be west,south,east,north' });
      return z.NEVER;
    }
    if (west >= east || south >= north) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'bbox must have west < east and south < north' });
      return z.NEVER;
    }
    return { west, south, east, north };
  });

const mapFiltersSchema = {
  campaignId: z.string().uuid().optional(),
  speciesId: z.string().uuid().optional(),
  provinceCode: provinceCodeSchema.optional(),
  districtCode: districtCodeSchema.optional(),
  dsdCode: dsdCodeSchema.optional(),
  gndCode: gndCodeSchema.optional(),
  type: plantationTypeSchema.optional(),
  verificationStatus: plantationVerificationStatusSchema.optional(),
  q: z.string().trim().min(1).max(80).optional(),
};

export const mapPlantationsQuerySchema = z.object({
  bbox: bboxQuerySchema,
  limit: z.coerce.number().int().min(1).max(MAP.maxLimit).default(MAP.defaultLimit),
  ...mapFiltersSchema,
});

export const nearbyPlantationsQuerySchema = z.object({
  lat: z.coerce.number().gte(-90).lte(90),
  lng: z.coerce.number().gte(-180).lte(180),
  radiusMeters: z.coerce
    .number()
    .int()
    .min(MAP.minNearbyMeters)
    .max(MAP.maxNearbyMeters)
    .default(MAP.defaultNearbyMeters),
  limit: z.coerce.number().int().min(1).max(MAP.maxLimit).default(MAP.defaultLimit),
  ...mapFiltersSchema,
});

export type ParsedBbox = z.output<typeof bboxQuerySchema>;
export type MapPlantationsQuery = z.input<typeof mapPlantationsQuerySchema>;
export type ParsedMapPlantationsQuery = z.output<typeof mapPlantationsQuerySchema>;
export type NearbyPlantationsQuery = z.input<typeof nearbyPlantationsQuerySchema>;
export type ParsedNearbyPlantationsQuery = z.output<typeof nearbyPlantationsQuerySchema>;
