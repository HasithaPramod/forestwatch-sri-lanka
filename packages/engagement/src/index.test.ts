import { FORESTQUEST_LEVEL_TITLES } from '@forestwatch/config';
import { describe, expect, it } from 'vitest';
import {
  ENGAGEMENT_EVENT_TYPES,
  canRecordForestQuestDiscovery,
  fieldProximityBand,
  confirmableEventTypes,
  ecoPointsFor,
  isEngagementEventType,
  ledgerStatusFor,
  levelForXp,
  parseBadgeRule,
  parseMissionTaskRule,
  projectForestQuestProfile,
  rewardRuleFor,
} from './index';

describe('engagement events', () => {
  it('uses unique event names', () => {
    expect(new Set(ENGAGEMENT_EVENT_TYPES).size).toBe(ENGAGEMENT_EVENT_TYPES.length);
  });

  it('rejects client-invented reward events', () => {
    expect(isEngagementEventType('ADD_XP')).toBe(false);
    expect(isEngagementEventType('MONITORING_VERIFIED')).toBe(true);
    expect(rewardRuleFor('ADD_XP')).toBeUndefined();
  });

  it('confirms verification outcomes and on-site discoveries, not unverified campaign completion', () => {
    expect(ledgerStatusFor('MONITORING_VERIFIED')).toBe('CONFIRMED');
    expect(ledgerStatusFor('PLANTATION_VERIFIED')).toBe('CONFIRMED');
    expect(ledgerStatusFor('PLANTATION_DISCOVERED')).toBe('CONFIRMED');
    expect(ledgerStatusFor('MONITORING_SUBMITTED')).toBe('CONFIRMED');
    expect(ledgerStatusFor('CAMPAIGN_COMPLETED')).toBe('PENDING');
    expect(confirmableEventTypes()).toContain('REPORT_VERIFIED');
    expect(confirmableEventTypes()).not.toContain('CAMPAIGN_COMPLETED');
  });

  it('reads EcoPoints from config, not from a client payload', () => {
    expect(ecoPointsFor('MONITORING_VERIFIED')).toBe(10);
    expect(ecoPointsFor('ADD_XP')).toBe(0);
  });
});

describe('ForestQuest profile projection', () => {
  it('starts at Seedling and marks rewards active once confirmation exists', () => {
    const profile = projectForestQuestProfile({
      confirmedXp: 0,
      ecoPoints: 0,
      pendingEvents: 2,
      discoveredCount: 0,
      catalogueCount: 4,
      awardedBadgeCount: 0,
      activeMissionCount: 1,
      completedMissionCount: 0,
    });
    expect(profile.displayTitle).toBe('Seedling');
    expect(profile.level).toBe(1);
    expect(profile.confirmedXp).toBe(0);
    expect(profile.pendingEvents).toBe(2);
    expect(profile.rewardsActive).toBe(true);
    expect(profile.forestDex).toEqual({ available: true, discoveredCount: 0, catalogueCount: 4 });
    expect(profile.missions).toEqual({ available: true, activeCount: 1, completedCount: 0 });
    expect(profile.badges).toEqual({ available: true, awardedCount: 0 });
  });

  it('uses config visit bands, not a copied 40 m action circle', () => {
    expect(fieldProximityBand(0)).toBe('ON_SITE');
    expect(fieldProximityBand(100)).toBe('ON_SITE');
    expect(fieldProximityBand(101)).toBe('NEARBY');
    expect(fieldProximityBand(500)).toBe('NEARBY');
    expect(fieldProximityBand(501)).toBe('REMOTE');
  });

  it('requires an on-site visit to a verified public plantation', () => {
    expect(
      canRecordForestQuestDiscovery({
        locationValidation: 'ON_SITE',
        plantationVerificationStatus: 'VERIFIED',
        locationVisibility: 'PUBLIC_EXACT',
      }),
    ).toBe(true);
    expect(
      canRecordForestQuestDiscovery({
        locationValidation: 'REMOTE',
        plantationVerificationStatus: 'VERIFIED',
        locationVisibility: 'PUBLIC_EXACT',
      }),
    ).toBe(false);
    expect(
      canRecordForestQuestDiscovery({
        locationValidation: 'ON_SITE',
        plantationVerificationStatus: 'VERIFIED',
        locationVisibility: 'OFFICER_ONLY',
      }),
    ).toBe(false);
  });

  it('does not treat pending events as confirmed XP or as Forest Ranger rank', () => {
    expect(levelForXp(0).title).toBe('Seedling');
    expect(levelForXp(2500).title).toBe('Canopy Keeper');
    expect(FORESTQUEST_LEVEL_TITLES).not.toContain('Forest Ranger');
  });

  it('reads configurable badge and mission rules without inventing awards', () => {
    expect(parseBadgeRule({ type: 'first-plant' })).toEqual({ type: 'first-plant', eventType: undefined, min: 1 });
    expect(parseBadgeRule({ type: 'species-count', min: 10 })).toMatchObject({ min: 10 });
    expect(parseBadgeRule({})).toBeNull();
    expect(parseMissionTaskRule({ eventType: 'MONITORING_VERIFIED', requireOnSite: true })).toEqual({
      eventType: 'MONITORING_VERIFIED',
      requireOnSite: true,
      min: 1,
    });
  });
});
