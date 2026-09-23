import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  liveness() {
    return this.health.liveness();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe including PostGIS ping' })
  readiness() {
    return this.health.readiness();
  }
}
