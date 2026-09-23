'use client';

import Link from 'next/link';
import { AuthCard, buttonClassName } from '@/components/auth-form';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';

export function AccountPanel() {
  const { user, ready, logout, logoutAll } = useAuth();
  const { t } = useI18n();

  if (!ready) {
    return (
      <AuthCard title={t('auth.accountTitle')}>
        <p className="text-ink/70">{t('auth.loadingSession')}</p>
      </AuthCard>
    );
  }

  if (!user) {
    return (
      <AuthCard title={t('auth.accountTitle')}>
        <p className="text-ink/80">{t('auth.notSignedIn')}</p>
        <Link href="/login" className={`${buttonClassName} mt-6 block text-center`}>
          {t('nav.login')}
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('auth.accountTitle')}>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-ink/60">{t('common.name')}</dt>
          <dd className="text-forest-900">{user.displayName}</dd>
        </div>
        <div>
          <dt className="text-ink/60">{t('common.email')}</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt className="text-ink/60">{t('common.roles')}</dt>
          <dd>{user.roles.join(', ')}</dd>
        </div>
        <div>
          <dt className="text-ink/60">{t('locale.label')}</dt>
          <dd className="mt-2">
            <LanguageSwitcher />
          </dd>
        </div>
      </dl>
      <div className="mt-6 flex flex-col gap-3">
        <Link href="/reports" className="text-sm text-forest-800 underline">
          {t('nav.reports')}
        </Link>
        <Link href="/notifications" className="text-sm text-forest-800 underline">
          {t('nav.notifications')}
        </Link>
        <Link href="/dashboard" className="text-sm text-forest-800 underline">
          {t('nav.dashboard')}
        </Link>
        <Link href="/review" className="text-sm text-forest-800 underline">
          {t('nav.review')}
        </Link>
        <button type="button" className={buttonClassName} onClick={() => void logout()}>
          {t('auth.logOutDevice')}
        </button>
        <button
          type="button"
          className="w-full rounded-full border border-forest-800/30 px-4 py-2.5 text-forest-800 hover:bg-white"
          onClick={() => void logoutAll()}
        >
          {t('auth.logOutAll')}
        </button>
      </div>
    </AuthCard>
  );
}
