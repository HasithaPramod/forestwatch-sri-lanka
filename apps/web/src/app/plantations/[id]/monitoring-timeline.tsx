'use client';

import type { MonitoringUpdateSummary, VerificationDecision } from '@forestwatch/types';
import { Field, inputClassName } from '@/components/auth-form';
import { StoredImage } from '@/components/stored-image';
import { isAuthError, useAuth } from '@/lib/auth-context';
import { formatDistanceMeters } from '@/lib/map';
import { formatHealth, formatProximity, formatSurvivalEstimate } from '@/lib/monitoring';
import { canVerifyRecords, formatVerificationDecision } from '@/lib/review';
import { useState } from 'react';

export function MonitoringTimeline({ items, onChanged }: { items: MonitoringUpdateSummary[]; onChanged?: () => void }) {
  if (items.length === 0) {
    return (
      <p className="mt-4 text-sm text-ink/70">
        No monitoring updates are visible yet. This page does not invent survival figures.
      </p>
    );
  }

  const photos = [...items]
    .reverse()
    .flatMap((row) => (row.coverImage ? [{ update: row, image: row.coverImage }] : []));

  return (
    <>
      {photos.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-sm uppercase tracking-[0.2em] text-forest-700">Photographs over time</h3>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2">
            {photos.map(({ update, image }) => (
              <li key={`${update.id}-photo`} className="space-y-2">
                <StoredImage
                  image={image}
                  alt={`Observation on ${new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(update.observedAt))}`}
                />
                <p className="text-sm text-ink/70">
                  {new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeZone: 'UTC' }).format(
                    new Date(update.observedAt),
                  )}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <ol className="mt-6 space-y-4">
        {items.map((row) => {
          const estimate = formatSurvivalEstimate(row.estimatedSurvivingTrees, row.estimatedDeadTrees);
          return (
            <li key={row.id} className="rounded-2xl border border-forest-900/10 bg-white/70 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-forest-700">
                {row.verificationStatus} · {formatProximity(row.locationValidation)}
              </p>
              <h3 className="mt-2 font-display text-xl text-forest-900">{formatHealth(row.healthStatus)}</h3>
              <p className="mt-1 text-sm text-ink/60">
                {new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeZone: 'UTC' }).format(
                  new Date(row.observedAt),
                )}{' '}
                · {row.observer.displayName}
                {row.distanceFromPlantation != null ? ` · ${formatDistanceMeters(row.distanceFromPlantation)} from site` : ''}
              </p>
              <p className="mt-3 text-ink/80">{row.observation}</p>
              {estimate ? <p className="mt-3 text-sm text-ink/70">{estimate}</p> : null}
              {row.coverImage ? (
                <div className="mt-4">
                  <StoredImage image={row.coverImage} alt={`${row.observer.displayName} observation photograph`} />
                </div>
              ) : null}
              {onChanged ? <MonitoringVerifyActions update={row} onChanged={onChanged} /> : null}
            </li>
          );
        })}
      </ol>
    </>
  );
}

function MonitoringVerifyActions({
  update,
  onChanged,
}: {
  update: MonitoringUpdateSummary;
  onChanged: () => void;
}) {
  const { client, user } = useAuth();
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState<VerificationDecision | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canVerifyRecords(user)) {
    return null;
  }

  return (
    <div className="mt-4 space-y-2 border-t border-forest-900/10 pt-4">
      <Field label="Officer notes">
        <textarea className={inputClassName} value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
      </Field>
      <div className="flex flex-wrap gap-2">
        {(['VERIFIED', 'REJECTED'] as VerificationDecision[]).map((decision) => (
          <button
            key={decision}
            type="button"
            className="rounded-full border border-forest-800/30 px-3 py-1.5 text-sm text-forest-800 hover:bg-white disabled:opacity-60"
            disabled={pending != null}
            onClick={() => {
              setPending(decision);
              setError(null);
              void client
                .createVerification({
                  subjectType: 'MONITORING',
                  subjectId: update.id,
                  decision,
                  notes: notes.trim().length >= 3 ? notes.trim() : null,
                })
                .then(() => {
                  setNotes('');
                  onChanged();
                })
                .catch((caught: unknown) => {
                  setError(
                    isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Could not record verification',
                  );
                })
                .finally(() => setPending(null));
            }}
          >
            {pending === decision ? 'Saving…' : formatVerificationDecision(decision)}
          </button>
        ))}
      </div>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
    </div>
  );
}
