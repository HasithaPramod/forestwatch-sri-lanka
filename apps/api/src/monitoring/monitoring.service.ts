import { randomUUID } from 'node:crypto';
import { Injectable, Optional } from '@nestjs/common';
import { isAdmin, isOfficer } from '@forestwatch/auth';
import { GEO_PROXIMITY_METERS, IMAGE } from '@forestwatch/config';
import { Prisma, classifyProximity, distanceToPlantationMeters } from '@forestwatch/database';
import type {
  GeoProximityStatus,
  HealthCondition,
  MonitoringImageSummary,
  MonitoringListPage,
  MonitoringUpdateDetail,
  MonitoringUpdateSummary,
  MonitoringVerificationStatus,
} from '@forestwatch/types';
import { buildPaginationMeta } from '@forestwatch/utils';
import type { ParsedCreateMonitoringBody, ParsedMonitoringUpdatesQuery } from '@forestwatch/validation';
import type { RequestUser } from '../auth/types';
import { ApiException } from '../common/http/api-exception';
import { PrismaService } from '../database/prisma.service';
import { EngagementService } from '../engagement/engagement.service';
import { StorageService } from '../storage/storage.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FUTURE_SKEW_MS = 60 * 60 * 1000;

const monitoringInclude = {
  user: { select: { id: true, displayName: true } },
  images: { orderBy: { createdAt: 'asc' as const } },
  plantation: {
    select: {
      id: true,
      createdById: true,
      verificationStatus: true,
      locationVisibility: true,
      organization: { select: { createdById: true } },
    },
  },
} satisfies Prisma.MonitoringUpdateInclude;

type MonitoringRecord = Prisma.MonitoringUpdateGetPayload<{ include: typeof monitoringInclude }>;
type PlantationAccess = MonitoringRecord['plantation'];

@Injectable()
export class MonitoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @Optional() private readonly engagement?: EngagementService,
  ) {}

  async list(
    plantationId: string,
    query: ParsedMonitoringUpdatesQuery,
    user?: RequestUser,
  ): Promise<MonitoringListPage> {
    const plantation = await this.requireVisiblePlantation(plantationId, user);
    const where = this.listWhere(plantation.id, user);
    const [rows, total] = await Promise.all([
      this.prisma.monitoringUpdate.findMany({
        where,
        include: monitoringInclude,
        orderBy: [{ observedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.monitoringUpdate.count({ where }),
    ]);

    return {
      items: await Promise.all(rows.map((row) => this.toSummary(row, user))),
      meta: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
    };
  }

  async get(plantationId: string, updateId: string, user?: RequestUser): Promise<MonitoringUpdateDetail> {
    await this.requireVisiblePlantation(plantationId, user);
    const update = await this.findRecord(updateId);
    if (update.plantationId !== plantationId || !this.canViewUpdate(user, update)) {
      throw new ApiException(404, 'MONITORING_NOT_FOUND', 'Monitoring update not found');
    }
    return this.toDetail(update, user);
  }

  async create(plantationId: string, input: ParsedCreateMonitoringBody, user: RequestUser): Promise<MonitoringUpdateDetail> {
    await this.requireVisiblePlantation(plantationId, user);

    if (input.clientUuid) {
      const existing = await this.prisma.monitoringUpdate.findUnique({
        where: { clientUuid: input.clientUuid },
        include: monitoringInclude,
      });
      if (existing) {
        if (existing.userId !== user.id && !isAdmin(user.roles)) {
          throw new ApiException(409, 'MONITORING_EXISTS', 'clientUuid already used');
        }
        return this.toDetail(existing, user);
      }
    }

    const observedAt = input.observedAt ?? new Date();
    if (observedAt.getTime() - Date.now() > FUTURE_SKEW_MS) {
      throw new ApiException(400, 'VALIDATION_ERROR', 'observedAt cannot be in the future');
    }

    const { distanceFromPlantation, locationValidation } = await this.classifyGps(
      plantationId,
      input.latitude,
      input.longitude,
    );

    const created = await this.prisma.monitoringUpdate.create({
      data: {
        plantationId,
        userId: user.id,
        clientUuid: input.clientUuid ?? null,
        observedAt,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        gpsAccuracyMeters: input.gpsAccuracyMeters ?? null,
        distanceFromPlantation,
        locationValidation,
        healthStatus: input.healthStatus,
        estimatedSurvivingTrees: input.estimatedSurvivingTrees ?? null,
        estimatedDeadTrees: input.estimatedDeadTrees ?? null,
        estimatedHeightCm: input.estimatedHeightCm ?? null,
        observation: input.observation,
        verificationStatus: 'PENDING',
      },
      include: monitoringInclude,
    });

    await this.audit('MONITORING_CREATED', user.id, created.id);
    await this.engagement?.ingest({
      type: 'MONITORING_SUBMITTED',
      actorUserId: user.id,
      entityId: created.id,
      occurredAt: created.createdAt.toISOString(),
    });
    if (created.locationValidation === 'ON_SITE') {
      await this.engagement?.recordOnSiteDiscoveries({
        userId: user.id,
        plantationId: created.plantationId,
        locationValidation: created.locationValidation,
        occurredAt: created.createdAt.toISOString(),
      });
    }
    return this.toDetail(created, user);
  }

  async addImage(
    plantationId: string,
    updateId: string,
    file: Express.Multer.File,
    user: RequestUser,
  ): Promise<MonitoringUpdateDetail> {
    const update = await this.requireEditable(plantationId, updateId, user);
    if (update.images.length >= IMAGE.maxMonitoringImages) {
      throw new ApiException(400, 'IMAGE_LIMIT', `A monitoring update can have at most ${IMAGE.maxMonitoringImages} photographs`);
    }

    const objectKey = `monitoring/${update.id}/${randomUUID()}.webp`;
    const stored = await this.storage.putOptimizedImage(objectKey, file.buffer);
    try {
      await this.prisma.monitoringImage.create({
        data: {
          updateId: update.id,
          provider: stored.provider,
          objectKey: stored.objectKey,
          mimeType: stored.mimeType,
          width: stored.width,
          height: stored.height,
          sizeBytes: stored.sizeBytes,
          uploadedById: user.id,
        },
      });
    } catch (error) {
      await this.storage.removeOptimizedImage(stored.objectKey);
      throw error;
    }

    await this.audit('MONITORING_IMAGE_CREATED', user.id, update.id);
    return this.get(plantationId, update.id, user);
  }

  async removeImage(
    plantationId: string,
    updateId: string,
    imageId: string,
    user: RequestUser,
  ): Promise<MonitoringUpdateDetail> {
    const update = await this.requireEditable(plantationId, updateId, user);
    const image = update.images.find((row) => row.id === imageId);
    if (!image) {
      throw new ApiException(404, 'IMAGE_NOT_FOUND', 'Image not found');
    }

    await this.prisma.monitoringImage.delete({ where: { id: image.id } });
    await this.storage.removeOptimizedImage(image.objectKey);
    await this.audit('MONITORING_IMAGE_DELETED', user.id, update.id);
    return this.get(plantationId, update.id, user);
  }

  private async classifyGps(
    plantationId: string,
    latitude?: number | null,
    longitude?: number | null,
  ): Promise<{ distanceFromPlantation: number | null; locationValidation: GeoProximityStatus }> {
    if (latitude == null || longitude == null) {
      return { distanceFromPlantation: null, locationValidation: 'LOCATION_UNAVAILABLE' };
    }

    const distanceFromPlantation = await distanceToPlantationMeters(this.prisma, plantationId, longitude, latitude);
    const thresholds = await this.proximityThresholds();
    return {
      distanceFromPlantation,
      locationValidation: classifyProximity(distanceFromPlantation, thresholds),
    };
  }

  private async proximityThresholds(): Promise<{ onSiteMax: number; nearbyMax: number }> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'geo_proximity_meters' },
    });
    const value = setting?.value;
    if (value && typeof value === 'object' && !Array.isArray(value) && 'onSiteMax' in value && 'nearbyMax' in value) {
      const onSiteMax = Number(value.onSiteMax);
      const nearbyMax = Number(value.nearbyMax);
      if (Number.isFinite(onSiteMax) && Number.isFinite(nearbyMax) && onSiteMax > 0 && nearbyMax > onSiteMax) {
        return { onSiteMax, nearbyMax };
      }
    }
    return GEO_PROXIMITY_METERS;
  }

  private async requireVisiblePlantation(plantationId: string, user?: RequestUser): Promise<PlantationAccess> {
    if (!UUID_RE.test(plantationId)) {
      throw new ApiException(404, 'PLANTATION_NOT_FOUND', 'Plantation not found');
    }
    const plantation = await this.prisma.plantation.findUnique({
      where: { id: plantationId },
      select: {
        id: true,
        createdById: true,
        verificationStatus: true,
        locationVisibility: true,
        organization: { select: { createdById: true } },
      },
    });
    if (!plantation || !this.canViewPlantation(user, plantation)) {
      throw new ApiException(404, 'PLANTATION_NOT_FOUND', 'Plantation not found');
    }
    return plantation;
  }

  private async findRecord(id: string): Promise<MonitoringRecord> {
    if (!UUID_RE.test(id)) {
      throw new ApiException(404, 'MONITORING_NOT_FOUND', 'Monitoring update not found');
    }
    const update = await this.prisma.monitoringUpdate.findUnique({
      where: { id },
      include: monitoringInclude,
    });
    if (!update) {
      throw new ApiException(404, 'MONITORING_NOT_FOUND', 'Monitoring update not found');
    }
    return update;
  }

  private async requireEditable(plantationId: string, updateId: string, user: RequestUser): Promise<MonitoringRecord> {
    await this.requireVisiblePlantation(plantationId, user);
    const update = await this.findRecord(updateId);
    if (update.plantationId !== plantationId) {
      throw new ApiException(404, 'MONITORING_NOT_FOUND', 'Monitoring update not found');
    }
    if (!this.canMutate(user, update)) {
      throw new ApiException(403, 'FORBIDDEN', 'Historical monitoring records cannot be overwritten');
    }
    return update;
  }

  private listWhere(plantationId: string, user?: RequestUser): Prisma.MonitoringUpdateWhereInput {
    const where: Prisma.MonitoringUpdateWhereInput = { plantationId };
    if (user && (isOfficer(user.roles) || isAdmin(user.roles))) {
      return where;
    }
    if (user) {
      where.OR = [{ verificationStatus: 'VERIFIED' }, { userId: user.id }];
      return where;
    }
    where.verificationStatus = 'VERIFIED';
    return where;
  }

  private canViewPlantation(user: RequestUser | undefined, plantation: PlantationAccess): boolean {
    if (plantation.verificationStatus === 'VERIFIED') {
      return true;
    }
    if (!user) {
      return false;
    }
    if (isOfficer(user.roles) || isAdmin(user.roles)) {
      return true;
    }
    return plantation.createdById === user.id || plantation.organization?.createdById === user.id;
  }

  private canViewUpdate(user: RequestUser | undefined, update: MonitoringRecord): boolean {
    if (update.verificationStatus === 'VERIFIED') {
      return true;
    }
    if (!user) {
      return false;
    }
    return update.userId === user.id || isOfficer(user.roles) || isAdmin(user.roles);
  }

  private canMutate(user: RequestUser, update: MonitoringRecord): boolean {
    if (isAdmin(user.roles)) {
      return true;
    }
    return update.userId === user.id && update.verificationStatus === 'PENDING';
  }

  private canSeeObserverGps(user: RequestUser | undefined, update: MonitoringRecord): boolean {
    if (user && (user.id === update.userId || isOfficer(user.roles) || isAdmin(user.roles))) {
      return true;
    }
    return update.plantation.locationVisibility === 'PUBLIC_EXACT';
  }

  private async audit(action: string, actorId: string, entityId: string): Promise<void> {
    await this.prisma.auditLog.create({
      data: { action, actorId, entityType: 'monitoring', entityId },
    });
  }

  private async toSummary(update: MonitoringRecord, user?: RequestUser): Promise<MonitoringUpdateSummary> {
    const showGps = this.canSeeObserverGps(user, update);
    const cover = update.images[0] ? await this.storage.resolvePublicImage(update.images[0].objectKey) : null;
    return {
      id: update.id,
      plantationId: update.plantationId,
      observedAt: update.observedAt.toISOString(),
      createdAt: update.createdAt.toISOString(),
      healthStatus: update.healthStatus as HealthCondition,
      observation: update.observation,
      estimatedSurvivingTrees: update.estimatedSurvivingTrees,
      estimatedDeadTrees: update.estimatedDeadTrees,
      estimatedHeightCm: toNumber(update.estimatedHeightCm),
      locationValidation: update.locationValidation as GeoProximityStatus,
      distanceFromPlantation: toNumber(update.distanceFromPlantation),
      latitude: showGps ? toNumber(update.latitude) : null,
      longitude: showGps ? toNumber(update.longitude) : null,
      gpsAccuracyMeters: showGps ? toNumber(update.gpsAccuracyMeters) : null,
      verificationStatus: update.verificationStatus as MonitoringVerificationStatus,
      observer: { id: update.user.id, displayName: update.user.displayName },
      coverImage: cover,
    };
  }

  private async toDetail(update: MonitoringRecord, user?: RequestUser): Promise<MonitoringUpdateDetail> {
    const summary = await this.toSummary(update, user);
    const images: MonitoringImageSummary[] = [];
    for (const row of update.images) {
      const urls = await this.storage.resolvePublicImage(row.objectKey);
      if (!urls) {
        continue;
      }
      images.push({
        id: row.id,
        url: urls.url,
        thumbnailUrl: urls.thumbnailUrl,
        mimeType: row.mimeType,
        width: row.width,
        height: row.height,
        sizeBytes: row.sizeBytes,
        createdAt: row.createdAt.toISOString(),
      });
    }

    return {
      ...summary,
      clientUuid: update.clientUuid,
      images,
      editable: Boolean(user && this.canMutate(user, update)),
    };
  }
}

function toNumber(value: Prisma.Decimal | number | string | null | undefined): number | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return Number(value);
  }
  return value.toNumber();
}
