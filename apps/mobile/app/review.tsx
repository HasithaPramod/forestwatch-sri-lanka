import type { ReviewQueuePage } from '@forestwatch/types';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Card, Heading, Loading, Muted, Screen } from '@/components/ui';
import { Text } from '@/components/Themed';
import { useAuth } from '@/lib/auth-context';
import { errorMessage } from '@/lib/errors';
import { formatDate, formatHealth, formatRecordedTrees } from '@/lib/format';
import { canVerifyRecords } from '@/lib/permissions';

export default function ReviewScreen() {
  const { client, user, ready } = useAuth();
  const [queue, setQueue] = useState<ReviewQueuePage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!user || !canVerifyRecords(user)) {
      setQueue(null);
      return;
    }
    void client
      .getReviewQueue()
      .then((page) => {
        setQueue(page);
        setError(null);
      })
      .catch((caught: unknown) => setError(errorMessage(caught, 'Could not load review queue')));
  }, [client, ready, user]);

  return (
    <Screen>
      <Heading>Review</Heading>
      <Muted>
        Assigned plantations and monitoring still waiting for a Forest Officer decision. This list is live rows, not a
        dashboard statistic.
      </Muted>
      {!ready ? <Loading label="Loading review queue…" /> : null}
      {ready && !user ? <Muted>Sign in as an officer from Profile to review submissions in your assigned geography.</Muted> : null}
      {ready && user && !canVerifyRecords(user) ? <Muted>Verification is limited to Forest Officers and admins.</Muted> : null}
      {error ? <Muted>{error}</Muted> : null}
      {queue ? (
        <>
          <Text style={{ fontSize: 20, fontWeight: '700' }}>Plantations</Text>
          {queue.plantations.length === 0 ? (
            <Muted>No submitted or under-review plantations in this assignment.</Muted>
          ) : (
            queue.plantations.map((row) => (
              <Link key={row.id} href={`/plantation/${row.id}`}>
                <Card>
                  <Muted>{row.verificationStatus}</Muted>
                  <Text style={{ fontSize: 17, fontWeight: '700' }}>{row.name}</Text>
                  <Muted>
                    {formatRecordedTrees(row.treeCount)}
                    {row.districtCode ? ` · ${row.districtCode}` : ''}
                  </Muted>
                </Card>
              </Link>
            ))
          )}
          <Text style={{ fontSize: 20, fontWeight: '700' }}>Monitoring</Text>
          {queue.monitoring.length === 0 ? (
            <Muted>No pending monitoring updates in this assignment.</Muted>
          ) : (
            queue.monitoring.map((row) => (
              <Link key={row.id} href={`/plantation/${row.plantationId}`}>
                <Card>
                  <Muted>{row.verificationStatus}</Muted>
                  <Text style={{ fontSize: 17, fontWeight: '700' }}>{row.plantationName}</Text>
                  <Muted>
                    {formatHealth(row.healthStatus)} · {formatDate(row.observedAt)} · {row.observer.displayName}
                  </Muted>
                </Card>
              </Link>
            ))
          )}
        </>
      ) : null}
    </Screen>
  );
}
