'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n-context';

export function ComingSoon({ title }: { title: string }) {
  const { t } = useI18n();

  return (
    <section className="mx-auto max-w-3xl px-4 py-20">
      <p className="text-sm uppercase tracking-[0.2em] text-forest-600">{title}</p>
      <h1 className="mt-3 font-display text-4xl text-forest-900">{t('coming.title')}</h1>
      <p className="mt-4 max-w-2xl text-lg leading-7 text-ink/80">{t('coming.body')}</p>
      <Link href="/" className="mt-8 inline-block text-forest-700 underline">
        {t('common.returnHome')}
      </Link>
    </section>
  );
}
