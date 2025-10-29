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
 * 4. Currently only commitments are allowed (spacers/dividers inactive)
 */
export function validateReorderLayout(items: LayoutItem[]): ValidationResult {
  const violations: ValidationViolation[] = [];

  // For current phase: only commitments are allowed
  const nonCommitmentItems = items.filter(item => item.type !== 'commitment');
  if (nonCommitmentItems.length > 0) {
    violations.push({
      type: 'count_limit_exceeded',
      message: 'Only commitments are currently supported',
    });

    // Auto-repair: filter out non-commitment items
    const repairedOrder = items.filter(item => item.type === 'commitment');
    return {
      isValid: false,
      violations,
      repairedOrder,
    };
  }

  // Future validation rules (inactive until spacers/dividers are introduced)
  const futureValidationResult = validateFutureLayoutRules(items);

  return {
    isValid: violations.length === 0 && futureValidationResult.isValid,
    violations: [...violations, ...futureValidationResult.violations],
  };
}

/**
 * Future validation rules for spacers and dividers
 * Currently inactive but ready for implementation
 */
function validateFutureLayoutRules(items: LayoutItem[]): ValidationResult {
  const violations: ValidationViolation[] = [];

  if (items.length === 0) {
    return { isValid: true, violations: [] };
  }

  const commitments = items.filter(item => item.type === 'commitment');
  const layoutItems = items.filter(item => item.type !== 'commitment');

  // Rule 1: No layout items at top/bottom positions
  if (items.length > 0) {
    const firstItem = items[0];
    const lastItem = items[items.length - 1];

    if (firstItem.type !== 'commitment') {
      violations.push({
        type: 'top_layout_item',
        message: 'Layout items (spacers/dividers) cannot be at the top position',
        itemId: firstItem.id,
        position: 0,
      });
    }

    if (lastItem.type !== 'commitment') {
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

    if (current.type !== 'commitment' && next.type !== 'commitment') {
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

  // Step 2: Remove adjacent layout items (keep the first one in each group)
  const deduplicatedItems: LayoutItem[] = [];
  let lastWasLayoutItem = false;

  for (const item of repairedItems) {
    if (item.type === 'commitment') {
      deduplicatedItems.push(item);
      lastWasLayoutItem = false;
    } else {
      // Layout item
      if (!lastWasLayoutItem) {
        deduplicatedItems.push(item);
      }
      // Skip if last was also a layout item (adjacent rule)
      lastWasLayoutItem = true;
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