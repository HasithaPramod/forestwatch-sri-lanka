import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiException } from '../common/http/api-exception';
import type { RequestUser } from '../auth/types';
import { SpeciesService } from './species.service';

const admin: RequestUser = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  email: 'admin@localhost',
  roles: ['ADMIN'],
  sessionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
};

const citizen: RequestUser = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  email: 'citizen@localhost',
  roles: ['CITIZEN'],
  sessionId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
};

const kumbuk = {
  id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  scientificName: 'Terminalia arjuna',
  commonEnglishName: 'Kumbuk',
  sinhalaName: 'කුඹුක්',
  tamilName: 'மருதமரம்',
  nativeStatus: 'NATIVE' as const,
  description: 'Riparian native used widely in dry-zone restoration.',
  imageKey: null,
  active: true,
  _count: { plantations: 1 },
};

describe('SpeciesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists only active species for guests', async () => {
    const prisma = createPrisma({
      species: {
        findMany: vi.fn().mockResolvedValue([kumbuk]),
        count: vi.fn().mockResolvedValue(1),
      },
    });
    const service = new SpeciesService(prisma as never, createStorage() as never);
    const page = await service.list({ page: 1, limit: 20, includeInactive: false }, undefined);

    expect(prisma.species.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { active: true },
        orderBy: { scientificName: 'asc' },
      }),
    );
    expect(page.items[0]?.plantationRecordCount).toBe(1);
    expect(page.items[0]?.commonEnglishName).toBe('Kumbuk');
  });

  it('hides inactive species from guests', async () => {
    const prisma = createPrisma({
      species: {
        findFirst: vi.fn().mockResolvedValue({ ...kumbuk, active: false }),
      },
    });
    const service = new SpeciesService(prisma as never, createStorage() as never);
    await expect(service.get(kumbuk.scientificName)).rejects.toMatchObject({ errorCode: 'SPECIES_NOT_FOUND' });
  });

  it('lets an admin read an inactive species', async () => {
    const prisma = createPrisma({
      species: {
        findFirst: vi.fn().mockResolvedValue({ ...kumbuk, active: false }),
      },
    });
    const service = new SpeciesService(prisma as never, createStorage() as never);
    const detail = await service.get('terminalia-arjuna', admin);
    expect(detail.editable).toBe(true);
    expect(detail.active).toBe(false);
  });

  it('creates a catalogue row with a live plantation record count of zero', async () => {
    const prisma = createPrisma({
      species: {
        create: vi.fn().mockResolvedValue({ ...kumbuk, _count: { plantations: 0 } }),
      },
    });
    const service = new SpeciesService(prisma as never, createStorage() as never);
    const detail = await service.create(
      {
        scientificName: 'Terminalia arjuna',
        commonEnglishName: 'Kumbuk',
        sinhalaName: 'කුඹුක්',
        tamilName: 'மருதமரம்',
        nativeStatus: 'NATIVE',
        description: 'Riparian native used widely in dry-zone restoration.',
        active: true,
      },
      admin,
    );
    expect(detail.plantationRecordCount).toBe(0);
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('refuses citizen creates even if the guard is bypassed', async () => {
    const service = new SpeciesService(createPrisma() as never, createStorage() as never);
    await expect(
      service.create(
        {
          scientificName: 'Terminalia arjuna',
          commonEnglishName: 'Kumbuk',
          sinhalaName: 'කුඹුක්',
          tamilName: 'மருதமரம்',
          nativeStatus: 'NATIVE',
          description: 'Riparian native used widely in dry-zone restoration.',
          active: true,
        },
        citizen,
      ),
    ).rejects.toBeInstanceOf(ApiException);
  });

  it('blocks includeInactive for guests', async () => {
    const service = new SpeciesService(createPrisma() as never, createStorage() as never);
    await expect(service.list({ page: 1, limit: 20, includeInactive: true }, undefined)).rejects.toMatchObject({
      errorCode: 'FORBIDDEN',
    });
  });
});

function createPrisma(overrides: Record<string, unknown> = {}) {
  return {
    species: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      ...(overrides.species as Record<string, unknown> | undefined),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
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
