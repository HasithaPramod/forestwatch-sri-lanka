import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ApiException } from '../common/http/api-exception';
import { TokenService } from './token.service';
import type { RequestUser } from './types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(protected readonly tokens: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    this.authenticate(this.request(context), false);
    return true;
  }

  protected authenticate(request: Request & { user?: RequestUser }, optional: boolean): void {
    const header = request.headers.authorization;
    if (!header) {
      if (optional) {
        return;
      }
      throw new ApiException(401, 'UNAUTHORIZED', 'Authentication required');
    }

    if (!header.startsWith('Bearer ')) {
      throw new ApiException(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const claims = this.tokens.verifyAccessToken(header.slice('Bearer '.length));
    request.user = {
      id: claims.sub,
      email: claims.email,
      roles: claims.roles,
      sessionId: claims.sid,
    };
  }

  protected request(context: ExecutionContext): Request & { user?: RequestUser } {
    return context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
  }
}

@Injectable()
export class OptionalJwtAuthGuard extends JwtAuthGuard {
  override canActivate(context: ExecutionContext): boolean {
    this.authenticate(this.request(context), true);
    return true;
  }
}
