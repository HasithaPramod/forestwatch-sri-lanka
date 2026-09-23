'use client';

import type {
  CampaignSummary,
  LocationDivision,
  MapPlantationMarker,
  NearbyPlantation,
  SpeciesSummary,
} from '@forestwatch/types';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { inputClassName } from '@/components/auth-form';
import { isAuthError, useAuth } from '@/lib/auth-context';
import { formatDistanceMeters, SRI_LANKA_VIEW, toLeafletMarkers } from '@/lib/map';

const PlantationLeaflet = dynamic(() => import('./plantation-leaflet').then((mod) => mod.PlantationLeaflet), {
  ssr: false,
  loading: () => <p className="p-6 text-ink/70">Loading map…</p>,
});

export function MapExplorer() {
  const { client, ready } = useAuth();
  const [bbox, setBbox] = useState(SRI_LANKA_VIEW.initialBbox);
  const [items, setItems] = useState<MapPlantationMarker[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [nearby, setNearby] = useState<NearbyPlantation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [species, setSpecies] = useState<SpeciesSummary[]>([]);
  const [provinces, setProvinces] = useState<LocationDivision[]>([]);
  const [campaignId, setCampaignId] = useState('');
  const [speciesId, setSpeciesId] = useState('');
  const [provinceCode, setProvinceCode] = useState('');

  const markers = useMemo(() => toLeafletMarkers(items), [items]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    void Promise.all([client.listCampaigns({ limit: 50 }), client.listSpecies({ limit: 50 }), client.listProvinces()])
      .then(([campaignPage, speciesPage, nextProvinces]) => {
        setCampaigns(campaignPage.items);
        setSpecies(speciesPage.items);
        setProvinces(nextProvinces);
      })
      .catch(() => undefined);
  }, [client, ready]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const handle = window.setTimeout(() => {
      void client
        .listMapPlantations({
          bbox,
          campaignId: campaignId || undefined,
          speciesId: speciesId || undefined,
          provinceCode: provinceCode || undefined,
        })
        .then((page) => {
          setItems(page.items);
          setTruncated(page.meta.truncated);
          setError(null);
        })
        .catch((caught: unknown) => {
          setError(isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Could not load map');
        });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [bbox, campaignId, client, provinceCode, ready, speciesId]);

  const onBboxChange = useCallback((next: string) => {
    setBbox(next);
  }, []);

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-3xl text-forest-900 sm:text-4xl">Explore map</h1>
          <p className="mt-3 max-w-2xl text-ink/75">
            Markers come from the current viewport only. Coordinates follow each record&apos;s location visibility. This
            page does not download every plantation.
          </p>
        </div>
        <button
          type="button"
          className="rounded-full bg-forest-800 px-4 py-2.5 text-cream hover:bg-forest-700"
          onClick={() => {
            if (!navigator.geolocation) {
              setLocateError('This browser cannot share a location.');
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (position) => {
                setLocateError(null);
                void client
                  .listNearbyPlantations({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    campaignId: campaignId || undefined,
                    speciesId: speciesId || undefined,
                    provinceCode: provinceCode || undefined,
                  })
                  .then((page) => setNearby(page.items))
                  .catch((caught: unknown) => {
                    setLocateError(isAuthError(caught) ? caught.message : 'Could not load nearby plantations');
                  });
              },
              () => setLocateError('Location permission was not granted. No nearby list is invented.'),
            );
          }}
        >
          Use my location
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <label className="block text-sm text-ink/80">
          Campaign
          <select className={`${inputClassName} mt-2`} value={campaignId} onChange={(event) => setCampaignId(event.target.value)}>
            <option value="">All campaigns</option>
            {campaigns.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-ink/80">
          Species
          <select className={`${inputClassName} mt-2`} value={speciesId} onChange={(event) => setSpeciesId(event.target.value)}>
            <option value="">All species</option>
            {species.map((row) => (
              <option key={row.id} value={row.id}>
                {row.commonEnglishName}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-ink/80">
          Province
          <select className={`${inputClassName} mt-2`} value={provinceCode} onChange={(event) => setProvinceCode(event.target.value)}>
            <option value="">All provinces</option>
            {provinces.map((row) => (
              <option key={row.code} value={row.code}>
                {row.nameEn}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="mt-4 text-sm text-red-800">{error}</p> : null}
      {locateError ? <p className="mt-4 text-sm text-red-800">{locateError}</p> : null}

      <div className="mt-6 overflow-hidden rounded-2xl border border-forest-900/10">
        <PlantationLeaflet markers={markers} center={SRI_LANKA_VIEW.center} zoom={SRI_LANKA_VIEW.zoom} onBboxChange={onBboxChange} />
      </div>
      <p className="mt-3 text-sm text-ink/60">
        {items.length} plantation{items.length === 1 ? '' : 's'} in this view
        {truncated ? ' · viewport cap reached, zoom in for more' : ''}
      </p>

      {nearby.length > 0 ? (
        <div className="mt-8">
          <h2 className="font-display text-2xl text-forest-900">Nearby</h2>
          <ul className="mt-4 divide-y divide-forest-900/10 rounded-2xl border border-forest-900/10 bg-white/70">
            {nearby.map((row) => (
              <li key={row.id} className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <Link href={`/plantations/${row.id}`} className="text-forest-800 underline">
                  {row.name}
                </Link>
                <span>{formatDistanceMeters(row.distanceMeters)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
