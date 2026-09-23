import { describe, expect, it } from 'vitest';
import { createPrismaClient, pingDatabase, setPlantationPoint } from './index';

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)('PostGIS integration', () => {
  it('responds to a PostGIS version ping', async () => {
    const prisma = createPrismaClient(databaseUrl as string);
    try {
      const result = await pingDatabase(prisma);
      expect(result.ok).toBe(true);
      expect(result.postgis.length).toBeGreaterThan(0);
    } finally {
      await prisma.$disconnect();
    }
  });

  it('stores a WGS 84 point and measures on-site distance', async () => {
    const prisma = createPrismaClient(databaseUrl as string);
    try {
      const plantation = await prisma.plantation.findFirst({
        where: { clientUuid: '11111111-1111-4111-8111-111111111111' },
      });
      if (!plantation) {
        return;
      }

      await setPlantationPoint(prisma, plantation.id, 81.2203, 6.1964);
      const rows = await prisma.$queryRaw<Array<{ meters: number }>>`
        SELECT ST_Distance(
          "geom"::geography,
          ST_SetSRID(ST_MakePoint(81.2203, 6.1964), 4326)::geography
        ) AS meters
        FROM "plantations"
        WHERE "id" = ${plantation.id}
      `;
      expect(rows[0]?.meters ?? 99).toBeLessThan(1);
    } finally {
      await prisma.$disconnect();
    }
  });
});
