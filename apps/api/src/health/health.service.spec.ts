import { describe, expect, it, vi } from 'vitest';
import { HealthService } from './health.service';
import type { PrismaService } from '../database/prisma.service';
import type { StorageService } from '../storage/storage.service';

describe('HealthService', () => {
  const storage = { name: 'local' } as StorageService;

  it('reports liveness without querying the database', () => {
    const prisma = { $queryRaw: vi.fn() } as unknown as PrismaService;
    const live = new HealthService(storage, prisma).liveness();

    expect(live.status).toBe('ok');
    expect(live.service).toBe('forestwatch-api');
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('marks database readiness ok when PostGIS answers', async () => {
    const prisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ postgis: '3.5 USE_GEOS=1' }]),
    } as unknown as PrismaService;
    const ready = await new HealthService(storage, prisma).readiness();
    expect(ready.checks.database).toBe('ok');
    expect(ready.status).toBe('ok');
  });

  it('marks database readiness error when PostGIS is unavailable', async () => {
    const prisma = {
      $queryRaw: vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED')),
    } as unknown as PrismaService;
    const ready = await new HealthService(storage, prisma).readiness();
    expect(ready.checks.database).toBe('error');
    expect(ready.status).toBe('degraded');
  });
});
