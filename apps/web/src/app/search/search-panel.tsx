'use client';

import type { SearchHit, SearchKind } from '@forestwatch/types';
import { SEARCH_KINDS } from '@forestwatch/types';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { inputClassName } from '@/components/auth-form';
import { isAuthError, useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';
import { hrefForSearch } from '@/lib/dashboards';

export function SearchPanel() {
  const { client, ready } = useAuth();
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<SearchKind | ''>('');
  const [items, setItems] = useState<SearchHit[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || q.trim().length < 2) {
      setItems([]);
      setTotal(null);
      return;
    }
    const handle = window.setTimeout(() => {
      void client
        .search({ q: q.trim(), kind: kind || undefined, limit: 40 })
        .then((page) => {
          setItems(page.items);
          setTotal(page.meta.total);
          setError(null);
        })
        .catch((caught: unknown) => {
          setItems([]);
          setTotal(null);
          setError(isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Could not search');
        });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [client, kind, q, ready]);

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:py-16">
      <h1 className="font-display text-3xl text-forest-900 sm:text-4xl">{t('search.title')}</h1>
      <p className="mt-3 max-w-2xl text-ink/75">{t('search.intro')}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <label className="sm:col-span-2 text-sm text-ink/80">
          {t('search.query')}
          <input className={`${inputClassName} mt-2`} value={q} onChange={(event) => setQ(event.target.value)} placeholder={t('search.placeholder')} />
        </label>
        <label className="text-sm text-ink/80">
          {t('search.kind')}
          <select className={`${inputClassName} mt-2`} value={kind} onChange={(event) => setKind(event.target.value as SearchKind | '')}>
            <option value="">{t('search.allKinds')}</option>
            {SEARCH_KINDS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error ? <p className="mt-6 text-sm text-red-800">{error}</p> : null}
      {q.trim().length > 0 && q.trim().length < 2 ? (
        <p className="mt-6 text-sm text-ink/70">{t('search.typeTwo')}</p>
      ) : null}
      {total != null ? (
        <p className="mt-6 text-sm text-ink/60">
          {total === 1 ? t('search.resultsOne', { count: total }) : t('search.results', { count: total })}
        </p>
      ) : null}
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={`${item.kind}:${item.id}`} className="rounded-2xl border border-forest-900/10 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-forest-700">{item.kind}</p>
            <Link href={hrefForSearch(item.kind, item.id)} className="mt-1 block font-medium text-forest-900 underline">
              {item.title}
            </Link>
            {item.subtitle ? <p className="mt-1 text-sm text-ink/70">{item.subtitle}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
