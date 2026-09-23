'use client';

import type { CampaignStatus, CampaignVisibility, LocationDivision } from '@forestwatch/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthCard, Field, buttonClassName, inputClassName } from '@/components/auth-form';
import { ImageUploadField } from '@/components/image-upload-field';
import { isAuthError, useAuth } from '@/lib/auth-context';
import { canManageCampaigns } from '@/lib/campaigns';

const STATUSES: CampaignStatus[] = ['DRAFT', 'UPCOMING', 'ACTIVE', 'COMPLETED', 'ARCHIVED'];
const VISIBILITIES: CampaignVisibility[] = ['PUBLIC', 'PRIVATE'];

export function CampaignForm({ slug }: { slug?: string }) {
  const router = useRouter();
  const { client, user, ready } = useAuth();
  const [provinces, setProvinces] = useState<LocationDivision[]>([]);
  const [districts, setDistricts] = useState<LocationDivision[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(!slug);
  const [values, setValues] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    targetTrees: '',
    targetAreaHectares: '',
    status: 'DRAFT' as CampaignStatus,
    visibility: 'PUBLIC' as CampaignVisibility,
    provinceCode: '',
    districtCode: '',
  });
  const [banner, setBanner] = useState<{ url: string; thumbnailUrl: string } | null>(null);

  useEffect(() => {
    if (!ready) {
      return;
    }
    void client.listProvinces().then(setProvinces).catch(() => undefined);
  }, [client, ready]);

  useEffect(() => {
    if (!values.provinceCode) {
      setDistricts([]);
      return;
    }
    void client.listDistricts(values.provinceCode).then(setDistricts).catch(() => undefined);
  }, [client, values.provinceCode]);

  useEffect(() => {
    if (!ready || !slug) {
      return;
    }
    void client
      .getCampaign(slug)
      .then((campaign) => {
        setValues({
          name: campaign.name,
          description: campaign.description,
          startDate: campaign.startDate.slice(0, 10),
          endDate: campaign.endDate?.slice(0, 10) ?? '',
          targetTrees: campaign.targetTrees == null ? '' : String(campaign.targetTrees),
          targetAreaHectares: campaign.targetAreaHectares == null ? '' : String(campaign.targetAreaHectares),
          status: campaign.status,
          visibility: campaign.visibility,
          provinceCode: campaign.eligibleLocations?.provinceCodes[0] ?? '',
          districtCode: campaign.eligibleLocations?.districtCodes[0] ?? '',
        });
        setBanner(
          campaign.bannerImageUrl && campaign.bannerThumbnailUrl
            ? { url: campaign.bannerImageUrl, thumbnailUrl: campaign.bannerThumbnailUrl }
            : null,
        );
        setLoaded(true);
      })
      .catch((caught: unknown) => {
        setError(isAuthError(caught) ? caught.message : 'Campaign not found');
        setLoaded(true);
      });
  }, [client, ready, slug]);

  if (!ready) {
    return (
      <AuthCard title={slug ? 'Edit campaign' : 'New campaign'}>
        <p className="text-ink/70">Loading session…</p>
      </AuthCard>
    );
  }

  if (!canManageCampaigns(user)) {
    return (
      <AuthCard title={slug ? 'Edit campaign' : 'New campaign'}>
        <p className="text-ink/80">Organization managers and admins can publish campaigns.</p>
        <Link href="/login" className={`${buttonClassName} mt-6 block text-center`}>
          Login
        </Link>
      </AuthCard>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-display text-4xl text-forest-900">{slug ? 'Edit campaign' : 'New campaign'}</h1>
      {!loaded ? <p className="mt-8 text-ink/70">Loading campaign…</p> : null}
      {loaded ? (
        <form
          className="mt-8 space-y-4 rounded-2xl border border-forest-900/10 bg-white/70 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const name = String(form.get('name') ?? '').trim();
            const description = String(form.get('description') ?? '').trim();
            const startDate = String(form.get('startDate') ?? '');
            const endDate = String(form.get('endDate') ?? '');
            const targetTreesRaw = String(form.get('targetTrees') ?? '');
            const targetAreaRaw = String(form.get('targetAreaHectares') ?? '');
            const status = String(form.get('status') ?? 'DRAFT') as CampaignStatus;
            const visibility = String(form.get('visibility') ?? 'PUBLIC') as CampaignVisibility;
            const provinceCode = String(form.get('provinceCode') ?? '');
            const districtCode = String(form.get('districtCode') ?? '');
            const body = {
              name,
              description,
              startDate,
              endDate: endDate || null,
              targetTrees: targetTreesRaw ? Number(targetTreesRaw) : null,
              targetAreaHectares: targetAreaRaw ? Number(targetAreaRaw) : null,
              status,
              visibility,
              eligibleLocations:
                provinceCode || districtCode
                  ? {
                      provinceCodes: provinceCode ? [provinceCode] : [],
                      districtCodes: districtCode ? [districtCode] : [],
                    }
                  : null,
            };
            setPending(true);
            setError(null);
            const request = slug ? client.updateCampaign(slug, body) : client.createCampaign(body);
            void request
              .then((campaign) => router.push(`/campaigns/${campaign.slug}`))
              .catch((caught: unknown) => {
                setError(isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Save failed');
              })
              .finally(() => setPending(false));
          }}
        >
          <Field label="Name">
            <input className={inputClassName} name="name" defaultValue={values.name} required minLength={3} />
          </Field>
          <Field label="Description">
            <textarea className={inputClassName} name="description" defaultValue={values.description} required minLength={10} rows={4} />
          </Field>
          <Field label="Start date">
            <input className={inputClassName} name="startDate" type="date" defaultValue={values.startDate} required />
          </Field>
          <Field label="End date">
            <input className={inputClassName} name="endDate" type="date" defaultValue={values.endDate} />
          </Field>
          <Field label="Target trees">
            <input className={inputClassName} name="targetTrees" type="number" min={1} defaultValue={values.targetTrees} />
          </Field>
          <Field label="Target area (hectares)">
            <input
              className={inputClassName}
              name="targetAreaHectares"
              type="number"
              min={0.0001}
              step="any"
              defaultValue={values.targetAreaHectares}
            />
          </Field>
          <Field label="Status">
            <select className={inputClassName} name="status" defaultValue={values.status}>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Visibility">
            <select className={inputClassName} name="visibility" defaultValue={values.visibility}>
              {VISIBILITIES.map((visibility) => (
                <option key={visibility} value={visibility}>
                  {visibility}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Eligible province (optional)">
            <select
              className={inputClassName}
              name="provinceCode"
              value={values.provinceCode}
              onChange={(event) =>
                setValues((current) => ({ ...current, provinceCode: event.target.value, districtCode: '' }))
              }
            >
              <option value="">Nationwide / unset</option>
              {provinces.map((row) => (
                <option key={row.code} value={row.code}>
                  {row.nameEn} ({row.code})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Eligible district (optional)">
            <select
              className={inputClassName}
              name="districtCode"
              value={values.districtCode}
              onChange={(event) => setValues((current) => ({ ...current, districtCode: event.target.value }))}
            >
              <option value="">None</option>
              {districts.map((row) => (
                <option key={row.code} value={row.code}>
                  {row.nameEn} ({row.code})
                </option>
              ))}
            </select>
          </Field>
          {slug ? (
            <ImageUploadField
              label="Banner photograph"
              current={banner}
              onUpload={async (file) => {
                const campaign = await client.uploadCampaignBanner(slug, file, file.name);
                setBanner(
                  campaign.bannerImageUrl && campaign.bannerThumbnailUrl
                    ? { url: campaign.bannerImageUrl, thumbnailUrl: campaign.bannerThumbnailUrl }
                    : null,
                );
              }}
              onRemove={
                banner
                  ? async () => {
                      const campaign = await client.deleteCampaignBanner(slug);
                      setBanner(
                        campaign.bannerImageUrl && campaign.bannerThumbnailUrl
                          ? { url: campaign.bannerImageUrl, thumbnailUrl: campaign.bannerThumbnailUrl }
                          : null,
                      );
                    }
                  : undefined
              }
            />
          ) : (
            <p className="text-sm text-ink/60">Add a banner after the campaign is created.</p>
          )}
          {error ? <p className="text-sm text-red-800">{error}</p> : null}
          <button className={buttonClassName} type="submit" disabled={pending}>
            {pending ? 'Saving…' : slug ? 'Save campaign' : 'Create campaign'}
          </button>
        </form>
      ) : null}
    </section>
  );
}
