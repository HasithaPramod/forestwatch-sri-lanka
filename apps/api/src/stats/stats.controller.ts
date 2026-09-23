import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AUTHENTICATED_ROLES } from '@forestwatch/types';
import {
  searchQuerySchema,
  statsQuerySchema,
  type ParsedSearchQuery,
  type ParsedStatsQuery,
} from '@forestwatch/validation';
import { CurrentUser, OptionalUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { RequestUser } from '../auth/types';
import { ZodValidationPipe } from '../common/http/zod.pipe';
import { StatsService } from './stats.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly stats: StatsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Server-side search across plantations, campaigns, organizations, species, and administrative divisions.',
  })
  search(
    @Query(new ZodValidationPipe(searchQuerySchema)) query: ParsedSearchQuery,
    @OptionalUser() user?: RequestUser,
  ) {
    return this.stats.search(query, user);
  }
}

@ApiTags('stats')
@Controller('stats')
export class PublicStatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('public')
  @ApiOperation({
    summary: 'Public impact totals. Counts are live SQL over VERIFIED plantations. Estimated survival is not treeCount.',
  })
  publicImpact(@Query(new ZodValidationPipe(statsQuerySchema)) query: ParsedStatsQuery) {
    return this.stats.publicImpact(query);
  }
}

@ApiTags('dashboards')
@Controller('dashboards')
export class DashboardsController {
  constructor(private readonly stats: StatsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...AUTHENTICATED_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Caller contribution counts. ForestQuest is omitted until that phase.' })
  me(@CurrentUser() user: RequestUser) {
    return this.stats.me(user);
  }

  @Get('officer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('FOREST_OFFICER', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Officer operational counts for assigned geography. Inspections are recent visits, not a predicted calendar.',
  })
  officer(@CurrentUser() user: RequestUser) {
    return this.stats.officer(user);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin live counts. Storage is the sum of stored image sizeBytes. ForestQuest is not available.' })
  admin(@CurrentUser() user: RequestUser) {
    return this.stats.admin(user);
  }
}
