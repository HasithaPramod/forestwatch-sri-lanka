import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, ErrorText, Field, Heading, Muted, Screen } from '@/components/ui';
import { LanguagePicker } from '@/components/language-picker';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';
import { errorMessage } from '@/lib/errors';

export default function LoginScreen() {
  const { login } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <Screen>
      <Heading>{t('auth.loginTitle')}</Heading>
      <Muted>{t('mobile.loginMuted')}</Muted>
      <LanguagePicker />
      <Field
        label={t('common.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <Field
        label={t('common.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
      />
      <ErrorText>{error}</ErrorText>
      <Button
        label={pending ? t('auth.signingIn') : t('auth.signIn')}
        disabled={pending}
        onPress={() => {
          setPending(true);
          setError(null);
          void login(email.trim(), password)
            .then(() => router.replace('/(tabs)/profile'))
            .catch((caught: unknown) => setError(errorMessage(caught, 'Sign-in failed')))
            .finally(() => setPending(false));
        }}
      />
    </Screen>
  );
}
