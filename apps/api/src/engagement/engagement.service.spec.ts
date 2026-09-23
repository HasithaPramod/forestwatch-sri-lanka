import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '@forestwatch/database';
import type { RequestUser } from '../auth/types';
import { EngagementService } from './engagement.service';

const citizen: RequestUser = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  email: 'citizen@localhost',
  roles: ['CITIZEN'],
  sessionId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
};

const kumbuk = {
  id: 's-kumbuk',
  scientificName: 'Terminalia arjuna',
  commonEnglishName: 'Kumbuk',
  sinhalaName: 'කුඹුක්',
  tamilName: 'மருதமரம்',
  nativeStatus: 'NATIVE',
  description: 'Riverine canopy tree.',
};

const ebony = {
  id: 's-ebony',
  scientificName: 'Diospyros ebenum',
  commonEnglishName: 'Ebony',
  sinhalaName: 'කළුවර',
  tamilName: 'கருங்காலி',
  nativeStatus: 'NATIVE',
  description: 'Restricted dry-zone hardwood.',
};

describe('EngagementService', () => {
  it('projects confirmed XP and EcoPoints from CONFIRMED ledger rows', async () => {
    const prisma = createPrisma({
      xpTransaction: {
        count: vi.fn().mockResolvedValue(1),
        aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 100 } }),
        findMany: vi.fn().mockResolvedValue([{ eventType: 'MONITORING_VERIFIED' }]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      species: { count: vi.fn().mockResolvedValue(4) },
      speciesDiscovery: { count: vi.fn().mockResolvedValue(0) },
      userBadge: { count: vi.fn().mockResolvedValue(1), findMany: vi.fn().mockResolvedValue([]) },
      userMission: { count: vi.fn().mockResolvedValue(0), upsert: vi.fn() },
      mission: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(1) },
    });
    const service = new EngagementService(prisma as never);
    const profile = await service.profile('u1');
    expect(profile.available).toBe(true);
    expect(profile.confirmedXp).toBe(100);
    expect(profile.ecoPoints).toBe(10);
    expect(profile.pendingEvents).toBe(1);
    expect(profile.rewardsActive).toBe(true);
    expect(profile.displayTitle).toBe('Seedling');
    expect(profile.badges).toEqual({ available: true, awardedCount: 1 });
    expect(profile.missions).toEqual({ available: true, activeCount: 1, completedCount: 0 });
    expect(profile.forestDex).toEqual({ available: true, discoveredCount: 0, catalogueCount: 4 });
  });

  it('records a verified domain event as CONFIRMED and refuses a second insert for the same event', async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce({ id: 'xp1' })
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
    const prisma = createPrisma({
      xpTransaction: {
        create,
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        count: vi.fn().mockResolvedValue(0),
        aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 50 } }),
        findMany: vi.fn().mockResolvedValue([{ eventType: 'PLANTATION_VERIFIED' }]),
      },
    });
    const service = new EngagementService(prisma as never);
    const event = {
      type: 'PLANTATION_VERIFIED' as const,
      actorUserId: 'u1',
      entityId: 'plantation-1',
      occurredAt: '2026-03-20T00:00:00.000Z',
    };
    await expect(service.ingest(event)).resolves.toEqual({ recorded: true });
    await expect(service.ingest(event)).resolves.toEqual({ recorded: false, reason: 'duplicate' });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'CONFIRMED',
          eventType: 'PLANTATION_VERIFIED',
          eventId: 'plantation-1',
          amount: 50,
        }),
      }),
    );
  });

  it('does not ingest a client-invented ADD_XP event', async () => {
    const service = new EngagementService({} as never);
    await expect(
      service.ingest({
        type: 'ADD_XP' as never,
        actorUserId: 'u1',
        entityId: 'x',
        occurredAt: '2026-03-20T00:00:00.000Z',
      }),
    ).resolves.toEqual({ recorded: false, reason: 'unknown_event' });
  });

  it('awards a configurable first-plant badge from a real plantation row, not a client claim', async () => {
    const prisma = createPrisma({
      badge: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'b1', slug: 'first-plant', name: 'First Plant', description: 'Registered a plantation.', rule: { type: 'first-plant' } },
        ]),
      },
      plantation: { count: vi.fn().mockResolvedValue(1) },
      userBadge: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ badgeId: 'b1', awardedAt: new Date('2026-06-12T00:00:00.000Z') }]),
        create: vi.fn().mockResolvedValue({ userId: citizen.id, badgeId: 'b1' }),
        count: vi.fn().mockResolvedValue(1),
      },
    });
    const service = new EngagementService(prisma as never);
    const list = await service.badges(citizen.id);
    expect(prisma.userBadge.create).toHaveBeenCalledWith({ data: { userId: citizen.id, badgeId: 'b1' } });
    expect(list.items[0]).toMatchObject({ slug: 'first-plant', awarded: true });
  });

  it('counts on-site verified monitoring for a stewardship mission', async () => {
    const missionId = '22222222-2222-4222-8222-222222222222';
    const taskId = '33333333-3333-4333-8333-333333333333';
    const mission = {
      id: missionId,
      type: 'STEWARDSHIP',
      status: 'ACTIVE',
      title: 'Visit one nearby plantation',
      description: 'Submit one valid on-site monitoring observation.',
      campaignId: null,
      rule: { requireOnSite: true },
      tasks: [{ id: taskId, title: 'Submit a verified monitoring update', sortOrder: 1, rule: { eventType: 'MONITORING_VERIFIED' } }],
    };
    const prisma = createPrisma({
      mission: {
        findMany: vi.fn().mockResolvedValue([mission]),
        findUnique: vi.fn().mockResolvedValue(mission),
        count: vi.fn().mockResolvedValue(1),
      },
      monitoringUpdate: { count: vi.fn().mockResolvedValue(1) },
      userMission: { upsert: vi.fn(), count: vi.fn().mockResolvedValue(1) },
    });
    const service = new EngagementService(prisma as never);
    const list = await service.missions(citizen.id);
    expect(list.available).toBe(true);
    expect(list.items[0]).toMatchObject({
      id: missionId,
      userStatus: 'COMPLETED',
      completedTasks: 1,
      totalTasks: 1,
    });
    expect(list.items[0]?.tasks[0]).toMatchObject({ current: 1, required: 1, completed: true });
    expect(prisma.monitoringUpdate.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: citizen.id, verificationStatus: 'VERIFIED', locationValidation: 'ON_SITE' }),
      }),
    );
    await expect(service.mission(citizen.id, 'not-a-uuid')).rejects.toMatchObject({ errorCode: 'MISSION_NOT_FOUND' });
  });

  it('lists ForestDex from the live catalogue and withholds location until an on-site discovery', async () => {
    const prisma = createPrisma({
      species: { findMany: vi.fn().mockResolvedValue([ebony, kumbuk]) },
      speciesDiscovery: {
        findMany: vi.fn().mockResolvedValue([
          {
            speciesId: kumbuk.id,
            plantationId: 'p1',
            discoveredAt: new Date('2026-06-12T00:00:00.000Z'),
          },
        ]),
      },
      monitoringUpdate: {
        findMany: vi.fn().mockResolvedValue([
          { plantation: { species: [{ speciesId: kumbuk.id }] } },
          { plantation: { species: [{ speciesId: kumbuk.id }] } },
        ]),
      },
      plantation: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'p1',
            latitude: { toNumber: () => 6.1964 },
            longitude: { toNumber: () => 81.2203 },
            locationVisibility: 'PUBLIC_EXACT',
            createdById: citizen.id,
            organization: null,
          },
        ]),
      },
    });
    const service = new EngagementService(prisma as never);
    const dex = await service.forestDex(citizen);
    expect(dex.available).toBe(true);
    expect(dex.catalogueCount).toBe(2);
    expect(dex.discoveredCount).toBe(1);
    const locked = dex.entries.find((row) => row.speciesId === ebony.id);
    const found = dex.entries.find((row) => row.speciesId === kumbuk.id);
    expect(locked).toMatchObject({
      discovered: false,
      description: null,
      location: null,
      verifiedEncounters: 0,
      commonEnglishName: 'Ebony',
    });
    expect(found).toMatchObject({
      discovered: true,
      description: 'Riverine canopy tree.',
      verifiedEncounters: 2,
      plantationId: 'p1',
    });
    expect(found?.location?.precision).toBe('exact');
  });

  it('records ON_SITE discoveries on a verified public plantation and confirms discovery XP', async () => {
    const ingestCreate = vi.fn().mockResolvedValue({ id: 'xp' });
    const prisma = createPrisma({
      plantation: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({
            id: 'p1',
            verificationStatus: 'VERIFIED',
            locationVisibility: 'PUBLIC_EXACT',
            species: [{ speciesId: kumbuk.id }],
          })
          .mockResolvedValueOnce({
            id: 'p1',
            verificationStatus: 'VERIFIED',
            locationVisibility: 'PUBLIC_EXACT',
            species: [{ speciesId: kumbuk.id }],
          })
          .mockResolvedValueOnce({
            id: 'secret',
            verificationStatus: 'VERIFIED',
            locationVisibility: 'OFFICER_ONLY',
            species: [{ speciesId: ebony.id }],
          }),
        count: vi.fn().mockResolvedValue(0),
      },
      plantationDiscovery: { create: vi.fn().mockResolvedValue({ id: 'pd1' }), count: vi.fn().mockResolvedValue(1) },
      speciesDiscovery: { create: vi.fn().mockResolvedValue({ id: 'sd1' }), count: vi.fn().mockResolvedValue(1) },
      xpTransaction: {
        create: ingestCreate,
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        count: vi.fn().mockResolvedValue(0),
        aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 125 } }),
        findMany: vi.fn().mockResolvedValue([{ eventType: 'PLANTATION_DISCOVERED' }, { eventType: 'SPECIES_DISCOVERED' }]),
      },
    });
    const service = new EngagementService(prisma as never);
    await expect(
      service.recordOnSiteDiscoveries({
        userId: citizen.id,
        plantationId: 'p1',
        locationValidation: 'REMOTE',
        occurredAt: '2026-06-12T00:00:00.000Z',
      }),
    ).resolves.toEqual({ plantation: false, species: 0 });
    await expect(
      service.recordOnSiteDiscoveries({
        userId: citizen.id,
        plantationId: 'p1',
        locationValidation: 'ON_SITE',
        occurredAt: '2026-06-12T00:00:00.000Z',
      }),
    ).resolves.toEqual({ plantation: true, species: 1 });
    await expect(
      service.recordOnSiteDiscoveries({
        userId: citizen.id,
        plantationId: 'secret',
        locationValidation: 'ON_SITE',
        occurredAt: '2026-06-12T00:00:00.000Z',
      }),
    ).resolves.toEqual({ plantation: false, species: 0 });
    expect(ingestCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'PLANTATION_DISCOVERED', status: 'CONFIRMED', amount: 50 }),
      }),
    );
    expect(ingestCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'SPECIES_DISCOVERED', eventId: kumbuk.id, status: 'CONFIRMED', amount: 75 }),
      }),
    );
  });
});

function createPrisma(overrides: Record<string, unknown> = {}) {
  const base = {
    engagementProfile: {
      upsert: vi.fn().mockResolvedValue({ userId: 'u1', confirmedXp: 0, ecoPoints: 0, level: 1, displayTitle: 'Seedling' }),
      update: vi.fn().mockResolvedValue({}),
    },
    xpTransaction: {
      create: vi.fn().mockResolvedValue({ id: 'xp1' }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    species: { count: vi.fn().mockResolvedValue(4), findMany: vi.fn().mockResolvedValue([]) },
    speciesDiscovery: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
    },
    plantationDiscovery: { count: vi.fn().mockResolvedValue(0), create: vi.fn() },
    plantation: { count: vi.fn().mockResolvedValue(0), findUnique: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    badge: { findMany: vi.fn().mockResolvedValue([]) },
    userBadge: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    mission: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn(), count: vi.fn().mockResolvedValue(0) },
    userMission: { findMany: vi.fn().mockResolvedValue([]), upsert: vi.fn(), count: vi.fn().mockResolvedValue(0) },
    monitoringUpdate: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
  };
  const merged = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    merged[key as keyof typeof merged] = {
      ...(base[key as keyof typeof base] as Record<string, unknown>),
      ...(value as Record<string, unknown>),
    } as never;
  }
  return merged;
}
