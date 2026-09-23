import type { AuthenticatedRole } from '@forestwatch/types';
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: AuthenticatedRole[]) => SetMetadata(ROLES_KEY, roles);
