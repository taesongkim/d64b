import { useAppSelector } from '@/store/hooks';

export type SyncState = {
  phase: 'idle' | 'syncing' | 'offline' | 'error' | 'done';
  queueCount: number;
  lastError?: string;
};

export function useSyncStatus(): SyncState {
  const { isOnline, isSyncing, queue, error } = useAppSelector(state => state.sync);

  // Map Redux sync state to our SyncState format
  if (error) {
    return {
      phase: 'error',
      queueCount: queue?.length || 0,
      lastError: error,
    };
  }

  if (!isOnline) {
    return {
      phase: 'offline',
      queueCount: queue?.length || 0,
    };
  }

  if (isSyncing) {
    return {
      phase: 'syncing',
      queueCount: queue?.length || 0,
    };
  }

  if (queue?.length > 0) {
    return {
      phase: 'syncing',
      queueCount: queue.length,
    };
  }

  return {
    phase: 'idle',
    queueCount: 0,
  };

  // Demo cycling disabled for now - keeping code for later use
  // const mockSyncStates: SyncState[] = [
  //   { phase: 'idle', queueCount: 0 },
  //   { phase: 'syncing', queueCount: 3 },
  //   { phase: 'offline', queueCount: 5 },
  //   { phase: 'error', queueCount: 2, lastError: 'Network timeout' },
  //   { phase: 'done', queueCount: 0 },
  // ];

  // let currentIndex = 0;
  // const interval = setInterval(() => {
  //   setSyncState(mockSyncStates[currentIndex]);
  //   currentIndex = (currentIndex + 1) % mockSyncStates.length;
  // }, 4000);

  // return () => clearInterval(interval);
}