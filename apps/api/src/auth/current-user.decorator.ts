import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { ApiException } from '../common/http/api-exception';
import type { RequestUser } from './types';

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): RequestUser => {
  const request = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
  if (!request.user) {
    throw new ApiException(401, 'UNAUTHORIZED', 'Authentication required');
  }
  return request.user;
});

export const OptionalUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestUser | undefined => {
    const request = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    return request.user;
  },
);
