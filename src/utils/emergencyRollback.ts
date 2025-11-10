/**
 * Emergency rollback system for layout items
 * Provides a kill switch to disable layout items rendering without data loss
 */

// Global rollback state
let isLayoutItemsDisabled = false;

/**
 * Emergency rollback: Disable layout items rendering globally
 * This preserves all data but prevents layout items from being displayed or processed
 */
export function disableLayoutItems(): void {
  isLayoutItemsDisabled = true;
  if (__DEV__) {
    console.warn('🚨 [EMERGENCY] Layout items disabled globally - rendering commitments only');
  }
}

/**
 * Re-enable layout items rendering after rollback
 */
export function enableLayoutItems(): void {
  isLayoutItemsDisabled = false;
  if (__DEV__) {
    console.log('✅ [RECOVERY] Layout items re-enabled globally');
  }
}

/**
 * Check if layout items are currently disabled
 */
export function isLayoutItemsDisabledGlobally(): boolean {
  return isLayoutItemsDisabled;
}

/**
 * Filter out layout items if emergency rollback is active
 * This function should be called in components before rendering
 *
 * @param items - Combined array of commitments and layout items
 * @returns Filtered array with only commitments if rollback is active
 */
export function filterItemsForEmergencyRollback<T extends { type: string }>(items: T[]): T[] {
  if (!isLayoutItemsDisabled) {
    return items; // Normal operation - return all items
  }

  // Emergency rollback active - filter out only known problematic layout item types
  const nonLayoutItems = items.filter(item => item.type !== 'spacer' && item.type !== 'divider');

  if (__DEV__ && items.length !== nonLayoutItems.length) {
    console.log(`🚨 [EMERGENCY] Filtered ${items.length - nonLayoutItems.length} layout items due to rollback`);
  }

  return nonLayoutItems;
}

/**
 * Get emergency rollback status and statistics
 */
export function getEmergencyRollbackStatus(): {
  isDisabled: boolean;
  message: string;
} {
  return {
    isDisabled: isLayoutItemsDisabled,
    message: isLayoutItemsDisabled
      ? 'Layout items are disabled due to emergency rollback'
      : 'Layout items are operating normally'
  };
}

/**
 * Emergency rollback with automatic recovery
 * Disables layout items for a specified duration, then automatically re-enables
 *
 * @param durationMs - Duration in milliseconds to keep layout items disabled
 */
export function temporaryEmergencyRollback(durationMs: number = 60000): void {
  disableLayoutItems();

  setTimeout(() => {
    enableLayoutItems();
    if (__DEV__) {
      console.log(`🔄 [AUTO-RECOVERY] Layout items automatically re-enabled after ${durationMs}ms`);
    }
  }, durationMs);

  if (__DEV__) {
    console.warn(`⏰ [EMERGENCY] Temporary rollback active for ${durationMs}ms`);
  }
}