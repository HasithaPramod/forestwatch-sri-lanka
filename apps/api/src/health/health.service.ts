import { Injectable } from '@nestjs/common';
import { pingDatabase } from '@forestwatch/database';
import type { HealthStatus, ReadinessStatus } from '@forestwatch/types';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  liveness(): HealthStatus {
    return {
      status: 'ok',
      service: 'forestwatch-api',
      timestamp: new Date().toISOString(),
      storageProvider: this.storage.name,
    };
  }

  async readiness(): Promise<ReadinessStatus> {
    const live = this.liveness();
    let database: ReadinessStatus['checks']['database'] = 'ok';

    try {
      await pingDatabase(this.prisma);
    } catch {
      database = 'error';
    }

    return {
      ...live,
      status: database === 'ok' ? 'ok' : 'degraded',
      checks: {
        storage: 'ok',
        database,
      },
    };
  }
}
