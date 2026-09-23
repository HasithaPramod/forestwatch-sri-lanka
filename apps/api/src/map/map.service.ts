import { Injectable } from '@nestjs/common';
import { isAdmin, isOfficer } from '@forestwatch/auth';
import { Prisma, bboxIntersectsSql, nearbyDistanceSql, withinMetersSql } from '@forestwatch/database';
import type {
  MapPlantationMarker,
  MapPlantationsPage,
  NearbyPlantation,
  NearbyPlantationsPage,
  PlantationType,
  PlantationVerificationStatus,
} from '@forestwatch/types';
import type { ParsedMapPlantationsQuery, ParsedNearbyPlantationsQuery } from '@forestwatch/validation';
import type { RequestUser } from '../auth/types';
import { PrismaService } from '../database/prisma.service';
import { serializeCoordinates } from '../plantations/plantations.service';
import { StorageService } from '../storage/storage.service';

const markerInclude = {
  campaign: { select: { id: true, name: true, slug: true, visibility: true } },
  organization: { select: { createdById: true } },
  images: { orderBy: { createdAt: 'asc' as const }, take: 1, select: { objectKey: true } },
} satisfies Prisma.PlantationInclude;

type MarkerRecord = Prisma.PlantationGetPayload<{ include: typeof markerInclude }>;

type MapFilters = {
  campaignId?: string;
  speciesId?: string;
  provinceCode?: string;
  districtCode?: string;
  dsdCode?: string;
  gndCode?: string;
  type?: PlantationType;
  verificationStatus?: PlantationVerificationStatus;
  q?: string;
};

@Injectable()
export class MapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async listInBbox(query: ParsedMapPlantationsQuery, user?: RequestUser): Promise<MapPlantationsPage> {
    const ids = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "plantations"
      WHERE ${this.whereSql(query, user, bboxIntersectsSql(query.bbox.west, query.bbox.south, query.bbox.east, query.bbox.north))}
      LIMIT ${query.limit}
    `;
    const items = await this.toMarkers(
      ids.map((row) => row.id),
      user,
    );
    return {
      items,
      meta: {
        limit: query.limit,
        returned: items.length,
        truncated: ids.length === query.limit,
        bbox: query.bbox,
      },
    };
  }

  async listNearby(query: ParsedNearbyPlantationsQuery, user?: RequestUser): Promise<NearbyPlantationsPage> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; meters: number | string }>>`
      SELECT "id", ${nearbyDistanceSql(query.lng, query.lat)} AS meters
      FROM "plantations"
      WHERE ${this.whereSql(query, user, withinMetersSql(query.lng, query.lat, query.radiusMeters))}
      ORDER BY meters ASC
      LIMIT ${query.limit}
    `;
    const distances = new Map(rows.map((row) => [row.id, Number(row.meters)]));
    const markers = await this.toMarkers(
      rows.map((row) => row.id),
      user,
    );
    const items: NearbyPlantation[] = markers.map((item) => ({
      ...item,
      distanceMeters: distances.get(item.id) ?? 0,
    }));
    return {
      items,
      meta: {
        limit: query.limit,
        returned: items.length,
        truncated: rows.length === query.limit,
        latitude: query.lat,
        longitude: query.lng,
        radiusMeters: query.radiusMeters,
      },
    };
  }

  private whereSql(filters: MapFilters, user: RequestUser | undefined, spatial: Prisma.Sql): Prisma.Sql {
    const parts: Prisma.Sql[] = [Prisma.sql`"geom" IS NOT NULL`, spatial];
    const privileged = Boolean(user && (isOfficer(user.roles) || isAdmin(user.roles)));

    if (!privileged) {
      parts.push(Prisma.sql`"verificationStatus" = 'VERIFIED'`);
      parts.push(Prisma.sql`"locationVisibility" <> 'OFFICER_ONLY'`);
    } else if (filters.verificationStatus) {
      parts.push(Prisma.sql`"verificationStatus" = ${filters.verificationStatus}`);
    }

    if (filters.campaignId) {
      parts.push(Prisma.sql`"campaignId" = ${filters.campaignId}::uuid`);
    }
    if (filters.provinceCode) {
      parts.push(Prisma.sql`"provinceCode" = ${filters.provinceCode}`);
    }
    if (filters.districtCode) {
      parts.push(Prisma.sql`"districtCode" = ${filters.districtCode}`);
    }
    if (filters.dsdCode) {
      parts.push(Prisma.sql`"dsdCode" = ${filters.dsdCode}`);
    }
    if (filters.gndCode) {
      parts.push(Prisma.sql`"gndCode" = ${filters.gndCode}`);
    }
    if (filters.type) {
      parts.push(Prisma.sql`"type"::text = ${filters.type}`);
    }
    if (filters.q) {
      parts.push(Prisma.sql`"name" ILIKE ${`%${filters.q}%`}`);
    }
    if (filters.speciesId) {
      parts.push(
        Prisma.sql`EXISTS (
          SELECT 1 FROM "plantation_species" ps
          WHERE ps."plantationId" = "plantations"."id" AND ps."speciesId" = ${filters.speciesId}::uuid
        )`,
      );
    }

    return Prisma.join(parts, ' AND ');
  }

  private async toMarkers(ids: string[], user?: RequestUser): Promise<MapPlantationMarker[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.prisma.plantation.findMany({
      where: { id: { in: ids } },
      include: markerInclude,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const markers: MapPlantationMarker[] = [];
    for (const id of ids) {
      const row = byId.get(id);
      if (!row) {
        continue;
      }
      const marker = await this.toMarker(row, user);
      if (marker) {
        markers.push(marker);
      }
    }
    return markers;
  }

  private async toMarker(row: MarkerRecord, user?: RequestUser): Promise<MapPlantationMarker | null> {
    const coordinates = serializeCoordinates(row, user);
    if (coordinates.precision === 'hidden' || coordinates.latitude == null || coordinates.longitude == null) {
      return null;
    }
    const cover = row.images[0] ? await this.storage.resolvePublicImage(row.images[0].objectKey) : null;
    const campaign =
      row.campaign && (row.campaign.visibility === 'PUBLIC' || Boolean(user && (isOfficer(user.roles) || isAdmin(user.roles))))
        ? { id: row.campaign.id, name: row.campaign.name, slug: row.campaign.slug }
        : null;

    return {
      id: row.id,
      name: row.name,
      type: row.type as PlantationType,
      verificationStatus: row.verificationStatus as PlantationVerificationStatus,
      coordinates,
      treeCount: row.treeCount,
      campaign,
      coverThumbnailUrl: cover?.thumbnailUrl ?? null,
    };
  }
}
