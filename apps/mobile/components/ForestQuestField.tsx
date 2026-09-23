import type { ForestQuestProfile, MissionItem, NearbyPlantation, PlantationDiscoveryList } from '@forestwatch/types';
import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { FieldMap } from '@/components/FieldMap';
import { Button, Card, Heading, Loading, Muted } from '@/components/ui';
import { Text } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';
import { errorMessage } from '@/lib/errors';
import { FIELD_NEARBY_METERS, FIELD_ON_SITE_METERS, fieldProximityBand } from '@/lib/field';
import { formatDistanceMeters } from '@/lib/format';
import { isInSriLanka } from '@/lib/geo';
import { useI18n } from '@/lib/i18n-context';
import { requestDeviceFix } from '@/lib/location';

function proximityLabel(distanceMeters: number, t: (key: string) => string): string {
  const band = fieldProximityBand(distanceMeters);
  if (band === 'ON_SITE') {
    return t('forestquest.onSite');
  }
  if (band === 'NEARBY') {
    return t('forestquest.nearbyBand');
  }
  return t('forestquest.remoteBand');
}

function proximityHint(distanceMeters: number, t: (key: string) => string): string {
  const band = fieldProximityBand(distanceMeters);
  if (band === 'ON_SITE') {
    return t('forestquest.onSiteHint');
  }
  if (band === 'NEARBY') {
    return t('forestquest.nearbyHint');
  }
  return t('forestquest.remoteHint');
}

export function ForestQuestField({
  profile,
  discoveries,
  mission,
}: {
  profile: ForestQuestProfile | null;
  discoveries: PlantationDiscoveryList | null;
  mission: MissionItem | null;
}) {
  const { client, ready } = useAuth();
  const { t } = useI18n();
  const [you, setYou] = useState<{ latitude: number; longitude: number } | null>(null);
  const [nearby, setNearby] = useState<NearbyPlantation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const visitedIds = new Set(discoveries?.items.map((row) => row.plantationId) ?? []);

  const locate = () => {
    if (!ready) {
      return;
    }
    setLocating(true);
    setError(null);
    void (async () => {
      const fix = await requestDeviceFix();
      if (!fix) {
        setYou(null);
        setNearby([]);
        setError(t('forestquest.locationDenied'));
        setLocating(false);
        return;
      }
      if (!isInSriLanka(fix.latitude, fix.longitude)) {
        setYou(null);
        setNearby([]);
        setError(t('forestquest.locationDenied'));
        setLocating(false);
        return;
      }
      try {
        const page = await client.listNearbyPlantations({
          lat: fix.latitude,
          lng: fix.longitude,
        });
        setYou({ latitude: fix.latitude, longitude: fix.longitude });
        setNearby(page.items);
        setError(null);
      } catch (caught: unknown) {
        setYou({ latitude: fix.latitude, longitude: fix.longitude });
        setNearby([]);
        setError(errorMessage(caught, t('forestquest.locationDenied')));
      } finally {
        setLocating(false);
      }
    })();
  };

  return (
    <>
      <Heading>{t('forestquest.field')}</Heading>
      <Muted>{t('forestquest.fieldIntro')}</Muted>
      {profile ? (
        <Card>
          <Muted>{t('forestquest.displayTitle')}</Muted>
          <Text style={styles.hud}>{profile.displayTitle}</Text>
          <Muted>
            {t('forestquest.confirmedXp')}: {String(profile.confirmedXp)}
          </Muted>
          <Muted>
            {t('forestquest.ecoPoints')}: {String(profile.ecoPoints)}
          </Muted>
          <Muted>
            {t('forestquest.forestDexProgress', {
              discovered: profile.forestDex.discoveredCount,
              catalogue: profile.forestDex.catalogueCount,
            })}
          </Muted>
        </Card>
      ) : null}
      {mission ? (
        <Muted>
          {t('forestquest.activeMission')}: {mission.title} ·{' '}
          {t('forestquest.taskProgress', {
            current: mission.completedTasks,
            required: mission.totalTasks,
          })}
        </Muted>
      ) : null}
      <Button
        label={locating ? t('forestquest.locating') : t('forestquest.shareLocation')}
        disabled={!ready || locating}
        onPress={locate}
      />
      {locating ? <Loading label={t('forestquest.locating')} /> : null}
      {error ? <Muted>{error}</Muted> : null}
      <FieldMap
        items={nearby}
        userFix={you}
        onSiteMeters={FIELD_ON_SITE_METERS}
        nearbyMeters={FIELD_NEARBY_METERS}
        visitedIds={visitedIds}
        zoomDelta={0.006}
      />
      <Muted>
        {t('forestquest.visitRange', {
          onSite: FIELD_ON_SITE_METERS,
          nearby: FIELD_NEARBY_METERS,
        })}
      </Muted>
      <Heading>{t('forestquest.sitesAroundYou')}</Heading>
      {!you ? <Muted>{t('forestquest.shareLocationHint')}</Muted> : null}
      {you && nearby.length === 0 ? <Muted>{t('forestquest.noNearbySites')}</Muted> : null}
      {nearby.map((row) => (
        <Link key={row.id} href={`/plantation/${row.id}`}>
          <Card>
            <Text style={styles.site}>{row.name}</Text>
            <Muted>
              {formatDistanceMeters(row.distanceMeters)} · {proximityLabel(row.distanceMeters, t)}
              {visitedIds.has(row.id) ? ` · ${t('forestquest.discovered')}` : ''}
            </Muted>
            <Muted>{proximityHint(row.distanceMeters, t)}</Muted>
          </Card>
        </Link>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  hud: {
    fontSize: 20,
    fontWeight: '700',
  },
  site: {
    fontSize: 16,
    fontWeight: '700',
  },
});
