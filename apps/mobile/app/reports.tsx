import type { ReportSummary } from '@forestwatch/types';
import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ReportList } from '@/components/field-forms';
import { Heading, Loading, Muted, Screen } from '@/components/ui';
import { Text } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';
import { errorMessage } from '@/lib/errors';
import { defaultReportsScope } from '@/lib/permissions';

export default function ReportsScreen() {
  const { client, user, ready } = useAuth();
  const [items, setItems] = useState<ReportSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!ready || !user) {
      setItems([]);
      return;
    }
    void client
      .listReports({ scope: defaultReportsScope(user) })
      .then((page) => {
        setItems(page.items);
        setError(null);
      })
      .catch((caught: unknown) => {
        setItems([]);
        setError(errorMessage(caught, 'Could not load reports'));
      });
  }, [client, ready, user]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen>
      <Heading>Reports</Heading>
      <Muted>Issue reports for plantations you can see. Guests do not receive this list.</Muted>
      {!ready ? <Loading label="Loading reports…" /> : null}
      {ready && !user ? (
        <Link href="/login">
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1f4d3a' }}>Sign in to view reports</Text>
        </Link>
      ) : null}
      {error ? <Muted>{error}</Muted> : null}
      {user ? <ReportList items={items} onChanged={load} /> : null}
    </Screen>
  );
}
