'use client';

import { ForestWatchApiClient } from '@forestwatch/api-client';
import { catalogueName } from '@forestwatch/i18n';
import type { LocationCatalogueStats, LocationDivision } from '@forestwatch/types';
import { APP_LOCALES } from '@forestwatch/types';
import { useEffect, useMemo, useState } from 'react';
import { inputClassName } from '@/components/auth-form';
import { useI18n } from '@/lib/i18n-context';
import { publicApiUrl } from '@/lib/public-api';

const client = new ForestWatchApiClient({ baseUrl: publicApiUrl, credentials: 'include' });

function label(row: LocationDivision, locale: string): string {
  return catalogueName(locale, { en: row.nameEn, si: row.nameSi, ta: row.nameTa });
}

export function LocationsExplorer() {
  const { locale, setLocale, t } = useI18n();
  const [stats, setStats] = useState<LocationCatalogueStats | null>(null);
  const [provinces, setProvinces] = useState<LocationDivision[]>([]);
  const [districts, setDistricts] = useState<LocationDivision[]>([]);
  const [dsds, setDsds] = useState<LocationDivision[]>([]);
  const [gnds, setGnds] = useState<LocationDivision[]>([]);
  const [gndTotal, setGndTotal] = useState<number | null>(null);
  const [provinceCode, setProvinceCode] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [dsdCode, setDsdCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([client.locationStats(), client.listProvinces()])
      .then(([nextStats, nextProvinces]) => {
        setStats(nextStats);
        setProvinces(nextProvinces);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : t('locations.loadError'));
      });
  }, [t]);

  useEffect(() => {
    setDistrictCode('');
    setDsdCode('');
    setDistricts([]);
    setDsds([]);
    setGnds([]);
    setGndTotal(null);
    if (!provinceCode) {
      return;
    }
    void client
      .listDistricts(provinceCode)
      .then(setDistricts)
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : t('locations.loadError'));
      });
  }, [provinceCode, t]);

  useEffect(() => {
    setDsdCode('');
    setDsds([]);
    setGnds([]);
    setGndTotal(null);
    if (!districtCode) {
      return;
    }
    void client
      .listDsds(districtCode)
      .then(setDsds)
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : t('locations.loadError'));
      });
  }, [districtCode, t]);

  useEffect(() => {
    setGnds([]);
    setGndTotal(null);
    if (!dsdCode) {
      return;
    }
    void client
      .listGnds({ dsdCode, limit: 100 })
      .then((page) => {
        setGnds(page.items);
        setGndTotal(page.meta.total);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : t('locations.loadError'));
      });
  }, [dsdCode, t]);

  const selected = useMemo(
    () => ({
      province: provinces.find((row) => row.code === provinceCode),
      district: districts.find((row) => row.code === districtCode),
      dsd: dsds.find((row) => row.code === dsdCode),
    }),
    [districtCode, districts, dsdCode, dsds, provinceCode, provinces],
  );

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:py-16">
      <p className="text-sm uppercase tracking-[0.2em] text-forest-600">{t('locations.kicker')}</p>
      <h1 className="mt-3 font-display text-3xl text-forest-900 sm:text-4xl">{t('locations.title')}</h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-ink/80">{t('locations.intro')}</p>

      {stats ? (
        <p className="mt-4 text-sm text-ink/70">
          {t('locations.catalogue', {
            provinces: stats.provinces,
            districts: stats.districts,
            dsds: stats.dsds,
            gnds: stats.gnds,
            source: stats.source,
          })}
        </p>
      ) : null}

      <div className="mt-4 flex gap-2">
        {APP_LOCALES.map((item) => (
          <button
            key={item}
            type="button"
            className={`rounded-full px-3 py-1 text-sm ${
              locale === item ? 'bg-forest-800 text-cream' : 'border border-forest-800/20 text-forest-800'
            }`}
            onClick={() => void setLocale(item)}
          >
            {t(`locale.${item}`)}
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-4 rounded-2xl border border-forest-900/10 bg-white/70 p-6">
        <label className="block text-sm text-ink/80">
          {t('locations.province')}
          <select
            className={`${inputClassName} mt-2`}
            value={provinceCode}
            onChange={(event) => setProvinceCode(event.target.value)}
          >
            <option value="">{t('locations.selectProvince')}</option>
            {provinces.map((row) => (
              <option key={row.code} value={row.code}>
                {label(row, locale)} ({row.code})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-ink/80">
          {t('locations.district')}
          <select
            className={`${inputClassName} mt-2`}
            value={districtCode}
            onChange={(event) => setDistrictCode(event.target.value)}
            disabled={!provinceCode}
          >
            <option value="">{t('locations.selectDistrict')}</option>
            {districts.map((row) => (
              <option key={row.code} value={row.code}>
                {label(row, locale)} ({row.code})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-ink/80">
          {t('locations.dsd')}
          <select
            className={`${inputClassName} mt-2`}
            value={dsdCode}
            onChange={(event) => setDsdCode(event.target.value)}
            disabled={!districtCode}
          >
            <option value="">{t('locations.selectDsd')}</option>
            {dsds.map((row) => (
              <option key={row.code} value={row.code}>
                {label(row, locale)} ({row.code})
              </option>
            ))}
          </select>
        </label>
        {error ? <p className="text-sm text-red-800">{error}</p> : null}
      </div>

      {selected.province ? (
        <p className="mt-6 text-sm text-ink/70">
          {t('locations.selected')}: {selected.province.code}
          {selected.district ? ` → ${selected.district.code}` : ''}
          {selected.dsd ? ` → ${selected.dsd.code}` : ''}
        </p>
      ) : null}

      {dsdCode ? (
        <div className="mt-6">
          <h2 className="font-display text-2xl text-forest-900">
            {t('locations.gndTitle')}
            {gndTotal !== null ? ` (${gndTotal})` : ''}
          </h2>
          <ul className="mt-4 divide-y divide-forest-900/10 rounded-2xl border border-forest-900/10 bg-white/70">
            {gnds.map((row) => (
              <li key={row.code} className="flex items-baseline justify-between gap-4 px-4 py-3 text-sm">
                <span>{label(row, locale)}</span>
                <code className="text-ink/60">{row.code}</code>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
