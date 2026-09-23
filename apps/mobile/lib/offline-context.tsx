import type { OfflineEntityKind } from '@forestwatch/types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { persistLocalPhoto } from '@/lib/offline-files';
import { insertOutbox, listOutbox, pendingOutboxCount, updateOutbox } from '@/lib/offline-store';
import { syncOutbox } from '@/lib/offline-sync';
import type { GpsSnapshot, OutboxPayload, OutboxRecord } from '@/lib/offline-types';
import { canQueueFromDraft } from '@/lib/offline-status';
import type { FieldPhoto } from '@/lib/photo';

type EnqueueInput = {
  kind: OfflineEntityKind;
  plantationId: string;
  plantationName?: string | null;
  payload: OutboxPayload;
  gps: GpsSnapshot | null;
  photo?: FieldPhoto | null;
  asDraft?: boolean;
};

type OfflineContextValue = {
  ready: boolean;
  items: OutboxRecord[];
  pendingCount: number;
  refresh: () => Promise<void>;
  syncNow: () => Promise<void>;
  enqueue: (input: EnqueueInput) => Promise<OutboxRecord>;
  queueDraft: (clientUuid: string) => Promise<void>;
};

const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { client, user, ready: authReady } = useAuth();
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<OutboxRecord[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const itemsNext = await listOutbox();
      const pending = await pendingOutboxCount();
      setItems(itemsNext);
      setPendingCount(pending);
    } catch {
      setItems([]);
      setPendingCount(0);
    } finally {
      setReady(true);
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!user) {
      await refresh();
      return;
    }
    await syncOutbox(client);
    await refresh();
  }, [client, refresh, user]);

  useEffect(() => {
    if (!authReady) {
      return;
    }
    void refresh().then(() => {
      if (user) {
        void syncNow();
      }
    });
  }, [authReady, refresh, syncNow, user]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && user) {
        void syncNow();
      }
    });
    return () => sub.remove();
  }, [syncNow, user]);

  const enqueue = useCallback(
    async (input: EnqueueInput) => {
      const now = new Date().toISOString();
      const clientUuid = crypto.randomUUID();
      const photo = input.photo ? await persistLocalPhoto(clientUuid, input.photo) : null;
      const record: OutboxRecord = {
        clientUuid,
        kind: input.kind,
        plantationId: input.plantationId,
        plantationName: input.plantationName ?? null,
        payload: input.payload,
        gps: input.gps,
        status: input.asDraft ? 'LOCAL_DRAFT' : 'QUEUED',
        serverId: null,
        lastError: null,
        rejectedPayload: null,
        createdAt: now,
        updatedAt: now,
        photoUri: photo?.uri ?? null,
        photoFilename: photo?.filename ?? null,
        photoMime: photo?.mimeType ?? null,
        photoServerId: null,
      };
      await insertOutbox(record);
      if (!input.asDraft && user) {
        await syncOutbox(client);
      }
      await refresh();
      const latest = (await listOutbox()).find((row) => row.clientUuid === clientUuid);
      return latest ?? record;
    },
    [client, refresh, user],
  );

  const queueDraft = useCallback(
    async (clientUuid: string) => {
      const current = items.find((row) => row.clientUuid === clientUuid);
      if (!current || !canQueueFromDraft(current.status)) {
        return;
      }
      await updateOutbox(clientUuid, { status: 'QUEUED', lastError: null });
      if (user) {
        await syncOutbox(client);
      }
      await refresh();
    },
    [client, items, refresh, user],
  );

  const value = useMemo<OfflineContextValue>(
    () => ({ ready, items, pendingCount, refresh, syncNow, enqueue, queueDraft }),
    [enqueue, items, pendingCount, queueDraft, ready, refresh, syncNow],
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline(): OfflineContextValue {
  const value = useContext(OfflineContext);
  if (!value) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return value;
}

export function usePlantationOutbox(plantationId: string): OutboxRecord[] {
  const { items } = useOffline();
  return items.filter((row) => row.plantationId === plantationId && row.status !== 'SYNCED');
}
