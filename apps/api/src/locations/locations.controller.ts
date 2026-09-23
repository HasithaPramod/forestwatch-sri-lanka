import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  districtsQuerySchema,
  dsdsQuerySchema,
  gndsQuerySchema,
  type DistrictsQuery,
  type DsdsQuery,
  type ParsedGndsQuery,
} from '@forestwatch/validation';
import { ZodValidationPipe } from '../common/http/zod.pipe';
import { LocationsService } from './locations.service';

@ApiTags('locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Catalogue counts from sl-gnd-dsd-districts' })
  stats() {
    return this.locations.stats();
  }

  @Get('provinces')
  @ApiOperation({ summary: 'List the 9 provinces' })
  provinces() {
    return this.locations.provinces();
  }

  @Get('districts')
  @ApiOperation({ summary: 'List districts, optionally filtered by provinceCode' })
  districts(@Query(new ZodValidationPipe(districtsQuerySchema)) query: DistrictsQuery) {
    return this.locations.districts(query.provinceCode);
  }

  @Get('dsds')
  @ApiOperation({ summary: 'List Divisional Secretariats, optionally filtered by districtCode' })
  dsds(@Query(new ZodValidationPipe(dsdsQuerySchema)) query: DsdsQuery) {
    return this.locations.dsds(query.districtCode);
  }

  @Get('gnds')
  @ApiOperation({ summary: 'List Grama Niladhari divisions for a DSD' })
  gnds(@Query(new ZodValidationPipe(gndsQuerySchema)) query: ParsedGndsQuery) {
    return this.locations.gnds(query);
  }
}
