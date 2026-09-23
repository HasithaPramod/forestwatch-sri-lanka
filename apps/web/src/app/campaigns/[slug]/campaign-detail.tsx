'use client';

import type { CampaignDetail as CampaignDetailType } from '@forestwatch/types';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { isAuthError, useAuth } from '@/lib/auth-context';
import { formatCampaignDate, formatTargetArea, formatTargetTrees } from '@/lib/campaigns';
import { StoredImage } from '@/components/stored-image';

export function CampaignDetail({ slug }: { slug: string }) {
  const { client, ready } = useAuth();
  const [campaign, setCampaign] = useState<CampaignDetailType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) {
      return;
    }
    void client
      .getCampaign(slug)
      .then((detail) => {
        setCampaign(detail);
        setError(null);
      })
      .catch((caught: unknown) => {
        setCampaign(null);
        setError(isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Campaign not found');
      });
  }, [client, ready, slug]);

  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <Link href="/campaigns" className="text-sm text-forest-800 underline">
        All campaigns
      </Link>
      {!ready ? <p className="mt-8 text-ink/70">Loading campaign…</p> : null}
      {error ? <p className="mt-8 text-sm text-red-800">{error}</p> : null}
      {campaign ? (
        <>
          <p className="mt-6 text-xs uppercase tracking-[0.2em] text-forest-700">{campaign.status}</p>
          <h1 className="mt-2 font-display text-4xl text-forest-900">{campaign.name}</h1>
          {campaign.organizer ? <p className="mt-3 text-ink/70">{campaign.organizer.name}</p> : null}
          {campaign.bannerImageUrl && campaign.bannerThumbnailUrl ? (
            <div className="mt-6">
              <StoredImage
                image={{ url: campaign.bannerImageUrl, thumbnailUrl: campaign.bannerThumbnailUrl }}
                alt={`${campaign.name} banner`}
                className="h-56 w-full object-cover"
              />
            </div>
          ) : null}
          <p className="mt-6 text-lg leading-8 text-ink/80">{campaign.description}</p>
          <dl className="mt-8 grid gap-4 rounded-2xl border border-forest-900/10 bg-white/70 p-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-ink/60">Dates</dt>
              <dd className="mt-1">
                {formatCampaignDate(campaign.startDate)}
                {campaign.endDate ? ` – ${formatCampaignDate(campaign.endDate)}` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink/60">Visibility</dt>
              <dd className="mt-1">{campaign.visibility}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink/60">Tree target</dt>
              <dd className="mt-1">{formatTargetTrees(campaign.targetTrees) ?? 'Not published'}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink/60">Area target</dt>
              <dd className="mt-1">{formatTargetArea(campaign.targetAreaHectares) ?? 'Not published'}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink/60">Registered plantations</dt>
              <dd className="mt-1">
                <Link href={`/plantations?campaignId=${campaign.id}`} className="text-forest-800 underline">
                  {campaign.plantationCount}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink/60">Eligible locations</dt>
              <dd className="mt-1">
                {campaign.eligibleLocations
                  ? [...campaign.eligibleLocations.provinceCodes, ...campaign.eligibleLocations.districtCodes].join(', ') ||
                    'Nationwide'
                  : 'Nationwide'}
              </dd>
            </div>
          </dl>
          <p className="mt-6 text-sm text-ink/70">
            Link a plantation to this campaign when you submit a restoration record.
          </p>
          {campaign.editable ? (
            <Link
              href={`/campaigns/${campaign.slug}/edit`}
              className="mt-8 inline-block rounded-full bg-forest-800 px-4 py-2.5 text-cream hover:bg-forest-700"
            >
              Edit campaign
            </Link>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
