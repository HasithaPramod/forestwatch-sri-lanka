import {
  getDSDs,
  getDistricts,
  getGNDs,
  getProvincesInfo,
  getStats,
} from 'sl-gnd-dsd-districts';
import { DISTRICT_ISO, PROVINCE_ISO, dsdCodeFromLifeCode } from './codes';
import type { LocationDivision, LocationKind, LocationLocale, LocationStats } from './types';

export type { LocationDivision, LocationKind, LocationLocale, LocationStats } from './types';

type Catalogue = {
  provinces: LocationDivision[];
  districts: LocationDivision[];
  dsds: LocationDivision[];
  gnds: LocationDivision[];
  byCode: Map<string, LocationDivision>;
  children: Map<string, LocationDivision[]>;
  stats: LocationStats;
};

let catalogue: Catalogue | undefined;

function requireMapped<T extends string>(map: Record<string, string>, name: T, kind: string): string {
  const code = map[name];
  if (!code) {
    throw new Error(`Unmapped ${kind} name from sl-gnd-dsd-districts: ${name}`);
  }
  return code;
}

function toDivision(
  kind: LocationKind,
  code: string,
  nameEn: string,
  nameSi: string,
  nameTa: string,
  parentCode?: string,
): LocationDivision {
  return { kind, code, nameEn, nameSi, nameTa, ...(parentCode ? { parentCode } : {}) };
}

function buildCatalogue(): Catalogue {
  const byCode = new Map<string, LocationDivision>();
  const children = new Map<string, LocationDivision[]>();

  const add = (division: LocationDivision): void => {
    byCode.set(division.code, division);
    if (division.parentCode) {
      const siblings = children.get(division.parentCode) ?? [];
      siblings.push(division);
      children.set(division.parentCode, siblings);
    }
  };

  const provinces = getProvincesInfo().map((province) =>
    toDivision(
      'province',
      requireMapped(PROVINCE_ISO, province.nameEn, 'province'),
      province.nameEn,
      province.nameSi,
      province.nameTa,
    ),
  );
  provinces.forEach(add);

  const districts = getDistricts().map((district) =>
    toDivision(
      'district',
      requireMapped(DISTRICT_ISO, district.nameEn, 'district'),
      district.nameEn,
      district.nameSi,
      district.nameTa,
      requireMapped(PROVINCE_ISO, district.provinceEn, 'province'),
    ),
  );
  districts.forEach(add);

  const dsdCodeByKey = new Map<string, string>();
  for (const gnd of getGNDs()) {
    const key = `${gnd.districtEn}::${gnd.dsdEn}`;
    if (!dsdCodeByKey.has(key)) {
      dsdCodeByKey.set(key, dsdCodeFromLifeCode(gnd.lifeCode));
    }
  }

  const dsds = getDSDs().map((dsd) => {
    const districtCode = requireMapped(DISTRICT_ISO, dsd.districtEn, 'district');
    const code = dsdCodeByKey.get(`${dsd.districtEn}::${dsd.nameEn}`) ?? `dsd-${dsd.id}`;
    return toDivision('dsd', code, dsd.nameEn, dsd.nameSi, dsd.nameTa, districtCode);
  });
  dsds.forEach(add);

  const gnds = getGNDs().map((gnd) => {
    const dsdCode = dsdCodeFromLifeCode(gnd.lifeCode);
    return toDivision('gnd', gnd.lifeCode, gnd.nameEn, gnd.nameSi, gnd.nameTa, dsdCode);
  });
  gnds.forEach(add);

  const raw = getStats();
  return {
    provinces,
    districts,
    dsds,
    gnds,
    byCode,
    children,
    stats: {
      provinces: raw.provinces,
      districts: raw.districts,
      dsds: raw.dsds,
      gnds: raw.gnds,
      source: 'sl-gnd-dsd-districts',
    },
  };
}

export function getCatalogue(): Catalogue {
  catalogue ??= buildCatalogue();
  return catalogue;
}

export function listProvinces(): LocationDivision[] {
  return getCatalogue().provinces;
}

export function listDistricts(provinceCode?: string): LocationDivision[] {
  if (!provinceCode) {
    return getCatalogue().districts;
  }
  return getCatalogue().children.get(provinceCode) ?? [];
}

export function listDivisionalSecretariats(districtCode?: string): LocationDivision[] {
  if (!districtCode) {
    return getCatalogue().dsds;
  }
  return getCatalogue().children.get(districtCode) ?? [];
}

export function listGramaNiladhariDivisions(dsdCode: string): LocationDivision[] {
  return getCatalogue().children.get(dsdCode) ?? [];
}

export function getDivision(code: string): LocationDivision | undefined {
  return getCatalogue().byCode.get(code);
}

export function locationStats(): LocationStats {
  return getCatalogue().stats;
}

export function displayName(division: LocationDivision, locale: LocationLocale): string {
  if (locale === 'si' && division.nameSi.trim()) {
    return division.nameSi;
  }
  if (locale === 'ta' && division.nameTa.trim()) {
    return division.nameTa;
  }
  return division.nameEn;
}

export function searchDivisions(
  q: string,
  options: { kinds?: LocationKind[]; limit?: number } = {},
): LocationDivision[] {
  const needle = q.trim().toLowerCase();
  if (needle.length < 2) {
    return [];
  }
  const limit = options.limit ?? 20;
  const catalogue = getCatalogue();
  const kinds = options.kinds && options.kinds.length > 0 ? new Set(options.kinds) : null;
  const pool: LocationDivision[] = [];
  if (!kinds || kinds.has('province')) {
    pool.push(...catalogue.provinces);
  }
  if (!kinds || kinds.has('district')) {
    pool.push(...catalogue.districts);
  }
  if (!kinds || kinds.has('dsd')) {
    pool.push(...catalogue.dsds);
  }
  if (!kinds || kinds.has('gnd')) {
    pool.push(...catalogue.gnds);
  }

  const ranked: Array<{ row: LocationDivision; score: number }> = [];
  for (const row of pool) {
    const code = row.code.toLowerCase();
    const nameEn = row.nameEn.toLowerCase();
    if (code === needle || nameEn === needle) {
      ranked.push({ row, score: 0 });
      continue;
    }
    if (code.startsWith(needle) || nameEn.startsWith(needle)) {
      ranked.push({ row, score: 1 });
      continue;
    }
    const hay = `${code} ${nameEn} ${row.nameSi.toLowerCase()} ${row.nameTa.toLowerCase()}`;
    if (hay.includes(needle)) {
      ranked.push({ row, score: 2 });
    }
  }
  ranked.sort((left, right) => left.score - right.score || left.row.nameEn.localeCompare(right.row.nameEn));
  return ranked.slice(0, limit).map((item) => item.row);
}

export function belongsToParent(code: string, parentCode: string): boolean {
  return getDivision(code)?.parentCode === parentCode;
}
