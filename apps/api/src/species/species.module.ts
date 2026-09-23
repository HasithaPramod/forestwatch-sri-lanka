import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SpeciesController } from './species.controller';
import { SpeciesService } from './species.service';

@Module({
  imports: [AuthModule],
  controllers: [SpeciesController],
  providers: [SpeciesService],
  exports: [SpeciesService],
})
export class SpeciesModule {}
