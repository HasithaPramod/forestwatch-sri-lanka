import type { PlantationDetail, PlantationSummary } from '@forestwatch/types';
import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL, type OutboxPayload, type OutboxRecord } from '@/lib/offline-types';

type OutboxRow = {
  client_uuid: string;
  kind: OutboxRecord['kind'];
  plantation_id: string;
  plantation_name: string | null;
  payload: string;
  gps_json: string | null;
  status: OutboxRecord['status'];
  server_id: string | null;
  last_error: string | null;
  rejected_payload: string | null;
  created_at: string;
  updated_at: string;
  photo_uri: string | null;
  photo_filename: string | null;
  photo_mime: string | null;
  photo_server_id: string | null;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function db(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const opened = await SQLite.openDatabaseAsync('forestwatch-offline.db');
      await opened.execAsync(SCHEMA_SQL);
      return opened;
    })();
  }
  return dbPromise;
}

function mapRow(row: OutboxRow): OutboxRecord {
  return {
    clientUuid: row.client_uuid,
    kind: row.kind,
    plantationId: row.plantation_id,
    plantationName: row.plantation_name,
    payload: JSON.parse(row.payload) as OutboxPayload,
    gps: row.gps_json ? (JSON.parse(row.gps_json) as OutboxRecord['gps']) : null,
    status: row.status,
    serverId: row.server_id,
    lastError: row.last_error,
    rejectedPayload: row.rejected_payload ? (JSON.parse(row.rejected_payload) as OutboxPayload) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    photoUri: row.photo_uri,
    photoFilename: row.photo_filename,
    photoMime: row.photo_mime,
    photoServerId: row.photo_server_id,
  };
}

export async function upsertCachedPlantations(items: PlantationSummary[]): Promise<void> {
  const database = await db();
  const now = new Date().toISOString();
  await database.withTransactionAsync(async () => {
    for (const item of items) {
      await database.runAsync(
        `INSERT INTO cached_plantations (id, payload, cached_at) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, cached_at = excluded.cached_at`,
        [item.id, JSON.stringify(item), now],
      );
    }
  });
}

export async function listCachedPlantations(): Promise<PlantationSummary[]> {
  const database = await db();
  const rows = await database.getAllAsync<{ payload: string }>('SELECT payload FROM cached_plantations ORDER BY cached_at DESC');
  return rows.map((row) => JSON.parse(row.payload) as PlantationSummary);
}

export async function cachePlantationDetail(detail: PlantationDetail): Promise<void> {
  const database = await db();
  await database.runAsync(
    `INSERT INTO cached_plantation_details (id, payload, cached_at) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, cached_at = excluded.cached_at`,
    [detail.id, JSON.stringify(detail), new Date().toISOString()],
  );
  await upsertCachedPlantations([detail]);
}

export async function getCachedPlantationDetail(id: string): Promise<PlantationDetail | null> {
  const database = await db();
  const row = await database.getFirstAsync<{ payload: string }>(
    'SELECT payload FROM cached_plantation_details WHERE id = ?',
    [id],
  );
  return row ? (JSON.parse(row.payload) as PlantationDetail) : null;
}

export async function insertOutbox(record: OutboxRecord): Promise<void> {
  const database = await db();
  await database.runAsync(
    `INSERT INTO outbox (
      client_uuid, kind, plantation_id, plantation_name, payload, gps_json, status, server_id,
      last_error, rejected_payload, created_at, updated_at, photo_uri, photo_filename, photo_mime, photo_server_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.clientUuid,
      record.kind,
      record.plantationId,
      record.plantationName,
      JSON.stringify(record.payload),
      record.gps ? JSON.stringify(record.gps) : null,
      record.status,
      record.serverId,
      record.lastError,
      record.rejectedPayload ? JSON.stringify(record.rejectedPayload) : null,
      record.createdAt,
      record.updatedAt,
      record.photoUri,
      record.photoFilename,
      record.photoMime,
      record.photoServerId,
    ],
  );
}

export async function listOutbox(): Promise<OutboxRecord[]> {
  const database = await db();
  const rows = await database.getAllAsync<OutboxRow>('SELECT * FROM outbox ORDER BY created_at DESC');
  return rows.map(mapRow);
}

export async function pendingOutboxCount(): Promise<number> {
  const database = await db();
  const row = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM outbox WHERE status IN ('LOCAL_DRAFT', 'QUEUED', 'SYNCING', 'SYNC_FAILED')`,
  );
  return row?.count ?? 0;
}

export async function updateOutbox(
  clientUuid: string,
  patch: Partial<
    Pick<
      OutboxRecord,
      'status' | 'serverId' | 'lastError' | 'rejectedPayload' | 'photoServerId' | 'photoUri'
    >
  >,
): Promise<void> {
  const database = await db();
  const current = await database.getFirstAsync<OutboxRow>('SELECT * FROM outbox WHERE client_uuid = ?', [clientUuid]);
  if (!current) {
    return;
  }
  const next = mapRow(current);
  const merged: OutboxRecord = {
    ...next,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await database.runAsync(
    `UPDATE outbox SET status = ?, server_id = ?, last_error = ?, rejected_payload = ?, photo_server_id = ?, photo_uri = ?, updated_at = ?
     WHERE client_uuid = ?`,
    [
      merged.status,
      merged.serverId,
      merged.lastError,
      merged.rejectedPayload ? JSON.stringify(merged.rejectedPayload) : null,
      merged.photoServerId,
      merged.photoUri,
      merged.updatedAt,
      clientUuid,
    ],
  );
}
