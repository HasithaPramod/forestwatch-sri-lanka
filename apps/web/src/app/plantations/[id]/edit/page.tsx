import type { Metadata } from 'next';
import { PlantationForm } from '../../plantation-form';

export const metadata: Metadata = { title: 'Edit plantation' };

export default async function EditPlantationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlantationForm id={id} />;
}
