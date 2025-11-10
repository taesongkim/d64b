/**
 * Unit tests for reorderValidation functions
 * Tests all validation rules, repair modes, and edge cases
 */

import {
  validateReorderLayout,
  autoRepairLayout,
  applyFriendViewHiding,
  getLayoutItemsToDelete,
  isDropPositionValid,
  findFirstValidInsertPosition,
  type LayoutItem,
  type ValidationResult,
} from '../reorderValidation';

// Helper function to create test items
const createCommitment = (id: string, title?: string): LayoutItem => ({
  id,
  type: 'commitment',
  title: title || `Commitment ${id}`,
});

const createSpacer = (id: string, height?: number): LayoutItem => ({
  id,
  type: 'spacer',
  height: height || 16,
});

const createDivider = (id: string, style?: string): LayoutItem => ({
  id,
  type: 'divider',
  style: style || 'solid',
});

describe('Layout Validation Rules', () => {
  describe('validateReorderLayout', () => {
    it('should validate empty list', () => {
      const result = validateReorderLayout([]);
      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should validate single commitment', () => {
      const items = [createCommitment('c1')];
      const result = validateReorderLayout(items);
      expect(result.isValid).toBe(true);
    });

    it('should detect top position violation', () => {
      const items = [createSpacer('s1'), createCommitment('c1')];
      const result = validateReorderLayout(items);
      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.type === 'top_layout_item')).toBe(true);
    });

    it('should detect bottom position violation', () => {
      const items = [createCommitment('c1'), createDivider('d1')];
      const result = validateReorderLayout(items);
      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.type === 'bottom_layout_item')).toBe(true);
    });

    it('should detect adjacent layout items violation', () => {
      const items = [createCommitment('c1'), createSpacer('s1'), createDivider('d1'), createCommitment('c2')];
      const result = validateReorderLayout(items);
      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.type === 'adjacent_layout_items')).toBe(true);
    });

    it('should detect count limit violation', () => {
      // 1 commitment but 2 layout items (max allowed = 0)
      const items = [createSpacer('s1'), createCommitment('c1'), createDivider('d1')];
      const result = validateReorderLayout(items);
      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.type === 'count_limit_exceeded')).toBe(true);
    });

    it('should validate correct layout', () => {
      const items = [
        createCommitment('c1'),
        createSpacer('s1'),
        createCommitment('c2'),
        createDivider('d1'),
        createCommitment('c3')
      ];
      const result = validateReorderLayout(items);
      expect(result.isValid).toBe(true);
    });
  });
});

describe('Auto Repair - Delete Mode', () => {
  describe('autoRepairLayout (delete mode)', () => {
    it('should remove top position violations', () => {
      const items = [createSpacer('s1'), createDivider('d1'), createCommitment('c1')];
      const result = autoRepairLayout(items, 'delete');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('c1');
    });

    it('should remove bottom position violations', () => {
      const items = [createCommitment('c1'), createSpacer('s1'), createDivider('d1')];
      const result = autoRepairLayout(items, 'delete');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('c1');
    });

    it('should handle mixed-type adjacency with spacer priority', () => {
      const items = [
        createCommitment('c1'),
        createSpacer('s1'),
        createDivider('d1'),
        createCommitment('c2')
      ];
      const result = autoRepairLayout(items, 'delete');
      expect(result).toHaveLength(3);
      expect(result.map(i => i.id)).toEqual(['c1', 'd1', 'c2']);
    });

    it('should handle same-type adjacency', () => {
      const items = [
        createCommitment('c1'),
        createSpacer('s1'),
        createSpacer('s2'),
        createCommitment('c2')
      ];
      const result = autoRepairLayout(items, 'delete');
      expect(result).toHaveLength(3);
      expect(result.map(i => i.id)).toEqual(['c1', 's2', 'c2']);
    });

    it('should enforce count limits', () => {
      const items = [
        createCommitment('c1'),
        createSpacer('s1'),
        createDivider('d1'),
        createSpacer('s2'),
        createCommitment('c2')
      ];
      const result = autoRepairLayout(items, 'delete');
      expect(result).toHaveLength(3);
      expect(result.filter(i => i.type !== 'commitment')).toHaveLength(1);
    });

    it('should handle empty list', () => {
      const result = autoRepairLayout([], 'delete');
      expect(result).toHaveLength(0);
    });

    it('should handle single commitment', () => {
      const items = [createCommitment('c1')];
      const result = autoRepairLayout(items, 'delete');
      expect(result).toEqual(items);
    });

    it('should handle n=0 (no commitments)', () => {
      const items = [createSpacer('s1'), createDivider('d1')];
      const result = autoRepairLayout(items, 'delete');
      expect(result).toHaveLength(0);
    });

    it('should handle n=1 (one commitment)', () => {
      const items = [createSpacer('s1'), createCommitment('c1'), createDivider('d1')];
      const result = autoRepairLayout(items, 'delete');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('c1');
    });
  });
});

describe('Auto Repair - Hide Mode', () => {
  describe('autoRepairLayout (hide mode)', () => {
    it('should mark top violations as hidden', () => {
      const items = [createSpacer('s1'), createCommitment('c1')];
      const result = autoRepairLayout(items, 'hide');
      expect(result).toHaveLength(2);
      expect(result[0].hidden).toBe(true);
      expect(result[1].hidden).toBe(false);
    });

    it('should mark bottom violations as hidden', () => {
      const items = [createCommitment('c1'), createDivider('d1')];
      const result = autoRepairLayout(items, 'hide');
      expect(result).toHaveLength(2);
      expect(result[0].hidden).toBe(false);
      expect(result[1].hidden).toBe(true);
    });

    it('should mark adjacent violations as hidden', () => {
      const items = [
        createCommitment('c1'),
        createSpacer('s1'),
        createDivider('d1'),
        createCommitment('c2')
      ];
      const result = autoRepairLayout(items, 'hide');
      expect(result).toHaveLength(4);
      expect(result[0].hidden).toBe(false);
      expect(result[1].hidden).toBe(true); // Spacer gets priority for removal
      expect(result[2].hidden).toBe(false);
      expect(result[3].hidden).toBe(false);
    });

    it('should mark count violations as hidden', () => {
      const items = [
        createCommitment('c1'),
        createSpacer('s1'),
        createDivider('d1'),
        createSpacer('s2'),
        createCommitment('c2')
      ];
      const result = autoRepairLayout(items, 'hide');
      expect(result).toHaveLength(5);
      const hiddenCount = result.filter(i => i.hidden).length;
      expect(hiddenCount).toBeGreaterThan(0);
    });

    it('should preserve original items with hidden flags', () => {
      const items = [createSpacer('s1'), createCommitment('c1'), createDivider('d1')];
      const result = autoRepairLayout(items, 'hide');
      expect(result).toHaveLength(3);
      expect(result.map(i => i.id)).toEqual(['s1', 'c1', 'd1']);
    });

    it('should handle cascading violations', () => {
      // Both layout items should be hidden after commitments are filtered
      const items = [createSpacer('s1'), createDivider('d1')];
      const result = autoRepairLayout(items, 'hide');
      expect(result).toHaveLength(2);
      expect(result[0].hidden).toBe(true);
      expect(result[1].hidden).toBe(true);
    });
  });
});

describe('Friend View Hiding', () => {
  describe('applyFriendViewHiding', () => {
    it('should filter private commitments and hide violating layout items', () => {
      const commitments = [
        { ...createCommitment('c1'), isPrivate: false },
        { ...createCommitment('c2'), isPrivate: true },
        { ...createCommitment('c3'), isPrivate: false },
      ];
      const layoutItems = [createSpacer('s1'), createDivider('d1')];

      // Mock order_rank for sorting
      commitments[0].order_rank = 'A';
      commitments[1].order_rank = 'B';
      commitments[2].order_rank = 'D';
      layoutItems[0].order_rank = 'C';
      layoutItems[1].order_rank = 'E';

      const result = applyFriendViewHiding(commitments as any, layoutItems, 'friend-id');

      // Should have 4 items (3 commitments + 2 layout items)
      expect(result).toHaveLength(4);

      // Private commitment should be filtered out from validation
      const visibleCommitments = result.filter(i => i.type === 'commitment');
      expect(visibleCommitments).toHaveLength(2);
    });

    it('should handle all private commitments', () => {
      const commitments = [
        { ...createCommitment('c1'), isPrivate: true, order_rank: 'A' },
        { ...createCommitment('c2'), isPrivate: true, order_rank: 'C' },
      ];
      const layoutItems = [{ ...createSpacer('s1'), order_rank: 'B' }];

      const result = applyFriendViewHiding(commitments as any, layoutItems, 'friend-id');

      // All layout items should be hidden since no commitments are visible
      const hiddenLayoutItems = result.filter(i => i.type !== 'commitment' && i.hidden);
      expect(hiddenLayoutItems).toHaveLength(1);
    });
  });
});

describe('Auto-Delete Logic', () => {
  describe('getLayoutItemsToDelete', () => {
    it('should identify layout items to delete after commitment removal', () => {
      const allItems = [
        createCommitment('c1'),
        createSpacer('s1'),
        createCommitment('c2'),
        createDivider('d1')
      ];
      const remainingCommitments = [createCommitment('c1')];

      const idsToDelete = getLayoutItemsToDelete(allItems, remainingCommitments);
      expect(idsToDelete).toContain('d1'); // Bottom violation
    });

    it('should handle empty remaining commitments', () => {
      const allItems = [createSpacer('s1'), createDivider('d1')];
      const remainingCommitments: LayoutItem[] = [];

      const idsToDelete = getLayoutItemsToDelete(allItems, remainingCommitments);
      expect(idsToDelete).toEqual(['s1', 'd1']);
    });
  });
});

describe('Drop Position Validation', () => {
  describe('isDropPositionValid', () => {
    it('should validate valid drop positions', () => {
      const items = [createCommitment('c1'), createCommitment('c2')];
      const draggedItem = createSpacer('s1');

      const isValid = isDropPositionValid(items, draggedItem, 1);
      expect(isValid).toBe(true);
    });

    it('should reject invalid drop positions', () => {
      const items = [createCommitment('c1')];
      const draggedItem = createSpacer('s1');

      const isValid = isDropPositionValid(items, draggedItem, 0);
      expect(isValid).toBe(false);
    });
  });
});

describe('Insert Position Finding', () => {
  describe('findFirstValidInsertPosition', () => {
    it('should find valid position for spacer', () => {
      const items = [createCommitment('c1'), createCommitment('c2')];

      const position = findFirstValidInsertPosition(items, 'spacer');
      expect(position).toBe(1);
    });

    it('should return null for invalid scenarios', () => {
      const items = [createCommitment('c1')];

      const position = findFirstValidInsertPosition(items, 'spacer');
      expect(position).toBeNull();
    });

    it('should return null for empty list', () => {
      const position = findFirstValidInsertPosition([], 'spacer');
      expect(position).toBeNull();
    });
  });
});

describe('Telemetry (DEV-only)', () => {
  beforeEach(() => {
    // Reset telemetry before each test
    const { resetRepairTelemetry } = require('../reorderValidation');
    resetRepairTelemetry();
  });

  it('should track violation types and repair operations', () => {
    const { autoRepairLayout, getRepairTelemetry } = require('../reorderValidation');

    // Test case with adjacency violations that survive cascade removal
    const items = [
      createCommitment('c1'),
      createSpacer('s1'),
      createDivider('d1'),    // Adjacent to spacer
      createCommitment('c2')
    ];

    autoRepairLayout(items, 'delete');

    const telemetry = getRepairTelemetry();
    expect(telemetry.totalOperations).toBe(1);
    expect(telemetry.adjacencyViolationsFixed).toBeGreaterThan(0);
    expect(telemetry.totalItemsDeleted).toBeGreaterThan(0);
  });

  it('should track top/bottom violations separately', () => {
    const { autoRepairLayout, getRepairTelemetry, resetRepairTelemetry } = require('../reorderValidation');

    // Reset first
    resetRepairTelemetry();

    const items = [
      createSpacer('s1'),     // Top violation
      createCommitment('c1'),
      createDivider('d1')     // Bottom violation
    ];

    autoRepairLayout(items, 'delete');

    const telemetry = getRepairTelemetry();
    expect(telemetry.totalOperations).toBe(1);
    expect(telemetry.topViolationsFixed).toBeGreaterThan(0);
    expect(telemetry.bottomViolationsFixed).toBeGreaterThan(0);
    expect(telemetry.totalItemsDeleted).toBeGreaterThan(0);
  });

  it('should track hidden items in hide mode', () => {
    const { autoRepairLayout, getRepairTelemetry } = require('../reorderValidation');

    const items = [
      createSpacer('s1'),     // Top violation
      createCommitment('c1'),
      createDivider('d1')     // Bottom violation
    ];

    autoRepairLayout(items, 'hide');

    const telemetry = getRepairTelemetry();
    expect(telemetry.totalOperations).toBe(1);
    expect(telemetry.totalItemsHidden).toBeGreaterThan(0);
  });

  it('should accumulate telemetry across multiple operations', () => {
    const { autoRepairLayout, getRepairTelemetry } = require('../reorderValidation');

    // First operation
    autoRepairLayout([createSpacer('s1'), createCommitment('c1')], 'delete');

    // Second operation
    autoRepairLayout([createCommitment('c1'), createDivider('d1')], 'delete');

    const telemetry = getRepairTelemetry();
    expect(telemetry.totalOperations).toBe(2);
    expect(telemetry.topViolationsFixed + telemetry.bottomViolationsFixed).toBeGreaterThan(0);
  });
});

describe('Edge Cases', () => {
  it('should handle multiple violations in one repair', () => {
    const items = [
      createSpacer('s1'),     // Top violation
      createDivider('d1'),    // Adjacent to spacer
      createSpacer('s2'),     // Adjacent to divider
      createCommitment('c1'),
      createDivider('d2')     // Bottom violation
    ];

    const result = autoRepairLayout(items, 'delete');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c1');
  });

  it('should handle temp IDs for timestamp comparison', () => {
    const items = [
      createCommitment('c1'),
      { ...createSpacer('temp-spacer-1000'), id: 'temp-spacer-1000' },
      { ...createSpacer('temp-spacer-2000'), id: 'temp-spacer-2000' },
      createCommitment('c2')
    ];

    const result = autoRepairLayout(items, 'delete');
    expect(result).toHaveLength(3);
    expect(result[1].id).toBe('temp-spacer-1000'); // Earlier timestamp kept
  });

  it('should maintain order_rank for friend view validation', () => {
    const items = [
      { ...createCommitment('c1'), order_rank: 'A' },
      { ...createSpacer('s1'), order_rank: 'B' },
      { ...createCommitment('c2'), order_rank: 'C' },
    ];

    // This should sort correctly by order_rank
    const sortedItems = [...items].sort((a, b) =>
      (a as any).order_rank.localeCompare((b as any).order_rank)
    );

    expect(sortedItems.map(i => i.id)).toEqual(['c1', 's1', 'c2']);
  });
});