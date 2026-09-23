import { FORESTQUEST_LEVELS, FORESTQUEST_REWARDS, GEO_PROXIMITY_METERS } from '@forestwatch/config';
import type { ForestQuestProfile } from '@forestwatch/types';

export const ENGAGEMENT_EVENT_TYPES = [
  'PLANTATION_DISCOVERED',
  'MONITORING_SUBMITTED',
  'MONITORING_VERIFIED',
  'PLANTATION_REGISTERED',
  'PLANTATION_VERIFIED',
  'SPECIES_DISCOVERED',
  'CAMPAIGN_JOINED',
  'CAMPAIGN_COMPLETED',
  'OFFICIAL_EVENT_PARTICIPATED',
  'REPORT_VERIFIED',
  'STEWARD_REVISIT_VERIFIED',
] as const;

export type EngagementEventType = (typeof ENGAGEMENT_EVENT_TYPES)[number];

export const XP_TRANSACTION_STATUSES = ['PENDING', 'CONFIRMED', 'REVOKED'] as const;

export type XpTransactionStatus = (typeof XP_TRANSACTION_STATUSES)[number];

export type EngagementDomainEvent = {
  type: EngagementEventType;
  actorUserId: string;
  entityId: string;
  occurredAt: string;
};

export type ForestQuestLevel = {
  level: number;
  title: string;
  nextTitle: string | null;
};

export type BadgeRule = {
  type: string;
  eventType?: string;
  min: number;
};

export type MissionTaskRule = {
  eventType?: string;
  requireOnSite: boolean;
  min: number;
};

/**
 * Clients never submit XP. The EngagementService evaluates domain events.
 */
export function isEngagementEventType(value: string): value is EngagementEventType {
  return (ENGAGEMENT_EVENT_TYPES as readonly string[]).includes(value);
}

export function rewardRuleFor(eventType: string): (typeof FORESTQUEST_REWARDS)[EngagementEventType] | undefined {
  if (!isEngagementEventType(eventType)) {
    return undefined;
  }
  return FORESTQUEST_REWARDS[eventType];
}

export function ecoPointsFor(eventType: string): number {
  return rewardRuleFor(eventType)?.ecoPoints ?? 0;
}

export function ledgerStatusFor(eventType: EngagementEventType): XpTransactionStatus {
  const rule = FORESTQUEST_REWARDS[eventType];
  if (!rule.requiresVerification) {
    return 'CONFIRMED';
  }
  if (eventType.endsWith('_VERIFIED') || eventType === 'PLANTATION_DISCOVERED' || eventType === 'SPECIES_DISCOVERED') {
    return 'CONFIRMED';
  }
  return 'PENDING';
}

export function confirmableEventTypes(): EngagementEventType[] {
  return ENGAGEMENT_EVENT_TYPES.filter((type) => ledgerStatusFor(type) === 'CONFIRMED');
}

export function levelForXp(confirmedXp: number): ForestQuestLevel {
  let current: (typeof FORESTQUEST_LEVELS)[number] | undefined;
  for (const row of FORESTQUEST_LEVELS) {
    if (confirmedXp >= row.minXp) {
      current = row;
    }
  }
  const index = FORESTQUEST_LEVELS.findIndex((row) => row.level === current?.level);
  const next = index >= 0 ? FORESTQUEST_LEVELS[index + 1] : undefined;
  return {
    level: current?.level ?? 1,
    title: current?.title ?? 'Seedling',
    nextTitle: next?.title ?? null,
  };
}

export type FieldProximityBand = 'ON_SITE' | 'NEARBY' | 'REMOTE';

/** Band from a server-computed distance. Clients never invent metres. */
export function fieldProximityBand(distanceMeters: number): FieldProximityBand {
  if (distanceMeters <= GEO_PROXIMITY_METERS.onSiteMax) {
    return 'ON_SITE';
  }
  if (distanceMeters <= GEO_PROXIMITY_METERS.nearbyMax) {
    return 'NEARBY';
  }
  return 'REMOTE';
}

export function canRecordForestQuestDiscovery(input: {
  locationValidation: string;
  plantationVerificationStatus: string;
  locationVisibility: string;
}): boolean {
  return (
    input.locationValidation === 'ON_SITE' &&
    input.plantationVerificationStatus === 'VERIFIED' &&
    input.locationVisibility !== 'OFFICER_ONLY'
  );
}

export function asRuleRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function parseBadgeRule(value: unknown): BadgeRule | null {
  const rule = asRuleRecord(value);
  if (typeof rule.type !== 'string' || rule.type.length === 0) {
    return null;
  }
  return {
    type: rule.type,
    eventType: typeof rule.eventType === 'string' ? rule.eventType : undefined,
    min: typeof rule.min === 'number' && Number.isFinite(rule.min) ? rule.min : 1,
  };
}

export function parseMissionTaskRule(value: unknown): MissionTaskRule {
  const rule = asRuleRecord(value);
  return {
    eventType: typeof rule.eventType === 'string' ? rule.eventType : undefined,
    requireOnSite: rule.requireOnSite === true,
    min: typeof rule.min === 'number' && Number.isFinite(rule.min) ? rule.min : 1,
  };
}

export function missionRequiresOnSite(value: unknown): boolean {
  return asRuleRecord(value).requireOnSite === true;
}

export function projectForestQuestProfile(input: {
  confirmedXp: number;
  ecoPoints: number;
  pendingEvents: number;
  discoveredCount: number;
  catalogueCount: number;
  awardedBadgeCount: number;
  activeMissionCount: number;
  completedMissionCount: number;
}): ForestQuestProfile {
  const level = levelForXp(input.confirmedXp);
  return {
    available: true,
    confirmedXp: input.confirmedXp,
    ecoPoints: input.ecoPoints,
    level: level.level,
    displayTitle: level.title,
    nextTitle: level.nextTitle,
    pendingEvents: input.pendingEvents,
    rewardsActive: true,
    forestDex: {
      available: true,
      discoveredCount: input.discoveredCount,
      catalogueCount: input.catalogueCount,
    },
    missions: {
      available: true,
      activeCount: input.activeMissionCount,
      completedCount: input.completedMissionCount,
    },
    badges: {
      available: true,
      awardedCount: input.awardedBadgeCount,
    },
  };
}
