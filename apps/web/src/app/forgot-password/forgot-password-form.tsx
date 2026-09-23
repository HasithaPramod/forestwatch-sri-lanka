'use client';

import { useState } from 'react';
import { ForestWatchApiClient } from '@forestwatch/api-client';
import { AuthCard, Field, buttonClassName, inputClassName } from '@/components/auth-form';
import { isAuthError } from '@/lib/auth-context';
import { publicApiUrl } from '@/lib/public-api';

const client = new ForestWatchApiClient({ baseUrl: publicApiUrl, credentials: 'include' });

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);

  return (
    <AuthCard title="Forgot password">
      {queued ? (
        <div className="space-y-4 text-ink/80">
          <p>If that email is registered, a reset link was created.</p>
          {resetUrl ? (
            <p className="break-all text-sm">
              No SMTP server is configured, so the reset link is:{' '}
              <a className="text-forest-800 underline" href={resetUrl}>
                {resetUrl}
              </a>
            </p>
          ) : (
            <p>This environment does not reveal whether the account exists.</p>
          )}
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setPending(true);
            setError(null);
            void client
              .forgotPassword({ email: String(form.get('email') ?? '') })
              .then((result) => {
                setQueued(true);
                setResetUrl(result.resetUrl ?? null);
              })
              .catch((caught: unknown) => {
                setError(isAuthError(caught) ? caught.message : 'Request failed');
              })
              .finally(() => setPending(false));
          }}
        >
          <Field label="Email">
            <input
              className={inputClassName}
              name="email"
              type="text"
              inputMode="email"
              autoComplete="email"
              required
            />
          </Field>
          {error ? <p className="text-sm text-red-800">{error}</p> : null}
          <button className={buttonClassName} type="submit" disabled={pending}>
            {pending ? 'Submitting…' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
