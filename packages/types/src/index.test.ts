import { describe, expect, it } from 'vitest';
import {
  ACTOR_KINDS,
  APP_LOCALES,
  AUTHENTICATED_ROLES,
  NOTIFICATION_TYPES,
  OFFLINE_SYNC_STATUSES,
  SEARCH_KINDS,
  parseAppLocale,
  type ForestQuestProfile,
} from './index';

describe('locales', () => {
  it('supports English, Sinhala, and Tamil only', () => {
    expect(APP_LOCALES).toEqual(['en', 'si', 'ta']);
    expect(parseAppLocale('si')).toBe('si');
    expect(parseAppLocale('fr')).toBe('en');
  });
});

describe('roles', () => {
  it('does not persist GUEST as an authenticated role', () => {
    expect(AUTHENTICATED_ROLES).not.toContain('GUEST');
    expect(ACTOR_KINDS).toContain('GUEST');
  });
});

describe('notifications', () => {
  it('does not include ForestQuest or XP events in the core inbox types', () => {
    expect(NOTIFICATION_TYPES).not.toContain('BADGE_UNLOCKED');
    expect(NOTIFICATION_TYPES).not.toContain('XP_AWARDED');
    expect(NOTIFICATION_TYPES).toContain('PLANTATION_VERIFIED');
  });
});

describe('ForestQuest', () => {
  it('exposes confirmed XP, missions, and badges without a client add-xp field', () => {
    const profile: ForestQuestProfile = {
      available: true,
      confirmedXp: 100,
      ecoPoints: 10,
      level: 1,
      displayTitle: 'Seedling',
      nextTitle: 'Sprout',
      pendingEvents: 0,
      rewardsActive: true,
      forestDex: { available: true, discoveredCount: 0, catalogueCount: 0 },
      missions: { available: true, activeCount: 1, completedCount: 0 },
      badges: { available: true, awardedCount: 1 },
    };
    expect(profile.rewardsActive).toBe(true);
    expect(profile.displayTitle).not.toBe('Forest Ranger');
    expect(profile).not.toHaveProperty('addXp');
  });
});

describe('search', () => {
  it('covers plantations, campaigns, organizations, species, and administrative divisions', () => {
    expect(SEARCH_KINDS).toEqual([
      'plantation',
      'campaign',
      'organization',
      'species',
      'district',
      'dsd',
      'gnd',
    ]);
  });
});

describe('offline sync', () => {
  it('keeps draft, queue, and failure states without a device-side verified shortcut', () => {
    expect(OFFLINE_SYNC_STATUSES).toEqual(['LOCAL_DRAFT', 'QUEUED', 'SYNCING', 'SYNCED', 'SYNC_FAILED']);
    expect(OFFLINE_SYNC_STATUSES).not.toContain('VERIFIED');
  });
});
