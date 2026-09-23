'use client';

import type { ReportCategory, ReportStatus, ReportSummary } from '@forestwatch/types';
import { REPORT_CATEGORIES } from '@forestwatch/types';
import Link from 'next/link';
import { useState } from 'react';
import { Field, buttonClassName, inputClassName } from '@/components/auth-form';
import { StoredImage } from '@/components/stored-image';
import { isAuthError, useAuth } from '@/lib/auth-context';
import {
  REPORT_CATEGORY_OPTIONS,
  canListAllReports,
  canReviewReports,
  formatReportCategory,
  formatReportStatus,
  nextReportStatuses,
} from '@/lib/reports';

const CATEGORY_OPTIONS = REPORT_CATEGORIES as readonly ReportCategory[];

export function ReportStatusActions({ report, onChanged }: { report: ReportSummary; onChanged: () => void }) {
  const { client, user } = useAuth();
  const [pending, setPending] = useState<ReportStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const next = canReviewReports(user) ? nextReportStatuses(report.status, canListAllReports(user)) : [];

  if (next.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        {next.map((status) => (
          <button
            key={status}
            type="button"
            className="rounded-full border border-forest-800/30 px-3 py-1.5 text-sm text-forest-800 hover:bg-white disabled:opacity-60"
            disabled={pending != null}
            onClick={() => {
              setPending(status);
              setError(null);
              void client
                .updateReportStatus(report.id, { status })
                .then(() => onChanged())
                .catch((caught: unknown) => {
                  setError(
                    isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Could not update report',
                  );
                })
                .finally(() => setPending(null));
            }}
          >
            {pending === status ? 'Saving…' : formatReportStatus(status)}
          </button>
        ))}
      </div>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
    </div>
  );
}

export function ReportCard({ report, onChanged }: { report: ReportSummary; onChanged: () => void }) {
  return (
    <li className="rounded-2xl border border-forest-900/10 bg-white/70 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-forest-700">{formatReportStatus(report.status)}</p>
        <p className="text-sm text-ink/60">{formatReportCategory(report.category)}</p>
      </div>
      <p className="mt-2 font-medium text-forest-900">
        <Link href={`/plantations/${report.plantation.id}`} className="underline">
          {report.plantation.name}
        </Link>
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm text-ink/80">{report.description}</p>
      <p className="mt-2 text-xs text-ink/55">
        {report.reporter.displayName} ·{' '}
        {new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(report.createdAt))}
      </p>
      {report.coverImage ? (
        <div className="mt-3 max-w-xs">
          <StoredImage image={report.coverImage} alt={`${formatReportCategory(report.category)} photograph`} />
        </div>
      ) : null}
      <ReportStatusActions report={report} onChanged={onChanged} />
    </li>
  );
}

export function ReportForm({ plantationId, onSubmitted }: { plantationId: string; onSubmitted: () => void }) {
  const { client, user, ready } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!ready) {
    return null;
  }

  if (!user) {
    return (
      <p className="mt-4 text-sm text-ink/70">
        <Link href="/login" className="text-forest-800 underline">
          Sign in
        </Link>{' '}
        to file an issue report. Guests cannot see these reports.
      </p>
    );
  }

  return (
    <form
      className="mt-4 space-y-4 rounded-2xl border border-forest-900/10 bg-white/70 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const category = String(data.get('category') ?? '') as ReportCategory;
        const description = String(data.get('description') ?? '').trim();
        const photo = data.get('photo');
        const file = photo instanceof File && photo.size > 0 ? photo : null;
        if (!CATEGORY_OPTIONS.includes(category) || description.length < 8) {
          setError('Choose a category and describe what you observed.');
          return;
        }

        setPending(true);
        setError(null);
        void client
          .createPlantationReport(plantationId, {
            category,
            description,
            clientUuid: crypto.randomUUID(),
          })
          .then(async (report) => {
            if (file) {
              return client.uploadReportImage(report.id, file, file.name);
            }
            return report;
          })
          .then(() => {
            setSubmitted(true);
            form.reset();
            onSubmitted();
          })
          .catch((caught: unknown) => {
            setError(isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Could not file report');
          })
          .finally(() => setPending(false));
      }}
    >
      <Field label="Category">
        <select className={inputClassName} name="category" defaultValue="OTHER" required>
          {REPORT_CATEGORY_OPTIONS.map((category) => (
            <option key={category} value={category}>
              {formatReportCategory(category)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="What did you observe?">
        <textarea className={inputClassName} name="description" rows={4} minLength={8} required />
      </Field>
      <Field label="Photograph">
        <input className={inputClassName} name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
      </Field>
      <p className="text-sm text-ink/60">
        Issue reports start as open. They are not public guest content and they do not change recorded tree counts.
      </p>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
      {submitted ? <p className="text-sm text-forest-800">Report filed as open. Officer review is a separate workflow.</p> : null}
      <button className={buttonClassName} type="submit" disabled={pending}>
        {pending ? 'Filing…' : 'File report'}
      </button>
    </form>
  );
}

export function ReportsSection({
  plantationId,
  items,
  onChanged,
}: {
  plantationId: string;
  items: ReportSummary[];
  onChanged: () => void;
}) {
  const { user, ready } = useAuth();

  return (
    <section>
      <h2 className="mt-10 font-display text-2xl text-forest-900">Reports</h2>
      <p className="mt-3 text-sm text-ink/70">
        Use this for damaged trees, missing stock, fire, or illegal cutting. Comment reports are a separate audit action.
      </p>
      {!ready ? null : user ? (
        items.length === 0 ? (
          <p className="mt-4 text-sm text-ink/70">No issue reports you are allowed to see on this record.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {items.map((report) => (
              <ReportCard key={report.id} report={report} onChanged={onChanged} />
            ))}
          </ul>
        )
      ) : (
        <p className="mt-4 text-sm text-ink/70">Issue reports stay hidden from guests.</p>
      )}
      <h3 className="mt-10 font-display text-xl text-forest-900">File a report</h3>
      <ReportForm plantationId={plantationId} onSubmitted={onChanged} />
    </section>
  );
}
