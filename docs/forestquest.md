# ForestQuest

ForestQuest is an original location-based environmental engagement layer. It must not copy Pokémon names, characters, art, or terminology.

It also must not override Forest Department verification.

## Event pipeline

```text
Plantations / Monitoring / Verification / Reports
        → domain events
        → EngagementService.ingest
        → xp_transactions (CONFIRMED when the event is already verified, otherwise PENDING)
        → engagement_profiles projection (SUM of CONFIRMED rows)
        → GET /engagement/profile
        → GET /engagement/missions
        → GET /engagement/badges
```

Clients submit environmental actions. The server decides whether a reward applies. There is no `POST /add-xp`, no `POST /discover`, and no client badge-award endpoint.

`PLANTATION_REGISTERED` and `MONITORING_SUBMITTED` confirm immediately with `0` XP. `PLANTATION_VERIFIED`, `MONITORING_VERIFIED`, and `REPORT_VERIFIED` confirm when an officer verifies or resolves the related record. `PLANTATION_DISCOVERED` and `SPECIES_DISCOVERED` confirm after an `ON_SITE` visit to a `VERIFIED` plantation that is not `OFFICER_ONLY`. Unique `(userId, eventType, eventId)` prevents duplicates. Verified events credit the plantation owner, monitoring author, or reporter, not the officer.

Existing `PENDING` rows for those confirmable event types are flipped to `CONFIRMED` on the next profile, mission, or badge read. That is a status transition on the append-only ledger row, not a second insert.

## ForestDex

`GET /engagement/forestdex` is a species journal. `catalogueCount` is a live `COUNT` of active catalogue species — not a sample 150. Locked entries show names only. Description, discovery date, location, and verified encounter counts appear after an on-site discovery. Coordinates use the same `locationVisibility` rules as the public map.

`GET /engagement/discoveries` lists plantation discoveries. Sensitive `OFFICER_ONLY` sites are excluded.

## Ledger

`xp_transactions` is append-only (`PENDING`, `CONFIRMED`, `REVOKED`). Profile `confirmedXp` is a `SUM` of confirmed XP amounts. `ecoPoints` is a projection of `FORESTQUEST_REWARDS[].ecoPoints` for those confirmed rows. EcoPoints are non-monetary reputation; they are not currency, tokens, or cash.

Reward amounts live in `@forestwatch/config` (`FORESTQUEST_REWARDS`), not in controllers. `rewardsActive` is `true`. `engagement_profiles.confirmedXp`, `ecoPoints`, `level`, and `displayTitle` are a cache of that projection, not a client-writable field.

## Missions and badges

`GET /engagement/missions` and `GET /engagement/missions/:id` list published (`ACTIVE`) missions. Task progress is counted from verified domain data (for example on-site `MONITORING_VERIFIED` updates). Clients cannot complete a mission by posting to the API.

`GET /engagement/badges` returns the badge catalogue plus `UserBadge` rows. Awards are evaluated from configurable `badges.rule` JSON after confirmed activity (`first-plant`, `first-discovery`, `first-verified-observation`, `species-count`, `event`).

## Levels (display names)

Exact thresholds live in `FORESTQUEST_LEVELS`. Working titles:

1. Seedling (0)
2. Sprout (200)
3. Tree Guardian (600)
4. Eco Explorer (1200)
5. Canopy Keeper (2500)
6. Forest Champion (5000)

“Canopy Keeper” replaces the spec’s “Forest Ranger” so the product cannot be mistaken for a Forest Department rank.

Game level never implies legal authority.

## Honest unavailable surfaces

`GET /engagement/passport`, `/guardians`, and `/challenges` return `{ available: false }`. Forest Passport, guardians, streaks, and community challenges are later phases. Cooldown and daily-cap anti-farming are not applied in this phase.

## Field layer

ForestQuest is map-first: you, a visit radius, and real verified plantations you walk to. The inner ring is on-site (`GEO_PROXIMITY_METERS.onSiteMax`, 100 m). The outer ring is nearby (`nearbyMax`, 500 m). Distances come from NestJS / PostGIS after the client shares GPS. Coordinates are never invented. Tapping a map marker is not a visit and does not unlock ForestDex.

The loop is an original ForestWatch field HUD (you marker, on-site / nearby rings, sites-around-you list). It must not copy Ingress names, art, or mechanics (no portal, XM, scanner, faction, link, hack, or resonator; no 40 m action circle).

Web `/forestquest` and the mobile Quest tab share location, draw the rings from config, and list nearby public plantations with `ON_SITE` / `NEARBY` / `REMOTE` bands from `fieldProximityBand`. Server-side GPS checks still decide monitoring and discovery.

## Safety

Do not reward trespass, restricted reserves, fire zones, or driving-while-using-the-app. Sensitive sites can be excluded from discovery entirely.
