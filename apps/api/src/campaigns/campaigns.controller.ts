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
  campaignsQuerySchema,
  createCampaignBodySchema,
  updateCampaignBodySchema,
  type ParsedCampaignsQuery,
  type ParsedCreateCampaignBody,
  type ParsedUpdateCampaignBody,
} from '@forestwatch/validation';
import { CurrentUser, OptionalUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { RequestUser } from '../auth/types';
import { ZodValidationPipe } from '../common/http/zod.pipe';
import { requireUploadedImage } from '../storage/uploaded-file';
import { CampaignsService } from './campaigns.service';

@ApiTags('campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List campaigns. Guests see public upcoming, active, and completed records.' })
  list(
    @Query(new ZodValidationPipe(campaignsQuerySchema)) query: ParsedCampaignsQuery,
    @OptionalUser() user?: RequestUser,
  ) {
    return this.campaigns.list(query, user);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get a campaign by id or slug. Drafts and private records stay hidden from guests.' })
  get(@Param('id') id: string, @OptionalUser() user?: RequestUser) {
    return this.campaigns.get(id, user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZATION_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a campaign. Defaults to DRAFT.' })
  create(
    @Body(new ZodValidationPipe(createCampaignBodySchema)) body: ParsedCreateCampaignBody,
    @CurrentUser() user: RequestUser,
  ) {
    return this.campaigns.create(body, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZATION_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a campaign the caller owns or an admin may edit.' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCampaignBodySchema)) body: ParsedUpdateCampaignBody,
    @CurrentUser() user: RequestUser,
  ) {
    return this.campaigns.update(id, body, user);
  }

  @Post(':id/banner')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZATION_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: IMAGE.maxUploadBytes, files: 1 } }))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Replace the campaign banner photograph.' })
  setBanner(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.campaigns.setBanner(id, requireUploadedImage(file), user);
  }

  @Delete(':id/banner')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZATION_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove the campaign banner photograph.' })
  removeBanner(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.campaigns.removeBanner(id, user);
  }
}
