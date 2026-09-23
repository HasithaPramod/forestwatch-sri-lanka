import type { Metadata } from 'next';
import { SpeciesExplorer } from './species-explorer';

export const metadata: Metadata = { title: 'Species' };

export default function SpeciesPage() {
  return <SpeciesExplorer />;
}
