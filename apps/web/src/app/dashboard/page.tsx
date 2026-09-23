import type { Metadata } from 'next';
import { DashboardHub } from './dashboard-hub';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return <DashboardHub />;
}
