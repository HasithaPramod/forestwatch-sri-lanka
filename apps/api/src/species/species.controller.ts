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
  createSpeciesBodySchema,
  speciesQuerySchema,
  updateSpeciesBodySchema,
  type ParsedCreateSpeciesBody,
  type ParsedSpeciesQuery,
  type ParsedUpdateSpeciesBody,
} from '@forestwatch/validation';
import { CurrentUser, OptionalUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { RequestUser } from '../auth/types';
import { ZodValidationPipe } from '../common/http/zod.pipe';
import { requireUploadedImage } from '../storage/uploaded-file';
import { SpeciesService } from './species.service';

@ApiTags('species')
@Controller('species')
export class SpeciesController {
  constructor(private readonly species: SpeciesService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List the species catalogue. Guests only see active records.' })
  list(
    @Query(new ZodValidationPipe(speciesQuerySchema)) query: ParsedSpeciesQuery,
    @OptionalUser() user?: RequestUser,
  ) {
    return this.species.list(query, user);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get a species by id or scientific name.' })
  get(@Param('id') id: string, @OptionalUser() user?: RequestUser) {
    return this.species.get(id, user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a species to the catalogue.' })
  create(
    @Body(new ZodValidationPipe(createSpeciesBodySchema)) body: ParsedCreateSpeciesBody,
    @CurrentUser() user: RequestUser,
  ) {
    return this.species.create(body, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a species catalogue record.' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSpeciesBodySchema)) body: ParsedUpdateSpeciesBody,
    @CurrentUser() user: RequestUser,
  ) {
    return this.species.update(id, body, user);
  }

  @Post(':id/image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: IMAGE.maxUploadBytes, files: 1 } }))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Replace the species catalogue photograph.' })
  setImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.species.setImage(id, requireUploadedImage(file), user);
  }

  @Delete(':id/image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove the species catalogue photograph.' })
  removeImage(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.species.removeImage(id, user);
  }
}
