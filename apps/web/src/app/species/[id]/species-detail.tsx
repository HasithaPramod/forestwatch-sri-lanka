'use client';

import { catalogueName } from '@forestwatch/i18n';
import type { SpeciesDetail as SpeciesDetailType } from '@forestwatch/types';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { isAuthError, useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';
import { formatPlantationRecords, speciesPath } from '@/lib/species';
import { StoredImage } from '@/components/stored-image';

export function SpeciesDetail({ id }: { id: string }) {
  const { client, ready } = useAuth();
  const { locale, t } = useI18n();
  const [species, setSpecies] = useState<SpeciesDetailType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) {
      return;
    }
    void client
      .getSpecies(id)
      .then((detail) => {
        setSpecies(detail);
        setError(null);
      })
      .catch((caught: unknown) => {
        setSpecies(null);
        setError(isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Species not found');
      });
  }, [client, id, ready]);

  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <Link href="/species" className="text-sm text-forest-800 underline">
        {t('species.allSpecies')}
      </Link>
      {!ready ? <p className="mt-8 text-ink/70">Loading species…</p> : null}
      {error ? <p className="mt-8 text-sm text-red-800">{error}</p> : null}
      {species ? (
        <>
          <p className="mt-6 text-xs uppercase tracking-[0.2em] text-forest-700">{species.nativeStatus}</p>
          <h1 className="mt-2 font-display text-4xl text-forest-900">
            {catalogueName(locale, {
              en: species.commonEnglishName,
              si: species.sinhalaName,
              ta: species.tamilName,
            })}
          </h1>
          <p className="mt-2 text-lg italic text-ink/70">{species.scientificName}</p>
          <p className="mt-6 text-lg leading-8 text-ink/80">{species.description}</p>
          <dl className="mt-8 grid gap-4 rounded-2xl border border-forest-900/10 bg-white/70 p-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-ink/60">{t('species.sinhala')}</dt>
              <dd className="mt-1">{species.sinhalaName}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink/60">{t('species.tamil')}</dt>
              <dd className="mt-1">{species.tamilName}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink/60">Catalogue status</dt>
              <dd className="mt-1">{species.active ? 'Active' : 'Inactive'}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink/60">Plantation records</dt>
              <dd className="mt-1">
                <Link href={`/plantations?speciesId=${species.id}`} className="text-forest-800 underline">
                  {formatPlantationRecords(species.plantationRecordCount)}
                </Link>
              </dd>
            </div>
          </dl>
          {species.imageUrl && species.imageThumbnailUrl ? (
            <div className="mt-6">
              <StoredImage
                image={{ url: species.imageUrl, thumbnailUrl: species.imageThumbnailUrl }}
                alt={catalogueName(locale, {
                  en: species.commonEnglishName,
                  si: species.sinhalaName,
                  ta: species.tamilName,
                })}
              />
            </div>
          ) : (
            <p className="mt-6 text-sm text-ink/70">No catalogue photograph is stored yet.</p>
          )}
          {species.editable ? (
            <Link
              href={`${speciesPath(species.scientificName)}/edit`}
              className="mt-8 inline-block rounded-full bg-forest-800 px-4 py-2.5 text-cream hover:bg-forest-700"
            >
              Edit species
            </Link>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
