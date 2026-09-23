import type { Metadata } from 'next';
import { SpeciesForm } from '../species-form';

export const metadata: Metadata = { title: 'New species' };

export default function NewSpeciesPage() {
  return <SpeciesForm />;
}
