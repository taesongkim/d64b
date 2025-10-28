/**
 * Ordered selectors for commitments using lexicographic ranking
 * Provides sorted lists for different commitment states
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';

// Base selector for all commitments
const selectAllCommitments = (state: RootState) => state.commitments.commitments;

/**
 * Select active commitments ordered by rank
 * Active = not archived, not deleted, isActive = true
 */
export const selectActiveOrdered = createSelector(
  [selectAllCommitments],
  (commitments) =>
    commitments
      .filter(c => c.isActive && !c.archived && !c.deletedAt)
      .sort((a, b) => {
        // Primary sort: order_rank (with null safety)
        const rankA = a.order_rank || '';
        const rankB = b.order_rank || '';
        const rankCompare = rankA.localeCompare(rankB);
        if (rankCompare !== 0) return rankCompare;

        // Fallback sorts for stability
        const dateCompare = a.updatedAt.localeCompare(b.updatedAt);
        if (dateCompare !== 0) return dateCompare;

        return a.id.localeCompare(b.id);
      })
);

/**
 * Select archived commitments ordered by rank (using last_active_rank if available)
 * Archived = archived = true, not deleted
 */
export const selectArchivedOrdered = createSelector(
  [selectAllCommitments],
  (commitments) =>
    commitments
      .filter(c => c.archived === true && !c.deletedAt)
      .sort((a, b) => {
        // Use last_active_rank if available, otherwise fall back to current order_rank (with null safety)
        const rankA = a.last_active_rank || a.order_rank || '';
        const rankB = b.last_active_rank || b.order_rank || '';

        const rankCompare = rankA.localeCompare(rankB);
        if (rankCompare !== 0) return rankCompare;

        const dateCompare = a.updatedAt.localeCompare(b.updatedAt);
        if (dateCompare !== 0) return dateCompare;

        return a.id.localeCompare(b.id);
      })
);

/**
 * Select recently deleted commitments ordered by rank
 * Recently deleted = deletedAt within last 7 days
 */
export const selectRecentlyDeletedOrdered = createSelector(
  [selectAllCommitments],
  (commitments) => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
    return commitments
      .filter(c => c.deletedAt && new Date(c.deletedAt).getTime() >= cutoff)
      .sort((a, b) => {
        // Use last_active_rank if available, otherwise fall back to current order_rank (with null safety)
        const rankA = a.last_active_rank || a.order_rank || '';
        const rankB = b.last_active_rank || b.order_rank || '';

        const rankCompare = rankA.localeCompare(rankB);
        if (rankCompare !== 0) return rankCompare;

        const dateCompare = a.updatedAt.localeCompare(b.updatedAt);
        if (dateCompare !== 0) return dateCompare;

        return a.id.localeCompare(b.id);
      });
  }
);

/**
 * Helper to get commitment by ID with rank context
 */
export const selectCommitmentByIdWithRankContext = createSelector(
  [selectActiveOrdered, (_: RootState, id: string) => id],
  (commitments, id) => {
    const commitment = commitments.find(c => c.id === id);
    if (!commitment) return null;

    const index = commitments.findIndex(c => c.id === id);
    const prev = index > 0 ? commitments[index - 1] : null;
    const next = index < commitments.length - 1 ? commitments[index + 1] : null;

    return {
      commitment,
      index,
      prev,
      next,
      canMoveUp: index > 0,
      canMoveDown: index < commitments.length - 1,
    };
  }
);