import { describe, expect, it } from 'vitest';
import {
  belongsToParent,
  displayName,
  getDivision,
  listDistricts,
  listDivisionalSecretariats,
  listGramaNiladhariDivisions,
  listProvinces,
  locationStats,
  searchDivisions,
} from './index';

describe('sri-lanka-locations', () => {
  it('loads the national catalogue from sl-gnd-dsd-districts', () => {
    const stats = locationStats();
    expect(stats.provinces).toBe(9);
    expect(stats.districts).toBe(25);
    expect(stats.dsds).toBe(340);
    expect(stats.gnds).toBe(14020);
    expect(listProvinces()).toHaveLength(9);
  });

  it('uses ISO 3166-2 codes that match the development seed', () => {
    expect(getDivision('LK-3')).toMatchObject({ kind: 'province', nameEn: 'Southern' });
    expect(getDivision('LK-33')).toMatchObject({
      kind: 'district',
      nameEn: 'Hambantota',
      parentCode: 'LK-3',
    });
    expect(listDistricts('LK-3').map((row) => row.code)).toEqual(['LK-31', 'LK-32', 'LK-33']);
  });

  it('keeps Kilinochchi on the ISO district code, not the LIFe order', () => {
    expect(getDivision('LK-42')).toMatchObject({ nameEn: 'Kilinochchi', parentCode: 'LK-4' });
  });

  it('cascades Hambantota DSDs to official LIFe GND codes', () => {
    const dsds = listDivisionalSecretariats('LK-33');
    const tissa = dsds.find((row) => row.nameEn === 'Tissamaharama');
    expect(tissa?.code).toBe('3-3-09');
    expect(belongsToParent('3-3-09', 'LK-33')).toBe(true);

    const gnds = listGramaNiladhariDivisions('3-3-09');
    expect(gnds.length).toBeGreaterThan(10);
    expect(gnds.some((row) => row.code === '3-3-09-150' && row.nameEn === 'Tissamaharama')).toBe(true);
  });

  it('selects the requested locale label and falls back to English', () => {
    const western = getDivision('LK-1');
    expect(western).toBeDefined();
    expect(displayName(western!, 'en')).toBe('Western');
    expect(displayName(western!, 'si')).toBe('බස්නාහිර');
    expect(displayName(western!, 'ta')).toBe('மேற்கு');
  });

  it('searches catalogue rows without returning the full GND table', () => {
    const hits = searchDivisions('Hambantota', { limit: 8 });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.length).toBeLessThanOrEqual(8);
    expect(hits.some((row) => row.code === 'LK-33' && row.kind === 'district')).toBe(true);
    expect(searchDivisions('x')).toEqual([]);
  });
});
