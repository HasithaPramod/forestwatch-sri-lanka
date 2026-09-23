import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestUser } from '../auth/types';
import { MapService } from './map.service';

const citizen: RequestUser = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  email: 'citizen@localhost',
  roles: ['CITIZEN'],
  sessionId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
};

const bundala = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Bundala Restoration Site 04',
  type: 'PLANTATION_SITE' as const,
  latitude: { toNumber: () => 6.1964 },
  longitude: { toNumber: () => 81.2203 },
  createdById: citizen.id,
  treeCount: 1250,
  verificationStatus: 'VERIFIED' as const,
  locationVisibility: 'PUBLIC_EXACT' as const,
  campaign: {
    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    name: 'Bundala Restoration 2026',
    slug: 'bundala-restoration-2026',
    visibility: 'PUBLIC',
  },
  organization: { createdById: '99999999-9999-4999-8999-999999999999' },
  images: [],
};

describe('MapService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists bbox hits without dumping the full table', async () => {
    const prisma = createPrisma({
      $queryRaw: vi.fn().mockResolvedValue([{ id: bundala.id }]),
      plantation: { findMany: vi.fn().mockResolvedValue([bundala]) },
    });
    const service = new MapService(prisma as never, createStorage() as never);
    const page = await service.listInBbox(
      { bbox: { west: 81.1, south: 6.1, east: 81.3, north: 6.3 }, limit: 200 },
      undefined,
    );

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.coordinates).toMatchObject({ latitude: 6.1964, longitude: 81.2203, precision: 'exact' });
    expect(page.meta.truncated).toBe(false);
    expect(page.meta.limit).toBe(200);
  });

  it('omits OFFICER_ONLY coordinates from guest map payloads', async () => {
    const prisma = createPrisma({
      $queryRaw: vi.fn().mockResolvedValue([{ id: bundala.id }]),
      plantation: {
        findMany: vi.fn().mockResolvedValue([{ ...bundala, locationVisibility: 'OFFICER_ONLY' }]),
      },
    });
    const service = new MapService(prisma as never, createStorage() as never);
    const page = await service.listInBbox(
      { bbox: { west: 81.1, south: 6.1, east: 81.3, north: 6.3 }, limit: 200 },
      undefined,
    );
    expect(page.items).toHaveLength(0);
  });

  it('returns nearby rows with meter distances from PostGIS', async () => {
    const prisma = createPrisma({
      $queryRaw: vi.fn().mockResolvedValue([{ id: bundala.id, meters: 12.4 }]),
      plantation: { findMany: vi.fn().mockResolvedValue([bundala]) },
    });
    const service = new MapService(prisma as never, createStorage() as never);
    const page = await service.listNearby(
      { lat: 6.1964, lng: 81.2203, radiusMeters: 5000, limit: 200 },
      undefined,
    );
    expect(page.items[0]?.distanceMeters).toBe(12.4);
    expect(page.meta.radiusMeters).toBe(5000);
  });
});

function createPrisma(overrides: Record<string, unknown> = {}) {
  return {
    $queryRaw: vi.fn(),
    plantation: { findMany: vi.fn() },
    ...overrides,
  };
}

function createStorage() {
  return {
    resolvePublicImage: vi.fn(async () => null),
  };
}
