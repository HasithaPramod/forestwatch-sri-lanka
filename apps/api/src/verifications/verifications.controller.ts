import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  createVerificationBodySchema,
  verificationsQuerySchema,
  type ParsedCreateVerificationBody,
  type ParsedVerificationsQuery,
} from '@forestwatch/validation';
import { CurrentUser, OptionalUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { RequestUser } from '../auth/types';
import { ZodValidationPipe } from '../common/http/zod.pipe';
import { VerificationsService } from './verifications.service';

@ApiTags('verification')
@Controller('review')
export class ReviewQueueController {
  constructor(private readonly verifications: VerificationsService) {}

  @Get('queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('FOREST_OFFICER', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Officer work queue: assigned plantations still SUBMITTED or UNDER_REVIEW, and PENDING monitoring. Guests are rejected. This is not a public count.',
  })
  queue(@CurrentUser() user: RequestUser) {
    return this.verifications.queue(user);
  }
}

@ApiTags('verification')
@Controller('verifications')
export class VerificationsController {
  constructor(private readonly verifications: VerificationsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary:
      'Append-only verification history for one plantation or monitoring update. Previous rows are never overwritten. Guests do not receive officer notes.',
  })
  list(
    @Query(new ZodValidationPipe(verificationsQuerySchema)) query: ParsedVerificationsQuery,
    @OptionalUser() user?: RequestUser,
  ) {
    return this.verifications.list(query, user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('FOREST_OFFICER', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Record a verification decision. Inserts a history row, then updates the subject current status. Officers must be assigned to the plantation geography.',
  })
  create(
    @Body(new ZodValidationPipe(createVerificationBodySchema)) body: ParsedCreateVerificationBody,
    @CurrentUser() user: RequestUser,
  ) {
    return this.verifications.create(body, user);
  }
}

@ApiTags('verification')
@Controller('plantations/:plantationId/review')
export class PlantationReviewController {
  constructor(private readonly verifications: VerificationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('FOREST_OFFICER', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Move a SUBMITTED plantation to UNDER_REVIEW. This is not a verification decision and does not write history.' })
  startReview(@Param('plantationId') plantationId: string, @CurrentUser() user: RequestUser) {
    return this.verifications.startPlantationReview(plantationId, user);
  }
}
