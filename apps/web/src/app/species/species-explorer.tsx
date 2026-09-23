'use client';

import { catalogueName } from '@forestwatch/i18n';
import type { NativeStatus, SpeciesSummary } from '@forestwatch/types';
import { APP_LOCALES, type AppLocale } from '@forestwatch/types';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { inputClassName } from '@/components/auth-form';
import { isAuthError, useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';
import { canManageSpecies, formatPlantationRecords, speciesPath } from '@/lib/species';
import { StoredImage } from '@/components/stored-image';

type Locale = AppLocale;

const STATUS_FILTERS: Array<{ value: '' | NativeStatus; label: string }> = [
  { value: '', label: 'All native statuses' },
  { value: 'NATIVE', label: 'Native' },
  { value: 'ENDEMIC', label: 'Endemic' },
  { value: 'INTRODUCED', label: 'Introduced' },
  { value: 'UNKNOWN', label: 'Unknown' },
];

function displayName(row: SpeciesSummary, locale: Locale): string {
  return catalogueName(locale, { en: row.commonEnglishName, si: row.sinhalaName, ta: row.tamilName });
}

export function SpeciesExplorer() {
  const { client, user, ready } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const [nativeStatus, setNativeStatus] = useState<'' | NativeStatus>('');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<SpeciesSummary[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const manager = canManageSpecies(user);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const handle = window.setTimeout(() => {
      void client
        .listSpecies({
          nativeStatus: nativeStatus || undefined,
          q: q.trim() || undefined,
          includeInactive: manager ? true : undefined,
          limit: 50,
        })
        .then((page) => {
          setItems(page.items);
          setTotal(page.meta.total);
          setError(null);
        })
        .catch((caught: unknown) => {
          setError(isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Could not load species');
        });
    }, q ? 250 : 0);
    return () => window.clearTimeout(handle);
  }, [client, manager, nativeStatus, q, ready]);

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-forest-900 sm:text-4xl">{t('species.title')}</h1>
          <p className="mt-3 max-w-2xl text-ink/75">{t('species.intro')}</p>
        </div>
        {manager ? (
          <Link href="/species/new" className="rounded-full bg-forest-800 px-4 py-2.5 text-cream hover:bg-forest-700">
            New species
          </Link>
        ) : null}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <label className="block text-sm text-ink/80">
          Language
          <select
            className={`${inputClassName} mt-2`}
            value={locale}
            onChange={(event) => void setLocale(event.target.value as Locale)}
          >
            {APP_LOCALES.map((code) => (
              <option key={code} value={code}>
                {t(`locale.${code}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-ink/80">
          Native status
          <select
            className={`${inputClassName} mt-2`}
            value={nativeStatus}
            onChange={(event) => setNativeStatus(event.target.value as '' | NativeStatus)}
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-ink/80">
          Search
          <input
            className={`${inputClassName} mt-2`}
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Scientific or local name"
          />
        </label>
      </div>

      {!ready ? <p className="mt-8 text-ink/70">Loading species…</p> : null}
      {error ? <p className="mt-8 text-sm text-red-800">{error}</p> : null}

      {ready && !error ? (
        <ul className="mt-8 space-y-4">
          {items.map((species) => (
            <li key={species.id}>
              <Link
                href={speciesPath(species.scientificName)}
                className="block rounded-2xl border border-forest-900/10 bg-white/70 p-5 hover:border-forest-700/40"
              >
                <div className="flex gap-4">
                  {species.imageThumbnailUrl && species.imageUrl ? (
                    <div className="w-28 shrink-0">
                      <StoredImage
                        image={{ url: species.imageUrl, thumbnailUrl: species.imageThumbnailUrl }}
                        alt={displayName(species, locale)}
                        className="h-24 w-full object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="font-display text-2xl text-forest-900">{displayName(species, locale)}</h2>
                  <span className="text-xs uppercase tracking-wider text-forest-700">{species.nativeStatus}</span>
                </div>
                <p className="mt-1 text-sm italic text-ink/60">{species.scientificName}</p>
                <p className="mt-3 text-sm leading-6 text-ink/75">{species.description}</p>
                <p className="mt-3 text-sm text-ink/60">
                  {formatPlantationRecords(species.plantationRecordCount)}
                  {species.active ? '' : ' · Inactive'}
                </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {ready && !error && items.length === 0 ? <p className="mt-8 text-ink/70">No species match this filter.</p> : null}
      {total !== null && items.length > 0 ? (
        <p className="mt-6 text-sm text-ink/60">
          {total} species
        </p>
      ) : null}
    </section>
  );
}
