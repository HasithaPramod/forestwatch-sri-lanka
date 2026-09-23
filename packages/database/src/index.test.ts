import { describe, expect, it } from 'vitest';
import { DATABASE_ENGINE, DATABASE_PACKAGE_PHASE, classifyProximity } from './index';

describe('database package', () => {
  it('is on Phase 2 with WGS 84', () => {
    expect(DATABASE_PACKAGE_PHASE).toBe(2);
    expect(DATABASE_ENGINE.srid).toBe(4326);
    expect(DATABASE_ENGINE.postgis).toBe(true);
  });
});

describe('classifyProximity', () => {
  it('uses configured meter bands and never trusts a missing fix', () => {
    expect(classifyProximity(null)).toBe('LOCATION_UNAVAILABLE');
    expect(classifyProximity(0)).toBe('ON_SITE');
    expect(classifyProximity(100)).toBe('ON_SITE');
    expect(classifyProximity(101)).toBe('NEARBY');
    expect(classifyProximity(500)).toBe('NEARBY');
    expect(classifyProximity(501)).toBe('REMOTE');
  });

  it('reads thresholds from arguments rather than hardcoding in callers', () => {
    expect(classifyProximity(40, { onSiteMax: 30, nearbyMax: 80 })).toBe('NEARBY');
  });
});
