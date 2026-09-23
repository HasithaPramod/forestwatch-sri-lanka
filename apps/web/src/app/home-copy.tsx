'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n-context';

function CanopyMark() {
  return (
    <svg viewBox="0 0 640 320" className="h-auto w-full" role="img" aria-label="Stylized Sri Lankan canopy and hills">
      <rect width="640" height="320" fill="#16382c" />
      <path d="M0 220 C80 160 140 190 220 150 C300 110 340 180 430 140 C520 100 580 160 640 120 L640 320 L0 320 Z" fill="#1f4d3a" />
      <path d="M0 250 C120 210 200 240 310 210 C420 180 500 230 640 190 L640 320 L0 320 Z" fill="#2f6f4e" />
      <circle cx="508" cy="78" r="28" fill="#e4ecdf" />
      <path d="M70 250 C90 190 130 190 150 250" fill="none" stroke="#7d9b6a" strokeWidth="6" />
      <path d="M118 250 C138 170 188 170 208 250" fill="none" stroke="#cfe0c4" strokeWidth="8" />
      <path d="M190 250 C210 200 250 200 270 250" fill="none" stroke="#7d9b6a" strokeWidth="6" />
    </svg>
  );
}

const STEPS = [
  { titleKey: 'home.stepPlantTitle', bodyKey: 'home.stepPlantBody' },
  { titleKey: 'home.stepRecordTitle', bodyKey: 'home.stepRecordBody' },
  { titleKey: 'home.stepMonitorTitle', bodyKey: 'home.stepMonitorBody' },
  { titleKey: 'home.stepVerifyTitle', bodyKey: 'home.stepVerifyBody' },
] as const;

export function HomeCopy() {
  const { t } = useI18n();

  return (
    <>
      <section className="bg-forest-900 text-cream">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-mist">{t('site.nationalPlatform')}</p>
            <h1 className="mt-4 font-display text-4xl leading-tight sm:text-5xl md:text-6xl">{t('home.tagline')}</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-cream/80">{t('home.intro')}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/plantations" className="rounded-full bg-cream px-5 py-3 text-forest-900">
                {t('home.explore')}
              </Link>
              <Link href="/campaigns" className="rounded-full border border-cream/40 px-5 py-3">
                {t('home.join')}
              </Link>
            </div>
          </div>
          <CanopyMark />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-3xl text-forest-900">{t('home.howTitle')}</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.titleKey} className="rounded-2xl border border-forest-900/10 bg-white/50 p-5">
              <p className="text-sm text-copper">0{index + 1}</p>
              <h3 className="mt-2 font-display text-2xl text-forest-800">{t(step.titleKey)}</h3>
              <p className="mt-3 text-sm leading-6 text-ink/75">{t(step.bodyKey)}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

export function HomeQuest() {
  const { t } = useI18n();

  return (
    <section className="bg-mist">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-3xl text-forest-900">{t('home.questTitle')}</h2>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-ink/80">{t('home.questBody')}</p>
      </div>
    </section>
  );
}
