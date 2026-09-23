import type { NotificationPreference, NotificationRecord, NotificationType } from '@forestwatch/types';
import { NOTIFICATION_TYPES } from '@forestwatch/types';
import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { Button, Heading, Loading, Muted, Screen } from '@/components/ui';
import { Text } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';
import { errorMessage } from '@/lib/errors';

function formatType(type: NotificationType): string {
  return type.replace(/_/g, ' ');
}

export default function NotificationsScreen() {
  const { client, user, ready } = useAuth();
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!ready || !user) {
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
      })
      .catch((caught: unknown) => {
        setItems([]);
        setError(errorMessage(caught, 'Could not load notifications'));
      });
  }, [client, ready, user]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen>
      <Heading>Notifications</Heading>
      <Muted>
        Live in-app inbox from the server. Unread counts come from SQL. This screen does not register Expo or FCM push
        tokens.
      </Muted>
      {!ready ? <Loading label="Loading notifications…" /> : null}
      {ready && !user ? (
        <Link href="/login">
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1f4d3a' }}>Sign in to view notifications</Text>
        </Link>
      ) : null}
      {error ? <Muted>{error}</Muted> : null}
      {user && unreadCount != null ? <Muted>{unreadCount} unread</Muted> : null}
      {user && unreadCount != null && unreadCount > 0 ? (
        <Button
          label="Mark all read"
          variant="secondary"
          onPress={() => {
            void client
              .markAllNotificationsRead()
              .then(() => load())
              .catch((caught: unknown) => setError(errorMessage(caught, 'Could not mark notifications read')));
          }}
        />
      ) : null}
      {user
        ? items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                if (!item.readAt) {
                  void client.markNotificationRead(item.id).then(() => load());
                }
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: item.readAt ? '500' : '700', color: '#1f4d3a', marginTop: 12 }}>
                {item.title}
              </Text>
              <Muted>
                {item.body}
                {'\n'}
                {formatType(item.type)} · {item.readAt ? 'read' : 'unread'}
              </Muted>
            </Pressable>
          ))
        : null}
      {user && items.length === 0 && unreadCount != null && !error ? <Muted>No notifications yet.</Muted> : null}
      {user && preferences.length > 0 ? (
        <>
          <Heading>Preferences</Heading>
          {NOTIFICATION_TYPES.map((type) => {
            const enabled = preferences.find((row) => row.type === type)?.enabled ?? true;
            return (
              <Button
                key={type}
                variant="secondary"
                label={`${formatType(type)}: ${enabled ? 'on' : 'off'}`}
                onPress={() => {
                  void client
                    .updateNotificationPreferences({ items: [{ type, enabled: !enabled }] })
                    .then((prefs) => setPreferences(prefs.items))
                    .catch((caught: unknown) => setError(errorMessage(caught, 'Could not save preference')));
                }}
              />
            );
          })}
        </>
      ) : null}
    </Screen>
  );
}
