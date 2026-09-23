# Deployment

## Local development (no Docker)

```bash
cp .env.example .env
pnpm install
```

On Windows with PostgreSQL installed:

```powershell
$env:PGPASSWORD = '<your postgres superuser password>'
.\scripts\setup-local-db.ps1
```

If PostGIS is missing locally, set `DATABASE_URL` to a Neon or Supabase URI that already has `CREATE EXTENSION postgis`.

```bash
pnpm db:migrate
pnpm db:seed
pnpm --filter @forestwatch/api --filter @forestwatch/web dev
```

- API: `http://localhost:3001/api/v1/health`
- Swagger: `http://localhost:3001/api/docs`
- Web: `http://localhost:3000`
- Mobile: `pnpm --filter @forestwatch/mobile start`
- Postgres: `localhost:5432`

`docker compose up -d` remains an optional way to get PostGIS on port **5433**; it is not required.

## Vercel Hobby (free)

Vercel cannot run Docker, cannot persist `./uploads`, and does not include PostgreSQL. Hobby also caps serverless functions (about **10 seconds**).

You need **two** Vercel projects from this monorepo, plus a hosted PostGIS database and object storage:

| Piece | Where |
| --- | --- |
| Web (`apps/web`) | Vercel project, Root Directory `apps/web` |
| API (`apps/api`) | Vercel project, Root Directory `apps/api` |
| PostgreSQL + PostGIS | Neon or Supabase (free tier). Run `CREATE EXTENSION postgis;` |
| Images | Supabase Storage (`STORAGE_PROVIDER=supabase`) |

Do not run `pnpm db:seed` against a public production database.

### 1. Hosted PostGIS

Create a Neon or Supabase project. In the SQL editor:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

Copy the connection URI from that dashboard into `DATABASE_URL`. Never invent it. For serverless, prefer the pooler URI (Supabase port **6543**, or Neon `-pooler` host) and append `?pgbouncer=true` if the provider documents it.

From your machine, with that URI in `.env`:

```bash
pnpm db:migrate
```

### 2. Web project

1. Import the Git repo at [vercel.com/new](https://vercel.com/new)
2. **Root Directory: `apps/web`** (required — `next` is not in the repo-root `package.json`)
3. Enable Include source files outside the Root Directory
4. Framework: Next.js
5. Environment (optional on the first deploy):

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `/api/v1` (default — same origin; Next.js proxies to Nest) |
| `API_ORIGIN` | `https://<api-project>.vercel.app` (no `/api/v1` suffix) |

Nearby, map, and login call `/api/v1` on the web host. Without `API_ORIGIN`, those routes return JSON `API_UNAVAILABLE` instead of an HTML 404.

### 3. API project

1. Import the same repo again
2. Root Directory: `apps/api`
3. Include source files outside the Root Directory
4. Environment (all from your dashboards — never placeholders in production):

| Name | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Neon or Supabase PostGIS URI |
| `WEB_ORIGIN` | `https://<web-project>.vercel.app` (comma-separate extra origins if needed) |
| `JWT_SECRET` | new random secret, 32+ characters |
| `JWT_REFRESH_SECRET` | a **different** new random secret |
| `STORAGE_PROVIDER` | `supabase` |
| `SUPABASE_URL` | from Supabase settings |
| `SUPABASE_SERVICE_ROLE_KEY` | service role only, never `NEXT_PUBLIC_*` |
| `SUPABASE_STORAGE_BUCKET` | existing bucket name |
| `STORAGE_PUBLIC_BASE_URL` | public bucket base URL |
| `API_PREFIX` | `/api/v1` |

Vercel sets `PORT` and `VERCEL=1`. `src/main.ts` listens on `PORT` so the NestJS runtime can wrap the app as one function.

Refresh cookies use `SameSite=None; Secure` in production so the web origin can call a separate API origin with credentials.

### 4. After both URLs exist

Set `API_ORIGIN` on the web project to the API origin **without** `/api/v1`, then redeploy web. Set `WEB_ORIGIN` on the API project to the web origin, then redeploy API.

Preview deployments on `*.vercel.app` are allowed when `VERCEL=1`.

## Environment

See `.env.example`. Never commit `.env`. Never expose `SUPABASE_SERVICE_ROLE_KEY` or JWT secrets to web/mobile bundles.

`NEXT_PUBLIC_API_URL` and `EXPO_PUBLIC_API_URL` may point at the public API origin only.

## Production (later)

- Custom domain + HTTPS
- Managed Postgres with PostGIS (not Vercel’s compute)
- Object storage via `StorageProvider` (Supabase)
- Separate web and API processes (two Vercel projects, or a long-running Node host if you outgrow Hobby timeouts)
- EAS Build for Android/iOS
- Secrets in the host environment or a vault, not in the repo

Free-tier quotas are not production capacity. Map/nearby queries need PostGIS; do not switch the API to SQLite for Vercel.
