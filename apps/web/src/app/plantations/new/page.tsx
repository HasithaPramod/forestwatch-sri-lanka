import type { Metadata } from 'next';
import { PlantationForm } from '../plantation-form';

export const metadata: Metadata = { title: 'Record a plantation' };

export default function NewPlantationPage() {
  return <PlantationForm />;
}
