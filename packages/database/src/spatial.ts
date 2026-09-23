import { Prisma, PrismaClient } from '@prisma/client';
import { GEO_PROXIMITY_METERS, POSTGIS_SRID } from '@forestwatch/config';
import type { GeoProximityStatus } from '@forestwatch/types';

export { POSTGIS_SRID };

export function classifyProximity(
  distanceMeters: number | null | undefined,
  thresholds: { onSiteMax: number; nearbyMax: number } = GEO_PROXIMITY_METERS,
): GeoProximityStatus {
  if (distanceMeters === null || distanceMeters === undefined || Number.isNaN(distanceMeters)) {
    return 'LOCATION_UNAVAILABLE';
  }

  if (distanceMeters <= thresholds.onSiteMax) {
    return 'ON_SITE';
  }

  if (distanceMeters <= thresholds.nearbyMax) {
    return 'NEARBY';
  }

  return 'REMOTE';
}

export function makePointSql(longitude: number, latitude: number): Prisma.Sql {
  return Prisma.sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), ${Prisma.raw(String(POSTGIS_SRID))})`;
}

export function bboxIntersectsSql(
  west: number,
  south: number,
  east: number,
  north: number,
): Prisma.Sql {
  return Prisma.sql`ST_Intersects("geom", ST_MakeEnvelope(${west}, ${south}, ${east}, ${north}, ${Prisma.raw(String(POSTGIS_SRID))}))`;
}

export function nearbyDistanceSql(longitude: number, latitude: number): Prisma.Sql {
  return Prisma.sql`ST_Distance("geom"::geography, ${makePointSql(longitude, latitude)}::geography)`;
}

export function withinMetersSql(
  longitude: number,
  latitude: number,
  meters: number,
): Prisma.Sql {
  return Prisma.sql`ST_DWithin("geom"::geography, ${makePointSql(longitude, latitude)}::geography, ${meters})`;
}

export async function distanceToPlantationMeters(
  prisma: PrismaClient,
  plantationId: string,
  longitude: number,
  latitude: number,
): Promise<number | null> {
  const rows = await prisma.$queryRaw<Array<{ meters: number | string | null }>>`
    SELECT ST_Distance("geom"::geography, ${makePointSql(longitude, latitude)}::geography) AS meters
    FROM "plantations"
    WHERE "id" = ${plantationId} AND "geom" IS NOT NULL
  `;
  const meters = rows[0]?.meters;
  if (meters == null) {
    return null;
  }
  return typeof meters === 'number' ? meters : Number(meters);
}

export async function setPlantationPoint(
  prisma: PrismaClient,
  plantationId: string,
  longitude: number,
  latitude: number,
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "plantations"
    SET
      "longitude" = ${longitude},
      "latitude" = ${latitude},
      "geom" = ${makePointSql(longitude, latitude)}
    WHERE "id" = ${plantationId}
  `;
}

export async function pingDatabase(prisma: PrismaClient): Promise<{ ok: true; postgis: string }> {
  const rows = await prisma.$queryRaw<Array<{ postgis: string }>>`
    SELECT PostGIS_Version() AS postgis
  `;
  const postgis = rows[0]?.postgis;
  if (!postgis) {
    throw new Error('PostGIS is not available on this database.');
  }
  return { ok: true, postgis };
}
