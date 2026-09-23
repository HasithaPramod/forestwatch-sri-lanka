import { describe, expect, it } from 'vitest';
import { ApiException } from '../common/http/api-exception';
import { LocationsService } from './locations.service';

describe('LocationsService', () => {
  const service = new LocationsService();

  it('returns ISO districts for Southern Province', () => {
    const districts = service.districts('LK-3');
    expect(districts.map((row) => row.code)).toEqual(['LK-31', 'LK-32', 'LK-33']);
  });

  it('rejects an unknown province code', () => {
    expect(() => service.districts('LK-0')).toThrow(ApiException);
  });

  it('pages GNDs for Tissamaharama without inventing rows', () => {
    const page = service.gnds({ dsdCode: '3-3-09', page: 1, limit: 5 });
    expect(page.items).toHaveLength(5);
    expect(page.meta.total).toBeGreaterThan(5);
    expect(page.items.every((row) => row.parentCode === '3-3-09')).toBe(true);
  });
});
