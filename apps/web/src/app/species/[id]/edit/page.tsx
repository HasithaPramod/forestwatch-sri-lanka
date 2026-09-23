import type { Metadata } from 'next';
import { SpeciesForm } from '../../species-form';

export const metadata: Metadata = { title: 'Edit species' };

export default async function EditSpeciesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SpeciesForm id={id} />;
}
