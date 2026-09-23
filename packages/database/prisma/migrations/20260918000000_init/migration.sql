-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "RoleCode" AS ENUM ('CITIZEN', 'VOLUNTEER', 'ORGANIZATION_MANAGER', 'FOREST_OFFICER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'UPCOMING', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "PlantationType" AS ENUM ('INDIVIDUAL_TREE', 'PLANTATION_SITE');

-- CreateEnum
CREATE TYPE "LocationVisibility" AS ENUM ('PUBLIC_EXACT', 'PUBLIC_APPROXIMATE', 'OFFICER_ONLY');

-- CreateEnum
CREATE TYPE "PlantationVerificationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MonitoringVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "HealthCondition" AS ENUM ('HEALTHY', 'FAIR', 'STRESSED', 'DAMAGED', 'PARTIALLY_DEAD', 'DEAD', 'MISSING', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "GeoProximityStatus" AS ENUM ('ON_SITE', 'NEARBY', 'REMOTE', 'LOCATION_UNAVAILABLE');

-- CreateEnum
CREATE TYPE "NativeStatus" AS ENUM ('NATIVE', 'ENDEMIC', 'INTRODUCED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ReportCategory" AS ENUM ('DEAD_TREES', 'DAMAGED_TREES', 'FIRE_DAMAGE', 'ILLEGAL_CUTTING', 'MISSING_TREES', 'WATER_SHORTAGE', 'PEST_DISEASE', 'INCORRECT_INFORMATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VerificationSubjectType" AS ENUM ('PLANTATION', 'MONITORING', 'REPORT');

-- CreateEnum
CREATE TYPE "VerificationDecision" AS ENUM ('VERIFIED', 'REJECTED', 'REQUEST_CORRECTION');

-- CreateEnum
CREATE TYPE "XpTransactionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REVOKED');

-- CreateEnum
CREATE TYPE "MissionType" AS ENUM ('DAILY', 'WEEKLY', 'CAMPAIGN', 'LOCATION', 'SPECIES', 'COMMUNITY', 'STEWARDSHIP', 'RESCUE');

-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UserMissionStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('SCHOOL', 'UNIVERSITY', 'NGO', 'GOVERNMENT', 'PRIVATE', 'COMMUNITY');

-- CreateEnum
CREATE TYPE "StorageProviderName" AS ENUM ('local', 'supabase', 's3');

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "code" "RoleCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "type" "OrganizationType" NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "officer_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provinceCode" TEXT,
    "districtCode" TEXT,
    "dsdCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "officer_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "bannerImageKey" TEXT,
    "organizerId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "targetTrees" INTEGER,
    "targetAreaHectares" DECIMAL(12,4),
    "eligibleLocations" JSONB,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "species" (
    "id" TEXT NOT NULL,
    "commonEnglishName" TEXT NOT NULL,
    "sinhalaName" TEXT NOT NULL,
    "tamilName" TEXT NOT NULL,
    "scientificName" TEXT NOT NULL,
    "nativeStatus" "NativeStatus" NOT NULL DEFAULT 'UNKNOWN',
    "description" TEXT NOT NULL,
    "imageKey" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantations" (
    "id" TEXT NOT NULL,
    "clientUuid" TEXT,
    "campaignId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "PlantationType" NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "geom" geometry(Geometry, 4326),
    "provinceCode" TEXT,
    "districtCode" TEXT,
    "dsdCode" TEXT,
    "gndCode" TEXT,
    "plantingDate" TIMESTAMP(3) NOT NULL,
    "treeCount" INTEGER NOT NULL,
    "areaHectares" DECIMAL(12,4),
    "organizationId" TEXT,
    "createdById" TEXT NOT NULL,
    "verificationStatus" "PlantationVerificationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "locationVisibility" "LocationVisibility" NOT NULL DEFAULT 'PUBLIC_APPROXIMATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantation_species" (
    "plantationId" TEXT NOT NULL,
    "speciesId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "plantation_species_pkey" PRIMARY KEY ("plantationId","speciesId")
);

-- CreateTable
CREATE TABLE "plantation_images" (
    "id" TEXT NOT NULL,
    "plantationId" TEXT NOT NULL,
    "provider" "StorageProviderName" NOT NULL,
    "objectKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plantation_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring_updates" (
    "id" TEXT NOT NULL,
    "clientUuid" TEXT,
    "plantationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "gpsAccuracyMeters" DECIMAL(8,2),
    "distanceFromPlantation" DECIMAL(12,2),
    "locationValidation" "GeoProximityStatus" NOT NULL DEFAULT 'LOCATION_UNAVAILABLE',
    "healthStatus" "HealthCondition" NOT NULL,
    "estimatedSurvivingTrees" INTEGER,
    "estimatedDeadTrees" INTEGER,
    "estimatedHeightCm" DECIMAL(8,2),
    "observation" TEXT NOT NULL,
    "verificationStatus" "MonitoringVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monitoring_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring_images" (
    "id" TEXT NOT NULL,
    "updateId" TEXT NOT NULL,
    "provider" "StorageProviderName" NOT NULL,
    "objectKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monitoring_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "officer_inspections" (
    "id" TEXT NOT NULL,
    "plantationId" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "inspectedAt" TIMESTAMP(3) NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "gpsAccuracyMeters" DECIMAL(8,2),
    "estimatedTreeCount" INTEGER,
    "estimatedSurvivalPct" DECIMAL(5,2),
    "condition" "HealthCondition" NOT NULL,
    "notes" TEXT NOT NULL,
    "recommendedAction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "officer_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_images" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "provider" "StorageProviderName" NOT NULL,
    "objectKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "plantationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_reactions" (
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'HELPFUL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_reactions_pkey" PRIMARY KEY ("commentId","userId","type")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "clientUuid" TEXT,
    "plantationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "ReportCategory" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_images" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "provider" "StorageProviderName" NOT NULL,
    "objectKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "subjectType" "VerificationSubjectType" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "decision" "VerificationDecision" NOT NULL,
    "actorId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "payload" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("userId","type")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engagement_profiles" (
    "userId" TEXT NOT NULL,
    "confirmedXp" INTEGER NOT NULL DEFAULT 0,
    "ecoPoints" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "displayTitle" TEXT NOT NULL DEFAULT 'Seedling',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engagement_profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "engagement_reward_rules" (
    "eventType" TEXT NOT NULL,
    "xpAmount" INTEGER NOT NULL,
    "ecoPoints" INTEGER NOT NULL DEFAULT 0,
    "requiresVerification" BOOLEAN NOT NULL DEFAULT true,
    "cooldownHours" INTEGER,
    "dailyCap" INTEGER,

    CONSTRAINT "engagement_reward_rules_pkey" PRIMARY KEY ("eventType")
);

-- CreateTable
CREATE TABLE "xp_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "XpTransactionStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rule" JSONB NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("userId","badgeId")
);

-- CreateTable
CREATE TABLE "missions" (
    "id" TEXT NOT NULL,
    "type" "MissionType" NOT NULL,
    "status" "MissionStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "campaignId" TEXT,
    "rule" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_tasks" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "rule" JSONB NOT NULL,

    CONSTRAINT "mission_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_missions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "status" "UserMissionStatus" NOT NULL DEFAULT 'ASSIGNED',
    "progress" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "species_discoveries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "speciesId" TEXT NOT NULL,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "plantationId" TEXT,

    CONSTRAINT "species_discoveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantation_discoveries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plantationId" TEXT NOT NULL,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plantation_discoveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantation_guardians" (
    "userId" TEXT NOT NULL,
    "plantationId" TEXT NOT NULL,
    "followedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plantation_guardians_pkey" PRIMARY KEY ("userId","plantationId")
);

-- CreateTable
CREATE TABLE "stewardship_streaks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plantationId" TEXT,
    "months" INTEGER NOT NULL,
    "lastVerifiedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stewardship_streaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_challenges" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "goal" INTEGER NOT NULL,
    "campaignId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_progress" (
    "challengeId" TEXT NOT NULL,
    "participantKey" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_progress_pkey" PRIMARY KEY ("challengeId","participantKey")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE INDEX "user_roles_roleId_idx" ON "user_roles"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refreshTokenHash_key" ON "sessions"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_createdById_idx" ON "organizations"("createdById");

-- CreateIndex
CREATE INDEX "officer_assignments_userId_idx" ON "officer_assignments"("userId");

-- CreateIndex
CREATE INDEX "officer_assignments_districtCode_idx" ON "officer_assignments"("districtCode");

-- CreateIndex
CREATE INDEX "officer_assignments_dsdCode_idx" ON "officer_assignments"("dsdCode");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_slug_key" ON "campaigns"("slug");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE INDEX "campaigns_organizerId_idx" ON "campaigns"("organizerId");

-- CreateIndex
CREATE INDEX "campaigns_createdById_idx" ON "campaigns"("createdById");

-- CreateIndex
CREATE INDEX "campaigns_createdAt_idx" ON "campaigns"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "species_scientificName_key" ON "species"("scientificName");

-- CreateIndex
CREATE INDEX "species_active_idx" ON "species"("active");

-- CreateIndex
CREATE UNIQUE INDEX "plantations_clientUuid_key" ON "plantations"("clientUuid");

-- CreateIndex
CREATE INDEX "plantations_campaignId_idx" ON "plantations"("campaignId");

-- CreateIndex
CREATE INDEX "plantations_districtCode_idx" ON "plantations"("districtCode");

-- CreateIndex
CREATE INDEX "plantations_dsdCode_idx" ON "plantations"("dsdCode");

-- CreateIndex
CREATE INDEX "plantations_gndCode_idx" ON "plantations"("gndCode");

-- CreateIndex
CREATE INDEX "plantations_verificationStatus_idx" ON "plantations"("verificationStatus");

-- CreateIndex
CREATE INDEX "plantations_organizationId_idx" ON "plantations"("organizationId");

-- CreateIndex
CREATE INDEX "plantations_createdById_idx" ON "plantations"("createdById");

-- CreateIndex
CREATE INDEX "plantations_createdAt_idx" ON "plantations"("createdAt");

-- Spatial index for viewport, nearby, and containment queries
CREATE INDEX "plantations_geom_gix" ON "plantations" USING GIST ("geom");

-- CreateIndex
CREATE INDEX "plantation_species_speciesId_idx" ON "plantation_species"("speciesId");

-- CreateIndex
CREATE INDEX "plantation_images_plantationId_idx" ON "plantation_images"("plantationId");

-- CreateIndex
CREATE UNIQUE INDEX "monitoring_updates_clientUuid_key" ON "monitoring_updates"("clientUuid");

-- CreateIndex
CREATE INDEX "monitoring_updates_plantationId_idx" ON "monitoring_updates"("plantationId");

-- CreateIndex
CREATE INDEX "monitoring_updates_userId_idx" ON "monitoring_updates"("userId");

-- CreateIndex
CREATE INDEX "monitoring_updates_verificationStatus_idx" ON "monitoring_updates"("verificationStatus");

-- CreateIndex
CREATE INDEX "monitoring_updates_createdAt_idx" ON "monitoring_updates"("createdAt");

-- CreateIndex
CREATE INDEX "monitoring_images_updateId_idx" ON "monitoring_images"("updateId");

-- CreateIndex
CREATE INDEX "officer_inspections_plantationId_idx" ON "officer_inspections"("plantationId");

-- CreateIndex
CREATE INDEX "officer_inspections_officerId_idx" ON "officer_inspections"("officerId");

-- CreateIndex
CREATE INDEX "officer_inspections_inspectedAt_idx" ON "officer_inspections"("inspectedAt");

-- CreateIndex
CREATE INDEX "inspection_images_inspectionId_idx" ON "inspection_images"("inspectionId");

-- CreateIndex
CREATE INDEX "comments_plantationId_idx" ON "comments"("plantationId");

-- CreateIndex
CREATE INDEX "comments_userId_idx" ON "comments"("userId");

-- CreateIndex
CREATE INDEX "comments_parentId_idx" ON "comments"("parentId");

-- CreateIndex
CREATE INDEX "comments_createdAt_idx" ON "comments"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "reports_clientUuid_key" ON "reports"("clientUuid");

-- CreateIndex
CREATE INDEX "reports_plantationId_idx" ON "reports"("plantationId");

-- CreateIndex
CREATE INDEX "reports_userId_idx" ON "reports"("userId");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_createdAt_idx" ON "reports"("createdAt");

-- CreateIndex
CREATE INDEX "report_images_reportId_idx" ON "report_images"("reportId");

-- CreateIndex
CREATE INDEX "verifications_subjectType_subjectId_idx" ON "verifications"("subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "verifications_actorId_idx" ON "verifications"("actorId");

-- CreateIndex
CREATE INDEX "verifications_createdAt_idx" ON "verifications"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "xp_transactions_userId_status_idx" ON "xp_transactions"("userId", "status");

-- CreateIndex
CREATE INDEX "xp_transactions_createdAt_idx" ON "xp_transactions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "xp_transactions_userId_eventType_eventId_key" ON "xp_transactions"("userId", "eventType", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "badges_slug_key" ON "badges"("slug");

-- CreateIndex
CREATE INDEX "missions_type_status_idx" ON "missions"("type", "status");

-- CreateIndex
CREATE INDEX "missions_campaignId_idx" ON "missions"("campaignId");

-- CreateIndex
CREATE INDEX "mission_tasks_missionId_idx" ON "mission_tasks"("missionId");

-- CreateIndex
CREATE INDEX "user_missions_status_idx" ON "user_missions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "user_missions_userId_missionId_key" ON "user_missions"("userId", "missionId");

-- CreateIndex
CREATE UNIQUE INDEX "species_discoveries_userId_speciesId_key" ON "species_discoveries"("userId", "speciesId");

-- CreateIndex
CREATE UNIQUE INDEX "plantation_discoveries_userId_plantationId_key" ON "plantation_discoveries"("userId", "plantationId");

-- CreateIndex
CREATE INDEX "stewardship_streaks_userId_idx" ON "stewardship_streaks"("userId");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officer_assignments" ADD CONSTRAINT "officer_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantations" ADD CONSTRAINT "plantations_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantations" ADD CONSTRAINT "plantations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantations" ADD CONSTRAINT "plantations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantation_species" ADD CONSTRAINT "plantation_species_plantationId_fkey" FOREIGN KEY ("plantationId") REFERENCES "plantations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantation_species" ADD CONSTRAINT "plantation_species_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantation_images" ADD CONSTRAINT "plantation_images_plantationId_fkey" FOREIGN KEY ("plantationId") REFERENCES "plantations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantation_images" ADD CONSTRAINT "plantation_images_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_updates" ADD CONSTRAINT "monitoring_updates_plantationId_fkey" FOREIGN KEY ("plantationId") REFERENCES "plantations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_updates" ADD CONSTRAINT "monitoring_updates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_images" ADD CONSTRAINT "monitoring_images_updateId_fkey" FOREIGN KEY ("updateId") REFERENCES "monitoring_updates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_images" ADD CONSTRAINT "monitoring_images_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officer_inspections" ADD CONSTRAINT "officer_inspections_plantationId_fkey" FOREIGN KEY ("plantationId") REFERENCES "plantations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officer_inspections" ADD CONSTRAINT "officer_inspections_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_images" ADD CONSTRAINT "inspection_images_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "officer_inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_plantationId_fkey" FOREIGN KEY ("plantationId") REFERENCES "plantations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_plantationId_fkey" FOREIGN KEY ("plantationId") REFERENCES "plantations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_images" ADD CONSTRAINT "report_images_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_images" ADD CONSTRAINT "report_images_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_profiles" ADD CONSTRAINT "engagement_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_tasks" ADD CONSTRAINT "mission_tasks_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_missions" ADD CONSTRAINT "user_missions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_missions" ADD CONSTRAINT "user_missions_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "species_discoveries" ADD CONSTRAINT "species_discoveries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "species_discoveries" ADD CONSTRAINT "species_discoveries_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantation_discoveries" ADD CONSTRAINT "plantation_discoveries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantation_discoveries" ADD CONSTRAINT "plantation_discoveries_plantationId_fkey" FOREIGN KEY ("plantationId") REFERENCES "plantations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantation_guardians" ADD CONSTRAINT "plantation_guardians_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantation_guardians" ADD CONSTRAINT "plantation_guardians_plantationId_fkey" FOREIGN KEY ("plantationId") REFERENCES "plantations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stewardship_streaks" ADD CONSTRAINT "stewardship_streaks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_challenges" ADD CONSTRAINT "community_challenges_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_progress" ADD CONSTRAINT "challenge_progress_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "community_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

