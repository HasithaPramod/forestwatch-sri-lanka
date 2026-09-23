import { Link } from 'expo-router';
import { Button, Heading, Loading, Muted, Screen } from '@/components/ui';
import { Text } from '@/components/Themed';
import { LanguagePicker } from '@/components/language-picker';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';
import { errorMessage } from '@/lib/errors';
import { canVerifyRecords } from '@/lib/permissions';
import { useState } from 'react';

export default function ProfileScreen() {
  const { user, ready, logout } = useAuth();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!ready) {
    return (
      <Screen>
        <Loading label={t('mobile.restoring')} />
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen>
        <Heading>{t('mobile.profile')}</Heading>
        <Muted>{t('mobile.guestBody')}</Muted>
        <LanguagePicker />
        <Link href="/login">
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1f4d3a' }}>{t('nav.login')}</Text>
        </Link>
      </Screen>
    );
  }

  return (
    <Screen>
      <Heading>{user.displayName}</Heading>
      <Muted>{user.email}</Muted>
      <Muted>
        {t('common.roles')}: {user.roles.join(', ')}
      </Muted>
      <LanguagePicker />
      <Muted>{t('mobile.tokensNote')}</Muted>
      {canVerifyRecords(user) ? (
        <Link href="/review">
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1f4d3a' }}>{t('mobile.reviewQueue')}</Text>
        </Link>
      ) : null}
      <Link href="/reports">
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#1f4d3a' }}>{t('mobile.reportsInbox')}</Text>
      </Link>
      <Link href="/notifications">
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#1f4d3a' }}>{t('mobile.notifications')}</Text>
      </Link>
      <Link href="/dashboard">
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#1f4d3a' }}>{t('mobile.dashboard')}</Text>
      </Link>
      <Link href="/impact">
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#1f4d3a' }}>{t('mobile.impact')}</Text>
      </Link>
      <Link href="/search">
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#1f4d3a' }}>{t('mobile.search')}</Text>
      </Link>
      <Link href="/queue">
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#1f4d3a' }}>{t('mobile.offlineQueue')}</Text>
      </Link>
      {error ? <Muted>{error}</Muted> : null}
      <Button
        label={pending ? t('mobile.signingOut') : t('mobile.signOut')}
        disabled={pending}
        onPress={() => {
          setPending(true);
          setError(null);
          void logout()
            .catch((caught: unknown) => setError(errorMessage(caught, 'Could not sign out')))
            .finally(() => setPending(false));
        }}
      />
    </Screen>
  );
}
