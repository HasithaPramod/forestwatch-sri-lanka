export const API_PREFIX = '/api/v1';

export const API_DOCS_PATH = '/api/docs';

export const PAGINATION = {
  defaultPage: 1,
  defaultLimit: 20,
  maxLimit: 100,
} as const;

/** Meter bands for on-site monitoring. Injected from config, not hardcoded in controllers. */
export const GEO_PROXIMITY_METERS = {
  onSiteMax: 100,
  nearbyMax: 500,
} as const;

export const POSTGIS_SRID = 4326;

export const DEFAULT_STORAGE_PROVIDER = 'local' as const;

export const IMAGE = {
  maxUploadBytes: 10 * 1024 * 1024,
  maxLongEdge: 1600,
  thumbnailLongEdge: 400,
  maxDimension: 8000,
  maxInputPixels: 40_000_000,
  maxPlantationImages: 12,
  maxMonitoringImages: 8,
  maxReportImages: 8,
  maxInspectionImages: 8,
  outputMimeType: 'image/webp',
} as const;

export const MAP = {
  defaultLimit: 200,
  maxLimit: 500,
  defaultNearbyMeters: 5_000,
  minNearbyMeters: 100,
  maxNearbyMeters: 50_000,
} as const;

export const FORESTQUEST_LEVELS = [
  { level: 1, title: 'Seedling', minXp: 0 },
  { level: 2, title: 'Sprout', minXp: 200 },
  { level: 3, title: 'Tree Guardian', minXp: 600 },
  { level: 4, title: 'Eco Explorer', minXp: 1200 },
  { level: 5, title: 'Canopy Keeper', minXp: 2500 },
  { level: 6, title: 'Forest Champion', minXp: 5000 },
] as const;

export const FORESTQUEST_LEVEL_TITLES = FORESTQUEST_LEVELS.map((row) => row.title);

/** Reward amounts live here, not in controllers. EcoPoints are non-monetary reputation. */
export const FORESTQUEST_REWARDS = {
  PLANTATION_DISCOVERED: { xpAmount: 50, ecoPoints: 5, requiresVerification: true },
  SPECIES_DISCOVERED: { xpAmount: 75, ecoPoints: 8, requiresVerification: true },
  MONITORING_SUBMITTED: { xpAmount: 0, ecoPoints: 0, requiresVerification: false },
  MONITORING_VERIFIED: { xpAmount: 100, ecoPoints: 10, requiresVerification: true },
  PLANTATION_REGISTERED: { xpAmount: 0, ecoPoints: 0, requiresVerification: false },
  PLANTATION_VERIFIED: { xpAmount: 50, ecoPoints: 5, requiresVerification: true },
  CAMPAIGN_JOINED: { xpAmount: 25, ecoPoints: 3, requiresVerification: false },
  CAMPAIGN_COMPLETED: { xpAmount: 100, ecoPoints: 10, requiresVerification: true },
  OFFICIAL_EVENT_PARTICIPATED: { xpAmount: 300, ecoPoints: 30, requiresVerification: true },
  REPORT_VERIFIED: { xpAmount: 150, ecoPoints: 15, requiresVerification: true },
  STEWARD_REVISIT_VERIFIED: { xpAmount: 200, ecoPoints: 20, requiresVerification: true },
} as const;

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 14 * 24 * 60 * 60;
export const EMAIL_VERIFICATION_TTL_SECONDS = 24 * 60 * 60;
export const PASSWORD_RESET_TTL_SECONDS = 60 * 60;

export const REFRESH_COOKIE_NAME = 'forestwatch_refresh';
export const AUTH_RATE_LIMIT = {
  limit: 10,
  windowMs: 15 * 60 * 1000,
} as const;
