/**
 * One-shot seeding utility for empty friend order_rank values
 * Reuses the same pattern as commitment seeding for consistency
 * Runs once per user after setting friendOrderSeedDone flag
 */

import { supabase } from '@/services/supabase';
import { rankAfter } from '@/utils/rank';
import { store } from '@/store';
import { setFriendOrderSeedDoneForUser } from '@/store/slices/settingsSlice';
import { getUserFriends } from '@/services/friends';

/**
 * Seeds empty friend order_rank values for current user's friends
 * Only runs once per user based on friendOrderSeedDone flag
 * Uses current friends list order as the initial seed source
 */
export async function seedFriendOrderRanksOnce(userId: string): Promise<void> {
  if (!userId) return;

  const state = store.getState();

  // Exit if already seeded for this user
  if (state.settings?.friendOrderSeedDoneByUser?.[userId] === true) {
    return;
  }

  if (__DEV__) {
    console.log('🧭 Checking for friends needing order rank seeding...');
  }

  try {
    // Get current user's friends list to determine seeding order
    const { data: friendsData, error: friendsError } = await getUserFriends(userId);

    if (friendsError) {
      console.error('❌ Error fetching friends for seeding:', friendsError);
      return;
    }

    if (!friendsData || friendsData.length === 0) {
      if (__DEV__) {
        console.log('✅ No friends to seed order ranks for');
      }
      // Set flag even if no seeding needed
      store.dispatch(setFriendOrderSeedDoneForUser({ userId, done: true }));
      return;
    }

    // Check which friends need order ranks
    const { data: existingOrderData, error: orderError } = await supabase
      .from('friend_order')
      .select('friend_user_id')
      .eq('user_id', userId)
      .eq('group_name', 'all');

    if (orderError) {
      console.error('❌ Error checking existing friend order ranks:', orderError);
      return;
    }

    // Find friends that don't have order ranks yet
    const existingOrderedFriends = new Set(
      existingOrderData?.map(item => item.friend_user_id) || []
    );

    const friendsNeedingRanks = friendsData.filter(
      friend => !existingOrderedFriends.has(friend.id)
    );

    if (friendsNeedingRanks.length === 0) {
      if (__DEV__) {
        console.log('✅ All friends already have order ranks');
      }
      // Set flag even if no seeding needed
      store.dispatch(setFriendOrderSeedDoneForUser({ userId, done: true }));
      return;
    }

    if (__DEV__) {
      console.log('🌱 Found', friendsNeedingRanks.length, 'friends needing order ranks');
    }

    // Sort friends by name to maintain stable seeding order
    // This ensures consistent initial ordering across devices
    const sortedFriends = friendsNeedingRanks.sort((a, b) => {
      const nameA = a.name || a.username || a.id || '';
      const nameB = b.name || b.username || b.id || '';
      return nameA.localeCompare(nameB);
    });

    // Assign sequential ranks using rankAfter
    let lastRank = '';
    let seededCount = 0;
    const insertData = [];

    for (const friend of sortedFriends) {
      const newRank = rankAfter(lastRank);

      insertData.push({
        user_id: userId,
        friend_user_id: friend.id,
        group_name: 'all',
        order_rank: newRank
      });

      lastRank = newRank;
      seededCount++;
    }

    // Batch insert all new order ranks
    const { error: insertError } = await supabase
      .from('friend_order')
      .insert(insertData);

    if (insertError) {
      console.error('❌ Error seeding friend order ranks:', insertError);
      return;
    }

    // Set flag to prevent future runs
    store.dispatch(setFriendOrderSeedDoneForUser({ userId, done: true }));

    if (__DEV__) {
      console.log(`🧭 friend order seed: ${seededCount} ranks assigned`);
    }

  } catch (error) {
    console.error('❌ Error in seedFriendOrderRanksOnce:', error);
  }
}

/**
 * Update friend order rank for a single friend
 * Used by fast-path sync and conflict resolution
 */
export async function updateFriendOrderRank(
  userId: string,
  friendUserId: string,
  newRank: string,
  options: { onlyIfBlank?: boolean } = {}
): Promise<{ data: any; error: any }> {
  try {
    let query = supabase
      .from('friend_order')
      .upsert({
        user_id: userId,
        friend_user_id: friendUserId,
        group_name: 'all',
        order_rank: newRank
      }, {
        onConflict: 'user_id,group_name,friend_user_id'
      });

    // If onlyIfBlank is true, only update if no existing rank
    if (options.onlyIfBlank) {
      const { data: existing } = await supabase
        .from('friend_order')
        .select('order_rank')
        .eq('user_id', userId)
        .eq('friend_user_id', friendUserId)
        .eq('group_name', 'all')
        .single();

      // Skip if already has a rank
      if (existing?.order_rank) {
        return { data: existing, error: null };
      }
    }

    const { data, error } = await query.select();

    return { data, error };
  } catch (error) {
    console.error('❌ Error updating friend order rank:', error);
    return { data: null, error };
  }
}