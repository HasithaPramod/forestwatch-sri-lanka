import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IMAGE } from '@forestwatch/config';
import {
  createMonitoringBodySchema,
  monitoringUpdatesQuerySchema,
  type ParsedCreateMonitoringBody,
  type ParsedMonitoringUpdatesQuery,
} from '@forestwatch/validation';
import { CurrentUser, OptionalUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { RequestUser } from '../auth/types';
import { ZodValidationPipe } from '../common/http/zod.pipe';
import { requireUploadedImage } from '../storage/uploaded-file';
import { MonitoringService } from './monitoring.service';

@ApiTags('monitoring')
@Controller('plantations/:plantationId/updates')
export class MonitoringController {
  constructor(private readonly monitoring: MonitoringService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Monitoring timeline for a plantation. Guests only see VERIFIED rows. History is append-only.',
  })
  list(
    @Param('plantationId') plantationId: string,
    @Query(new ZodValidationPipe(monitoringUpdatesQuerySchema)) query: ParsedMonitoringUpdatesQuery,
    @OptionalUser() user?: RequestUser,
  ) {
    return this.monitoring.list(plantationId, query, user);
  }

  @Get(':updateId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get one monitoring update. Pending rows stay hidden from guests.' })
  get(
    @Param('plantationId') plantationId: string,
    @Param('updateId') updateId: string,
    @OptionalUser() user?: RequestUser,
  ) {
    return this.monitoring.get(plantationId, updateId, user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CITIZEN', 'VOLUNTEER', 'ORGANIZATION_MANAGER', 'FOREST_OFFICER', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Submit a monitoring update. Server computes geo-proximity from PostGIS. New rows are PENDING and never overwrite plantation.treeCount.',
  })
  create(
    @Param('plantationId') plantationId: string,
    @Body(new ZodValidationPipe(createMonitoringBodySchema)) body: ParsedCreateMonitoringBody,
    @CurrentUser() user: RequestUser,
  ) {
    return this.monitoring.create(plantationId, body, user);
  }

  @Post(':updateId/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CITIZEN', 'VOLUNTEER', 'ORGANIZATION_MANAGER', 'FOREST_OFFICER', 'ADMIN', 'SUPER_ADMIN')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: IMAGE.maxUploadBytes, files: 1 } }))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Upload a monitoring photograph. Stored as WebP with a thumbnail; the binary is not written to PostgreSQL.' })
  addImage(
    @Param('plantationId') plantationId: string,
    @Param('updateId') updateId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.monitoring.addImage(plantationId, updateId, requireUploadedImage(file), user);
  }

  @Delete(':updateId/images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CITIZEN', 'VOLUNTEER', 'ORGANIZATION_MANAGER', 'FOREST_OFFICER', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a photograph from a pending monitoring update owned by the caller.' })
  removeImage(
    @Param('plantationId') plantationId: string,
    @Param('updateId') updateId: string,
    @Param('imageId') imageId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.monitoring.removeImage(plantationId, updateId, imageId, user);
  }
}
