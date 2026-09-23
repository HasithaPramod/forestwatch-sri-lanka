import type { MeDashboard, OfficerDashboard } from '@forestwatch/types';
import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Button, Card, Hero, Loading, Muted, Screen, StatGrid, StatTile } from '@/components/ui';
import { Text } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';
import { errorMessage } from '@/lib/errors';
import { canVerifyRecords } from '@/lib/permissions';

export default function DashboardScreen() {
  const { client, user, ready } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [me, setMe] = useState<MeDashboard | null>(null);
  const [officer, setOfficer] = useState<OfficerDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !user) {
      setMe(null);
      setOfficer(null);
      return;
    }
    const tasks: Array<Promise<unknown>> = [client.meDashboard().then(setMe)];
    if (canVerifyRecords(user)) {
      tasks.push(client.officerDashboard().then(setOfficer));
    }
    void Promise.all(tasks).then(
      () => setError(null),
      (caught: unknown) => setError(errorMessage(caught, 'Could not load dashboard')),
    );
  }, [client, ready, user]);

  return (
    <Screen>
      <Hero
        eyebrow={t('dashboard.title')}
        title={user ? t('dashboard.greeting', { name: user.displayName }) : t('dashboard.title')}
      >
        <Text lightColor="#cfe0c4" darkColor="#cfe0c4" style={styles.heroBody}>
          {t('mobile.dashboardIntro')}
        </Text>
        {user && me?.forestQuest.available ? (
          <Text lightColor="#f3eee2" darkColor="#f3eee2" style={styles.heroMeta}>
            {me.forestQuest.displayTitle}
            {' · '}
            {t('dashboard.levelXp', { level: me.forestQuest.level, xp: me.forestQuest.confirmedXp })}
          </Text>
        ) : null}
      </Hero>
      {!ready ? <Loading label={t('common.loading')} /> : null}
      {ready && !user ? (
        <Link href="/login">
          <Text style={styles.link}>{t('auth.signIn')}</Text>
        </Link>
      ) : null}
      {error ? <Muted>{error}</Muted> : null}
      {me ? (
        <>
          <Text style={styles.section}>{t('dashboard.myContributions')}</Text>
          <StatGrid>
            <StatTile label={t('dashboard.myPlantations')} value={String(me.plantations)} />
            <StatTile label={t('dashboard.myMonitoring')} value={String(me.monitoringUpdates)} />
            <StatTile label={t('dashboard.myReports')} value={String(me.reports)} />
            <StatTile label={t('dashboard.unread')} value={String(me.unreadNotifications)} />
          </StatGrid>
          {me.forestQuest.available ? (
            <Link href="/(tabs)/quest">
              <Card inset>
                <Muted>{t('forestquest.title')}</Muted>
                <Text style={styles.questTitle}>{me.forestQuest.displayTitle}</Text>
                <Muted>
                  {t('dashboard.levelXp', { level: me.forestQuest.level, xp: me.forestQuest.confirmedXp })}
                  {' · '}
                  {t('forestquest.ecoPoints')}: {String(me.forestQuest.ecoPoints)}
                </Muted>
                <Muted>
                  {t('forestquest.forestDexProgress', {
                    discovered: me.forestQuest.forestDex.discoveredCount,
                    catalogue: me.forestQuest.forestDex.catalogueCount,
                  })}
                </Muted>
                <Text style={styles.link}>{t('forestquest.openProfile')}</Text>
              </Card>
            </Link>
          ) : (
            <Muted>{t('dashboard.questNotConnected')}</Muted>
          )}
        </>
      ) : null}
      {officer ? (
        <>
          <Text style={styles.section}>{t('dashboard.officerOps')}</Text>
          <StatGrid>
            <StatTile label={t('dashboard.pendingPlantation')} value={String(officer.pendingPlantationReviews)} />
            <StatTile label={t('dashboard.openReports')} value={String(officer.openReports)} />
          </StatGrid>
          <Button label={t('dashboard.reviewQueue')} onPress={() => router.push('/review')} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  heroMeta: {
    fontSize: 15,
    fontWeight: '700',
  },
  questTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  section: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  link: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f4d3a',
  },
});
