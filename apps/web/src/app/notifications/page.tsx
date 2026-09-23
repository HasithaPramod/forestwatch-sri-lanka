import type { Metadata } from 'next';
import { NotificationsInbox } from './notifications-inbox';

export const metadata: Metadata = { title: 'Notifications' };

export default function NotificationsPage() {
  return <NotificationsInbox />;
}
