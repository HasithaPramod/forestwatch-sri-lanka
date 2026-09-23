'use client';

import type { ReviewQueuePage } from '@forestwatch/types';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { isAuthError, useAuth } from '@/lib/auth-context';
import { formatHealth } from '@/lib/monitoring';
import { canVerifyRecords } from '@/lib/review';

export function ReviewQueue() {
  const { client, user, ready } = useAuth();
  const [queue, setQueue] = useState<ReviewQueuePage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!user || !canVerifyRecords(user)) {
      setQueue(null);
      return;
    }
    void client
      .getReviewQueue()
      .then((page) => {
        setQueue(page);
        setError(null);
      })
      .catch((caught: unknown) => {
        setError(isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Could not load review queue');
      });
  }, [client, ready, user]);

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:py-16">
      <h1 className="font-display text-3xl text-forest-900 sm:text-4xl">Review</h1>
      <p className="mt-3 max-w-2xl text-ink/75">
        Assigned plantations and monitoring still waiting for a Forest Officer decision. This list is live rows, not a
        dashboard statistic.
      </p>
      {!ready ? <p className="mt-8 text-ink/70">Loading review queue…</p> : null}
      {ready && !user ? (
        <p className="mt-8 text-ink/70">
          <Link href="/login" className="text-forest-800 underline">
            Sign in
          </Link>{' '}
          as an officer to review submissions in your assigned geography.
        </p>
      ) : null}
      {ready && user && !canVerifyRecords(user) ? (
        <p className="mt-8 text-ink/70">Verification is limited to Forest Officers and admins.</p>
      ) : null}
      {error ? <p className="mt-8 text-sm text-red-800">{error}</p> : null}
      {queue ? (
        <>
          <h2 className="mt-10 font-display text-2xl text-forest-900">Plantations</h2>
          {queue.plantations.length === 0 ? (
            <p className="mt-4 text-sm text-ink/70">No submitted or under-review plantations in this assignment.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {queue.plantations.map((row) => (
                <li key={row.id} className="rounded-2xl border border-forest-900/10 bg-white/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-forest-700">{row.verificationStatus}</p>
                  <Link href={`/plantations/${row.id}`} className="mt-1 inline-block font-medium text-forest-900 underline">
                    {row.name}
                  </Link>
                  <p className="mt-1 text-sm text-ink/60">
                    {row.treeCount.toLocaleString('en-LK')} recorded trees
                    {row.districtCode ? ` · ${row.districtCode}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <h2 className="mt-10 font-display text-2xl text-forest-900">Monitoring</h2>
          {queue.monitoring.length === 0 ? (
            <p className="mt-4 text-sm text-ink/70">No pending monitoring updates in this assignment.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {queue.monitoring.map((row) => (
                <li key={row.id} className="rounded-2xl border border-forest-900/10 bg-white/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-forest-700">{row.verificationStatus}</p>
                  <Link
                    href={`/plantations/${row.plantationId}`}
                    className="mt-1 inline-block font-medium text-forest-900 underline"
                  >
                    {row.plantationName}
                  </Link>
                  <p className="mt-1 text-sm text-ink/60">
                    {formatHealth(row.healthStatus)} · {row.observer.displayName} ·{' '}
                    {new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeZone: 'UTC' }).format(
                      new Date(row.observedAt),
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </section>
  );
}
