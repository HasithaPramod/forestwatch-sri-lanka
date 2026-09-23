import { PAGINATION } from '@forestwatch/config';
import { z } from 'zod';

export {
  accessTokenClaimsSchema,
  clientChannelSchema,
  displayNameSchema,
  emailSchema,
  forgotPasswordBodySchema,
  localeSchema,
  loginBodySchema,
  logoutBodySchema,
  passwordSchema,
  refreshBodySchema,
  registerBodySchema,
  resendVerificationBodySchema,
  resetPasswordBodySchema,
  updateMeBodySchema,
  verifyEmailBodySchema,
} from './auth';
export type {
  ForgotPasswordBody,
  LoginBody,
  LogoutBody,
  RefreshBody,
  RegisterBody,
  ResendVerificationBody,
  ResetPasswordBody,
  UpdateMeBody,
  VerifyEmailBody,
} from './auth';

export {
  districtCodeSchema,
  districtsQuerySchema,
  dsdCodeSchema,
  dsdsQuerySchema,
  gndCodeSchema,
  gndsQuerySchema,
  provinceCodeSchema,
} from './locations';
export type { DistrictsQuery, DsdsQuery, GndsQuery, ParsedGndsQuery } from './locations';

export {
  campaignStatusSchema,
  campaignVisibilitySchema,
  campaignsQuerySchema,
  createCampaignBodySchema,
  eligibleLocationsSchema,
  updateCampaignBodySchema,
} from './campaigns';
export type {
  CampaignsQuery,
  CreateCampaignBody,
  EligibleLocations,
  ParsedCampaignsQuery,
  ParsedCreateCampaignBody,
  ParsedUpdateCampaignBody,
  UpdateCampaignBody,
} from './campaigns';

export {
  createSpeciesBodySchema,
  nativeStatusSchema,
  speciesQuerySchema,
  updateSpeciesBodySchema,
} from './species';
export type {
  CreateSpeciesBody,
  ParsedCreateSpeciesBody,
  ParsedSpeciesQuery,
  ParsedUpdateSpeciesBody,
  SpeciesQuery,
  UpdateSpeciesBody,
} from './species';

export {
  createPlantationBodySchema,
  locationVisibilitySchema,
  plantationTypeSchema,
  plantationVerificationStatusSchema,
  plantationsQuerySchema,
  updatePlantationBodySchema,
} from './plantations';
export type {
  CreatePlantationBody,
  ParsedCreatePlantationBody,
  ParsedPlantationsQuery,
  ParsedUpdatePlantationBody,
  PlantationsQuery,
  UpdatePlantationBody,
} from './plantations';

export {
  bboxQuerySchema,
  mapPlantationsQuerySchema,
  nearbyPlantationsQuerySchema,
} from './map';
export type {
  MapPlantationsQuery,
  NearbyPlantationsQuery,
  ParsedBbox,
  ParsedMapPlantationsQuery,
  ParsedNearbyPlantationsQuery,
} from './map';

export {
  createMonitoringBodySchema,
  healthConditionSchema,
  monitoringUpdatesQuerySchema,
  monitoringVerificationStatusSchema,
} from './monitoring';
export type {
  CreateMonitoringBody,
  MonitoringUpdatesQuery,
  ParsedCreateMonitoringBody,
  ParsedMonitoringUpdatesQuery,
} from './monitoring';

export {
  commentReactionBodySchema,
  commentReactionTypeSchema,
  commentsQuerySchema,
  createCommentBodySchema,
} from './comments';
export type {
  CommentReactionBody,
  CommentsQuery,
  CreateCommentBody,
  ParsedCommentReactionBody,
  ParsedCommentsQuery,
  ParsedCreateCommentBody,
} from './comments';

export {
  createReportBodySchema,
  reportCategorySchema,
  reportStatusSchema,
  reportsQuerySchema,
  updateReportBodySchema,
} from './reports';
export type {
  CreateReportBody,
  ParsedCreateReportBody,
  ParsedReportsQuery,
  ParsedUpdateReportBody,
  ReportsQuery,
  UpdateReportBody,
} from './reports';

export {
  createVerificationBodySchema,
  verificationDecisionSchema,
  verificationsQuerySchema,
  verificationSubjectTypeSchema,
} from './verifications';
export type {
  CreateVerificationBody,
  ParsedCreateVerificationBody,
  ParsedVerificationsQuery,
  VerificationsQuery,
} from './verifications';

export { createInspectionBodySchema, inspectionsQuerySchema } from './inspections';
export type {
  CreateInspectionBody,
  InspectionsQuery,
  ParsedCreateInspectionBody,
  ParsedInspectionsQuery,
} from './inspections';

export {
  notificationTypeSchema,
  notificationsQuerySchema,
  registerPushDeviceBodySchema,
  unregisterPushDeviceBodySchema,
  updateNotificationPreferencesBodySchema,
} from './notifications';
export type {
  NotificationsQuery,
  ParsedNotificationsQuery,
  ParsedUpdateNotificationPreferencesBody,
  RegisterPushDeviceBody,
  UnregisterPushDeviceBody,
  UpdateNotificationPreferencesBody,
} from './notifications';

export {
  searchKindSchema,
  searchQuerySchema,
  statsQuerySchema,
} from './search';
export type { ParsedSearchQuery, ParsedStatsQuery, SearchQuery, StatsQuery } from './search';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.defaultPage),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.maxLimit)
    .default(PAGINATION.defaultLimit),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const healthQuerySchema = z.object({}).strict();
