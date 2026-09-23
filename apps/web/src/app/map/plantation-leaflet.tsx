'use client';

import type { CoordinatePrecision } from '@forestwatch/types';
import L from 'leaflet';
import { useEffect } from 'react';
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { markerColor } from '@/lib/map';
import 'leaflet/dist/leaflet.css';

export type LeafletMarker = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  precision: CoordinatePrecision;
  treeCount: number;
  href: string;
  visited?: boolean;
  distanceLabel?: string;
};

function FollowYou({ you, zoom }: { you: { latitude: number; longitude: number }; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([you.latitude, you.longitude], zoom);
  }, [map, you.latitude, you.longitude, zoom]);
  return null;
}

function BboxWatcher({ onBboxChange }: { onBboxChange?: (bbox: string) => void }) {
  const map = useMapEvents({
    moveend() {
      report(map, onBboxChange);
    },
  });

  useEffect(() => {
    report(map, onBboxChange);
  }, [map, onBboxChange]);

  return null;
}

function FitOnce({ markers }: { markers: LeafletMarker[] }) {
  const map = useMap();
  useEffect(() => {
    const first = markers[0];
    if (!first) {
      return;
    }
    if (markers.length === 1) {
      map.setView([first.latitude, first.longitude], Math.max(map.getZoom(), 12));
      return;
    }
    const bounds = L.latLngBounds(markers.map((marker) => [marker.latitude, marker.longitude]));
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
  }, [map, markers]);
  return null;
}

function report(map: L.Map, onBboxChange?: (bbox: string) => void): void {
  if (!onBboxChange) {
    return;
  }
  const bounds = map.getBounds();
  onBboxChange(`${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`);
}

export function PlantationLeaflet({
  markers,
  center,
  zoom,
  onBboxChange,
  fitMarkers = false,
  className = 'h-[55vh] w-full sm:h-[70vh]',
  you,
  onSiteMeters,
  nearbyMeters,
}: {
  markers: LeafletMarker[];
  center: [number, number];
  zoom: number;
  onBboxChange?: (bbox: string) => void;
  fitMarkers?: boolean;
  className?: string;
  you?: { latitude: number; longitude: number };
  onSiteMeters?: number;
  nearbyMeters?: number;
}) {
  return (
    <MapContainer center={center} zoom={zoom} className={className} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <BboxWatcher onBboxChange={onBboxChange} />
      {you ? <FollowYou you={you} zoom={16} /> : null}
      {fitMarkers && !you ? <FitOnce markers={markers} /> : null}
      {you && nearbyMeters ? (
        <Circle
          center={[you.latitude, you.longitude]}
          radius={nearbyMeters}
          pathOptions={{ color: '#7d9b6a', weight: 1, fillColor: '#2f6f4e', fillOpacity: 0.08 }}
        />
      ) : null}
      {you && onSiteMeters ? (
        <Circle
          center={[you.latitude, you.longitude]}
          radius={onSiteMeters}
          pathOptions={{ color: '#cfe0c4', weight: 2, fillColor: '#cfe0c4', fillOpacity: 0.16 }}
        />
      ) : null}
      {you ? (
        <CircleMarker
          center={[you.latitude, you.longitude]}
          radius={7}
          pathOptions={{ color: '#f3eee2', weight: 2, fillColor: '#b4532a', fillOpacity: 1 }}
        />
      ) : null}
      {markers.map((marker) => (
        <CircleMarker
          key={marker.id}
          center={[marker.latitude, marker.longitude]}
          radius={marker.visited ? 11 : 8}
          pathOptions={{
            color: marker.visited ? '#cfe0c4' : markerColor(marker.precision),
            weight: 2,
            fillOpacity: 0.85,
          }}
        >
          <Popup>
            <a href={marker.href} className="font-medium text-forest-800 underline">
              {marker.name}
            </a>
            <div>{marker.treeCount.toLocaleString('en-LK')} recorded trees</div>
            {marker.distanceLabel ? <div>{marker.distanceLabel}</div> : null}
            {marker.visited ? <div>Visited on site</div> : null}
            {marker.precision === 'approximate' ? <div>Approximate location</div> : null}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
