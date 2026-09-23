'use client';

import { useI18n } from '@/lib/i18n-context';

export function AboutContent() {
  const { t } = useI18n();

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:py-20">
      <p className="text-sm uppercase tracking-wider text-forest-600">{t('about.kicker')}</p>
      <h1 className="mt-3 font-display text-3xl text-forest-900 sm:text-4xl">{t('site.name')}</h1>
      <p className="mt-4 text-lg leading-8 text-ink/80">{t('home.intro')}</p>
      <p className="mt-6 leading-7 text-ink/75">{t('about.body')}</p>
    </section>
  );
}
