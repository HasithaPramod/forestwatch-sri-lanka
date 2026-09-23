import { hasAnyRole } from '@forestwatch/auth';
import type { AuthenticatedRole } from '@forestwatch/types';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ApiException } from '../common/http/api-exception';
import { ROLES_KEY } from './roles.decorator';
import type { RequestUser } from './types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AuthenticatedRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    if (!request.user) {
      throw new ApiException(401, 'UNAUTHORIZED', 'Authentication required');
    }

    if (!hasAnyRole(request.user.roles, required)) {
      throw new ApiException(403, 'FORBIDDEN', 'Insufficient role');
    }

    return true;
  }
}
