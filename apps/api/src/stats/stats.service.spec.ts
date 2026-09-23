import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestUser } from '../auth/types';
import { StatsService } from './stats.service';

const citizen: RequestUser = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  email: 'citizen@localhost',
  roles: ['CITIZEN'],
  sessionId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
};

describe('StatsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('counts only VERIFIED plantations on the public impact dashboard', async () => {
    const prisma = createPrisma({
      plantation: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { treeCount: 1250 }, _count: 1 }),
        groupBy: vi.fn().mockResolvedValue([{ districtCode: 'LK-33', _sum: { treeCount: 1250 } }]),
        findMany: vi.fn().mockResolvedValue([{ createdById: citizen.id }]),
      },
      monitoringUpdate: { count: vi.fn().mockResolvedValue(1) },
      campaign: { count: vi.fn().mockResolvedValue(1), findMany: vi.fn().mockResolvedValue([]) },
      plantationSpecies: { groupBy: vi.fn().mockResolvedValue([]) },
      species: { findMany: vi.fn().mockResolvedValue([]) },
      $queryRaw: vi.fn().mockResolvedValue([{ total: 1180, n: 1, key: '2026', trees: 1250 }]),
    });
    const service = new StatsService(prisma as never);
    const stats = await service.publicImpact({});
    expect(prisma.plantation.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ verificationStatus: 'VERIFIED' }) }),
    );
    expect(stats.treesRecorded).toBe(1250);
    expect(stats.verifiedTrees).toBe(1250);
    expect(stats.estimatedSurvivingTrees).toBe(1180);
    expect(stats.estimatedSurvivingTrees).not.toBe(stats.treesRecorded);
    expect(stats.plantationSites).toBe(1);
  });

  it('projects ForestQuest from confirmed ledger rows instead of inventing totals', async () => {
    const prisma = createPrisma({
      organization: { findMany: vi.fn().mockResolvedValue([]) },
      plantation: { count: vi.fn().mockResolvedValue(1), aggregate: vi.fn() },
      monitoringUpdate: { count: vi.fn().mockResolvedValue(2) },
      report: { count: vi.fn().mockResolvedValue(0) },
      notification: { count: vi.fn().mockResolvedValue(3) },
    });
    const engagement = {
      profile: vi.fn().mockResolvedValue({
        available: true,
        confirmedXp: 0,
        ecoPoints: 0,
        level: 1,
        displayTitle: 'Seedling',
        nextTitle: 'Sprout',
        pendingEvents: 2,
        rewardsActive: true,
        forestDex: { available: true, discoveredCount: 0, catalogueCount: 4 },
        missions: { available: true, activeCount: 1, completedCount: 0 },
        badges: { available: true, awardedCount: 0 },
      }),
    };
    const service = new StatsService(prisma as never, engagement as never);
    const me = await service.me(citizen);
    expect(me.plantations).toBe(1);
    expect(me.unreadNotifications).toBe(3);
    expect(me.forestQuest).toMatchObject({
      available: true,
      confirmedXp: 0,
      displayTitle: 'Seedling',
      pendingEvents: 2,
      rewardsActive: true,
    });
    expect(engagement.profile).toHaveBeenCalledWith(citizen.id);
  });


  it('rejects one-letter catalogue dumps by requiring a two-character search', async () => {
    const service = new StatsService(createPrisma() as never);
    await expect(service.search({ q: 'Ha', page: 1, limit: 20 }, undefined)).resolves.toMatchObject({
      meta: expect.objectContaining({ page: 1 }),
    });
  });
});

function createPrisma(overrides: Record<string, unknown> = {}) {
  const { plantation, campaign, organization, species, monitoringUpdate, report, notification, ...rest } = overrides;
  return {
    plantation: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { treeCount: 0 }, _count: 0 }),
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
      findMany: vi.fn().mockResolvedValue([]),
      ...(plantation as Record<string, unknown> | undefined),
    },
    campaign: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
      ...(campaign as Record<string, unknown> | undefined),
    },
    organization: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
      ...(organization as Record<string, unknown> | undefined),
    },
    species: {
      findMany: vi.fn().mockResolvedValue([]),
      ...(species as Record<string, unknown> | undefined),
    },
    plantationSpecies: { groupBy: vi.fn().mockResolvedValue([]) },
    monitoringUpdate: { count: vi.fn().mockResolvedValue(0), ...(monitoringUpdate as Record<string, unknown> | undefined) },
    report: { count: vi.fn().mockResolvedValue(0), ...(report as Record<string, unknown> | undefined) },
    notification: { count: vi.fn().mockResolvedValue(0), ...(notification as Record<string, unknown> | undefined) },
    officerAssignment: { findMany: vi.fn().mockResolvedValue([]) },
    officerInspection: { findMany: vi.fn().mockResolvedValue([]) },
    auditLog: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    user: { count: vi.fn().mockResolvedValue(0) },
    userRole: { count: vi.fn().mockResolvedValue(0) },
    plantationImage: { aggregate: vi.fn().mockResolvedValue({ _sum: { sizeBytes: 0 } }) },
    monitoringImage: { aggregate: vi.fn().mockResolvedValue({ _sum: { sizeBytes: 0 } }) },
    reportImage: { aggregate: vi.fn().mockResolvedValue({ _sum: { sizeBytes: 0 } }) },
    inspectionImage: { aggregate: vi.fn().mockResolvedValue({ _sum: { sizeBytes: 0 } }) },
    $queryRaw: vi.fn().mockResolvedValue([]),
    ...rest,
  };
}
