'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthCard, Field, buttonClassName, inputClassName } from '@/components/auth-form';
import { isAuthError, useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';

export function RegisterForm() {
  const { register } = useAuth();
  const { locale, t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);

  if (verificationUrl) {
    return (
      <AuthCard title={t('auth.verifyEmailTitle')}>
        <p className="text-ink/80">{t('auth.verifyEmailBody')}</p>
        <p className="mt-4 break-all text-sm">
          <Link href={verificationUrl} className="text-forest-800 underline">
            {verificationUrl}
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('auth.registerTitle')}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setPending(true);
          setError(null);
          void register({
            email: String(form.get('email') ?? ''),
            password: String(form.get('password') ?? ''),
            displayName: String(form.get('displayName') ?? ''),
            locale,
          })
            .then((result) => {
              if (result.verificationUrl) {
                setVerificationUrl(result.verificationUrl);
              } else {
                setError(t('auth.checkEmail'));
              }
            })
            .catch((caught: unknown) => {
              setError(isAuthError(caught) ? caught.message : 'Registration failed');
            })
            .finally(() => setPending(false));
        }}
      >
        <Field label={t('auth.displayName')}>
          <input className={inputClassName} name="displayName" autoComplete="name" required minLength={2} />
        </Field>
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
            autoComplete="new-password"
            required
            minLength={10}
          />
        </Field>
        <p className="text-xs text-ink/60">{t('auth.passwordHint')}</p>
        {error ? <p className="text-sm text-red-800">{error}</p> : null}
        <button className={buttonClassName} type="submit" disabled={pending}>
          {pending ? t('auth.creatingAccount') : t('auth.createAccount')}
        </button>
      </form>
      <p className="mt-4 text-sm text-ink/70">
        {t('auth.alreadyRegistered')}{' '}
        <Link href="/login" className="text-forest-800 underline">
          {t('nav.login')}
        </Link>
      </p>
    </AuthCard>
  );
}
