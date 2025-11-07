/**
 * Validation system for reordering commitments and future layout items
 * Handles rules for spacers, dividers, and commitment positioning
 */

export type LayoutItemType = 'commitment' | 'spacer' | 'divider';

export interface LayoutItem {
  id: string;
  type: LayoutItemType;
  // Additional properties for different types
  title?: string; // For commitments
  height?: number; // For spacers
  style?: string; // For dividers
}

export interface ValidationResult {
  isValid: boolean;
  violations: ValidationViolation[];
  repairedOrder?: LayoutItem[];
}

export interface ValidationViolation {
  type: 'top_layout_item' | 'bottom_layout_item' | 'adjacent_layout_items' | 'count_limit_exceeded';
  message: string;
  itemId?: string;
  position?: number;
}

/**
 * Validates the order of layout items according to business rules
 *
 * Rules:
 * 1. No spacers or dividers at top/bottom positions
 * 2. No adjacent spacers or dividers (spacer|divider next to spacer|divider)
 * 3. Count bound: (#spacers + #dividers) ≤ n-1 (n = active commitments)
 * 4. Phase 4: Both spacers and dividers are now supported
 */
export function validateReorderLayout(items: LayoutItem[]): ValidationResult {
  const violations: ValidationViolation[] = [];

  // Phase 4: Both spacers and dividers are now supported
  // Apply layout validation rules for all layout items
  const layoutValidationResult = validateFutureLayoutRules(items);

  return {
    isValid: violations.length === 0 && layoutValidationResult.isValid,
    violations: [...violations, ...layoutValidationResult.violations],
  };
}

/**
 * Layout validation rules for spacers and dividers
 * Active for Phase 3 (spacers), Phase 4 will add dividers
 */
function validateFutureLayoutRules(items: LayoutItem[]): ValidationResult {
  const violations: ValidationViolation[] = [];

  if (items.length === 0) {
    return { isValid: true, violations: [] };
  }

  const commitments = items.filter(item => item.type === 'commitment');
  const layoutItems = items.filter(item => item.type === 'spacer' || item.type === 'divider');

  // Rule 1: No layout items at top/bottom positions
  if (items.length > 0) {
    const firstItem = items[0];
    const lastItem = items[items.length - 1];

    if (firstItem.type === 'spacer' || firstItem.type === 'divider') {
      violations.push({
        type: 'top_layout_item',
        message: 'Layout items (spacers/dividers) cannot be at the top position',
        itemId: firstItem.id,
        position: 0,
      });
    }

    if (lastItem.type === 'spacer' || lastItem.type === 'divider') {
      violations.push({
        type: 'bottom_layout_item',
        message: 'Layout items (spacers/dividers) cannot be at the bottom position',
        itemId: lastItem.id,
        position: items.length - 1,
      });
    }
  }

  // Rule 2: No adjacent layout items
  for (let i = 0; i < items.length - 1; i++) {
    const current = items[i];
    const next = items[i + 1];

    if ((current.type === 'spacer' || current.type === 'divider') &&
        (next.type === 'spacer' || next.type === 'divider')) {
      violations.push({
        type: 'adjacent_layout_items',
        message: 'Layout items cannot be adjacent to each other',
        itemId: current.id,
        position: i,
      });
    }
  }

  // Rule 3: Count bound validation
  if (layoutItems.length > Math.max(0, commitments.length - 1)) {
    violations.push({
      type: 'count_limit_exceeded',
      message: `Too many layout items. Maximum allowed: ${Math.max(0, commitments.length - 1)}`,
    });
  }

  return { isValid: violations.length === 0, violations };
}

/**
 * Auto-repair function that fixes validation violations deterministically
 * For adjacency conflicts, removes the most recently inserted (later in temp ID sequence)
 */
export function autoRepairLayout(items: LayoutItem[]): LayoutItem[] {
  if (items.length === 0) return items;

  let repairedItems = [...items];

  // Step 1: Remove layout items from top/bottom positions
  while (repairedItems.length > 0 && repairedItems[0].type !== 'commitment') {
    repairedItems.shift();
  }
  while (repairedItems.length > 0 && repairedItems[repairedItems.length - 1].type !== 'commitment') {
    repairedItems.pop();
  }

  // Step 2: Remove adjacent layout items (Phase 4: drop latest inserted for spacer-divider adjacency)
  const deduplicatedItems: LayoutItem[] = [];

  for (let i = 0; i < repairedItems.length; i++) {
    const currentItem = repairedItems[i];
    const nextItem = i < repairedItems.length - 1 ? repairedItems[i + 1] : null;

    // Add current item
    deduplicatedItems.push(currentItem);

    // Check if next item creates adjacency conflict
    if (nextItem &&
        (currentItem.type === 'spacer' || currentItem.type === 'divider') &&
        (nextItem.type === 'spacer' || nextItem.type === 'divider')) {

      // Skip the next item (remove latest inserted from the adjacent pair)
      // Determine which is "latest inserted" by temp ID timestamp for new items
      const currentIsTemp = currentItem.id.startsWith('temp-');
      const nextIsTemp = nextItem.id.startsWith('temp-');

      if (currentIsTemp && nextIsTemp) {
        // Both are new - compare timestamps in temp IDs
        const currentTime = parseInt(currentItem.id.split('-').pop() || '0');
        const nextTime = parseInt(nextItem.id.split('-').pop() || '0');

        if (nextTime > currentTime) {
          // Next item is newer, skip it (already handled by loop increment)
          i++; // Skip the next iteration
        } else {
          // Current item is newer, remove it from deduplicatedItems
          deduplicatedItems.pop();
        }
      } else if (nextIsTemp && !currentIsTemp) {
        // Next item is new insertion, skip it
        i++; // Skip the next iteration
      } else {
        // Current item is new insertion or both are old - remove current
        deduplicatedItems.pop();
      }

      if (__DEV__) {
        console.log(`🔧 [REPAIR] Resolved adjacency conflict between ${currentItem.type}:${currentItem.id} and ${nextItem.type}:${nextItem.id}`);
      }
    }
  }

  // Step 3: Enforce count limit (remove excess layout items from the end)
  const finalCommitments = deduplicatedItems.filter(item => item.type === 'commitment');
  const finalLayoutItems = deduplicatedItems.filter(item => item.type !== 'commitment');
  const maxLayoutItems = Math.max(0, finalCommitments.length - 1);

  if (finalLayoutItems.length > maxLayoutItems) {
    // Remove excess layout items from the end
    const excessCount = finalLayoutItems.length - maxLayoutItems;
    const layoutItemsToRemove = finalLayoutItems.slice(-excessCount);

    return deduplicatedItems.filter(item =>
      item.type === 'commitment' || !layoutItemsToRemove.includes(item)
    );
  }

  return deduplicatedItems;
}

/**
 * Preview function to check if a drop would be valid
 * Used during drag operations to show/hide drop zones
 */
export function isDropPositionValid(
  items: LayoutItem[],
  draggedItem: LayoutItem,
  targetIndex: number
): boolean {
  // Create a preview of the reordered items
  const itemsWithoutDragged = items.filter(item => item.id !== draggedItem.id);
  const previewItems = [
    ...itemsWithoutDragged.slice(0, targetIndex),
    draggedItem,
    ...itemsWithoutDragged.slice(targetIndex),
  ];


  const validation = validateReorderLayout(previewItems);


  return validation.isValid;
}

/**
 * Finds the first valid position to insert a new layout item
 *
 * @param items - Current list of layout items
 * @param newItemType - Type of item to insert ('spacer' or 'divider')
 * @returns Index where item can be inserted, or null if no valid position exists
 */
export function findFirstValidInsertPosition(
  items: LayoutItem[],
  newItemType: 'spacer' | 'divider'
): number | null {
  if (items.length === 0) {
    // Can't insert layout items in empty list (would violate top position rule)
    return null;
  }

  if (items.length === 1) {
    // Can't insert layout items with only 1 commitment (would violate count rule)
    return null;
  }

  // Create a dummy layout item for testing insertion
  const dummyItem: LayoutItem = {
    id: 'temp-placement-test',
    type: newItemType,
    height: newItemType === 'spacer' ? 16 : undefined,
    style: newItemType === 'divider' ? 'solid' : undefined,
  };

  // Test positions from 1 to length-1 (can't place at top or bottom)
  for (let i = 1; i < items.length; i++) {
    // Create preview array with item inserted at position i
    const previewItems = [
      ...items.slice(0, i),
      dummyItem,
      ...items.slice(i)
    ];

    // Test if this position is valid
    const validation = validateReorderLayout(previewItems);

    if (validation.isValid) {
      if (__DEV__) {
        console.log(`📍 [PLACEMENT] Found valid position ${i} for ${newItemType}`);
      }
      return i;
    }
  }

  if (__DEV__) {
    console.log(`❌ [PLACEMENT] No valid position found for ${newItemType}`);
  }
  return null;
}

/**
 * DEV-only logging for validation results
 */
export function logValidationResult(result: ValidationResult, context: string = ''): void {
  if (__DEV__) {
    if (result.isValid) {
      console.log(`✅ ${context} Validation passed`);
    } else {
      console.warn(`❌ ${context} Validation failed:`, result.violations);
      if (result.repairedOrder) {
        console.log(`🔧 ${context} Auto-repair suggested:`, result.repairedOrder.length, 'items');
      }
    }
  }
}