import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../index';
import { addToQueue } from './syncSlice';
import { rankBetween } from '@/utils/rank';

export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  username: string;
  profilePicture?: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: string;
  // Extended fields for friend ordering and display
  name?: string;
  avatar_animal?: string;
  avatar_color?: string;
  mutualFriends?: number;
  currentStreak?: number;
  completedToday?: number;
  totalHabits?: number;
  blocked?: boolean;
  order_rank?: string; // Personal ordering rank
  updated_at?: string; // For conflict resolution
}

export interface FriendActivity {
  id: string;
  userId: string;
  username: string;
  profilePicture?: string;
  commitmentTitle: string;
  action: 'completed' | 'streak_milestone' | 'new_commitment';
  timestamp: string;
}

interface SocialState {
  friends: Friend[];
  friendRequests: Friend[];
  activity: FriendActivity[];
  isLoading: boolean;
  error: string | null;
}

const initialState: SocialState = {
  friends: [],
  friendRequests: [],
  activity: [],
  isLoading: false,
  error: null,
};

const socialSlice = createSlice({
  name: 'social',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setFriends: (state, action: PayloadAction<Friend[]>) => {
      state.friends = action.payload;
    },
    setFriendRequests: (state, action: PayloadAction<Friend[]>) => {
      state.friendRequests = action.payload;
    },
    setActivity: (state, action: PayloadAction<FriendActivity[]>) => {
      state.activity = action.payload;
    },
    addFriend: (state, action: PayloadAction<Friend>) => {
      state.friends.push(action.payload);
    },
    removeFriend: (state, action: PayloadAction<string>) => {
      state.friends = state.friends.filter(f => f.id !== action.payload);
    },
    addFriendRequest: (state, action: PayloadAction<Friend>) => {
      state.friendRequests.push(action.payload);
    },
    acceptFriendRequest: (state, action: PayloadAction<string>) => {
      const request = state.friendRequests.find(r => r.id === action.payload);
      if (request) {
        state.friends.push({ ...request, status: 'accepted' });
        state.friendRequests = state.friendRequests.filter(r => r.id !== action.payload);
      }
    },
    declineFriendRequest: (state, action: PayloadAction<string>) => {
      state.friendRequests = state.friendRequests.filter(r => r.id !== action.payload);
    },
    addActivity: (state, action: PayloadAction<FriendActivity>) => {
      state.activity.unshift(action.payload);
      if (state.activity.length > 100) {
        state.activity = state.activity.slice(0, 100);
      }
    },
    updateFriendOrder: (state, action: PayloadAction<{ id: string; newRank: string }>) => {
      const { id, newRank } = action.payload;
      const friend = state.friends.find(f => f.id === id);
      if (friend) {
        friend.order_rank = newRank;
      }
    },
    batchUpdateFriendOrder: (state, action: PayloadAction<Array<{ id: string; newRank: string }>>) => {
      const updates = action.payload;
      updates.forEach(({ id, newRank }) => {
        const friend = state.friends.find(f => f.id === id);
        if (friend) {
          friend.order_rank = newRank;
        }
      });
    },
  },
});

export const {
  setLoading,
  setError,
  setFriends,
  setFriendRequests,
  setActivity,
  addFriend,
  removeFriend,
  addFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  addActivity,
  updateFriendOrder,
  batchUpdateFriendOrder,
} = socialSlice.actions;

// Thunk actions for friend reordering with fast-path sync
export const reorderFriendBetween = (params: {
  id: string;
  prevRank?: string | null;
  nextRank?: string | null;
}) => (dispatch: AppDispatch, getState: () => RootState) => {
  const { id, prevRank, nextRank } = params;
  const state = getState();
  const friend = state.social.friends.find(f => f.id === id);
  if (!friend) return;

  // Calculate new rank using LexoRank
  const newRank = rankBetween(prevRank || null, nextRank || null);

  // Optimistic update
  dispatch(updateFriendOrder({ id, newRank }));

  // Add to sync queue with fast-path and idempotency
  dispatch(addToQueue({
    type: 'UPDATE',
    entity: 'friend_order' as any,
    entityId: id,
    data: {
      user_id: state.auth?.user?.id || '',
      friend_user_id: id,
      group_name: 'all',
      order_rank: newRank,
    },
    interactive: true, // Enable Phase A fast-path (≤2s target)
    idempotencyKey: `friend_move:${id}:${newRank}` // Coalescing key for rapid moves
  }));
};

export const batchReorderFriends = (updates: Array<{ id: string; newRank: string }>) =>
  (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    const userId = state.auth?.user?.id;
    if (!userId) return Promise.reject(new Error('User not authenticated'));


    // Optimistic update
    dispatch(batchUpdateFriendOrder(updates));

    // Add each update to sync queue with fast-path
    updates.forEach(({ id, newRank }) => {
      dispatch(addToQueue({
        type: 'UPDATE',
        entity: 'friend_order' as any,
        entityId: id,
        data: {
          user_id: userId,
          friend_user_id: id,
          group_name: 'all',
          order_rank: newRank,
        },
        interactive: true, // Enable Phase A fast-path
        idempotencyKey: `friend_move:${id}:${newRank}`
      }));
    });

    return Promise.resolve();
  };

export default socialSlice.reducer;