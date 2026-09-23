import { Injectable, Optional } from '@nestjs/common';
import { isAdmin, isOfficer } from '@forestwatch/auth';
import { MAP } from '@forestwatch/config';
import { Prisma } from '@forestwatch/database';
import { getDivision, searchDivisions } from '@forestwatch/sri-lanka-locations';
import { PUBLIC_CAMPAIGN_STATUSES } from '@forestwatch/types';
import type {
  AdminDashboard,
  CampaignProgressRow,
  MeDashboard,
  NamedCount,
  OfficerDashboard,
  PublicImpactStats,
  SearchHit,
  SearchKind,
  SearchPage,
} from '@forestwatch/types';
import { buildPaginationMeta } from '@forestwatch/utils';
import type { ParsedSearchQuery, ParsedStatsQuery } from '@forestwatch/validation';
import type { RequestUser } from '../auth/types';
import { ApiException } from '../common/http/api-exception';
import { PrismaService } from '../database/prisma.service';
import { EngagementService } from '../engagement/engagement.service';
import { serializeCoordinates } from '../plantations/coordinates';

const MAP_CAP = MAP.defaultLimit;

type SurvivalRow = { total: number | bigint | null; n: number | bigint | null };
type YearRow = { key: string; trees: number | bigint | null };

@Injectable()
export class StatsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly engagement?: EngagementService,
  ) {}

  async search(query: ParsedSearchQuery, user?: RequestUser): Promise<SearchPage> {
    const kinds: SearchKind[] = query.kind ? [query.kind] : [
      'plantation',
      'campaign',
      'organization',
      'species',
      'district',
      'dsd',
      'gnd',
    ];
    const perSource = Math.max(query.limit, 8);
    const hits: SearchHit[] = [];

    if (kinds.includes('plantation')) {
      hits.push(...(await this.searchPlantations(query.q, perSource, user)));
    }
    if (kinds.includes('campaign')) {
      hits.push(...(await this.searchCampaigns(query.q, perSource, user)));
    }
    if (kinds.includes('organization')) {
      hits.push(...(await this.searchOrganizations(query.q, perSource)));
    }
    if (kinds.includes('species')) {
      hits.push(...(await this.searchSpecies(query.q, perSource, user)));
    }
    const locationKinds = kinds.filter((kind): kind is 'district' | 'dsd' | 'gnd' =>
      kind === 'district' || kind === 'dsd' || kind === 'gnd',
    );
    if (locationKinds.length > 0) {
      hits.push(
        ...searchDivisions(query.q, { kinds: locationKinds, limit: perSource }).map((row) => ({
          kind: row.kind as SearchKind,
          id: row.code,
          title: row.nameEn,
          subtitle: row.code,
        })),
      );
    }

    const total = hits.length;
    const start = (query.page - 1) * query.limit;
    return {
      items: hits.slice(start, start + query.limit),
      meta: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
    };
  }

  async publicImpact(query: ParsedStatsQuery): Promise<PublicImpactStats> {
    const where = this.verifiedWhere(query);
    const yearStart = query.year ? new Date(Date.UTC(query.year, 0, 1)) : undefined;
    const yearEnd = query.year ? new Date(Date.UTC(query.year + 1, 0, 1)) : undefined;
    if (yearStart && yearEnd) {
      where.plantingDate = { gte: yearStart, lt: yearEnd };
    }

    const [
      recorded,
      verifiedMonitoringUpdates,
      organizations,
      contributors,
      survival,
      treesByYear,
      treesByDistrict,
      treesBySpecies,
      campaignProgress,
      campaigns,
      survivalTrends,
    ] = await Promise.all([
      this.prisma.plantation.aggregate({ where, _sum: { treeCount: true }, _count: true }),
      this.prisma.monitoringUpdate.count({
        where: { verificationStatus: 'VERIFIED', plantation: where },
      }),
      this.prisma.plantation.groupBy({
        by: ['organizationId'],
        where: { ...where, organizationId: { not: null } },
        _count: true,
      }),
      this.distinctContributors(where),
      this.survivalEstimate(query),
      this.treesByYear(query),
      this.prisma.plantation.groupBy({
        by: ['districtCode'],
        where,
        _sum: { treeCount: true },
        orderBy: { _sum: { treeCount: 'desc' } },
      }),
      this.treesBySpecies(where),
      this.campaignProgress(where),
      this.prisma.campaign.count({
        where: {
          visibility: 'PUBLIC',
          status: { in: [...PUBLIC_CAMPAIGN_STATUSES] },
          ...(query.campaignId ? { id: query.campaignId } : {}),
        },
      }),
      this.survivalTrends(query),
    ]);

    const trees = recorded._sum.treeCount ?? 0;
    return {
      treesRecorded: trees,
      verifiedTrees: trees,
      estimatedSurvivingTrees: survival.total,
      plantationsWithSurvivalEstimate: survival.n,
      plantationSites: recorded._count,
      campaigns,
      organizations: organizations.length,
      contributors,
      verifiedMonitoringUpdates,
      treesByYear,
      treesByDistrict: treesByDistrict.map((row) => ({
        key: row.districtCode ?? 'unknown',
        label: getDivision(row.districtCode ?? '')?.nameEn ?? row.districtCode ?? 'Unknown',
        trees: row._sum.treeCount ?? 0,
      })),
      treesBySpecies,
      survivalTrends,
      campaignProgress,
    };
  }

  async me(user: RequestUser): Promise<MeDashboard> {
    const orgIds = await this.prisma.organization.findMany({
      where: { createdById: user.id },
      select: { id: true, name: true },
    });
    const [plantations, monitoringUpdates, reports, unreadNotifications, orgStats, forestQuest] = await Promise.all([
      this.prisma.plantation.count({ where: { createdById: user.id } }),
      this.prisma.monitoringUpdate.count({ where: { userId: user.id } }),
      this.prisma.report.count({ where: { userId: user.id } }),
      this.prisma.notification.count({ where: { userId: user.id, readAt: null } }),
      Promise.all(
        orgIds.map(async (org) => {
          const agg = await this.prisma.plantation.aggregate({
            where: { organizationId: org.id, verificationStatus: 'VERIFIED' },
            _count: true,
            _sum: { treeCount: true },
          });
          return {
            id: org.id,
            name: org.name,
            plantations: agg._count,
            treesRecorded: agg._sum.treeCount ?? 0,
          };
        }),
      ),
      this.engagement?.profile(user.id) ?? Promise.resolve({ available: false as const }),
    ]);

    return {
      plantations,
      monitoringUpdates,
      reports,
      unreadNotifications,
      organizations: orgStats,
      forestQuest,
    };
  }

  async officer(user: RequestUser): Promise<OfficerDashboard> {
    if (!isOfficer(user.roles)) {
      throw new ApiException(403, 'FORBIDDEN', 'Insufficient role');
    }
    const assignments = isAdmin(user.roles)
      ? []
      : await this.prisma.officerAssignment.findMany({
          where: { userId: user.id },
          select: { provinceCode: true, districtCode: true, dsdCode: true },
        });
    if (!isAdmin(user.roles) && assignments.length === 0) {
      throw new ApiException(403, 'FORBIDDEN', 'No officer assignment');
    }
    const plantationScope = this.officerPlantationWhere(user, assignments);
    const [pendingPlantationReviews, pendingMonitoringReviews, openReports, inspections, activity, mapRows] =
      await Promise.all([
        this.prisma.plantation.count({
          where: { verificationStatus: { in: ['SUBMITTED', 'UNDER_REVIEW'] }, ...plantationScope },
        }),
        this.prisma.monitoringUpdate.count({
          where: { verificationStatus: 'PENDING', plantation: plantationScope },
        }),
        this.prisma.report.count({
          where: {
            status: { in: ['OPEN', 'UNDER_REVIEW', 'ACTION_REQUIRED'] },
            plantation: plantationScope,
          },
        }),
        this.prisma.officerInspection.findMany({
          where: { plantation: plantationScope },
          orderBy: { inspectedAt: 'desc' },
          take: 10,
          select: {
            id: true,
            plantationId: true,
            inspectedAt: true,
            condition: true,
            plantation: { select: { name: true } },
          },
        }),
        this.prisma.auditLog.findMany({
          where: { actorId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { action: true, entityType: true, entityId: true, createdAt: true },
        }),
        this.prisma.plantation.findMany({
          where: plantationScope,
          orderBy: { updatedAt: 'desc' },
          take: MAP_CAP + 1,
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            locationVisibility: true,
            createdById: true,
            organization: { select: { createdById: true } },
          },
        }),
      ]);

    const truncated = mapRows.length > MAP_CAP;
    const mapItems = mapRows.slice(0, MAP_CAP).map((row) => {
      const coords = serializeCoordinates(row, user);
      return { id: row.id, name: row.name, latitude: coords.latitude, longitude: coords.longitude };
    });

    return {
      assignments,
      pendingPlantationReviews,
      pendingMonitoringReviews,
      openReports,
      recentInspections: inspections.map((row) => ({
        id: row.id,
        plantationId: row.plantationId,
        plantationName: row.plantation.name,
        inspectedAt: row.inspectedAt.toISOString(),
        condition: row.condition,
      })),
      recentActivity: activity.map((row) => ({
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        createdAt: row.createdAt.toISOString(),
      })),
      map: { items: mapItems, truncated },
    };
  }

  async admin(user: RequestUser): Promise<AdminDashboard> {
    if (!isAdmin(user.roles)) {
      throw new ApiException(403, 'FORBIDDEN', 'Insufficient role');
    }
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [
      users,
      officers,
      organizations,
      campaigns,
      allTrees,
      verifiedTrees,
      plantationSites,
      pendingPlantationReviews,
      pendingMonitoringReviews,
      reportsOpen,
      reportsTotal,
      auditLast24Hours,
      plantationBytes,
      monitoringBytes,
      reportBytes,
      inspectionBytes,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.userRole.count({ where: { role: { code: 'FOREST_OFFICER' } } }),
      this.prisma.organization.count(),
      this.prisma.campaign.count(),
      this.prisma.plantation.aggregate({ _sum: { treeCount: true } }),
      this.prisma.plantation.aggregate({
        where: { verificationStatus: 'VERIFIED' },
        _sum: { treeCount: true },
      }),
      this.prisma.plantation.count(),
      this.prisma.plantation.count({ where: { verificationStatus: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
      this.prisma.monitoringUpdate.count({ where: { verificationStatus: 'PENDING' } }),
      this.prisma.report.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW', 'ACTION_REQUIRED'] } } }),
      this.prisma.report.count(),
      this.prisma.auditLog.count({ where: { createdAt: { gte: dayAgo } } }),
      this.prisma.plantationImage.aggregate({ _sum: { sizeBytes: true } }),
      this.prisma.monitoringImage.aggregate({ _sum: { sizeBytes: true } }),
      this.prisma.reportImage.aggregate({ _sum: { sizeBytes: true } }),
      this.prisma.inspectionImage.aggregate({ _sum: { sizeBytes: true } }),
    ]);

    return {
      users,
      officers,
      organizations,
      campaigns,
      treesRecorded: allTrees._sum.treeCount ?? 0,
      verifiedTrees: verifiedTrees._sum.treeCount ?? 0,
      plantationSites,
      pendingPlantationReviews,
      pendingMonitoringReviews,
      reportsOpen,
      reportsTotal,
      auditLast24Hours,
      storageBytes:
        (plantationBytes._sum.sizeBytes ?? 0) +
        (monitoringBytes._sum.sizeBytes ?? 0) +
        (reportBytes._sum.sizeBytes ?? 0) +
        (inspectionBytes._sum.sizeBytes ?? 0),
      forestQuest: { available: false },
    };
  }

  private verifiedWhere(query: ParsedStatsQuery): Prisma.PlantationWhereInput {
    const where: Prisma.PlantationWhereInput = { verificationStatus: 'VERIFIED' };
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
    if (query.campaignId) {
      where.campaignId = query.campaignId;
    }
    if (query.speciesId) {
      where.species = { some: { speciesId: query.speciesId } };
    }
    return where;
  }

  private officerPlantationWhere(
    user: RequestUser,
    assignments: Array<{ provinceCode: string | null; districtCode: string | null; dsdCode: string | null }>,
  ): Prisma.PlantationWhereInput {
    if (isAdmin(user.roles)) {
      return {};
    }
    return {
      OR: assignments.map((row) => {
        if (row.dsdCode) {
          return { dsdCode: row.dsdCode };
        }
        if (row.districtCode) {
          return { districtCode: row.districtCode };
        }
        return { provinceCode: row.provinceCode };
      }),
    };
  }

  private async searchPlantations(q: string, take: number, user?: RequestUser): Promise<SearchHit[]> {
    const visibility: Prisma.PlantationWhereInput[] = [{ verificationStatus: 'VERIFIED' }];
    if (user) {
      visibility.push({ createdById: user.id });
      if (isAdmin(user.roles)) {
        visibility.length = 0;
      } else if (isOfficer(user.roles)) {
        const assignments = await this.prisma.officerAssignment.findMany({ where: { userId: user.id } });
        if (assignments.length > 0) {
          visibility.push(this.officerPlantationWhere(user, assignments));
        }
      }
    }
    const rows = await this.prisma.plantation.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
        ...(visibility.length > 0 ? { OR: visibility } : {}),
      },
      orderBy: { name: 'asc' },
      take,
      select: { id: true, name: true, districtCode: true, verificationStatus: true },
    });
    return rows.map((row) => ({
      kind: 'plantation' as const,
      id: row.id,
      title: row.name,
      subtitle: [row.districtCode, row.verificationStatus].filter(Boolean).join(' · ') || null,
    }));
  }

  private async searchCampaigns(q: string, take: number, user?: RequestUser): Promise<SearchHit[]> {
    const visibility: Prisma.CampaignWhereInput[] = [
      { visibility: 'PUBLIC', status: { in: [...PUBLIC_CAMPAIGN_STATUSES] } },
    ];
    if (user) {
      visibility.push({ createdById: user.id });
      if (isAdmin(user.roles)) {
        visibility.length = 0;
      }
    }
    const rows = await this.prisma.campaign.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
        ...(visibility.length > 0 ? { OR: visibility } : {}),
      },
      orderBy: { name: 'asc' },
      take,
      select: { id: true, name: true, slug: true, status: true },
    });
    return rows.map((row) => ({
      kind: 'campaign' as const,
      id: row.slug,
      title: row.name,
      subtitle: row.status,
    }));
  }

  private async searchOrganizations(q: string, take: number): Promise<SearchHit[]> {
    const rows = await this.prisma.organization.findMany({
      where: { approved: true, name: { contains: q, mode: 'insensitive' } },
      orderBy: { name: 'asc' },
      take,
      select: { id: true, name: true, type: true },
    });
    return rows.map((row) => ({
      kind: 'organization' as const,
      id: row.id,
      title: row.name,
      subtitle: row.type,
    }));
  }

  private async searchSpecies(q: string, take: number, user?: RequestUser): Promise<SearchHit[]> {
    const rows = await this.prisma.species.findMany({
      where: {
        ...(isAdmin(user?.roles ?? []) ? {} : { active: true }),
        OR: [
          { scientificName: { contains: q, mode: 'insensitive' } },
          { commonEnglishName: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { scientificName: 'asc' },
      take,
      select: { id: true, scientificName: true, commonEnglishName: true },
    });
    return rows.map((row) => ({
      kind: 'species' as const,
      id: row.id,
      title: row.scientificName,
      subtitle: row.commonEnglishName,
    }));
  }

  private async distinctContributors(where: Prisma.PlantationWhereInput): Promise<number> {
    const rows = await this.prisma.plantation.groupBy({
      by: ['createdById'],
      where,
      _count: true,
    });
    return rows.length;
  }

  private async survivalEstimate(query: ParsedStatsQuery): Promise<{ total: number | null; n: number }> {
    const rows = await this.prisma.$queryRaw<SurvivalRow[]>`
      SELECT COALESCE(SUM(latest.est), 0) AS total, COUNT(*)::int AS n
      FROM (
        SELECT DISTINCT ON (u."plantationId") u."estimatedSurvivingTrees" AS est
        FROM "monitoring_updates" u
        INNER JOIN "plantations" p ON p.id = u."plantationId"
        WHERE u."verificationStatus" = 'VERIFIED'
          AND u."estimatedSurvivingTrees" IS NOT NULL
          AND ${this.publicPlantationSql(query)}
        ORDER BY u."plantationId", u."observedAt" DESC
      ) latest
    `;
    const n = Number(rows[0]?.n ?? 0);
    if (n === 0) {
      return { total: null, n: 0 };
    }
    return { total: Number(rows[0]?.total ?? 0), n };
  }

  private async treesByYear(query: ParsedStatsQuery): Promise<NamedCount[]> {
    const rows = await this.prisma.$queryRaw<YearRow[]>`
      SELECT EXTRACT(YEAR FROM p."plantingDate")::int::text AS key,
             COALESCE(SUM(p."treeCount"), 0)::int AS trees
      FROM "plantations" p
      WHERE ${this.publicPlantationSql(query)}
      GROUP BY 1
      ORDER BY 1
    `;
    return rows.map((row) => ({ key: row.key, label: row.key, trees: Number(row.trees ?? 0) }));
  }

  private async survivalTrends(query: ParsedStatsQuery): Promise<NamedCount[]> {
    const rows = await this.prisma.$queryRaw<YearRow[]>`
      SELECT EXTRACT(YEAR FROM latest."observedAt")::int::text AS key,
             COALESCE(SUM(latest.est), 0)::int AS trees
      FROM (
        SELECT DISTINCT ON (u."plantationId") u."estimatedSurvivingTrees" AS est, u."observedAt"
        FROM "monitoring_updates" u
        INNER JOIN "plantations" p ON p.id = u."plantationId"
        WHERE u."verificationStatus" = 'VERIFIED'
          AND u."estimatedSurvivingTrees" IS NOT NULL
          AND ${this.publicPlantationSql(query)}
        ORDER BY u."plantationId", u."observedAt" DESC
      ) latest
      GROUP BY 1
      ORDER BY 1
    `;
    return rows.map((row) => ({ key: row.key, label: row.key, trees: Number(row.trees ?? 0) }));
  }

  private publicPlantationSql(query: ParsedStatsQuery): Prisma.Sql {
    const parts: Prisma.Sql[] = [Prisma.sql`p."verificationStatus" = 'VERIFIED'`];
    if (query.provinceCode) {
      parts.push(Prisma.sql`p."provinceCode" = ${query.provinceCode}`);
    }
    if (query.districtCode) {
      parts.push(Prisma.sql`p."districtCode" = ${query.districtCode}`);
    }
    if (query.dsdCode) {
      parts.push(Prisma.sql`p."dsdCode" = ${query.dsdCode}`);
    }
    if (query.gndCode) {
      parts.push(Prisma.sql`p."gndCode" = ${query.gndCode}`);
    }
    if (query.campaignId) {
      parts.push(Prisma.sql`p."campaignId" = ${query.campaignId}`);
    }
    if (query.speciesId) {
      parts.push(Prisma.sql`EXISTS (
        SELECT 1 FROM "plantation_species" ps
        WHERE ps."plantationId" = p.id AND ps."speciesId" = ${query.speciesId}
      )`);
    }
    if (query.year) {
      parts.push(Prisma.sql`EXTRACT(YEAR FROM p."plantingDate") = ${query.year}`);
    }
    return Prisma.join(parts, ' AND ');
  }

  private async treesBySpecies(where: Prisma.PlantationWhereInput): Promise<NamedCount[]> {
    const grouped = await this.prisma.plantationSpecies.groupBy({
      by: ['speciesId'],
      where: { plantation: where },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 20,
    });
    if (grouped.length === 0) {
      return [];
    }
    const species = await this.prisma.species.findMany({
      where: { id: { in: grouped.map((row) => row.speciesId) } },
      select: { id: true, scientificName: true, commonEnglishName: true },
    });
    const names = new Map(species.map((row) => [row.id, row]));
    return grouped.map((row) => {
      const item = names.get(row.speciesId);
      return {
        key: row.speciesId,
        label: item ? `${item.commonEnglishName} (${item.scientificName})` : row.speciesId,
        trees: row._sum.quantity ?? 0,
      };
    });
  }

  private async campaignProgress(where: Prisma.PlantationWhereInput): Promise<CampaignProgressRow[]> {
    const grouped = await this.prisma.plantation.groupBy({
      by: ['campaignId'],
      where: { ...where, campaignId: { not: null } },
      _sum: { treeCount: true },
      _count: true,
    });
    const ids = grouped.map((row) => row.campaignId).filter((id): id is string => Boolean(id));
    if (ids.length === 0) {
      return [];
    }
    const campaigns = await this.prisma.campaign.findMany({
      where: { id: { in: ids }, visibility: 'PUBLIC', status: { in: [...PUBLIC_CAMPAIGN_STATUSES] } },
      select: { id: true, name: true, slug: true, targetTrees: true },
    });
    const byId = new Map(grouped.map((row) => [row.campaignId, row]));
    return campaigns.map((campaign) => {
      const stats = byId.get(campaign.id);
      return {
        campaignId: campaign.id,
        name: campaign.name,
        slug: campaign.slug,
        targetTrees: campaign.targetTrees,
        recordedTrees: stats?._sum.treeCount ?? 0,
        plantationSites: stats?._count ?? 0,
      };
    });
  }
}
