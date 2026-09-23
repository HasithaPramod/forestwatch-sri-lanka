'use client';

import type { CampaignStatus, CampaignSummary } from '@forestwatch/types';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { inputClassName } from '@/components/auth-form';
import { isAuthError, useAuth } from '@/lib/auth-context';
import { canManageCampaigns, formatCampaignDate, formatTargetArea, formatTargetTrees } from '@/lib/campaigns';
import { StoredImage } from '@/components/stored-image';

const STATUS_FILTERS: Array<{ value: '' | CampaignStatus; label: string }> = [
  { value: '', label: 'Upcoming, active, completed' },
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
];

export function CampaignsExplorer() {
  const { client, user, ready } = useAuth();
  const [scope, setScope] = useState<'public' | 'mine'>('public');
  const [status, setStatus] = useState<'' | CampaignStatus>('');
  const [items, setItems] = useState<CampaignSummary[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const manager = canManageCampaigns(user);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const nextScope = scope === 'mine' && manager ? 'mine' : 'public';
    void client
      .listCampaigns({
        scope: nextScope,
        status: nextScope === 'public' && status ? status : undefined,
        limit: 50,
      })
      .then((page) => {
        setItems(page.items);
        setTotal(page.meta.total);
        setError(null);
      })
      .catch((caught: unknown) => {
        setError(isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Could not load campaigns');
      });
  }, [client, manager, ready, scope, status]);

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-forest-900 sm:text-4xl">Campaigns</h1>
          <p className="mt-3 max-w-2xl text-ink/75">
            Public restoration programmes. Tree and area figures are published targets, not recorded plantings.
          </p>
        </div>
        {manager ? (
          <Link href="/campaigns/new" className="rounded-full bg-forest-800 px-4 py-2.5 text-cream hover:bg-forest-700">
            New campaign
          </Link>
        ) : null}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {manager ? (
          <label className="block text-sm text-ink/80">
            Scope
            <select
              className={`${inputClassName} mt-2`}
              value={scope}
              onChange={(event) => setScope(event.target.value as 'public' | 'mine')}
            >
              <option value="public">Public catalogue</option>
              <option value="mine">Campaigns I created</option>
            </select>
          </label>
        ) : null}
        {scope === 'public' ? (
          <label className="block text-sm text-ink/80">
            Status
            <select
              className={`${inputClassName} mt-2`}
              value={status}
              onChange={(event) => setStatus(event.target.value as '' | CampaignStatus)}
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {!ready ? <p className="mt-8 text-ink/70">Loading campaigns…</p> : null}
      {error ? <p className="mt-8 text-sm text-red-800">{error}</p> : null}

      {ready && !error ? (
        <ul className="mt-8 space-y-4">
          {items.map((campaign) => (
            <li key={campaign.id}>
              <Link
                href={`/campaigns/${campaign.slug}`}
                className="block rounded-2xl border border-forest-900/10 bg-white/70 p-5 hover:border-forest-700/40"
              >
                <div className="flex gap-4">
                  {campaign.bannerThumbnailUrl && campaign.bannerImageUrl ? (
                    <div className="w-28 shrink-0">
                      <StoredImage
                        image={{ url: campaign.bannerImageUrl, thumbnailUrl: campaign.bannerThumbnailUrl }}
                        alt={campaign.name}
                        className="h-24 w-full object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="font-display text-2xl text-forest-900">{campaign.name}</h2>
                  <span className="text-xs uppercase tracking-wider text-forest-700">{campaign.status}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink/75">{campaign.description}</p>
                <p className="mt-4 text-sm text-ink/60">
                  {formatCampaignDate(campaign.startDate)}
                  {campaign.endDate ? ` – ${formatCampaignDate(campaign.endDate)}` : ''}
                  {campaign.organizer ? ` · ${campaign.organizer.name}` : ''}
                </p>
                <p className="mt-1 text-sm text-ink/60">
                  {[formatTargetTrees(campaign.targetTrees), formatTargetArea(campaign.targetAreaHectares)]
                    .filter(Boolean)
                    .join(' · ') || 'No published targets'}
                  {` · ${campaign.plantationCount} registered plantation${campaign.plantationCount === 1 ? '' : 's'}`}
                </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {ready && !error && items.length === 0 ? (
        <p className="mt-8 text-ink/70">No campaigns match this filter.</p>
      ) : null}

      {total !== null && items.length > 0 ? (
        <p className="mt-6 text-sm text-ink/60">{total} campaign{total === 1 ? '' : 's'}</p>
      ) : null}
    </section>
  );
}
