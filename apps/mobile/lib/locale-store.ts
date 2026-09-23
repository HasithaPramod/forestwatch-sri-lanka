import { LOCALE_STORAGE_KEY } from '@forestwatch/i18n';
import { parseAppLocale, type AppLocale } from '@forestwatch/types';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

async function read(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

async function write(key: string, value: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (value) {
      globalThis.localStorage?.setItem(key, value);
    } else {
      globalThis.localStorage?.removeItem(key);
    }
    return;
  }
  if (value) {
    await SecureStore.setItemAsync(key, value);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function loadStoredLocale(): Promise<AppLocale> {
  return parseAppLocale(await read(LOCALE_STORAGE_KEY));
}

export async function persistLocale(locale: AppLocale): Promise<void> {
  await write(LOCALE_STORAGE_KEY, locale);
}
