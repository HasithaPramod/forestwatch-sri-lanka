'use client';

import Link from 'next/link';
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
      <Link
        href="/login"
        className="shrink-0 whitespace-nowrap rounded-full bg-forest-800 px-4 py-2 text-sm text-cream hover:bg-forest-700"
      >
        {t('nav.login')}
      </Link>
    );
  }

  return (
    <div className={stacked ? 'flex flex-col items-stretch gap-2' : 'flex items-center gap-3'}>
      <Link href="/account" className={`text-sm text-forest-800 hover:underline ${stacked ? '' : 'hidden md:inline'}`}>
        {user.displayName}
      </Link>
      <button
        type="button"
        onClick={() => void logout()}
        className={`rounded-full border border-forest-800/30 text-sm text-forest-800 hover:bg-white ${
          stacked ? 'px-4 py-2 text-left' : 'px-3 py-1.5 md:px-4 md:py-2'
        }`}
      >
        {t('nav.logout')}
      </button>
    </div>
  );
}
