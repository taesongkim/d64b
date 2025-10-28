/**
 * One-shot seeding utility for empty order_rank values
 * Runs once per user after setting lexorankSeedDone flag
 */

import { supabase } from '@/services/supabase';
import { updateOrderRank } from '@/services/commitments';
import { rankAfter } from '@/utils/rank';
import { store } from '@/store';
import { setLexorankSeedDoneForUser } from '@/store/slices/settingsSlice';

/**
 * Seeds empty order_rank values for current user's active commitments
 * Only runs once per user based on lexorankSeedDone flag
 */
export async function seedOrderRanksOnce(userId: string): Promise<void> {
  if (!userId) return;

  const state = store.getState();

  // Exit if already seeded for this user
  if (state.settings.lexorankSeedDoneByUser[userId] === true) {
    return;
  }

  if (__DEV__) {
    console.log('🧭 Checking for commitments needing order rank seeding...');
  }

  try {
    // Query current user's active commitments with empty order_rank
    const { data: commitmentsNeedingRanks, error: checkError } = await supabase
      .from('commitments')
      .select('id, created_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .or('order_rank.eq.,order_rank.is.null');

    if (checkError) {
      console.error('❌ Error checking for commitments needing ranks:', checkError);
      return;
    }

    if (!commitmentsNeedingRanks || commitmentsNeedingRanks.length === 0) {
      if (__DEV__) {
        console.log('✅ All commitments already have order ranks');
      }
      // Set flag even if no seeding needed
      store.dispatch(setLexorankSeedDoneForUser({ userId, done: true }));
      return;
    }

    if (__DEV__) {
      console.log('🌱 Found', commitmentsNeedingRanks.length, 'commitments needing order ranks');
    }

    // Sort by creation date to maintain stable ordering
    const sortedCommitments = commitmentsNeedingRanks.sort((a, b) =>
      a.created_at.localeCompare(b.created_at)
    );

    // Assign sequential ranks using rankAfter
    let lastRank = '';
    let seededCount = 0;

    for (const commitment of sortedCommitments) {
      const newRank = rankAfter(lastRank);

      try {
        await updateOrderRank(commitment.id, newRank, { onlyIfBlank: true });
        lastRank = newRank;
        seededCount++;
      } catch (error) {
        console.error('❌ Error seeding rank for commitment', commitment.id, ':', error);
        // Continue with other commitments
      }
    }

    // Set flag to prevent future runs
    store.dispatch(setLexorankSeedDoneForUser({ userId, done: true }));

    if (__DEV__) {
      console.log(`🧭 lexorank seed: ${seededCount}`);
    }

  } catch (error) {
    console.error('❌ Error in seedOrderRanksOnce:', error);
  }
}