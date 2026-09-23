'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ForestWatchApiClient } from '@forestwatch/api-client';
import { AuthCard, Field, buttonClassName, inputClassName } from '@/components/auth-form';
import { isAuthError } from '@/lib/auth-context';
import { publicApiUrl } from '@/lib/public-api';

const client = new ForestWatchApiClient({ baseUrl: publicApiUrl, credentials: 'include' });

export function ResetPasswordForm() {
  const token = useSearchParams().get('token') ?? '';
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <AuthCard title="Reset password">
        <p className="text-red-800">This reset link is missing a token.</p>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard title="Password updated">
        <p className="text-ink/80">You can sign in with the new password. Previous sessions were revoked.</p>
        <Link href="/login" className={`${buttonClassName} mt-6 block text-center`}>
          Go to login
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Reset password">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setPending(true);
          setError(null);
          void client
            .resetPassword({ token, password: String(form.get('password') ?? '') })
            .then(() => setDone(true))
            .catch((caught: unknown) => {
              setError(isAuthError(caught) ? caught.message : 'Reset failed');
            })
            .finally(() => setPending(false));
        }}
      >
        <Field label="New password">
          <input
            className={inputClassName}
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
          />
        </Field>
        {error ? <p className="text-sm text-red-800">{error}</p> : null}
        <button className={buttonClassName} type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </AuthCard>
  );
}
