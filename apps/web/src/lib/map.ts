import type { CoordinatePrecision, MapPlantationMarker } from '@forestwatch/types';

export const SRI_LANKA_VIEW = {
  center: [7.87, 80.77] as [number, number],
  zoom: 7,
  initialBbox: '79.5,5.8,82.0,10.0',
};

export function bboxAround(latitude: number, longitude: number, delta = 0.08): string {
  const round = (value: number) => Number(value.toFixed(4));
  return `${round(longitude - delta)},${round(latitude - delta)},${round(longitude + delta)},${round(latitude + delta)}`;
}

export function formatDistanceMeters(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function markerColor(precision: CoordinatePrecision): string {
  return precision === 'approximate' ? '#b4532a' : '#1f4d3a';
}

export function toLeafletMarkers(items: MapPlantationMarker[]): Array<{
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  precision: CoordinatePrecision;
  treeCount: number;
  href: string;
}> {
  return items.flatMap((item) => {
    if (item.coordinates.latitude == null || item.coordinates.longitude == null) {
      return [];
    }
    return [
      {
        id: item.id,
        name: item.name,
        latitude: item.coordinates.latitude,
        longitude: item.coordinates.longitude,
        precision: item.coordinates.precision,
        treeCount: item.treeCount,
        href: `/plantations/${item.id}`,
      },
    ];
  });
}
