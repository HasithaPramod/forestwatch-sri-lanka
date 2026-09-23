import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@forestwatch/database';
import {
  canRecordForestQuestDiscovery,
  confirmableEventTypes,
  ecoPointsFor,
  isEngagementEventType,
  ledgerStatusFor,
  levelForXp,
  missionRequiresOnSite,
  parseBadgeRule,
  parseMissionTaskRule,
  projectForestQuestProfile,
  rewardRuleFor,
  type EngagementDomainEvent,
} from '@forestwatch/engagement';
import type {
  BadgeItem,
  BadgeList,
  ForestDex,
  ForestDexEntry,
  ForestQuestProfile,
  ForestQuestUnavailable,
  MissionItem,
  MissionList,
  MissionTaskProgress,
  NativeStatus,
  PlantationDiscoveryList,
} from '@forestwatch/types';
import type { RequestUser } from '../auth/types';
import { ApiException } from '../common/http/api-exception';
import { PrismaService } from '../database/prisma.service';
import { serializeCoordinates } from '../plantations/coordinates';

function isUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

const UNAVAILABLE: ForestQuestUnavailable = { available: false };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONFIRMABLE_EVENT_TYPES = confirmableEventTypes();

type MissionRecord = Prisma.MissionGetPayload<{ include: { tasks: true } }>;

@Injectable()
export class EngagementService {
  private readonly logger = new Logger(EngagementService.name);

  constructor(private readonly prisma: PrismaService) {}

  async profile(userId: string): Promise<ForestQuestProfile> {
    await this.settleRewards(userId);
    return this.readProfile(userId);
  }

  unavailable(): ForestQuestUnavailable {
    return UNAVAILABLE;
  }

  async badges(userId: string): Promise<BadgeList> {
    await this.settleRewards(userId);
    const [catalogue, awarded] = await Promise.all([
      this.prisma.badge.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.userBadge.findMany({ where: { userId } }),
    ]);
    const awardedById = new Map(awarded.map((row) => [row.badgeId, row]));
    const items: BadgeItem[] = catalogue.map((badge) => {
      const row = awardedById.get(badge.id);
      return {
        id: badge.id,
        slug: badge.slug,
        name: badge.name,
        description: badge.description,
        awarded: Boolean(row),
        awardedAt: row?.awardedAt.toISOString() ?? null,
      };
    });
    return { available: true, items };
  }

  async missions(userId: string): Promise<MissionList> {
    await this.settleRewards(userId);
    const rows = await this.prisma.mission.findMany({
      where: { status: 'ACTIVE' },
      include: { tasks: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
    const items = await Promise.all(rows.map((mission) => this.toMissionItem(userId, mission)));
    return { available: true, items };
  }

  async mission(userId: string, id: string): Promise<MissionItem> {
    if (!UUID_RE.test(id)) {
      throw new ApiException(404, 'MISSION_NOT_FOUND', 'Mission not found');
    }
    await this.settleRewards(userId);
    const mission = await this.prisma.mission.findUnique({
      where: { id },
      include: { tasks: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!mission || mission.status === 'DRAFT') {
      throw new ApiException(404, 'MISSION_NOT_FOUND', 'Mission not found');
    }
    if (mission.status !== 'ACTIVE') {
      const assigned = await this.prisma.userMission.findUnique({
        where: { userId_missionId: { userId, missionId: mission.id } },
      });
      if (!assigned) {
        throw new ApiException(404, 'MISSION_NOT_FOUND', 'Mission not found');
      }
    }
    return this.toMissionItem(userId, mission);
  }

  async forestDex(user: RequestUser): Promise<ForestDex> {
    const [catalogue, discoveries, verifiedUpdates] = await Promise.all([
      this.prisma.species.findMany({
        where: { active: true },
        orderBy: { commonEnglishName: 'asc' },
        select: {
          id: true,
          scientificName: true,
          commonEnglishName: true,
          sinhalaName: true,
          tamilName: true,
          nativeStatus: true,
          description: true,
        },
      }),
      this.prisma.speciesDiscovery.findMany({ where: { userId: user.id } }),
      this.prisma.monitoringUpdate.findMany({
        where: { userId: user.id, verificationStatus: 'VERIFIED' },
        select: { plantation: { select: { species: { select: { speciesId: true } } } } },
      }),
    ]);
    const plantationIds = [
      ...new Set(discoveries.map((row) => row.plantationId).filter((id): id is string => Boolean(id))),
    ];
    const plantations = plantationIds.length
      ? await this.prisma.plantation.findMany({
          where: { id: { in: plantationIds } },
          select: {
            id: true,
            latitude: true,
            longitude: true,
            locationVisibility: true,
            createdById: true,
            organization: { select: { createdById: true } },
          },
        })
      : [];
    const plantationById = new Map(plantations.map((row) => [row.id, row]));

    const discoveryBySpecies = new Map(discoveries.map((row) => [row.speciesId, row]));
    const encounters = new Map<string, number>();
    for (const update of verifiedUpdates) {
      for (const row of update.plantation.species) {
        encounters.set(row.speciesId, (encounters.get(row.speciesId) ?? 0) + 1);
      }
    }

    const entries: ForestDexEntry[] = catalogue.map((species) => {
      const discovery = discoveryBySpecies.get(species.id);
      if (!discovery) {
        return {
          speciesId: species.id,
          scientificName: species.scientificName,
          commonEnglishName: species.commonEnglishName,
          sinhalaName: species.sinhalaName,
          tamilName: species.tamilName,
          nativeStatus: species.nativeStatus as NativeStatus,
          discovered: false,
          discoveredAt: null,
          description: null,
          plantationId: null,
          location: null,
          verifiedEncounters: 0,
        };
      }
      const site = discovery.plantationId ? plantationById.get(discovery.plantationId) : undefined;
      return {
        speciesId: species.id,
        scientificName: species.scientificName,
        commonEnglishName: species.commonEnglishName,
        sinhalaName: species.sinhalaName,
        tamilName: species.tamilName,
        nativeStatus: species.nativeStatus as NativeStatus,
        discovered: true,
        discoveredAt: discovery.discoveredAt.toISOString(),
        description: species.description,
        plantationId: discovery.plantationId,
        location: site ? serializeCoordinates(site, user) : null,
        verifiedEncounters: encounters.get(species.id) ?? 0,
      };
    });

    return {
      available: true,
      discoveredCount: entries.filter((row) => row.discovered).length,
      catalogueCount: catalogue.length,
      entries,
    };
  }

  async plantationDiscoveries(user: RequestUser): Promise<PlantationDiscoveryList> {
    const rows = await this.prisma.plantationDiscovery.findMany({
      where: {
        userId: user.id,
        plantation: { locationVisibility: { not: 'OFFICER_ONLY' } },
      },
      include: {
        plantation: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            locationVisibility: true,
            createdById: true,
            organization: { select: { createdById: true } },
          },
        },
      },
      orderBy: { discoveredAt: 'desc' },
    });

    return {
      available: true,
      items: rows.map((row) => ({
        plantationId: row.plantation.id,
        name: row.plantation.name,
        discoveredAt: row.discoveredAt.toISOString(),
        location: serializeCoordinates(row.plantation, user),
      })),
    };
  }

  async ingest(event: EngagementDomainEvent): Promise<{ recorded: boolean; reason?: string }> {
    if (!isEngagementEventType(event.type)) {
      return { recorded: false, reason: 'unknown_event' };
    }
    const rule = rewardRuleFor(event.type);
    if (!rule) {
      return { recorded: false, reason: 'no_rule' };
    }

    await this.ensureProfile(event.actorUserId);
    const status = ledgerStatusFor(event.type);

    try {
      await this.prisma.xpTransaction.create({
        data: {
          userId: event.actorUserId,
          eventType: event.type,
          eventId: event.entityId,
          amount: rule.xpAmount,
          status,
          reason:
            status === 'CONFIRMED'
              ? `${event.type} confirmed from a verified domain event.`
              : `${event.type} recorded. XP confirms after verification.`,
        },
      });
      await this.settleRewards(event.actorUserId);
      return { recorded: true };
    } catch (error) {
      if (isUniqueConflict(error)) {
        await this.settleRewards(event.actorUserId);
        return { recorded: false, reason: 'duplicate' };
      }
      this.logger.warn(`Failed to ingest ${event.type} for ${event.actorUserId}: ${String(error)}`);
      return { recorded: false, reason: 'error' };
    }
  }

  async recordOnSiteDiscoveries(input: {
    userId: string;
    plantationId: string;
    locationValidation: string;
    occurredAt: string;
  }): Promise<{ plantation: boolean; species: number }> {
    const plantation = await this.prisma.plantation.findUnique({
      where: { id: input.plantationId },
      select: {
        id: true,
        verificationStatus: true,
        locationVisibility: true,
        species: { select: { speciesId: true } },
      },
    });
    if (
      !plantation ||
      !canRecordForestQuestDiscovery({
        locationValidation: input.locationValidation,
        plantationVerificationStatus: plantation.verificationStatus,
        locationVisibility: plantation.locationVisibility,
      })
    ) {
      return { plantation: false, species: 0 };
    }

    const plantationRecorded = await this.createUniqueDiscovery(() =>
      this.prisma.plantationDiscovery.create({
        data: { userId: input.userId, plantationId: plantation.id },
      }),
    );
    if (plantationRecorded) {
      await this.ingest({
        type: 'PLANTATION_DISCOVERED',
        actorUserId: input.userId,
        entityId: plantation.id,
        occurredAt: input.occurredAt,
      });
    }

    let species = 0;
    for (const row of plantation.species) {
      const recorded = await this.createUniqueDiscovery(() =>
        this.prisma.speciesDiscovery.create({
          data: {
            userId: input.userId,
            speciesId: row.speciesId,
            plantationId: plantation.id,
          },
        }),
      );
      if (recorded) {
        species += 1;
        await this.ingest({
          type: 'SPECIES_DISCOVERED',
          actorUserId: input.userId,
          entityId: row.speciesId,
          occurredAt: input.occurredAt,
        });
      }
    }

    return { plantation: plantationRecorded, species };
  }

  private async settleRewards(userId: string): Promise<void> {
    await this.confirmEligiblePending(userId);
    await this.evaluateBadges(userId);
    await this.syncMissions(userId);
    await this.refreshProjection(userId);
  }

  private async confirmEligiblePending(userId: string): Promise<void> {
    await this.prisma.xpTransaction.updateMany({
      where: {
        userId,
        status: 'PENDING',
        eventType: { in: CONFIRMABLE_EVENT_TYPES },
      },
      data: {
        status: 'CONFIRMED',
        reason: 'Confirmed from a verified domain event.',
      },
    });
  }

  private async evaluateBadges(userId: string): Promise<void> {
    const [catalogue, awarded] = await Promise.all([
      this.prisma.badge.findMany(),
      this.prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } }),
    ]);
    const awardedIds = new Set(awarded.map((row) => row.badgeId));
    for (const badge of catalogue) {
      if (awardedIds.has(badge.id)) {
        continue;
      }
      const rule = parseBadgeRule(badge.rule);
      if (!rule || !(await this.badgeSatisfied(userId, rule))) {
        continue;
      }
      try {
        await this.prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
      } catch (error) {
        if (!isUniqueConflict(error)) {
          throw error;
        }
      }
    }
  }

  private async badgeSatisfied(userId: string, rule: { type: string; eventType?: string; min: number }): Promise<boolean> {
    const min = rule.min;
    if (rule.type === 'first-plant') {
      return (await this.prisma.plantation.count({ where: { createdById: userId } })) >= min;
    }
    if (rule.type === 'first-discovery') {
      return (await this.prisma.plantationDiscovery.count({ where: { userId } })) >= min;
    }
    if (rule.type === 'first-verified-observation') {
      return (
        (await this.prisma.xpTransaction.count({
          where: { userId, eventType: 'MONITORING_VERIFIED', status: 'CONFIRMED' },
        })) >= min
      );
    }
    if (rule.type === 'species-count') {
      return (await this.prisma.speciesDiscovery.count({ where: { userId } })) >= min;
    }
    if (rule.type === 'event' && rule.eventType) {
      return (
        (await this.prisma.xpTransaction.count({
          where: { userId, eventType: rule.eventType, status: 'CONFIRMED' },
        })) >= min
      );
    }
    return false;
  }

  private async syncMissions(userId: string): Promise<void> {
    const missions = await this.prisma.mission.findMany({
      where: { status: 'ACTIVE' },
      include: { tasks: { orderBy: { sortOrder: 'asc' } } },
    });
    for (const mission of missions) {
      const tasks = await this.taskProgress(userId, mission);
      const completed = tasks.every((task) => task.completed);
      const started = tasks.some((task) => task.current > 0);
      await this.prisma.userMission.upsert({
        where: { userId_missionId: { userId, missionId: mission.id } },
        create: {
          userId,
          missionId: mission.id,
          status: completed ? 'COMPLETED' : started ? 'IN_PROGRESS' : 'ASSIGNED',
          progress: { tasks },
          completedAt: completed ? new Date() : null,
        },
        update: {
          status: completed ? 'COMPLETED' : started ? 'IN_PROGRESS' : 'ASSIGNED',
          progress: { tasks },
          completedAt: completed ? new Date() : null,
        },
      });
    }
  }

  private async toMissionItem(userId: string, mission: MissionRecord): Promise<MissionItem> {
    const tasks = await this.taskProgress(userId, mission);
    const completedTasks = tasks.filter((task) => task.completed).length;
    const completed = tasks.length > 0 && completedTasks === tasks.length;
    const started = tasks.some((task) => task.current > 0);
    return {
      id: mission.id,
      type: mission.type,
      status: mission.status,
      title: mission.title,
      description: mission.description,
      campaignId: mission.campaignId,
      userStatus: completed ? 'COMPLETED' : started ? 'IN_PROGRESS' : 'ASSIGNED',
      completedTasks,
      totalTasks: tasks.length,
      tasks,
    };
  }

  private async taskProgress(userId: string, mission: MissionRecord): Promise<MissionTaskProgress[]> {
    const requireOnSite = missionRequiresOnSite(mission.rule);
    const tasks: MissionTaskProgress[] = [];
    for (const task of mission.tasks) {
      const rule = parseMissionTaskRule(task.rule);
      const onSite = requireOnSite || rule.requireOnSite;
      const current = await this.taskCurrent(userId, rule.eventType, onSite);
      tasks.push({
        id: task.id,
        title: task.title,
        sortOrder: task.sortOrder,
        current,
        required: rule.min,
        completed: current >= rule.min,
      });
    }
    return tasks;
  }

  private async taskCurrent(userId: string, eventType: string | undefined, requireOnSite: boolean): Promise<number> {
    if (!eventType) {
      return 0;
    }
    if (eventType === 'MONITORING_VERIFIED' && requireOnSite) {
      return this.prisma.monitoringUpdate.count({
        where: { userId, verificationStatus: 'VERIFIED', locationValidation: 'ON_SITE' },
      });
    }
    return this.prisma.xpTransaction.count({
      where: { userId, eventType, status: 'CONFIRMED' },
    });
  }

  private async refreshProjection(userId: string): Promise<void> {
    const [confirmed, confirmedRows] = await Promise.all([
      this.prisma.xpTransaction.aggregate({
        where: { userId, status: 'CONFIRMED' },
        _sum: { amount: true },
      }),
      this.prisma.xpTransaction.findMany({
        where: { userId, status: 'CONFIRMED' },
        select: { eventType: true },
      }),
    ]);
    const confirmedXp = confirmed._sum.amount ?? 0;
    const ecoPoints = confirmedRows.reduce((sum, row) => sum + ecoPointsFor(row.eventType), 0);
    const level = levelForXp(confirmedXp);
    await this.prisma.engagementProfile.upsert({
      where: { userId },
      create: {
        userId,
        confirmedXp,
        ecoPoints,
        level: level.level,
        displayTitle: level.title,
      },
      update: {
        confirmedXp,
        ecoPoints,
        level: level.level,
        displayTitle: level.title,
      },
    });
  }

  private async readProfile(userId: string): Promise<ForestQuestProfile> {
    const [
      pendingEvents,
      confirmed,
      confirmedRows,
      catalogueCount,
      discoveredCount,
      awardedBadgeCount,
      completedMissionCount,
      activeMissionCount,
    ] = await Promise.all([
      this.prisma.xpTransaction.count({ where: { userId, status: 'PENDING' } }),
      this.prisma.xpTransaction.aggregate({
        where: { userId, status: 'CONFIRMED' },
        _sum: { amount: true },
      }),
      this.prisma.xpTransaction.findMany({
        where: { userId, status: 'CONFIRMED' },
        select: { eventType: true },
      }),
      this.prisma.species.count({ where: { active: true } }),
      this.prisma.speciesDiscovery.count({ where: { userId, species: { active: true } } }),
      this.prisma.userBadge.count({ where: { userId } }),
      this.prisma.userMission.count({ where: { userId, status: 'COMPLETED' } }),
      this.prisma.mission.count({ where: { status: 'ACTIVE' } }),
    ]);
    return projectForestQuestProfile({
      confirmedXp: confirmed._sum.amount ?? 0,
      ecoPoints: confirmedRows.reduce((sum, row) => sum + ecoPointsFor(row.eventType), 0),
      pendingEvents,
      discoveredCount,
      catalogueCount,
      awardedBadgeCount,
      activeMissionCount,
      completedMissionCount,
    });
  }

  private async createUniqueDiscovery(write: () => Promise<unknown>): Promise<boolean> {
    try {
      await write();
      return true;
    } catch (error) {
      if (isUniqueConflict(error)) {
        return false;
      }
      throw error;
    }
  }

  private async ensureProfile(userId: string) {
    return this.prisma.engagementProfile.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        confirmedXp: 0,
        ecoPoints: 0,
        level: 1,
        displayTitle: 'Seedling',
      },
    });
  }
}
