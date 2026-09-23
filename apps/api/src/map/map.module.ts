import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MapController, NearbyController } from './map.controller';
import { MapService } from './map.service';

@Module({
  imports: [AuthModule],
  controllers: [MapController, NearbyController],
  providers: [MapService],
})
export class MapModule {}
