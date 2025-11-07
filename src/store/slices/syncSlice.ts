import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SyncAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'commitment' | 'record' | 'user' | 'layout_item';
  entityId: string;
  data: any;
  timestamp: string;
  retryCount: number;
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

      // Remove conflicting actions for the same entity
      state.queue = state.queue.filter(existingAction => {
        // Keep actions for different entities
        if (existingAction.entityId !== newAction.entityId || existingAction.entity !== newAction.entity) {
          return true;
        }

        // Remove conflicting actions for same entity
        // DELETE trumps everything, UPDATE trumps CREATE
        if (newAction.type === 'DELETE') {
          console.log(`🔧 [SYNC-DEDUP] Removing conflicting ${existingAction.type} action for ${newAction.entity}:${newAction.entityId} (new DELETE)`);
          return false;
        }
        if (newAction.type === 'UPDATE' && existingAction.type === 'CREATE') {
          console.log(`🔧 [SYNC-DEDUP] Removing conflicting CREATE action for ${newAction.entity}:${newAction.entityId} (new UPDATE)`);
          return false;
        }
        if (newAction.type === 'UPDATE' && existingAction.type === 'UPDATE') {
          console.log(`🔧 [SYNC-DEDUP] Removing duplicate UPDATE action for ${newAction.entity}:${newAction.entityId}`);
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