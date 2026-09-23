import type { Metadata } from 'next';
import { LocationsExplorer } from './locations-explorer';

export const metadata: Metadata = { title: 'Locations' };

export default function LocationsPage() {
  return <LocationsExplorer />;
}
