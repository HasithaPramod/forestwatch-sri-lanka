# Architecture

ForestWatch Sri Lanka is a cross-platform environmental monitoring ecosystem. Web, Android, and iOS clients share one NestJS REST API. The API is the only source of truth for protected data.

This document records Phase 0 decisions. The product specification lives in [FORESTWATCH_SRI_LANKA.md](./FORESTWATCH_SRI_LANKA.md).

## Monorepo

The repository root **is** the monorepo (`d:\forest`). Packages are published internally as `@forestwatch/*`.

```text
apps/web       Next.js public site + authenticated portals
apps/mobile    Expo (Android / iOS) field application
apps/api       NestJS REST API
packages/*     Shared TypeScript libraries
docker/        Optional local PostGIS (not used on Vercel)
docs/          Architecture and operations
```

Tooling: pnpm workspaces, Turborepo, strict TypeScript, ESLint, Prettier, Vitest.

Expo requires hoisted node_modules. `.npmrc` sets `node-linker=hoisted`.

## Runtime topology

```text
Next.js  ──┐
           ├──►  NestJS /api/v1  ──►  PostgreSQL + PostGIS
Expo     ──┘                     └──►  StorageProvider
                                          ├── LocalStorageProvider (default)
                                          └── SupabaseStorageProvider (optional)
```

Clients never open a database connection and never receive `SUPABASE_SERVICE_ROLE_KEY`.

## Apps

### Web (`apps/web`)

- Next.js App Router, React, TypeScript, Tailwind CSS
- shadcn/ui from Phase 5 onward
- Leaflet + OpenStreetMap for maps (Phase 9)
- TanStack Query + React Hook Form + Zod when forms exist
- Server-side route guards may check a session cookie; authorization is still enforced by the API

Next.js must not grow a second business API. Route handlers, if any, only BFF-proxy to NestJS.

### Mobile (`apps/mobile`)

- Expo + Expo Router, TypeScript, NativeWind later
- Native GPS, camera, online field forms (Phase 14), and SQLite offline queue (Phase 15).
- Not a WebView wrapper

### API (`apps/api`)

- NestJS, REST, Swagger at `/api/docs`
- Prefix: `/api/v1`
- Envelope:

```json
{ "success": true, "data": {}, "meta": {} }
```

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Invalid request", "details": [] } }
```

Production responses never include stack traces.

## Shared packages

| Package | Responsibility |
| --- | --- |
| `@forestwatch/types` | Shared domain types and API envelope |
| `@forestwatch/config` | API prefix, pagination caps, geo thresholds |
| `@forestwatch/utils` | Pure helpers (pagination, slugs, safe paths) |
| `@forestwatch/validation` | Zod schemas reused by API, web, and mobile |
| `@forestwatch/auth` | Role constants and pure permission helpers |
| `@forestwatch/storage` | `StorageProvider` + local/Supabase implementations |
| `@forestwatch/database` | Prisma schema and client (domain models in Phase 2) |
| `@forestwatch/api-client` | Typed `fetch` client for web and mobile |
| `@forestwatch/i18n` | English / Sinhala / Tamil dictionaries and `t()` |
| `@forestwatch/sri-lanka-locations` | Province → District → DSD → GND from `sl-gnd-dsd-districts`; ISO province/district codes |
| `@forestwatch/engagement` | ForestQuest events, confirmed XP projection, ForestDex, missions, and badges. No client XP mutation. |

## Security model

- Passwords: Argon2id
- Access JWT (15 minutes) + opaque refresh tokens stored hashed in `sessions`, rotated on use
- Web uses an httpOnly refresh cookie; mobile receives the refresh token in JSON
- RBAC enforced in NestJS guards. Frontend role is never trusted.
- Guest is unauthenticated. It is not a row in `user_roles`.
- Auth routes are rate-limited per IP. Helmet and CORS with credentials are enabled. Upload validation lands with storage.
- Never trust: client role, client user id, client GPS, client distance, client verification, client XP, EXIF GPS

## GIS

See [gis.md](./gis.md). SRID 4326. Prisma for relational data; parameterized SQL for PostGIS.

## Storage

See [storage.md](./storage.md). Images never live in PostgreSQL.

## Offline

See [offline-sync.md](./offline-sync.md). SQLite on device, client UUIDs, idempotent sync.

## ForestQuest

See [forestquest.md](./forestquest.md). Engagement is a downstream consumer of verified domain events. Official verification is never driven by XP.

## Testing

- Vitest for packages and API unit tests
- NestJS HTTP tests for health and, later, auth/RBAC
- Playwright / Detox in later phases

Critical later suites are listed in the specification (auth, spatial queries, verification, anti-farming).

## Technical risks

| Risk | Mitigation |
| --- | --- |
| Prisma weak PostGIS support | Keep geometry in SQL migrations; access via `$queryRaw` |
| GPS spoofing | Server distance + photos + reputation + officer verification |
| Image volume | WebP, resize, object storage, orphan cleanup |
| Expo + pnpm | Hoisted linker; isolate native config |
| XP farming | Ledger, cooldowns, caps, verification-gated rewards |
| Sensitive sites | `OFFICER_ONLY` coordinates stripped in DTOs |
| Free-tier surprise limits | Hosted PostGIS (Neon/Supabase) + two Vercel Hobby projects; no Docker on Vercel |
| Node 23 (non-LTS) | Engines allow >=20; CI should prefer Node 22 LTS |

## Phase boundary

Phase 2 delivers the Prisma/PostGIS schema. Authentication, maps, monitoring APIs, and ForestQuest runtime start in later numbered phases.
