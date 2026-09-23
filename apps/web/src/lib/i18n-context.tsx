'use client';

import type { AppLocale, PublicUser } from '@forestwatch/types';
import { parseAppLocale } from '@forestwatch/types';
import { LOCALE_STORAGE_KEY, t } from '@forestwatch/i18n';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';

type I18nContextValue = {
  locale: AppLocale;
  ready: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLocale: (locale: AppLocale) => Promise<void>;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function readStoredLocale(): AppLocale {
  if (typeof window === 'undefined') {
    return 'en';
  }
  return parseAppLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
}

function persistLocale(locale: AppLocale): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { user, ready: authReady, client, replaceUser } = useAuth();
  const [locale, setLocaleState] = useState<AppLocale>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLocaleState(readStoredLocale());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!authReady || !user) {
      return;
    }
    const next = parseAppLocale(user.locale);
    setLocaleState(next);
    persistLocale(next);
  }, [authReady, user]);

  const setLocale = useCallback(
    async (next: AppLocale) => {
      if (user) {
        const updated: PublicUser = await client.updateMe({ locale: next });
        replaceUser(updated);
      }
      persistLocale(next);
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

export function HtmlLang() {
  const { locale } = useI18n();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
