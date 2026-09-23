export { Prisma, PrismaClient } from '@prisma/client';
export { createPrismaClient } from './client';
export {
  bboxIntersectsSql,
  classifyProximity,
  distanceToPlantationMeters,
  makePointSql,
  nearbyDistanceSql,
  pingDatabase,
  setPlantationPoint,
  withinMetersSql,
} from './spatial';

import { POSTGIS_SRID } from '@forestwatch/config';

export { POSTGIS_SRID };

export const DATABASE_PACKAGE_PHASE = 2;

export const DATABASE_ENGINE = {
  name: 'postgresql',
  postgis: true,
  srid: POSTGIS_SRID,
} as const;
