import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_KEY = 'forestwatch.accessToken';
const REFRESH_KEY = 'forestwatch.refreshToken';

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

export async function loadStoredTokens(): Promise<{ accessToken?: string; refreshToken?: string }> {
  const [accessToken, refreshToken] = await Promise.all([read(ACCESS_KEY), read(REFRESH_KEY)]);
  return {
    accessToken: accessToken ?? undefined,
    refreshToken: refreshToken ?? undefined,
  };
}

export async function persistTokens(accessToken?: string, refreshToken?: string): Promise<void> {
  await Promise.all([write(ACCESS_KEY, accessToken ?? null), write(REFRESH_KEY, refreshToken ?? null)]);
}
