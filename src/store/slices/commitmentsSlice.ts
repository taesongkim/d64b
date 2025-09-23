import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
} = commitmentsSlice.actions;

export default commitmentsSlice.reducer;