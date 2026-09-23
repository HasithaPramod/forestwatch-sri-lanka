import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestUser } from '../auth/types';
import { ReportsService } from './reports.service';

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
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Bundala Restoration Site 04',
  provinceCode: 'LK-3',
  districtCode: 'LK-33',
  dsdCode: '3-3-09',
  createdById: citizen.id,
  verificationStatus: 'VERIFIED' as const,
  organization: { createdById: '99999999-9999-4999-8999-999999999999' },
};

const openReport = {
  id: '55555555-5555-4555-8555-555555555555',
  clientUuid: null,
  plantationId: plantation.id,
  userId: citizen.id,
  category: 'ILLEGAL_CUTTING' as const,
  status: 'OPEN' as const,
  description: 'Fresh stumps along the bund, not visible on the public map.',
  createdAt: new Date('2026-09-18T00:00:00.000Z'),
  updatedAt: new Date('2026-09-18T00:00:00.000Z'),
  user: { id: citizen.id, displayName: 'Citizen' },
  images: [],
  plantation,
};

describe('ReportsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hides plantation issue reports from guests', async () => {
    const prisma = createPrisma({
      plantation: { findUnique: vi.fn().mockResolvedValue(plantation) },
    });
    const service = new ReportsService(prisma as never, createStorage() as never);
    const page = await service.listForPlantation(plantation.id, { page: 1, limit: 20 }, undefined);

    expect(prisma.report.findMany).not.toHaveBeenCalled();
    expect(page.items).toEqual([]);
    expect(page.meta.total).toBe(0);
  });

  it('creates reports as OPEN and ignores a client-supplied resolved status', async () => {
    const prisma = createPrisma({
      plantation: { findUnique: vi.fn().mockResolvedValue(plantation) },
      report: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
          ...openReport,
          ...data,
          status: 'OPEN',
          user: { id: citizen.id, displayName: 'Citizen' },
          images: [],
          plantation,
        })),
      },
    });
    const service = new ReportsService(prisma as never, createStorage() as never);
    const created = await service.create(
      plantation.id,
      { category: 'ILLEGAL_CUTTING', description: 'Fresh stumps along the bund, not visible on the public map.' },
      citizen,
    );

    expect(prisma.report.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'OPEN', category: 'ILLEGAL_CUTTING' }),
      }),
    );
    expect(created.status).toBe('OPEN');
  });

  it('rejects skipping OPEN to RESOLVED', async () => {
    const prisma = createPrisma({
      report: { findUnique: vi.fn().mockResolvedValue(openReport) },
      officerAssignment: {
        findMany: vi.fn().mockResolvedValue([{ districtCode: 'LK-33', dsdCode: null, provinceCode: 'LK-3' }]),
      },
    });
    const service = new ReportsService(prisma as never, createStorage() as never);

    await expect(service.updateStatus(openReport.id, { status: 'RESOLVED' }, officer)).rejects.toMatchObject({
      errorCode: 'REPORT_STATUS',
    });
    expect(prisma.report.update).not.toHaveBeenCalled();
  });

  it('lets an assigned officer move OPEN to UNDER_REVIEW', async () => {
    const prisma = createPrisma({
      report: {
        findUnique: vi.fn().mockResolvedValue(openReport),
        update: vi.fn().mockResolvedValue({ ...openReport, status: 'UNDER_REVIEW' }),
      },
      officerAssignment: {
        findMany: vi.fn().mockResolvedValue([{ districtCode: 'LK-33', dsdCode: null, provinceCode: 'LK-3' }]),
      },
    });
    const service = new ReportsService(prisma as never, createStorage() as never);
    const updated = await service.updateStatus(openReport.id, { status: 'UNDER_REVIEW' }, officer);

    expect(updated.status).toBe('UNDER_REVIEW');
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'REPORT_STATUS_CHANGED' }) }),
    );
  });

  it('blocks a citizen from changing report status', async () => {
    const prisma = createPrisma({
      report: { findUnique: vi.fn().mockResolvedValue(openReport) },
    });
    const service = new ReportsService(prisma as never, createStorage() as never);

    await expect(service.updateStatus(openReport.id, { status: 'UNDER_REVIEW' }, citizen)).rejects.toMatchObject({
      errorCode: 'FORBIDDEN',
    });
  });

  it('records REPORT_VERIFIED for the reporter when an officer resolves a report', async () => {
    const actionRequired = { ...openReport, status: 'ACTION_REQUIRED' as const };
    const prisma = createPrisma({
      report: {
        findUnique: vi.fn().mockResolvedValue(actionRequired),
        update: vi.fn().mockResolvedValue({ ...actionRequired, status: 'RESOLVED', updatedAt: new Date('2026-09-18T12:00:00.000Z') }),
      },
      officerAssignment: {
        findMany: vi.fn().mockResolvedValue([{ districtCode: 'LK-33', dsdCode: null, provinceCode: 'LK-3' }]),
      },
    });
    const engagement = { ingest: vi.fn().mockResolvedValue({ recorded: true }) };
    const service = new ReportsService(prisma as never, createStorage() as never, undefined, engagement as never);
    const updated = await service.updateStatus(actionRequired.id, { status: 'RESOLVED' }, officer);
    expect(updated.status).toBe('RESOLVED');
    expect(engagement.ingest).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'REPORT_VERIFIED',
        actorUserId: citizen.id,
        entityId: actionRequired.id,
      }),
    );
  });
});

function createPrisma(overrides: Record<string, unknown> = {}) {
  const { plantation, report, officerAssignment, auditLog, ...rest } = overrides as {
    plantation?: Record<string, unknown>;
    report?: Record<string, unknown>;
    officerAssignment?: Record<string, unknown>;
    auditLog?: Record<string, unknown>;
  };
  return {
    plantation: {
      findUnique: vi.fn(),
      ...plantation,
    },
    report: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      ...report,
    },
    reportImage: {
      create: vi.fn(),
      delete: vi.fn(),
    },
    officerAssignment: {
      findMany: vi.fn().mockResolvedValue([]),
      ...officerAssignment,
    },
    auditLog: { create: vi.fn().mockResolvedValue({}), ...auditLog },
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
