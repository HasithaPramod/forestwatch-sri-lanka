'use client';

import type { PlantationCoordinates } from '@forestwatch/types';
import dynamic from 'next/dynamic';

const PlantationLeaflet = dynamic(
  () => import('@/app/map/plantation-leaflet').then((mod) => mod.PlantationLeaflet),
  { ssr: false, loading: () => <p className="p-4 text-sm text-ink/70">Loading map…</p> },
);

export function PlantationMiniMap({
  id,
  name,
  treeCount,
  coordinates,
}: {
  id: string;
  name: string;
  treeCount: number;
  coordinates: PlantationCoordinates;
}) {
  if (coordinates.latitude == null || coordinates.longitude == null || coordinates.precision === 'hidden') {
    return <p className="mt-8 text-sm text-ink/70">Map location is withheld for this record.</p>;
  }

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-forest-900/10">
      <PlantationLeaflet
        markers={[
          {
            id,
            name,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            precision: coordinates.precision,
            treeCount,
            href: `/map`,
          },
        ]}
        center={[coordinates.latitude, coordinates.longitude]}
        zoom={13}
        fitMarkers
        className="h-64 w-full"
      />
    </div>
  );
}
