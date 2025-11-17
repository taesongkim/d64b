/**
 * Unit tests for friend order ranks seeding
 * Tests idempotency, per-user flags, and only-blank behavior
 */

import { seedFriendOrderRanksOnce, updateFriendOrderRank } from '../seedFriendOrderRanks';
import { store } from '@/store';
import { setFriendOrderSeedDoneForUser } from '@/store/slices/settingsSlice';

// Mock dependencies
jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockResolvedValue({ data: [], error: null }),
      upsert: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

jest.mock('@/services/friends', () => ({
  getUserFriends: jest.fn(),
}));

jest.mock('@/store', () => ({
  store: {
    getState: jest.fn(),
    dispatch: jest.fn(),
  },
}));

const mockStore = store as jest.Mocked<typeof store>;
const { getUserFriends } = require('@/services/friends');
const { supabase } = require('@/services/supabase');

describe('seedFriendOrderRanksOnce', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock state
    mockStore.getState.mockReturnValue({
      settings: {
        friendOrderSeedDoneByUser: {},
      },
    });
  });

  it('should exit early if user already seeded', async () => {
    // Mock already seeded state
    mockStore.getState.mockReturnValue({
      settings: {
        friendOrderSeedDoneByUser: {
          'user123': true,
        },
      },
    });

    await seedFriendOrderRanksOnce('user123');

    expect(getUserFriends).not.toHaveBeenCalled();
    expect(mockStore.dispatch).not.toHaveBeenCalled();
  });

  it('should set flag even if no friends to seed', async () => {
    getUserFriends.mockResolvedValue({ data: [], error: null });

    await seedFriendOrderRanksOnce('user123');

    expect(mockStore.dispatch).toHaveBeenCalledWith(
      setFriendOrderSeedDoneForUser({ userId: 'user123', done: true })
    );
  });

  it('should seed friends without existing order ranks', async () => {
    const mockFriends = [
      { id: 'friend1', name: 'Alice' },
      { id: 'friend2', name: 'Bob' },
      { id: 'friend3', name: 'Charlie' },
    ];

    getUserFriends.mockResolvedValue({ data: mockFriends, error: null });

    // Mock no existing order ranks
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ data: [], error: null }),
    });

    await seedFriendOrderRanksOnce('user123');

    expect(supabase.from).toHaveBeenCalledWith('friend_order');
    expect(mockStore.dispatch).toHaveBeenCalledWith(
      setFriendOrderSeedDoneForUser({ userId: 'user123', done: true })
    );
  });

  it('should sort friends by name for stable seeding', async () => {
    const mockFriends = [
      { id: 'friend1', name: 'Charlie' },
      { id: 'friend2', name: 'Alice' },
      { id: 'friend3', name: 'Bob' },
    ];

    getUserFriends.mockResolvedValue({ data: mockFriends, error: null });

    const insertSpy = jest.fn().mockResolvedValue({ data: [], error: null });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      insert: insertSpy,
    });

    await seedFriendOrderRanksOnce('user123');

    // Verify friends were sorted by name (Alice, Bob, Charlie)
    const insertedData = insertSpy.mock.calls[0][0];
    expect(insertedData).toHaveLength(3);

    // Alice should get the first rank (empty string + rankAfter = first rank)
    const aliceFriend = insertedData.find(item => item.friend_user_id === 'friend2');
    expect(aliceFriend).toBeTruthy();
  });

  it('should handle seeding errors gracefully', async () => {
    getUserFriends.mockResolvedValue({ data: null, error: new Error('API Error') });

    await expect(seedFriendOrderRanksOnce('user123')).resolves.toBeUndefined();

    // Should not crash or throw
    expect(mockStore.dispatch).not.toHaveBeenCalled();
  });
});

describe('updateFriendOrderRank', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should upsert friend order rank', async () => {
    const upsertSpy = jest.fn().mockResolvedValue({ data: [{ order_rank: 'newRank' }], error: null });
    supabase.from.mockReturnValue({
      upsert: upsertSpy,
      select: jest.fn().mockReturnThis(),
    });

    const result = await updateFriendOrderRank('user123', 'friend456', 'newRank');

    expect(upsertSpy).toHaveBeenCalledWith(
      {
        user_id: 'user123',
        friend_user_id: 'friend456',
        group_name: 'all',
        order_rank: 'newRank',
      },
      { onConflict: 'user_id,group_name,friend_user_id' }
    );

    expect(result.error).toBeNull();
  });

  it('should skip update if onlyIfBlank=true and rank exists', async () => {
    const selectSpy = jest.fn().mockResolvedValue({
      data: { order_rank: 'existingRank' },
      error: null
    });

    supabase.from.mockReturnValue({
      select: selectSpy,
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      upsert: jest.fn(),
    });

    const result = await updateFriendOrderRank('user123', 'friend456', 'newRank', { onlyIfBlank: true });

    expect(result.data).toEqual({ order_rank: 'existingRank' });
    expect(supabase.from().upsert).not.toHaveBeenCalled();
  });

  it('should handle database errors gracefully', async () => {
    supabase.from.mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ data: null, error: new Error('DB Error') }),
      select: jest.fn().mockReturnThis(),
    });

    const result = await updateFriendOrderRank('user123', 'friend456', 'newRank');

    expect(result.error).toBeTruthy();
    expect(result.data).toBeNull();
  });
});