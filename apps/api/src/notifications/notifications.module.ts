import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LocalPushProvider } from './local-push.provider';
import {
  NotificationPreferencesController,
  NotificationsController,
  PushDevicesController,
} from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [NotificationsController, NotificationPreferencesController, PushDevicesController],
  providers: [NotificationsService, LocalPushProvider],
  exports: [NotificationsService],
})
export class NotificationsModule {}
