'use client';

import { useI18n } from '@/lib/i18n-context';

export function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-forest-900/10 bg-forest-900 text-cream">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm leading-6 text-cream/80">
        <p>{t('site.footer')}</p>
      </div>
    </footer>
  );
}
