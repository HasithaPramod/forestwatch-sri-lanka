# Sri Lankan locations

Phase 4. Catalogue data comes from the MIT package `sl-gnd-dsd-districts` (Ministry of Home Affairs sourced: 9 provinces, 25 districts, 340 DSDs, 14,020 GNDs, English / Sinhala / Tamil).

Clients never import that package. NestJS wraps it in `@forestwatch/sri-lanka-locations` and exposes cascade reads. Web and mobile call the API.

## Codes

- Province and district: ISO 3166-2:LK (`LK-3` Southern, `LK-33` Hambantota). These match the development seed and officer assignments.
- DSD: official LIFe prefix (`3-3-09` Tissamaharama).
- GND: official LIFe code (`3-3-09-150`).

GPS and administrative codes stay independent. Boundary-polygon checks are not in this phase.

## API

Public (no JWT):

- `GET /api/v1/locations/provinces`
- `GET /api/v1/locations/districts?provinceCode=`
- `GET /api/v1/locations/dsds?districtCode=`
- `GET /api/v1/locations/gnds?dsdCode=` (required; paginated)
- `GET /api/v1/locations/stats` (catalogue counts, not plantation totals)

Unknown parent codes return `LOCATION_NOT_FOUND`. GND lists are never returned for the whole country in one response.
