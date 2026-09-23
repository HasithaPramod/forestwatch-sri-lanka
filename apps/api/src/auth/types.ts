import type { AuthenticatedRole, AuthSession } from '@forestwatch/types';

export type RequestUser = {
  id: string;
  email: string;
  roles: AuthenticatedRole[];
  sessionId: string;
};

export type RequestMeta = {
  userAgent?: string;
  ipAddress?: string;
};

export type IssuedAuth = {
  body: AuthSession;
  refreshToken: string;
};
