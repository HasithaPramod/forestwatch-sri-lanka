'use client';

import type { AdminDashboard, MeDashboard, OfficerDashboard } from '@forestwatch/types';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ForestQuestSummary } from '@/app/forestquest/forestquest-panel';
import { StatCard } from '@/components/stat-card';
import { isAuthError, useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';
import { formatBytes, formatCount, isAdminUser, isOfficerUser } from '@/lib/dashboards';

export function DashboardHub() {
  const { client, user, ready } = useAuth();
  const { t } = useI18n();
  const [me, setMe] = useState<MeDashboard | null>(null);
  const [officer, setOfficer] = useState<OfficerDashboard | null>(null);
  const [admin, setAdmin] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !user) {
      setMe(null);
      setOfficer(null);
      setAdmin(null);
      return;
    }
    const tasks: Array<Promise<unknown>> = [
      client.meDashboard().then(setMe),
    ];
    if (isOfficerUser(user)) {
      tasks.push(client.officerDashboard().then(setOfficer));
    }
    if (isAdminUser(user)) {
      tasks.push(client.adminDashboard().then(setAdmin));
    }
    void Promise.all(tasks).then(
      () => setError(null),
      (caught: unknown) => {
        setError(isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Could not load dashboard');
      },
    );
  }, [client, ready, user]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:py-16">
      <h1 className="font-display text-3xl text-forest-900 sm:text-4xl">{t('dashboard.title')}</h1>
      <p className="mt-3 max-w-2xl text-ink/75">{t('dashboard.intro')}</p>

      {!ready ? <p className="mt-8 text-ink/70">{t('auth.loadingSession')}</p> : null}
      {ready && !user ? (
        <p className="mt-8 text-ink/70">
          <Link href="/login" className="text-forest-800 underline">
            {t('auth.signIn')}
          </Link>{' '}
          {t('dashboard.signInFor')}{' '}
          <Link href="/impact" className="text-forest-800 underline">
            {t('nav.impact')}
          </Link>
          .
        </p>
      ) : null}
      {error ? <p className="mt-8 text-sm text-red-800">{error}</p> : null}

      {me ? (
        <div className="mt-10">
          <h2 className="font-display text-2xl text-forest-900">{t('dashboard.myContributions')}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={t('dashboard.myPlantations')} value={formatCount(me.plantations)} />
            <StatCard label={t('dashboard.myMonitoring')} value={formatCount(me.monitoringUpdates)} />
            <StatCard label={t('dashboard.myReports')} value={formatCount(me.reports)} />
            <StatCard label={t('dashboard.unread')} value={formatCount(me.unreadNotifications)} />
          </div>
          {me.organizations.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {me.organizations.map((org) => (
                <li key={org.id} className="text-sm text-ink/80">
                  {t('dashboard.orgLine', {
                    name: org.name,
                    sites: formatCount(org.plantations),
                    trees: formatCount(org.treesRecorded),
                  })}
                </li>
              ))}
            </ul>
          ) : null}
          {me.forestQuest.available ? (
            <div className="mt-8">
              <h3 className="font-display text-xl text-forest-900">{t('forestquest.title')}</h3>
              <ForestQuestSummary profile={me.forestQuest} />
              <p className="mt-4 text-sm">
                <Link href="/forestquest" className="text-forest-800 underline">
                  {t('forestquest.openProfile')}
                </Link>
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink/60">{t('dashboard.questNotConnected')}</p>
          )}
        </div>
      ) : null}

      {officer ? (
        <div className="mt-12">
          <h2 className="font-display text-2xl text-forest-900">{t('dashboard.officerOps')}</h2>
          <p className="mt-2 text-sm text-ink/70">
            {officer.assignments.length === 0
              ? t('dashboard.adminAllGeography')
              : officer.assignments
                  .map((row) => row.dsdCode ?? row.districtCode ?? row.provinceCode ?? 'assignment')
                  .join(', ')}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={t('dashboard.pendingPlantation')} value={formatCount(officer.pendingPlantationReviews)} />
            <StatCard label={t('dashboard.pendingMonitoring')} value={formatCount(officer.pendingMonitoringReviews)} />
            <StatCard label={t('dashboard.openReports')} value={formatCount(officer.openReports)} />
            <StatCard
              label={t('dashboard.mapSites')}
              value={formatCount(officer.map.items.length)}
              hint={officer.map.truncated ? t('dashboard.truncated') : t('dashboard.assignmentList')}
            />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="font-display text-xl text-forest-900">{t('dashboard.recentInspections')}</h3>
              <p className="mt-1 text-xs text-ink/55">{t('dashboard.noCalendar')}</p>
              {officer.recentInspections.length === 0 ? (
                <p className="mt-3 text-sm text-ink/70">{t('dashboard.noInspections')}</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {officer.recentInspections.map((row) => (
                    <li key={row.id}>
                      <Link href={`/plantations/${row.plantationId}`} className="text-sm text-forest-800 underline">
                        {row.plantationName}
                      </Link>
                      <span className="text-sm text-ink/60"> · {row.condition}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="font-display text-xl text-forest-900">{t('dashboard.recentActivity')}</h3>
              {officer.recentActivity.length === 0 ? (
                <p className="mt-3 text-sm text-ink/70">{t('dashboard.noAudit')}</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm text-ink/70">
                  {officer.recentActivity.map((row) => (
                    <li key={`${row.entityType}:${row.entityId}:${row.createdAt}`}>
                      {row.action} · {row.entityType}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <p className="mt-4 text-sm">
            <Link href="/map" className="text-forest-800 underline">
              {t('dashboard.openMap')}
            </Link>
            {' · '}
            <Link href="/review" className="text-forest-800 underline">
              {t('dashboard.reviewQueue')}
            </Link>
          </p>
        </div>
      ) : null}

      {admin ? (
        <div className="mt-12">
          <h2 className="font-display text-2xl text-forest-900">{t('dashboard.admin')}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={t('dashboard.users')} value={formatCount(admin.users)} />
            <StatCard label={t('dashboard.officers')} value={formatCount(admin.officers)} />
            <StatCard label={t('dashboard.organizations')} value={formatCount(admin.organizations)} />
            <StatCard label={t('dashboard.campaigns')} value={formatCount(admin.campaigns)} />
            <StatCard label={t('dashboard.treesRecorded')} value={formatCount(admin.treesRecorded)} />
            <StatCard label={t('dashboard.verifiedTrees')} value={formatCount(admin.verifiedTrees)} />
            <StatCard label={t('dashboard.plantationSites')} value={formatCount(admin.plantationSites)} />
            <StatCard label={t('dashboard.pendingPlantation')} value={formatCount(admin.pendingPlantationReviews)} />
            <StatCard label={t('dashboard.pendingMonitoringShort')} value={formatCount(admin.pendingMonitoringReviews)} />
            <StatCard label={t('dashboard.openReports')} value={formatCount(admin.reportsOpen)} />
            <StatCard label={t('dashboard.reportsTotal')} value={formatCount(admin.reportsTotal)} />
            <StatCard label={t('dashboard.audit24h')} value={formatCount(admin.auditLast24Hours)} />
            <StatCard label={t('dashboard.storedImages')} value={formatBytes(admin.storageBytes)} />
          </div>
          <p className="mt-4 text-sm text-ink/60">{t('dashboard.questAdminNote')}</p>
        </div>
      ) : null}
    </section>
  );
}
