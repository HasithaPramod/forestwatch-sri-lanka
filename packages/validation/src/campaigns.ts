import { PAGINATION } from '@forestwatch/config';
import { CAMPAIGN_STATUSES, CAMPAIGN_VISIBILITIES, type CampaignStatus, type CampaignVisibility } from '@forestwatch/types';
import { z } from 'zod';
import { districtCodeSchema, provinceCodeSchema } from './locations';

const campaignStatusTuple = CAMPAIGN_STATUSES as unknown as [CampaignStatus, ...CampaignStatus[]];

export const campaignStatusSchema = z.enum(campaignStatusTuple);

export const campaignVisibilitySchema = z.enum(CAMPAIGN_VISIBILITIES);

export const eligibleLocationsSchema = z.object({
  provinceCodes: z.array(provinceCodeSchema).max(9).default([]),
  districtCodes: z.array(districtCodeSchema).max(25).default([]),
});

export const campaignsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.defaultPage),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.maxLimit)
    .default(PAGINATION.defaultLimit),
  q: z.string().trim().min(1).max(80).optional(),
  status: campaignStatusSchema.optional(),
  scope: z.enum(['public', 'mine', 'all']).default('public'),
});

const campaignFieldsSchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(8000),
  organizerId: z.string().uuid().optional().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  targetTrees: z.number().int().positive().max(10_000_000).optional().nullable(),
  targetAreaHectares: z.number().positive().max(1_000_000).optional().nullable(),
  eligibleLocations: eligibleLocationsSchema.optional().nullable(),
  status: campaignStatusSchema.optional(),
  visibility: campaignVisibilitySchema.optional(),
});

function issueEndDateBeforeStart(
  value: { startDate?: Date; endDate?: Date | null },
  ctx: z.RefinementCtx,
): void {
  if (value.startDate && value.endDate && value.endDate < value.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'endDate must be on or after startDate',
      path: ['endDate'],
    });
  }
}

export const createCampaignBodySchema = campaignFieldsSchema
  .extend({
    status: campaignStatusSchema.optional().default('DRAFT'),
    visibility: campaignVisibilitySchema.optional().default('PUBLIC'),
  })
  .superRefine(issueEndDateBeforeStart);

export const updateCampaignBodySchema = campaignFieldsSchema.partial().superRefine((value, ctx) => {
  if (Object.keys(value).length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'At least one field is required',
    });
  }
  issueEndDateBeforeStart(value, ctx);
});

export type EligibleLocations = z.output<typeof eligibleLocationsSchema>;
export type CampaignsQuery = z.input<typeof campaignsQuerySchema>;
export type ParsedCampaignsQuery = z.output<typeof campaignsQuerySchema>;
export type ParsedCreateCampaignBody = z.output<typeof createCampaignBodySchema>;
export type ParsedUpdateCampaignBody = z.output<typeof updateCampaignBodySchema>;

export type CreateCampaignBody = {
  name: string;
  description: string;
  organizerId?: string | null;
  startDate: string;
  endDate?: string | null;
  targetTrees?: number | null;
  targetAreaHectares?: number | null;
  eligibleLocations?: {
    provinceCodes?: string[];
    districtCodes?: string[];
  } | null;
  status?: CampaignStatus;
  visibility?: CampaignVisibility;
};

export type UpdateCampaignBody = Partial<CreateCampaignBody>;
