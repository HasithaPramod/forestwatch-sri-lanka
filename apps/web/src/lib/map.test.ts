import { describe, expect, it } from 'vitest';
import { formatDistanceMeters, markerColor, toLeafletMarkers } from './map';

describe('map helpers', () => {
  it('labels distances in meters then kilometres', () => {
    expect(formatDistanceMeters(12.4)).toBe('12 m');
    expect(formatDistanceMeters(5400)).toBe('5.4 km');
  });

  it('does not treat approximate points as exact marker colour', () => {
    expect(markerColor('exact')).not.toBe(markerColor('approximate'));
  });

  it('drops markers that have no public coordinates', () => {
    expect(
      toLeafletMarkers([
        {
          id: 'hidden',
          name: 'Hidden',
          type: 'PLANTATION_SITE',
          verificationStatus: 'VERIFIED',
          coordinates: { latitude: null, longitude: null, precision: 'hidden' },
          treeCount: 10,
          campaign: null,
          coverThumbnailUrl: null,
        },
      ]),
    ).toEqual([]);
  });
});
