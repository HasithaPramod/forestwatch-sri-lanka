import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
  createReportBodySchema,
  reportsQuerySchema,
  updateReportBodySchema,
  type ParsedCreateReportBody,
  type ParsedReportsQuery,
  type ParsedUpdateReportBody,
} from '@forestwatch/validation';
import { CurrentUser, OptionalUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { RequestUser } from '../auth/types';
import { ZodValidationPipe } from '../common/http/zod.pipe';
import { requireUploadedImage } from '../storage/uploaded-file';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('plantations/:plantationId/reports')
export class PlantationReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary:
      'Issue reports on a plantation. Guests receive an empty list. Authors, site owners, and assigned officers see matching rows.',
  })
  list(
    @Param('plantationId') plantationId: string,
    @Query(new ZodValidationPipe(reportsQuerySchema)) query: ParsedReportsQuery,
    @OptionalUser() user?: RequestUser,
  ) {
    return this.reports.listForPlantation(plantationId, query, user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CITIZEN', 'VOLUNTEER', 'ORGANIZATION_MANAGER', 'FOREST_OFFICER', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'File an issue report. Status starts as OPEN. Guests cannot post. This is not a comment report.',
  })
  create(
    @Param('plantationId') plantationId: string,
    @Body(new ZodValidationPipe(createReportBodySchema)) body: ParsedCreateReportBody,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reports.create(plantationId, body, user);
  }
}

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CITIZEN', 'VOLUNTEER', 'ORGANIZATION_MANAGER', 'FOREST_OFFICER', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Report inbox. Citizens default to mine. Officers default to assigned geography. Admins may use scope=all. Guests are rejected.',
  })
  listInbox(
    @Query(new ZodValidationPipe(reportsQuerySchema)) query: ParsedReportsQuery,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reports.listInbox(query, user);
  }

  @Get(':reportId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CITIZEN', 'VOLUNTEER', 'ORGANIZATION_MANAGER', 'FOREST_OFFICER', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one issue report the caller is allowed to see. Guests cannot read sensitive reports.' })
  get(@Param('reportId') reportId: string, @CurrentUser() user: RequestUser) {
    return this.reports.get(reportId, user);
  }

  @Patch(':reportId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('FOREST_OFFICER', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Advance the report workflow. Officers use OPEN → UNDER_REVIEW → ACTION_REQUIRED → RESOLVED, or REJECTED. Admins may reopen terminal rows to UNDER_REVIEW.',
  })
  updateStatus(
    @Param('reportId') reportId: string,
    @Body(new ZodValidationPipe(updateReportBodySchema)) body: ParsedUpdateReportBody,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reports.updateStatus(reportId, body, user);
  }

  @Post(':reportId/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CITIZEN', 'VOLUNTEER', 'ORGANIZATION_MANAGER', 'FOREST_OFFICER', 'ADMIN', 'SUPER_ADMIN')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: IMAGE.maxUploadBytes, files: 1 } }))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Upload a report photograph. Stored as WebP with a thumbnail; the binary is not written to PostgreSQL.' })
  addImage(
    @Param('reportId') reportId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reports.addImage(reportId, requireUploadedImage(file), user);
  }

  @Delete(':reportId/images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CITIZEN', 'VOLUNTEER', 'ORGANIZATION_MANAGER', 'FOREST_OFFICER', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a photograph from a report the caller can still edit.' })
  removeImage(
    @Param('reportId') reportId: string,
    @Param('imageId') imageId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reports.removeImage(reportId, imageId, user);
  }
}
