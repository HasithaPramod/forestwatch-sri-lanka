import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GEO_PROXIMITY_METERS } from '@forestwatch/config';
import type { RequestUser } from '../auth/types';
import { MonitoringService } from './monitoring.service';

const citizen: RequestUser = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  email: 'citizen@localhost',
  roles: ['CITIZEN'],
  sessionId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
};

const plantation = {
  id: '11111111-1111-4111-8111-111111111111',
  createdById: citizen.id,
  verificationStatus: 'VERIFIED' as const,
  locationVisibility: 'PUBLIC_EXACT' as const,
  organization: { createdById: '99999999-9999-4999-8999-999999999999' },
};

const verifiedUpdate = {
  id: '22222222-2222-4222-8222-222222222222',
  clientUuid: null,
  plantationId: plantation.id,
  userId: citizen.id,
  observedAt: new Date('2026-06-12T00:00:00.000Z'),
  latitude: { toNumber: () => 6.1965 },
  longitude: { toNumber: () => 81.2204 },
  gpsAccuracyMeters: { toNumber: () => 8 },
  distanceFromPlantation: { toNumber: () => 18 },
  locationValidation: 'ON_SITE' as const,
  healthStatus: 'HEALTHY' as const,
  estimatedSurvivingTrees: 1180,
  estimatedDeadTrees: 70,
  estimatedHeightCm: null,
  observation: 'Canopy establishing. Some edge mortality after dry spell.',
  verificationStatus: 'VERIFIED' as const,
  createdAt: new Date('2026-06-12T00:00:00.000Z'),
  user: { id: citizen.id, displayName: 'Citizen' },
  images: [],
  plantation,
};

describe('MonitoringService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists only verified updates for guests', async () => {
    const prisma = createPrisma({
      plantation: { findUnique: vi.fn().mockResolvedValue(plantation) },
      monitoringUpdate: {
        findMany: vi.fn().mockResolvedValue([verifiedUpdate]),
        count: vi.fn().mockResolvedValue(1),
      },
    });
    const service = new MonitoringService(prisma as never, createStorage() as never);
    const page = await service.list(plantation.id, { page: 1, limit: 20 }, undefined);

    expect(prisma.monitoringUpdate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { plantationId: plantation.id, verificationStatus: 'VERIFIED' } }),
    );
    expect(page.items[0]?.healthStatus).toBe('HEALTHY');
    expect(page.items[0]?.estimatedSurvivingTrees).toBe(1180);
  });

  it('computes ON_SITE from PostGIS instead of trusting the client', async () => {
    const prisma = createPrisma({
      plantation: { findUnique: vi.fn().mockResolvedValue(plantation) },
      systemSetting: {
        findUnique: vi.fn().mockResolvedValue({ value: { onSiteMax: 100, nearbyMax: 500 } }),
      },
      $queryRaw: vi.fn().mockResolvedValue([{ meters: 18 }]),
      monitoringUpdate: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
          ...verifiedUpdate,
          ...data,
          verificationStatus: 'PENDING',
          user: { id: citizen.id, displayName: 'Citizen' },
          images: [],
          plantation,
        })),
      },
    });
    const service = new MonitoringService(prisma as never, createStorage() as never);
    const created = await service.create(
      plantation.id,
      {
        healthStatus: 'FAIR',
        observation: 'Visited after the monsoon.',
        latitude: 6.1965,
        longitude: 81.2204,
        gpsAccuracyMeters: 8,
      },
      citizen,
    );

    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(prisma.monitoringUpdate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          locationValidation: 'ON_SITE',
          distanceFromPlantation: 18,
          verificationStatus: 'PENDING',
          healthStatus: 'FAIR',
        }),
      }),
    );
    expect(created.locationValidation).toBe('ON_SITE');
    expect(created.verificationStatus).toBe('PENDING');
    expect(GEO_PROXIMITY_METERS.onSiteMax).toBe(100);
  });

  it('marks missing GPS as LOCATION_UNAVAILABLE and does not invent a distance', async () => {
    const prisma = createPrisma({
      plantation: { findUnique: vi.fn().mockResolvedValue(plantation) },
      monitoringUpdate: {
        create: vi.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
          ...verifiedUpdate,
          ...data,
          latitude: null,
          longitude: null,
          gpsAccuracyMeters: null,
          distanceFromPlantation: null,
          locationValidation: 'LOCATION_UNAVAILABLE',
          verificationStatus: 'PENDING',
          user: { id: citizen.id, displayName: 'Citizen' },
          images: [],
          plantation,
        })),
      },
    });
    const service = new MonitoringService(prisma as never, createStorage() as never);
    const created = await service.create(
      plantation.id,
      { healthStatus: 'UNKNOWN', observation: 'Could not capture a GPS fix.' },
      citizen,
    );

    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(created.locationValidation).toBe('LOCATION_UNAVAILABLE');
    expect(created.distanceFromPlantation).toBeNull();
    expect(prisma.plantation.update).not.toHaveBeenCalled();
  });

  it('records MONITORING_SUBMITTED as a pending engagement event', async () => {
    const prisma = createPrisma({
      plantation: { findUnique: vi.fn().mockResolvedValue(plantation) },
      monitoringUpdate: {
        create: vi.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
          ...verifiedUpdate,
          ...data,
          verificationStatus: 'PENDING',
          user: { id: citizen.id, displayName: 'Citizen' },
          images: [],
          plantation,
        })),
      },
    });
    const engagement = {
      ingest: vi.fn().mockResolvedValue({ recorded: true }),
      recordOnSiteDiscoveries: vi.fn(),
    };
    const service = new MonitoringService(prisma as never, createStorage() as never, engagement as never);
    await service.create(plantation.id, { healthStatus: 'UNKNOWN', observation: 'Queued visit notes.' }, citizen);
    expect(engagement.ingest).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'MONITORING_SUBMITTED',
        actorUserId: citizen.id,
        entityId: verifiedUpdate.id,
      }),
    );
    expect(engagement.recordOnSiteDiscoveries).not.toHaveBeenCalled();
  });

  it('asks EngagementService to record ForestDex discoveries only for ON_SITE visits', async () => {
    const prisma = createPrisma({
      plantation: { findUnique: vi.fn().mockResolvedValue(plantation) },
      systemSetting: {
        findUnique: vi.fn().mockResolvedValue({ value: { onSiteMax: 100, nearbyMax: 500 } }),
      },
      $queryRaw: vi.fn().mockResolvedValue([{ meters: 18 }]),
      monitoringUpdate: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
          ...verifiedUpdate,
          ...data,
          verificationStatus: 'PENDING',
          user: { id: citizen.id, displayName: 'Citizen' },
          images: [],
          plantation,
        })),
      },
    });
    const engagement = {
      ingest: vi.fn().mockResolvedValue({ recorded: true }),
      recordOnSiteDiscoveries: vi.fn().mockResolvedValue({ plantation: true, species: 1 }),
    };
    const service = new MonitoringService(prisma as never, createStorage() as never, engagement as never);
    await service.create(
      plantation.id,
      {
        healthStatus: 'FAIR',
        observation: 'Visited after the monsoon.',
        latitude: 6.1965,
        longitude: 81.2204,
        gpsAccuracyMeters: 8,
      },
      citizen,
    );
    expect(engagement.recordOnSiteDiscoveries).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: citizen.id,
        plantationId: plantation.id,
        locationValidation: 'ON_SITE',
      }),
    );
  });
});

function createPrisma(overrides: Record<string, unknown> = {}) {
  const { plantation, monitoringUpdate, systemSetting, ...rest } = overrides;
  return {
    plantation: {
      findUnique: vi.fn(),
      update: vi.fn(),
      ...(plantation as Record<string, unknown> | undefined),
    },
    monitoringUpdate: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      ...(monitoringUpdate as Record<string, unknown> | undefined),
    },
    monitoringImage: { create: vi.fn(), delete: vi.fn() },
    systemSetting: { findUnique: vi.fn().mockResolvedValue(null), ...(systemSetting as Record<string, unknown> | undefined) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    $queryRaw: vi.fn(),
    ...rest,
  };
}

function createStorage() {
  return {
    resolvePublicImage: vi.fn(async () => null),
    putOptimizedImage: vi.fn(),
    removeOptimizedImage: vi.fn(),
  };
}
