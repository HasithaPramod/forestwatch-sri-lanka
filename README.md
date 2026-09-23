# ForestWatch Sri Lanka

National tree planting, geo-monitoring, community verification, and ForestQuest platform.

Plant today. Protect tomorrow.

This repository is a pnpm / Turborepo monorepo. The NestJS API is the source of truth. Web and mobile clients never talk to the database or storage secrets directly.

## Current status

Phases 0–21 are in this repo (auth, plantations, maps, monitoring, ForestQuest missions/badges). Docker is optional. Local development uses native PostgreSQL + PostGIS, or a hosted PostGIS URI. The Next.js web app and NestJS API deploy as two Vercel Hobby projects against Neon or Supabase PostGIS.

Product specification: [docs/FORESTWATCH_SRI_LANKA.md](docs/FORESTWATCH_SRI_LANKA.md)  
Architecture: [docs/architecture.md](docs/architecture.md)  
Deploy: [docs/deployment.md](docs/deployment.md)

## Apps

| Path | Stack | Default URL |
| --- | --- | --- |
| `apps/web` | Next.js | http://localhost:3000 |
| `apps/api` | NestJS | http://localhost:3001/api/v1/health |
| `apps/mobile` | Expo | Metro bundler via `pnpm --filter @forestwatch/mobile start` |

## Prerequisites

- Node.js 20+ (22 LTS recommended)
- pnpm 12
- PostgreSQL 16+ with **PostGIS**, or a hosted PostGIS URI (Neon / Supabase)

Docker Compose is optional and not required for Vercel.

## Quick start (no Docker)

```bash
cp .env.example .env
pnpm install
```

Create the local database (Windows, PostgreSQL already installed):

```powershell
$env:PGPASSWORD = '<your postgres superuser password>'
.\scripts\setup-local-db.ps1
```

If PostGIS is not installed locally, paste a Neon or Supabase `DATABASE_URL` into `.env` instead.

```bash
pnpm db:migrate
pnpm db:seed
pnpm --filter @forestwatch/api --filter @forestwatch/web dev
```

Use **pnpm**, not npm.

Verify:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Swagger: http://localhost:3001/api/docs

## Workspace packages

Shared libraries live in `packages/` under the `@forestwatch/*` scope (`types`, `config`, `utils`, `validation`, `auth`, `storage`, `database`, `api-client`, `sri-lanka-locations`, `engagement`).

## Local infrastructure

Postgres listens on **localhost:5432**. `scripts/setup-local-db.ps1` creates role/database `forestwatch` / `forestwatch` for local use only.

Object storage defaults to the local filesystem (`./uploads`). Vercel and any production host must set `STORAGE_PROVIDER=supabase` with real dashboard credentials — this repo does not invent them.

After migrate+seed, development logins are `superadmin@localhost` (and the other role accounts) with `DEV_SEED_PASSWORD`. Never use those credentials in production.

## Vercel Hobby

Vercel does not run Docker and does not host PostgreSQL. See [docs/deployment.md](docs/deployment.md).

**Root Directory must be `apps/web`.** The repo root has no `next` package, so a root import fails with “No Next.js version detected.” In the existing Vercel project: Settings → General → Root Directory → `apps/web` → enable Include source files outside the Root Directory → Redeploy.

Create a second Vercel project with Root Directory `apps/api` for NestJS. After that URL exists, set `NEXT_PUBLIC_API_URL` on the web project to `https://<api>.vercel.app/api/v1` and redeploy.
