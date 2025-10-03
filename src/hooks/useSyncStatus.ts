import { useState, useEffect } from 'react';

export type SyncState = {
  phase: 'idle' | 'syncing' | 'offline' | 'error' | 'done';
  queueCount: number;
  lastError?: string;
};

export function useSyncStatus(): SyncState {
  const [syncState, setSyncState] = useState<SyncState>({
    phase: 'idle',
    queueCount: 0,
  });

  useEffect(() => {
    // Mock sync status for now - in real implementation this would
    // subscribe to actual sync service state
    const mockSyncStates: SyncState[] = [
      { phase: 'idle', queueCount: 0 },
      { phase: 'syncing', queueCount: 3 },
      { phase: 'offline', queueCount: 5 },
      { phase: 'error', queueCount: 2, lastError: 'Network timeout' },
      { phase: 'done', queueCount: 0 },
    ];

    let currentIndex = 0;
    // eslint-disable-next-line no-undef
    const interval = setInterval(() => {
      setSyncState(mockSyncStates[currentIndex]);
      currentIndex = (currentIndex + 1) % mockSyncStates.length;
    }, 4000);

    // eslint-disable-next-line no-undef
    return () => clearInterval(interval);
  }, []);

  return syncState;
}