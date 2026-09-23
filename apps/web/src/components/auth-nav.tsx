'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';

export function AuthNav({ stacked = false }: { stacked?: boolean }) {
  const { user, ready, logout } = useAuth();
  const { t } = useI18n();

  if (!ready) {
    return <span className="text-sm text-ink/50">…</span>;
  }

  if (!user) {
    return (
      <Link href="/login" className="rounded-full bg-forest-800 px-4 py-2 text-sm text-cream hover:bg-forest-700">
        {t('nav.login')}
      </Link>
    );
  }

  return (
    <div className={stacked ? 'flex flex-col items-stretch gap-2' : 'flex items-center gap-3'}>
      {stacked ? null : <NotificationsLink />}
      <Link href="/account" className={`text-sm text-forest-800 hover:underline ${stacked ? '' : 'hidden xl:inline'}`}>
        {user.displayName}
      </Link>
      <button
        type="button"
        onClick={() => void logout()}
        className={`rounded-full border border-forest-800/30 text-sm text-forest-800 hover:bg-white ${
          stacked ? 'px-4 py-2 text-left' : 'px-3 py-1.5 xl:px-4 xl:py-2'
        }`}
      >
        {t('nav.logout')}
      </button>
    </div>
  );
}

function NotificationsLink() {
  const { client, user } = useAuth();
  const { t } = useI18n();
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setUnreadCount(null);
      return;
    }
    let cancelled = false;
    const refresh = () => {
      void client
        .listNotifications({ page: 1, limit: 1 })
        .then((page) => {
          if (!cancelled) {
            setUnreadCount(page.meta.unreadCount);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setUnreadCount(null);
          }
        });
    };
    refresh();
    window.addEventListener('forestwatch:notifications', refresh);
    return () => {
      cancelled = true;
      window.removeEventListener('forestwatch:notifications', refresh);
    };
  }, [client, user]);

  return (
    <Link href="/notifications" className="hidden text-sm text-forest-800 hover:underline xl:inline">
      {t('nav.notifications')}
      {unreadCount && unreadCount > 0 ? ` (${unreadCount})` : ''}
    </Link>
  );
}
