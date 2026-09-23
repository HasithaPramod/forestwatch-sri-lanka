import { randomUUID } from 'node:crypto';
import { Injectable, Optional } from '@nestjs/common';
import { isAdmin, isOfficer } from '@forestwatch/auth';
import { IMAGE } from '@forestwatch/config';
import { Prisma } from '@forestwatch/database';
import type {
  ReportCategory,
  ReportDetail,
  ReportImageSummary,
  ReportListPage,
  ReportStatus,
  ReportSummary,
} from '@forestwatch/types';
import { REPORT_ADMIN_REOPEN_STATUS, REPORT_STATUS_TRANSITIONS } from '@forestwatch/types';
import { buildPaginationMeta } from '@forestwatch/utils';
import type { ParsedCreateReportBody, ParsedReportsQuery, ParsedUpdateReportBody } from '@forestwatch/validation';
import type { RequestUser } from '../auth/types';
import { ApiException } from '../common/http/api-exception';
import { PrismaService } from '../database/prisma.service';
import { EngagementService } from '../engagement/engagement.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const reportInclude = {
  user: { select: { id: true, displayName: true } },
  images: { orderBy: { createdAt: 'asc' as const } },
  plantation: {
    select: {
      id: true,
      name: true,
      provinceCode: true,
      districtCode: true,
      dsdCode: true,
      createdById: true,
      verificationStatus: true,
      organization: { select: { createdById: true } },
    },
  },
} satisfies Prisma.ReportInclude;

type ReportRecord = Prisma.ReportGetPayload<{ include: typeof reportInclude }>;
type PlantationAccess = {
  id: string;
  createdById: string;
  verificationStatus: string;
  organization: { createdById: string } | null;
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @Optional() private readonly notifications?: NotificationsService,
    @Optional() private readonly engagement?: EngagementService,
  ) {}

  async listInbox(query: ParsedReportsQuery, user: RequestUser): Promise<ReportListPage> {
    const where = await this.inboxWhere(query, user);
    const [rows, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        include: reportInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.report.count({ where }),
    ]);

    return {
      items: await Promise.all(rows.map((row) => this.toSummary(row))),
      meta: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
    };
  }

  async listForPlantation(
    plantationId: string,
    query: ParsedReportsQuery,
    user?: RequestUser,
  ): Promise<ReportListPage> {
    await this.requireVisiblePlantation(plantationId, user);
    if (!user) {
      return {
        items: [],
        meta: buildPaginationMeta({ page: query.page, limit: query.limit, total: 0 }),
      };
    }

    const where = await this.plantationListWhere(plantationId, user, query);
    const [rows, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        include: reportInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.report.count({ where }),
    ]);

    return {
      items: await Promise.all(rows.map((row) => this.toSummary(row))),
      meta: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
    };
  }

  async get(reportId: string, user: RequestUser): Promise<ReportDetail> {
    const report = await this.findRecord(reportId);
    if (!(await this.canViewReport(user, report))) {
      throw new ApiException(404, 'REPORT_NOT_FOUND', 'Report not found');
    }
    return this.toDetail(report, user);
  }

  async create(plantationId: string, input: ParsedCreateReportBody, user: RequestUser): Promise<ReportDetail> {
    await this.requireVisiblePlantation(plantationId, user);

    if (input.clientUuid) {
      const existing = await this.prisma.report.findUnique({
        where: { clientUuid: input.clientUuid },
        include: reportInclude,
      });
      if (existing) {
        if (existing.userId !== user.id && !isAdmin(user.roles)) {
          throw new ApiException(409, 'REPORT_EXISTS', 'clientUuid already used');
        }
        return this.toDetail(existing, user);
      }
    }

    const created = await this.prisma.report.create({
      data: {
        plantationId,
        userId: user.id,
        clientUuid: input.clientUuid ?? null,
        category: input.category,
        status: 'OPEN',
        description: input.description,
      },
      include: reportInclude,
    });

    await this.audit('REPORT_CREATED', user.id, created.id);
    if (this.notifications) {
      const officerIds = await this.findAssignedOfficerIds(created.plantation);
      await Promise.all(
        officerIds.map((officerId) =>
          this.notifications?.notify({
            userId: officerId,
            actorId: user.id,
            type: 'REPORT_FILED',
            title: 'New plantation report',
            body: created.plantation.name,
            payload: {
              reportId: created.id,
              plantationId: created.plantationId,
              category: created.category,
            },
          }),
        ),
      );
    }
    return this.toDetail(created, user);
  }

  async updateStatus(reportId: string, input: ParsedUpdateReportBody, user: RequestUser): Promise<ReportDetail> {
    if (!isOfficer(user.roles)) {
      throw new ApiException(403, 'FORBIDDEN', 'Insufficient role');
    }

    const report = await this.findRecord(reportId);
    if (!(await this.canViewReport(user, report))) {
      throw new ApiException(404, 'REPORT_NOT_FOUND', 'Report not found');
    }

    const allowed = this.allowedNextStatuses(report.status as ReportStatus, user);
    if (!allowed.includes(input.status)) {
      throw new ApiException(400, 'REPORT_STATUS', 'That status transition is not allowed');
    }

    const updated = await this.prisma.report.update({
      where: { id: report.id },
      data: { status: input.status },
      include: reportInclude,
    });

    await this.audit('REPORT_STATUS_CHANGED', user.id, updated.id);
    await this.notifications?.notify({
      userId: updated.userId,
      actorId: user.id,
      type: 'REPORT_STATUS_CHANGED',
      title: 'Report status updated',
      body: `${updated.plantation.name} is now ${updated.status}.`,
      payload: {
        reportId: updated.id,
        plantationId: updated.plantationId,
        status: updated.status,
      },
    });
    if (updated.status === 'RESOLVED' && report.status !== 'RESOLVED') {
      await this.engagement?.ingest({
        type: 'REPORT_VERIFIED',
        actorUserId: updated.userId,
        entityId: updated.id,
        occurredAt: updated.updatedAt.toISOString(),
      });
    }
    return this.toDetail(updated, user);
  }

  async addImage(reportId: string, file: Express.Multer.File, user: RequestUser): Promise<ReportDetail> {
    const report = await this.requireEditable(reportId, user);
    if (report.images.length >= IMAGE.maxReportImages) {
      throw new ApiException(400, 'IMAGE_LIMIT', `A report can have at most ${IMAGE.maxReportImages} photographs`);
    }

    const objectKey = `reports/${report.id}/${randomUUID()}.webp`;
    const stored = await this.storage.putOptimizedImage(objectKey, file.buffer);
    try {
      await this.prisma.reportImage.create({
        data: {
          reportId: report.id,
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

    await this.audit('REPORT_IMAGE_CREATED', user.id, report.id);
    return this.get(report.id, user);
  }

  async removeImage(reportId: string, imageId: string, user: RequestUser): Promise<ReportDetail> {
    const report = await this.requireEditable(reportId, user);
    const image = report.images.find((row) => row.id === imageId);
    if (!image) {
      throw new ApiException(404, 'IMAGE_NOT_FOUND', 'Image not found');
    }

    await this.prisma.reportImage.delete({ where: { id: image.id } });
    await this.storage.removeOptimizedImage(image.objectKey);
    await this.audit('REPORT_IMAGE_DELETED', user.id, report.id);
    return this.get(report.id, user);
  }

  private async inboxWhere(query: ParsedReportsQuery, user: RequestUser): Promise<Prisma.ReportWhereInput> {
    const where: Prisma.ReportWhereInput = {};
    const scope = query.scope ?? this.defaultScope(user);

    if (scope === 'mine') {
      where.userId = user.id;
    } else if (scope === 'assigned') {
      if (!isOfficer(user.roles)) {
        throw new ApiException(403, 'FORBIDDEN', 'Insufficient role');
      }
      if (!isAdmin(user.roles)) {
        where.plantation = { OR: await this.requireAssignmentClauses(user.id) };
      }
    } else if (scope === 'all') {
      if (!isAdmin(user.roles)) {
        throw new ApiException(403, 'FORBIDDEN', 'Insufficient role');
      }
    }

    this.applyFilters(where, query);
    return where;
  }

  private async plantationListWhere(
    plantationId: string,
    user: RequestUser,
    query: ParsedReportsQuery,
  ): Promise<Prisma.ReportWhereInput> {
    const where: Prisma.ReportWhereInput = {};
    this.applyFilters(where, query);
    where.plantationId = plantationId;
    if (!isAdmin(user.roles)) {
      const visibility: Prisma.ReportWhereInput[] = [
        { userId: user.id },
        { plantation: { createdById: user.id } },
        { plantation: { organization: { createdById: user.id } } },
      ];
      if (isOfficer(user.roles)) {
        const assignments = await this.assignmentClauses(user.id);
        if (assignments) {
          visibility.push({ plantation: { OR: assignments } });
        }
      }
      where.OR = visibility;
    }
    return where;
  }

  private applyFilters(where: Prisma.ReportWhereInput, query: ParsedReportsQuery): void {
    if (query.plantationId) {
      where.plantationId = query.plantationId;
    }
    if (query.category) {
      where.category = query.category;
    }
    if (query.status) {
      where.status = query.status;
    }
  }

  private defaultScope(user: RequestUser): NonNullable<ParsedReportsQuery['scope']> {
    if (isAdmin(user.roles)) {
      return 'all';
    }
    if (isOfficer(user.roles)) {
      return 'assigned';
    }
    return 'mine';
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
        organization: { select: { createdById: true } },
      },
    });
    if (!plantation || !this.canViewPlantation(user, plantation)) {
      throw new ApiException(404, 'PLANTATION_NOT_FOUND', 'Plantation not found');
    }
    return plantation;
  }

  private async findRecord(id: string): Promise<ReportRecord> {
    if (!UUID_RE.test(id)) {
      throw new ApiException(404, 'REPORT_NOT_FOUND', 'Report not found');
    }
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: reportInclude,
    });
    if (!report) {
      throw new ApiException(404, 'REPORT_NOT_FOUND', 'Report not found');
    }
    return report;
  }

  private async requireEditable(reportId: string, user: RequestUser): Promise<ReportRecord> {
    const report = await this.findRecord(reportId);
    if (!(await this.canViewReport(user, report))) {
      throw new ApiException(404, 'REPORT_NOT_FOUND', 'Report not found');
    }
    if (!this.canMutate(user, report)) {
      throw new ApiException(403, 'FORBIDDEN', 'This report cannot be edited');
    }
    return report;
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

  private async canViewReport(user: RequestUser, report: ReportRecord): Promise<boolean> {
    if (isAdmin(user.roles)) {
      return true;
    }
    if (report.userId === user.id) {
      return true;
    }
    if (report.plantation.createdById === user.id || report.plantation.organization?.createdById === user.id) {
      return true;
    }
    if (!isOfficer(user.roles)) {
      return false;
    }
    const assignments = await this.assignmentClauses(user.id);
    if (!assignments) {
      return false;
    }
    return assignments.some((clause) => this.plantationMatchesClause(report.plantation, clause));
  }

  private plantationMatchesClause(
    plantation: ReportRecord['plantation'],
    clause: Prisma.PlantationWhereInput,
  ): boolean {
    if (typeof clause.dsdCode === 'string') {
      return plantation.dsdCode === clause.dsdCode;
    }
    if (typeof clause.districtCode === 'string') {
      return plantation.districtCode === clause.districtCode;
    }
    if (typeof clause.provinceCode === 'string') {
      return plantation.provinceCode === clause.provinceCode;
    }
    return false;
  }

  private canMutate(user: RequestUser, report: ReportRecord): boolean {
    if (isAdmin(user.roles)) {
      return true;
    }
    if (isOfficer(user.roles)) {
      return report.status !== 'REJECTED';
    }
    return report.userId === user.id && report.status === 'OPEN';
  }

  private allowedNextStatuses(current: ReportStatus, user: RequestUser): ReportStatus[] {
    const next = [...REPORT_STATUS_TRANSITIONS[current]];
    if (isAdmin(user.roles) && (current === 'RESOLVED' || current === 'REJECTED')) {
      next.push(REPORT_ADMIN_REOPEN_STATUS);
    }
    return next;
  }

  private async requireAssignmentClauses(userId: string): Promise<Prisma.PlantationWhereInput[]> {
    const clauses = await this.assignmentClauses(userId);
    if (!clauses) {
      throw new ApiException(403, 'FORBIDDEN', 'No officer assignment');
    }
    return clauses;
  }

  private async assignmentClauses(userId: string): Promise<Prisma.PlantationWhereInput[] | null> {
    const assignments = await this.prisma.officerAssignment.findMany({ where: { userId } });
    if (assignments.length === 0) {
      return null;
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

  private async findAssignedOfficerIds(plantation: {
    provinceCode: string | null;
    districtCode: string | null;
    dsdCode: string | null;
  }): Promise<string[]> {
    const or: Prisma.OfficerAssignmentWhereInput[] = [];
    if (plantation.dsdCode) {
      or.push({ dsdCode: plantation.dsdCode });
    }
    if (plantation.districtCode) {
      or.push({ districtCode: plantation.districtCode, dsdCode: null });
    }
    if (plantation.provinceCode) {
      or.push({ provinceCode: plantation.provinceCode, districtCode: null, dsdCode: null });
    }
    if (or.length === 0) {
      return [];
    }
    const rows = await this.prisma.officerAssignment.findMany({
      where: { OR: or },
      select: { userId: true },
    });
    return [...new Set(rows.map((row) => row.userId))];
  }

  private async audit(action: string, actorId: string, entityId: string): Promise<void> {
    await this.prisma.auditLog.create({
      data: { action, actorId, entityType: 'report', entityId },
    });
  }

  private async toSummary(report: ReportRecord): Promise<ReportSummary> {
    const cover = report.images[0] ? await this.storage.resolvePublicImage(report.images[0].objectKey) : null;
    return {
      id: report.id,
      plantationId: report.plantationId,
      category: report.category as ReportCategory,
      status: report.status as ReportStatus,
      description: report.description,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
      plantation: {
        id: report.plantation.id,
        name: report.plantation.name,
        provinceCode: report.plantation.provinceCode,
        districtCode: report.plantation.districtCode,
      },
      reporter: { id: report.user.id, displayName: report.user.displayName },
      coverImage: cover,
    };
  }

  private async toDetail(report: ReportRecord, user: RequestUser): Promise<ReportDetail> {
    const summary = await this.toSummary(report);
    const images: ReportImageSummary[] = [];
    for (const row of report.images) {
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
      clientUuid: report.clientUuid,
      images,
      editable: this.canMutate(user, report),
    };
  }
}
