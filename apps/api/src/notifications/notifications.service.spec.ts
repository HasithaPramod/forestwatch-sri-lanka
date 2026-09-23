import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalPushProvider } from './local-push.provider';
import { NotificationsService } from './notifications.service';

const userId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const actorId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const row = {
  id: '11111111-1111-4111-8111-111111111111',
  userId,
  type: 'PLANTATION_VERIFIED',
  title: 'Plantation verified',
  body: 'Bundala Restoration Site 04 is now verified.',
  payload: { plantationId: 'ba6f6ef0-90fe-4d9c-8376-568a218c9d93' },
  readAt: null,
  createdAt: new Date('2026-09-18T00:00:00.000Z'),
};

describe('NotificationsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips notifying the actor and does not insert a row', async () => {
    const prisma = createPrisma();
    const service = new NotificationsService(prisma as never, new LocalPushProvider());
    await expect(
      service.notify({
        userId: actorId,
        actorId,
        type: 'PLANTATION_VERIFIED',
        title: 'Plantation verified',
        body: 'You verified this record.',
      }),
    ).resolves.toBeNull();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('treats a missing preference row as enabled', async () => {
    const prisma = createPrisma({
      notificationPreference: { findUnique: vi.fn().mockResolvedValue(null) },
      notification: { create: vi.fn().mockResolvedValue(row) },
      pushDevice: { findMany: vi.fn().mockResolvedValue([{ token: 'local-dev-token-01' }]) },
    });
    const push = { send: vi.fn().mockResolvedValue({ attempted: 1, delivered: 0 }) };
    const service = new NotificationsService(prisma as never, push as never);
    const created = await service.notify({
      userId,
      actorId,
      type: 'PLANTATION_VERIFIED',
      title: row.title,
      body: row.body,
      payload: row.payload,
    });
    expect(created?.id).toBe(row.id);
    expect(push.send).toHaveBeenCalledWith(['local-dev-token-01'], { title: row.title, body: row.body });
  });

  it('does not insert when the user disabled that type', async () => {
    const prisma = createPrisma({
      notificationPreference: { findUnique: vi.fn().mockResolvedValue({ enabled: false }) },
    });
    const service = new NotificationsService(prisma as never, new LocalPushProvider());
    await expect(
      service.notify({
        userId,
        actorId,
        type: 'COMMENT_REPLY',
        title: 'New reply',
        body: 'A reply was posted.',
      }),
    ).resolves.toBeNull();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('returns a live unreadCount from SQL, not the page length', async () => {
    const prisma = createPrisma({
      notification: {
        findMany: vi.fn().mockResolvedValue([row]),
        count: vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(4),
      },
    });
    const service = new NotificationsService(prisma as never, new LocalPushProvider());
    const page = await service.list({ page: 1, limit: 20, unread: false }, userId);
    expect(page.items).toHaveLength(1);
    expect(page.meta.total).toBe(1);
    expect(page.meta.unreadCount).toBe(4);
  });
});

describe('LocalPushProvider', () => {
  it('never reports local delivery as success', async () => {
    const provider = new LocalPushProvider();
    await expect(provider.send(['token-a', 'token-b'], { title: 'Test', body: 'Hook only' })).resolves.toEqual({
      attempted: 2,
      delivered: 0,
    });
  });
});

function createPrisma(overrides: Record<string, unknown> = {}) {
  const { notification, notificationPreference, pushDevice, ...rest } = overrides;
  return {
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      ...(notification as Record<string, unknown> | undefined),
    },
    notificationPreference: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      ...(notificationPreference as Record<string, unknown> | undefined),
    },
    pushDevice: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      ...(pushDevice as Record<string, unknown> | undefined),
    },
    $transaction: vi.fn(async (ops: unknown) => ops),
    ...rest,
  };
}
