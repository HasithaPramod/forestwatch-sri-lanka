import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@forestwatch/database';
import { NOTIFICATION_TYPES } from '@forestwatch/types';
import type {
  NotificationListPage,
  NotificationPreferenceList,
  NotificationRecord,
  NotificationType,
  PushDeviceRegistration,
} from '@forestwatch/types';
import { buildPaginationMeta } from '@forestwatch/utils';
import type {
  ParsedNotificationsQuery,
  ParsedUpdateNotificationPreferencesBody,
  RegisterPushDeviceBody,
  UnregisterPushDeviceBody,
} from '@forestwatch/validation';
import { ApiException } from '../common/http/api-exception';
import { PrismaService } from '../database/prisma.service';
import { LocalPushProvider } from './local-push.provider';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type NotifyInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  actorId?: string;
};

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  payload: Prisma.JsonValue | null;
  readAt: Date | null;
  createdAt: Date;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: LocalPushProvider,
  ) {}

  async notify(input: NotifyInput): Promise<NotificationRecord | null> {
    if (input.actorId && input.actorId === input.userId) {
      return null;
    }

    const preference = await this.prisma.notificationPreference.findUnique({
      where: { userId_type: { userId: input.userId, type: input.type } },
    });
    if (preference && !preference.enabled) {
      return null;
    }

    const created = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        payload: (input.payload as Prisma.InputJsonValue | undefined) ?? undefined,
      },
    });

    const devices = await this.prisma.pushDevice.findMany({
      where: { userId: input.userId },
      select: { token: true },
    });
    try {
      await this.push.send(
        devices.map((row) => row.token),
        { title: input.title, body: input.body },
      );
    } catch (error) {
      this.logger.warn(`local push hook failed for ${created.id}: ${error instanceof Error ? error.message : 'unknown'}`);
    }

    return this.toRecord(created);
  }

  async list(query: ParsedNotificationsQuery, userId: string): Promise<NotificationListPage> {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(query.unread ? { readAt: null } : {}),
    };
    const [rows, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return {
      items: rows.map((row) => this.toRecord(row)),
      meta: { ...buildPaginationMeta({ page: query.page, limit: query.limit, total }), unreadCount },
    };
  }

  async markRead(id: string, userId: string): Promise<NotificationRecord> {
    if (!UUID_RE.test(id)) {
      throw new ApiException(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
    }
    const existing = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new ApiException(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
    }
    if (existing.readAt) {
      return this.toRecord(existing);
    }
    const updated = await this.prisma.notification.update({
      where: { id: existing.id },
      data: { readAt: new Date() },
    });
    return this.toRecord(updated);
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  async listPreferences(userId: string): Promise<NotificationPreferenceList> {
    const rows = await this.prisma.notificationPreference.findMany({ where: { userId } });
    const byType = new Map(rows.map((row) => [row.type, row.enabled]));
    return {
      items: NOTIFICATION_TYPES.map((type) => ({
        type,
        enabled: byType.get(type) ?? true,
      })),
    };
  }

  async updatePreferences(
    input: ParsedUpdateNotificationPreferencesBody,
    userId: string,
  ): Promise<NotificationPreferenceList> {
    await this.prisma.$transaction(
      input.items.map((item) =>
        this.prisma.notificationPreference.upsert({
          where: { userId_type: { userId, type: item.type } },
          create: { userId, type: item.type, enabled: item.enabled },
          update: { enabled: item.enabled },
        }),
      ),
    );
    return this.listPreferences(userId);
  }

  async registerDevice(input: RegisterPushDeviceBody, userId: string): Promise<PushDeviceRegistration> {
    await this.prisma.pushDevice.upsert({
      where: { userId_token: { userId, token: input.token } },
      create: { userId, token: input.token, platform: input.platform },
      update: { platform: input.platform },
    });
    return { registered: true, platform: input.platform };
  }

  async unregisterDevice(input: UnregisterPushDeviceBody, userId: string): Promise<PushDeviceRegistration> {
    await this.prisma.pushDevice.deleteMany({ where: { userId, token: input.token } });
    return { registered: false };
  }

  private toRecord(row: NotificationRow): NotificationRecord {
    return {
      id: row.id,
      type: row.type as NotificationType,
      title: row.title,
      body: row.body,
      payload: this.toPayload(row.payload),
      readAt: row.readAt ? row.readAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private toPayload(value: Prisma.JsonValue | null): Record<string, unknown> | null {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return null;
  }
}
