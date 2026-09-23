'use client';

import type { PlantationSummary } from '@forestwatch/types';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { inputClassName } from '@/components/auth-form';
import { isAuthError, useAuth } from '@/lib/auth-context';
import { canSubmitPlantations, formatCoordinates, formatRecordedTrees } from '@/lib/plantations';
import { StoredImage } from '@/components/stored-image';

export function PlantationsExplorer({ campaignId, speciesId }: { campaignId?: string; speciesId?: string }) {
  const { client, user, ready } = useAuth();
  const [scope, setScope] = useState<'public' | 'mine'>('public');
  const [items, setItems] = useState<PlantationSummary[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = canSubmitPlantations(user);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const nextScope = scope === 'mine' && user ? 'mine' : 'public';
    void client
      .listPlantations({
        scope: nextScope,
        campaignId,
        speciesId,
        limit: 50,
      })
      .then((page) => {
        setItems(page.items);
        setTotal(page.meta.total);
        setError(null);
      })
      .catch((caught: unknown) => {
        setError(isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Could not load plantations');
      });
  }, [campaignId, client, ready, scope, speciesId, user]);

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-forest-900 sm:text-4xl">Plantations</h1>
          <p className="mt-3 max-w-2xl text-ink/75">
            Verified restoration records. Tree counts are submitted totals, not survival estimates. Coordinates follow
            each record&apos;s location visibility.
          </p>
        </div>
        {canSubmit ? (
          <Link href="/plantations/new" className="rounded-full bg-forest-800 px-4 py-2.5 text-cream hover:bg-forest-700">
            Record a plantation
          </Link>
        ) : (
          <Link href="/login" className="rounded-full border border-forest-800/30 px-4 py-2.5 text-forest-800">
            Sign in to record
          </Link>
        )}
      </div>

      {canSubmit ? (
        <label className="mt-8 block max-w-sm text-sm text-ink/80">
          Scope
          <select
            className={`${inputClassName} mt-2`}
            value={scope}
            onChange={(event) => setScope(event.target.value as 'public' | 'mine')}
          >
            <option value="public">Verified public records</option>
            <option value="mine">Records I submitted</option>
          </select>
        </label>
      ) : null}

      {!ready ? <p className="mt-8 text-ink/70">Loading plantations…</p> : null}
      {error ? <p className="mt-8 text-sm text-red-800">{error}</p> : null}

      {ready && !error ? (
        <ul className="mt-8 space-y-4">
          {items.map((plantation) => (
            <li key={plantation.id}>
              <Link
                href={`/plantations/${plantation.id}`}
                className="block rounded-2xl border border-forest-900/10 bg-white/70 p-5 hover:border-forest-700/40"
              >
                <div className="flex gap-4">
                  {plantation.coverImage ? (
                    <div className="w-28 shrink-0">
                      <StoredImage image={plantation.coverImage} alt={plantation.name} className="h-24 w-full object-cover" />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="font-display text-2xl text-forest-900">{plantation.name}</h2>
                  <span className="text-xs uppercase tracking-wider text-forest-700">{plantation.verificationStatus}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink/75">{plantation.description}</p>
                <p className="mt-4 text-sm text-ink/60">
                  {formatRecordedTrees(plantation.treeCount)}
                  {plantation.areaHectares != null ? ` · ${plantation.areaHectares} ha` : ''}
                  {plantation.campaign ? ` · ${plantation.campaign.name}` : ''}
                </p>
                <p className="mt-1 text-sm text-ink/60">
                  {plantation.species.map((row) => `${row.commonEnglishName} (${row.quantity})`).join(', ')}
                </p>
                <p className="mt-1 text-sm text-ink/60">
                  {formatCoordinates(
                    plantation.coordinates.latitude,
                    plantation.coordinates.longitude,
                    plantation.coordinates.precision,
                  )}
                </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {ready && !error && items.length === 0 ? <p className="mt-8 text-ink/70">No plantations match this filter.</p> : null}
      {total !== null && items.length > 0 ? <p className="mt-6 text-sm text-ink/60">{total} plantation{total === 1 ? '' : 's'}</p> : null}
    </section>
  );
}
