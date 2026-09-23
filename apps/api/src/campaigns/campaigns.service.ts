import { randomUUID } from 'node:crypto';
import { Injectable, Optional } from '@nestjs/common';
import { hasAnyRole, isAdmin } from '@forestwatch/auth';
import { Prisma } from '@forestwatch/database';
import { getDivision } from '@forestwatch/sri-lanka-locations';
import {
  PUBLIC_CAMPAIGN_STATUSES,
  type CampaignDetail,
  type CampaignEligibleLocations,
  type CampaignListPage,
  type CampaignStatus,
  type CampaignSummary,
  type CampaignVisibility,
} from '@forestwatch/types';
import { buildPaginationMeta, slugify } from '@forestwatch/utils';
import type {
  ParsedCampaignsQuery,
  ParsedCreateCampaignBody,
  ParsedUpdateCampaignBody,
} from '@forestwatch/validation';
import { ApiException } from '../common/http/api-exception';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import type { RequestUser } from '../auth/types';

const CAMPAIGN_MUTATORS = ['ORGANIZATION_MANAGER', 'ADMIN', 'SUPER_ADMIN'] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PUBLISHED_STATUSES: CampaignStatus[] = ['UPCOMING', 'ACTIVE', 'COMPLETED'];

const campaignInclude = {
  organizer: { select: { id: true, name: true, slug: true, createdById: true } },
  _count: { select: { plantations: true } },
} satisfies Prisma.CampaignInclude;

type CampaignRecord = Prisma.CampaignGetPayload<{ include: typeof campaignInclude }>;

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  async list(query: ParsedCampaignsQuery, user?: RequestUser): Promise<CampaignListPage> {
    const where = this.listWhere(query, user);
    const [rows, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        include: campaignInclude,
        orderBy: [{ startDate: 'desc' }, { name: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return {
      items: await Promise.all(rows.map((row) => this.toSummary(row))),
      meta: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
    };
  }

  async get(idOrSlug: string, user?: RequestUser): Promise<CampaignDetail> {
    const campaign = await this.findRecord(idOrSlug);
    if (!this.canView(user, campaign)) {
      throw new ApiException(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
    }
    return this.toDetail(campaign, user);
  }

  async create(input: ParsedCreateCampaignBody, user: RequestUser): Promise<CampaignDetail> {
    this.requireMutator(user);
    const organizer = await this.requireOrganizer(input.organizerId, user);
    this.requirePublishable(input.status, organizer?.approved ?? true);
    const eligibleLocations = this.normalizeLocations(input.eligibleLocations);

    const created = await this.prisma.campaign.create({
      data: {
        name: input.name,
        slug: await this.uniqueSlug(input.name),
        description: input.description,
        organizerId: organizer?.id ?? null,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        targetTrees: input.targetTrees ?? null,
        targetAreaHectares: input.targetAreaHectares ?? null,
        eligibleLocations: eligibleLocations === null ? Prisma.JsonNull : eligibleLocations,
        status: input.status,
        visibility: input.visibility,
        createdById: user.id,
      },
      include: campaignInclude,
    });

    await this.audit('CAMPAIGN_CREATED', user.id, created.id);
    await this.notifyCampaignStarted(created, user.id, null);
    return this.toDetail(created, user);
  }

  async update(idOrSlug: string, input: ParsedUpdateCampaignBody, user: RequestUser): Promise<CampaignDetail> {
    const campaign = await this.findRecord(idOrSlug);
    if (!this.canMutate(user, campaign)) {
      throw new ApiException(403, 'FORBIDDEN', 'Insufficient role');
    }

    const nextOrganizerId = input.organizerId === undefined ? campaign.organizerId : input.organizerId;
    const organizer = await this.requireOrganizer(nextOrganizerId, user);
    const nextStatus = input.status ?? campaign.status;
    this.requirePublishable(nextStatus, organizer?.approved ?? true);

    if (input.endDate && !input.startDate && input.endDate < campaign.startDate) {
      throw new ApiException(400, 'VALIDATION_ERROR', 'endDate must be on or after startDate');
    }

    const nextLocations =
      input.eligibleLocations === undefined
        ? undefined
        : this.normalizeLocations(input.eligibleLocations);

    const updated: CampaignRecord = await this.prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        name: input.name,
        description: input.description,
        organizerId: input.organizerId === undefined ? undefined : (organizer?.id ?? null),
        startDate: input.startDate,
        endDate: input.endDate === undefined ? undefined : input.endDate,
        targetTrees: input.targetTrees === undefined ? undefined : input.targetTrees,
        targetAreaHectares: input.targetAreaHectares === undefined ? undefined : input.targetAreaHectares,
        eligibleLocations:
          nextLocations === undefined ? undefined : nextLocations === null ? Prisma.JsonNull : nextLocations,
        status: input.status,
        visibility: input.visibility,
      },
      include: campaignInclude,
    });

    await this.audit('CAMPAIGN_UPDATED', user.id, updated.id);
    await this.notifyCampaignStarted(updated, user.id, campaign);
    return this.toDetail(updated, user);
  }

  async setBanner(idOrSlug: string, file: Express.Multer.File, user: RequestUser): Promise<CampaignDetail> {
    const campaign = await this.findRecord(idOrSlug);
    if (!this.canMutate(user, campaign)) {
      throw new ApiException(403, 'FORBIDDEN', 'Insufficient role');
    }
    const stored = await this.storage.putOptimizedImage(`campaigns/${campaign.id}/banner.webp`, file.buffer);
    const previous = campaign.bannerImageKey;
    const updated: CampaignRecord = await this.prisma.campaign.update({
      where: { id: campaign.id },
      data: { bannerImageKey: stored.objectKey },
      include: campaignInclude,
    });
    if (previous && previous !== stored.objectKey) {
      await this.storage.removeOptimizedImage(previous);
    }
    await this.audit('CAMPAIGN_BANNER_UPDATED', user.id, updated.id);
    return this.toDetail(updated, user);
  }

  async removeBanner(idOrSlug: string, user: RequestUser): Promise<CampaignDetail> {
    const campaign = await this.findRecord(idOrSlug);
    if (!this.canMutate(user, campaign)) {
      throw new ApiException(403, 'FORBIDDEN', 'Insufficient role');
    }
    const updated: CampaignRecord = await this.prisma.campaign.update({
      where: { id: campaign.id },
      data: { bannerImageKey: null },
      include: campaignInclude,
    });
    await this.storage.removeOptimizedImage(campaign.bannerImageKey);
    await this.audit('CAMPAIGN_BANNER_DELETED', user.id, updated.id);
    return this.toDetail(updated, user);
  }

  private listWhere(query: ParsedCampaignsQuery, user?: RequestUser): Prisma.CampaignWhereInput {
    const where: Prisma.CampaignWhereInput = {};

    if (query.scope === 'mine') {
      if (!user) {
        throw new ApiException(401, 'UNAUTHORIZED', 'Authentication required');
      }
      where.createdById = user.id;
    } else if (query.scope === 'all') {
      if (!user || !isAdmin(user.roles)) {
        throw new ApiException(403, 'FORBIDDEN', 'Insufficient role');
      }
    } else {
      where.visibility = 'PUBLIC';
      where.status = {
        in: [...PUBLIC_CAMPAIGN_STATUSES],
      };
    }

    if (query.status) {
      if (query.scope === 'public' && !PUBLIC_CAMPAIGN_STATUSES.includes(query.status as (typeof PUBLIC_CAMPAIGN_STATUSES)[number])) {
        where.id = { in: [] };
      } else {
        where.status = query.status;
      }
    }

    if (query.q) {
      where.name = { contains: query.q, mode: 'insensitive' };
    }

    return where;
  }

  private async findRecord(idOrSlug: string): Promise<CampaignRecord> {
    const campaign = await this.prisma.campaign.findFirst({
      where: UUID_RE.test(idOrSlug) ? { OR: [{ id: idOrSlug }, { slug: idOrSlug }] } : { slug: idOrSlug },
      include: campaignInclude,
    });
    if (!campaign) {
      throw new ApiException(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
    }
    return campaign;
  }

  private async requireOrganizer(
    organizerId: string | null | undefined,
    user: RequestUser,
  ): Promise<{ id: string; approved: boolean; createdById: string } | null> {
    if (!organizerId) {
      return null;
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizerId },
      select: { id: true, approved: true, createdById: true },
    });
    if (!organization) {
      throw new ApiException(404, 'ORGANIZATION_NOT_FOUND', 'Organization not found');
    }
    if (!isAdmin(user.roles) && organization.createdById !== user.id) {
      throw new ApiException(403, 'FORBIDDEN', 'Insufficient role');
    }
    return organization;
  }

  private requirePublishable(status: CampaignStatus, approved: boolean): void {
    if (PUBLISHED_STATUSES.includes(status) && !approved) {
      throw new ApiException(400, 'ORGANIZATION_NOT_APPROVED', 'An unapproved organization cannot publish a campaign');
    }
  }

  private async notifyCampaignStarted(
    campaign: CampaignRecord,
    actorId: string,
    previous: CampaignRecord | null,
  ): Promise<void> {
    if (campaign.status !== 'ACTIVE' || campaign.visibility !== 'PUBLIC') {
      return;
    }
    if (previous && previous.status === 'ACTIVE' && previous.visibility === 'PUBLIC') {
      return;
    }
    await this.notifications?.notify({
      userId: campaign.createdById,
      actorId,
      type: 'CAMPAIGN_STARTED',
      title: 'Campaign is now public and active',
      body: campaign.name,
      payload: { campaignId: campaign.id, slug: campaign.slug },
    });
  }

  private requireMutator(user: RequestUser): void {
    if (!hasAnyRole(user.roles, CAMPAIGN_MUTATORS)) {
      throw new ApiException(403, 'FORBIDDEN', 'Insufficient role');
    }
  }

  private canMutate(user: RequestUser | undefined, campaign: CampaignRecord): boolean {
    if (!user) {
      return false;
    }
    if (isAdmin(user.roles)) {
      return true;
    }
    if (!hasAnyRole(user.roles, ['ORGANIZATION_MANAGER'])) {
      return false;
    }
    return campaign.createdById === user.id || campaign.organizer?.createdById === user.id;
  }

  private canView(user: RequestUser | undefined, campaign: CampaignRecord): boolean {
    if (campaign.visibility === 'PUBLIC' && campaign.status !== 'DRAFT') {
      return true;
    }
    return this.canMutate(user, campaign);
  }

  private normalizeLocations(
    input: { provinceCodes?: string[]; districtCodes?: string[] } | null | undefined,
  ): CampaignEligibleLocations | null {
    if (!input) {
      return null;
    }
    const provinceCodes = [...new Set(input.provinceCodes ?? [])];
    const districtCodes = [...new Set(input.districtCodes ?? [])];
    if (provinceCodes.length === 0 && districtCodes.length === 0) {
      return null;
    }

    for (const code of provinceCodes) {
      const division = getDivision(code);
      if (!division || division.kind !== 'province') {
        throw new ApiException(400, 'LOCATION_NOT_FOUND', `Unknown province code ${code}`);
      }
    }

    for (const code of districtCodes) {
      const division = getDivision(code);
      if (!division || division.kind !== 'district') {
        throw new ApiException(400, 'LOCATION_NOT_FOUND', `Unknown district code ${code}`);
      }
      if (provinceCodes.length > 0 && division.parentCode && !provinceCodes.includes(division.parentCode)) {
        throw new ApiException(400, 'LOCATION_MISMATCH', `District ${code} is not in the listed provinces`);
      }
    }

    return { provinceCodes, districtCodes };
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base = this.slugFromName(name);
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
      const existing = await this.prisma.campaign.findUnique({ where: { slug }, select: { id: true } });
      if (!existing) {
        return slug;
      }
    }
    return `${base}-${randomUUID().slice(0, 8)}`;
  }

  private slugFromName(name: string): string {
    try {
      return slugify(name);
    } catch {
      return `campaign-${randomUUID().slice(0, 8)}`;
    }
  }

  private async audit(action: string, actorId: string, entityId: string): Promise<void> {
    await this.prisma.auditLog.create({
      data: { action, actorId, entityType: 'campaign', entityId },
    });
  }

  private async toSummary(campaign: CampaignRecord): Promise<CampaignSummary> {
    const banner = await this.storage.resolvePublicImage(campaign.bannerImageKey);
    return {
      id: campaign.id,
      name: campaign.name,
      slug: campaign.slug,
      description: campaign.description,
      status: campaign.status,
      visibility: campaign.visibility as CampaignVisibility,
      startDate: campaign.startDate.toISOString(),
      endDate: campaign.endDate?.toISOString() ?? null,
      targetTrees: campaign.targetTrees,
      targetAreaHectares: toHectares(campaign.targetAreaHectares),
      organizer: campaign.organizer
        ? { id: campaign.organizer.id, name: campaign.organizer.name, slug: campaign.organizer.slug }
        : null,
      plantationCount: campaign._count.plantations,
      bannerImageUrl: banner?.url ?? null,
      bannerThumbnailUrl: banner?.thumbnailUrl ?? null,
    };
  }

  private async toDetail(campaign: CampaignRecord, user?: RequestUser): Promise<CampaignDetail> {
    return {
      ...(await this.toSummary(campaign)),
      bannerImageKey: campaign.bannerImageKey,
      eligibleLocations: parseEligibleLocations(campaign.eligibleLocations),
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
      editable: this.canMutate(user, campaign),
    };
  }
}

function toHectares(value: Prisma.Decimal | number | string | null): number | null {
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

function parseEligibleLocations(value: Prisma.JsonValue | null): CampaignEligibleLocations | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as { provinceCodes?: unknown; districtCodes?: unknown };
  const provinceCodes = Array.isArray(record.provinceCodes)
    ? record.provinceCodes.filter((code): code is string => typeof code === 'string')
    : [];
  const districtCodes = Array.isArray(record.districtCodes)
    ? record.districtCodes.filter((code): code is string => typeof code === 'string')
    : [];
  if (provinceCodes.length === 0 && districtCodes.length === 0) {
    return null;
  }
  return { provinceCodes, districtCodes };
}
