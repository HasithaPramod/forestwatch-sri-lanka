import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AUTHENTICATED_ROLES } from '@forestwatch/types';
import {
  notificationsQuerySchema,
  registerPushDeviceBodySchema,
  unregisterPushDeviceBodySchema,
  updateNotificationPreferencesBodySchema,
  type ParsedNotificationsQuery,
  type ParsedUpdateNotificationPreferencesBody,
  type RegisterPushDeviceBody,
  type UnregisterPushDeviceBody,
} from '@forestwatch/validation';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { RequestUser } from '../auth/types';
import { ZodValidationPipe } from '../common/http/zod.pipe';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...AUTHENTICATED_ROLES)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'In-app inbox. unreadCount is a live SQL count, not a cached dashboard statistic.' })
  list(
    @Query(new ZodValidationPipe(notificationsQuerySchema)) query: ParsedNotificationsQuery,
    @CurrentUser() user: RequestUser,
  ) {
    return this.notifications.list(query, user.id);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark every unread notification for the caller as read.' })
  markAllRead(@CurrentUser() user: RequestUser) {
    return this.notifications.markAllRead(user.id);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark one notification as read. Other users cannot see this row.' })
  markRead(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.notifications.markRead(id, user.id);
  }
}

@ApiTags('notifications')
@Controller('notification-preferences')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...AUTHENTICATED_ROLES)
@ApiBearerAuth()
export class NotificationPreferencesController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List per-type notification preferences. Missing rows default to enabled.' })
  list(@CurrentUser() user: RequestUser) {
    return this.notifications.listPreferences(user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Upsert per-type notification preferences for the caller.' })
  update(
    @Body(new ZodValidationPipe(updateNotificationPreferencesBodySchema)) body: ParsedUpdateNotificationPreferencesBody,
    @CurrentUser() user: RequestUser,
  ) {
    return this.notifications.updatePreferences(body, user.id);
  }
}

@ApiTags('notifications')
@Controller('push/devices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...AUTHENTICATED_ROLES)
@ApiBearerAuth()
export class PushDevicesController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Register a device token. Local environments log an attempt and never report delivery without Expo/FCM.',
  })
  register(
    @Body(new ZodValidationPipe(registerPushDeviceBodySchema)) body: RegisterPushDeviceBody,
    @CurrentUser() user: RequestUser,
  ) {
    return this.notifications.registerDevice(body, user.id);
  }

  @Delete()
  @ApiOperation({ summary: 'Remove a device token for the caller.' })
  unregister(
    @Body(new ZodValidationPipe(unregisterPushDeviceBodySchema)) body: UnregisterPushDeviceBody,
    @CurrentUser() user: RequestUser,
  ) {
    return this.notifications.unregisterDevice(body, user.id);
  }
}
