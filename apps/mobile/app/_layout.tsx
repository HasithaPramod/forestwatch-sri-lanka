import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider } from '@/lib/auth-context';
import { I18nProvider, useI18n } from '@/lib/i18n-context';
import { OfflineProvider } from '@/lib/offline-context';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

function StackScreens() {
  const { t } = useI18n();

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: t('nav.login') }} />
      <Stack.Screen name="plantation/[id]" options={{ title: t('nav.plantations') }} />
      <Stack.Screen name="review" options={{ title: t('nav.review') }} />
      <Stack.Screen name="reports" options={{ title: t('nav.reports') }} />
      <Stack.Screen name="notifications" options={{ title: t('nav.notifications') }} />
      <Stack.Screen name="dashboard" options={{ title: t('nav.dashboard') }} />
      <Stack.Screen name="impact" options={{ title: t('nav.impact') }} />
      <Stack.Screen name="search" options={{ title: t('nav.search') }} />
      <Stack.Screen name="queue" options={{ title: t('mobile.offlineQueue') }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <I18nProvider>
          <OfflineProvider>
            <StackScreens />
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          </OfflineProvider>
        </I18nProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
