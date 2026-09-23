'use client';

import type { NotificationPreference, NotificationRecord, NotificationType } from '@forestwatch/types';
import { NOTIFICATION_TYPES } from '@forestwatch/types';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { isAuthError, useAuth } from '@/lib/auth-context';

function formatType(type: NotificationType): string {
  return type
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function hrefFor(notification: NotificationRecord): string | null {
  const payload = notification.payload;
  if (!payload) {
    return null;
  }
  if (typeof payload.plantationId === 'string') {
    return `/plantations/${payload.plantationId}`;
  }
  if (typeof payload.slug === 'string') {
    return `/campaigns/${payload.slug}`;
  }
  if (typeof payload.reportId === 'string') {
    return '/reports';
  }
  return null;
}

export function NotificationsInbox() {
  const { client, user, ready } = useAuth();
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!user) {
      setItems([]);
      setUnreadCount(null);
      setPreferences([]);
      return;
    }
    void Promise.all([client.listNotifications({ limit: 50 }), client.listNotificationPreferences()])
      .then(([page, prefs]) => {
        setItems(page.items);
        setUnreadCount(page.meta.unreadCount);
        setPreferences(prefs.items);
        setError(null);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('forestwatch:notifications'));
        }
      })
      .catch((caught: unknown) => {
        setError(isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Could not load notifications');
      });
  }, [client, user]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    load();
  }, [load, ready]);

  const markAll = () => {
    void client
      .markAllNotificationsRead()
      .then(() => load())
      .catch((caught: unknown) => {
        setError(isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Could not mark notifications read');
      });
  };

  const togglePreference = (type: NotificationType, enabled: boolean) => {
    void client
      .updateNotificationPreferences({ items: [{ type, enabled }] })
      .then((prefs) => setPreferences(prefs.items))
      .catch((caught: unknown) => {
        setError(isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Could not save preference');
      });
  };

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:py-16">
      <h1 className="font-display text-3xl text-forest-900 sm:text-4xl">Notifications</h1>
      <p className="mt-3 max-w-2xl text-ink/75">
        In-app messages for verification, reports, comment replies, and campaigns you created. This count is queried from
        the server. Push delivery is not claimed in this local environment.
      </p>

      {!ready ? <p className="mt-8 text-ink/70">Loading notifications…</p> : null}

      {ready && !user ? (
        <p className="mt-8 text-ink/70">
          <Link href="/login" className="text-forest-800 underline">
            Sign in
          </Link>{' '}
          to see your inbox.
        </p>
      ) : null}

      {error ? <p className="mt-8 text-sm text-red-800">{error}</p> : null}

      {user && unreadCount != null ? (
        <p className="mt-6 text-sm text-ink/60">
          {unreadCount} unread
          {unreadCount > 0 ? (
            <button type="button" className="ml-3 text-forest-800 underline" onClick={markAll}>
              Mark all read
            </button>
          ) : null}
        </p>
      ) : null}

      {user ? (
        <ul className="mt-6 space-y-3">
          {items.length === 0 && unreadCount != null && !error ? (
            <li className="text-sm text-ink/70">No notifications yet.</li>
          ) : null}
          {items.map((item) => {
            const href = hrefFor(item);
            const inner = (
              <>
                <p className="text-sm font-medium text-forest-900">{item.title}</p>
                <p className="text-sm text-ink/70">{item.body}</p>
                <p className="mt-1 text-xs text-ink/50">
                  {formatType(item.type)} · {new Date(item.createdAt).toLocaleString()}
                  {item.readAt ? '' : ' · unread'}
                </p>
              </>
            );
            return (
              <li key={item.id} className={`rounded-2xl border border-forest-900/10 bg-white/70 p-4 ${item.readAt ? '' : 'ring-1 ring-forest-700/20'}`}>
                {href ? (
                  <Link
                    href={href}
                    className="block"
                    onClick={() => {
                      if (!item.readAt) {
                        void client.markNotificationRead(item.id).then(() => load());
                      }
                    }}
                  >
                    {inner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="block w-full text-left"
                    onClick={() => {
                      if (!item.readAt) {
                        void client.markNotificationRead(item.id).then(() => load());
                      }
                    }}
                  >
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}

      {user && preferences.length > 0 ? (
        <div className="mt-12">
          <h2 className="font-display text-2xl text-forest-900">Preferences</h2>
          <p className="mt-2 text-sm text-ink/70">Missing rows stay enabled. ForestQuest and XP events are not in this list.</p>
          <ul className="mt-4 space-y-2">
            {NOTIFICATION_TYPES.map((type) => {
              const enabled = preferences.find((row) => row.type === type)?.enabled ?? true;
              return (
                <li key={type}>
                  <label className="flex items-center gap-3 text-sm text-ink/80">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(event) => togglePreference(type, event.target.checked)}
                    />
                    {formatType(type)}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
