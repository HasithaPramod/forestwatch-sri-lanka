import type { AppLocale, PublicUser } from '@forestwatch/types';
import { parseAppLocale } from '@forestwatch/types';
import { t } from '@forestwatch/i18n';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { loadStoredLocale, persistLocale } from '@/lib/locale-store';

type I18nContextValue = {
  locale: AppLocale;
  ready: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLocale: (locale: AppLocale) => Promise<void>;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { user, ready: authReady, client, replaceUser } = useAuth();
  const [locale, setLocaleState] = useState<AppLocale>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadStoredLocale().then((stored) => {
      if (!cancelled) {
        setLocaleState(stored);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authReady || !user) {
      return;
    }
    const next = parseAppLocale(user.locale);
    setLocaleState(next);
    void persistLocale(next);
  }, [authReady, user]);

  const setLocale = useCallback(
    async (next: AppLocale) => {
      if (user) {
        const updated: PublicUser = await client.updateMe({ locale: next });
        replaceUser(updated);
      }
      await persistLocale(next);
      setLocaleState(next);
    },
    [client, replaceUser, user],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      ready,
      t: (key, vars) => t(locale, key, vars),
      setLocale,
    }),
    [locale, ready, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return value;
}
