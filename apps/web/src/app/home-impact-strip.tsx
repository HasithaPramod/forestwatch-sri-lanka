'use client';

import type { PublicImpactStats } from '@forestwatch/types';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';
import { formatCount } from '@/lib/dashboards';

export function HomeImpactStrip() {
  const { client, ready } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState<PublicImpactStats | null>(null);

  useEffect(() => {
    if (!ready) {
      return;
    }
    void client.publicImpact().then(setStats).catch(() => setStats(null));
  }, [client, ready]);

  if (!stats) {
    return null;
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="font-display text-3xl text-forest-900">{t('home.verifiedRecord')}</h2>
      <p className="mt-3 max-w-2xl text-ink/75">{t('home.verifiedRecordBody')}</p>
      <dl className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-forest-900/10 bg-white/70 p-4">
          <dt className="text-xs uppercase tracking-[0.2em] text-forest-700">{t('home.treesRecorded')}</dt>
          <dd className="mt-2 font-display text-3xl text-forest-900">{formatCount(stats.treesRecorded)}</dd>
        </div>
        <div className="rounded-2xl border border-forest-900/10 bg-white/70 p-4">
          <dt className="text-xs uppercase tracking-[0.2em] text-forest-700">{t('home.verifiedSites')}</dt>
          <dd className="mt-2 font-display text-3xl text-forest-900">{formatCount(stats.plantationSites)}</dd>
        </div>
        <div className="rounded-2xl border border-forest-900/10 bg-white/70 p-4">
          <dt className="text-xs uppercase tracking-[0.2em] text-forest-700">{t('home.estimatedSurviving')}</dt>
          <dd className="mt-2 font-display text-3xl text-forest-900">
            {stats.estimatedSurvivingTrees == null ? '—' : formatCount(stats.estimatedSurvivingTrees)}
          </dd>
        </div>
      </dl>
      <Link href="/impact" className="mt-6 inline-block text-forest-800 underline">
        {t('home.fullImpact')}
      </Link>
    </section>
  );
}
