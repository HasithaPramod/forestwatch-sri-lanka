import type { MapPlantationMarker } from '@forestwatch/types';
import { useCallback, useEffect, useState } from 'react';
import { FieldMap } from '@/components/FieldMap';
import { MarkerList } from '@/components/MarkerList';
import { Button, Heading, Loading, Muted, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import { errorMessage } from '@/lib/errors';
import { isInSriLanka, mapBboxForFix } from '@/lib/geo';
import { requestDeviceFix, type DeviceFix } from '@/lib/location';
import { listCachedPlantations } from '@/lib/offline-store';

export default function MapScreen() {
  const { client, ready } = useAuth();
  const [fix, setFix] = useState<DeviceFix | null>(null);
  const [items, setItems] = useState<MapPlantationMarker[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (nextFix: DeviceFix | null) => {
      if (!ready) {
        return;
      }
      setLoading(true);
      try {
        const page = await client.listMapPlantations({ bbox: mapBboxForFix(nextFix), limit: 200 });
        setItems(page.items);
        setError(null);
        if (!nextFix) {
          setNote('Device GPS was not available. The map uses the national Sri Lanka bounding box instead of a fake location.');
        } else if (!isInSriLanka(nextFix.latitude, nextFix.longitude)) {
          setNote('Device GPS is outside Sri Lanka. The map uses the national bounding box rather than inventing a local point.');
        } else {
          setNote(`Viewport is centred on device GPS (${nextFix.latitude.toFixed(4)}, ${nextFix.longitude.toFixed(4)}).`);
        }
      } catch (caught: unknown) {
        const cached = await listCachedPlantations();
        setItems(
          cached.map((item) => ({
            id: item.id,
            name: item.name,
            type: item.type,
            verificationStatus: item.verificationStatus,
            coordinates: item.coordinates,
            treeCount: item.treeCount,
            campaign: item.campaign,
            coverThumbnailUrl: item.coverImage?.thumbnailUrl ?? null,
          })),
        );
        setError(
          cached.length > 0
            ? `${errorMessage(caught, 'Network unavailable')}. Showing cached sites. Distances are not computed on device.`
            : errorMessage(caught, 'Could not load map markers'),
        );
      } finally {
        setLoading(false);
      }
    },
    [client, ready],
  );

  useEffect(() => {
    if (!ready) {
      return;
    }
    void (async () => {
      const nextFix = await requestDeviceFix();
      setFix(nextFix);
      await load(nextFix);
    })();
  }, [load, ready]);

  return (
    <Screen>
      <Heading>Map</Heading>
      <Muted>Markers come from GET /map/plantations for the current bbox. This is not a dump of every plantation.</Muted>
      <Button
        label="Refresh with GPS"
        onPress={() => {
          void (async () => {
            const nextFix = await requestDeviceFix();
            setFix(nextFix);
            await load(nextFix);
          })();
        }}
      />
      {note ? <Muted>{note}</Muted> : null}
      {error ? <Muted>{error}</Muted> : null}
      {loading ? <Loading label="Loading map…" /> : null}
      <FieldMap items={items} userFix={fix} />
      <MarkerList items={items} />
    </Screen>
  );
}
