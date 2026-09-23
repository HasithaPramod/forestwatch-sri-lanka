import type { PublicImpactStats } from '@forestwatch/types';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Card, Heading, Loading, Muted, Screen } from '@/components/ui';
import { Text } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';
import { errorMessage } from '@/lib/errors';

export default function ImpactScreen() {
  const { client, ready } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState<PublicImpactStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) {
      return;
    }
    void client
      .publicImpact()
      .then((page) => {
        setStats(page);
        setError(null);
      })
      .catch((caught: unknown) => setError(errorMessage(caught, 'Could not load impact')));
  }, [client, ready]);

  return (
    <Screen>
      <Heading>{t('impact.title')}</Heading>
      <Muted>{t('mobile.impactIntro')}</Muted>
      {!ready ? <Loading label={t('impact.loading')} /> : null}
      {error ? <Muted>{error}</Muted> : null}
      {stats ? (
        <>
          <Card>
            <Muted>{t('impact.treesRecorded')}</Muted>
            <Text style={{ fontSize: 22, fontWeight: '700' }}>{stats.treesRecorded.toLocaleString('en-LK')}</Text>
          </Card>
          <Card>
            <Muted>{t('home.verifiedSites')}</Muted>
            <Text style={{ fontSize: 22, fontWeight: '700' }}>{String(stats.plantationSites)}</Text>
          </Card>
          <Card>
            <Muted>{t('impact.estimatedSurviving')}</Muted>
            <Text style={{ fontSize: 22, fontWeight: '700' }}>
              {stats.estimatedSurvivingTrees == null ? '—' : stats.estimatedSurvivingTrees.toLocaleString('en-LK')}
            </Text>
          </Card>
          <Card>
            <Muted>{t('impact.verifiedMonitoring')}</Muted>
            <Text style={{ fontSize: 22, fontWeight: '700' }}>{String(stats.verifiedMonitoringUpdates)}</Text>
          </Card>
        </>
      ) : null}
      <Link href="/dashboard">
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#1f4d3a' }}>{t('nav.dashboard')}</Text>
      </Link>
    </Screen>
  );
}
