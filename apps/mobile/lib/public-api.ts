import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { resolvePublicApiUrl } from '@/lib/api-url';

export const publicApiUrl = resolvePublicApiUrl(
  process.env.EXPO_PUBLIC_API_URL,
  Constants.expoConfig?.hostUri,
  Platform.OS,
);
