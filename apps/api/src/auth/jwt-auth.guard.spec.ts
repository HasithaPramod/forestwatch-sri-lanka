import { beforeEach, describe, expect, it } from 'vitest';
import { resetEnvCache } from '../env';
import { JwtAuthGuard, OptionalJwtAuthGuard } from './jwt-auth.guard';
import { TokenService } from './token.service';

describe('JwtAuthGuard', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://forestwatch:forestwatch@localhost:5433/forestwatch';
    process.env.JWT_SECRET = 'test-access-secret-value';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-value';
    resetEnvCache();
  });

  it('rejects a missing bearer token', () => {
    const guard = new JwtAuthGuard(new TokenService());
    expect(() =>
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
      } as never),
    ).toThrow(/Authentication required/);
  });

  it('attaches claims from a valid access token', () => {
    const tokens = new TokenService();
    const claims = {
      sub: '11111111-1111-4111-8111-111111111111',
      email: 'admin@localhost',
      roles: ['ADMIN' as const],
      sid: '22222222-2222-4222-8222-222222222222',
    };
    const request: { headers: { authorization: string }; user?: unknown } = {
      headers: { authorization: `Bearer ${tokens.signAccessToken(claims)}` },
    };
    const guard = new JwtAuthGuard(tokens);
    expect(
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => request }),
      } as never),
    ).toBe(true);
    expect(request.user).toMatchObject({ id: claims.sub, roles: ['ADMIN'], sessionId: claims.sid });
  });
});

describe('OptionalJwtAuthGuard', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://forestwatch:forestwatch@localhost:5433/forestwatch';
    process.env.JWT_SECRET = 'test-access-secret-value';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-value';
    resetEnvCache();
  });

  it('allows a missing bearer token', () => {
    const guard = new OptionalJwtAuthGuard(new TokenService());
    expect(
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
      } as never),
    ).toBe(true);
  });
});
