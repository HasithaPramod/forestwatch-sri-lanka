import type { Metadata } from 'next';
import { SpeciesDetail } from './species-detail';

export const metadata: Metadata = { title: 'Species' };

export default async function SpeciesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SpeciesDetail id={id} />;
}
