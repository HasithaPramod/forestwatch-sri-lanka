'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthCard, Field, buttonClassName, inputClassName } from '@/components/auth-form';
import { isAuthError, useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <AuthCard title={t('auth.loginTitle')}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const email = String(form.get('email') ?? '');
          const password = String(form.get('password') ?? '');
          setPending(true);
          setError(null);
          void login(email, password)
            .then(() => router.push('/account'))
            .catch((caught: unknown) => {
              setError(isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Sign-in failed');
            })
            .finally(() => setPending(false));
        }}
      >
        <Field label={t('common.email')}>
          <input
            className={inputClassName}
            name="email"
            type="text"
            inputMode="email"
            autoComplete="email"
            required
          />
        </Field>
        <Field label={t('common.password')}>
          <input
            className={inputClassName}
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        {error ? <p className="text-sm text-red-800">{error}</p> : null}
        <button className={buttonClassName} type="submit" disabled={pending}>
          {pending ? t('auth.signingIn') : t('auth.signIn')}
        </button>
      </form>
      <p className="mt-4 text-sm text-ink/70">
        {t('auth.noAccount')}{' '}
        <Link href="/register" className="text-forest-800 underline">
          {t('auth.register')}
        </Link>
      </p>
      <p className="mt-2 text-sm text-ink/70">
        <Link href="/forgot-password" className="text-forest-800 underline">
          {t('auth.forgotPassword')}
        </Link>
      </p>
    </AuthCard>
  );
}
