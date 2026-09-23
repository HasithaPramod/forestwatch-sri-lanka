import { describe, expect, it } from 'vitest';
import { formatCoordinates, formatDistanceMeters, formatHealth, formatSurvivalEstimate } from './format';
import { bboxAround, isInSriLanka, mapBboxForFix, SRI_LANKA_BBOX } from './geo';
import { canVerifyRecords, defaultReportsScope, nextReportStatuses } from './permissions';
import { resolvePublicApiUrl } from './api-url';

describe('mobile field helpers', () => {
  it('labels distances from the API in metres then kilometres', () => {
    expect(formatDistanceMeters(18)).toBe('18 m');
    expect(formatDistanceMeters(2400)).toBe('2.4 km');
  });

  it('does not invent coordinates for hidden points', () => {
    expect(formatCoordinates(null, null, 'hidden')).toBe('Coordinates withheld');
  });

  it('keeps survival estimates separate from recorded trees', () => {
    expect(formatSurvivalEstimate(1180, 70)).toContain('observation estimate');
    expect(formatHealth('HEALTHY')).toBe('Healthy');
  });

  it('uses the national bbox when GPS is missing or outside Sri Lanka', () => {
    expect(mapBboxForFix(null)).toBe(SRI_LANKA_BBOX);
    expect(isInSriLanka(51.5, -0.1)).toBe(false);
    expect(mapBboxForFix({ latitude: 51.5, longitude: -0.1 })).toBe(SRI_LANKA_BBOX);
    expect(bboxAround(6.1964, 81.2203)).toBe('80.8703,5.8464,81.5703,6.5464');
  });

  it('does not let citizens verify records', () => {
    expect(
      canVerifyRecords({
        id: 'c',
        email: 'c@localhost',
        displayName: 'C',
        locale: 'en',
        emailVerifiedAt: null,
        roles: ['CITIZEN'],
      }),
    ).toBe(false);
  });

  it('defaults officers to assigned reports and blocks OPEN to RESOLVED', () => {
    expect(
      defaultReportsScope({
        id: 'o',
        email: 'o@localhost',
        displayName: 'O',
        locale: 'en',
        emailVerifiedAt: null,
        roles: ['FOREST_OFFICER'],
      }),
    ).toBe('assigned');
    expect(nextReportStatuses('OPEN', false)).toEqual(['UNDER_REVIEW', 'REJECTED']);
  });

  it('prefers EXPO_PUBLIC_API_URL and uses the Android emulator loopback otherwise', () => {
    expect(resolvePublicApiUrl('http://192.168.1.10:3001/api/v1/', undefined, 'android')).toBe(
      'http://192.168.1.10:3001/api/v1',
    );
    expect(resolvePublicApiUrl(undefined, undefined, 'android')).toBe('http://10.0.2.2:3001/api/v1');
    expect(resolvePublicApiUrl(undefined, '192.168.1.20:8081', 'ios')).toBe('http://192.168.1.20:3001/api/v1');
  });
});
