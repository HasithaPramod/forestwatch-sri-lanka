import { ForestWatchApiClient } from '@forestwatch/api-client';
import type { PublicUser } from '@forestwatch/types';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { publicApiUrl } from '@/lib/public-api';
import { loadStoredTokens, persistTokens } from '@/lib/tokens';

type AuthContextValue = {
  user: PublicUser | null;
  ready: boolean;
  client: ForestWatchApiClient;
  login: (email: string, password: string) => Promise<PublicUser>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  replaceUser: (user: PublicUser) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [ready, setReady] = useState(false);
  const accessTokenRef = useRef<string | undefined>(undefined);
  const refreshTokenRef = useRef<string | undefined>(undefined);

  const client = useMemo(
    () =>
      new ForestWatchApiClient({
        baseUrl: publicApiUrl,
        credentials: 'omit',
        getAccessToken: () => accessTokenRef.current,
      }),
    [],
  );

  const applySession = useCallback(async (next: PublicUser | null, accessToken?: string, refreshToken?: string) => {
    accessTokenRef.current = accessToken;
    refreshTokenRef.current = refreshToken;
    setUser(next);
    await persistTokens(accessToken, refreshToken);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await loadStoredTokens();
      accessTokenRef.current = stored.accessToken;
      refreshTokenRef.current = stored.refreshToken;
      try {
        if (stored.refreshToken) {
          const session = await client.refresh({
            clientChannel: 'mobile',
            refreshToken: stored.refreshToken,
          });
          if (!cancelled) {
            await applySession(session.user, session.accessToken, session.refreshToken ?? stored.refreshToken);
          }
        } else if (stored.accessToken) {
          const me = await client.me();
          if (!cancelled) {
            await applySession(me, stored.accessToken, stored.refreshToken);
          }
        } else if (!cancelled) {
          await applySession(null);
        }
      } catch {
        if (!cancelled) {
          await applySession(null);
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
  }, [applySession, client]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      client,
      async login(email, password) {
        const session = await client.login({ email, password, clientChannel: 'mobile' });
        if (!session.refreshToken) {
          throw new Error('Mobile login did not return a refresh token');
        }
        await applySession(session.user, session.accessToken, session.refreshToken);
        return session.user;
      },
      async logout() {
        try {
          await client.logout({
            clientChannel: 'mobile',
            refreshToken: refreshTokenRef.current,
          });
        } finally {
          await applySession(null);
        }
      },
      async logoutAll() {
        try {
          await client.logoutAll();
        } finally {
          await applySession(null);
        }
      },
      replaceUser(next) {
        setUser(next);
      },
    }),
    [applySession, client, ready, user],
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
