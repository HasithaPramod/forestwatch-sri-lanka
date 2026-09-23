'use client';

import type { HealthCondition, InspectionSummary } from '@forestwatch/types';
import { HEALTH_CONDITIONS } from '@forestwatch/types';
import { Field, buttonClassName, inputClassName } from '@/components/auth-form';
import { StoredImage } from '@/components/stored-image';
import { isAuthError, useAuth } from '@/lib/auth-context';
import { formatHealth } from '@/lib/monitoring';
import { canVerifyRecords } from '@/lib/review';
import { useState } from 'react';

export function InspectionsSection({
  plantationId,
  items,
  onChanged,
}: {
  plantationId: string;
  items: InspectionSummary[];
  onChanged: () => void;
}) {
  const { client, user, ready } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gpsNote, setGpsNote] = useState<string | null>(null);
  const canInspect = canVerifyRecords(user);

  return (
    <section>
      <h2 className="mt-10 font-display text-2xl text-forest-900">Officer inspections</h2>
      <p className="mt-3 text-sm text-ink/70">
        Official Forest Department visits. These are not citizen monitoring updates. Estimated tree counts do not replace
        the recorded total.
      </p>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-ink/70">No officer inspections are stored for this record.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {items.map((row) => (
            <li
              key={row.id}
              className="rounded-2xl border border-forest-800/40 bg-forest-900/[0.06] p-5 shadow-[inset_4px_0_0_0_rgb(27_67_50)]"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-forest-800">Forest Officer inspection</p>
              <h3 className="mt-2 font-display text-xl text-forest-900">{formatHealth(row.condition)}</h3>
              <p className="mt-1 text-sm text-ink/60">
                {new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(row.inspectedAt))}{' '}
                · {row.officer.displayName}
              </p>
              <p className="mt-3 text-ink/80">{row.notes}</p>
              {row.recommendedAction ? (
                <p className="mt-2 text-sm text-forest-900">Recommended action: {row.recommendedAction}</p>
              ) : null}
              {row.estimatedTreeCount != null || row.estimatedSurvivalPct != null ? (
                <p className="mt-2 text-sm text-ink/70">
                  {row.estimatedTreeCount != null ? `${row.estimatedTreeCount.toLocaleString('en-LK')} estimated trees` : ''}
                  {row.estimatedTreeCount != null && row.estimatedSurvivalPct != null ? ' · ' : ''}
                  {row.estimatedSurvivalPct != null ? `${row.estimatedSurvivalPct}% estimated survival` : ''}
                  . Inspection estimates do not change recorded trees.
                </p>
              ) : null}
              {row.coverImage ? (
                <div className="mt-4 max-w-xs">
                  <StoredImage image={row.coverImage} alt="Officer inspection photograph" />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {ready && canInspect ? (
        <form
          className="mt-6 space-y-4 rounded-2xl border border-forest-800/40 bg-forest-900/[0.06] p-5"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            const condition = String(data.get('condition') ?? '') as HealthCondition;
            const notes = String(data.get('notes') ?? '').trim();
            const recommendedAction = String(data.get('recommendedAction') ?? '').trim();
            const estimatedTreeCount = String(data.get('estimatedTreeCount') ?? '').trim();
            const estimatedSurvivalPct = String(data.get('estimatedSurvivalPct') ?? '').trim();
            const photo = data.get('photo');
            const file = photo instanceof File && photo.size > 0 ? photo : null;
            if (notes.length < 8) {
              setError('Describe the inspection.');
              return;
            }

            setPending(true);
            setError(null);
            const submit = (coords?: { latitude: number; longitude: number; gpsAccuracyMeters?: number }) => {
              void client
                .createInspection(plantationId, {
                  condition,
                  notes,
                  recommendedAction: recommendedAction || null,
                  estimatedTreeCount: estimatedTreeCount ? Number(estimatedTreeCount) : null,
                  estimatedSurvivalPct: estimatedSurvivalPct ? Number(estimatedSurvivalPct) : null,
                  latitude: coords?.latitude,
                  longitude: coords?.longitude,
                  gpsAccuracyMeters: coords?.gpsAccuracyMeters,
                })
                .then(async (inspection) => {
                  if (file) {
                    return client.uploadInspectionImage(inspection.id, file, file.name);
                  }
                  return inspection;
                })
                .then(() => {
                  form.reset();
                  onChanged();
                })
                .catch((caught: unknown) => {
                  setError(
                    isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Could not record inspection',
                  );
                })
                .finally(() => setPending(false));
            };

            if (!navigator.geolocation) {
              setGpsNote('This browser cannot share a location. GPS will be stored as missing.');
              submit();
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (position) => {
                setGpsNote(null);
                submit({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  gpsAccuracyMeters: position.coords.accuracy || undefined,
                });
              },
              () => {
                setGpsNote('Location permission was not granted. GPS is not invented.');
                submit();
              },
            );
          }}
        >
          <p className="text-sm font-medium text-forest-900">Record an inspection</p>
          <Field label="Condition">
            <select className={inputClassName} name="condition" defaultValue="UNKNOWN" required>
              {HEALTH_CONDITIONS.map((status) => (
                <option key={status} value={status}>
                  {formatHealth(status)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Notes">
            <textarea className={inputClassName} name="notes" rows={4} minLength={8} required />
          </Field>
          <Field label="Recommended action">
            <input className={inputClassName} name="recommendedAction" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Estimated tree count">
              <input className={inputClassName} name="estimatedTreeCount" type="number" min={0} />
            </Field>
            <Field label="Estimated survival %">
              <input className={inputClassName} name="estimatedSurvivalPct" type="number" min={0} max={100} step="0.01" />
            </Field>
          </div>
          <Field label="Photograph">
            <input className={inputClassName} name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
          </Field>
          {gpsNote ? <p className="text-sm text-ink/70">{gpsNote}</p> : null}
          {error ? <p className="text-sm text-red-800">{error}</p> : null}
          <button className={buttonClassName} type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save inspection'}
          </button>
        </form>
      ) : null}
    </section>
  );
}
