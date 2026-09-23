# GIS

## Stack

- PostGIS in PostgreSQL
- Leaflet + OpenStreetMap on web during development
- React Native Maps on mobile
- SRID **4326** (WGS 84)

## Geometry

Plantations may be:

- `INDIVIDUAL_TREE` — Point
- `PLANTATION_SITE` — Polygon or MultiPolygon, plus a centroid for markers

## Queries

| Need | Function |
| --- | --- |
| Viewport | `ST_MakeEnvelope` + `ST_Intersects` |
| Nearby | `ST_DWithin` on `geography` |
| Distance display | `ST_Distance` on `geography` (meters) |
| Area | `ST_Area` on `geography` (square meters → hectares) |
| Containment | `ST_Contains` / `ST_Covers` |

Always parameterize. Always use the spatial index (GiST).

## Geo-proximity (monitoring)

Server computes distance from the plantation geometry to the claimed GPS point.

Configurable thresholds (defaults, not hardcoded in controllers):

- 0–100 m → `ON_SITE`
- 100–500 m → `NEARBY`
- >500 m → `REMOTE`
- missing GPS → `LOCATION_UNAVAILABLE`

GPS is corroboration, not proof.

## Privacy

`locationVisibility`:

- `PUBLIC_EXACT` — real coordinates in public DTOs
- `PUBLIC_APPROXIMATE` — rounded/jittered in the serializer
- `OFFICER_ONLY` — omitted from public DTOs

The map UI must not be the only control.

## Scale

Map endpoints page or cap results per bbox. Clustering is a client presentation of the bbox payload, not a dump of the national dataset.

## Phase 9

- `GET /api/v1/map/plantations?bbox=west,south,east,north`
- `GET /api/v1/nearby/plantations?lat=&lng=&radiusMeters=`
- Web `/map` uses Leaflet + OpenStreetMap and refetches when the viewport moves
- Sites currently store a centroid `Point` (SRID 4326). Polygon drawing is not in this phase.

## Phase 10

- `POST /api/v1/plantations/:id/updates` computes distance with `ST_Distance` on geography
- Thresholds come from `system_settings.geo_proximity_meters` (fallback `GEO_PROXIMITY_METERS`)
- Missing GPS is `LOCATION_UNAVAILABLE`; the client cannot send a proximity band
- GPS remains corroboration, not proof. Officer verification of monitoring writes an append-only `verifications` row, then updates the current status.

## Phase 14

- Expo Nearby reads device GPS and calls `GET /nearby/plantations`. Distances in the list are PostGIS metres.
- Expo Map reads a bbox around GPS (or the national Sri Lanka envelope if GPS is missing/outside the island) and plots `GET /map/plantations` on React Native Maps.
- Monitoring and officer inspections send device lat/lng/accuracy. The app never classifies ON_SITE / NEARBY / REMOTE.
