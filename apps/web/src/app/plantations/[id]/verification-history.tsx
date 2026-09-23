'use client';

import type { PlantationVerificationStatus, VerificationDecision, VerificationRecord } from '@forestwatch/types';
import { Field, buttonClassName, inputClassName } from '@/components/auth-form';
import { isAuthError, useAuth } from '@/lib/auth-context';
import { canVerifyRecords, formatVerificationDecision } from '@/lib/review';
import { useState } from 'react';

export function VerificationHistory({
  plantationId,
  verificationStatus,
  items,
  onChanged,
}: {
  plantationId: string;
  verificationStatus: PlantationVerificationStatus;
  items: VerificationRecord[];
  onChanged: () => void;
}) {
  const { client, user } = useAuth();
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canVerify = canVerifyRecords(user);

  const run = (work: () => Promise<unknown>, key: string) => {
    setPending(key);
    setError(null);
    void work()
      .then(() => {
        setNotes('');
        onChanged();
      })
      .catch((caught: unknown) => {
        setError(isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Could not record verification');
      })
      .finally(() => setPending(null));
  };

  return (
    <section>
      <h2 className="mt-10 font-display text-2xl text-forest-900">Verification</h2>
      <p className="mt-3 text-sm text-ink/70">
        Current status is {verificationStatus.replaceAll('_', ' ').toLowerCase()}. History is append-only; earlier
        decisions stay on the record.
      </p>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-ink/70">No verification decisions are stored yet.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {items.map((row) => (
            <li key={row.id} className="rounded-2xl border border-forest-900/10 bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-forest-700">{formatVerificationDecision(row.decision)}</p>
              <p className="mt-1 text-sm text-ink/60">
                {row.actor.displayName} ·{' '}
                {new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(row.createdAt))}
              </p>
              {row.notes ? <p className="mt-2 text-sm text-ink/80">{row.notes}</p> : null}
            </li>
          ))}
        </ol>
      )}
      {canVerify ? (
        <div className="mt-6 space-y-3 rounded-2xl border border-forest-800/30 bg-forest-900/5 p-5">
          <p className="text-sm font-medium text-forest-900">Officer decision</p>
          <Field label="Notes">
            <textarea className={inputClassName} value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
          </Field>
          {error ? <p className="text-sm text-red-800">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            {verificationStatus === 'SUBMITTED' ? (
              <button
                type="button"
                className={buttonClassName}
                disabled={pending != null}
                onClick={() => run(() => client.startPlantationReview(plantationId), 'review')}
              >
                {pending === 'review' ? 'Saving…' : 'Start review'}
              </button>
            ) : null}
            {(['VERIFIED', 'REJECTED', 'REQUEST_CORRECTION'] as VerificationDecision[]).map((decision) => (
              <button
                key={decision}
                type="button"
                className="rounded-full border border-forest-800/30 px-4 py-2.5 text-sm text-forest-800 hover:bg-white disabled:opacity-60"
                disabled={pending != null}
                onClick={() =>
                  run(
                    () =>
                      client.createVerification({
                        subjectType: 'PLANTATION',
                        subjectId: plantationId,
                        decision,
                        notes: notes.trim().length >= 3 ? notes.trim() : null,
                      }),
                    decision,
                  )
                }
              >
                {pending === decision ? 'Saving…' : formatVerificationDecision(decision)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
