import { randomUUID } from 'node:crypto';
import { Injectable, Optional } from '@nestjs/common';
import { isAdmin, isOfficer } from '@forestwatch/auth';
import { IMAGE } from '@forestwatch/config';
import { Prisma, setPlantationPoint } from '@forestwatch/database';
import { belongsToParent, getDivision } from '@forestwatch/sri-lanka-locations';
import type {
  CurrentHealth,
  HealthCondition,
  LocationVisibility,
  PlantationDetail,
  PlantationImageSummary,
  PlantationListPage,
  PlantationSpeciesEntry,
  PlantationSummary,
  PlantationType,
  PlantationVerificationStatus,
} from '@forestwatch/types';
import { buildPaginationMeta } from '@forestwatch/utils';
import type {
  ParsedCreatePlantationBody,
  ParsedPlantationsQuery,
  ParsedUpdatePlantationBody,
} from '@forestwatch/validation';
import { ApiException } from '../common/http/api-exception';
import type { RequestUser } from '../auth/types';
import { PrismaService } from '../database/prisma.service';
import { EngagementService } from '../engagement/engagement.service';
import { StorageService } from '../storage/storage.service';
import { serializeCoordinates } from './coordinates';

export { serializeCoordinates } from './coordinates';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const plantationInclude = {
  campaign: { select: { id: true, name: true, slug: true, status: true, visibility: true } },
  organization: { select: { id: true, name: true, slug: true, createdById: true } },
  species: {
    include: {
      species: {
        select: {
          id: true,
          scientificName: true,
          commonEnglishName: true,
          sinhalaName: true,
          tamilName: true,
          nativeStatus: true,
          active: true,
        },
      },
    },
  },
  images: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.PlantationInclude;

type PlantationRecord = Prisma.PlantationGetPayload<{ include: typeof plantationInclude }>;

@Injectable()
export class PlantationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @Optional() private readonly engagement?: EngagementService,
  ) {}

  async list(query: ParsedPlantationsQuery, user?: RequestUser): Promise<PlantationListPage> {
    const where = await this.listWhere(query, user);
    const [rows, total] = await Promise.all([
      this.prisma.plantation.findMany({
        where,
        include: plantationInclude,
        orderBy: [{ plantingDate: 'desc' }, { name: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.plantation.count({ where }),
    ]);

    return {
      items: await Promise.all(rows.map((row) => this.toSummary(row, user))),
      meta: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
    };
  }

  async get(id: string, user?: RequestUser): Promise<PlantationDetail> {
    const plantation = await this.findRecord(id);
    if (!this.canView(user, plantation)) {
      throw new ApiException(404, 'PLANTATION_NOT_FOUND', 'Plantation not found');
    }
    return this.toDetail(plantation, user);
  }

  async create(input: ParsedCreatePlantationBody, user: RequestUser): Promise<PlantationDetail> {
    if (input.verificationStatus && input.verificationStatus !== 'SUBMITTED') {
      if (!isOfficer(user.roles)) {
        throw new ApiException(403, 'FORBIDDEN', 'Only officers can set verification status');
      }
      throw new ApiException(400, 'VERIFICATION_REQUIRED', 'Use POST /verifications to record a decision');
    }

    if (input.clientUuid) {
      const existing = await this.prisma.plantation.findUnique({
        where: { clientUuid: input.clientUuid },
        include: plantationInclude,
      });
      if (existing) {
        if (existing.createdById !== user.id && !isAdmin(user.roles)) {
          throw new ApiException(409, 'PLANTATION_EXISTS', 'clientUuid already used');
        }
        return this.toDetail(existing, user);
      }
    }

    this.assertAdminDivision(input.provinceCode, input.districtCode, input.dsdCode, input.gndCode);
    const campaign = await this.requireCampaign(input.campaignId, user);
    const organization = await this.requireOrganization(input.organizationId, user);
    await this.requireSpecies(input.species);

    const created = await this.prisma.plantation.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        type: input.type,
        campaignId: campaign?.id ?? null,
        organizationId: organization?.id ?? null,
        clientUuid: input.clientUuid ?? null,
        latitude: input.latitude,
        longitude: input.longitude,
        provinceCode: input.provinceCode,
        districtCode: input.districtCode,
        dsdCode: input.dsdCode ?? null,
        gndCode: input.gndCode ?? null,
        plantingDate: input.plantingDate,
        treeCount: input.treeCount,
        areaHectares: input.areaHectares ?? null,
        locationVisibility: input.locationVisibility,
        verificationStatus: 'SUBMITTED',
        createdById: user.id,
        species: {
          create: input.species.map((row) => ({ speciesId: row.speciesId, quantity: row.quantity })),
        },
      },
      include: plantationInclude,
    });

    await setPlantationPoint(this.prisma, created.id, input.longitude, input.latitude);
    await this.audit('PLANTATION_CREATED', user.id, created.id);
    await this.engagement?.ingest({
      type: 'PLANTATION_REGISTERED',
      actorUserId: user.id,
      entityId: created.id,
      occurredAt: created.createdAt.toISOString(),
    });
    return this.get(created.id, user);
  }

  async update(id: string, input: ParsedUpdatePlantationBody, user: RequestUser): Promise<PlantationDetail> {
    const plantation = await this.findRecord(id);
    if (!this.canMutate(user, plantation)) {
      throw new ApiException(403, 'FORBIDDEN', 'Insufficient role');
    }
    if (input.verificationStatus && input.verificationStatus !== plantation.verificationStatus) {
      throw new ApiException(400, 'VERIFICATION_REQUIRED', 'Use POST /verifications to record a decision');
    }

    const nextProvince = input.provinceCode ?? plantation.provinceCode;
    const nextDistrict = input.districtCode ?? plantation.districtCode;
    const nextDsd = input.dsdCode === undefined ? plantation.dsdCode : input.dsdCode;
    const nextGnd = input.gndCode === undefined ? plantation.gndCode : input.gndCode;
    if (nextProvince && nextDistrict) {
      this.assertAdminDivision(nextProvince, nextDistrict, nextDsd, nextGnd);
    }

    if (input.campaignId !== undefined) {
      await this.requireCampaign(input.campaignId, user);
    }
    if (input.organizationId !== undefined) {
      await this.requireOrganization(input.organizationId, user);
    }
    if (input.species) {
      await this.requireSpecies(input.species);
      const treeCount = input.treeCount ?? plantation.treeCount;
      const total = input.species.reduce((sum, row) => sum + row.quantity, 0);
      if (total !== treeCount) {
        throw new ApiException(400, 'VALIDATION_ERROR', 'species quantities must sum to treeCount');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (input.species) {
        await tx.plantationSpecies.deleteMany({ where: { plantationId: plantation.id } });
        await tx.plantationSpecies.createMany({
          data: input.species.map((row) => ({
            plantationId: plantation.id,
            speciesId: row.speciesId,
            quantity: row.quantity,
          })),
        });
      }

      return tx.plantation.update({
        where: { id: plantation.id },
        data: {
          name: input.name,
          description: input.description === undefined ? undefined : input.description,
          type: input.type,
          campaignId: input.campaignId === undefined ? undefined : input.campaignId,
          organizationId: input.organizationId === undefined ? undefined : input.organizationId,
          provinceCode: input.provinceCode,
          districtCode: input.districtCode,
          dsdCode: input.dsdCode === undefined ? undefined : input.dsdCode,
          gndCode: input.gndCode === undefined ? undefined : input.gndCode,
          plantingDate: input.plantingDate,
          treeCount: input.treeCount,
          areaHectares: input.areaHectares === undefined ? undefined : input.areaHectares,
          locationVisibility: input.locationVisibility,
          latitude: input.latitude,
          longitude: input.longitude,
        },
        include: plantationInclude,
      });
    });

    if (input.latitude != null && input.longitude != null) {
      await setPlantationPoint(this.prisma, plantation.id, input.longitude, input.latitude);
    }

    await this.audit('PLANTATION_UPDATED', user.id, plantation.id);
    return this.toDetail(updated, user);
  }

  async addImage(id: string, file: Express.Multer.File, user: RequestUser): Promise<PlantationDetail> {
    const plantation = await this.findRecord(id);
    if (!this.canMutate(user, plantation)) {
      throw new ApiException(403, 'FORBIDDEN', 'Insufficient role');
    }
    if (plantation.images.length >= IMAGE.maxPlantationImages) {
      throw new ApiException(400, 'IMAGE_LIMIT', `A plantation can have at most ${IMAGE.maxPlantationImages} photographs`);
    }

    const objectKey = `plantations/${plantation.id}/${randomUUID()}.webp`;
    const stored = await this.storage.putOptimizedImage(objectKey, file.buffer);
    try {
      await this.prisma.plantationImage.create({
        data: {
          plantationId: plantation.id,
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

    await this.audit('PLANTATION_IMAGE_CREATED', user.id, plantation.id);
    return this.get(plantation.id, user);
  }

  async removeImage(id: string, imageId: string, user: RequestUser): Promise<PlantationDetail> {
    const plantation = await this.findRecord(id);
    if (!this.canMutate(user, plantation)) {
      throw new ApiException(403, 'FORBIDDEN', 'Insufficient role');
    }
    const image = plantation.images.find((row) => row.id === imageId);
    if (!image) {
      throw new ApiException(404, 'IMAGE_NOT_FOUND', 'Image not found');
    }

    await this.prisma.plantationImage.delete({ where: { id: image.id } });
    await this.storage.removeOptimizedImage(image.objectKey);
    await this.audit('PLANTATION_IMAGE_DELETED', user.id, plantation.id);
    return this.get(plantation.id, user);
  }

  private async listWhere(query: ParsedPlantationsQuery, user?: RequestUser): Promise<Prisma.PlantationWhereInput> {
    const where: Prisma.PlantationWhereInput = {};

    if (query.scope === 'mine') {
      if (!user) {
        throw new ApiException(401, 'UNAUTHORIZED', 'Authentication required');
      }
      where.createdById = user.id;
    } else if (query.scope === 'all') {
      if (!user || !isAdmin(user.roles)) {
        throw new ApiException(403, 'FORBIDDEN', 'Insufficient role');
      }
    } else if (query.scope === 'assigned') {
      if (!user || !isOfficer(user.roles)) {
        throw new ApiException(403, 'FORBIDDEN', 'Insufficient role');
      }
      if (!isAdmin(user.roles)) {
        where.OR = await this.assignmentClauses(user.id);
      }
    } else {
      where.verificationStatus = 'VERIFIED';
    }

    if (query.verificationStatus) {
      if (query.scope === 'public' && query.verificationStatus !== 'VERIFIED') {
        where.id = { in: [] };
      } else {
        where.verificationStatus = query.verificationStatus;
      }
    }

    if (query.campaignId) {
      where.campaignId = query.campaignId;
    }
    if (query.speciesId) {
      where.species = { some: { speciesId: query.speciesId } };
    }
    if (query.provinceCode) {
      where.provinceCode = query.provinceCode;
    }
    if (query.districtCode) {
      where.districtCode = query.districtCode;
    }
    if (query.dsdCode) {
      where.dsdCode = query.dsdCode;
    }
    if (query.gndCode) {
      where.gndCode = query.gndCode;
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.q) {
      where.name = { contains: query.q, mode: 'insensitive' };
    }

    return where;
  }

  private async assignmentClauses(userId: string): Promise<Prisma.PlantationWhereInput[]> {
    const assignments = await this.prisma.officerAssignment.findMany({ where: { userId } });
    if (assignments.length === 0) {
      throw new ApiException(403, 'FORBIDDEN', 'No officer assignment');
    }
    return assignments.map((row) => {
      if (row.dsdCode) {
        return { dsdCode: row.dsdCode };
      }
      if (row.districtCode) {
        return { districtCode: row.districtCode };
      }
      return { provinceCode: row.provinceCode };
    });
  }

  private async findRecord(id: string): Promise<PlantationRecord> {
    if (!UUID_RE.test(id)) {
      throw new ApiException(404, 'PLANTATION_NOT_FOUND', 'Plantation not found');
    }
    const plantation = await this.prisma.plantation.findFirst({
      where: { id },
      include: plantationInclude,
    });
    if (!plantation) {
      throw new ApiException(404, 'PLANTATION_NOT_FOUND', 'Plantation not found');
    }
    return plantation;
  }

  private canView(user: RequestUser | undefined, plantation: PlantationRecord): boolean {
    if (plantation.verificationStatus === 'VERIFIED') {
      return true;
    }
    return this.canMutate(user, plantation) || Boolean(user && isOfficer(user.roles));
  }

  private canMutate(user: RequestUser | undefined, plantation: PlantationRecord): boolean {
    if (!user) {
      return false;
    }
    if (isAdmin(user.roles)) {
      return true;
    }
    if (isOfficer(user.roles)) {
      return true;
    }
    if (plantation.createdById === user.id) {
      return plantation.verificationStatus === 'SUBMITTED' || plantation.verificationStatus === 'REJECTED';
    }
    if (plantation.organization?.createdById === user.id) {
      return plantation.verificationStatus === 'SUBMITTED' || plantation.verificationStatus === 'REJECTED';
    }
    return false;
  }

  private assertAdminDivision(
    provinceCode: string,
    districtCode: string,
    dsdCode?: string | null,
    gndCode?: string | null,
  ): void {
    const province = getDivision(provinceCode);
    if (!province || province.kind !== 'province') {
      throw new ApiException(400, 'LOCATION_NOT_FOUND', `Unknown province code ${provinceCode}`);
    }
    const district = getDivision(districtCode);
    if (!district || district.kind !== 'district') {
      throw new ApiException(400, 'LOCATION_NOT_FOUND', `Unknown district code ${districtCode}`);
    }
    if (!belongsToParent(districtCode, provinceCode)) {
      throw new ApiException(400, 'LOCATION_MISMATCH', `District ${districtCode} is not in ${provinceCode}`);
    }
    if (dsdCode) {
      const dsd = getDivision(dsdCode);
      if (!dsd || dsd.kind !== 'dsd') {
        throw new ApiException(400, 'LOCATION_NOT_FOUND', `Unknown DSD code ${dsdCode}`);
      }
      if (!belongsToParent(dsdCode, districtCode)) {
        throw new ApiException(400, 'LOCATION_MISMATCH', `DSD ${dsdCode} is not in ${districtCode}`);
      }
    }
    if (gndCode) {
      const gnd = getDivision(gndCode);
      if (!gnd || gnd.kind !== 'gnd') {
        throw new ApiException(400, 'LOCATION_NOT_FOUND', `Unknown GND code ${gndCode}`);
      }
      if (dsdCode && !belongsToParent(gndCode, dsdCode)) {
        throw new ApiException(400, 'LOCATION_MISMATCH', `GND ${gndCode} is not in ${dsdCode}`);
      }
    }
  }

  private async requireCampaign(campaignId: string | null | undefined, user: RequestUser) {
    if (!campaignId) {
      return null;
    }
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, visibility: true, status: true, createdById: true },
    });
    if (!campaign) {
      throw new ApiException(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
    }
    const publicCampaign = campaign.visibility === 'PUBLIC' && campaign.status !== 'DRAFT';
    if (!publicCampaign && campaign.createdById !== user.id && !isAdmin(user.roles)) {
      throw new ApiException(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
    }
    return campaign;
  }

  private async requireOrganization(organizationId: string | null | undefined, user: RequestUser) {
    if (!organizationId) {
      return null;
    }
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, createdById: true },
    });
    if (!organization) {
      throw new ApiException(404, 'ORGANIZATION_NOT_FOUND', 'Organization not found');
    }
    if (!isAdmin(user.roles) && organization.createdById !== user.id) {
      throw new ApiException(403, 'FORBIDDEN', 'Insufficient role');
    }
    return organization;
  }

  private async requireSpecies(rows: Array<{ speciesId: string; quantity: number }>): Promise<void> {
    const ids = [...new Set(rows.map((row) => row.speciesId))];
    const found = await this.prisma.species.findMany({
      where: { id: { in: ids }, active: true },
      select: { id: true },
    });
    if (found.length !== ids.length) {
      throw new ApiException(400, 'SPECIES_NOT_FOUND', 'One or more species are missing or inactive');
    }
  }

  private async audit(action: string, actorId: string, entityId: string): Promise<void> {
    await this.prisma.auditLog.create({
      data: { action, actorId, entityType: 'plantation', entityId },
    });
  }

  private async toSummary(plantation: PlantationRecord, user?: RequestUser): Promise<PlantationSummary> {
    const campaign =
      plantation.campaign && (plantation.campaign.visibility === 'PUBLIC' || this.canMutate(user, plantation) || Boolean(user && isOfficer(user.roles)))
        ? { id: plantation.campaign.id, name: plantation.campaign.name, slug: plantation.campaign.slug }
        : null;
    const cover = plantation.images[0]
      ? await this.storage.resolvePublicImage(plantation.images[0].objectKey)
      : null;

    return {
      id: plantation.id,
      name: plantation.name,
      description: plantation.description,
      type: plantation.type as PlantationType,
      plantingDate: plantation.plantingDate.toISOString(),
      treeCount: plantation.treeCount,
      areaHectares: toNumber(plantation.areaHectares),
      provinceCode: plantation.provinceCode,
      districtCode: plantation.districtCode,
      dsdCode: plantation.dsdCode,
      gndCode: plantation.gndCode,
      verificationStatus: plantation.verificationStatus as PlantationVerificationStatus,
      locationVisibility: plantation.locationVisibility as LocationVisibility,
      coordinates: serializeCoordinates(plantation, user),
      campaign,
      organization: plantation.organization
        ? { id: plantation.organization.id, name: plantation.organization.name, slug: plantation.organization.slug }
        : null,
      species: plantation.species.map((row) => toSpeciesEntry(row)),
      coverImage: cover,
    };
  }

  private async toDetail(plantation: PlantationRecord, user?: RequestUser): Promise<PlantationDetail> {
    const summary = await this.toSummary(plantation, user);
    const images: PlantationImageSummary[] = [];
    for (const row of plantation.images) {
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
      clientUuid: plantation.clientUuid,
      createdAt: plantation.createdAt.toISOString(),
      updatedAt: plantation.updatedAt.toISOString(),
      editable: this.canMutate(user, plantation),
      images,
      currentHealth: await this.latestVerifiedHealth(plantation.id),
    };
  }

  private async latestVerifiedHealth(plantationId: string): Promise<CurrentHealth | null> {
    const latest = await this.prisma.monitoringUpdate.findFirst({
      where: { plantationId, verificationStatus: 'VERIFIED' },
      orderBy: { observedAt: 'desc' },
      select: {
        id: true,
        healthStatus: true,
        observedAt: true,
        estimatedSurvivingTrees: true,
        estimatedDeadTrees: true,
      },
    });
    if (!latest) {
      return null;
    }
    return {
      updateId: latest.id,
      healthStatus: latest.healthStatus as HealthCondition,
      observedAt: latest.observedAt.toISOString(),
      estimatedSurvivingTrees: latest.estimatedSurvivingTrees,
      estimatedDeadTrees: latest.estimatedDeadTrees,
    };
  }
}

function toSpeciesEntry(row: PlantationRecord['species'][number]): PlantationSpeciesEntry {
  return {
    speciesId: row.species.id,
    scientificName: row.species.scientificName,
    commonEnglishName: row.species.commonEnglishName,
    sinhalaName: row.species.sinhalaName,
    tamilName: row.species.tamilName,
    nativeStatus: row.species.nativeStatus,
    quantity: row.quantity,
  };
}

function toNumber(value: Prisma.Decimal | number | string | null): number | null {
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
