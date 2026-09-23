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
  createInspectionBodySchema,
  inspectionsQuerySchema,
  type ParsedCreateInspectionBody,
  type ParsedInspectionsQuery,
} from '@forestwatch/validation';
import { CurrentUser, OptionalUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { RequestUser } from '../auth/types';
import { ZodValidationPipe } from '../common/http/zod.pipe';
import { requireUploadedImage } from '../storage/uploaded-file';
import { InspectionsService } from './inspections.service';

@ApiTags('inspections')
@Controller('plantations/:plantationId/inspections')
export class PlantationInspectionsController {
  constructor(private readonly inspections: InspectionsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary:
      'Officer inspections for a plantation. These are official field visits, not citizen monitoring updates. Estimated tree counts do not change plantation.treeCount.',
  })
  list(
    @Param('plantationId') plantationId: string,
    @Query(new ZodValidationPipe(inspectionsQuerySchema)) query: ParsedInspectionsQuery,
    @OptionalUser() user?: RequestUser,
  ) {
    return this.inspections.list(plantationId, query, user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('FOREST_OFFICER', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record an officer inspection. GPS is stored if provided; missing GPS is not invented.' })
  create(
    @Param('plantationId') plantationId: string,
    @Body(new ZodValidationPipe(createInspectionBodySchema)) body: ParsedCreateInspectionBody,
    @CurrentUser() user: RequestUser,
  ) {
    return this.inspections.create(plantationId, body, user);
  }
}

@ApiTags('inspections')
@Controller('inspections')
export class InspectionsController {
  constructor(private readonly inspections: InspectionsService) {}

  @Get(':inspectionId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get one officer inspection.' })
  get(@Param('inspectionId') inspectionId: string, @OptionalUser() user?: RequestUser) {
    return this.inspections.get(inspectionId, user);
  }

  @Post(':inspectionId/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('FOREST_OFFICER', 'ADMIN', 'SUPER_ADMIN')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: IMAGE.maxUploadBytes, files: 1 } }))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Upload an inspection photograph. Keys are inspections/{id}/{uuid}.webp.' })
  addImage(
    @Param('inspectionId') inspectionId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.inspections.addImage(inspectionId, requireUploadedImage(file), user);
  }

  @Delete(':inspectionId/images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('FOREST_OFFICER', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a photograph from an inspection the officer still owns.' })
  removeImage(
    @Param('inspectionId') inspectionId: string,
    @Param('imageId') imageId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.inspections.removeImage(inspectionId, imageId, user);
  }
}
