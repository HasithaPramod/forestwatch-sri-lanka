import { describe, expect, it, vi } from 'vitest';
import { ForestWatchApiClient, ForestWatchApiError } from './index';

describe('ForestWatchApiClient', () => {
  it('unwraps a successful envelope', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { status: 'ok' },
      }),
    });

    const client = new ForestWatchApiClient({
      baseUrl: 'http://localhost:3001/api/v1',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(client.get('/health')).resolves.toEqual({ status: 'ok' });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/health',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    );
  });

  it('throws on API error envelopes', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request' },
      }),
    });

    const client = new ForestWatchApiClient({
      baseUrl: 'http://localhost:3001/api/v1',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(client.get('/health')).rejects.toBeInstanceOf(ForestWatchApiError);
  });

  it('reads ForestQuest profile and does not expose an add-xp mutation', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { available: true, confirmedXp: 0, rewardsActive: true },
      }),
    });
    const client = new ForestWatchApiClient({
      baseUrl: 'http://localhost:3001/api/v1',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(client.engagementProfile()).resolves.toMatchObject({ available: true, confirmedXp: 0 });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/engagement/profile',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(client).not.toHaveProperty('addXp');
    expect(client).not.toHaveProperty('discoverSpecies');
    expect(client).not.toHaveProperty('awardBadge');
  });
});
