import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InspectionsController, PlantationInspectionsController } from './inspections.controller';
import { InspectionsService } from './inspections.service';

@Module({
  imports: [AuthModule],
  controllers: [PlantationInspectionsController, InspectionsController],
  providers: [InspectionsService],
})
export class InspectionsModule {}
