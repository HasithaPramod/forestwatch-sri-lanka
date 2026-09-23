import type { Metadata } from 'next';
import { MapExplorer } from './map-explorer';

export const metadata: Metadata = { title: 'Explore Map' };

export default function MapPage() {
  return <MapExplorer />;
}
