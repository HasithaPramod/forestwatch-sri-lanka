import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RolesGuard } from './roles.guard';
import type { RequestUser } from './types';
import { ROLES_KEY } from './roles.decorator';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: vi.fn(),
  };

  beforeEach(() => {
    reflector.getAllAndOverride.mockReset();
  });

  it('allows a handler with no required roles', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const guard = new RolesGuard(reflector as never);
    expect(guard.canActivate(contextWithUser({ roles: ['CITIZEN'] }))).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, expect.any(Array));
  });

  it('rejects a citizen from an admin route', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN', 'SUPER_ADMIN']);
    const guard = new RolesGuard(reflector as never);
    expect(() => guard.canActivate(contextWithUser({ roles: ['CITIZEN'] }))).toThrow(/Insufficient role/);
  });

  it('allows an admin when ADMIN is required', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN', 'SUPER_ADMIN']);
    const guard = new RolesGuard(reflector as never);
    expect(guard.canActivate(contextWithUser({ roles: ['ADMIN'] }))).toBe(true);
  });
});

function contextWithUser(user: Partial<RequestUser>) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          id: '11111111-1111-4111-8111-111111111111',
          email: 'user@localhost',
          sessionId: '22222222-2222-4222-8222-222222222222',
          roles: ['CITIZEN'],
          ...user,
        },
      }),
    }),
  } as never;
}
