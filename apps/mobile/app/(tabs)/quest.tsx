import type { BadgeList, ForestDex, ForestQuestProfile, MissionList, PlantationDiscoveryList } from '@forestwatch/types';
import { catalogueName } from '@forestwatch/i18n';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ForestQuestField } from '@/components/ForestQuestField';
import { Card, Heading, Loading, Muted, Screen, StatGrid, StatTile } from '@/components/ui';
import { Text } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';
import { errorMessage } from '@/lib/errors';

export default function QuestScreen() {
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
      (caught: unknown) => setError(errorMessage(caught, 'Could not load ForestQuest')),
    );
  }, [client, ready, user]);

  return (
    <Screen>
      <Heading>{t('forestquest.title')}</Heading>
      <Muted>{t('forestquest.intro')}</Muted>
      {!ready ? <Loading label={t('common.loading')} /> : null}
      {ready && !user ? (
        <Link href="/login">
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1f4d3a' }}>{t('auth.signIn')}</Text>
        </Link>
      ) : null}
      {ready && !user ? <Muted>{t('forestquest.signIn')}</Muted> : null}
      {error ? <Muted>{error}</Muted> : null}
      <ForestQuestField
        profile={profile}
        discoveries={discoveries}
        mission={missions?.items.find((row) => row.userStatus !== 'COMPLETED') ?? missions?.items[0] ?? null}
      />
      {profile ? (
        <>
          <Card>
            <Muted>{t('forestquest.displayTitle')}</Muted>
            <Text style={{ fontSize: 20, fontWeight: '700' }}>{profile.displayTitle}</Text>
            <Muted>
              {t('forestquest.level')} {String(profile.level)}
            </Muted>
          </Card>
          <StatGrid>
            <StatTile label={t('forestquest.confirmedXp')} value={String(profile.confirmedXp)} />
            <StatTile label={t('forestquest.ecoPoints')} value={String(profile.ecoPoints)} />
            <StatTile label={t('forestquest.pendingEvents')} value={String(profile.pendingEvents)} />
            {profile.forestDex.available ? (
              <StatTile
                label={t('forestquest.forestDex')}
                value={t('forestquest.forestDexProgress', {
                  discovered: profile.forestDex.discoveredCount,
                  catalogue: profile.forestDex.catalogueCount,
                })}
              />
            ) : null}
          </StatGrid>
          <Muted>{t('forestquest.rewardsActive')}</Muted>
          <Muted>{t('forestquest.noAddXp')}</Muted>
        </>
      ) : null}
      {missions ? (
        <>
          <Heading>{t('forestquest.missions')}</Heading>
          <Muted>{t('forestquest.missionsIntro')}</Muted>
          {missions.items.length === 0 ? <Muted>{t('forestquest.noMissions')}</Muted> : null}
          {missions.items.map((row) => (
            <Card key={row.id}>
              <Text style={{ fontSize: 16, fontWeight: '700' }}>{row.title}</Text>
              <Muted>{row.description}</Muted>
              <Muted>
                {row.userStatus === 'COMPLETED'
                  ? t('forestquest.missionComplete')
                  : row.userStatus === 'IN_PROGRESS'
                    ? t('forestquest.missionInProgress')
                    : t('forestquest.missionAssigned')}
              </Muted>
              {row.tasks.map((task) => (
                <Muted key={task.id}>
                  {task.title}: {t('forestquest.taskProgress', { current: task.current, required: task.required })}
                </Muted>
              ))}
            </Card>
          ))}
        </>
      ) : null}
      {badges ? (
        <>
          <Heading>{t('forestquest.badges')}</Heading>
          <Muted>{t('forestquest.badgesIntro')}</Muted>
          {badges.items.length === 0 ? <Muted>{t('forestquest.noBadges')}</Muted> : null}
          {badges.items.map((row) => (
            <Card key={row.id}>
              <Text style={{ fontSize: 16, fontWeight: '700' }}>{row.name}</Text>
              <Muted>{row.description}</Muted>
              <Muted>{row.awarded ? t('forestquest.badgeAwarded') : t('forestquest.badgeLocked')}</Muted>
            </Card>
          ))}
        </>
      ) : null}
      {dex ? (
        <>
          <Heading>{t('forestquest.forestDex')}</Heading>
          <Muted>{t('forestquest.forestDexIntro')}</Muted>
          {dex.entries.map((row) => (
            <Card key={row.speciesId}>
              <Text style={{ fontSize: 16, fontWeight: '700' }}>
                {catalogueName(locale, { en: row.commonEnglishName, si: row.sinhalaName, ta: row.tamilName })}
              </Text>
              <Muted>{row.scientificName}</Muted>
              <Muted>{row.discovered ? t('forestquest.discovered') : t('forestquest.locked')}</Muted>
              {row.discovered ? (
                <Muted>
                  {t('forestquest.verifiedEncounters')}: {String(row.verifiedEncounters)}
                </Muted>
              ) : (
                <Muted>{t('forestquest.forestDexLockedHint')}</Muted>
              )}
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
