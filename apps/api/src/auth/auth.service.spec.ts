import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiException } from '../common/http/api-exception';
import { resetEnvCache } from '../env';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

vi.mock('argon2', () => ({
  argon2id: 2,
  hash: vi.fn(async (password: string) => `hashed:${password}`),
  verify: vi.fn(async (digest: string, password: string) => digest === `hashed:${password}`),
}));

const citizenUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'citizen@localhost',
  displayName: 'Citizen',
  locale: 'en',
  emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
  passwordHash: 'hashed:ForestWatch!dev',
  roles: [{ role: { code: 'CITIZEN' } }],
};

describe('AuthService', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://forestwatch:forestwatch@localhost:5433/forestwatch';
    process.env.JWT_SECRET = 'test-access-secret-value';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-value';
    process.env.WEB_ORIGIN = 'http://localhost:3000';
    resetEnvCache();
  });

  it('refuses login when the email has not been verified', async () => {
    const prisma = createPrisma({
      user: {
        findUnique: vi.fn().mockResolvedValue({ ...citizenUser, emailVerifiedAt: null }),
      },
    });
    const service = new AuthService(prisma as never, new TokenService());
    await expect(
      service.login({ email: 'citizen@localhost', password: 'ForestWatch!dev', clientChannel: 'mobile' }, {}),
    ).rejects.toMatchObject({ errorCode: 'EMAIL_NOT_VERIFIED' });
  });

  it('issues access and refresh tokens for a verified user', async () => {
    const prisma = createPrisma({
      user: { findUnique: vi.fn().mockResolvedValue(citizenUser) },
      session: {
        create: vi.fn().mockResolvedValue({
          id: '33333333-3333-4333-8333-333333333333',
        }),
      },
    });
    const service = new AuthService(prisma as never, new TokenService());
    const issued = await service.login(
      { email: 'citizen@localhost', password: 'ForestWatch!dev', clientChannel: 'mobile' },
      {},
    );
    expect(issued.body.accessToken).toEqual(expect.any(String));
    expect(issued.refreshToken).toEqual(expect.any(String));
    expect(issued.body.user.roles).toEqual(['CITIZEN']);
    expect(issued.body.refreshToken).toBe(issued.refreshToken);
  });

  it('omits the refresh token from the web login body', async () => {
    const prisma = createPrisma({
      user: { findUnique: vi.fn().mockResolvedValue(citizenUser) },
      session: {
        create: vi.fn().mockResolvedValue({
          id: '33333333-3333-4333-8333-333333333333',
        }),
      },
    });
    const service = new AuthService(prisma as never, new TokenService());
    const issued = await service.login(
      { email: 'citizen@localhost', password: 'ForestWatch!dev', clientChannel: 'web' },
      {},
    );
    expect(issued.body.refreshToken).toBeUndefined();
    expect(issued.refreshToken).toEqual(expect.any(String));
  });

  it('rejects a reused refresh token after rotation', async () => {
    const prisma = createPrisma({
      session: {
        findUnique: vi.fn().mockResolvedValue({
          id: '44444444-4444-4444-8444-444444444444',
          revokedAt: new Date(),
          expiresAt: new Date(Date.now() + 60_000),
          user: citizenUser,
        }),
      },
    });
    const service = new AuthService(prisma as never, new TokenService());
    await expect(
      service.refresh({ clientChannel: 'mobile' }, 'this-is-a-refresh-token-value', {}),
    ).rejects.toBeInstanceOf(ApiException);
  });

  it('persists an allowed locale on the signed-in account', async () => {
    const update = vi.fn().mockResolvedValue({ ...citizenUser, locale: 'si' });
    const prisma = createPrisma({ user: { update } });
    const service = new AuthService(prisma as never, new TokenService());
    const result = await service.updateMe(
      {
        id: citizenUser.id,
        email: citizenUser.email,
        roles: ['CITIZEN'],
        sessionId: '33333333-3333-4333-8333-333333333333',
      },
      { locale: 'si' },
    );
    expect(result.locale).toBe('si');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: citizenUser.id },
        data: { locale: 'si' },
      }),
    );
  });
});

function createPrisma(overrides: Record<string, unknown>) {
  const prisma: Record<string, unknown> = {
    user: {},
    role: {},
    userRole: {},
    session: {},
    emailVerificationToken: {},
    passwordResetToken: {},
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (client: unknown) => unknown)(prisma);
      }
      return Promise.all(arg as Promise<unknown>[]);
    }),
    ...overrides,
  };
  return prisma;
}
