import { describe, expect, it } from 'vitest';
import { gpsFieldsForApi } from './geo';
import { canQueueFromDraft, canStartSync, classifySyncFailure, isRetryableNetworkError } from './offline-status';

describe('offline sync state', () => {
  it('does not sync local drafts until they are queued', () => {
    expect(canStartSync('LOCAL_DRAFT')).toBe(false);
    expect(canStartSync('QUEUED')).toBe(true);
    expect(canStartSync('SYNCED')).toBe(false);
    expect(canQueueFromDraft('LOCAL_DRAFT')).toBe(true);
  });

  it('keeps a rejected payload on validation failure and retries network errors', () => {
    expect(classifySyncFailure({ status: 400 })).toEqual({ status: 'SYNC_FAILED', keepRejectedPayload: true });
    expect(classifySyncFailure({ network: true })).toEqual({ status: 'QUEUED', keepRejectedPayload: false });
    expect(isRetryableNetworkError(new TypeError('Network request failed'))).toBe(true);
  });

  it('does not invent Sri Lanka GPS when the device fix is abroad', () => {
    expect(gpsFieldsForApi({ latitude: 51.5, longitude: -0.12, accuracyMeters: 8 })).toEqual({});
    expect(gpsFieldsForApi({ latitude: 6.1964, longitude: 81.2203, accuracyMeters: 12 })).toMatchObject({
      latitude: 6.1964,
      longitude: 81.2203,
    });
  });
});
