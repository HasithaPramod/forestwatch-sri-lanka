import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { ApiExceptionFilter } from './common/http/api-exception.filter';
import { ApiResponseInterceptor } from './common/http/api-response.interceptor';
import { CommentsModule } from './comments/comments.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { LocationsModule } from './locations/locations.module';
import { MapModule } from './map/map.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { PlantationsModule } from './plantations/plantations.module';
import { ReportsModule } from './reports/reports.module';
import { SpeciesModule } from './species/species.module';
import { StorageModule } from './storage/storage.module';
import { VerificationsModule } from './verifications/verifications.module';
import { InspectionsModule } from './inspections/inspections.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EngagementModule } from './engagement/engagement.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    DatabaseModule,
    StorageModule,
    HealthModule,
    AuthModule,
    LocationsModule,
    CampaignsModule,
    SpeciesModule,
    PlantationsModule,
    MonitoringModule,
    CommentsModule,
    ReportsModule,
    VerificationsModule,
    InspectionsModule,
    NotificationsModule,
    EngagementModule,
    StatsModule,
    MapModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
