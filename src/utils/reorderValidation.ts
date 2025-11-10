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
  // Friend view property
  hidden?: boolean; // For hiding items in friend view
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

// DEV-only telemetry for repair actions
interface RepairTelemetry {
  topViolationsFixed: number;
  bottomViolationsFixed: number;
  adjacencyViolationsFixed: number;
  countLimitViolationsFixed: number;
  totalItemsHidden: number;
  totalItemsDeleted: number;
  totalOperations: number;
}

let globalRepairTelemetry: RepairTelemetry = {
  topViolationsFixed: 0,
  bottomViolationsFixed: 0,
  adjacencyViolationsFixed: 0,
  countLimitViolationsFixed: 0,
  totalItemsHidden: 0,
  totalItemsDeleted: 0,
  totalOperations: 0,
};

/**
 * Auto-repair function that fixes validation violations deterministically
 * Enhanced with spacer priority for mixed-type adjacency and cascading removal
 *
 * @param items - Array of layout items to repair
 * @param mode - 'delete' removes violating items, 'hide' marks them as hidden
 */
export function autoRepairLayout(items: LayoutItem[], mode: 'delete' | 'hide' = 'delete'): LayoutItem[] {
  if (items.length === 0) return items;

  // Increment operation counter for telemetry
  if (__DEV__) {
    globalRepairTelemetry.totalOperations++;
  }

  if (mode === 'delete') {
    // Original delete mode logic
    return autoRepairLayoutDelete(items);
  } else {
    // Hide mode: use delete logic to determine valid structure, then mark items as hidden
    return autoRepairLayoutHide(items);
  }
}

/**
 * Delete mode: removes violating items entirely
 */
function autoRepairLayoutDelete(items: LayoutItem[]): LayoutItem[] {
  let repairedItems = [...items];
  let topViolations = 0;
  let bottomViolations = 0;

  // Step 1: Remove layout items from top/bottom positions (with cascading)
  while (repairedItems.length > 0 && repairedItems[0].type !== 'commitment') {
    if (__DEV__) {
      console.log(`🔧 [REPAIR] Removing ${repairedItems[0].type} from top position`);
      topViolations++;
      globalRepairTelemetry.totalItemsDeleted++;
    }
    repairedItems.shift();
  }
  while (repairedItems.length > 0 && repairedItems[repairedItems.length - 1].type !== 'commitment') {
    if (__DEV__) {
      console.log(`🔧 [REPAIR] Removing ${repairedItems[repairedItems.length - 1].type} from bottom position`);
      bottomViolations++;
      globalRepairTelemetry.totalItemsDeleted++;
    }
    repairedItems.pop();
  }

  if (__DEV__) {
    globalRepairTelemetry.topViolationsFixed += topViolations;
    globalRepairTelemetry.bottomViolationsFixed += bottomViolations;
  }

  // Step 2: Remove adjacent layout items with enhanced spacer priority
  const deduplicatedItems: LayoutItem[] = [];
  let adjacencyViolations = 0;

  for (let i = 0; i < repairedItems.length; i++) {
    const currentItem = repairedItems[i];
    const nextItem = i < repairedItems.length - 1 ? repairedItems[i + 1] : null;

    // Add current item
    deduplicatedItems.push(currentItem);

    // Check if next item creates adjacency conflict
    if (nextItem &&
        (currentItem.type === 'spacer' || currentItem.type === 'divider') &&
        (nextItem.type === 'spacer' || nextItem.type === 'divider')) {

      // Enhanced adjacency resolution with spacer priority
      let itemToRemove: 'current' | 'next' = 'next';
      adjacencyViolations++;

      if ((currentItem.type === 'spacer' && nextItem.type === 'divider') ||
          (currentItem.type === 'divider' && nextItem.type === 'spacer')) {
        // Mixed-type adjacency: Always remove spacer
        itemToRemove = currentItem.type === 'spacer' ? 'current' : 'next';

        if (__DEV__) {
          console.log(`🔧 [REPAIR] Mixed-type adjacency: removing spacer (${itemToRemove === 'current' ? currentItem.id : nextItem.id})`);
        }
      } else {
        // Same-type adjacency: Remove most recently inserted
        const currentIsTemp = currentItem.id.startsWith('temp-');
        const nextIsTemp = nextItem.id.startsWith('temp-');

        if (currentIsTemp && nextIsTemp) {
          // Both are new - compare timestamps
          const currentTime = parseInt(currentItem.id.split('-').pop() || '0');
          const nextTime = parseInt(nextItem.id.split('-').pop() || '0');
          itemToRemove = nextTime > currentTime ? 'next' : 'current';
        } else if (nextIsTemp && !currentIsTemp) {
          itemToRemove = 'next';
        } else {
          itemToRemove = 'current';
        }

        if (__DEV__) {
          console.log(`🔧 [REPAIR] Same-type adjacency: removing most recent (${itemToRemove === 'current' ? currentItem.id : nextItem.id})`);
        }
      }

      // Apply the removal decision
      if (itemToRemove === 'current') {
        deduplicatedItems.pop();
      } else {
        i++; // Skip the next iteration to remove next item
      }

      if (__DEV__) {
        globalRepairTelemetry.totalItemsDeleted++;
      }
    }
  }

  if (__DEV__) {
    globalRepairTelemetry.adjacencyViolationsFixed += adjacencyViolations;
  }

  // Step 3: Enforce count limit (remove excess layout items from the end)
  const finalCommitments = deduplicatedItems.filter(item => item.type === 'commitment');
  const finalLayoutItems = deduplicatedItems.filter(item => item.type !== 'commitment');
  const maxLayoutItems = Math.max(0, finalCommitments.length - 1);

  if (finalLayoutItems.length > maxLayoutItems) {
    // Remove excess layout items from the end
    const excessCount = finalLayoutItems.length - maxLayoutItems;
    const layoutItemsToRemove = finalLayoutItems.slice(-excessCount);

    if (__DEV__) {
      globalRepairTelemetry.countLimitViolationsFixed++;
      globalRepairTelemetry.totalItemsDeleted += excessCount;
    }

    return deduplicatedItems.filter(item =>
      item.type === 'commitment' || !layoutItemsToRemove.includes(item)
    );
  }

  return deduplicatedItems;
}

/**
 * Hide mode: uses delete logic to determine valid structure, then marks removed items as hidden
 */
function autoRepairLayoutHide(items: LayoutItem[]): LayoutItem[] {
  // Create a deep copy to avoid modifying original items
  const originalItems = items.map(item => ({ ...item, hidden: false }));

  // Use delete mode to determine what the valid structure looks like
  const validItems = autoRepairLayoutDelete([...items]);

  // Create a set of IDs that should remain visible
  const validIds = new Set(validItems.map(item => item.id));

  // Mark items as hidden if they're not in the valid set
  let itemsHidden = 0;
  originalItems.forEach(item => {
    if (!validIds.has(item.id)) {
      item.hidden = true;
      itemsHidden++;
      if (__DEV__) {
        console.log(`🔧 [REPAIR-HIDE] Hiding ${item.type} ${item.id} due to validation rules`);
      }
    }
  });

  if (__DEV__) {
    globalRepairTelemetry.totalItemsHidden += itemsHidden;
  }

  if (__DEV__) {
    const hiddenCount = originalItems.filter(item => item.hidden).length;
    console.log(`🔧 [REPAIR-HIDE] Hidden ${hiddenCount} items, visible ${originalItems.length - hiddenCount} items`);
  }

  return originalItems;
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
 * Apply friend view hiding logic - filter private commitments and hide violating layout items
 * This is the main function for generating friend views of commitment grids
 *
 * @param commitments - All user's commitments
 * @param layoutItems - All user's layout items
 * @param viewerUserId - ID of user viewing (friend)
 * @returns Combined list with private commitments filtered and layout items marked as hidden
 */
export function applyFriendViewHiding(
  commitments: LayoutItem[],
  layoutItems: LayoutItem[],
  viewerUserId: string
): LayoutItem[] {
  // Step 1: Filter out private commitments (this is already done in the friends service)
  const visibleCommitments = commitments.filter(c => !(c as any).isPrivate);

  if (__DEV__) {
    console.log(`🙈 [FRIEND-VIEW] Filtered ${commitments.length - visibleCommitments.length} private commitments`);
  }

  // Step 2: Combine visible commitments with layout items
  const allItems = [...visibleCommitments, ...layoutItems]
    .filter(item => 'order_rank' in item && (item as any).order_rank)
    .sort((a, b) => (a as any).order_rank.localeCompare((b as any).order_rank));

  // Step 3: Apply auto-repair with hide mode to mark violating layout items
  const repairedItems = autoRepairLayout(allItems, 'hide');

  if (__DEV__) {
    const hiddenCount = repairedItems.filter(item => item.hidden).length;
    console.log(`🙈 [FRIEND-VIEW] Marked ${hiddenCount} layout items as hidden due to privacy filtering`);
  }

  return repairedItems;
}

/**
 * Auto-delete layout items that become invalid after commitment deletion/archiving
 * Returns the IDs of layout items that should be permanently deleted
 */
export function getLayoutItemsToDelete(
  allItems: LayoutItem[],
  remainingCommitments: LayoutItem[]
): string[] {
  // Create a combined list for validation (commitments + layout items)
  const allCommitments = remainingCommitments.filter(item => item.type === 'commitment');
  const allLayoutItems = allItems.filter(item => item.type !== 'commitment');

  // Build combined list in original order
  const combinedItems = [...allCommitments, ...allLayoutItems]
    .filter(item => 'order_rank' in item && item.order_rank)
    .sort((a, b) => (a as any).order_rank.localeCompare((b as any).order_rank));

  if (__DEV__) {
    console.log(`🗑️ [AUTO-DELETE] Checking ${allLayoutItems.length} layout items against ${allCommitments.length} remaining commitments`);
  }

  // Apply auto-repair to get valid layout
  const validItems = autoRepairLayout(combinedItems);

  // Find layout items that were removed during repair
  const validLayoutItemIds = validItems
    .filter(item => item.type !== 'commitment')
    .map(item => item.id);

  const layoutItemsToDelete = allLayoutItems
    .filter(item => !validLayoutItemIds.includes(item.id))
    .map(item => item.id);

  if (__DEV__) {
    console.log(`🗑️ [AUTO-DELETE] Will delete ${layoutItemsToDelete.length} layout items:`, layoutItemsToDelete);
  }

  return layoutItemsToDelete;
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

/**
 * DEV-only: Get current repair telemetry data
 */
export function getRepairTelemetry(): RepairTelemetry {
  if (__DEV__) {
    return { ...globalRepairTelemetry };
  }
  return {
    topViolationsFixed: 0,
    bottomViolationsFixed: 0,
    adjacencyViolationsFixed: 0,
    countLimitViolationsFixed: 0,
    totalItemsHidden: 0,
    totalItemsDeleted: 0,
    totalOperations: 0,
  };
}

/**
 * DEV-only: Reset repair telemetry data
 */
export function resetRepairTelemetry(): void {
  if (__DEV__) {
    globalRepairTelemetry = {
      topViolationsFixed: 0,
      bottomViolationsFixed: 0,
      adjacencyViolationsFixed: 0,
      countLimitViolationsFixed: 0,
      totalItemsHidden: 0,
      totalItemsDeleted: 0,
      totalOperations: 0,
    };
    console.log('📊 [TELEMETRY] Repair telemetry data reset');
  }
}

/**
 * DEV-only: Log current repair telemetry stats
 */
export function logRepairTelemetry(): void {
  if (__DEV__) {
    console.log('📊 [TELEMETRY] Layout Item Repair Statistics:', {
      totalOperations: globalRepairTelemetry.totalOperations,
      violationsFixed: {
        top: globalRepairTelemetry.topViolationsFixed,
        bottom: globalRepairTelemetry.bottomViolationsFixed,
        adjacency: globalRepairTelemetry.adjacencyViolationsFixed,
        countLimit: globalRepairTelemetry.countLimitViolationsFixed,
      },
      itemsAffected: {
        deleted: globalRepairTelemetry.totalItemsDeleted,
        hidden: globalRepairTelemetry.totalItemsHidden,
        total: globalRepairTelemetry.totalItemsDeleted + globalRepairTelemetry.totalItemsHidden,
      },
    });
  }
}