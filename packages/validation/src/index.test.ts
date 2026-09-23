import { describe, expect, it } from 'vitest';
import {
  bboxQuerySchema,
  createCampaignBodySchema,
  createCommentBodySchema,
  createInspectionBodySchema,
  createMonitoringBodySchema,
  notificationsQuerySchema,
  registerPushDeviceBodySchema,
  searchQuerySchema,
  createSpeciesBodySchema,
  createPlantationBodySchema,
  createReportBodySchema,
  createVerificationBodySchema,
  gndsQuerySchema,
  loginBodySchema,
  nearbyPlantationsQuerySchema,
  paginationQuerySchema,
  passwordSchema,
  registerBodySchema,
  updateCampaignBodySchema,
  updateMeBodySchema,
} from './index';

describe('paginationQuerySchema', () => {
  it('applies defaults and rejects oversized limits', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(() => paginationQuerySchema.parse({ limit: 1000 })).toThrow();
  });
});

describe('bboxQuerySchema', () => {
  it('accepts a viewport string', () => {
    expect(bboxQuerySchema.parse('79.8,5.9,81.9,9.9')).toEqual({
      west: 79.8,
      south: 5.9,
      east: 81.9,
      north: 9.9,
    });
  });

  it('rejects an inverted viewport', () => {
    expect(() => bboxQuerySchema.parse('81.9,5.9,79.8,9.9')).toThrow();
  });
});

describe('nearbyPlantationsQuerySchema', () => {
  it('defaults radius and cap rather than accepting an unbounded search', () => {
    expect(nearbyPlantationsQuerySchema.parse({ lat: 6.1964, lng: 81.2203 })).toMatchObject({
      radiusMeters: 5000,
      limit: 200,
    });
    expect(() => nearbyPlantationsQuerySchema.parse({ lat: 6.1964, lng: 81.2203, radiusMeters: 5_000_000 })).toThrow();
  });
});

describe('auth schemas', () => {
  it('rejects a short password', () => {
    expect(() => passwordSchema.parse('short')).toThrow();
  });

  it('accepts a citizen registration payload', () => {
    expect(
      registerBodySchema.parse({
        email: 'Citizen@Example.com',
        password: 'ForestWatch1',
        displayName: 'Amal',
      }),
    ).toMatchObject({ email: 'citizen@example.com', locale: 'en' });
  });

  it('defaults login to the mobile token channel', () => {
    expect(
      loginBodySchema.parse({ email: 'citizen@localhost', password: 'ForestWatch!dev' }),
    ).toMatchObject({ clientChannel: 'mobile' });
  });

  it('accepts only English, Sinhala, or Tamil locales', () => {
    expect(registerBodySchema.parse({
      email: 'citizen@localhost',
      password: 'ForestWatch1',
      displayName: 'Amal',
      locale: 'si',
    }).locale).toBe('si');
    expect(() =>
      registerBodySchema.parse({
        email: 'citizen@localhost',
        password: 'ForestWatch1',
        displayName: 'Amal',
        locale: 'fr',
      }),
    ).toThrow();
    expect(updateMeBodySchema.parse({ locale: 'ta' })).toEqual({ locale: 'ta' });
  });
});

describe('location schemas', () => {
  it('requires a DSD code before listing GNDs', () => {
    expect(() => gndsQuerySchema.parse({})).toThrow();
    expect(gndsQuerySchema.parse({ dsdCode: '3-3-09' })).toMatchObject({ page: 1, limit: 20 });
  });
});

describe('campaign schemas', () => {
  it('defaults a create payload to draft and public', () => {
    expect(
      createCampaignBodySchema.parse({
        name: 'Bundala Restoration 2026',
        description: 'Dry-zone restoration with community monitoring.',
        startDate: '2026-01-15',
      }),
    ).toMatchObject({ status: 'DRAFT', visibility: 'PUBLIC' });
  });

  it('rejects an end date before the start date', () => {
    expect(() =>
      createCampaignBodySchema.parse({
        name: 'Bundala Restoration 2026',
        description: 'Dry-zone restoration with community monitoring.',
        startDate: '2026-12-31',
        endDate: '2026-01-01',
      }),
    ).toThrow();
  });

  it('requires at least one field on update', () => {
    expect(() => updateCampaignBodySchema.parse({})).toThrow();
  });
});

describe('species schemas', () => {
  it('defaults a create payload to unknown native status and active', () => {
    expect(
      createSpeciesBodySchema.parse({
        scientificName: 'Terminalia arjuna',
        commonEnglishName: 'Kumbuk',
        sinhalaName: 'කුඹුක්',
        tamilName: 'மருதமரம்',
        description: 'Riparian native used widely in dry-zone restoration.',
      }),
    ).toMatchObject({ nativeStatus: 'UNKNOWN', active: true });
  });
});

describe('monitoring schemas', () => {
  it('rejects client-calculated distance fields', () => {
    expect(() =>
      createMonitoringBodySchema.parse({
        healthStatus: 'HEALTHY',
        observation: 'Canopy establishing.',
        distanceFromPlantation: 12,
        locationValidation: 'ON_SITE',
      }),
    ).toThrow();
  });

  it('requires latitude and longitude together', () => {
    expect(() =>
      createMonitoringBodySchema.parse({
        healthStatus: 'FAIR',
        observation: 'Some edge mortality.',
        latitude: 6.1964,
      }),
    ).toThrow();
  });

  it('accepts an observation without GPS', () => {
    expect(
      createMonitoringBodySchema.parse({
        healthStatus: 'HEALTHY',
        observation: 'Canopy establishing after the dry spell.',
      }),
    ).toMatchObject({ healthStatus: 'HEALTHY' });
  });
});

describe('comment schemas', () => {
  it('rejects an empty body', () => {
    expect(() => createCommentBodySchema.parse({ body: '   ' })).toThrow();
  });

  it('accepts a reply parent id', () => {
    expect(
      createCommentBodySchema.parse({
        body: 'Visited during the June community monitoring day.',
        parentId: '11111111-1111-4111-8111-111111111111',
      }),
    ).toMatchObject({ parentId: '11111111-1111-4111-8111-111111111111' });
  });
});

describe('verification schemas', () => {
  it('rejects REPORT as a verification subject because reports use the issue workflow', () => {
    expect(() =>
      createVerificationBodySchema.parse({
        subjectType: 'REPORT',
        subjectId: '11111111-1111-4111-8111-111111111111',
        decision: 'VERIFIED',
      }),
    ).toThrow();
  });

  it('requires a decision from the history enum', () => {
    expect(
      createVerificationBodySchema.parse({
        subjectType: 'MONITORING',
        subjectId: '11111111-1111-4111-8111-111111111111',
        decision: 'VERIFIED',
        notes: 'On-site canopy matches the photograph.',
      }),
    ).toMatchObject({ decision: 'VERIFIED' });
  });
});

describe('report schemas', () => {
  it('rejects a status on create so the workflow starts as OPEN', () => {
    expect(() =>
      createReportBodySchema.parse({
        category: 'ILLEGAL_CUTTING',
        description: 'Stumps visible along the bund.',
        status: 'RESOLVED',
      }),
    ).toThrow();
  });

  it('requires a description', () => {
    expect(() => createReportBodySchema.parse({ category: 'DEAD_TREES', description: 'short' })).toThrow();
  });
});

describe('inspection schemas', () => {
  it('accepts a client UUID so offline retries can upsert', () => {
    expect(
      createInspectionBodySchema.parse({
        clientUuid: '11111111-1111-4111-8111-111111111111',
        condition: 'FAIR',
        notes: 'Official inspection after the dry spell along the bund.',
      }),
    ).toMatchObject({ clientUuid: '11111111-1111-4111-8111-111111111111' });
  });
});

describe('notification schemas', () => {
  it('coerces unread query flags without inventing a true default', () => {
    expect(notificationsQuerySchema.parse({})).toMatchObject({ unread: false });
    expect(notificationsQuerySchema.parse({ unread: '1' })).toMatchObject({ unread: true });
  });

  it('accepts a local device token without treating registration as delivery', () => {
    expect(
      registerPushDeviceBodySchema.parse({
        token: 'local-dev-token-01',
        platform: 'android',
      }),
    ).toEqual({ token: 'local-dev-token-01', platform: 'android' });
  });
});

describe('search schemas', () => {
  it('rejects one-character queries so search cannot dump a catalogue', () => {
    expect(() => searchQuerySchema.parse({ q: 'H' })).toThrow();
    expect(searchQuerySchema.parse({ q: 'Ha' })).toMatchObject({ q: 'Ha', page: 1 });
  });
});

describe('plantation schemas', () => {
  it('rejects species quantities that do not sum to treeCount', () => {
    expect(() =>
      createPlantationBodySchema.parse({
        name: 'Bundala Restoration Site 04',
        type: 'PLANTATION_SITE',
        latitude: 6.1964,
        longitude: 81.2203,
        provinceCode: 'LK-3',
        districtCode: 'LK-33',
        plantingDate: '2026-03-12',
        treeCount: 1250,
        species: [{ speciesId: '11111111-1111-4111-8111-111111111111', quantity: 10 }],
      }),
    ).toThrow();
  });
});
