'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ForestWatchApiClient } from '@forestwatch/api-client';
import { AuthCard, buttonClassName } from '@/components/auth-form';
import { isAuthError } from '@/lib/auth-context';
import { publicApiUrl } from '@/lib/public-api';

const client = new ForestWatchApiClient({ baseUrl: publicApiUrl, credentials: 'include' });

export function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<'working' | 'ok' | 'error'>('working');
  const [message, setMessage] = useState('Confirming your email…');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('This verification link is missing a token.');
      return;
    }

    void client
      .verifyEmail({ token })
      .then(() => {
        setStatus('ok');
        setMessage('Email verified. You can sign in.');
      })
      .catch((error: unknown) => {
        setStatus('error');
        setMessage(isAuthError(error) ? error.message : 'Verification failed');
      });
  }, [token]);

  return (
    <AuthCard title="Verify email">
      <p className={status === 'error' ? 'text-red-800' : 'text-ink/80'}>{message}</p>
      {status !== 'working' ? (
        <Link href="/login" className={`${buttonClassName} mt-6 block text-center`}>
          Go to login
        </Link>
      ) : null}
    </AuthCard>
  );
}
