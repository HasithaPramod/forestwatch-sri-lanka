import type { OfflineSyncStatus } from '@forestwatch/types';

export type SyncFailureInput = {
  network?: boolean;
  status?: number;
  code?: string;
};

export function canStartSync(status: OfflineSyncStatus): boolean {
  return status === 'QUEUED' || status === 'SYNC_FAILED';
}

export function canQueueFromDraft(status: OfflineSyncStatus): boolean {
  return status === 'LOCAL_DRAFT' || status === 'SYNC_FAILED';
}

export function classifySyncFailure(input: SyncFailureInput): {
  status: Extract<OfflineSyncStatus, 'QUEUED' | 'SYNC_FAILED'>;
  keepRejectedPayload: boolean;
} {
  if (input.network || input.status == null || input.status >= 500) {
    return { status: 'QUEUED', keepRejectedPayload: false };
  }
  return { status: 'SYNC_FAILED', keepRejectedPayload: input.status === 400 };
}

export function isRetryableNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true;
  }
  if (error instanceof Error && /network|failed to fetch|network request failed/i.test(error.message)) {
    return true;
  }
  return false;
}
