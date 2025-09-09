import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  username: string;
  profilePicture?: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: string;
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
} = socialSlice.actions;

export default socialSlice.reducer;