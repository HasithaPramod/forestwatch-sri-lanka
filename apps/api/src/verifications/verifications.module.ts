import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlantationReviewController, ReviewQueueController, VerificationsController } from './verifications.controller';
import { VerificationsService } from './verifications.service';

@Module({
  imports: [AuthModule],
  controllers: [ReviewQueueController, VerificationsController, PlantationReviewController],
  providers: [VerificationsService],
})
export class VerificationsModule {}
