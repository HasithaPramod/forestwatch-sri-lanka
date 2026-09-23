import 'dotenv/config';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { hash } from 'argon2';
import { PrismaClient, RoleCode } from '@prisma/client';
import { setPlantationPoint } from '../src/spatial';

loadEnv({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

const DEV_PASSWORD = process.env.DEV_SEED_PASSWORD ?? 'ForestWatch!dev';

async function passwordHash(): Promise<string> {
  return hash(DEV_PASSWORD);
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed the production database.');
  }

  const hashValue = await passwordHash();

  const roleRows = await Promise.all(
    (
      [
        ['CITIZEN', 'Citizen'],
        ['VOLUNTEER', 'Volunteer'],
        ['ORGANIZATION_MANAGER', 'Organization manager'],
        ['FOREST_OFFICER', 'Forest officer'],
        ['ADMIN', 'Admin'],
        ['SUPER_ADMIN', 'Super admin'],
      ] as const
    ).map(([code, name]) =>
      prisma.role.upsert({
        where: { code: code as RoleCode },
        update: { name },
        create: { code: code as RoleCode, name },
      }),
    ),
  );

  const roleByCode = Object.fromEntries(roleRows.map((role) => [role.code, role.id]));

  const accounts = [
    { email: 'superadmin@localhost', displayName: 'Super Admin', role: 'SUPER_ADMIN' as const },
    { email: 'admin@localhost', displayName: 'Admin', role: 'ADMIN' as const },
    { email: 'officer@localhost', displayName: 'Forest Officer', role: 'FOREST_OFFICER' as const },
    { email: 'citizen@localhost', displayName: 'Citizen', role: 'CITIZEN' as const },
    { email: 'volunteer@localhost', displayName: 'Volunteer', role: 'VOLUNTEER' as const },
    { email: 'org@localhost', displayName: 'Organization Manager', role: 'ORGANIZATION_MANAGER' as const },
  ];

  const users = [];
  for (const account of accounts) {
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: { displayName: account.displayName, passwordHash: hashValue },
      create: {
        email: account.email,
        displayName: account.displayName,
        passwordHash: hashValue,
        emailVerifiedAt: new Date(),
      },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: roleByCode[account.role] ?? '' } },
      update: {},
      create: { userId: user.id, roleId: roleByCode[account.role] ?? '' },
    });
    users.push(user);
  }

  const officer = users.find((user) => user.email === 'officer@localhost');
  const citizen = users.find((user) => user.email === 'citizen@localhost');
  const orgManager = users.find((user) => user.email === 'org@localhost');
  if (!officer || !citizen || !orgManager) {
    throw new Error('Seed users were not created.');
  }

  await prisma.officerAssignment.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: { userId: officer.id, provinceCode: 'LK-3', districtCode: 'LK-33' },
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      userId: officer.id,
      provinceCode: 'LK-3',
      districtCode: 'LK-33',
    },
  });

  const organization = await prisma.organization.upsert({
    where: { slug: 'bundala-restoration-trust' },
    update: {},
    create: {
      name: 'Bundala Restoration Trust',
      slug: 'bundala-restoration-trust',
      description: 'Community restoration partner for dry-zone planting.',
      type: 'NGO',
      approved: true,
      createdById: orgManager.id,
    },
  });

  const campaign = await prisma.campaign.upsert({
    where: { slug: 'bundala-restoration-2026' },
    update: {},
    create: {
      name: 'Bundala Restoration 2026',
      slug: 'bundala-restoration-2026',
      description: 'Dry-zone restoration with community monitoring.',
      organizerId: organization.id,
      startDate: new Date('2026-01-15T00:00:00.000Z'),
      endDate: new Date('2026-12-31T00:00:00.000Z'),
      targetTrees: 5000,
      targetAreaHectares: 12,
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      createdById: orgManager.id,
    },
  });

  const speciesSeed = [
    {
      scientificName: 'Terminalia arjuna',
      commonEnglishName: 'Kumbuk',
      sinhalaName: 'කුඹුක්',
      tamilName: 'மருதமரம்',
      nativeStatus: 'NATIVE' as const,
      description: 'Riparian native used widely in dry-zone restoration.',
    },
    {
      scientificName: 'Manilkara hexandra',
      commonEnglishName: 'Palu',
      sinhalaName: 'පලු',
      tamilName: 'உலக்கைப்பாலை',
      nativeStatus: 'NATIVE' as const,
      description: 'Hardy dry-zone canopy species.',
    },
    {
      scientificName: 'Drypetes sepiaria',
      commonEnglishName: 'Weera',
      sinhalaName: 'වීර',
      tamilName: 'வீரை',
      nativeStatus: 'NATIVE' as const,
      description: 'Native dry-forest tree common in southern Sri Lanka.',
    },
    {
      scientificName: 'Mesua ferrea',
      commonEnglishName: 'Na',
      sinhalaName: 'නා',
      tamilName: 'நாகம்',
      nativeStatus: 'NATIVE' as const,
      description: 'Ceylon ironwood. National tree of Sri Lanka.',
    },
    {
      scientificName: 'Madhuca longifolia',
      commonEnglishName: 'Mee',
      sinhalaName: 'මී',
      tamilName: 'இலுப்பை',
      nativeStatus: 'NATIVE' as const,
      description: 'Native oil tree often planted in village forests.',
    },
    {
      scientificName: 'Diospyros ebenum',
      commonEnglishName: 'Ebony',
      sinhalaName: 'කළුවර',
      tamilName: 'கருங்காலி',
      nativeStatus: 'NATIVE' as const,
      description: 'Slow-growing native ebony. Sensitive sites may hide exact coordinates.',
    },
  ];

  const species = [];
  for (const row of speciesSeed) {
    species.push(
      await prisma.species.upsert({
        where: { scientificName: row.scientificName },
        update: row,
        create: row,
      }),
    );
  }

  const plantation = await prisma.plantation.upsert({
    where: { clientUuid: '11111111-1111-4111-8111-111111111111' },
    update: {
      dsdCode: '3-3-09',
      gndCode: '3-3-09-150',
    },
    create: {
      clientUuid: '11111111-1111-4111-8111-111111111111',
      campaignId: campaign.id,
      name: 'Bundala Restoration Site 04',
      description: 'Mixed dry-zone planting. Seed record only.',
      type: 'PLANTATION_SITE',
      latitude: 6.1964,
      longitude: 81.2203,
      provinceCode: 'LK-3',
      districtCode: 'LK-33',
      dsdCode: '3-3-09',
      gndCode: '3-3-09-150',
      plantingDate: new Date('2026-03-12T00:00:00.000Z'),
      treeCount: 1250,
      areaHectares: 2.4,
      organizationId: organization.id,
      createdById: citizen.id,
      verificationStatus: 'VERIFIED',
      locationVisibility: 'PUBLIC_EXACT',
    },
  });

  await setPlantationPoint(prisma, plantation.id, 81.2203, 6.1964);

  const kumbuk = species.find((item) => item.scientificName === 'Terminalia arjuna');
  const palu = species.find((item) => item.scientificName === 'Manilkara hexandra');
  const weera = species.find((item) => item.scientificName === 'Drypetes sepiaria');
  if (kumbuk && palu && weera) {
    await prisma.plantationSpecies.createMany({
      data: [
        { plantationId: plantation.id, speciesId: kumbuk.id, quantity: 600 },
        { plantationId: plantation.id, speciesId: palu.id, quantity: 400 },
        { plantationId: plantation.id, speciesId: weera.id, quantity: 250 },
      ],
      skipDuplicates: true,
    });
  }

  const existingMonitoring = await prisma.monitoringUpdate.findFirst({
    where: { plantationId: plantation.id, userId: citizen.id, verificationStatus: 'VERIFIED' },
  });
  let verifiedUpdate = existingMonitoring;
  if (!verifiedUpdate) {
    verifiedUpdate = await prisma.monitoringUpdate.create({
      data: {
        plantationId: plantation.id,
        userId: citizen.id,
        observedAt: new Date('2026-06-12T00:00:00.000Z'),
        latitude: 6.1965,
        longitude: 81.2204,
        gpsAccuracyMeters: 8,
        distanceFromPlantation: 18,
        locationValidation: 'ON_SITE',
        healthStatus: 'HEALTHY',
        estimatedSurvivingTrees: 1180,
        estimatedDeadTrees: 70,
        observation: 'Canopy establishing. Some edge mortality after dry spell.',
        verificationStatus: 'VERIFIED',
      },
    });
  }

  const existingMonitoringVerification = await prisma.verification.findFirst({
    where: { subjectType: 'MONITORING', subjectId: verifiedUpdate.id },
  });
  if (!existingMonitoringVerification) {
    await prisma.verification.create({
      data: {
        subjectType: 'MONITORING',
        subjectId: verifiedUpdate.id,
        decision: 'VERIFIED',
        actorId: officer.id,
        notes: 'On-site photographs match the June community visit.',
      },
    });
  }

  const existingVerification = await prisma.verification.findFirst({
    where: { subjectType: 'PLANTATION', subjectId: plantation.id },
  });
  if (!existingVerification) {
    await prisma.verification.create({
      data: {
        subjectType: 'PLANTATION',
        subjectId: plantation.id,
        decision: 'VERIFIED',
        actorId: officer.id,
        notes: 'Site matches submitted polygon centroid.',
      },
    });
  }

  const comment = await prisma.comment.findFirst({
    where: { plantationId: plantation.id, userId: citizen.id },
  });
  if (!comment) {
    await prisma.comment.create({
      data: {
        plantationId: plantation.id,
        userId: citizen.id,
        body: 'Visited during the June community monitoring day.',
      },
    });
  }

  await prisma.engagementRewardRule.createMany({
    data: [
      { eventType: 'PLANTATION_DISCOVERED', xpAmount: 50, ecoPoints: 5, requiresVerification: false },
      { eventType: 'SPECIES_DISCOVERED', xpAmount: 75, ecoPoints: 8, requiresVerification: true },
      { eventType: 'MONITORING_VERIFIED', xpAmount: 100, ecoPoints: 10, requiresVerification: true },
      { eventType: 'REPORT_VERIFIED', xpAmount: 150, ecoPoints: 15, requiresVerification: true },
      { eventType: 'STEWARD_REVISIT_VERIFIED', xpAmount: 200, ecoPoints: 20, requiresVerification: true },
    ],
    skipDuplicates: true,
  });

  await prisma.systemSetting.upsert({
    where: { key: 'geo_proximity_meters' },
    update: { value: { onSiteMax: 100, nearbyMax: 500 } },
    create: { key: 'geo_proximity_meters', value: { onSiteMax: 100, nearbyMax: 500 } },
  });

  const badges = [
    { slug: 'first-plant', name: 'First Plant', description: 'Registered a plantation.', rule: { type: 'first-plant' } },
    { slug: 'first-discovery', name: 'First Discovery', description: 'Discovered a plantation on site.', rule: { type: 'first-discovery' } },
    {
      slug: 'first-verified-observation',
      name: 'First Verified Observation',
      description: 'A monitoring update was verified.',
      rule: { type: 'first-verified-observation' },
    },
    { slug: 'ten-species', name: '10 Species', description: 'Discovered 10 catalogue species on site.', rule: { type: 'species-count', min: 10 } },
    {
      slug: 'twenty-five-species',
      name: '25 Species',
      description: 'Discovered 25 catalogue species on site.',
      rule: { type: 'species-count', min: 25 },
    },
  ];
  for (const badge of badges) {
    const { rule, ...fields } = badge;
    await prisma.badge.upsert({
      where: { slug: badge.slug },
      update: { ...fields, rule },
      create: { ...fields, rule },
    });
  }

  const mission = await prisma.mission.upsert({
    where: { id: '22222222-2222-4222-8222-222222222222' },
    update: {},
    create: {
      id: '22222222-2222-4222-8222-222222222222',
      type: 'STEWARDSHIP',
      status: 'ACTIVE',
      title: 'Visit one nearby plantation',
      description: 'Submit one valid on-site monitoring observation.',
      campaignId: campaign.id,
      rule: { requireOnSite: true },
    },
  });

  await prisma.missionTask.upsert({
    where: { id: '33333333-3333-4333-8333-333333333333' },
    update: {},
    create: {
      id: '33333333-3333-4333-8333-333333333333',
      missionId: mission.id,
      title: 'Submit a verified monitoring update',
      sortOrder: 1,
      rule: { eventType: 'MONITORING_VERIFIED' },
    },
  });

  await prisma.communityChallenge.upsert({
    where: { id: '44444444-4444-4444-8444-444444444444' },
    update: {},
    create: {
      id: '44444444-4444-4444-8444-444444444444',
      name: 'Hambantota Monitoring Challenge',
      description: 'Community monitoring of restoration sites in Hambantota district.',
      scope: 'DISTRICT:LK-33',
      goal: 500,
      campaignId: campaign.id,
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-31T00:00:00.000Z'),
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'DATABASE_SEEDED',
      actorId: users[0]?.id,
      entityType: 'system',
      entityId: 'phase-2',
      metadata: { environment: 'development' },
    },
  });

  console.log('ForestWatch development seed complete.');
  console.log('Dev accounts use DEV_SEED_PASSWORD (default ForestWatch!dev). Never use these in production.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
