import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { recordTimingMark, SyncTimingMark } from '@/utils/syncXRay';
import { FastPathSyncService } from '@/services/fastPathSync';

export interface SyncAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'commitment' | 'record' | 'user' | 'layout_item';
  entityId: string;
  data: any;
  timestamp: string;
  retryCount: number;
  idempotencyKey?: string; // For ensuring unique operations by (id, final rank)
  syncOpId?: string; // Sync X-Ray correlation ID
  interactive?: boolean; // Fast-path classification for user-initiated operations
}

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  queue: SyncAction[];
  lastSyncAt: string | null;
  error: string | null;
}

const initialState: SyncState = {
  isOnline: true,
  isSyncing: false,
  queue: [],
  lastSyncAt: null,
  error: null,
};

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    setSyncing: (state, action: PayloadAction<boolean>) => {
      state.isSyncing = action.payload;
    },
    addToQueue: (state, action: PayloadAction<Omit<SyncAction, 'id' | 'timestamp' | 'retryCount'>>) => {
      const newAction = action.payload;

      // SYNC X-RAY: Record queue enqueue timing
      if (newAction.syncOpId) {
        recordTimingMark(newAction.syncOpId, 'T1_QUEUE_ENQUEUED');
      }

      // Enhanced idempotency: check for duplicate operations by idempotencyKey
      if (newAction.idempotencyKey) {
        const existingAction = state.queue.find(action =>
          action.idempotencyKey === newAction.idempotencyKey
        );
        if (existingAction) {
          if (__DEV__) {
            console.log(`🔧 [SYNC-IDEMPOTENT] Skipping duplicate operation with key: ${newAction.idempotencyKey}`);
          }
          return; // Skip adding this action as it's already queued
        }
      }

      // Remove conflicting actions for the same entity
      state.queue = state.queue.filter(existingAction => {
        // Keep actions for different entities
        if (existingAction.entityId !== newAction.entityId || existingAction.entity !== newAction.entity) {
          return true;
        }

        // Enhanced conflict resolution: consider idempotency key for reordering operations
        if (newAction.idempotencyKey && existingAction.idempotencyKey) {
          // For reordering operations (move:id:rank), only keep the latest final rank
          const newKeyParts = newAction.idempotencyKey.split(':');
          const existingKeyParts = existingAction.idempotencyKey.split(':');

          if (newKeyParts[0] === 'move' && existingKeyParts[0] === 'move' &&
              newKeyParts[1] === existingKeyParts[1]) { // Same entity ID
            if (__DEV__) {
              console.log(`🔧 [SYNC-DEDUP] Removing conflicting move operation ${existingAction.idempotencyKey} for newer ${newAction.idempotencyKey}`);
            }
            return false; // Remove the older move operation
          }
        }

        // Remove conflicting actions for same entity
        // DELETE trumps everything, UPDATE trumps CREATE
        if (newAction.type === 'DELETE') {
          if (__DEV__) {
            console.log(`🔧 [SYNC-DEDUP] Removing conflicting ${existingAction.type} action for ${newAction.entity}:${newAction.entityId} (new DELETE)`);
          }
          return false;
        }
        if (newAction.type === 'UPDATE' && existingAction.type === 'CREATE') {
          if (__DEV__) {
            console.log(`🔧 [SYNC-DEDUP] Removing conflicting CREATE action for ${newAction.entity}:${newAction.entityId} (new UPDATE)`);
          }
          return false;
        }
        if (newAction.type === 'UPDATE' && existingAction.type === 'UPDATE') {
          if (__DEV__) {
            console.log(`🔧 [SYNC-DEDUP] Removing duplicate UPDATE action for ${newAction.entity}:${newAction.entityId}`);
          }
          return false;
        }

        return true;
      });

      const syncAction: SyncAction = {
        ...newAction,
        id: `sync_${Date.now()}_${Math.random()}`,
        timestamp: new Date().toISOString(),
        retryCount: 0,
      };
      state.queue.push(syncAction);

      if (__DEV__ && newAction.idempotencyKey) {
        console.log(`🔧 [SYNC-QUEUE] Added operation with idempotency key: ${newAction.idempotencyKey}${newAction.interactive ? ' (INTERACTIVE)' : ''}`);
      }

      // FAST-PATH: Attempt immediate processing for interactive operations
      if (newAction.interactive) {
        // Process asynchronously to avoid blocking Redux dispatch
        setTimeout(() => {
          FastPathSyncService.processIfInteractive(syncAction).catch(error => {
            if (__DEV__) {
              console.warn(`🚀 [FAST-PATH] Processing failed, fallback to queue: ${syncAction.idempotencyKey}`, error);
            }
          });
        }, 0);
      }
    },
    removeFromQueue: (state, action: PayloadAction<string>) => {
      state.queue = state.queue.filter(item => item.id !== action.payload);
    },
    incrementRetryCount: (state, action: PayloadAction<string>) => {
      const item = state.queue.find(item => item.id === action.payload);
      if (item) {
        item.retryCount += 1;
      }
    },
    clearQueue: (state) => {
      state.queue = [];
    },
    setLastSyncAt: (state, action: PayloadAction<string>) => {
      state.lastSyncAt = action.payload;
    },
    setSyncError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setOnlineStatus,
  setSyncing,
  addToQueue,
  removeFromQueue,
  incrementRetryCount,
  clearQueue,
  setLastSyncAt,
  setSyncError,
} = syncSlice.actions;

export default syncSlice.reducer;