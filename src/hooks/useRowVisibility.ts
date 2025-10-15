import { useCallback } from 'react';

/**
 * Hook to track row visibility for grid animations
 * Simple implementation that treats all rows as visible by default
 * Can be enhanced with proper viewport tracking if needed
 */
export function useRowVisibility() {
  // For now, assume all rows are visible to ensure shimmer works
  // In a real implementation, this would track viewport intersection
  const isRowVisible = useCallback((): boolean => {
    return true; // Simplified - all rows are considered visible
  }, []);

  const updateVisibleRows = useCallback(() => {
    // Placeholder for future viewport tracking implementation
  }, []);

  return {
    isRowVisible,
    updateVisibleRows,
  };
}