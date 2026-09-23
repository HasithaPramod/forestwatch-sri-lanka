import { AUTH_RATE_LIMIT } from '@forestwatch/config';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ApiException } from '../common/http/api-exception';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, number[]>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip ?? request.socket.remoteAddress ?? 'unknown';
    const key = `${ip}:${request.method}:${request.path}`;
    const now = Date.now();
    const windowStart = now - AUTH_RATE_LIMIT.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((stamp) => stamp > windowStart);

    if (recent.length >= AUTH_RATE_LIMIT.limit) {
      throw new ApiException(429, 'RATE_LIMITED', 'Too many attempts. Try again later.');
    }

    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }
}
