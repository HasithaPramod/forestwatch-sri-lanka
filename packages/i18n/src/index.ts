import type { AppLocale } from '@forestwatch/types';
import { DEFAULT_APP_LOCALE, parseAppLocale } from '@forestwatch/types';
import en from './locales/en.json';
import si from './locales/si.json';
import ta from './locales/ta.json';

export const LOCALE_STORAGE_KEY = 'forestwatch.locale';

export const NAV_ITEMS = [
  { href: '/', labelKey: 'nav.home' },
  { href: '/map', labelKey: 'nav.map' },
  { href: '/campaigns', labelKey: 'nav.campaigns' },
  { href: '/impact', labelKey: 'nav.impact' },
  { href: '/about', labelKey: 'nav.about' },
] as const;

export const ACCOUNT_NAV_ITEMS = [{ href: '/dashboard', labelKey: 'nav.dashboard' }] as const;

type MessageNode = string | { [key: string]: MessageNode };

const dictionaries: Record<AppLocale, MessageNode> = {
  en: en as MessageNode,
  si: si as MessageNode,
  ta: ta as MessageNode,
};

export function flattenMessageKeys(tree: MessageNode, prefix = ''): string[] {
  if (typeof tree === 'string') {
    return prefix ? [prefix] : [];
  }
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return flattenMessageKeys(value, path);
  });
}

function lookup(tree: MessageNode, key: string): string | undefined {
  const parts = key.split('.');
  let current: MessageNode | undefined = tree;
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = current[part];
  }
  return typeof current === 'string' ? current : undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const value = vars[name];
    return value === undefined ? `{${name}}` : String(value);
  });
}

export function t(locale: string, key: string, vars?: Record<string, string | number>): string {
  const resolved = parseAppLocale(locale);
  const raw =
    lookup(dictionaries[resolved], key) ??
    (resolved === DEFAULT_APP_LOCALE ? undefined : lookup(dictionaries[DEFAULT_APP_LOCALE], key)) ??
    key;
  return interpolate(raw, vars);
}

export function catalogueName(
  locale: string,
  names: { en: string; si?: string | null; ta?: string | null },
): string {
  const resolved = parseAppLocale(locale);
  if (resolved === 'si' && names.si?.trim()) {
    return names.si;
  }
  if (resolved === 'ta' && names.ta?.trim()) {
    return names.ta;
  }
  return names.en;
}

export { dictionaries };
