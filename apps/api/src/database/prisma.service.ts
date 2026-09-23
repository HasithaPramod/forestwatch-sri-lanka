import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@forestwatch/database';
import { getEnv } from '../env';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({
      datasources: {
        db: { url: getEnv().DATABASE_URL },
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
