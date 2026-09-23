import type { AuthenticatedRole } from '@forestwatch/types';
import { AUTHENTICATED_ROLES } from '@forestwatch/types';

export { AUTHENTICATED_ROLES };

const ROLE_RANK: Record<AuthenticatedRole, number> = {
  CITIZEN: 1,
  VOLUNTEER: 2,
  ORGANIZATION_MANAGER: 3,
  FOREST_OFFICER: 4,
  ADMIN: 5,
  SUPER_ADMIN: 6,
};

export function hasRole(
  roles: readonly AuthenticatedRole[],
  required: AuthenticatedRole,
): boolean {
  return roles.includes(required);
}

export function hasAnyRole(
  roles: readonly AuthenticatedRole[],
  required: readonly AuthenticatedRole[],
): boolean {
  return required.some((role) => roles.includes(role));
}

export function isOfficer(roles: readonly AuthenticatedRole[]): boolean {
  return hasAnyRole(roles, ['FOREST_OFFICER', 'ADMIN', 'SUPER_ADMIN']);
}

export function isAdmin(roles: readonly AuthenticatedRole[]): boolean {
  return hasAnyRole(roles, ['ADMIN', 'SUPER_ADMIN']);
}

export function highestRole(roles: readonly AuthenticatedRole[]): AuthenticatedRole | undefined {
  if (roles.length === 0) {
    return undefined;
  }

  return roles.reduce((current, role) =>
    ROLE_RANK[role] > ROLE_RANK[current] ? role : current,
  );
}

export { generateOpaqueToken, hashToken, tokenHashesMatch } from './tokens';
