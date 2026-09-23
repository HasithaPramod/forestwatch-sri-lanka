'use client';

import type { PublicImpactStats } from '@forestwatch/types';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BarList, StatCard } from '@/components/stat-card';
import { inputClassName } from '@/components/auth-form';
import { isAuthError, useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';
import { formatCount } from '@/lib/dashboards';

export function ImpactDashboard() {
  const { client, ready } = useAuth();
  const { t } = useI18n();
  const [year, setYear] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [stats, setStats] = useState<PublicImpactStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) {
      return;
    }
    void client
      .publicImpact({
        year: year ? Number(year) : undefined,
        districtCode: districtCode || undefined,
      })
      .then((page) => {
        setStats(page);
        setError(null);
      })
      .catch((caught: unknown) => {
        setStats(null);
        setError(isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Could not load impact');
      });
  }, [client, districtCode, ready, year]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:py-16">
      <h1 className="font-display text-3xl text-forest-900 sm:text-4xl">{t('impact.title')}</h1>
      <p className="mt-3 max-w-2xl text-ink/75">{t('impact.intro')}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-ink/80">
          {t('impact.year')}
          <select className={`${inputClassName} mt-2`} value={year} onChange={(event) => setYear(event.target.value)}>
            <option value="">{t('impact.allYears')}</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </label>
        <label className="text-sm text-ink/80">
          {t('impact.district')}
          <select
            className={`${inputClassName} mt-2`}
            value={districtCode}
            onChange={(event) => setDistrictCode(event.target.value)}
          >
            <option value="">{t('impact.allDistricts')}</option>
            <option value="LK-33">Hambantota (LK-33)</option>
          </select>
        </label>
      </div>

      {!ready || (!stats && !error) ? <p className="mt-8 text-ink/70">{t('impact.loading')}</p> : null}
      {error ? <p className="mt-8 text-sm text-red-800">{error}</p> : null}

      {stats ? (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={t('impact.treesRecorded')} value={formatCount(stats.treesRecorded)} />
            <StatCard label={t('impact.verifiedTrees')} value={formatCount(stats.verifiedTrees)} />
            <StatCard
              label={t('impact.estimatedSurviving')}
              value={stats.estimatedSurvivingTrees == null ? '—' : formatCount(stats.estimatedSurvivingTrees)}
              hint={
                stats.estimatedSurvivingTrees == null
                  ? t('impact.noEstimate')
                  : t('impact.estimateHint', { count: stats.plantationsWithSurvivalEstimate })
              }
            />
            <StatCard label={t('impact.plantationSites')} value={formatCount(stats.plantationSites)} />
            <StatCard label={t('impact.campaigns')} value={formatCount(stats.campaigns)} />
            <StatCard label={t('impact.organizations')} value={formatCount(stats.organizations)} />
            <StatCard label={t('impact.contributors')} value={formatCount(stats.contributors)} />
            <StatCard label={t('impact.verifiedMonitoring')} value={formatCount(stats.verifiedMonitoringUpdates)} />
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <BarList title={t('impact.treesByYear')} rows={stats.treesByYear} empty={t('impact.emptyYear')} />
            <BarList title={t('impact.treesByDistrict')} rows={stats.treesByDistrict} empty={t('impact.emptyDistrict')} />
            <BarList title={t('impact.treesBySpecies')} rows={stats.treesBySpecies} empty={t('impact.emptySpecies')} />
            <BarList
              title={t('impact.survivalByYear')}
              rows={stats.survivalTrends}
              empty={t('impact.emptySurvival')}
            />
          </div>

          <div className="mt-10">
            <h2 className="font-display text-2xl text-forest-900">{t('impact.campaignProgress')}</h2>
            {stats.campaignProgress.length === 0 ? (
              <p className="mt-3 text-sm text-ink/70">{t('impact.noCampaigns')}</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {stats.campaignProgress.map((row) => (
                  <li key={row.campaignId} className="rounded-2xl border border-forest-900/10 bg-white/70 p-4">
                    <Link href={`/campaigns/${row.slug}`} className="font-medium text-forest-900 underline">
                      {row.name}
                    </Link>
                    <p className="mt-2 text-sm text-ink/70">
                      {t('impact.recorded', { recorded: formatCount(row.recordedTrees) })}
                      {row.targetTrees != null
                        ? t('impact.ofTarget', { target: formatCount(row.targetTrees) })
                        : t('impact.noTarget')}
                      {row.plantationSites === 1
                        ? t('impact.sitesOne', { count: row.plantationSites })
                        : t('impact.sitesMany', { count: row.plantationSites })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}
