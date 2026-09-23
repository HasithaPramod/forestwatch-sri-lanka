import type { NearbyPlantation } from '@forestwatch/types';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Button, Card, Heading, Loading, Muted, Screen } from '@/components/ui';
import { Text } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';
import { errorMessage } from '@/lib/errors';
import { formatDistanceMeters, formatRecordedTrees } from '@/lib/format';
import { isInSriLanka } from '@/lib/geo';
import { requestDeviceFix } from '@/lib/location';

export default function NearbyScreen() {
  const { client, ready } = useAuth();
  const [items, setItems] = useState<NearbyPlantation[]>([]);
  const [meta, setMeta] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const search = () => {
    if (!ready) {
      return;
    }
    setLoading(true);
    setError(null);
    void (async () => {
      const fix = await requestDeviceFix();
      if (!fix) {
        setItems([]);
        setMeta(null);
        setError('Location permission is required for nearby search. Coordinates are not invented.');
        setLoading(false);
        return;
      }
      if (!isInSriLanka(fix.latitude, fix.longitude)) {
        setItems([]);
        setMeta(null);
        setError(
          `Device GPS (${fix.latitude.toFixed(4)}, ${fix.longitude.toFixed(4)}) is outside Sri Lanka. Nearby search is not simulated.`,
        );
        setLoading(false);
        return;
      }
      try {
        const page = await client.listNearbyPlantations({
          lat: fix.latitude,
          lng: fix.longitude,
        });
        setItems(page.items);
        setMeta(
          `${page.meta.returned} sites within ${(page.meta.radiusMeters / 1000).toFixed(1)} km of ${page.meta.latitude.toFixed(4)}, ${page.meta.longitude.toFixed(4)}. Distances are PostGIS metres.`,
        );
      } catch (caught: unknown) {
        setItems([]);
        setMeta(null);
        setError(
          `${errorMessage(caught, 'Could not load nearby plantations')}. Nearby is not computed from the SQLite cache.`,
        );
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <Screen>
      <Heading>Nearby</Heading>
      <Muted>
        This list is GPS → NestJS → PostGIS. The app does not compute distance on device and does not invent a nearby
        result.
      </Muted>
      <Button label={loading ? 'Locating…' : 'Use device GPS'} disabled={!ready || loading} onPress={search} />
      {loading ? <Loading label="Asking PostGIS…" /> : null}
      {meta ? <Muted>{meta}</Muted> : null}
      {error ? <Muted>{error}</Muted> : null}
      {items.map((item) => (
        <Link key={item.id} href={`/plantation/${item.id}`}>
          <Card>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>{item.name}</Text>
            <Muted>
              {formatDistanceMeters(item.distanceMeters)} away · {formatRecordedTrees(item.treeCount)}
            </Muted>
          </Card>
        </Link>
      ))}
    </Screen>
  );
}
