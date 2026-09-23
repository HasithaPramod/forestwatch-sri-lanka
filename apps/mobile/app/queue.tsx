import { Button, Card, Heading, Muted, Screen } from '@/components/ui';
import { Text } from '@/components/Themed';
import { useOffline } from '@/lib/offline-context';
import { formatOfflineStatus } from '@/lib/format';

export default function QueueScreen() {
  const { items, pendingCount, syncNow, queueDraft } = useOffline();

  return (
    <Screen>
      <Heading>Offline queue</Heading>
      <Muted>
        Drafts and retries live in SQLite with a client UUID. NestJS upserts that id. This device does not invent
        verification or XP.
      </Muted>
      <Muted>{pendingCount} items still on device.</Muted>
      <Button label="Sync now" onPress={() => void syncNow()} />
      {items.length === 0 ? <Muted>The queue is empty.</Muted> : null}
      {items.map((row) => (
        <Card key={row.clientUuid}>
          <Muted>
            {formatOfflineStatus(row.status)} · {row.kind}
          </Muted>
          <Text style={{ fontSize: 17, fontWeight: '700' }}>{row.plantationName ?? row.plantationId}</Text>
          {row.gps ? (
            <Muted>
              GPS snapshot {row.gps.latitude.toFixed(4)}, {row.gps.longitude.toFixed(4)}
              {row.gps.accuracyMeters != null ? ` ±${Math.round(row.gps.accuracyMeters)} m` : ''}
            </Muted>
          ) : (
            <Muted>No GPS snapshot.</Muted>
          )}
          {row.photoUri ? <Muted>Photograph held locally until the server confirms.</Muted> : null}
          {row.lastError ? <Muted>{row.lastError}</Muted> : null}
          {row.status === 'LOCAL_DRAFT' || row.status === 'SYNC_FAILED' ? (
            <Button label="Queue for sync" variant="secondary" onPress={() => void queueDraft(row.clientUuid)} />
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}
