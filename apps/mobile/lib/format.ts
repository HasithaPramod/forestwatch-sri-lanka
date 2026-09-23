import type {
  CoordinatePrecision,
  GeoProximityStatus,
  HealthCondition,
  OfflineSyncStatus,
  ReportCategory,
  ReportStatus,
  VerificationDecision,
} from '@forestwatch/types';

const HEALTH_LABELS: Record<HealthCondition, string> = {
  HEALTHY: 'Healthy',
  FAIR: 'Fair',
  STRESSED: 'Stressed',
  DAMAGED: 'Damaged',
  PARTIALLY_DEAD: 'Partially dead',
  DEAD: 'Dead',
  MISSING: 'Missing',
  UNKNOWN: 'Unknown',
};

const PROXIMITY_LABELS: Record<GeoProximityStatus, string> = {
  ON_SITE: 'On site',
  NEARBY: 'Nearby',
  REMOTE: 'Remote',
  LOCATION_UNAVAILABLE: 'Location unavailable',
};

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  DEAD_TREES: 'Dead trees',
  DAMAGED_TREES: 'Damaged trees',
  FIRE_DAMAGE: 'Fire damage',
  ILLEGAL_CUTTING: 'Illegal cutting',
  MISSING_TREES: 'Missing trees',
  WATER_SHORTAGE: 'Water shortage',
  PEST_DISEASE: 'Pest or disease',
  INCORRECT_INFORMATION: 'Incorrect information',
  OTHER: 'Other',
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  OPEN: 'Open',
  UNDER_REVIEW: 'Under review',
  ACTION_REQUIRED: 'Action required',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
};

const DECISION_LABELS: Record<VerificationDecision, string> = {
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
  REQUEST_CORRECTION: 'Correction requested',
};

export function formatHealth(status: HealthCondition): string {
  return HEALTH_LABELS[status];
}

export function formatProximity(status: GeoProximityStatus): string {
  return PROXIMITY_LABELS[status];
}

export function formatReportCategory(category: ReportCategory): string {
  return CATEGORY_LABELS[category];
}

export function formatReportStatus(status: ReportStatus): string {
  return STATUS_LABELS[status];
}

export function formatVerificationDecision(decision: VerificationDecision): string {
  return DECISION_LABELS[decision];
}

export function formatDistanceMeters(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatRecordedTrees(count: number): string {
  return `${count.toLocaleString('en-LK')} recorded trees`;
}

export function formatCoordinates(
  latitude: number | null,
  longitude: number | null,
  precision: CoordinatePrecision,
): string {
  if (precision === 'hidden' || latitude == null || longitude == null) {
    return 'Coordinates withheld';
  }
  const digits = precision === 'approximate' ? 3 : 4;
  const suffix = precision === 'approximate' ? ' (approximate)' : '';
  return `${latitude.toFixed(digits)}, ${longitude.toFixed(digits)}${suffix}`;
}

export function formatSurvivalEstimate(surviving: number | null, dead: number | null): string | null {
  if (surviving == null && dead == null) {
    return null;
  }
  const parts = [];
  if (surviving != null) {
    parts.push(`${surviving.toLocaleString('en-LK')} estimated surviving`);
  }
  if (dead != null) {
    parts.push(`${dead.toLocaleString('en-LK')} estimated dead`);
  }
  return `${parts.join(' · ')}. This is an observation estimate, not a verified survival total.`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(iso));
}

const OFFLINE_LABELS: Record<OfflineSyncStatus, string> = {
  LOCAL_DRAFT: 'Local draft',
  QUEUED: 'Queued',
  SYNCING: 'Syncing',
  SYNCED: 'Synced',
  SYNC_FAILED: 'Sync failed',
};

export function formatOfflineStatus(status: OfflineSyncStatus): string {
  return OFFLINE_LABELS[status];
}
