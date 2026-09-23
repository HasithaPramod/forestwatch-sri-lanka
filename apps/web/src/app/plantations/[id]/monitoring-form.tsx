'use client';

import type { HealthCondition } from '@forestwatch/types';
import { HEALTH_CONDITIONS } from '@forestwatch/types';
import Link from 'next/link';
import { useState } from 'react';
import { Field, buttonClassName, inputClassName } from '@/components/auth-form';
import { isAuthError, useAuth } from '@/lib/auth-context';
import { formatHealth } from '@/lib/monitoring';

const HEALTH_OPTIONS = HEALTH_CONDITIONS as readonly HealthCondition[];

export function MonitoringForm({ plantationId, onSubmitted }: { plantationId: string; onSubmitted: () => void }) {
  const { client, user, ready } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gpsNote, setGpsNote] = useState<string | null>(null);
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
        to submit a monitoring update. Guests cannot post observations.
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
        const healthStatus = String(data.get('healthStatus') ?? '') as HealthCondition;
        const observation = String(data.get('observation') ?? '').trim();
        const surviving = String(data.get('estimatedSurvivingTrees') ?? '').trim();
        const dead = String(data.get('estimatedDeadTrees') ?? '').trim();
        const photo = data.get('photo');
        const file = photo instanceof File && photo.size > 0 ? photo : null;

        setPending(true);
        setError(null);
        setGpsNote(null);

        const submit = (coords?: { latitude: number; longitude: number; gpsAccuracyMeters?: number }) => {
          void client
            .createMonitoringUpdate(plantationId, {
              healthStatus,
              observation,
              estimatedSurvivingTrees: surviving ? Number(surviving) : null,
              estimatedDeadTrees: dead ? Number(dead) : null,
              latitude: coords?.latitude,
              longitude: coords?.longitude,
              gpsAccuracyMeters: coords?.gpsAccuracyMeters,
            })
            .then(async (update) => {
              if (file) {
                return client.uploadMonitoringImage(plantationId, update.id, file, file.name);
              }
              return update;
            })
            .then(() => {
              setSubmitted(true);
              form.reset();
              onSubmitted();
            })
            .catch((caught: unknown) => {
              setError(
                isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Could not submit update',
              );
            })
            .finally(() => setPending(false));
        };

        if (!navigator.geolocation) {
          setGpsNote('This browser cannot share a location. The update will be recorded as location unavailable.');
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
            setGpsNote('Location permission was not granted. GPS is not invented; this update is location unavailable.');
            submit();
          },
        );
      }}
    >
      <Field label="Condition">
        <select className={inputClassName} name="healthStatus" defaultValue="UNKNOWN" required>
          {HEALTH_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {formatHealth(status)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Observation">
        <textarea className={inputClassName} name="observation" rows={4} minLength={3} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Estimated surviving trees">
          <input className={inputClassName} name="estimatedSurvivingTrees" type="number" min={0} />
        </Field>
        <Field label="Estimated dead trees">
          <input className={inputClassName} name="estimatedDeadTrees" type="number" min={0} />
        </Field>
      </div>
      <p className="text-sm text-ink/60">
        Survival figures are estimates from this visit. They do not replace the recorded tree count.
      </p>
      <Field label="Photograph">
        <input className={inputClassName} name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
      </Field>
      {gpsNote ? <p className="text-sm text-ink/70">{gpsNote}</p> : null}
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
      {submitted ? (
        <p className="text-sm text-forest-800">Update submitted as pending. An officer still has to verify it.</p>
      ) : null}
      <button className={buttonClassName} type="submit" disabled={pending}>
        {pending ? 'Submitting…' : 'Submit monitoring update'}
      </button>
    </form>
  );
}
