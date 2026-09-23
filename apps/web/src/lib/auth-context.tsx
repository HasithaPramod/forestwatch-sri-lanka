'use client';

import { ForestWatchApiClient, ForestWatchApiError } from '@forestwatch/api-client';
import type { AppLocale, PublicUser, RegisterResult } from '@forestwatch/types';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { publicApiUrl } from '@/lib/public-api';

const ACCESS_TOKEN_KEY = 'forestwatch.accessToken';

type AuthContextValue = {
  user: PublicUser | null;
  ready: boolean;
  client: ForestWatchApiClient;
  login: (email: string, password: string) => Promise<PublicUser>;
  register: (input: {
    email: string;
    password: string;
    displayName: string;
    locale?: AppLocale;
  }) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  replaceUser: (user: PublicUser) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [ready, setReady] = useState(false);
  const accessTokenRef = useRef<string | undefined>(undefined);

  const client = useMemo(
    () =>
      new ForestWatchApiClient({
        baseUrl: publicApiUrl,
        credentials: 'include',
        getAccessToken: () => accessTokenRef.current,
      }),
    [],
  );

  const persistToken = useCallback((token: string | undefined) => {
    accessTokenRef.current = token;
    if (typeof window === 'undefined') {
      return;
    }
    if (token) {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  }, []);

  const applyUser = useCallback(
    (next: PublicUser | null, token?: string) => {
      setUser(next);
      persistToken(token);
    },
    [persistToken],
  );

  useEffect(() => {
    const stored = sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? undefined;
    accessTokenRef.current = stored;

    let cancelled = false;
    void (async () => {
      try {
        const session = await client.refresh({ clientChannel: 'web' });
        if (!cancelled) {
          applyUser(session.user, session.accessToken);
        }
      } catch {
        if (stored) {
          try {
            const me = await client.me();
            if (!cancelled) {
              applyUser(me, stored);
            }
          } catch {
            if (!cancelled) {
              applyUser(null);
            }
          }
        } else if (!cancelled) {
          applyUser(null);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyUser, client]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      client,
      async login(email, password) {
        const session = await client.login({ email, password, clientChannel: 'web' });
        applyUser(session.user, session.accessToken);
        return session.user;
      },
      async register(input) {
        return client.register(input);
      },
      async logout() {
        try {
          await client.logout({ clientChannel: 'web' });
        } finally {
          applyUser(null);
        }
      },
      async logoutAll() {
        try {
          await client.logoutAll();
        } finally {
          applyUser(null);
        }
      },
      replaceUser(next) {
        setUser(next);
      },
    }),
    [applyUser, client, ready, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return value;
}

export function isAuthError(error: unknown): error is ForestWatchApiError {
  return (
    error instanceof ForestWatchApiError ||
    (typeof error === 'object' && error !== null && 'name' in error && error.name === 'ForestWatchApiError')
  );
}
