import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AUTHENTICATED_ROLES } from '@forestwatch/types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { RequestUser } from '../auth/types';
import { EngagementService } from './engagement.service';

@ApiTags('engagement')
@Controller('engagement')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...AUTHENTICATED_ROLES)
@ApiBearerAuth()
export class EngagementController {
  constructor(private readonly engagement: EngagementService) {}

  @Get('profile')
  @ApiOperation({
    summary:
      'ForestQuest profile. confirmedXp is a SUM of CONFIRMED ledger rows. EcoPoints come from config for those rows. There is no POST /add-xp.',
  })
  profile(@CurrentUser() user: RequestUser) {
    return this.engagement.profile(user.id);
  }

  @Get('passport')
  @ApiOperation({ summary: 'Forest Passport is not connected in this phase.' })
  passport() {
    return this.engagement.unavailable();
  }

  @Get('missions')
  @ApiOperation({
    summary: 'Published missions with progress from verified field activity. There is no client complete-mission endpoint.',
  })
  missions(@CurrentUser() user: RequestUser) {
    return this.engagement.missions(user.id);
  }

  @Get('missions/:id')
  @ApiOperation({ summary: 'One published mission and the caller’s live progress.' })
  mission(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.engagement.mission(user.id, id);
  }

  @Get('badges')
  @ApiOperation({
    summary: 'Badge catalogue plus awarded rows. Awards come from configurable rules after confirmed activity.',
  })
  badges(@CurrentUser() user: RequestUser) {
    return this.engagement.badges(user.id);
  }

  @Get('forestdex')
  @ApiOperation({
    summary:
      'Species journal. discoveredCount / catalogueCount are live counts. Species unlock only after an ON_SITE visit to a VERIFIED public plantation. There is no POST /discover.',
  })
  forestdex(@CurrentUser() user: RequestUser) {
    return this.engagement.forestDex(user);
  }

  @Get('discoveries')
  @ApiOperation({
    summary: 'Plantation discoveries from on-site visits. Coordinates follow locationVisibility. OFFICER_ONLY sites are excluded.',
  })
  discoveries(@CurrentUser() user: RequestUser) {
    return this.engagement.plantationDiscoveries(user);
  }

  @Get('guardians')
  @ApiOperation({ summary: 'Guardians are not connected in this phase.' })
  guardians() {
    return this.engagement.unavailable();
  }

  @Get('challenges')
  @ApiOperation({ summary: 'Community challenges are not connected in this phase.' })
  challenges() {
    return this.engagement.unavailable();
  }
}
