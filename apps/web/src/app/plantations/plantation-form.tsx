'use client';

import type { CampaignSummary, LocationDivision, SpeciesSummary } from '@forestwatch/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AuthCard, Field, buttonClassName, inputClassName } from '@/components/auth-form';
import { isAuthError, useAuth } from '@/lib/auth-context';
import { canSubmitPlantations } from '@/lib/plantations';

type SpeciesRow = { speciesId: string; quantity: string };

export function PlantationForm({ id }: { id?: string }) {
  const router = useRouter();
  const { client, user, ready } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(!id);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [catalogue, setCatalogue] = useState<SpeciesSummary[]>([]);
  const [provinces, setProvinces] = useState<LocationDivision[]>([]);
  const [districts, setDistricts] = useState<LocationDivision[]>([]);
  const [dsds, setDsds] = useState<LocationDivision[]>([]);
  const [gnds, setGnds] = useState<LocationDivision[]>([]);
  const [provinceCode, setProvinceCode] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [dsdCode, setDsdCode] = useState('');
  const [gndCode, setGndCode] = useState('');
  const [speciesRows, setSpeciesRows] = useState<SpeciesRow[]>([{ speciesId: '', quantity: '' }]);
  const [values, setValues] = useState({
    name: '',
    description: '',
    type: 'PLANTATION_SITE',
    campaignId: '',
    latitude: '',
    longitude: '',
    plantingDate: '',
    areaHectares: '',
    locationVisibility: 'PUBLIC_APPROXIMATE',
  });

  const treeTotal = useMemo(
    () => speciesRows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0),
    [speciesRows],
  );

  useEffect(() => {
    if (!ready) {
      return;
    }
    void Promise.all([client.listCampaigns({ limit: 50 }), client.listSpecies({ limit: 50 }), client.listProvinces()])
      .then(([campaignPage, speciesPage, nextProvinces]) => {
        setCampaigns(campaignPage.items);
        setCatalogue(speciesPage.items);
        setProvinces(nextProvinces);
      })
      .catch((caught: unknown) => {
        setError(isAuthError(caught) ? caught.message : 'Could not load catalogue data');
      });
  }, [client, ready]);

  useEffect(() => {
    if (!provinceCode) {
      setDistricts([]);
      return;
    }
    void client.listDistricts(provinceCode).then(setDistricts).catch(() => undefined);
  }, [client, provinceCode]);

  useEffect(() => {
    if (!districtCode) {
      setDsds([]);
      return;
    }
    void client.listDsds(districtCode).then(setDsds).catch(() => undefined);
  }, [client, districtCode]);

  useEffect(() => {
    if (!dsdCode) {
      setGnds([]);
      return;
    }
    void client
      .listGnds({ dsdCode, limit: 100 })
      .then((page) => setGnds(page.items))
      .catch(() => undefined);
  }, [client, dsdCode]);

  useEffect(() => {
    if (!ready || !id) {
      return;
    }
    void client
      .getPlantation(id)
      .then((plantation) => {
        setValues({
          name: plantation.name,
          description: plantation.description ?? '',
          type: plantation.type,
          campaignId: plantation.campaign?.id ?? '',
          latitude: plantation.coordinates.precision === 'hidden' ? '' : String(plantation.coordinates.latitude ?? ''),
          longitude: plantation.coordinates.precision === 'hidden' ? '' : String(plantation.coordinates.longitude ?? ''),
          plantingDate: plantation.plantingDate.slice(0, 10),
          areaHectares: plantation.areaHectares == null ? '' : String(plantation.areaHectares),
          locationVisibility: plantation.locationVisibility,
        });
        setProvinceCode(plantation.provinceCode ?? '');
        setDistrictCode(plantation.districtCode ?? '');
        setDsdCode(plantation.dsdCode ?? '');
        setGndCode(plantation.gndCode ?? '');
        setSpeciesRows(
          plantation.species.map((row) => ({ speciesId: row.speciesId, quantity: String(row.quantity) })),
        );
        setLoaded(true);
      })
      .catch((caught: unknown) => {
        setError(isAuthError(caught) ? caught.message : 'Plantation not found');
        setLoaded(true);
      });
  }, [client, id, ready]);

  if (!ready) {
    return (
      <AuthCard title={id ? 'Edit plantation' : 'Record a plantation'}>
        <p className="text-ink/70">Loading session…</p>
      </AuthCard>
    );
  }

  if (!canSubmitPlantations(user)) {
    return (
      <AuthCard title={id ? 'Edit plantation' : 'Record a plantation'}>
        <p className="text-ink/80">Sign in to submit a plantation record.</p>
        <Link href="/login" className={`${buttonClassName} mt-6 block text-center`}>
          Login
        </Link>
      </AuthCard>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-display text-4xl text-forest-900">{id ? 'Edit plantation' : 'Record a plantation'}</h1>
      {!loaded ? <p className="mt-8 text-ink/70">Loading plantation…</p> : null}
      {loaded ? (
        <form
          className="mt-8 space-y-4 rounded-2xl border border-forest-900/10 bg-white/70 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const species = speciesRows
              .filter((row) => row.speciesId && row.quantity)
              .map((row) => ({ speciesId: row.speciesId, quantity: Number(row.quantity) }));
            const body = {
              name: String(form.get('name') ?? '').trim(),
              description: String(form.get('description') ?? '').trim() || null,
              type: String(form.get('type') ?? 'PLANTATION_SITE') as 'INDIVIDUAL_TREE' | 'PLANTATION_SITE',
              campaignId: String(form.get('campaignId') ?? '') || null,
              latitude: Number(form.get('latitude')),
              longitude: Number(form.get('longitude')),
              provinceCode,
              districtCode,
              dsdCode: dsdCode || null,
              gndCode: gndCode || null,
              plantingDate: String(form.get('plantingDate') ?? ''),
              treeCount: treeTotal,
              areaHectares: String(form.get('areaHectares') ?? '') ? Number(form.get('areaHectares')) : null,
              locationVisibility: String(form.get('locationVisibility') ?? 'PUBLIC_APPROXIMATE') as
                | 'PUBLIC_EXACT'
                | 'PUBLIC_APPROXIMATE'
                | 'OFFICER_ONLY',
              species,
            };
            setPending(true);
            setError(null);
            const request = id ? client.updatePlantation(id, body) : client.createPlantation(body);
            void request
              .then((plantation) => router.push(`/plantations/${plantation.id}`))
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
            <textarea className={inputClassName} name="description" defaultValue={values.description} rows={3} />
          </Field>
          <Field label="Type">
            <select className={inputClassName} name="type" defaultValue={values.type}>
              <option value="PLANTATION_SITE">Plantation site</option>
              <option value="INDIVIDUAL_TREE">Individual tree</option>
            </select>
          </Field>
          <Field label="Campaign (optional)">
            <select className={inputClassName} name="campaignId" defaultValue={values.campaignId}>
              <option value="">None</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Latitude">
            <input className={inputClassName} name="latitude" type="number" step="any" defaultValue={values.latitude} required />
          </Field>
          <Field label="Longitude">
            <input className={inputClassName} name="longitude" type="number" step="any" defaultValue={values.longitude} required />
          </Field>
          <Field label="Province">
            <select
              className={inputClassName}
              value={provinceCode}
              onChange={(event) => {
                setProvinceCode(event.target.value);
                setDistrictCode('');
                setDsdCode('');
                setGndCode('');
              }}
              required
            >
              <option value="">Select a province</option>
              {provinces.map((row) => (
                <option key={row.code} value={row.code}>
                  {row.nameEn} ({row.code})
                </option>
              ))}
            </select>
          </Field>
          <Field label="District">
            <select
              className={inputClassName}
              value={districtCode}
              onChange={(event) => {
                setDistrictCode(event.target.value);
                setDsdCode('');
                setGndCode('');
              }}
              required
              disabled={!provinceCode}
            >
              <option value="">Select a district</option>
              {districts.map((row) => (
                <option key={row.code} value={row.code}>
                  {row.nameEn} ({row.code})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Divisional Secretariat (optional)">
            <select
              className={inputClassName}
              value={dsdCode}
              onChange={(event) => {
                setDsdCode(event.target.value);
                setGndCode('');
              }}
              disabled={!districtCode}
            >
              <option value="">None</option>
              {dsds.map((row) => (
                <option key={row.code} value={row.code}>
                  {row.nameEn} ({row.code})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Grama Niladhari division (optional)">
            <select className={inputClassName} value={gndCode} onChange={(event) => setGndCode(event.target.value)} disabled={!dsdCode}>
              <option value="">None</option>
              {gnds.map((row) => (
                <option key={row.code} value={row.code}>
                  {row.nameEn} ({row.code})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Planting date">
            <input className={inputClassName} name="plantingDate" type="date" defaultValue={values.plantingDate} required />
          </Field>
          <Field label="Area (hectares, optional)">
            <input className={inputClassName} name="areaHectares" type="number" min={0.0001} step="any" defaultValue={values.areaHectares} />
          </Field>
          <Field label="Location visibility">
            <select className={inputClassName} name="locationVisibility" defaultValue={values.locationVisibility}>
              <option value="PUBLIC_EXACT">Public exact</option>
              <option value="PUBLIC_APPROXIMATE">Public approximate</option>
              <option value="OFFICER_ONLY">Officer only</option>
            </select>
          </Field>
          <div>
            <p className="text-sm text-ink/80">Species</p>
            <p className="mt-1 text-xs text-ink/60">Quantities are the recorded breakdown. They become the tree count.</p>
            <div className="mt-3 space-y-3">
              {speciesRows.map((row, index) => (
                <div key={`${row.speciesId}-${index}`} className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                  <select
                    className={inputClassName}
                    value={row.speciesId}
                    onChange={(event) =>
                      setSpeciesRows((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, speciesId: event.target.value } : item,
                        ),
                      )
                    }
                    required
                  >
                    <option value="">Select species</option>
                    {catalogue.map((species) => (
                      <option key={species.id} value={species.id}>
                        {species.commonEnglishName} ({species.scientificName})
                      </option>
                    ))}
                  </select>
                  <input
                    className={inputClassName}
                    type="number"
                    min={1}
                    value={row.quantity}
                    onChange={(event) =>
                      setSpeciesRows((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, quantity: event.target.value } : item,
                        ),
                      )
                    }
                    required
                    placeholder="Qty"
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              className="mt-3 text-sm text-forest-800 underline"
              onClick={() => setSpeciesRows((current) => [...current, { speciesId: '', quantity: '' }])}
            >
              Add species
            </button>
            <p className="mt-2 text-sm text-ink/60">Recorded trees: {treeTotal}</p>
          </div>
          {id ? (
            <p className="text-sm text-ink/60">Photographs are added on the plantation page after this record is saved.</p>
          ) : (
            <p className="text-sm text-ink/60">After submit, open the record to attach photographs. Images are not stored in PostgreSQL.</p>
          )}
          {error ? <p className="text-sm text-red-800">{error}</p> : null}
          <button className={buttonClassName} type="submit" disabled={pending || treeTotal < 1}>
            {pending ? 'Saving…' : id ? 'Save plantation' : 'Submit plantation'}
          </button>
        </form>
      ) : null}
    </section>
  );
}
