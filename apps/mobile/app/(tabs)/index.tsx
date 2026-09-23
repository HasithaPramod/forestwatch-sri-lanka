import type { PlantationSummary } from '@forestwatch/types';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Card, Heading, Loading, Muted, Screen } from '@/components/ui';
import { Text } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';
import { errorMessage } from '@/lib/errors';
import { formatRecordedTrees } from '@/lib/format';
import { useOffline } from '@/lib/offline-context';
import { listCachedPlantations, upsertCachedPlantations } from '@/lib/offline-store';

export default function HomeScreen() {
  const { client, ready } = useAuth();
  const { t } = useI18n();
  const { pendingCount } = useOffline();
  const [items, setItems] = useState<PlantationSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    if (!ready) {
      return;
    }
    void client
      .listPlantations({ verificationStatus: 'VERIFIED', limit: 20 })
      .then((page) => {
        setItems(page.items);
        setCached(false);
        setError(null);
        void upsertCachedPlantations(page.items);
      })
      .catch(async (caught: unknown) => {
        const local = await listCachedPlantations();
        setItems(local);
        setCached(local.length > 0);
        setError(
          local.length > 0
            ? `${errorMessage(caught, 'Network unavailable')}. Showing cached plantations. Distances are not computed on device.`
            : errorMessage(caught, 'Could not load plantations'),
        );
      });
  }, [client, ready]);

  return (
    <Screen>
      <Muted>{t('mobile.homeMuted')}</Muted>
      <Heading>{t('mobile.homeHeading')}</Heading>
      <Muted>{t('mobile.homeBody')}</Muted>
      {pendingCount > 0 ? (
        <Link href="/queue">
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1f4d3a' }}>
            {pendingCount === 1
              ? t('mobile.pendingOne', { count: pendingCount })
              : t('mobile.pendingMany', { count: pendingCount })}
          </Text>
        </Link>
      ) : null}
      {!ready ? <Loading label="Loading plantations…" /> : null}
      {error ? <Muted>{error}</Muted> : null}
      {cached ? <Muted>Cached copy.</Muted> : null}
      {items.map((item) => (
        <Link key={item.id} href={`/plantation/${item.id}`}>
          <Card>
            <Muted>{item.verificationStatus}</Muted>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>{item.name}</Text>
            <Muted>
              {formatRecordedTrees(item.treeCount)}
              {item.districtCode ? ` · ${item.districtCode}` : ''}
            </Muted>
          </Card>
        </Link>
      ))}
      {ready && items.length === 0 && !error ? <Muted>No verified plantations are visible yet.</Muted> : null}
    </Screen>
  );
}
