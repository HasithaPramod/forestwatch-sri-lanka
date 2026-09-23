import type { GeoProximityStatus, HealthCondition } from '@forestwatch/types';

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

export function formatHealth(status: HealthCondition): string {
  return HEALTH_LABELS[status];
}

export function formatProximity(status: GeoProximityStatus): string {
  return PROXIMITY_LABELS[status];
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
