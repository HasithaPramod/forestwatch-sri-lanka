import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DashboardsController, PublicStatsController, SearchController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [AuthModule],
  controllers: [SearchController, PublicStatsController, DashboardsController],
  providers: [StatsService],
})
export class StatsModule {}
