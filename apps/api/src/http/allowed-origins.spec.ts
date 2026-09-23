import { describe, expect, it } from 'vitest';
import { isAllowedCorsOrigin, parseWebOrigins } from './allowed-origins';

describe('parseWebOrigins', () => {
  it('splits a comma-separated WEB_ORIGIN list', () => {
    expect(parseWebOrigins('https://a.vercel.app, https://b.vercel.app')).toEqual([
      'https://a.vercel.app',
      'https://b.vercel.app',
    ]);
  });
});

describe('isAllowedCorsOrigin', () => {
  it('allows the configured production origin', () => {
    expect(
      isAllowedCorsOrigin('https://forest.vercel.app', {
        webOrigin: 'https://forest.vercel.app',
        nodeEnv: 'production',
      }),
    ).toBe(true);
  });

  it('allows Vercel preview origins when running on Vercel', () => {
    expect(
      isAllowedCorsOrigin('https://forest-git-main-team.vercel.app', {
        webOrigin: 'https://forest.vercel.app',
        nodeEnv: 'production',
        vercel: true,
      }),
    ).toBe(true);
  });

  it('rejects unknown production origins', () => {
    expect(
      isAllowedCorsOrigin('https://evil.example', {
        webOrigin: 'https://forest.vercel.app',
        nodeEnv: 'production',
        vercel: true,
      }),
    ).toBe(false);
  });

  it('allows LAN origins in development', () => {
    expect(
      isAllowedCorsOrigin('http://192.168.1.20:3000', {
        webOrigin: 'http://localhost:3000',
        nodeEnv: 'development',
      }),
    ).toBe(true);
  });
});
