import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestUser } from '../auth/types';
import { CommentsService } from './comments.service';

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
  organization: { createdById: '99999999-9999-4999-8999-999999999999' },
};

const seedComment = {
  id: '33333333-3333-4333-8333-333333333333',
  plantationId: plantation.id,
  userId: citizen.id,
  parentId: null,
  body: 'Visited during the June community monitoring day.',
  createdAt: new Date('2026-06-12T00:00:00.000Z'),
  user: {
    id: citizen.id,
    displayName: 'Citizen',
    roles: [{ role: { code: 'CITIZEN' } }],
  },
  reactions: [],
  replies: [],
};

describe('CommentsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists public comments for guests', async () => {
    const prisma = createPrisma({
      plantation: { findUnique: vi.fn().mockResolvedValue(plantation) },
      comment: {
        findMany: vi.fn().mockResolvedValue([seedComment]),
        count: vi.fn().mockResolvedValue(1),
      },
    });
    const service = new CommentsService(prisma as never);
    const page = await service.list(plantation.id, { page: 1, limit: 20 }, undefined);
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.body).toContain('June community monitoring');
    expect(page.items[0]?.author.officer).toBe(false);
  });

  it('rejects a reply to a reply', async () => {
    const prisma = createPrisma({
      plantation: { findUnique: vi.fn().mockResolvedValue(plantation) },
      comment: {
        findUnique: vi.fn().mockResolvedValue({
          id: '44444444-4444-4444-8444-444444444444',
          plantationId: plantation.id,
          parentId: seedComment.id,
        }),
      },
    });
    const service = new CommentsService(prisma as never);
    await expect(
      service.create(
        plantation.id,
        { body: 'Nested too deep', parentId: '44444444-4444-4444-8444-444444444444' },
        citizen,
      ),
    ).rejects.toMatchObject({ errorCode: 'VALIDATION_ERROR' });
  });

  it('toggles a Helpful reaction instead of inventing a count', async () => {
    const prisma = createPrisma({
      plantation: { findUnique: vi.fn().mockResolvedValue(plantation) },
      comment: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({ id: seedComment.id, plantationId: plantation.id, userId: citizen.id })
          .mockResolvedValueOnce({
            ...seedComment,
            reactions: [{ userId: citizen.id, type: 'HELPFUL' }],
          }),
      },
      commentReaction: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) },
    });
    const service = new CommentsService(prisma as never);
    const node = await service.toggleReaction(plantation.id, seedComment.id, { type: 'HELPFUL' }, citizen);
    expect(prisma.commentReaction.create).toHaveBeenCalled();
    expect(node.helpfulCount).toBe(1);
    expect(node.reacted).toBe(true);
  });
});

function createPrisma(overrides: Record<string, unknown> = {}) {
  const { plantation, comment, commentReaction, ...rest } = overrides;
  return {
    plantation: {
      findUnique: vi.fn(),
      ...(plantation as Record<string, unknown> | undefined),
    },
    comment: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      ...(comment as Record<string, unknown> | undefined),
    },
    commentReaction: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      ...(commentReaction as Record<string, unknown> | undefined),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    ...rest,
  };
}
