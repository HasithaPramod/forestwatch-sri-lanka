import { PAGINATION } from '@forestwatch/config';
import { NOTIFICATION_TYPES, PUSH_PLATFORMS, type NotificationType, type PushPlatform } from '@forestwatch/types';
import { z } from 'zod';

const typeTuple = NOTIFICATION_TYPES as unknown as [NotificationType, ...NotificationType[]];
const platformTuple = PUSH_PLATFORMS as unknown as [PushPlatform, ...PushPlatform[]];

export const notificationTypeSchema = z.enum(typeTuple);
export const pushPlatformSchema = z.enum(platformTuple);

export const notificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.defaultPage),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.maxLimit)
    .default(PAGINATION.defaultLimit),
  unread: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .optional()
    .transform((value) => value === true || value === 'true' || value === '1'),
});

export const updateNotificationPreferencesBodySchema = z
  .object({
    items: z
      .array(
        z.object({
          type: notificationTypeSchema,
          enabled: z.boolean(),
        }),
      )
      .min(1)
      .max(NOTIFICATION_TYPES.length),
  })
  .strict();

export const registerPushDeviceBodySchema = z
  .object({
    token: z.string().trim().min(8).max(4096),
    platform: pushPlatformSchema,
  })
  .strict();

export const unregisterPushDeviceBodySchema = z
  .object({
    token: z.string().trim().min(8).max(4096),
  })
  .strict();

export type NotificationsQuery = z.input<typeof notificationsQuerySchema>;
export type ParsedNotificationsQuery = z.output<typeof notificationsQuerySchema>;
export type UpdateNotificationPreferencesBody = z.input<typeof updateNotificationPreferencesBodySchema>;
export type ParsedUpdateNotificationPreferencesBody = z.output<typeof updateNotificationPreferencesBodySchema>;
export type RegisterPushDeviceBody = z.input<typeof registerPushDeviceBodySchema>;
export type UnregisterPushDeviceBody = z.input<typeof unregisterPushDeviceBodySchema>;
