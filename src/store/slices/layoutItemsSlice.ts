import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { addToQueue } from './syncSlice';

export interface LayoutItem {
  id: string;
  userId: string;
  type: 'spacer' | 'divider';

  // Spacer properties
  height?: number; // Height in pixels for spacers

  // Divider properties (Phase 4)
  style?: 'solid' | 'dashed' | 'dotted';
  color?: string; // Hex color for dividers

  // Ordering and lifecycle
  order_rank: string; // LexoRank for stable ordering
  isActive: boolean;
  archived?: boolean;
  deletedAt?: string | null;
  lastActiveRank?: string | null;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

interface LayoutItemsState {
  layoutItems: LayoutItem[];
  isLoading: boolean;
  error: string | null;
}

const initialState: LayoutItemsState = {
  layoutItems: [],
  isLoading: false,
  error: null,
};

const layoutItemsSlice = createSlice({
  name: 'layoutItems',
  initialState,
  reducers: {
    setLayoutItems: (state, action: PayloadAction<LayoutItem[]>) => {
      state.layoutItems = action.payload;
    },
    addLayoutItem: (state, action: PayloadAction<LayoutItem>) => {
      state.layoutItems.push(action.payload);
    },
    updateLayoutItem: (state, action: PayloadAction<Partial<LayoutItem> & { id: string }>) => {
      const index = state.layoutItems.findIndex(item => item.id === action.payload.id);
      if (index !== -1) {
        state.layoutItems[index] = { ...state.layoutItems[index], ...action.payload };
      }
    },
    deleteLayoutItem: (state, action: PayloadAction<string>) => {
      state.layoutItems = state.layoutItems.filter(item => item.id !== action.payload);
    },
    softDeleteLayoutItem: (state, action: PayloadAction<{ id: string; deletedAt: string }>) => {
      const item = state.layoutItems.find(item => item.id === action.payload.id);
      if (item) {
        item.deletedAt = action.payload.deletedAt;
        item.isActive = false;
      }
    },
    archiveLayoutItem: (state, action: PayloadAction<{ id: string; lastActiveRank: string }>) => {
      const item = state.layoutItems.find(item => item.id === action.payload.id);
      if (item) {
        item.archived = true;
        item.isActive = false;
        item.lastActiveRank = action.payload.lastActiveRank;
      }
    },
    restoreLayoutItem: (state, action: PayloadAction<{ id: string; newRank: string }>) => {
      const item = state.layoutItems.find(item => item.id === action.payload.id);
      if (item) {
        item.archived = false;
        item.isActive = true;
        item.order_rank = action.payload.newRank;
        item.deletedAt = null;
      }
    },
    batchReorderLayoutItems: (state, action: PayloadAction<Array<{ id: string; newRank: string }>>) => {
      action.payload.forEach(({ id, newRank }) => {
        const item = state.layoutItems.find(item => item.id === id);
        if (item) {
          item.order_rank = newRank;
          item.updatedAt = new Date().toISOString();
        }
      });
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setLayoutItems,
  addLayoutItem,
  updateLayoutItem,
  deleteLayoutItem,
  softDeleteLayoutItem,
  archiveLayoutItem,
  restoreLayoutItem,
  batchReorderLayoutItems,
  setLoading,
  setError,
} = layoutItemsSlice.actions;

// Selectors
export const selectAllLayoutItems = (state: RootState) => state.layoutItems.layoutItems;

export const selectActiveLayoutItems = createSelector(
  [selectAllLayoutItems],
  (layoutItems) => layoutItems.filter(item => item.isActive && !item.deletedAt)
);

export const selectArchivedLayoutItems = createSelector(
  [selectAllLayoutItems],
  (layoutItems) => layoutItems.filter(item => item.archived && !item.deletedAt)
);

export const selectLayoutItemsByType = createSelector(
  [selectActiveLayoutItems, (state: RootState, type: 'spacer' | 'divider') => type],
  (layoutItems, type) => layoutItems.filter(item => item.type === type)
);

// Select spacers only (for Phase 3)
export const selectActiveSpacer = createSelector(
  [selectActiveLayoutItems],
  (layoutItems) => layoutItems.filter(item => item.type === 'spacer')
);

// Combined selector for ordered active layout items (for integration with commitments)
export const selectActiveLayoutItemsOrdered = createSelector(
  [selectActiveLayoutItems],
  (layoutItems) => [...layoutItems].sort((a, b) => a.order_rank.localeCompare(b.order_rank))
);

export default layoutItemsSlice.reducer;