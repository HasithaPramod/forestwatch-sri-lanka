'use client';

import type { ReportCategory, ReportStatus, ReportSummary } from '@forestwatch/types';
import { REPORT_CATEGORIES, REPORT_STATUSES } from '@forestwatch/types';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { inputClassName } from '@/components/auth-form';
import { isAuthError, useAuth } from '@/lib/auth-context';
import {
  canListAllReports,
  canListAssignedReports,
  defaultReportsScope,
  formatReportCategory,
  formatReportStatus,
} from '@/lib/reports';
import { ReportCard } from '@/app/plantations/[id]/reports-section';

type InboxScope = 'mine' | 'assigned' | 'all';

export function ReportsInbox() {
  const { client, user, ready } = useAuth();
  const [scope, setScope] = useState<InboxScope | null>(null);
  const [status, setStatus] = useState<ReportStatus | ''>('');
  const [category, setCategory] = useState<ReportCategory | ''>('');
  const [items, setItems] = useState<ReportSummary[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!user) {
      setScope(null);
      setItems([]);
      setTotal(null);
      return;
    }
    setScope((current) => current ?? defaultReportsScope(user));
  }, [ready, user]);

  useEffect(() => {
    if (!ready || !user || !scope) {
      return;
    }
    void client
      .listReports({
        scope,
        status: status || undefined,
        category: category || undefined,
        limit: 50,
      })
      .then((page) => {
        setItems(page.items);
        setTotal(page.meta.total);
        setError(null);
      })
      .catch((caught: unknown) => {
        setError(isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Could not load reports');
      });
  }, [category, client, ready, scope, status, user]);

  const reload = () => {
    if (!user || !scope) {
      return;
    }
    void client
      .listReports({
        scope,
        status: status || undefined,
        category: category || undefined,
        limit: 50,
      })
      .then((page) => {
        setItems(page.items);
        setTotal(page.meta.total);
        setError(null);
      })
      .catch((caught: unknown) => {
        setError(isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Could not load reports');
      });
  };

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:py-16">
      <h1 className="font-display text-3xl text-forest-900 sm:text-4xl">Reports</h1>
      <p className="mt-3 max-w-2xl text-ink/75">
        Plantation issue reports are a workflow, not a public feed. Illegal cutting and similar categories stay off the
        guest map.
      </p>

      {!ready ? <p className="mt-8 text-ink/70">Loading reports…</p> : null}

      {ready && !user ? (
        <p className="mt-8 text-ink/70">
          <Link href="/login" className="text-forest-800 underline">
            Sign in
          </Link>{' '}
          to see reports you filed or, if you are an officer, reports in your assigned geography.
        </p>
      ) : null}

      {user ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <label className="text-sm text-ink/80">
            Scope
            <select
              className={`${inputClassName} mt-2`}
              value={scope ?? defaultReportsScope(user)}
              onChange={(event) => setScope(event.target.value as InboxScope)}
            >
              <option value="mine">Reports I filed</option>
              {canListAssignedReports(user) ? <option value="assigned">Assigned geography</option> : null}
              {canListAllReports(user) ? <option value="all">All reports</option> : null}
            </select>
          </label>
          <label className="text-sm text-ink/80">
            Status
            <select
              className={`${inputClassName} mt-2`}
              value={status}
              onChange={(event) => setStatus(event.target.value as ReportStatus | '')}
            >
              <option value="">Any status</option>
              {REPORT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {formatReportStatus(value)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-ink/80">
            Category
            <select
              className={`${inputClassName} mt-2`}
              value={category}
              onChange={(event) => setCategory(event.target.value as ReportCategory | '')}
            >
              <option value="">Any category</option>
              {REPORT_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {formatReportCategory(value)}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {error ? <p className="mt-8 text-sm text-red-800">{error}</p> : null}

      {ready && user && !error && total == null ? <p className="mt-8 text-ink/70">Loading reports…</p> : null}

      {ready && user && !error && total != null ? (
        <>
          <p className="mt-6 text-sm text-ink/60">{total == null ? '' : `${total} report${total === 1 ? '' : 's'}`}</p>
          {items.length === 0 ? (
            <p className="mt-4 text-sm text-ink/70">No reports in this scope.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {items.map((report) => (
                <ReportCard key={report.id} report={report} onChanged={reload} />
              ))}
            </ul>
          )}
        </>
      ) : null}
    </section>
  );
}
