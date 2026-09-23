import { Injectable } from '@nestjs/common';
import {
  getDivision,
  listDistricts,
  listDivisionalSecretariats,
  listGramaNiladhariDivisions,
  listProvinces,
  locationStats,
  type LocationDivision,
} from '@forestwatch/sri-lanka-locations';
import type { LocationCatalogueStats } from '@forestwatch/types';
import { buildPaginationMeta } from '@forestwatch/utils';
import { ApiException } from '../common/http/api-exception';

@Injectable()
export class LocationsService {
  stats(): LocationCatalogueStats {
    return locationStats();
  }

  provinces(): LocationDivision[] {
    return listProvinces();
  }

  districts(provinceCode?: string): LocationDivision[] {
    if (provinceCode) {
      this.requireKind(provinceCode, 'province');
    }
    return listDistricts(provinceCode);
  }

  dsds(districtCode?: string): LocationDivision[] {
    if (districtCode) {
      this.requireKind(districtCode, 'district');
    }
    return listDivisionalSecretariats(districtCode);
  }

  gnds(query: { dsdCode: string; page: number; limit: number; q?: string }): {
    items: LocationDivision[];
    meta: ReturnType<typeof buildPaginationMeta>;
  } {
    this.requireKind(query.dsdCode, 'dsd');
    const needle = query.q?.trim().toLowerCase();
    const all = listGramaNiladhariDivisions(query.dsdCode).filter((row) => {
      if (!needle) {
        return true;
      }
      return [row.code, row.nameEn, row.nameSi, row.nameTa].some((value) =>
        value.toLowerCase().includes(needle),
      );
    });
    const start = (query.page - 1) * query.limit;
    return {
      items: all.slice(start, start + query.limit),
      meta: buildPaginationMeta({ page: query.page, limit: query.limit, total: all.length }),
    };
  }

  private requireKind(code: string, kind: LocationDivision['kind']): void {
    const division = getDivision(code);
    if (!division || division.kind !== kind) {
      throw new ApiException(404, 'LOCATION_NOT_FOUND', `Unknown ${kind} code`);
    }
  }
}
