# Storage

Business services never import `@supabase/supabase-js` or `fs` directly. They call `StorageService`, which delegates to a `StorageProvider`.

```text
MonitoringService → StorageService → StorageProvider
                                      ├── LocalStorageProvider
                                      ├── SupabaseStorageProvider
                                      └── S3StorageProvider (future)
```

## Interface

```typescript
interface StorageProvider {
  upload(input: UploadInput): Promise<StoredFile>;
  delete(key: string): Promise<void>;
  getUrl(key: string): Promise<string>;
  getSignedUrl?(key: string): Promise<string>;
}
```

Database rows store provider name, object key, MIME, width, height, byte size, uploader, timestamps. Never the binary.

## Phase 1 providers

- `local` — files under `STORAGE_LOCAL_ROOT` (default `./uploads`), served at `/api/v1/files/`
- `supabase` — only when `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET` are set. Missing credentials fail fast; they are never invented. Required on Vercel (`VERCEL=1`) because the function filesystem is not persistent.

## Images

Phase 8 is live.

- Validate magic bytes (JPEG / PNG / WebP), size (10 MB), and dimensions
- Long edge 1600 px, thumbnail 400 px, output WebP
- Keys: `plantations/{id}/{uuid}.webp`, `species/{id}/image.webp`, `campaigns/{id}/banner.webp`, `monitoring/{updateId}/{uuid}.webp`, `reports/{reportId}/{uuid}.webp`, `inspections/{inspectionId}/{uuid}.webp`
- Thumbnail is the sibling `*-thumb.webp`
- If the database write fails after upload, both objects are deleted
- Replacing a species or campaign image overwrites the same keys

## Local safety

Keys cannot contain `..` or absolute paths. Uploads stay inside the configured root.
