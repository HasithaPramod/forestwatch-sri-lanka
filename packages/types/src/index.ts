export const APP_LOCALES = ['en', 'si', 'ta'] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_APP_LOCALE: AppLocale = 'en';

export function isAppLocale(value: string): value is AppLocale {
  return (APP_LOCALES as readonly string[]).includes(value);
}

export function parseAppLocale(value: string | null | undefined): AppLocale {
  return value && isAppLocale(value) ? value : DEFAULT_APP_LOCALE;
}

export const AUTHENTICATED_ROLES = [
  'CITIZEN',
  'VOLUNTEER',
  'ORGANIZATION_MANAGER',
  'FOREST_OFFICER',
  'ADMIN',
  'SUPER_ADMIN',
] as const;

export type AuthenticatedRole = (typeof AUTHENTICATED_ROLES)[number];

export const ACTOR_KINDS = ['GUEST', ...AUTHENTICATED_ROLES] as const;

export type ActorKind = (typeof ACTOR_KINDS)[number];

export const STORAGE_PROVIDER_NAMES = ['local', 'supabase', 's3'] as const;

export type StorageProviderName = (typeof STORAGE_PROVIDER_NAMES)[number];

export const LOCATION_VISIBILITY = ['PUBLIC_EXACT', 'PUBLIC_APPROXIMATE', 'OFFICER_ONLY'] as const;

export type LocationVisibility = (typeof LOCATION_VISIBILITY)[number];

export const GEO_PROXIMITY_STATUSES = [
  'ON_SITE',
  'NEARBY',
  'REMOTE',
  'LOCATION_UNAVAILABLE',
] as const;

export type GeoProximityStatus = (typeof GEO_PROXIMITY_STATUSES)[number];

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown[];
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: PaginationMeta | Record<string, unknown>;
};

export type ApiFailure = {
  success: false;
  error: ApiErrorBody;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type HealthStatus = {
  status: 'ok' | 'degraded';
  service: string;
  timestamp: string;
  storageProvider: StorageProviderName | 'unconfigured';
};

export type ReadinessStatus = HealthStatus & {
  checks: {
    storage: 'ok' | 'error';
    database: 'ok' | 'skipped' | 'error';
  };
};

export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  locale: AppLocale;
  emailVerifiedAt: string | null;
  roles: AuthenticatedRole[];
};

export type AccessTokenClaims = {
  sub: string;
  email: string;
  roles: AuthenticatedRole[];
  sid: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: 'Bearer';
  user: PublicUser;
};

export type AuthSessionSummary = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  current: boolean;
};

export type RegisterResult = {
  user: PublicUser;
  emailVerificationRequired: true;
  verificationUrl?: string;
};

export type PasswordResetQueued = {
  queued: true;
  resetUrl?: string;
};

export type EmailVerificationQueued = {
  queued: true;
  verificationUrl?: string;
};

export type LocationKind = 'province' | 'district' | 'dsd' | 'gnd';

export type LocationDivision = {
  kind: LocationKind;
  code: string;
  nameEn: string;
  nameSi: string;
  nameTa: string;
  parentCode?: string;
};

export type LocationCatalogueStats = {
  provinces: number;
  districts: number;
  dsds: number;
  gnds: number;
  source: 'sl-gnd-dsd-districts';
};

export type LocationListPage = {
  items: LocationDivision[];
};

export const CAMPAIGN_STATUSES = ['DRAFT', 'UPCOMING', 'ACTIVE', 'COMPLETED', 'ARCHIVED'] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CAMPAIGN_VISIBILITIES = ['PUBLIC', 'PRIVATE'] as const;

export type CampaignVisibility = (typeof CAMPAIGN_VISIBILITIES)[number];

export const PUBLIC_CAMPAIGN_STATUSES = ['UPCOMING', 'ACTIVE', 'COMPLETED'] as const;

export type PublicCampaignStatus = (typeof PUBLIC_CAMPAIGN_STATUSES)[number];

export type CampaignOrganizer = {
  id: string;
  name: string;
  slug: string;
};

export type PublicImage = {
  url: string;
  thumbnailUrl: string;
};

export type PlantationImageSummary = PublicImage & {
  id: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  createdAt: string;
};

export type CampaignEligibleLocations = {
  provinceCodes: string[];
  districtCodes: string[];
};

export type CampaignSummary = {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: CampaignStatus;
  visibility: CampaignVisibility;
  startDate: string;
  endDate: string | null;
  targetTrees: number | null;
  targetAreaHectares: number | null;
  organizer: CampaignOrganizer | null;
  plantationCount: number;
  bannerImageUrl: string | null;
  bannerThumbnailUrl: string | null;
};

export type CampaignDetail = CampaignSummary & {
  bannerImageKey: string | null;
  eligibleLocations: CampaignEligibleLocations | null;
  createdAt: string;
  updatedAt: string;
  editable: boolean;
};

export type CampaignListPage = {
  items: CampaignSummary[];
  meta: PaginationMeta;
};

export const NATIVE_STATUSES = ['NATIVE', 'ENDEMIC', 'INTRODUCED', 'UNKNOWN'] as const;

export type NativeStatus = (typeof NATIVE_STATUSES)[number];

export type SpeciesSummary = {
  id: string;
  scientificName: string;
  commonEnglishName: string;
  sinhalaName: string;
  tamilName: string;
  nativeStatus: NativeStatus;
  description: string;
  imageKey: string | null;
  imageUrl: string | null;
  imageThumbnailUrl: string | null;
  active: boolean;
  plantationRecordCount: number;
};

export type SpeciesDetail = SpeciesSummary & {
  editable: boolean;
};

export type SpeciesListPage = {
  items: SpeciesSummary[];
  meta: PaginationMeta;
};

export const PLANTATION_TYPES = ['INDIVIDUAL_TREE', 'PLANTATION_SITE'] as const;

export type PlantationType = (typeof PLANTATION_TYPES)[number];

export const PLANTATION_VERIFICATION_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'VERIFIED',
  'REJECTED',
] as const;

export type PlantationVerificationStatus = (typeof PLANTATION_VERIFICATION_STATUSES)[number];

export const COORDINATE_PRECISIONS = ['exact', 'approximate', 'hidden'] as const;

export type CoordinatePrecision = (typeof COORDINATE_PRECISIONS)[number];

export type PlantationCoordinates = {
  latitude: number | null;
  longitude: number | null;
  precision: CoordinatePrecision;
};

export type PlantationSpeciesEntry = {
  speciesId: string;
  scientificName: string;
  commonEnglishName: string;
  sinhalaName: string;
  tamilName: string;
  nativeStatus: NativeStatus;
  quantity: number;
};

export type PlantationSummary = {
  id: string;
  name: string;
  description: string | null;
  type: PlantationType;
  plantingDate: string;
  treeCount: number;
  areaHectares: number | null;
  provinceCode: string | null;
  districtCode: string | null;
  dsdCode: string | null;
  gndCode: string | null;
  verificationStatus: PlantationVerificationStatus;
  locationVisibility: LocationVisibility;
  coordinates: PlantationCoordinates;
  campaign: { id: string; name: string; slug: string } | null;
  organization: { id: string; name: string; slug: string } | null;
  species: PlantationSpeciesEntry[];
  coverImage: PublicImage | null;
};

export const HEALTH_CONDITIONS = [
  'HEALTHY',
  'FAIR',
  'STRESSED',
  'DAMAGED',
  'PARTIALLY_DEAD',
  'DEAD',
  'MISSING',
  'UNKNOWN',
] as const;

export type HealthCondition = (typeof HEALTH_CONDITIONS)[number];

export const MONITORING_VERIFICATION_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'] as const;

export type MonitoringVerificationStatus = (typeof MONITORING_VERIFICATION_STATUSES)[number];

export type CurrentHealth = {
  updateId: string;
  healthStatus: HealthCondition;
  observedAt: string;
  estimatedSurvivingTrees: number | null;
  estimatedDeadTrees: number | null;
};

export type PlantationDetail = PlantationSummary & {
  clientUuid: string | null;
  createdAt: string;
  updatedAt: string;
  editable: boolean;
  images: PlantationImageSummary[];
  currentHealth: CurrentHealth | null;
};

export type MonitoringImageSummary = PlantationImageSummary;

export type MonitoringObserver = {
  id: string;
  displayName: string;
};

export type MonitoringUpdateSummary = {
  id: string;
  plantationId: string;
  observedAt: string;
  createdAt: string;
  healthStatus: HealthCondition;
  observation: string;
  estimatedSurvivingTrees: number | null;
  estimatedDeadTrees: number | null;
  estimatedHeightCm: number | null;
  locationValidation: GeoProximityStatus;
  distanceFromPlantation: number | null;
  latitude: number | null;
  longitude: number | null;
  gpsAccuracyMeters: number | null;
  verificationStatus: MonitoringVerificationStatus;
  observer: MonitoringObserver;
  coverImage: PublicImage | null;
};

export type MonitoringUpdateDetail = MonitoringUpdateSummary & {
  clientUuid: string | null;
  images: MonitoringImageSummary[];
  editable: boolean;
};

export type MonitoringListPage = {
  items: MonitoringUpdateSummary[];
  meta: PaginationMeta;
};

export type PlantationListPage = {
  items: PlantationSummary[];
  meta: PaginationMeta;
};

export type MapPlantationMarker = {
  id: string;
  name: string;
  type: PlantationType;
  verificationStatus: PlantationVerificationStatus;
  coordinates: PlantationCoordinates;
  treeCount: number;
  campaign: { id: string; name: string; slug: string } | null;
  coverThumbnailUrl: string | null;
};

export type MapBbox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type MapPlantationsPage = {
  items: MapPlantationMarker[];
  meta: {
    limit: number;
    returned: number;
    truncated: boolean;
    bbox: MapBbox;
  };
};

export type NearbyPlantation = MapPlantationMarker & {
  distanceMeters: number;
};

export type NearbyPlantationsPage = {
  items: NearbyPlantation[];
  meta: {
    limit: number;
    returned: number;
    truncated: boolean;
    latitude: number;
    longitude: number;
    radiusMeters: number;
  };
};

export const COMMENT_REACTION_TYPES = ['HELPFUL'] as const;

export type CommentReactionType = (typeof COMMENT_REACTION_TYPES)[number];

export type CommentAuthor = {
  id: string;
  displayName: string;
  officer: boolean;
};

export type CommentNode = {
  id: string;
  plantationId: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  author: CommentAuthor;
  helpfulCount: number;
  reacted: boolean;
  editable: boolean;
  replies: CommentNode[];
};

export type CommentListPage = {
  items: CommentNode[];
  meta: PaginationMeta;
};

export type CommentReportResult = {
  reported: true;
};

export const REPORT_CATEGORIES = [
  'DEAD_TREES',
  'DAMAGED_TREES',
  'FIRE_DAMAGE',
  'ILLEGAL_CUTTING',
  'MISSING_TREES',
  'WATER_SHORTAGE',
  'PEST_DISEASE',
  'INCORRECT_INFORMATION',
  'OTHER',
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const REPORT_STATUSES = ['OPEN', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'RESOLVED', 'REJECTED'] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_STATUS_TRANSITIONS: Record<ReportStatus, readonly ReportStatus[]> = {
  OPEN: ['UNDER_REVIEW', 'REJECTED'],
  UNDER_REVIEW: ['ACTION_REQUIRED', 'REJECTED'],
  ACTION_REQUIRED: ['RESOLVED', 'REJECTED'],
  RESOLVED: [],
  REJECTED: [],
};

export const REPORT_ADMIN_REOPEN_STATUS = 'UNDER_REVIEW' as const satisfies ReportStatus;

export type ReportImageSummary = PlantationImageSummary;

export type ReportPlantationRef = {
  id: string;
  name: string;
  provinceCode: string | null;
  districtCode: string | null;
};

export type ReportReporter = {
  id: string;
  displayName: string;
};

export type ReportSummary = {
  id: string;
  plantationId: string;
  category: ReportCategory;
  status: ReportStatus;
  description: string;
  createdAt: string;
  updatedAt: string;
  plantation: ReportPlantationRef;
  reporter: ReportReporter;
  coverImage: PublicImage | null;
};

export type ReportDetail = ReportSummary & {
  clientUuid: string | null;
  images: ReportImageSummary[];
  editable: boolean;
};

export type ReportListPage = {
  items: ReportSummary[];
  meta: PaginationMeta;
};

export const VERIFICATION_SUBJECT_TYPES = ['PLANTATION', 'MONITORING'] as const;

export type VerificationSubjectType = (typeof VERIFICATION_SUBJECT_TYPES)[number];

export const VERIFICATION_DECISIONS = ['VERIFIED', 'REJECTED', 'REQUEST_CORRECTION'] as const;

export type VerificationDecision = (typeof VERIFICATION_DECISIONS)[number];

export type VerificationActor = {
  id: string;
  displayName: string;
};

export type VerificationRecord = {
  id: string;
  subjectType: VerificationSubjectType;
  subjectId: string;
  decision: VerificationDecision;
  notes: string | null;
  createdAt: string;
  actor: VerificationActor;
};

export type VerificationListPage = {
  items: VerificationRecord[];
  meta: PaginationMeta;
};

export type ReviewQueuePlantationItem = {
  id: string;
  name: string;
  verificationStatus: PlantationVerificationStatus;
  provinceCode: string | null;
  districtCode: string | null;
  plantingDate: string;
  treeCount: number;
};

export type ReviewQueueMonitoringItem = {
  id: string;
  plantationId: string;
  plantationName: string;
  observedAt: string;
  healthStatus: HealthCondition;
  verificationStatus: MonitoringVerificationStatus;
  observer: MonitoringObserver;
};

export type ReviewQueuePage = {
  plantations: ReviewQueuePlantationItem[];
  monitoring: ReviewQueueMonitoringItem[];
};

export type InspectionImageSummary = PlantationImageSummary;

export type InspectionSummary = {
  id: string;
  plantationId: string;
  inspectedAt: string;
  createdAt: string;
  condition: HealthCondition;
  notes: string;
  recommendedAction: string | null;
  estimatedTreeCount: number | null;
  estimatedSurvivalPct: number | null;
  latitude: number | null;
  longitude: number | null;
  gpsAccuracyMeters: number | null;
  officer: VerificationActor;
  coverImage: PublicImage | null;
};

export type InspectionDetail = InspectionSummary & {
  clientUuid: string | null;
  images: InspectionImageSummary[];
  editable: boolean;
};

export const OFFLINE_SYNC_STATUSES = ['LOCAL_DRAFT', 'QUEUED', 'SYNCING', 'SYNCED', 'SYNC_FAILED'] as const;

export type OfflineSyncStatus = (typeof OFFLINE_SYNC_STATUSES)[number];

export const OFFLINE_ENTITY_KINDS = ['MONITORING', 'REPORT', 'INSPECTION'] as const;

export type OfflineEntityKind = (typeof OFFLINE_ENTITY_KINDS)[number];

export type InspectionListPage = {
  items: InspectionSummary[];
  meta: PaginationMeta;
};

export const NOTIFICATION_TYPES = [
  'CAMPAIGN_STARTED',
  'PLANTATION_VERIFIED',
  'PLANTATION_REJECTED',
  'MONITORING_VERIFIED',
  'MONITORING_REJECTED',
  'CORRECTION_REQUESTED',
  'COMMENT_REPLY',
  'REPORT_FILED',
  'REPORT_STATUS_CHANGED',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const PUSH_PLATFORMS = ['ios', 'android', 'web'] as const;

export type PushPlatform = (typeof PUSH_PLATFORMS)[number];

export type NotificationRecord = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationListPage = {
  items: NotificationRecord[];
  meta: PaginationMeta & { unreadCount: number };
};

export type NotificationPreference = {
  type: NotificationType;
  enabled: boolean;
};

export type NotificationPreferenceList = {
  items: NotificationPreference[];
};

export type PushDeviceRegistration = {
  registered: boolean;
  platform?: PushPlatform;
};

export const SEARCH_KINDS = [
  'plantation',
  'campaign',
  'organization',
  'species',
  'district',
  'dsd',
  'gnd',
] as const;

export type SearchKind = (typeof SEARCH_KINDS)[number];

export type SearchHit = {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string | null;
};

export type SearchPage = {
  items: SearchHit[];
  meta: PaginationMeta;
};

export type NamedCount = {
  key: string;
  label: string;
  trees: number;
};

export type CampaignProgressRow = {
  campaignId: string;
  name: string;
  slug: string;
  targetTrees: number | null;
  recordedTrees: number;
  plantationSites: number;
};

export type PublicImpactStats = {
  treesRecorded: number;
  verifiedTrees: number;
  estimatedSurvivingTrees: number | null;
  plantationsWithSurvivalEstimate: number;
  plantationSites: number;
  campaigns: number;
  organizations: number;
  contributors: number;
  verifiedMonitoringUpdates: number;
  treesByYear: NamedCount[];
  treesByDistrict: NamedCount[];
  treesBySpecies: NamedCount[];
  survivalTrends: NamedCount[];
  campaignProgress: CampaignProgressRow[];
};

export type MeDashboard = {
  plantations: number;
  monitoringUpdates: number;
  reports: number;
  unreadNotifications: number;
  organizations: Array<{
    id: string;
    name: string;
    plantations: number;
    treesRecorded: number;
  }>;
  forestQuest: ForestQuestFeature;
};

export type ForestQuestUnavailable = {
  available: false;
};

export type ForestDexSummary = {
  available: true;
  discoveredCount: number;
  catalogueCount: number;
};

export type ForestDexEntry = {
  speciesId: string;
  scientificName: string;
  commonEnglishName: string;
  sinhalaName: string;
  tamilName: string;
  nativeStatus: NativeStatus;
  discovered: boolean;
  discoveredAt: string | null;
  description: string | null;
  plantationId: string | null;
  location: PlantationCoordinates | null;
  verifiedEncounters: number;
};

export type ForestDex = ForestDexSummary & {
  entries: ForestDexEntry[];
};

export type PlantationDiscoveryItem = {
  plantationId: string;
  name: string;
  discoveredAt: string;
  location: PlantationCoordinates;
};

export type PlantationDiscoveryList = {
  available: true;
  items: PlantationDiscoveryItem[];
};

export type ForestQuestMissionsSummary = {
  available: true;
  activeCount: number;
  completedCount: number;
};

export type ForestQuestBadgesSummary = {
  available: true;
  awardedCount: number;
};

export type ForestQuestProfile = {
  available: true;
  confirmedXp: number;
  ecoPoints: number;
  level: number;
  displayTitle: string;
  nextTitle: string | null;
  pendingEvents: number;
  rewardsActive: true;
  forestDex: ForestDexSummary;
  missions: ForestQuestMissionsSummary;
  badges: ForestQuestBadgesSummary;
};

export type MissionTaskProgress = {
  id: string;
  title: string;
  sortOrder: number;
  completed: boolean;
  current: number;
  required: number;
};

export type MissionItem = {
  id: string;
  type: string;
  status: string;
  title: string;
  description: string;
  campaignId: string | null;
  userStatus: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED';
  completedTasks: number;
  totalTasks: number;
  tasks: MissionTaskProgress[];
};

export type MissionList = {
  available: true;
  items: MissionItem[];
};

export type BadgeItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  awarded: boolean;
  awardedAt: string | null;
};

export type BadgeList = {
  available: true;
  items: BadgeItem[];
};

export type ForestQuestFeature = ForestQuestUnavailable | ForestQuestProfile;

export type OfficerAssignmentSummary = {
  provinceCode: string | null;
  districtCode: string | null;
  dsdCode: string | null;
};

export type OfficerDashboard = {
  assignments: OfficerAssignmentSummary[];
  pendingPlantationReviews: number;
  pendingMonitoringReviews: number;
  openReports: number;
  recentInspections: Array<{
    id: string;
    plantationId: string;
    plantationName: string;
    inspectedAt: string;
    condition: string;
  }>;
  recentActivity: Array<{
    action: string;
    entityType: string;
    entityId: string;
    createdAt: string;
  }>;
  map: {
    items: Array<{
      id: string;
      name: string;
      latitude: number | null;
      longitude: number | null;
    }>;
    truncated: boolean;
  };
};

export type AdminDashboard = {
  users: number;
  officers: number;
  organizations: number;
  campaigns: number;
  treesRecorded: number;
  verifiedTrees: number;
  plantationSites: number;
  pendingPlantationReviews: number;
  pendingMonitoringReviews: number;
  reportsOpen: number;
  reportsTotal: number;
  auditLast24Hours: number;
  storageBytes: number;
  forestQuest: ForestQuestUnavailable;
};
