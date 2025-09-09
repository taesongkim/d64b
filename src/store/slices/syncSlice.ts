import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SyncAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'commitment' | 'record' | 'user';
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
      const syncAction: SyncAction = {
        ...action.payload,
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