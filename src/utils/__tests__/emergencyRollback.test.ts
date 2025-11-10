/**
 * Unit tests for emergency rollback system
 * Tests the global flag system for disabling layout items without data loss
 */

import {
  disableLayoutItems,
  enableLayoutItems,
  isLayoutItemsDisabledGlobally,
  filterItemsForEmergencyRollback,
  getEmergencyRollbackStatus,
  temporaryEmergencyRollback,
} from '../emergencyRollback';

describe('Emergency Rollback System', () => {
  beforeEach(() => {
    // Ensure clean state before each test
    enableLayoutItems();
  });

  describe('Basic Enable/Disable Functionality', () => {
    it('should start with layout items enabled by default', () => {
      expect(isLayoutItemsDisabledGlobally()).toBe(false);
    });

    it('should disable layout items globally', () => {
      disableLayoutItems();
      expect(isLayoutItemsDisabledGlobally()).toBe(true);
    });

    it('should re-enable layout items after disable', () => {
      disableLayoutItems();
      expect(isLayoutItemsDisabledGlobally()).toBe(true);

      enableLayoutItems();
      expect(isLayoutItemsDisabledGlobally()).toBe(false);
    });
  });

  describe('Item Filtering', () => {
    const testItems = [
      { id: 'c1', type: 'commitment', title: 'Exercise' },
      { id: 's1', type: 'spacer', height: 16 },
      { id: 'c2', type: 'commitment', title: 'Read' },
      { id: 'd1', type: 'divider', style: 'solid' },
      { id: 'c3', type: 'commitment', title: 'Meditate' },
    ] as const;

    it('should return all items when layout items are enabled', () => {
      enableLayoutItems();

      const filtered = filterItemsForEmergencyRollback(testItems);
      expect(filtered).toHaveLength(5);
      expect(filtered).toEqual(testItems);
    });

    it('should filter out layout items when disabled', () => {
      disableLayoutItems();

      const filtered = filterItemsForEmergencyRollback(testItems);
      expect(filtered).toHaveLength(3);
      expect(filtered.map(item => item.id)).toEqual(['c1', 'c2', 'c3']);
      expect(filtered.every(item => item.type === 'commitment')).toBe(true);
    });

    it('should handle empty arrays', () => {
      disableLayoutItems();

      const filtered = filterItemsForEmergencyRollback([]);
      expect(filtered).toHaveLength(0);
    });

    it('should handle arrays with only commitments', () => {
      const commitmentsOnly = [
        { id: 'c1', type: 'commitment', title: 'Exercise' },
        { id: 'c2', type: 'commitment', title: 'Read' },
      ] as const;

      disableLayoutItems();

      const filtered = filterItemsForEmergencyRollback(commitmentsOnly);
      expect(filtered).toHaveLength(2);
      expect(filtered).toEqual(commitmentsOnly);
    });

    it('should handle arrays with only layout items', () => {
      const layoutItemsOnly = [
        { id: 's1', type: 'spacer', height: 16 },
        { id: 'd1', type: 'divider', style: 'solid' },
      ] as const;

      disableLayoutItems();

      const filtered = filterItemsForEmergencyRollback(layoutItemsOnly);
      expect(filtered).toHaveLength(0);
    });
  });

  describe('Status Reporting', () => {
    it('should report correct status when enabled', () => {
      enableLayoutItems();

      const status = getEmergencyRollbackStatus();
      expect(status.isDisabled).toBe(false);
      expect(status.message).toContain('operating normally');
    });

    it('should report correct status when disabled', () => {
      disableLayoutItems();

      const status = getEmergencyRollbackStatus();
      expect(status.isDisabled).toBe(true);
      expect(status.message).toContain('emergency rollback');
    });
  });

  describe('Temporary Emergency Rollback', () => {
    it('should automatically re-enable after timeout', (done) => {
      // Use a short timeout for testing
      const timeoutMs = 100;

      temporaryEmergencyRollback(timeoutMs);

      // Should be disabled immediately
      expect(isLayoutItemsDisabledGlobally()).toBe(true);

      // Should be enabled after timeout
      setTimeout(() => {
        expect(isLayoutItemsDisabledGlobally()).toBe(false);
        done();
      }, timeoutMs + 50); // Add buffer for timing
    });

    it('should use default timeout when not specified', () => {
      temporaryEmergencyRollback();

      // Should be disabled immediately
      expect(isLayoutItemsDisabledGlobally()).toBe(true);

      // Manually re-enable for cleanup (since default timeout is 60s)
      enableLayoutItems();
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple disable calls gracefully', () => {
      disableLayoutItems();
      disableLayoutItems();
      disableLayoutItems();

      expect(isLayoutItemsDisabledGlobally()).toBe(true);

      enableLayoutItems();
      expect(isLayoutItemsDisabledGlobally()).toBe(false);
    });

    it('should handle multiple enable calls gracefully', () => {
      enableLayoutItems();
      enableLayoutItems();
      enableLayoutItems();

      expect(isLayoutItemsDisabledGlobally()).toBe(false);
    });

    it('should maintain state across multiple filter operations', () => {
      const testItems = [
        { id: 'c1', type: 'commitment' },
        { id: 's1', type: 'spacer' },
      ] as const;

      disableLayoutItems();

      // Multiple filter operations should all return only commitments
      for (let i = 0; i < 5; i++) {
        const filtered = filterItemsForEmergencyRollback(testItems);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].type).toBe('commitment');
      }
    });

    it('should handle complex item types correctly', () => {
      const itemsWithComplexTypes = [
        { id: 'c1', type: 'commitment', extra: 'data' },
        { id: 's1', type: 'spacer', extra: 'data' },
        { id: 'd1', type: 'divider', extra: 'data' },
        { id: 'unknown', type: 'unknown', extra: 'data' }, // Unknown type should be preserved
      ] as const;

      disableLayoutItems();

      const filtered = filterItemsForEmergencyRollback(itemsWithComplexTypes);
      expect(filtered).toHaveLength(2); // commitment + unknown (non-layout items preserved)
      expect(filtered.map(item => item.id)).toEqual(['c1', 'unknown']);
    });
  });
});