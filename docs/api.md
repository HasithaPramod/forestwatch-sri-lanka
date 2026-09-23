# API

Base path: `/api/v1`  
Docs UI: `/api/docs` (Swagger / OpenAPI)

## Envelope

Success:

```json
{ "success": true, "data": {}, "meta": {} }
```

Failure:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": []
  }
}
```

Pagination query: `page` (1-based), `limit` (capped). Meta includes `page`, `limit`, `total`, `totalPages`.

## Modules (planned)

| Module | Phase | Notes |
| --- | --- | --- |
| Health | 1 | `GET /health` liveness; readiness reports storage + optional DB |
| Auth | 3 | register, login, refresh, logout, verify-email, password reset, RBAC guards |
| Locations | 4 | provinces, districts, DSDs, GNDs from `sl-gnd-dsd-districts` |
| Campaigns | 5 | CRUD + public list |
| Species | 6 | catalogue |
| Plantations | 7 | CRUD, filters, detail |
| Storage / images | 8 | upload pipeline |
| Map / nearby | 9 | bbox map, nearby search |
| Monitoring | 10 | timeline updates |
| Comments | 11 | threads, reactions |
| Reports | 12 | issue workflow |
| Verification | 13 | officer review + inspections |
| Mobile field | 14 | Expo SecureStore auth, GPS nearby/map, monitoring/reports/inspections |
| Offline sync | 15 | SQLite drafts, client UUID upserts, image queue |
| Notifications | 16 | in-app + push hooks |
| Search / dashboards | 17 | aggregated stats |
| Engagement | 19–20 | read-only profile, PENDING ingest, ForestDex from on-site discoveries. No `POST /add-xp`. Missions/badges later. |

Full path list is in the specification section 75.

## Map traffic

`GET /map/plantations?bbox=west,south,east,north` returns only the viewport. Never download the entire plantation table.

Nearby: `GET /nearby/plantations?lat=&lng=&radiusMeters=` using server-side PostGIS.

## Authorization

Every mutating route and every non-public read is authorized in NestJS. Geographic officer scopes are enforced in the service layer, not only in the UI.

## Phase 7 surface

- `GET /api/v1/health`
- `GET /api/v1/health/ready`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/logout-all`
- `GET /api/v1/auth/me`
- `PATCH /api/v1/auth/me` (`{ locale: "en" | "si" | "ta" }`)
- `GET /api/v1/auth/sessions`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/resend-verification`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `GET /api/v1/auth/rbac-check` (ADMIN / SUPER_ADMIN)
- `GET /api/v1/locations/provinces`
- `GET /api/v1/locations/districts?provinceCode=`
- `GET /api/v1/locations/dsds?districtCode=`
- `GET /api/v1/locations/gnds?dsdCode=`
- `GET /api/v1/locations/stats`
- `GET /api/v1/campaigns`
- `GET /api/v1/campaigns/:idOrSlug`
- `POST /api/v1/campaigns` (ORGANIZATION_MANAGER / ADMIN / SUPER_ADMIN)
- `PATCH /api/v1/campaigns/:idOrSlug` (owner manager or admin)
- `GET /api/v1/species`
- `GET /api/v1/species/:idOrScientificName`
- `POST /api/v1/species` (ADMIN / SUPER_ADMIN)
- `PATCH /api/v1/species/:idOrScientificName` (ADMIN / SUPER_ADMIN)
- `GET /api/v1/plantations`
- `GET /api/v1/plantations/:id`
- `POST /api/v1/plantations` (authenticated)
- `PATCH /api/v1/plantations/:id` (owner while submitted/rejected, or officer/admin)
- `POST /api/v1/plantations/:id/images` (same mutate rules; multipart `file`)
- `DELETE /api/v1/plantations/:id/images/:imageId`
- `POST /api/v1/species/:idOrScientificName/image` (ADMIN / SUPER_ADMIN)
- `DELETE /api/v1/species/:idOrScientificName/image`
- `POST /api/v1/campaigns/:idOrSlug/banner` (owner manager or admin)
- `DELETE /api/v1/campaigns/:idOrSlug/banner`
- `GET /api/v1/map/plantations?bbox=`
- `GET /api/v1/nearby/plantations?lat=&lng=&radiusMeters=`
- `GET /api/v1/plantations/:id/updates`
- `GET /api/v1/plantations/:id/updates/:updateId`
- `POST /api/v1/plantations/:id/updates` (authenticated)
- `POST /api/v1/plantations/:id/updates/:updateId/images`
- `DELETE /api/v1/plantations/:id/updates/:updateId/images/:imageId`
- `GET /api/v1/plantations/:id/comments`
- `POST /api/v1/plantations/:id/comments` (authenticated)
- `DELETE /api/v1/plantations/:id/comments/:commentId` (author or officer/admin)
- `POST /api/v1/plantations/:id/comments/:commentId/reactions` (authenticated toggle)
- `POST /api/v1/plantations/:id/comments/:commentId/report` (authenticated; audit log)
- `GET /api/v1/plantations/:id/reports` (guests receive an empty list)
- `POST /api/v1/plantations/:id/reports` (authenticated; status starts `OPEN`)
- `GET /api/v1/reports` (authenticated inbox; `scope=mine|assigned|all`)
- `GET /api/v1/reports/:id`
- `PATCH /api/v1/reports/:id` (officer/admin status workflow)
- `POST /api/v1/reports/:id/images`
- `DELETE /api/v1/reports/:id/images/:imageId`
- `GET /api/v1/review/queue` (officer/admin assigned work)
- `GET /api/v1/verifications?subjectType=&subjectId=` (append-only history)
- `POST /api/v1/verifications` (officer/admin decision)
- `POST /api/v1/plantations/:id/review` (SUBMITTED → UNDER_REVIEW)
- `GET /api/v1/plantations/:id/inspections`
- `POST /api/v1/plantations/:id/inspections` (officer/admin)
- `GET /api/v1/inspections/:id`
- `POST /api/v1/inspections/:id/images`
- `DELETE /api/v1/inspections/:id/images/:imageId`
- `GET /api/v1/notifications` (authenticated inbox; `unreadCount` is a live SQL count)
- `POST /api/v1/notifications/:id/read`
- `POST /api/v1/notifications/read-all`
- `GET /api/v1/notification-preferences`
- `PUT /api/v1/notification-preferences`
- `POST /api/v1/push/devices` (stores a token; local provider never reports delivery)
- `DELETE /api/v1/push/devices`
- `GET /api/v1/search?q=` (min 2 characters; plantations, campaigns, organizations, species, district/DSD/GND)
- `GET /api/v1/stats/public` (verified impact totals and breakdowns)
- `GET /api/v1/dashboards/me`
- `GET /api/v1/dashboards/officer` (assigned geography)
- `GET /api/v1/dashboards/admin`
- `GET /api/v1/engagement/profile` (authenticated; `confirmedXp` is SUM of CONFIRMED ledger rows; EcoPoints from config)
- `GET /api/v1/engagement/passport` (`{ available: false }`)
- `GET /api/v1/engagement/missions` (published missions; progress from verified field activity)
- `GET /api/v1/engagement/missions/:id`
- `GET /api/v1/engagement/badges` (catalogue plus awarded rows from configurable rules)
- `GET /api/v1/engagement/forestdex` (on-site species journal; `catalogueCount` is a live COUNT of active species)
- `GET /api/v1/engagement/discoveries` (plantation discoveries; `OFFICER_ONLY` excluded; coordinates follow locationVisibility)
- `GET /api/v1/engagement/guardians` (`{ available: false }`)
- `GET /api/v1/engagement/challenges` (`{ available: false }`)
- Static local files under `/api/v1/files/*` when `STORAGE_PROVIDER=local`

Public plantation list is `VERIFIED` only. `treeCount` is the submitted recorded total, not a survival estimate. Coordinates are exact, rounded to 3 decimals, or omitted according to `locationVisibility` at the DTO layer. `scope=mine` is the caller’s submissions; `scope=assigned` is officer geography; `scope=all` is admin-only.

- `GET /api/v1/map/plantations?bbox=west,south,east,north` — viewport only, capped
- `GET /api/v1/nearby/plantations?lat=&lng=&radiusMeters=` — PostGIS `ST_DWithin` / `ST_Distance`

Map and nearby never dump the plantation table. Guests only receive `VERIFIED` rows whose coordinates are public. `OFFICER_ONLY` is omitted from guest payloads, not merely hidden in the UI.

Monitoring timeline is append-only. Guests see `VERIFIED` updates. New submissions are `PENDING`. The API rejects client-supplied `distanceFromPlantation` / `locationValidation`; NestJS measures PostGIS geography distance and classifies `ON_SITE` / `NEARBY` / `REMOTE` / `LOCATION_UNAVAILABLE` from `geo_proximity_meters` (defaults 100 / 500). `estimatedSurvivingTrees` does not change `plantation.treeCount`. Officers record monitoring decisions with `POST /verifications`; each call inserts a history row and then updates the current status. Previous verification rows are never overwritten. `PATCH /plantations/:id` cannot change `verificationStatus`.

Uploads are JPEG, PNG, or WebP, max 10 MB. NestJS validates magic bytes, resizes the long edge to 1600 px, writes a 400 px thumbnail as WebP, and stores only object keys in PostgreSQL. Failed writes delete the uploaded objects. Guests receive public URLs, not binaries. Monitoring photographs use keys `monitoring/{updateId}/{uuid}.webp`. Report photographs use keys `reports/{reportId}/{uuid}.webp`. Inspection photographs use keys `inspections/{inspectionId}/{uuid}.webp`.

Comments are readable by guests on visible plantations. Posting, replies, Helpful reactions, and comment reports require authentication. Replies are one level deep. `POST .../comments/:id/report` writes `COMMENT_REPORTED` to the audit log; plantation issue reports are a separate resource. Officers and admins can delete comments. The author DTO includes `officer` from server-side roles, not a client-supplied badge.

Plantation issue reports are not public. Guests get an empty list. Authors, plantation owners, organization managers, assigned officers, and admins can read matching rows. Create starts as `OPEN`. Officers advance `OPEN → UNDER_REVIEW → ACTION_REQUIRED → RESOLVED`, or `REJECTED`. Admins may reopen terminal rows to `UNDER_REVIEW`. Skipping `OPEN` to `RESOLVED` is rejected. Photographs use keys `reports/{reportId}/{uuid}.webp`.

Verification history is append-only (`verifications`). Plantation flow is `SUBMITTED → UNDER_REVIEW → VERIFIED` or `REJECTED`; `REQUEST_CORRECTION` returns the plantation to `SUBMITTED`. Monitoring is `PENDING → VERIFIED` or `REJECTED`. Officers must be assigned to the plantation geography. Guests may read history on visible records but not officer notes. Officer inspections are a separate resource: they are visually distinct from citizen monitoring, store GPS only if provided, and never change `plantation.treeCount`.

Public campaigns are `PUBLIC` records in `UPCOMING`, `ACTIVE`, or `COMPLETED`. Drafts and private records stay hidden from guests. Campaign `plantationCount` and species `plantationRecordCount` are live row counts, not estimated plantings. `targetTrees` / `targetAreaHectares` are goals. `scope=mine` lists the caller's campaigns; `scope=all` is admin-only. Species `includeInactive=true` is admin-only. Catalogue and banner photographs use the same upload pipeline.

Notifications are per-user rows. Missing preference rows are treated as enabled. `unreadCount` is a live `COUNT` of unread rows, not a dashboard statistic. Creating a public `ACTIVE` campaign notifies only `createdById` (and skips the actor). Report filing notifies officers whose assignment matches the plantation geography (DSD, then district with null DSD, then province with null district). Local `POST /push/devices` stores a token; `LocalPushProvider` logs `attempted > 0` and always returns `delivered: 0` until Expo/FCM credentials exist. ForestQuest, XP, guardian reminders, and inspection crons are not in this inbox.

Search requires `q` of at least two characters. Public impact (`GET /stats/public`) counts `VERIFIED` plantations only. `treesRecorded` is `SUM(treeCount)`. `estimatedSurvivingTrees` is the sum of each plantation’s latest verified monitoring estimate and is `null` when none exist — it is never a copy of `treeCount`. Officer and admin dashboards are live counts. Officer inspections listed there are recent visits, not a predicted calendar. Admin `storageBytes` is the sum of stored image `sizeBytes`. Caller `GET /dashboards/me` `forestQuest` is a live profile projection (`confirmedXp` starts at 0; `rewardsActive` is false). `forestQuest.forestDex` is `{ available: true, discoveredCount, catalogueCount }` from live rows. Admin `forestQuest` remains `{ available: false }`. There is no `POST /add-xp`.


