# Database

Phase 2 introduced the Prisma schema and PostGIS geometry. Phase 7 exposes plantation CRUD. Phase 8 writes image metadata to `plantation_images`, `species.imageKey`, and `campaigns.bannerImageKey` — never the binary.

## Engine

- PostgreSQL 16 with PostGIS 3
- Local: native PostgreSQL on host port **5432** (`scripts/setup-local-db.ps1`), or a hosted Neon/Supabase URI
- Optional: Docker Compose service `postgres` on host port **5433**
- Vercel Hobby: hosted PostGIS only (Neon or Supabase). Vercel does not run Postgres.

Extensions: `postgis`, `postgis_topology` (init), `pgcrypto` (init). Prisma also enables `postgis`.

```bash
pnpm db:migrate
pnpm db:seed
```

## Prisma + PostGIS

Prisma owns relational tables, enums, and relations.

`plantations.geom` is `geometry(Geometry, 4326)` with a GiST index. Prisma maps it as `Unsupported("geometry")`. Spatial reads/writes use parameterized `$queryRaw` / `$executeRaw` in `@forestwatch/database`.

Meter distances use `geography` casts:

```sql
ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography, $meters)
```

Helpers: `classifyProximity`, `makePointSql`, `withinMetersSql`, `bboxIntersectsSql`, `distanceToPlantationMeters`, `setPlantationPoint`, `pingDatabase`.

## Tables

```text
system_settings
users, roles, user_roles, sessions
organizations, officer_assignments
campaigns
plantations, species, plantation_species, plantation_images
monitoring_updates, monitoring_images
officer_inspections, inspection_images
comments, comment_reactions
reports, report_images
verifications
notifications, notification_preferences, push_devices
audit_logs
engagement_profiles, engagement_reward_rules, xp_transactions
badges, user_badges
missions, mission_tasks, user_missions
species_discoveries, plantation_discoveries
plantation_guardians, stewardship_streaks
community_challenges, challenge_progress
```

`GUEST` is not stored. Authenticated roles live in `roles` / `user_roles`.

History tables (`monitoring_updates`, `verifications`, `xp_transactions`, `audit_logs`) are append-only from the application. Audit logs have no update/delete API.

## Indexes

B-tree: `campaignId`, `districtCode`, `dsdCode`, `gndCode`, `verificationStatus`, `userId`, `organizationId`, `createdAt`, `speciesId`, mission `type+status`.

GiST: `plantations.geom`.

Unique: `xp_transactions (userId, eventType, eventId)` so retries cannot double-award.

`clientUuid` on plantations, monitoring updates, reports, and officer inspections supports idempotent offline sync. Retries return the existing row instead of inserting a duplicate.

## GPS vs administrative location

Plantations store both:

- `latitude`, `longitude`, `geom`
- `provinceCode`, `districtCode`, `dsdCode`, `gndCode`

Do not infer one from the other.

## Development seed

`pnpm db:seed` creates localhost role accounts, native species, one Bundala campaign/site, a verified monitoring row, badges, a stewardship mission, and geo-proximity settings.

Password: `DEV_SEED_PASSWORD` (default `ForestWatch!dev`). Refuse to run when `NODE_ENV=production`.

## Health

`GET /api/v1/health` is liveness (no database).  
`GET /api/v1/health/ready` pings `PostGIS_Version()`.
