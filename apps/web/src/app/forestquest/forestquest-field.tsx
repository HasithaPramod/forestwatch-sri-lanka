'use client';

import { GEO_PROXIMITY_METERS, MAP } from '@forestwatch/config';
import { fieldProximityBand } from '@forestwatch/engagement';
import type {
  ForestQuestProfile,
  MapPlantationMarker,
  MissionItem,
  NearbyPlantation,
  PlantationDiscoveryList,
} from '@forestwatch/types';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { isAuthError, useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';
import { formatCount } from '@/lib/dashboards';
import { bboxAround, formatDistanceMeters, SRI_LANKA_VIEW, toLeafletMarkers } from '@/lib/map';

const PlantationLeaflet = dynamic(() => import('../map/plantation-leaflet').then((mod) => mod.PlantationLeaflet), {
  ssr: false,
  loading: () => <p className="p-6 text-cream/80">…</p>,
});

type Fix = { latitude: number; longitude: number };

function proximityLabel(
  band: ReturnType<typeof fieldProximityBand>,
  t: (key: string) => string,
): string {
  if (band === 'ON_SITE') {
    return t('forestquest.onSite');
  }
  if (band === 'NEARBY') {
    return t('forestquest.nearbyBand');
  }
  return t('forestquest.remoteBand');
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
  const [bbox, setBbox] = useState(SRI_LANKA_VIEW.initialBbox);
  const [you, setYou] = useState<Fix | null>(null);
  const [nearby, setNearby] = useState<NearbyPlantation[]>([]);
  const [mapItems, setMapItems] = useState<MapPlantationMarker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const visitedIds = useMemo(
    () => new Set(discoveries?.items.map((row) => row.plantationId) ?? []),
    [discoveries],
  );

  useEffect(() => {
    if (!ready) {
      return;
    }
    const handle = window.setTimeout(() => {
      void client
        .listMapPlantations({ bbox, verificationStatus: 'VERIFIED' })
        .then((page) => {
          setMapItems(page.items);
          setError(null);
        })
        .catch((caught: unknown) => {
          setError(isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Could not load field');
        });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [bbox, client, ready]);

  const markers = useMemo(() => {
    const fromNearby = nearby.length
      ? nearby.flatMap((item) => {
          const mapped = toLeafletMarkers([item]);
          return mapped.map((marker) => ({
            ...marker,
            visited: visitedIds.has(item.id),
            distanceLabel: `${formatDistanceMeters(item.distanceMeters)} · ${proximityLabel(fieldProximityBand(item.distanceMeters), t)}`,
          }));
        })
      : toLeafletMarkers(mapItems).map((marker) => ({
          ...marker,
          visited: visitedIds.has(marker.id),
        }));
    return fromNearby;
  }, [mapItems, nearby, t, visitedIds]);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setError(t('forestquest.locationDenied'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setYou(next);
        setBbox(bboxAround(next.latitude, next.longitude));
        void client
          .listNearbyPlantations({
            lat: next.latitude,
            lng: next.longitude,
            radiusMeters: MAP.defaultNearbyMeters,
          })
          .then((page) => {
            setNearby(page.items);
            setError(null);
          })
          .catch((caught: unknown) => {
            setNearby([]);
            setError(isAuthError(caught) ? caught.message : t('forestquest.locationDenied'));
          })
          .finally(() => setLocating(false));
      },
      () => {
        setLocating(false);
        setError(t('forestquest.locationDenied'));
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  }, [client, t]);

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-forest-900/20 bg-forest-900 text-cream">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-mist">{t('forestquest.field')}</p>
          <p className="mt-1 text-sm text-cream/80">{t('forestquest.fieldIntro')}</p>
        </div>
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          className="shrink-0 rounded-full bg-cream px-4 py-2 text-sm text-forest-900 hover:bg-white disabled:opacity-60"
        >
          {locating ? t('forestquest.locating') : t('forestquest.shareLocation')}
        </button>
      </div>

      {profile ? (
        <div className="grid grid-cols-2 gap-2 px-4 pb-3 sm:grid-cols-4">
          <HudChip label={t('forestquest.displayTitle')} value={profile.displayTitle} />
          <HudChip label={t('forestquest.confirmedXp')} value={formatCount(profile.confirmedXp)} />
          <HudChip label={t('forestquest.ecoPoints')} value={formatCount(profile.ecoPoints)} />
          <HudChip
            label={t('forestquest.forestDex')}
            value={t('forestquest.forestDexProgress', {
              discovered: profile.forestDex.discoveredCount,
              catalogue: profile.forestDex.catalogueCount,
            })}
          />
        </div>
      ) : null}

      {mission ? (
        <p className="px-4 pb-3 text-sm text-cream/80">
          {t('forestquest.activeMission')}: {mission.title} ·{' '}
          {t('forestquest.taskProgress', {
            current: mission.completedTasks,
            required: mission.totalTasks,
          })}
        </p>
      ) : null}

      {error ? <p className="px-4 pb-3 text-sm text-red-200">{error}</p> : null}

      <PlantationLeaflet
        markers={markers}
        center={you ? [you.latitude, you.longitude] : SRI_LANKA_VIEW.center}
        zoom={you ? 16 : SRI_LANKA_VIEW.zoom}
        onBboxChange={setBbox}
        you={you ?? undefined}
        onSiteMeters={GEO_PROXIMITY_METERS.onSiteMax}
        nearbyMeters={GEO_PROXIMITY_METERS.nearbyMax}
        className="h-[55vh] min-h-[280px] w-full"
      />

      <p className="px-4 py-3 text-xs text-cream/65">
        {t('forestquest.visitRange', {
          onSite: GEO_PROXIMITY_METERS.onSiteMax,
          nearby: GEO_PROXIMITY_METERS.nearbyMax,
        })}
      </p>

      <div className="border-t border-cream/10 bg-forest-900 px-4 py-4">
        <h2 className="font-display text-xl text-cream">{t('forestquest.sitesAroundYou')}</h2>
        {you && nearby.length === 0 ? <p className="mt-2 text-sm text-cream/70">{t('forestquest.noNearbySites')}</p> : null}
        {!you ? <p className="mt-2 text-sm text-cream/70">{t('forestquest.shareLocationHint')}</p> : null}
        {nearby.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {nearby.map((row) => {
              const band = fieldProximityBand(row.distanceMeters);
              return (
                <li key={row.id} className="rounded-xl bg-white/10 px-3 py-2">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <Link href={`/plantations/${row.id}`} className="font-medium text-cream underline">
                      {row.name}
                    </Link>
                    <p className="text-xs uppercase tracking-wider text-mist">
                      {formatDistanceMeters(row.distanceMeters)} · {proximityLabel(band, t)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-cream/70">
                    {band === 'ON_SITE'
                      ? t('forestquest.onSiteHint')
                      : band === 'NEARBY'
                        ? t('forestquest.nearbyHint')
                        : t('forestquest.remoteHint')}
                    {visitedIds.has(row.id) ? ` · ${t('forestquest.discovered')}` : ''}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function HudChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-white/10 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-mist">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-cream">{value}</p>
    </div>
  );
}
