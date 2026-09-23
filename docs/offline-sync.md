# Offline synchronization

Mobile field work must function without a radio link. Phase 14 is the online Expo field client (SecureStore auth, GPS, camera). Phase 15 is SQLite drafts and the image queue.

## Local store

Expo SQLite on device (`forestwatch-offline.db`). Cached plantations, outbox rows, GPS snapshots, and local photograph paths.

Statuses: `LOCAL_DRAFT` → `QUEUED` → `SYNCING` → `SYNCED` or `SYNC_FAILED`.

## Identity

Every locally created monitoring update, report, and inspection gets a client UUID. NestJS upserts by that id. Retries must not insert duplicates.

## Image queue

1. Capture photo to the device document directory
2. Attach to the local outbox row
3. On network: create/upsert the server record, then upload the image through the API
4. Persist server ids
5. Delete local bytes only after the server confirms

## Conflict policy

Server clock and server validation win. A 400 keeps a rejected payload copy for correction. Network failures stay `QUEUED` for retry. Verification and XP are never computed on device.

Nearby search is not computed from the SQLite cache. Distances stay PostGIS.
