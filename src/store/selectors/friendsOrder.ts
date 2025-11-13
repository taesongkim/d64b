/**
 * Ordered selectors for friends using lexicographic ranking
 * Mirrors the pattern from commitments ordering for consistency
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';

// Base selector for friends roster from social slice
const selectFriendsRoster = (state: RootState) => state.social.roster;

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
  [selectFriendsRoster],
  (roster): OrderedFriend[] => {
    if (!roster || !Array.isArray(roster)) {
      console.log('🔍 [Selector] No roster or invalid roster:', roster);
      return [];
    }

    console.log('🔍 [Selector] Input roster before sorting:', roster.map(r => ({ id: r.id, name: r.displayName, order_rank: r.order_rank })));

    const sorted = [...roster]
      .sort((a, b) => {
        // Primary sort: order_rank (with null safety)
        const rankA = a.order_rank || '';
        const rankB = b.order_rank || '';
        const rankCompare = rankA.localeCompare(rankB);
        if (rankCompare !== 0) return rankCompare;

        // Fallback sort by displayName for stability
        const nameA = a.displayName || a.username || '';
        const nameB = b.displayName || b.username || '';
        const nameCompare = nameA.localeCompare(nameB);
        if (nameCompare !== 0) return nameCompare;

        // Final tie-breaker by id
        return a.id.localeCompare(b.id);
      })
      .map(rosterEntry => ({
        id: rosterEntry.id,
        name: rosterEntry.displayName,
        username: rosterEntry.username,
        avatar_animal: rosterEntry.avatar_animal,
        avatar_color: rosterEntry.avatar_color,
        order_rank: rosterEntry.order_rank,
        updated_at: rosterEntry.updated_at,
      }));

    console.log('🔍 [Selector] Final ordered friends:', sorted.map(f => ({ id: f.id, name: f.name, order_rank: f.order_rank })));
    return sorted;
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