'use client';

import type { BadgeList, ForestDex, ForestQuestProfile, MissionList, PlantationDiscoveryList } from '@forestwatch/types';
import { catalogueName } from '@forestwatch/i18n';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ForestQuestField } from '@/app/forestquest/forestquest-field';
import { StatCard } from '@/components/stat-card';
import { isAuthError, useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';
import { formatCount } from '@/lib/dashboards';

function missionStatusLabel(
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED',
  t: (key: string) => string,
): string {
  if (status === 'COMPLETED') {
    return t('forestquest.missionComplete');
  }
  if (status === 'IN_PROGRESS') {
    return t('forestquest.missionInProgress');
  }
  return t('forestquest.missionAssigned');
}

export function ForestQuestSummary({ profile }: { profile: ForestQuestProfile }) {
  const { t } = useI18n();

  return (
    <>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('forestquest.displayTitle')}
          value={profile.displayTitle}
          hint={`${t('forestquest.level')} ${String(profile.level)}`}
        />
        <StatCard label={t('forestquest.confirmedXp')} value={formatCount(profile.confirmedXp)} />
        <StatCard label={t('forestquest.ecoPoints')} value={formatCount(profile.ecoPoints)} hint={t('forestquest.ecoPointsHint')} />
        <StatCard label={t('forestquest.pendingEvents')} value={formatCount(profile.pendingEvents)} />
      </div>
      {profile.nextTitle ? (
        <p className="mt-4 text-sm text-ink/70">
          {t('forestquest.nextTitle')}: {profile.nextTitle}
        </p>
      ) : null}
      <p className="mt-4 text-sm text-ink/70">{t('forestquest.rewardsActive')}</p>
      {profile.forestDex.available ? (
        <p className="mt-2 text-sm text-ink/70">
          {t('forestquest.forestDex')}:{' '}
          {t('forestquest.forestDexProgress', {
            discovered: profile.forestDex.discoveredCount,
            catalogue: profile.forestDex.catalogueCount,
          })}
        </p>
      ) : null}
      {profile.missions.available ? (
        <p className="mt-1 text-sm text-ink/70">
          {t('forestquest.missions')}: {formatCount(profile.missions.completedCount)} / {formatCount(profile.missions.activeCount)}
        </p>
      ) : null}
      {profile.badges.available ? (
        <p className="mt-1 text-sm text-ink/70">
          {t('forestquest.badges')}: {formatCount(profile.badges.awardedCount)}
        </p>
      ) : null}
      <p className="mt-1 text-sm text-ink/60">{t('forestquest.passportUnavailable')}</p>
      <p className="mt-1 text-sm text-ink/60">{t('forestquest.noAddXp')}</p>
    </>
  );
}

export function ForestQuestPanel() {
  const { client, user, ready } = useAuth();
  const { t, locale } = useI18n();
  const [profile, setProfile] = useState<ForestQuestProfile | null>(null);
  const [dex, setDex] = useState<ForestDex | null>(null);
  const [discoveries, setDiscoveries] = useState<PlantationDiscoveryList | null>(null);
  const [missions, setMissions] = useState<MissionList | null>(null);
  const [badges, setBadges] = useState<BadgeList | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !user) {
      setProfile(null);
      setDex(null);
      setDiscoveries(null);
      setMissions(null);
      setBadges(null);
      return;
    }
    void Promise.all([
      client.engagementProfile(),
      client.engagementForestDex(),
      client.engagementDiscoveries(),
      client.engagementMissions(),
      client.engagementBadges(),
    ]).then(
      ([nextProfile, nextDex, nextDiscoveries, nextMissions, nextBadges]) => {
        setProfile(nextProfile);
        setDex(nextDex);
        setDiscoveries(nextDiscoveries);
        setMissions(nextMissions);
        setBadges(nextBadges);
        setError(null);
      },
      (caught: unknown) => {
        setProfile(null);
        setDex(null);
        setDiscoveries(null);
        setMissions(null);
        setBadges(null);
        setError(isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Could not load ForestQuest');
      },
    );
  }, [client, ready, user]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:py-16">
      <h1 className="font-display text-3xl text-forest-900 sm:text-4xl">{t('forestquest.title')}</h1>
      <p className="mt-3 max-w-2xl text-ink/75">{t('forestquest.intro')}</p>

      {!ready ? <p className="mt-8 text-ink/70">{t('auth.loadingSession')}</p> : null}
      {ready && !user ? (
        <p className="mt-8 text-ink/70">
          <Link href="/login" className="text-forest-800 underline">
            {t('auth.signIn')}
          </Link>{' '}
          {t('forestquest.signIn')}
        </p>
      ) : null}
      {error ? <p className="mt-8 text-sm text-red-800">{error}</p> : null}
      <ForestQuestField
        profile={profile}
        discoveries={discoveries}
        mission={missions?.items.find((row) => row.userStatus !== 'COMPLETED') ?? missions?.items[0] ?? null}
      />
      {profile ? <ForestQuestSummary profile={profile} /> : null}

      {missions ? (
        <div className="mt-12">
          <h2 className="font-display text-2xl text-forest-900">{t('forestquest.missions')}</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink/70">{t('forestquest.missionsIntro')}</p>
          {missions.items.length === 0 ? (
            <p className="mt-3 text-sm text-ink/70">{t('forestquest.noMissions')}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {missions.items.map((row) => (
                <li key={row.id} className="rounded-2xl border border-forest-900/10 bg-white/70 px-4 py-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                    <p className="min-w-0 break-words font-medium text-forest-900">{row.title}</p>
                    <p className="shrink-0 text-xs uppercase tracking-wider text-forest-700">{missionStatusLabel(row.userStatus, t)}</p>
                  </div>
                  <p className="mt-1 text-sm text-ink/70">{row.description}</p>
                  <ul className="mt-2 space-y-1">
                    {row.tasks.map((task) => (
                      <li key={task.id} className="text-sm text-ink/70">
                        {task.title} · {t('forestquest.taskProgress', { current: task.current, required: task.required })}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {badges ? (
        <div className="mt-12">
          <h2 className="font-display text-2xl text-forest-900">{t('forestquest.badges')}</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink/70">{t('forestquest.badgesIntro')}</p>
          {badges.items.length === 0 ? (
            <p className="mt-3 text-sm text-ink/70">{t('forestquest.noBadges')}</p>
          ) : (
            <ul className="mt-4 divide-y divide-forest-900/10 rounded-2xl border border-forest-900/10 bg-white/70">
              {badges.items.map((row) => (
                <li key={row.id} className="px-4 py-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                    <p className="min-w-0 break-words font-medium text-forest-900">{row.name}</p>
                    <p className="shrink-0 text-xs uppercase tracking-wider text-forest-700">
                      {row.awarded ? t('forestquest.badgeAwarded') : t('forestquest.badgeLocked')}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-ink/70">{row.description}</p>
                  {row.awardedAt ? <p className="mt-1 text-xs text-ink/55">{row.awardedAt.slice(0, 10)}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {dex ? (
        <div className="mt-12">
          <h2 className="font-display text-2xl text-forest-900">{t('forestquest.forestDex')}</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink/70">{t('forestquest.forestDexIntro')}</p>
          <p className="mt-3 text-sm text-forest-800">
            {t('forestquest.forestDexProgress', {
              discovered: dex.discoveredCount,
              catalogue: dex.catalogueCount,
            })}
          </p>
          <ul className="mt-6 divide-y divide-forest-900/10 rounded-2xl border border-forest-900/10 bg-white/70">
            {dex.entries.map((row) => (
              <li key={row.speciesId} className="px-4 py-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                  <p className="min-w-0 break-words font-medium text-forest-900">
                    {catalogueName(locale, { en: row.commonEnglishName, si: row.sinhalaName, ta: row.tamilName })}
                  </p>
                  <p className="shrink-0 text-xs uppercase tracking-wider text-forest-700">
                    {row.discovered ? t('forestquest.discovered') : t('forestquest.locked')}
                  </p>
                </div>
                <p className="mt-1 text-sm italic text-ink/60">{row.scientificName}</p>
                {row.discovered ? (
                  <>
                    {row.description ? <p className="mt-2 text-sm text-ink/75">{row.description}</p> : null}
                    <p className="mt-2 text-xs text-ink/55">
                      {t('forestquest.verifiedEncounters')}: {formatCount(row.verifiedEncounters)}
                      {row.discoveredAt ? ` · ${t('forestquest.discoveredAt')} ${row.discoveredAt.slice(0, 10)}` : ''}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-xs text-ink/55">{t('forestquest.forestDexLockedHint')}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {discoveries ? (
        <div className="mt-12">
          <h2 className="font-display text-2xl text-forest-900">{t('forestquest.plantationDiscoveries')}</h2>
          {discoveries.items.length === 0 ? (
            <p className="mt-3 text-sm text-ink/70">{t('forestquest.noDiscoveries')}</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {discoveries.items.map((row) => (
                <li key={row.plantationId}>
                  <Link href={`/plantations/${row.plantationId}`} className="text-sm text-forest-800 underline">
                    {row.name}
                  </Link>
                  <span className="text-sm text-ink/60"> · {row.discoveredAt.slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
