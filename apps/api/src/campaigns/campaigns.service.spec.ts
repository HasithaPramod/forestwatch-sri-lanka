import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiException } from '../common/http/api-exception';
import type { RequestUser } from '../auth/types';
import { CampaignsService } from './campaigns.service';

const manager: RequestUser = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  email: 'org@localhost',
  roles: ['ORGANIZATION_MANAGER'],
  sessionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
};

const citizen: RequestUser = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  email: 'citizen@localhost',
  roles: ['CITIZEN'],
  sessionId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
};

const bundala = {
  id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  name: 'Bundala Restoration 2026',
  slug: 'bundala-restoration-2026',
  description: 'Dry-zone restoration with community monitoring.',
  bannerImageKey: null,
  organizerId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
  startDate: new Date('2026-01-15T00:00:00.000Z'),
  endDate: new Date('2026-12-31T00:00:00.000Z'),
  targetTrees: 5000,
  targetAreaHectares: { toNumber: () => 12 },
  eligibleLocations: { provinceCodes: ['LK-3'], districtCodes: ['LK-33'] },
  status: 'ACTIVE' as const,
  visibility: 'PUBLIC' as const,
  createdById: manager.id,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  organizer: {
    id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    name: 'Bundala Restoration Trust',
    slug: 'bundala-restoration-trust',
    createdById: manager.id,
  },
  _count: { plantations: 1 },
};

describe('CampaignsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists only public upcoming, active, and completed campaigns for guests', async () => {
    const prisma = createPrisma({
      campaign: {
        findMany: vi.fn().mockResolvedValue([bundala]),
        count: vi.fn().mockResolvedValue(1),
      },
    });
    const service = new CampaignsService(prisma as never, createStorage() as never);
    const page = await service.list({ page: 1, limit: 20, scope: 'public' }, undefined);

    expect(prisma.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { visibility: 'PUBLIC', status: { in: ['UPCOMING', 'ACTIVE', 'COMPLETED'] } },
      }),
    );
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.plantationCount).toBe(1);
    expect(page.items[0]?.targetTrees).toBe(5000);
  });

  it('hides drafts from guests', async () => {
    const prisma = createPrisma({
      campaign: {
        findFirst: vi.fn().mockResolvedValue({ ...bundala, status: 'DRAFT' }),
      },
    });
    const service = new CampaignsService(prisma as never, createStorage() as never);
    await expect(service.get(bundala.slug)).rejects.toMatchObject({ errorCode: 'CAMPAIGN_NOT_FOUND' });
  });

  it('lets the creating manager read a draft', async () => {
    const prisma = createPrisma({
      campaign: {
        findFirst: vi.fn().mockResolvedValue({ ...bundala, status: 'DRAFT' }),
      },
    });
    const service = new CampaignsService(prisma as never, createStorage() as never);
    const detail = await service.get(bundala.slug, manager);
    expect(detail.editable).toBe(true);
    expect(detail.status).toBe('DRAFT');
  });

  it('creates a campaign with a real plantation count of zero', async () => {
    const created = { ...bundala, status: 'DRAFT' as const, _count: { plantations: 0 } };
    const prisma = createPrisma({
      campaign: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(created),
      },
    });
    const service = new CampaignsService(prisma as never, createStorage() as never);
    const detail = await service.create(
      {
        name: 'Bundala Restoration 2026',
        description: 'Dry-zone restoration with community monitoring.',
        startDate: new Date('2026-01-15T00:00:00.000Z'),
        status: 'DRAFT',
        visibility: 'PUBLIC',
      },
      manager,
    );
    expect(detail.plantationCount).toBe(0);
    expect(detail.slug).toBe('bundala-restoration-2026');
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('refuses citizen creates even if the guard is bypassed', async () => {
    const service = new CampaignsService(createPrisma() as never, createStorage() as never);
    await expect(
      service.create(
        {
          name: 'Unauthorized campaign',
          description: 'Should never persist from a citizen role.',
          startDate: new Date('2026-01-15T00:00:00.000Z'),
          status: 'DRAFT',
          visibility: 'PUBLIC',
        },
        citizen,
      ),
    ).rejects.toBeInstanceOf(ApiException);
  });

  it('rejects an unknown eligible district code', async () => {
    const service = new CampaignsService(createPrisma() as never, createStorage() as never);
    await expect(
      service.create(
        {
          name: 'Bad locations',
          description: 'Uses a district code that is not in the catalogue.',
          startDate: new Date('2026-01-15T00:00:00.000Z'),
          status: 'DRAFT',
          visibility: 'PUBLIC',
          eligibleLocations: { provinceCodes: ['LK-3'], districtCodes: ['LK-99'] },
        },
        manager,
      ),
    ).rejects.toMatchObject({ errorCode: 'LOCATION_NOT_FOUND' });
  });

  it('blocks scope=all for non-admins', async () => {
    const service = new CampaignsService(createPrisma() as never, createStorage() as never);
    await expect(service.list({ page: 1, limit: 20, scope: 'all' }, manager)).rejects.toMatchObject({
      errorCode: 'FORBIDDEN',
    });
  });
});

function createPrisma(overrides: Record<string, unknown> = {}) {
  return {
    campaign: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      ...(overrides.campaign as Record<string, unknown> | undefined),
    },
    organization: {
      findUnique: vi.fn(),
      ...(overrides.organization as Record<string, unknown> | undefined),
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
