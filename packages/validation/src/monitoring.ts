import { PAGINATION } from '@forestwatch/config';
import {
  HEALTH_CONDITIONS,
  MONITORING_VERIFICATION_STATUSES,
  type HealthCondition,
  type MonitoringVerificationStatus,
} from '@forestwatch/types';
import { z } from 'zod';

const healthTuple = HEALTH_CONDITIONS as unknown as [HealthCondition, ...HealthCondition[]];
const monitoringVerificationTuple = MONITORING_VERIFICATION_STATUSES as unknown as [
  MonitoringVerificationStatus,
  ...MonitoringVerificationStatus[],
];

export const healthConditionSchema = z.enum(healthTuple);
export const monitoringVerificationStatusSchema = z.enum(monitoringVerificationTuple);

export const monitoringUpdatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.defaultPage),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.maxLimit)
    .default(PAGINATION.defaultLimit),
});

export const createMonitoringBodySchema = z
  .object({
    clientUuid: z.string().uuid().optional().nullable(),
    observedAt: z.coerce.date().optional(),
    latitude: z.number().gte(5).lte(10.5).optional().nullable(),
    longitude: z.number().gte(79).lte(82.5).optional().nullable(),
    gpsAccuracyMeters: z.number().positive().max(50_000).optional().nullable(),
    healthStatus: healthConditionSchema,
    estimatedSurvivingTrees: z.number().int().min(0).max(10_000_000).optional().nullable(),
    estimatedDeadTrees: z.number().int().min(0).max(10_000_000).optional().nullable(),
    estimatedHeightCm: z.number().positive().max(20_000).optional().nullable(),
    observation: z.string().trim().min(3).max(8000),
  })
  .strict()
  .superRefine((value, ctx) => {
    const hasLat = value.latitude != null;
    const hasLng = value.longitude != null;
    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'latitude and longitude must both be provided',
        path: hasLat ? ['longitude'] : ['latitude'],
      });
    }
  });

export type MonitoringUpdatesQuery = z.input<typeof monitoringUpdatesQuerySchema>;
export type ParsedMonitoringUpdatesQuery = z.output<typeof monitoringUpdatesQuerySchema>;
export type ParsedCreateMonitoringBody = z.output<typeof createMonitoringBodySchema>;

export type CreateMonitoringBody = {
  clientUuid?: string | null;
  observedAt?: string;
  latitude?: number | null;
  longitude?: number | null;
  gpsAccuracyMeters?: number | null;
  healthStatus: HealthCondition;
  estimatedSurvivingTrees?: number | null;
  estimatedDeadTrees?: number | null;
  estimatedHeightCm?: number | null;
  observation: string;
};
