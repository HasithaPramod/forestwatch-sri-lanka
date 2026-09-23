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
  createPlantationBodySchema,
  plantationsQuerySchema,
  updatePlantationBodySchema,
  type ParsedCreatePlantationBody,
  type ParsedPlantationsQuery,
  type ParsedUpdatePlantationBody,
} from '@forestwatch/validation';
import { CurrentUser, OptionalUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { RequestUser } from '../auth/types';
import { ZodValidationPipe } from '../common/http/zod.pipe';
import { requireUploadedImage } from '../storage/uploaded-file';
import { PlantationsService } from './plantations.service';

@ApiTags('plantations')
@Controller('plantations')
export class PlantationsController {
  constructor(private readonly plantations: PlantationsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List plantations. Guests only see verified records, with coordinates filtered by locationVisibility.' })
  list(
    @Query(new ZodValidationPipe(plantationsQuerySchema)) query: ParsedPlantationsQuery,
    @OptionalUser() user?: RequestUser,
  ) {
    return this.plantations.list(query, user);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get a plantation. Unverified rows stay hidden from guests.' })
  get(@Param('id') id: string, @OptionalUser() user?: RequestUser) {
    return this.plantations.get(id, user);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a plantation. New rows start as SUBMITTED.' })
  create(
    @Body(new ZodValidationPipe(createPlantationBodySchema)) body: ParsedCreatePlantationBody,
    @CurrentUser() user: RequestUser,
  ) {
    return this.plantations.create(body, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CITIZEN', 'VOLUNTEER', 'ORGANIZATION_MANAGER', 'FOREST_OFFICER', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a plantation the caller owns, or that an officer/admin may edit.' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePlantationBodySchema)) body: ParsedUpdatePlantationBody,
    @CurrentUser() user: RequestUser,
  ) {
    return this.plantations.update(id, body, user);
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CITIZEN', 'VOLUNTEER', 'ORGANIZATION_MANAGER', 'FOREST_OFFICER', 'ADMIN', 'SUPER_ADMIN')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: IMAGE.maxUploadBytes, files: 1 } }))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Upload a plantation photograph. Stored as WebP with a thumbnail; the binary is not written to PostgreSQL.' })
  addImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.plantations.addImage(id, requireUploadedImage(file), user);
  }

  @Delete(':id/images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CITIZEN', 'VOLUNTEER', 'ORGANIZATION_MANAGER', 'FOREST_OFFICER', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a plantation photograph and its stored objects.' })
  removeImage(@Param('id') id: string, @Param('imageId') imageId: string, @CurrentUser() user: RequestUser) {
    return this.plantations.removeImage(id, imageId, user);
  }
}
