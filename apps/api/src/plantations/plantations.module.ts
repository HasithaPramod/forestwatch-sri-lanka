import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlantationsController } from './plantations.controller';
import { PlantationsService } from './plantations.service';

@Module({
  imports: [AuthModule],
  controllers: [PlantationsController],
  providers: [PlantationsService],
  exports: [PlantationsService],
})
export class PlantationsModule {}
