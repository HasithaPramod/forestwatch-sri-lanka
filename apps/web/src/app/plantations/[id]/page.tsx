import type { Metadata } from 'next';
import { PlantationDetail } from './plantation-detail';

export const metadata: Metadata = { title: 'Plantation' };

export default async function PlantationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlantationDetail id={id} />;
}
