import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  mapPlantationsQuerySchema,
  nearbyPlantationsQuerySchema,
  type ParsedMapPlantationsQuery,
  type ParsedNearbyPlantationsQuery,
} from '@forestwatch/validation';
import { OptionalUser } from '../auth/current-user.decorator';
import { OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestUser } from '../auth/types';
import { ZodValidationPipe } from '../common/http/zod.pipe';
import { MapService } from './map.service';

@ApiTags('map')
@Controller('map')
export class MapController {
  constructor(private readonly map: MapService) {}

  @Get('plantations')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Plantations inside a viewport. Never returns the full table; guests see VERIFIED public coordinates only.',
  })
  listInBbox(
    @Query(new ZodValidationPipe(mapPlantationsQuerySchema)) query: ParsedMapPlantationsQuery,
    @OptionalUser() user?: RequestUser,
  ) {
    return this.map.listInBbox(query, user);
  }
}

@ApiTags('nearby')
@Controller('nearby')
export class NearbyController {
  constructor(private readonly map: MapService) {}

  @Get('plantations')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Plantations within radiusMeters of a point, ordered by PostGIS geography distance.' })
  listNearby(
    @Query(new ZodValidationPipe(nearbyPlantationsQuerySchema)) query: ParsedNearbyPlantationsQuery,
    @OptionalUser() user?: RequestUser,
  ) {
    return this.map.listNearby(query, user);
  }
}
