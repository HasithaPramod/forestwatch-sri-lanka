import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestUser } from '../auth/types';
import { PlantationsService, serializeCoordinates } from './plantations.service';

const citizen: RequestUser = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  email: 'citizen@localhost',
  roles: ['CITIZEN'],
  sessionId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
};

const officer: RequestUser = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  email: 'officer@localhost',
  roles: ['FOREST_OFFICER'],
  sessionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
};

const bundala = {
  id: '11111111-1111-4111-8111-111111111111',
  clientUuid: '11111111-1111-4111-8111-111111111111',
  name: 'Bundala Restoration Site 04',
  description: 'Mixed dry-zone planting. Seed record only.',
  type: 'PLANTATION_SITE' as const,
  latitude: { toNumber: () => 6.1964 },
  longitude: { toNumber: () => 81.2203 },
  provinceCode: 'LK-3',
  districtCode: 'LK-33',
  dsdCode: '3-3-09',
  gndCode: '3-3-09-150',
  plantingDate: new Date('2026-03-12T00:00:00.000Z'),
  treeCount: 1250,
  areaHectares: { toNumber: () => 2.4 },
  organizationId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
  createdById: citizen.id,
  verificationStatus: 'VERIFIED' as const,
  locationVisibility: 'PUBLIC_EXACT' as const,
  createdAt: new Date('2026-03-12T00:00:00.000Z'),
  updatedAt: new Date('2026-03-12T00:00:00.000Z'),
  campaign: {
    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    name: 'Bundala Restoration 2026',
    slug: 'bundala-restoration-2026',
    status: 'ACTIVE',
    visibility: 'PUBLIC',
  },
  organization: {
    id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    name: 'Bundala Restoration Trust',
    slug: 'bundala-restoration-trust',
    createdById: '99999999-9999-4999-8999-999999999999',
  },
  species: [
    {
      quantity: 600,
      species: {
        id: 's1',
        scientificName: 'Terminalia arjuna',
        commonEnglishName: 'Kumbuk',
        sinhalaName: 'කුඹුක්',
        tamilName: 'மருதமரம்',
        nativeStatus: 'NATIVE',
        active: true,
      },
    },
  ],
  images: [],
};

describe('serializeCoordinates', () => {
  it('returns exact coordinates for PUBLIC_EXACT guests', () => {
    expect(serializeCoordinates(bundala, undefined)).toMatchObject({
      latitude: 6.1964,
      longitude: 81.2203,
      precision: 'exact',
    });
  });

  it('rounds PUBLIC_APPROXIMATE coordinates for guests', () => {
    expect(serializeCoordinates({ ...bundala, locationVisibility: 'PUBLIC_APPROXIMATE' }, undefined)).toMatchObject({
      latitude: 6.196,
      longitude: 81.22,
      precision: 'approximate',
    });
  });

  it('omits OFFICER_ONLY coordinates for guests', () => {
    expect(serializeCoordinates({ ...bundala, locationVisibility: 'OFFICER_ONLY' }, undefined)).toMatchObject({
      latitude: null,
      longitude: null,
      precision: 'hidden',
    });
  });

  it('lets an officer see OFFICER_ONLY coordinates', () => {
    expect(serializeCoordinates({ ...bundala, locationVisibility: 'OFFICER_ONLY' }, officer).precision).toBe('exact');
  });
});

describe('PlantationsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists only verified plantations for guests', async () => {
    const prisma = createPrisma({
      plantation: {
        findMany: vi.fn().mockResolvedValue([bundala]),
        count: vi.fn().mockResolvedValue(1),
      },
    });
    const service = new PlantationsService(prisma as never, createStorage() as never);
    const page = await service.list({ page: 1, limit: 20, scope: 'public' }, undefined);
    expect(prisma.plantation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { verificationStatus: 'VERIFIED' } }),
    );
    expect(page.items[0]?.treeCount).toBe(1250);
    expect(page.items[0]?.species[0]?.commonEnglishName).toBe('Kumbuk');
  });

  it('hides unverified plantations from guests', async () => {
    const prisma = createPrisma({
      plantation: {
        findFirst: vi.fn().mockResolvedValue({ ...bundala, verificationStatus: 'SUBMITTED' }),
      },
    });
    const service = new PlantationsService(prisma as never, createStorage() as never);
    await expect(service.get(bundala.id)).rejects.toMatchObject({ errorCode: 'PLANTATION_NOT_FOUND' });
  });

  it('refuses a citizen setting verification to VERIFIED', async () => {
    const service = new PlantationsService(createPrisma() as never, createStorage() as never);
    await expect(
      service.create(
        {
          name: 'Unauthorized verify',
          type: 'PLANTATION_SITE',
          latitude: 6.1964,
          longitude: 81.2203,
          provinceCode: 'LK-3',
          districtCode: 'LK-33',
          plantingDate: new Date('2026-03-12T00:00:00.000Z'),
          treeCount: 10,
          locationVisibility: 'PUBLIC_APPROXIMATE',
          verificationStatus: 'VERIFIED',
          species: [{ speciesId: 's1', quantity: 10 }],
        },
        citizen,
      ),
    ).rejects.toMatchObject({ errorCode: 'FORBIDDEN' });
  });

  it('rejects an unknown district on create', async () => {
    const service = new PlantationsService(createPrisma() as never, createStorage() as never);
    await expect(
      service.create(
        {
          name: 'Bad location',
          type: 'INDIVIDUAL_TREE',
          latitude: 6.1964,
          longitude: 81.2203,
          provinceCode: 'LK-3',
          districtCode: 'LK-11',
          plantingDate: new Date('2026-03-12T00:00:00.000Z'),
          treeCount: 1,
          locationVisibility: 'PUBLIC_EXACT',
          species: [{ speciesId: 's1', quantity: 1 }],
        },
        citizen,
      ),
    ).rejects.toMatchObject({ errorCode: 'LOCATION_MISMATCH' });
  });

  it('refuses the submitting citizen from adding photos after verification', async () => {
    const prisma = createPrisma({
      plantation: {
        findFirst: vi.fn().mockResolvedValue(bundala),
      },
    });
    const service = new PlantationsService(prisma as never, createStorage() as never);
    await expect(
      service.addImage(bundala.id, { buffer: Buffer.from('not-an-image') } as never, citizen),
    ).rejects.toMatchObject({ errorCode: 'FORBIDDEN' });
  });
});

function createPrisma(overrides: Record<string, unknown> = {}) {
  const prisma = {
    plantation: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      ...(overrides.plantation as Record<string, unknown> | undefined),
    },
    plantationSpecies: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    plantationImage: {
      create: vi.fn(),
      delete: vi.fn(),
    },
    campaign: { findUnique: vi.fn() },
    organization: { findUnique: vi.fn() },
    species: { findMany: vi.fn() },
    officerAssignment: { findMany: vi.fn() },
    monitoringUpdate: { findFirst: vi.fn().mockResolvedValue(null) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    $executeRaw: vi.fn().mockResolvedValue(1),
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation(async (fn: (client: typeof prisma) => unknown) => fn(prisma));
  return prisma;
}

function createStorage() {
  return {
    resolvePublicImage: vi.fn(async (key: string | null) =>
      key
        ? {
            url: `http://localhost:3001/api/v1/files/${key}`,
            thumbnailUrl: `http://localhost:3001/api/v1/files/${key.replace(/\.webp$/u, '-thumb.webp')}`,
          }
        : null,
    ),
    putOptimizedImage: vi.fn(),
    removeOptimizedImage: vi.fn(),
  };
}
