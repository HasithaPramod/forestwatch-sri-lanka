import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestUser } from '../auth/types';
import { VerificationsService } from './verifications.service';

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
  verificationStatus: 'UNDER_REVIEW' as const,
  provinceCode: 'LK-3',
  districtCode: 'LK-33',
  dsdCode: '3-3-09',
  organization: { createdById: '99999999-9999-4999-8999-999999999999' },
};

const priorVerification = {
  id: '77777777-7777-4777-8777-777777777777',
  subjectType: 'PLANTATION' as const,
  subjectId: plantation.id,
  decision: 'VERIFIED' as const,
  notes: 'Site matches submitted polygon centroid.',
  createdAt: new Date('2026-03-20T00:00:00.000Z'),
  actor: { id: officer.id, displayName: 'Forest Officer' },
};

describe('VerificationsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hides officer notes from guests', async () => {
    const prisma = createPrisma({
      plantation: { findUnique: vi.fn().mockResolvedValue({ ...plantation, verificationStatus: 'VERIFIED' }) },
      verification: {
        findMany: vi.fn().mockResolvedValue([priorVerification]),
        count: vi.fn().mockResolvedValue(1),
      },
    });
    const service = new VerificationsService(prisma as never);
    const page = await service.list(
      { page: 1, limit: 20, subjectType: 'PLANTATION', subjectId: plantation.id },
      undefined,
    );
    expect(page.items[0]?.decision).toBe('VERIFIED');
    expect(page.items[0]?.notes).toBeNull();
    expect(page.items[0]?.actor.displayName).toBe('Forest Officer');
  });

  it('appends a new verification row instead of overwriting history', async () => {
    const created = {
      ...priorVerification,
      id: '88888888-8888-4888-8888-888888888888',
      decision: 'REJECTED' as const,
      notes: 'Boundary does not match the field visit.',
      createdAt: new Date('2026-09-18T00:00:00.000Z'),
    };
    const prisma = createPrisma({
      plantation: { findUnique: vi.fn().mockResolvedValue(plantation) },
      officerAssignment: {
        findMany: vi.fn().mockResolvedValue([{ districtCode: 'LK-33', dsdCode: null, provinceCode: 'LK-3' }]),
      },
      $transaction: vi.fn(async (fn: (tx: Record<string, unknown>) => unknown) =>
        fn({
          verification: {
            create: vi.fn().mockResolvedValue(created),
            update: vi.fn(),
          },
          plantation: { update: vi.fn().mockResolvedValue({ ...plantation, verificationStatus: 'REJECTED' }) },
        }),
      ),
    });
    const engagement = { ingest: vi.fn().mockResolvedValue({ recorded: true }) };
    const service = new VerificationsService(prisma as never, undefined, engagement as never);
    const row = await service.create(
      {
        subjectType: 'PLANTATION',
        subjectId: plantation.id,
        decision: 'REJECTED',
        notes: 'Boundary does not match the field visit.',
      },
      officer,
    );

    expect(row.decision).toBe('REJECTED');
    expect(row.id).not.toBe(priorVerification.id);
    expect(engagement.ingest).not.toHaveBeenCalled();
    const tx = await prisma.$transaction.mock.calls[0]?.[0];
    expect(tx).toBeTypeOf('function');
    expect(prisma.verification.update).not.toHaveBeenCalled();
  });

  it('rejects a citizen recording a decision', async () => {
    const service = new VerificationsService(createPrisma() as never);
    await expect(
      service.create(
        { subjectType: 'PLANTATION', subjectId: plantation.id, decision: 'VERIFIED', notes: 'Nope' },
        citizen,
      ),
    ).rejects.toMatchObject({ errorCode: 'FORBIDDEN' });
  });

  it('does not rewrite monitoring observations when verifying', async () => {
    const prisma = createPrisma({
      monitoringUpdate: {
        findUnique: vi.fn().mockResolvedValue({
          id: '22222222-2222-4222-8222-222222222222',
          plantationId: plantation.id,
          userId: citizen.id,
          verificationStatus: 'PENDING',
          plantation,
        }),
        update: vi.fn(),
      },
      officerAssignment: {
        findMany: vi.fn().mockResolvedValue([{ districtCode: 'LK-33', dsdCode: null, provinceCode: 'LK-3' }]),
      },
      $transaction: vi.fn(async (fn: (tx: Record<string, unknown>) => unknown) =>
        fn({
          verification: {
            create: vi.fn().mockResolvedValue({
              ...priorVerification,
              subjectType: 'MONITORING',
              subjectId: '22222222-2222-4222-8222-222222222222',
              decision: 'VERIFIED',
            }),
          },
          monitoringUpdate: {
            update: vi.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
              expect(data).toEqual({ verificationStatus: 'VERIFIED' });
              return {};
            }),
          },
        }),
      ),
    });
    const engagement = { ingest: vi.fn().mockResolvedValue({ recorded: true }) };
    const service = new VerificationsService(prisma as never, undefined, engagement as never);
    await service.create(
      {
        subjectType: 'MONITORING',
        subjectId: '22222222-2222-4222-8222-222222222222',
        decision: 'VERIFIED',
        notes: 'On-site photographs match.',
      },
      officer,
    );
    expect(engagement.ingest).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'MONITORING_VERIFIED',
        actorUserId: citizen.id,
        entityId: '22222222-2222-4222-8222-222222222222',
      }),
    );
  });

  it('rejects REQUEST_CORRECTION on monitoring so history stays append-only', async () => {
    const service = new VerificationsService(createPrisma() as never);
    await expect(
      service.create(
        {
          subjectType: 'MONITORING',
          subjectId: '22222222-2222-4222-8222-222222222222',
          decision: 'REQUEST_CORRECTION',
        },
        officer,
      ),
    ).rejects.toMatchObject({ errorCode: 'VERIFICATION_STATUS' });
  });
});

function createPrisma(overrides: Record<string, unknown> = {}) {
  return {
    plantation: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), ...((overrides.plantation as object) ?? {}) },
    monitoringUpdate: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      ...((overrides.monitoringUpdate as object) ?? {}),
    },
    verification: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      ...((overrides.verification as object) ?? {}),
    },
    officerAssignment: {
      findMany: vi.fn().mockResolvedValue([]),
      ...((overrides.officerAssignment as object) ?? {}),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn(),
    ...overrides,
  };
}
