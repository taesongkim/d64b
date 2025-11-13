/**
 * Ordered selectors for friends using lexicographic ranking
 * Mirrors the pattern from commitments ordering for consistency
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';

// Base selector for all friends from social slice
const selectAllFriends = (state: RootState) => state.social.friends;

/**
 * Enhanced friend type with order_rank for personal ordering
 * Extends the base FriendProfile with ordering information
 */
export interface OrderedFriend {
  id: string;
  name: string;
  username: string;
  avatar_animal?: string;
  avatar_color?: string;
  mutualFriends?: number;
  currentStreak?: number;
  completedToday?: number;
  totalHabits?: number;
  order_rank?: string; // Personal ordering rank
  updated_at?: string; // For conflict resolution
}

/**
 * Select friends ordered by personal rank
 * Uses same sort algorithm as commitments for stability:
 * 1. order_rank (lexicographic)
 * 2. name (fallback for friends without ranks)
 * 3. id (final tie-breaker)
 */
export const selectFriendsOrdered = createSelector(
  [selectAllFriends],
  (friends): OrderedFriend[] => {
    if (!friends || !Array.isArray(friends)) {
      return [];
    }

    return friends
      .filter(f => !f.blocked) // Only show non-blocked friends
      .sort((a, b) => {
        // Primary sort: order_rank (with null safety)
        const rankA = (a as any).order_rank || '';
        const rankB = (b as any).order_rank || '';
        const rankCompare = rankA.localeCompare(rankB);
        if (rankCompare !== 0) return rankCompare;

        // Fallback sort by name for stability
        const nameA = a.name || a.username || '';
        const nameB = b.name || b.username || '';
        const nameCompare = nameA.localeCompare(nameB);
        if (nameCompare !== 0) return nameCompare;

        // Final tie-breaker by id
        return a.id.localeCompare(b.id);
      });
  }
);

/**
 * Select a friend by ID with rank context (previous/next positions)
 * Useful for individual reordering operations
 */
export const selectFriendByIdWithRankContext = createSelector(
  [selectFriendsOrdered, (_: RootState, id: string) => id],
  (friends, id) => {
    const friend = friends.find(f => f.id === id);
    if (!friend) return null;

    const index = friends.findIndex(f => f.id === id);
    const prev = index > 0 ? friends[index - 1] : null;
    const next = index < friends.length - 1 ? friends[index + 1] : null;

    return {
      friend,
      index,
      prev,
      next,
      canMoveUp: index > 0,
      canMoveDown: index < friends.length - 1,
    };
  }
);

/**
 * Get count of friends for UI display logic
 * Used to hide reorder button when ≤1 friend
 */
export const selectFriendsCount = createSelector(
  [selectFriendsOrdered],
  (friends) => friends.length
);

/**
 * Check if friends ordering is enabled (≥2 friends)
 * Determines whether to show the reorder button
 */
export const selectFriendsOrderingEnabled = createSelector(
  [selectFriendsCount],
  (count) => count >= 2
);