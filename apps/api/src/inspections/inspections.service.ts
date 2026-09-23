import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { isAdmin, isOfficer } from '@forestwatch/auth';
import { IMAGE } from '@forestwatch/config';
import { Prisma } from '@forestwatch/database';
import type {
  HealthCondition,
  InspectionDetail,
  InspectionImageSummary,
  InspectionListPage,
  InspectionSummary,
} from '@forestwatch/types';
import { buildPaginationMeta } from '@forestwatch/utils';
import type { ParsedCreateInspectionBody, ParsedInspectionsQuery } from '@forestwatch/validation';
import type { RequestUser } from '../auth/types';
import { ApiException } from '../common/http/api-exception';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FUTURE_SKEW_MS = 60 * 60 * 1000;

const inspectionInclude = {
  officer: { select: { id: true, displayName: true } },
  images: { orderBy: { createdAt: 'asc' as const } },
  plantation: {
    select: {
      id: true,
      createdById: true,
      verificationStatus: true,
      locationVisibility: true,
      provinceCode: true,
      districtCode: true,
      dsdCode: true,
      treeCount: true,
      organization: { select: { createdById: true } },
    },
  },
} satisfies Prisma.OfficerInspectionInclude;

type InspectionRecord = Prisma.OfficerInspectionGetPayload<{ include: typeof inspectionInclude }>;

@Injectable()
export class InspectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async list(plantationId: string, query: ParsedInspectionsQuery, user?: RequestUser): Promise<InspectionListPage> {
    await this.requireVisiblePlantation(plantationId, user);
    const where: Prisma.OfficerInspectionWhereInput = { plantationId };
    const [rows, total] = await Promise.all([
      this.prisma.officerInspection.findMany({
        where,
        include: inspectionInclude,
        orderBy: { inspectedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.officerInspection.count({ where }),
    ]);

    return {
      items: await Promise.all(rows.map((row) => this.toSummary(row, user))),
      meta: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
    };
  }

  async get(inspectionId: string, user?: RequestUser): Promise<InspectionDetail> {
    const inspection = await this.findRecord(inspectionId);
    if (!this.canViewPlantation(user, inspection.plantation)) {
      throw new ApiException(404, 'INSPECTION_NOT_FOUND', 'Inspection not found');
    }
    return this.toDetail(inspection, user);
  }

  async create(plantationId: string, input: ParsedCreateInspectionBody, user: RequestUser): Promise<InspectionDetail> {
    if (!isOfficer(user.roles)) {
      throw new ApiException(403, 'FORBIDDEN', 'Insufficient role');
    }
    const plantation = await this.requireVisiblePlantation(plantationId, user);
    await this.requireAssigned(user, plantation);

    if (input.clientUuid) {
      const existing = await this.prisma.officerInspection.findUnique({
        where: { clientUuid: input.clientUuid },
        include: inspectionInclude,
      });
      if (existing) {
        if (existing.officerId !== user.id && !isAdmin(user.roles)) {
          throw new ApiException(409, 'INSPECTION_EXISTS', 'clientUuid already used');
        }
        return this.toDetail(existing, user);
      }
    }

    const inspectedAt = input.inspectedAt ?? new Date();
    if (inspectedAt.getTime() - Date.now() > FUTURE_SKEW_MS) {
      throw new ApiException(400, 'VALIDATION_ERROR', 'inspectedAt cannot be in the future');
    }

    const created = await this.prisma.officerInspection.create({
      data: {
        plantationId: plantation.id,
        officerId: user.id,
        clientUuid: input.clientUuid ?? null,
        inspectedAt,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        gpsAccuracyMeters: input.gpsAccuracyMeters ?? null,
        estimatedTreeCount: input.estimatedTreeCount ?? null,
        estimatedSurvivalPct: input.estimatedSurvivalPct ?? null,
        condition: input.condition,
        notes: input.notes,
        recommendedAction: input.recommendedAction ?? null,
      },
      include: inspectionInclude,
    });

    await this.audit('INSPECTION_CREATED', user.id, created.id);
    return this.toDetail(created, user);
  }

  async addImage(inspectionId: string, file: Express.Multer.File, user: RequestUser): Promise<InspectionDetail> {
    const inspection = await this.requireEditable(inspectionId, user);
    if (inspection.images.length >= IMAGE.maxInspectionImages) {
      throw new ApiException(400, 'IMAGE_LIMIT', `An inspection can have at most ${IMAGE.maxInspectionImages} photographs`);
    }

    const objectKey = `inspections/${inspection.id}/${randomUUID()}.webp`;
    const stored = await this.storage.putOptimizedImage(objectKey, file.buffer);
    try {
      await this.prisma.inspectionImage.create({
        data: {
          inspectionId: inspection.id,
          provider: stored.provider,
          objectKey: stored.objectKey,
          mimeType: stored.mimeType,
          width: stored.width,
          height: stored.height,
          sizeBytes: stored.sizeBytes,
        },
      });
    } catch (error) {
      await this.storage.removeOptimizedImage(stored.objectKey);
      throw error;
    }

    await this.audit('INSPECTION_IMAGE_CREATED', user.id, inspection.id);
    return this.get(inspection.id, user);
  }

  async removeImage(inspectionId: string, imageId: string, user: RequestUser): Promise<InspectionDetail> {
    const inspection = await this.requireEditable(inspectionId, user);
    const image = inspection.images.find((row) => row.id === imageId);
    if (!image) {
      throw new ApiException(404, 'IMAGE_NOT_FOUND', 'Image not found');
    }

    await this.prisma.inspectionImage.delete({ where: { id: image.id } });
    await this.storage.removeOptimizedImage(image.objectKey);
    await this.audit('INSPECTION_IMAGE_DELETED', user.id, inspection.id);
    return this.get(inspection.id, user);
  }

  private async requireVisiblePlantation(
    plantationId: string,
    user?: RequestUser,
  ): Promise<InspectionRecord['plantation']> {
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
        provinceCode: true,
        districtCode: true,
        dsdCode: true,
        treeCount: true,
        organization: { select: { createdById: true } },
      },
    });
    if (!plantation || !this.canViewPlantation(user, plantation)) {
      throw new ApiException(404, 'PLANTATION_NOT_FOUND', 'Plantation not found');
    }
    return plantation;
  }

  private async findRecord(id: string): Promise<InspectionRecord> {
    if (!UUID_RE.test(id)) {
      throw new ApiException(404, 'INSPECTION_NOT_FOUND', 'Inspection not found');
    }
    const inspection = await this.prisma.officerInspection.findUnique({
      where: { id },
      include: inspectionInclude,
    });
    if (!inspection) {
      throw new ApiException(404, 'INSPECTION_NOT_FOUND', 'Inspection not found');
    }
    return inspection;
  }

  private async requireEditable(inspectionId: string, user: RequestUser): Promise<InspectionRecord> {
    const inspection = await this.findRecord(inspectionId);
    if (!this.canViewPlantation(user, inspection.plantation)) {
      throw new ApiException(404, 'INSPECTION_NOT_FOUND', 'Inspection not found');
    }
    if (!this.canMutate(user, inspection)) {
      throw new ApiException(403, 'FORBIDDEN', 'This inspection cannot be edited');
    }
    return inspection;
  }

  private canViewPlantation(user: RequestUser | undefined, plantation: InspectionRecord['plantation']): boolean {
    if (plantation.verificationStatus === 'VERIFIED') {
      return true;
    }
    if (!user) {
      return false;
    }
    if (isOfficer(user.roles)) {
      return true;
    }
    return plantation.createdById === user.id || plantation.organization?.createdById === user.id;
  }

  private canMutate(user: RequestUser, inspection: InspectionRecord): boolean {
    if (isAdmin(user.roles)) {
      return true;
    }
    return isOfficer(user.roles) && inspection.officerId === user.id;
  }

  private canSeeGps(user: RequestUser | undefined, inspection: InspectionRecord): boolean {
    if (user && (user.id === inspection.officerId || isOfficer(user.roles))) {
      return true;
    }
    return inspection.plantation.locationVisibility === 'PUBLIC_EXACT';
  }

  private async requireAssigned(user: RequestUser, plantation: InspectionRecord['plantation']): Promise<void> {
    if (isAdmin(user.roles)) {
      return;
    }
    const assignments = await this.prisma.officerAssignment.findMany({ where: { userId: user.id } });
    if (assignments.length === 0) {
      throw new ApiException(403, 'FORBIDDEN', 'No officer assignment');
    }
    const allowed = assignments.some((row) => {
      if (row.dsdCode) {
        return plantation.dsdCode === row.dsdCode;
      }
      if (row.districtCode) {
        return plantation.districtCode === row.districtCode;
      }
      return plantation.provinceCode === row.provinceCode;
    });
    if (!allowed) {
      throw new ApiException(403, 'FORBIDDEN', 'Plantation is outside the officer assignment');
    }
  }

  private async audit(action: string, actorId: string, entityId: string): Promise<void> {
    await this.prisma.auditLog.create({
      data: { action, actorId, entityType: 'inspection', entityId },
    });
  }

  private async toSummary(inspection: InspectionRecord, user?: RequestUser): Promise<InspectionSummary> {
    const showGps = this.canSeeGps(user, inspection);
    const cover = inspection.images[0] ? await this.storage.resolvePublicImage(inspection.images[0].objectKey) : null;
    return {
      id: inspection.id,
      plantationId: inspection.plantationId,
      inspectedAt: inspection.inspectedAt.toISOString(),
      createdAt: inspection.createdAt.toISOString(),
      condition: inspection.condition as HealthCondition,
      notes: inspection.notes,
      recommendedAction: inspection.recommendedAction,
      estimatedTreeCount: inspection.estimatedTreeCount,
      estimatedSurvivalPct: toNumber(inspection.estimatedSurvivalPct),
      latitude: showGps ? toNumber(inspection.latitude) : null,
      longitude: showGps ? toNumber(inspection.longitude) : null,
      gpsAccuracyMeters: showGps ? toNumber(inspection.gpsAccuracyMeters) : null,
      officer: { id: inspection.officer.id, displayName: inspection.officer.displayName },
      coverImage: cover,
    };
  }

  private async toDetail(inspection: InspectionRecord, user?: RequestUser): Promise<InspectionDetail> {
    const summary = await this.toSummary(inspection, user);
    const images: InspectionImageSummary[] = [];
    for (const row of inspection.images) {
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
      clientUuid: inspection.clientUuid,
      images,
      editable: Boolean(user && this.canMutate(user, inspection)),
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
