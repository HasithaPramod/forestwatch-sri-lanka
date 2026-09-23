import { describe, expect, it } from 'vitest';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  FORESTQUEST_LEVEL_TITLES,
  FORESTQUEST_LEVELS,
  FORESTQUEST_REWARDS,
  GEO_PROXIMITY_METERS,
  IMAGE,
  MAP,
  API_PREFIX,
  REFRESH_TOKEN_TTL_SECONDS,
} from './index';

describe('config', () => {
  it('uses the versioned API prefix', () => {
    expect(API_PREFIX).toBe('/api/v1');
  });

  it('keeps geo thresholds in one place', () => {
    expect(GEO_PROXIMITY_METERS.onSiteMax).toBeLessThan(GEO_PROXIMITY_METERS.nearbyMax);
  });

  it('does not use Forest Ranger as a level title', () => {
    expect(FORESTQUEST_LEVEL_TITLES).toContain('Canopy Keeper');
    expect(FORESTQUEST_LEVEL_TITLES).not.toContain('Forest Ranger');
    expect(FORESTQUEST_LEVELS[0]?.minXp).toBe(0);
  });

  it('keeps ForestQuest reward amounts in configuration rather than controllers', () => {
    expect(FORESTQUEST_REWARDS.MONITORING_VERIFIED.xpAmount).toBe(100);
    expect(FORESTQUEST_REWARDS.MONITORING_VERIFIED.ecoPoints).toBe(10);
    expect(FORESTQUEST_REWARDS.PLANTATION_REGISTERED.xpAmount).toBe(0);
    expect(FORESTQUEST_REWARDS.PLANTATION_REGISTERED.ecoPoints).toBe(0);
  });

  it('keeps access tokens shorter-lived than refresh tokens', () => {
    expect(ACCESS_TOKEN_TTL_SECONDS).toBe(15 * 60);
    expect(REFRESH_TOKEN_TTL_SECONDS).toBeGreaterThan(ACCESS_TOKEN_TTL_SECONDS);
  });

  it('caps monitoring images at a 1600px long edge with a smaller thumbnail', () => {
    expect(IMAGE.maxLongEdge).toBe(1600);
    expect(IMAGE.thumbnailLongEdge).toBeGreaterThanOrEqual(300);
    expect(IMAGE.thumbnailLongEdge).toBeLessThanOrEqual(500);
    expect(IMAGE.maxMonitoringImages).toBeGreaterThan(0);
    expect(IMAGE.maxReportImages).toBeGreaterThan(0);
    expect(IMAGE.maxInspectionImages).toBeGreaterThan(0);
    expect(IMAGE.outputMimeType).toBe('image/webp');
  });

  it('caps map bbox payloads instead of dumping the plantation table', () => {
    expect(MAP.maxLimit).toBeLessThanOrEqual(500);
    expect(MAP.defaultLimit).toBeLessThanOrEqual(MAP.maxLimit);
    expect(MAP.maxNearbyMeters).toBeGreaterThan(MAP.defaultNearbyMeters);
  });
});
