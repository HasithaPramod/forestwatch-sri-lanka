import { Injectable, Optional } from '@nestjs/common';
import { isAdmin, isOfficer } from '@forestwatch/auth';
import { Prisma } from '@forestwatch/database';
import type {
  HealthCondition,
  MonitoringVerificationStatus,
  PlantationVerificationStatus,
  ReviewQueuePage,
  VerificationDecision,
  VerificationListPage,
  VerificationRecord,
  VerificationSubjectType,
} from '@forestwatch/types';
import { buildPaginationMeta } from '@forestwatch/utils';
import type { ParsedCreateVerificationBody, ParsedVerificationsQuery } from '@forestwatch/validation';
import type { RequestUser } from '../auth/types';
import { ApiException } from '../common/http/api-exception';
import { PrismaService } from '../database/prisma.service';
import { EngagementService } from '../engagement/engagement.service';
import { NotificationsService } from '../notifications/notifications.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const QUEUE_LIMIT = 50;

const verificationInclude = {
  actor: { select: { id: true, displayName: true } },
} satisfies Prisma.VerificationInclude;

type VerificationRow = Prisma.VerificationGetPayload<{ include: typeof verificationInclude }>;

type PlantationGeo = {
  id: string;
  createdById: string;
  verificationStatus: string;
  provinceCode: string | null;
  districtCode: string | null;
  dsdCode: string | null;
  organization: { createdById: string } | null;
};

@Injectable()
export class VerificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notifications?: NotificationsService,
    @Optional() private readonly engagement?: EngagementService,
  ) {}

  async queue(user: RequestUser): Promise<ReviewQueuePage> {
    this.requireOfficer(user);
    const plantationFilter = await this.assignedPlantationFilter(user);

    const [plantations, monitoring] = await Promise.all([
      this.prisma.plantation.findMany({
        where: {
          verificationStatus: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
          ...(plantationFilter ? { OR: plantationFilter } : {}),
        },
        orderBy: { updatedAt: 'asc' },
        take: QUEUE_LIMIT,
        select: {
          id: true,
          name: true,
          verificationStatus: true,
          provinceCode: true,
          districtCode: true,
          plantingDate: true,
          treeCount: true,
        },
      }),
      this.prisma.monitoringUpdate.findMany({
        where: {
          verificationStatus: 'PENDING',
          ...(plantationFilter ? { plantation: { OR: plantationFilter } } : {}),
        },
        orderBy: { observedAt: 'asc' },
        take: QUEUE_LIMIT,
        select: {
          id: true,
          plantationId: true,
          observedAt: true,
          healthStatus: true,
          verificationStatus: true,
          user: { select: { id: true, displayName: true } },
          plantation: { select: { name: true } },
        },
      }),
    ]);

    return {
      plantations: plantations.map((row) => ({
        id: row.id,
        name: row.name,
        verificationStatus: row.verificationStatus as PlantationVerificationStatus,
        provinceCode: row.provinceCode,
        districtCode: row.districtCode,
        plantingDate: row.plantingDate.toISOString(),
        treeCount: row.treeCount,
      })),
      monitoring: monitoring.map((row) => ({
        id: row.id,
        plantationId: row.plantationId,
        plantationName: row.plantation.name,
        observedAt: row.observedAt.toISOString(),
        healthStatus: row.healthStatus as HealthCondition,
        verificationStatus: row.verificationStatus as MonitoringVerificationStatus,
        observer: { id: row.user.id, displayName: row.user.displayName },
      })),
    };
  }

  async list(query: ParsedVerificationsQuery, user?: RequestUser): Promise<VerificationListPage> {
    const access = await this.requireVisibleSubject(query.subjectType, query.subjectId, user);
    const where: Prisma.VerificationWhereInput = {
      subjectType: query.subjectType,
      subjectId: query.subjectId,
    };
    const [rows, total] = await Promise.all([
      this.prisma.verification.findMany({
        where,
        include: verificationInclude,
        orderBy: { createdAt: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.verification.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toRecord(row, access.canSeeNotes)),
      meta: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
    };
  }

  async create(input: ParsedCreateVerificationBody, user: RequestUser): Promise<VerificationRecord> {
    this.requireOfficer(user);

    if (input.subjectType === 'PLANTATION') {
      return this.verifyPlantation(input, user);
    }
    return this.verifyMonitoring(input, user);
  }

  async startPlantationReview(plantationId: string, user: RequestUser): Promise<{ verificationStatus: PlantationVerificationStatus }> {
    this.requireOfficer(user);
    const plantation = await this.requirePlantation(plantationId);
    await this.requireAssigned(user, plantation);
    if (plantation.verificationStatus !== 'SUBMITTED') {
      throw new ApiException(400, 'VERIFICATION_STATUS', 'Only submitted plantations can be taken under review');
    }

    await this.prisma.plantation.update({
      where: { id: plantation.id },
      data: { verificationStatus: 'UNDER_REVIEW' },
    });
    await this.audit('PLANTATION_REVIEW_STARTED', user.id, plantation.id);
    return { verificationStatus: 'UNDER_REVIEW' };
  }

  private async verifyPlantation(
    input: ParsedCreateVerificationBody,
    user: RequestUser,
  ): Promise<VerificationRecord> {
    const plantation = await this.requirePlantation(input.subjectId);
    await this.requireAssigned(user, plantation);

    const nextStatus = this.nextPlantationStatus(input.decision);
    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.verification.create({
        data: {
          subjectType: 'PLANTATION',
          subjectId: plantation.id,
          decision: input.decision,
          notes: input.notes ?? null,
          actorId: user.id,
        },
        include: verificationInclude,
      });
      await tx.plantation.update({
        where: { id: plantation.id },
        data: { verificationStatus: nextStatus },
      });
      return row;
    });

    await this.audit('VERIFICATION_CREATED', user.id, created.id);
    await this.notifications?.notify({
      userId: plantation.createdById,
      actorId: user.id,
      type:
        input.decision === 'VERIFIED'
          ? 'PLANTATION_VERIFIED'
          : input.decision === 'REJECTED'
            ? 'PLANTATION_REJECTED'
            : 'CORRECTION_REQUESTED',
      title:
        input.decision === 'VERIFIED'
          ? 'Plantation verified'
          : input.decision === 'REJECTED'
            ? 'Plantation rejected'
            : 'Correction requested',
      body:
        input.decision === 'VERIFIED'
          ? 'An officer verified a plantation you submitted.'
          : input.decision === 'REJECTED'
            ? 'An officer rejected a plantation you submitted.'
            : 'An officer requested a correction on a plantation you submitted.',
      payload: { plantationId: plantation.id, verificationId: created.id, decision: input.decision },
    });
    if (input.decision === 'VERIFIED') {
      await this.engagement?.ingest({
        type: 'PLANTATION_VERIFIED',
        actorUserId: plantation.createdById,
        entityId: plantation.id,
        occurredAt: created.createdAt.toISOString(),
      });
    }
    return this.toRecord(created, true);
  }

  private async verifyMonitoring(
    input: ParsedCreateVerificationBody,
    user: RequestUser,
  ): Promise<VerificationRecord> {
    if (input.decision === 'REQUEST_CORRECTION') {
      throw new ApiException(400, 'VERIFICATION_STATUS', 'Monitoring updates are verified or rejected; submit a new observation instead of rewriting history');
    }
    if (!UUID_RE.test(input.subjectId)) {
      throw new ApiException(404, 'MONITORING_NOT_FOUND', 'Monitoring update not found');
    }

    const update = await this.prisma.monitoringUpdate.findUnique({
      where: { id: input.subjectId },
      select: {
        id: true,
        plantationId: true,
        userId: true,
        verificationStatus: true,
        plantation: {
          select: {
            id: true,
            createdById: true,
            verificationStatus: true,
            provinceCode: true,
            districtCode: true,
            dsdCode: true,
            organization: { select: { createdById: true } },
          },
        },
      },
    });
    if (!update) {
      throw new ApiException(404, 'MONITORING_NOT_FOUND', 'Monitoring update not found');
    }
    await this.requireAssigned(user, update.plantation);

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.verification.create({
        data: {
          subjectType: 'MONITORING',
          subjectId: update.id,
          decision: input.decision,
          notes: input.notes ?? null,
          actorId: user.id,
        },
        include: verificationInclude,
      });
      await tx.monitoringUpdate.update({
        where: { id: update.id },
        data: { verificationStatus: input.decision === 'VERIFIED' ? 'VERIFIED' : 'REJECTED' },
      });
      return row;
    });

    await this.audit('VERIFICATION_CREATED', user.id, created.id);
    await this.notifications?.notify({
      userId: update.userId,
      actorId: user.id,
      type: input.decision === 'VERIFIED' ? 'MONITORING_VERIFIED' : 'MONITORING_REJECTED',
      title: input.decision === 'VERIFIED' ? 'Monitoring verified' : 'Monitoring rejected',
      body:
        input.decision === 'VERIFIED'
          ? 'An officer verified a monitoring update you submitted.'
          : 'An officer rejected a monitoring update you submitted.',
      payload: {
        plantationId: update.plantationId,
        monitoringId: update.id,
        verificationId: created.id,
        decision: input.decision,
      },
    });
    if (input.decision === 'VERIFIED') {
      await this.engagement?.ingest({
        type: 'MONITORING_VERIFIED',
        actorUserId: update.userId,
        entityId: update.id,
        occurredAt: created.createdAt.toISOString(),
      });
    }
    return this.toRecord(created, true);
  }

  private nextPlantationStatus(decision: VerificationDecision): PlantationVerificationStatus {
    if (decision === 'VERIFIED') {
      return 'VERIFIED';
    }
    if (decision === 'REJECTED') {
      return 'REJECTED';
    }
    return 'SUBMITTED';
  }

  private async requireVisibleSubject(
    subjectType: VerificationSubjectType,
    subjectId: string,
    user?: RequestUser,
  ): Promise<{ canSeeNotes: boolean }> {
    if (subjectType === 'PLANTATION') {
      const plantation = await this.requirePlantation(subjectId);
      if (!this.canViewPlantation(user, plantation)) {
        throw new ApiException(404, 'PLANTATION_NOT_FOUND', 'Plantation not found');
      }
      return { canSeeNotes: this.canSeePlantationNotes(user, plantation) };
    }

    if (!UUID_RE.test(subjectId)) {
      throw new ApiException(404, 'MONITORING_NOT_FOUND', 'Monitoring update not found');
    }
    const update = await this.prisma.monitoringUpdate.findUnique({
      where: { id: subjectId },
      select: {
        id: true,
        userId: true,
        verificationStatus: true,
        plantation: {
          select: {
            createdById: true,
            verificationStatus: true,
            organization: { select: { createdById: true } },
          },
        },
      },
    });
    if (!update || !this.canViewMonitoring(user, update)) {
      throw new ApiException(404, 'MONITORING_NOT_FOUND', 'Monitoring update not found');
    }
    return {
      canSeeNotes: Boolean(
        user &&
          (isOfficer(user.roles) ||
            update.userId === user.id ||
            update.plantation.createdById === user.id ||
            update.plantation.organization?.createdById === user.id),
      ),
    };
  }

  private canSeePlantationNotes(user: RequestUser | undefined, plantation: PlantationGeo): boolean {
    if (!user) {
      return false;
    }
    if (isOfficer(user.roles)) {
      return true;
    }
    return plantation.createdById === user.id || plantation.organization?.createdById === user.id;
  }

  private async requirePlantation(id: string): Promise<PlantationGeo> {
    if (!UUID_RE.test(id)) {
      throw new ApiException(404, 'PLANTATION_NOT_FOUND', 'Plantation not found');
    }
    const plantation = await this.prisma.plantation.findUnique({
      where: { id },
      select: {
        id: true,
        createdById: true,
        verificationStatus: true,
        provinceCode: true,
        districtCode: true,
        dsdCode: true,
        organization: { select: { createdById: true } },
      },
    });
    if (!plantation) {
      throw new ApiException(404, 'PLANTATION_NOT_FOUND', 'Plantation not found');
    }
    return plantation;
  }

  private canViewPlantation(user: RequestUser | undefined, plantation: PlantationGeo): boolean {
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

  private canViewMonitoring(
    user: RequestUser | undefined,
    update: {
      userId: string;
      verificationStatus: string;
      plantation: { createdById: string; verificationStatus: string; organization: { createdById: string } | null };
    },
  ): boolean {
    if (update.verificationStatus === 'VERIFIED' && this.canViewPlantation(user, {
      id: '',
      createdById: update.plantation.createdById,
      verificationStatus: update.plantation.verificationStatus,
      provinceCode: null,
      districtCode: null,
      dsdCode: null,
      organization: update.plantation.organization,
    })) {
      return true;
    }
    if (!user) {
      return false;
    }
    return update.userId === user.id || isOfficer(user.roles);
  }

  private requireOfficer(user: RequestUser): void {
    if (!isOfficer(user.roles)) {
      throw new ApiException(403, 'FORBIDDEN', 'Insufficient role');
    }
  }

  private async requireAssigned(user: RequestUser, plantation: PlantationGeo): Promise<void> {
    if (isAdmin(user.roles)) {
      return;
    }
    const clauses = await this.requireAssignmentClauses(user.id);
    if (!clauses.some((clause) => this.plantationMatchesClause(plantation, clause))) {
      throw new ApiException(403, 'FORBIDDEN', 'Plantation is outside the officer assignment');
    }
  }

  private async assignedPlantationFilter(user: RequestUser): Promise<Prisma.PlantationWhereInput[] | undefined> {
    if (isAdmin(user.roles)) {
      return undefined;
    }
    return this.requireAssignmentClauses(user.id);
  }

  private async requireAssignmentClauses(userId: string): Promise<Prisma.PlantationWhereInput[]> {
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

  private plantationMatchesClause(plantation: PlantationGeo, clause: Prisma.PlantationWhereInput): boolean {
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

  private async audit(action: string, actorId: string, entityId: string): Promise<void> {
    await this.prisma.auditLog.create({
      data: { action, actorId, entityType: 'verification', entityId },
    });
  }

  private toRecord(row: VerificationRow, showNotes: boolean): VerificationRecord {
    return {
      id: row.id,
      subjectType: row.subjectType as VerificationSubjectType,
      subjectId: row.subjectId,
      decision: row.decision as VerificationDecision,
      notes: showNotes ? row.notes : null,
      createdAt: row.createdAt.toISOString(),
      actor: { id: row.actor.id, displayName: row.actor.displayName },
    };
  }
}
