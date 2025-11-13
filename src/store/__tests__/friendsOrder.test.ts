/**
 * Unit tests for friends ordering selectors and thunks
 * Tests rank-based sorting, fast-path integration, and idempotency
 */

import { configureStore } from '@reduxjs/toolkit';
import socialSlice, {
  reorderFriendBetween,
  batchReorderFriends,
  updateFriendOrder,
  batchUpdateFriendOrder,
  type Friend
} from '../slices/socialSlice';
import {
  selectFriendsOrdered,
  selectFriendsOrderingEnabled,
  selectFriendByIdWithRankContext,
  selectFriendsCount
} from '../selectors/friendsOrder';
import { addToQueue } from '../slices/syncSlice';
import { rankBetween } from '@/utils/rank';

// Mock dependencies
jest.mock('@/utils/rank', () => ({
  rankBetween: jest.fn(),
}));

jest.mock('@/utils/syncXRay', () => ({
  startSyncOperation: jest.fn(() => 'mock-sync-op-id'),
  recordTimingMark: jest.fn(),
}));

const mockRankBetween = rankBetween as jest.MockedFunction<typeof rankBetween>;

// Test store setup
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      social: socialSlice,
      sync: (state = { queue: [], isOnline: true }) => state,
      auth: (state = { user: { id: 'test-user' } }) => state,
    },
    preloadedState: {
      social: {
        friends: [],
        friendRequests: [],
        activity: [],
        isLoading: false,
        error: null,
        ...initialState,
      },
    },
  });
};

describe('Friends ordering selectors', () => {
  const mockFriends: Friend[] = [
    {
      id: 'friend1',
      userId: 'user123',
      friendId: 'friend1',
      username: 'alice',
      status: 'accepted',
      createdAt: '2023-01-01',
      name: 'Alice',
      order_rank: 'b',
    },
    {
      id: 'friend2',
      userId: 'user123',
      friendId: 'friend2',
      username: 'bob',
      status: 'accepted',
      createdAt: '2023-01-02',
      name: 'Bob',
      order_rank: 'a',
    },
    {
      id: 'friend3',
      userId: 'user123',
      friendId: 'friend3',
      username: 'charlie',
      status: 'accepted',
      createdAt: '2023-01-03',
      name: 'Charlie',
      order_rank: 'c',
      blocked: true, // Should be filtered out
    },
    {
      id: 'friend4',
      userId: 'user123',
      friendId: 'friend4',
      username: 'diana',
      status: 'accepted',
      createdAt: '2023-01-04',
      name: 'Diana',
      order_rank: '', // Empty rank should fall back to name sorting
    },
  ];

  const store = createTestStore({ friends: mockFriends });
  const state = store.getState();

  describe('selectFriendsOrdered', () => {
    it('should sort friends by order_rank then name', () => {
      const orderedFriends = selectFriendsOrdered(state);

      // Should exclude blocked friend3
      expect(orderedFriends).toHaveLength(3);

      // Should sort by order_rank: '' (empty), 'a', 'b'
      expect(orderedFriends[0].name).toBe('Diana'); // Empty rank, sorted by name
      expect(orderedFriends[1].name).toBe('Bob');   // order_rank: 'a'
      expect(orderedFriends[2].name).toBe('Alice'); // order_rank: 'b'
    });

    it('should filter out blocked friends', () => {
      const orderedFriends = selectFriendsOrdered(state);

      const blockedFriend = orderedFriends.find(f => f.blocked);
      expect(blockedFriend).toBeUndefined();
    });

    it('should use name fallback for same ranks', () => {
      const friendsWithSameRank: Friend[] = [
        {
          id: 'friend1',
          userId: 'user123',
          friendId: 'friend1',
          username: 'zoe',
          status: 'accepted',
          createdAt: '2023-01-01',
          name: 'Zoe',
          order_rank: '',
        },
        {
          id: 'friend2',
          userId: 'user123',
          friendId: 'friend2',
          username: 'anna',
          status: 'accepted',
          createdAt: '2023-01-02',
          name: 'Anna',
          order_rank: '',
        },
      ];

      const testStore = createTestStore({ friends: friendsWithSameRank });
      const testState = testStore.getState();
      const orderedFriends = selectFriendsOrdered(testState);

      expect(orderedFriends[0].name).toBe('Anna'); // Alphabetically first
      expect(orderedFriends[1].name).toBe('Zoe');  // Alphabetically second
    });
  });

  describe('selectFriendsOrderingEnabled', () => {
    it('should return true when ≥2 non-blocked friends', () => {
      const enabled = selectFriendsOrderingEnabled(state);
      expect(enabled).toBe(true);
    });

    it('should return false when ≤1 friends', () => {
      const singleFriendStore = createTestStore({
        friends: [mockFriends[0]]
      });
      const singleState = singleFriendStore.getState();

      const enabled = selectFriendsOrderingEnabled(singleState);
      expect(enabled).toBe(false);
    });
  });

  describe('selectFriendByIdWithRankContext', () => {
    it('should return friend with prev/next context', () => {
      const context = selectFriendByIdWithRankContext(state, 'friend2');

      expect(context?.friend.name).toBe('Bob');
      expect(context?.index).toBe(1);
      expect(context?.prev?.name).toBe('Diana'); // Previous in ordered list
      expect(context?.next?.name).toBe('Alice');  // Next in ordered list
      expect(context?.canMoveUp).toBe(true);
      expect(context?.canMoveDown).toBe(true);
    });

    it('should handle first position correctly', () => {
      const context = selectFriendByIdWithRankContext(state, 'friend4'); // Diana, first

      expect(context?.canMoveUp).toBe(false);
      expect(context?.canMoveDown).toBe(true);
      expect(context?.prev).toBeNull();
    });

    it('should handle last position correctly', () => {
      const context = selectFriendByIdWithRankContext(state, 'friend1'); // Alice, last

      expect(context?.canMoveUp).toBe(true);
      expect(context?.canMoveDown).toBe(false);
      expect(context?.next).toBeNull();
    });
  });
});

describe('Friends ordering thunks', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRankBetween.mockReturnValue('new-rank');

    store = createTestStore({
      friends: [
        {
          id: 'friend1',
          userId: 'user123',
          friendId: 'friend1',
          username: 'alice',
          status: 'accepted',
          createdAt: '2023-01-01',
          name: 'Alice',
          order_rank: 'a',
        },
      ],
    });
  });

  describe('reorderFriendBetween', () => {
    it('should calculate new rank and dispatch fast-path sync', async () => {
      const dispatchSpy = jest.spyOn(store, 'dispatch');

      await store.dispatch(reorderFriendBetween({
        id: 'friend1',
        prevRank: 'a',
        nextRank: 'c',
      }));

      expect(mockRankBetween).toHaveBeenCalledWith('a', 'c');

      // Should update optimistically
      expect(dispatchSpy).toHaveBeenCalledWith(
        updateFriendOrder({ id: 'friend1', newRank: 'new-rank' })
      );

      // Should add to sync queue with fast-path
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sync/addToQueue',
          payload: expect.objectContaining({
            type: 'UPDATE',
            entity: 'friend_order',
            entityId: 'friend1',
            interactive: true,
            idempotencyKey: 'friend_move:friend1:new-rank',
          }),
        })
      );
    });

    it('should exit early if friend not found', async () => {
      const dispatchSpy = jest.spyOn(store, 'dispatch');

      await store.dispatch(reorderFriendBetween({
        id: 'non-existent-friend',
        prevRank: 'a',
        nextRank: 'c',
      }));

      expect(mockRankBetween).not.toHaveBeenCalled();
      expect(dispatchSpy).toHaveBeenCalledTimes(1); // Only the thunk dispatch itself
    });
  });

  describe('batchReorderFriends', () => {
    it('should process multiple updates with fast-path', async () => {
      const dispatchSpy = jest.spyOn(store, 'dispatch');

      const updates = [
        { id: 'friend1', newRank: 'rank1' },
        { id: 'friend2', newRank: 'rank2' },
      ];

      await store.dispatch(batchReorderFriends(updates));

      // Should batch update optimistically
      expect(dispatchSpy).toHaveBeenCalledWith(
        batchUpdateFriendOrder(updates)
      );

      // Should add each to sync queue with fast-path
      updates.forEach(({ id, newRank }) => {
        expect(dispatchSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'sync/addToQueue',
            payload: expect.objectContaining({
              entityId: id,
              interactive: true,
              idempotencyKey: `friend_move:${id}:${newRank}`,
            }),
          })
        );
      });
    });

    it('should reject if user not authenticated', async () => {
      const noAuthStore = configureStore({
        reducer: {
          social: socialSlice,
          sync: (state = { queue: [] }) => state,
          auth: (state = { user: null }) => state, // No user
        },
        preloadedState: {
          social: { friends: [], friendRequests: [], activity: [], isLoading: false, error: null },
        },
      });

      const result = await noAuthStore.dispatch(batchReorderFriends([
        { id: 'friend1', newRank: 'rank1' }
      ]));

      expect(result.type).toBe('sync/addToQueue/rejected');
    });
  });
});

describe('Friend order reducers', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore({
      friends: [
        {
          id: 'friend1',
          userId: 'user123',
          friendId: 'friend1',
          username: 'alice',
          status: 'accepted',
          createdAt: '2023-01-01',
          name: 'Alice',
          order_rank: 'a',
        },
        {
          id: 'friend2',
          userId: 'user123',
          friendId: 'friend2',
          username: 'bob',
          status: 'accepted',
          createdAt: '2023-01-02',
          name: 'Bob',
          order_rank: 'b',
        },
      ],
    });
  });

  it('should update single friend order rank', () => {
    store.dispatch(updateFriendOrder({ id: 'friend1', newRank: 'z' }));

    const state = store.getState();
    const friend1 = state.social.friends.find(f => f.id === 'friend1');

    expect(friend1?.order_rank).toBe('z');
  });

  it('should batch update multiple friend order ranks', () => {
    const updates = [
      { id: 'friend1', newRank: 'y' },
      { id: 'friend2', newRank: 'z' },
    ];

    store.dispatch(batchUpdateFriendOrder(updates));

    const state = store.getState();
    const friend1 = state.social.friends.find(f => f.id === 'friend1');
    const friend2 = state.social.friends.find(f => f.id === 'friend2');

    expect(friend1?.order_rank).toBe('y');
    expect(friend2?.order_rank).toBe('z');
  });

  it('should handle updates for non-existent friends gracefully', () => {
    store.dispatch(updateFriendOrder({ id: 'non-existent', newRank: 'z' }));

    // Should not crash or affect existing state
    const state = store.getState();
    expect(state.social.friends).toHaveLength(2);
  });
});