import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../index';
import { addToQueue } from './syncSlice';

export interface Commitment {
  id: string;
  userId: string;
  title: string;
  description?: string;
  color: string;
  // New commitment type architecture
  commitmentType: 'checkbox' | 'measurement';
  target?: number;
  unit?: string;
  requirements?: string[]; // For checkbox commitments with multiple tasks
  ratingRange?: { min: number; max: number }; // For rating commitments
  // Legacy fields for backward compatibility
  type: 'binary' | 'counter' | 'timer'; // Deprecated, use commitmentType
  streak: number;
  bestStreak: number;
  isActive: boolean;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  // Archive and soft delete fields
  archived?: boolean;           // default false
  deletedAt?: string | null;    // ISO date when soft-deleted; null otherwise
}

interface CommitmentsState {
  commitments: Commitment[];
  isLoading: boolean;
  error: string | null;
}

const initialState: CommitmentsState = {
  commitments: [],
  isLoading: false,
  error: null,
};

const commitmentsSlice = createSlice({
  name: 'commitments',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setCommitments: (state, action: PayloadAction<Commitment[]>) => {
      state.commitments = action.payload;
    },
    addCommitment: (state, action: PayloadAction<Commitment>) => {
      state.commitments.push(action.payload);
    },
    updateCommitment: (state, action: PayloadAction<{ id: string; updates: Partial<Commitment> }>) => {
      const { id, updates } = action.payload;
      const index = state.commitments.findIndex(c => c.id === id);
      if (index !== -1) {
        state.commitments[index] = { ...state.commitments[index], ...updates };
      }
    },
    deleteCommitment: (state, action: PayloadAction<string>) => {
      state.commitments = state.commitments.filter(c => c.id !== action.payload);
    },
    updateStreak: (state, action: PayloadAction<{ id: string; streak: number }>) => {
      const { id, streak } = action.payload;
      const commitment = state.commitments.find(c => c.id === id);
      if (commitment) {
        commitment.streak = streak;
        if (streak > commitment.bestStreak) {
          commitment.bestStreak = streak;
        }
      }
    },
    resetStreak: (state, action: PayloadAction<string>) => {
      const commitment = state.commitments.find(c => c.id === action.payload);
      if (commitment) {
        commitment.streak = 0;
      }
    },
    archiveCommitment: (state, action: PayloadAction<string>) => {
      const commitment = state.commitments.find(c => c.id === action.payload);
      if (commitment) {
        commitment.archived = true;
        commitment.deletedAt = null; // Ensure mutual exclusivity
      }
    },
    restoreCommitment: (state, action: PayloadAction<string>) => {
      const commitment = state.commitments.find(c => c.id === action.payload);
      if (commitment) {
        commitment.archived = false;
        commitment.deletedAt = null;
      }
    },
    softDeleteCommitment: (state, action: PayloadAction<string>) => {
      const commitment = state.commitments.find(c => c.id === action.payload);
      if (commitment) {
        commitment.archived = false; // Ensure mutual exclusivity
        commitment.deletedAt = new Date().toISOString();
      }
    },
    permanentDeleteCommitment: (state, action: PayloadAction<string>) => {
      state.commitments = state.commitments.filter(c => c.id !== action.payload);
    },
    purgeExpiredDeleted: (state, action: PayloadAction<number | undefined>) => {
      const now = action.payload || Date.now();
      const cutoff = now - 7 * 24 * 60 * 60 * 1000; // 7 days in ms
      state.commitments = state.commitments.filter(c => {
        if (!c.deletedAt) return true;
        return new Date(c.deletedAt).getTime() >= cutoff;
      });
    },
  },
});

export const {
  setLoading,
  setError,
  setCommitments,
  addCommitment,
  updateCommitment,
  deleteCommitment,
  updateStreak,
  resetStreak,
  archiveCommitment,
  restoreCommitment,
  softDeleteCommitment,
  permanentDeleteCommitment,
  purgeExpiredDeleted,
} = commitmentsSlice.actions;

// Memoized selectors
export const selectActiveCommitments = createSelector(
  (state: RootState) => state.commitments.commitments,
  (commitments) => commitments.filter(c => !c.archived && !c.deletedAt)
);

export const selectArchivedCommitments = createSelector(
  (state: RootState) => state.commitments.commitments,
  (commitments) => commitments.filter(c => c.archived === true && !c.deletedAt)
);

export const selectRecentlyDeletedCommitments = createSelector(
  (state: RootState) => state.commitments.commitments,
  (commitments) => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return commitments.filter(c => c.deletedAt && new Date(c.deletedAt).getTime() >= cutoff);
  }
);

// Thunk actions for archive/delete operations with sync queue
export const archiveCommitmentThunk = (id: string) => (dispatch: AppDispatch, getState: () => RootState) => {
  const state = getState();
  const commitment = state.commitments.commitments.find(c => c.id === id);
  if (!commitment) return;

  // Optimistic update
  dispatch(archiveCommitment(id));

  // Add to sync queue with idempotency key
  dispatch(addToQueue({
    type: 'UPDATE',
    entity: 'commitment',
    entityId: id,
    data: {
      id,
      archived: true,
      is_active: false, // Ensure friends can't see archived commitments
      idempotencyKey: `${commitment.userId}:${id}:archive`
    }
  }));
};

export const restoreCommitmentThunk = (id: string) => (dispatch: AppDispatch, getState: () => RootState) => {
  const state = getState();
  const commitment = state.commitments.commitments.find(c => c.id === id);
  if (!commitment) return;

  // Optimistic update
  dispatch(restoreCommitment(id));

  // Add to sync queue with idempotency key
  dispatch(addToQueue({
    type: 'UPDATE',
    entity: 'commitment',
    entityId: id,
    data: {
      id,
      archived: false,
      deletedAt: null,
      is_active: true, // Restore visibility to friends
      idempotencyKey: `${commitment.userId}:${id}:restore`
    }
  }));
};

export const softDeleteCommitmentThunk = (id: string) => (dispatch: AppDispatch, getState: () => RootState) => {
  const state = getState();
  const commitment = state.commitments.commitments.find(c => c.id === id);
  if (!commitment) return;

  // Optimistic update
  dispatch(softDeleteCommitment(id));

  const deletedAt = new Date().toISOString();
  const today = deletedAt.split('T')[0];

  // Add to sync queue with idempotency key
  dispatch(addToQueue({
    type: 'UPDATE',
    entity: 'commitment',
    entityId: id,
    data: {
      id,
      archived: false,
      deletedAt,
      is_active: false, // Ensure friends can't see deleted commitments
      idempotencyKey: `${commitment.userId}:${id}:deletedAt:${today}`
    }
  }));
};

export const permanentDeleteCommitmentThunk = (id: string) => (dispatch: AppDispatch, getState: () => RootState) => {
  const state = getState();
  const commitment = state.commitments.commitments.find(c => c.id === id);
  if (!commitment) return;

  // Optimistic update
  dispatch(permanentDeleteCommitment(id));

  const timestamp = Date.now();

  // Add to sync queue with idempotency key
  dispatch(addToQueue({
    type: 'DELETE',
    entity: 'commitment',
    entityId: id,
    data: {
      id,
      idempotencyKey: `${commitment.userId}:${id}:permaDelete:${timestamp}`
    }
  }));
};

export default commitmentsSlice.reducer;