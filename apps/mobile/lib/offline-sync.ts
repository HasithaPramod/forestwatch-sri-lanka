import type { ForestWatchApiClient } from '@forestwatch/api-client';
import { ForestWatchApiError } from '@forestwatch/api-client';
import type {
  InspectionOutboxPayload,
  MonitoringOutboxPayload,
  OutboxRecord,
  ReportOutboxPayload,
} from '@/lib/offline-types';
import { classifySyncFailure, canStartSync, isRetryableNetworkError } from '@/lib/offline-status';
import { deleteLocalPhoto } from '@/lib/offline-files';
import { listOutbox, updateOutbox } from '@/lib/offline-store';
import { errorMessage } from '@/lib/errors';

function asMonitoring(payload: OutboxRecord['payload']): MonitoringOutboxPayload {
  return payload as MonitoringOutboxPayload;
}

function asReport(payload: OutboxRecord['payload']): ReportOutboxPayload {
  return payload as ReportOutboxPayload;
}

function asInspection(payload: OutboxRecord['payload']): InspectionOutboxPayload {
  return payload as InspectionOutboxPayload;
}

async function uploadIfNeeded(
  client: ForestWatchApiClient,
  row: OutboxRecord,
  serverId: string,
): Promise<string | null> {
  if (!row.photoUri || row.photoServerId) {
    return row.photoServerId;
  }
  const filename = row.photoFilename ?? 'photo.jpg';
  const upload = {
    uri: row.photoUri,
    name: filename,
    type: row.photoMime ?? 'image/jpeg',
  };
  if (row.kind === 'MONITORING') {
    const detail = await client.uploadMonitoringImage(row.plantationId, serverId, upload, filename);
    return detail.images[0]?.id ?? detail.coverImage?.url ?? 'uploaded';
  }
  if (row.kind === 'REPORT') {
    const detail = await client.uploadReportImage(serverId, upload, filename);
    return detail.images[0]?.id ?? detail.coverImage?.url ?? 'uploaded';
  }
  const detail = await client.uploadInspectionImage(serverId, upload, filename);
  return detail.images[0]?.id ?? detail.coverImage?.url ?? 'uploaded';
}

async function createServerRecord(client: ForestWatchApiClient, row: OutboxRecord): Promise<string> {
  if (row.kind === 'MONITORING') {
    const payload = asMonitoring(row.payload);
    const created = await client.createMonitoringUpdate(row.plantationId, {
      ...payload,
      clientUuid: row.clientUuid,
    });
    return created.id;
  }
  if (row.kind === 'REPORT') {
    const payload = asReport(row.payload);
    const created = await client.createPlantationReport(row.plantationId, {
      ...payload,
      clientUuid: row.clientUuid,
    });
    return created.id;
  }
  const payload = asInspection(row.payload);
  const created = await client.createInspection(row.plantationId, {
    ...payload,
    clientUuid: row.clientUuid,
  });
  return created.id;
}

async function syncRow(client: ForestWatchApiClient, row: OutboxRecord): Promise<void> {
  await updateOutbox(row.clientUuid, { status: 'SYNCING', lastError: null });
  try {
    const serverId = row.serverId ?? (await createServerRecord(client, row));
    await updateOutbox(row.clientUuid, { serverId, status: 'SYNCING' });
    const photoServerId = await uploadIfNeeded(client, { ...row, serverId }, serverId);
    if (photoServerId && row.photoUri) {
      await deleteLocalPhoto(row.photoUri);
    }
    await updateOutbox(row.clientUuid, {
      status: 'SYNCED',
      serverId,
      photoServerId,
      photoUri: photoServerId ? null : row.photoUri,
      lastError: null,
      rejectedPayload: null,
    });
  } catch (error: unknown) {
    const apiError = error instanceof ForestWatchApiError ? error : null;
    const outcome = classifySyncFailure({
      network: isRetryableNetworkError(error),
      status: apiError?.status,
      code: apiError?.code,
    });
    await updateOutbox(row.clientUuid, {
      status: outcome.status,
      lastError: errorMessage(error, 'Sync failed'),
      rejectedPayload: outcome.keepRejectedPayload ? row.payload : null,
    });
  }
}

export async function syncOutbox(client: ForestWatchApiClient): Promise<void> {
  const rows = await listOutbox();
  for (const row of rows) {
    if (!canStartSync(row.status)) {
      continue;
    }
    await syncRow(client, row);
  }
}
