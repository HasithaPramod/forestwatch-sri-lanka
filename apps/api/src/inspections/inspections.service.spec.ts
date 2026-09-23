import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestUser } from '../auth/types';
import { InspectionsService } from './inspections.service';

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

const plantation = {
  id: 'ba6f6ef0-90fe-4d9c-8376-568a218c9d93',
  createdById: citizen.id,
  verificationStatus: 'VERIFIED' as const,
  locationVisibility: 'PUBLIC_EXACT' as const,
  provinceCode: 'LK-3',
  districtCode: 'LK-33',
  dsdCode: '3-3-09',
  treeCount: 1250,
  organization: { createdById: '99999999-9999-4999-8999-999999999999' },
};

describe('InspectionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks a citizen from filing an officer inspection', async () => {
    const service = new InspectionsService(createPrisma() as never, createStorage() as never);
    await expect(
      service.create(
        plantation.id,
        { condition: 'FAIR', notes: 'Canopy establishing along the bund after the dry spell.' },
        citizen,
      ),
    ).rejects.toMatchObject({ errorCode: 'FORBIDDEN' });
  });

  it('does not change plantation.treeCount when an officer records an estimate', async () => {
    const created = {
      id: '66666666-6666-4666-8666-666666666666',
      clientUuid: null,
      plantationId: plantation.id,
      officerId: officer.id,
      inspectedAt: new Date('2026-09-18T00:00:00.000Z'),
      createdAt: new Date('2026-09-18T00:00:00.000Z'),
      latitude: null,
      longitude: null,
      gpsAccuracyMeters: null,
      estimatedTreeCount: 1180,
      estimatedSurvivalPct: { toNumber: () => 87 },
      condition: 'FAIR',
      notes: 'Official inspection after the dry spell. Edge mortality visible.',
      recommendedAction: 'Schedule a watering follow-up.',
      officer: { id: officer.id, displayName: 'Forest Officer' },
      images: [],
      plantation,
    };
    const prisma = createPrisma({
      plantation: { findUnique: vi.fn().mockResolvedValue(plantation) },
      officerAssignment: {
        findMany: vi.fn().mockResolvedValue([{ districtCode: 'LK-33', dsdCode: null, provinceCode: 'LK-3' }]),
      },
      officerInspection: {
        create: vi.fn().mockResolvedValue(created),
      },
    });
    const service = new InspectionsService(prisma as never, createStorage() as never);
    const detail = await service.create(
      plantation.id,
      {
        condition: 'FAIR',
        notes: 'Official inspection after the dry spell. Edge mortality visible.',
        estimatedTreeCount: 1180,
        estimatedSurvivalPct: 87,
        recommendedAction: 'Schedule a watering follow-up.',
      },
      officer,
    );

    expect(detail.estimatedTreeCount).toBe(1180);
    expect(prisma.plantation.update).not.toHaveBeenCalled();
    expect(detail.officer.displayName).toBe('Forest Officer');
  });

  it('returns the existing inspection for a repeated clientUuid instead of inserting again', async () => {
    const existing = {
      id: '77777777-7777-4777-8777-777777777777',
      clientUuid: '11111111-1111-4111-8111-111111111111',
      plantationId: plantation.id,
      officerId: officer.id,
      inspectedAt: new Date('2026-09-18T00:00:00.000Z'),
      createdAt: new Date('2026-09-18T00:00:00.000Z'),
      latitude: null,
      longitude: null,
      gpsAccuracyMeters: null,
      estimatedTreeCount: 1180,
      estimatedSurvivalPct: { toNumber: () => 87 },
      condition: 'FAIR',
      notes: 'Official inspection after the dry spell. Edge mortality visible.',
      recommendedAction: null,
      officer: { id: officer.id, displayName: 'Forest Officer' },
      images: [],
      plantation,
    };
    const prisma = createPrisma({
      plantation: { findUnique: vi.fn().mockResolvedValue(plantation) },
      officerAssignment: {
        findMany: vi.fn().mockResolvedValue([{ districtCode: 'LK-33', dsdCode: null, provinceCode: 'LK-3' }]),
      },
      officerInspection: {
        findUnique: vi.fn().mockResolvedValue(existing),
        create: vi.fn(),
      },
    });
    const service = new InspectionsService(prisma as never, createStorage() as never);
    const detail = await service.create(
      plantation.id,
      {
        clientUuid: '11111111-1111-4111-8111-111111111111',
        condition: 'FAIR',
        notes: 'Official inspection after the dry spell. Edge mortality visible.',
      },
      officer,
    );

    expect(detail.id).toBe(existing.id);
    expect(prisma.officerInspection.create).not.toHaveBeenCalled();
  });
});

function createPrisma(overrides: Record<string, unknown> = {}) {
  const { plantation, officerInspection, officerAssignment, ...rest } = overrides as {
    plantation?: Record<string, unknown>;
    officerInspection?: Record<string, unknown>;
    officerAssignment?: Record<string, unknown>;
  };
  return {
    plantation: { findUnique: vi.fn(), update: vi.fn(), ...plantation },
    officerInspection: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      ...officerInspection,
    },
    inspectionImage: { create: vi.fn(), delete: vi.fn() },
    officerAssignment: {
      findMany: vi.fn().mockResolvedValue([]),
      ...officerAssignment,
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    ...rest,
  };
}

function createStorage() {
  return {
    resolvePublicImage: vi.fn().mockResolvedValue(null),
    putOptimizedImage: vi.fn(),
    removeOptimizedImage: vi.fn(),
  };
}
