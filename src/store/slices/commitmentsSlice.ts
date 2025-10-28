import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../index';
import { addToQueue } from './syncSlice';
import { getAllUserCommitments } from '@/services/commitments';
import { rankBetween } from '@/utils/rank';

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
  showValues?: boolean; // Toggle to display numeric values in grid cells
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
  // Order ranking fields
  order_rank: string;           // Lexicographic rank for stable ordering
  last_active_rank?: string | null; // Stored rank before archival
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
    setAllCommitments: (state, action: PayloadAction<Commitment[]>) => {
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
        commitment.isActive = false; // Update isActive to match database
        commitment.deletedAt = null; // Ensure mutual exclusivity
      }
    },
    restoreCommitment: (state, action: PayloadAction<string>) => {
      const commitment = state.commitments.find(c => c.id === action.payload);
      if (commitment) {
        commitment.archived = false;
        commitment.isActive = true; // Update isActive to match database
        commitment.deletedAt = null;
      }
    },
    softDeleteCommitment: (state, action: PayloadAction<string>) => {
      const commitment = state.commitments.find(c => c.id === action.payload);
      if (commitment) {
        commitment.archived = false; // Ensure mutual exclusivity
        commitment.isActive = false; // Update isActive to match database
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
    reorderCommitment: (state, action: PayloadAction<{ id: string; newRank: string }>) => {
      const { id, newRank } = action.payload;
      const commitment = state.commitments.find(c => c.id === id);
      if (commitment) {
        commitment.order_rank = newRank;
      }
    },
  },
});

export const {
  setLoading,
  setError,
  setCommitments,
  setAllCommitments,
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
  reorderCommitment,
} = commitmentsSlice.actions;

// Memoized selectors
export const selectActiveCommitments = createSelector(
  (state: RootState) => state.commitments.commitments,
  (commitments) => commitments.filter(c => c.isActive)
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
      last_active_rank: commitment.order_rank, // Store current position for restoration
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

// Reordering thunk actions
export const reorderCommitmentBetween = (params: {
  id: string;
  prevRank?: string | null;
  nextRank?: string | null;
}) => (dispatch: AppDispatch, getState: () => RootState) => {
  const { id, prevRank, nextRank } = params;
  const state = getState();
  const commitment = state.commitments.commitments.find(c => c.id === id);
  if (!commitment) return;

  const newRank = rankBetween(prevRank || null, nextRank || null);

  // Optimistic update
  dispatch(reorderCommitment({ id, newRank }));

  // Add to sync queue
  dispatch(addToQueue({
    type: 'UPDATE',
    entity: 'commitment',
    entityId: id,
    data: {
      id,
      order_rank: newRank,
      idempotencyKey: `move:${id}:${newRank}`
    }
  }));

  if (__DEV__) {
    console.log('🧪 reorder →', id, 'rank=', newRank);
  }
};

export const reorderCommitmentToIndex = (params: {
  id: string;
  targetIndex: number;
}) => (dispatch: AppDispatch, getState: () => RootState) => {
  const { id, targetIndex } = params;
  const state = getState();
  const activeCommitments = state.commitments.commitments
    .filter(c => c.isActive && !c.archived && !c.deletedAt)
    .sort((a, b) => a.order_rank.localeCompare(b.order_rank));

  const prevRank = targetIndex > 0 ? activeCommitments[targetIndex - 1]?.order_rank : null;
  const nextRank = targetIndex < activeCommitments.length ? activeCommitments[targetIndex]?.order_rank : null;

  dispatch(reorderCommitmentBetween({ id, prevRank, nextRank }));
};

// Thunk to load all commitments (including archived and deleted) for management page
export const loadAllCommitmentsThunk = (userId: string) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const { commitments, error } = await getAllUserCommitments(userId);

    if (error) {
      dispatch(setError(error.message || 'Failed to load commitments'));
      return;
    }

    if (commitments) {
      // Convert to Redux format
      const convertedCommitments = commitments.map(c => ({
        id: c.id,
        userId: c.user_id,
        title: c.title,
        description: c.description || undefined,
        color: c.color,
        commitmentType: c.commitment_type || 'checkbox',
        target: c.target,
        unit: c.unit,
        requirements: c.requirements,
        ratingRange: c.rating_range,
        showValues: c.show_values,
        type: c.commitment_type === 'checkbox' && !c.requirements ? 'binary' as const :
              c.commitment_type === 'checkbox' && c.requirements ? 'binary' as const :
              c.commitment_type === 'measurement' && c.rating_range ? 'counter' as const : 'timer' as const,
        streak: 0, // Will be calculated from records
        bestStreak: 0, // Will be calculated from records
        isActive: c.is_active,
        isPrivate: c.is_private || false,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        archived: c.archived || false,
        deletedAt: c.deleted_at || null,
        order_rank: c.order_rank || '',
        last_active_rank: c.last_active_rank || null,
      }));

      dispatch(setAllCommitments(convertedCommitments));
    }
  } catch (error) {
    dispatch(setError(error instanceof Error ? error.message : 'Failed to load commitments'));
  } finally {
    dispatch(setLoading(false));
  }
};

export const selectCommitmentById = createSelector(
  [(state: RootState) => state.commitments.commitments, (_: RootState, id: string) => id],
  (commitments, id) => commitments.find(c => c.id === id)
);

export default commitmentsSlice.reducer;