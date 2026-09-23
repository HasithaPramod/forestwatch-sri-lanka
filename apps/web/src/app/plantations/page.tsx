import type { Metadata } from 'next';
import { PlantationsExplorer } from './plantations-explorer';

export const metadata: Metadata = { title: 'Plantations' };

export default async function PlantationsPage({
  searchParams,
}: {
  searchParams: Promise<{ campaignId?: string; speciesId?: string }>;
}) {
  const params = await searchParams;
  return <PlantationsExplorer campaignId={params.campaignId} speciesId={params.speciesId} />;
}
