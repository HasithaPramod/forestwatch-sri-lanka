import type { Metadata } from 'next';
import { ImpactDashboard } from './impact-dashboard';

export const metadata: Metadata = { title: 'Impact' };

export default function ImpactPage() {
  return <ImpactDashboard />;
}
