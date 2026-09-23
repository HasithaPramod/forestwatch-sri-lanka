import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EngagementController } from './engagement.controller';
import { EngagementService } from './engagement.service';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [EngagementController],
  providers: [EngagementService],
  exports: [EngagementService],
})
export class EngagementModule {}
