'use client';

import type { NativeStatus } from '@forestwatch/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthCard, Field, buttonClassName, inputClassName } from '@/components/auth-form';
import { ImageUploadField } from '@/components/image-upload-field';
import { isAuthError, useAuth } from '@/lib/auth-context';
import { canManageSpecies, speciesPath } from '@/lib/species';

const STATUSES: NativeStatus[] = ['NATIVE', 'ENDEMIC', 'INTRODUCED', 'UNKNOWN'];

export function SpeciesForm({ id }: { id?: string }) {
  const router = useRouter();
  const { client, user, ready } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(!id);
  const [values, setValues] = useState({
    scientificName: '',
    commonEnglishName: '',
    sinhalaName: '',
    tamilName: '',
    nativeStatus: 'NATIVE' as NativeStatus,
    description: '',
    active: true,
  });
  const [photo, setPhoto] = useState<{ url: string; thumbnailUrl: string } | null>(null);

  useEffect(() => {
    if (!ready || !id) {
      return;
    }
    void client
      .getSpecies(id)
      .then((species) => {
        setValues({
          scientificName: species.scientificName,
          commonEnglishName: species.commonEnglishName,
          sinhalaName: species.sinhalaName,
          tamilName: species.tamilName,
          nativeStatus: species.nativeStatus,
          description: species.description,
          active: species.active,
        });
        setPhoto(
          species.imageUrl && species.imageThumbnailUrl
            ? { url: species.imageUrl, thumbnailUrl: species.imageThumbnailUrl }
            : null,
        );
        setLoaded(true);
      })
      .catch((caught: unknown) => {
        setError(isAuthError(caught) ? caught.message : 'Species not found');
        setLoaded(true);
      });
  }, [client, id, ready]);

  if (!ready) {
    return (
      <AuthCard title={id ? 'Edit species' : 'New species'}>
        <p className="text-ink/70">Loading session…</p>
      </AuthCard>
    );
  }

  if (!canManageSpecies(user)) {
    return (
      <AuthCard title={id ? 'Edit species' : 'New species'}>
        <p className="text-ink/80">Admins maintain the species catalogue.</p>
        <Link href="/login" className={`${buttonClassName} mt-6 block text-center`}>
          Login
        </Link>
      </AuthCard>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-display text-4xl text-forest-900">{id ? 'Edit species' : 'New species'}</h1>
      {!loaded ? <p className="mt-8 text-ink/70">Loading species…</p> : null}
      {loaded ? (
        <form
          className="mt-8 space-y-4 rounded-2xl border border-forest-900/10 bg-white/70 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const body = {
              scientificName: String(form.get('scientificName') ?? '').trim(),
              commonEnglishName: String(form.get('commonEnglishName') ?? '').trim(),
              sinhalaName: String(form.get('sinhalaName') ?? '').trim(),
              tamilName: String(form.get('tamilName') ?? '').trim(),
              nativeStatus: String(form.get('nativeStatus') ?? 'UNKNOWN') as NativeStatus,
              description: String(form.get('description') ?? '').trim(),
              active: form.get('active') === 'true',
            };
            setPending(true);
            setError(null);
            const request = id ? client.updateSpecies(id, body) : client.createSpecies(body);
            void request
              .then((species) => router.push(speciesPath(species.scientificName)))
              .catch((caught: unknown) => {
                setError(isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Save failed');
              })
              .finally(() => setPending(false));
          }}
        >
          <Field label="Scientific name">
            <input className={inputClassName} name="scientificName" defaultValue={values.scientificName} required minLength={3} />
          </Field>
          <Field label="English name">
            <input className={inputClassName} name="commonEnglishName" defaultValue={values.commonEnglishName} required />
          </Field>
          <Field label="Sinhala name">
            <input className={inputClassName} name="sinhalaName" defaultValue={values.sinhalaName} required />
          </Field>
          <Field label="Tamil name">
            <input className={inputClassName} name="tamilName" defaultValue={values.tamilName} required />
          </Field>
          <Field label="Native status">
            <select className={inputClassName} name="nativeStatus" defaultValue={values.nativeStatus}>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <textarea className={inputClassName} name="description" defaultValue={values.description} required minLength={10} rows={4} />
          </Field>
          <Field label="Catalogue status">
            <select className={inputClassName} name="active" defaultValue={values.active ? 'true' : 'false'}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </Field>
          {id ? (
            <ImageUploadField
              label="Catalogue photograph"
              current={photo}
              onUpload={async (file) => {
                const species = await client.uploadSpeciesImage(id, file, file.name);
                setPhoto(
                  species.imageUrl && species.imageThumbnailUrl
                    ? { url: species.imageUrl, thumbnailUrl: species.imageThumbnailUrl }
                    : null,
                );
              }}
              onRemove={
                photo
                  ? async () => {
                      const species = await client.deleteSpeciesImage(id);
                      setPhoto(
                        species.imageUrl && species.imageThumbnailUrl
                          ? { url: species.imageUrl, thumbnailUrl: species.imageThumbnailUrl }
                          : null,
                      );
                    }
                  : undefined
              }
            />
          ) : (
            <p className="text-sm text-ink/60">Add a catalogue photograph after the species is created.</p>
          )}
          {error ? <p className="text-sm text-red-800">{error}</p> : null}
          <button className={buttonClassName} type="submit" disabled={pending}>
            {pending ? 'Saving…' : id ? 'Save species' : 'Create species'}
          </button>
        </form>
      ) : null}
    </section>
  );
}
