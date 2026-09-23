import type { Metadata } from 'next';
import { ReportsInbox } from './reports-inbox';

export const metadata: Metadata = { title: 'Reports' };

export default function ReportsPage() {
  return <ReportsInbox />;
}
