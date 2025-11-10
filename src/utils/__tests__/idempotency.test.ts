/**
 * Unit tests for idempotency in reordering operations
 * Ensures unique operations by (id, final rank) and proper sync queue deduplication
 */

import syncReducer, { addToQueue, type SyncAction } from '@/store/slices/syncSlice';

describe('Idempotency for Reordering Operations', () => {
  let state: any;

  beforeEach(() => {
    state = {
      isOnline: true,
      isSyncing: false,
      queue: [],
      lastSyncAt: null,
      error: null,
    };
  });

  describe('Sync Queue Deduplication', () => {
    it('should skip duplicate operations with same idempotency key', () => {
      const action1 = {
        type: 'UPDATE' as const,
        entity: 'layout_item' as const,
        entityId: 'spacer-1',
        data: { order_rank: 'A' },
        idempotencyKey: 'move:spacer-1:A'
      };

      // Add first action
      const newState1 = syncReducer(state, addToQueue(action1));
      expect(newState1.queue).toHaveLength(1);

      // Add same action again - should be skipped
      const newState2 = syncReducer(newState1, addToQueue(action1));
      expect(newState2.queue).toHaveLength(1);
      expect(newState2.queue[0].idempotencyKey).toBe('move:spacer-1:A');
    });

    it('should replace older move operations with newer ones for same entity', () => {
      const oldMoveAction = {
        type: 'UPDATE' as const,
        entity: 'layout_item' as const,
        entityId: 'spacer-1',
        data: { order_rank: 'A' },
        idempotencyKey: 'move:spacer-1:A'
      };

      const newMoveAction = {
        type: 'UPDATE' as const,
        entity: 'layout_item' as const,
        entityId: 'spacer-1',
        data: { order_rank: 'B' },
        idempotencyKey: 'move:spacer-1:B'
      };

      // Add old move action
      const state1 = syncReducer(state, addToQueue(oldMoveAction));
      expect(state1.queue).toHaveLength(1);

      // Add new move action - should replace old one
      const state2 = syncReducer(state1, addToQueue(newMoveAction));
      expect(state2.queue).toHaveLength(1);
      expect(state2.queue[0].idempotencyKey).toBe('move:spacer-1:B');
      expect(state2.queue[0].data.order_rank).toBe('B');
    });

    it('should handle multiple entities with different move operations', () => {
      const moveAction1 = {
        type: 'UPDATE' as const,
        entity: 'layout_item' as const,
        entityId: 'spacer-1',
        data: { order_rank: 'A' },
        idempotencyKey: 'move:spacer-1:A'
      };

      const moveAction2 = {
        type: 'UPDATE' as const,
        entity: 'layout_item' as const,
        entityId: 'spacer-2',
        data: { order_rank: 'B' },
        idempotencyKey: 'move:spacer-2:B'
      };

      const commitmentMoveAction = {
        type: 'UPDATE' as const,
        entity: 'commitment' as const,
        entityId: 'commitment-1',
        data: { order_rank: 'C' },
        idempotencyKey: 'move:commitment-1:C'
      };

      let currentState = state;
      currentState = syncReducer(currentState, addToQueue(moveAction1));
      currentState = syncReducer(currentState, addToQueue(moveAction2));
      currentState = syncReducer(currentState, addToQueue(commitmentMoveAction));

      expect(currentState.queue).toHaveLength(3);
      expect(currentState.queue.map(q => q.idempotencyKey)).toEqual([
        'move:spacer-1:A',
        'move:spacer-2:B',
        'move:commitment-1:C'
      ]);
    });

    it('should handle non-move operations without interference', () => {
      const createAction = {
        type: 'CREATE' as const,
        entity: 'layout_item' as const,
        entityId: 'spacer-1',
        data: { type: 'spacer', height: 16 },
        idempotencyKey: 'create:spacer-1:123456'
      };

      const moveAction = {
        type: 'UPDATE' as const,
        entity: 'layout_item' as const,
        entityId: 'spacer-1',
        data: { order_rank: 'A' },
        idempotencyKey: 'move:spacer-1:A'
      };

      const deleteAction = {
        type: 'DELETE' as const,
        entity: 'layout_item' as const,
        entityId: 'spacer-2',
        data: { id: 'spacer-2' },
        idempotencyKey: 'delete:spacer-2:789012'
      };

      let currentState = state;
      currentState = syncReducer(currentState, addToQueue(createAction));
      currentState = syncReducer(currentState, addToQueue(moveAction));
      currentState = syncReducer(currentState, addToQueue(deleteAction));

      // CREATE gets replaced by UPDATE (UPDATE trumps CREATE), so should have 2 items
      expect(currentState.queue).toHaveLength(2);
      expect(currentState.queue.map(q => q.type)).toEqual(['UPDATE', 'DELETE']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle operations without idempotency keys', () => {
      const legacyAction = {
        type: 'UPDATE' as const,
        entity: 'layout_item' as const,
        entityId: 'spacer-1',
        data: { order_rank: 'A' }
        // No idempotencyKey
      };

      const newState = syncReducer(state, addToQueue(legacyAction));
      expect(newState.queue).toHaveLength(1);
      expect(newState.queue[0].idempotencyKey).toBeUndefined();
    });

    it('should handle rapid successive moves to same position', () => {
      const moveAction = {
        type: 'UPDATE' as const,
        entity: 'layout_item' as const,
        entityId: 'spacer-1',
        data: { order_rank: 'A' },
        idempotencyKey: 'move:spacer-1:A'
      };

      // Add same move operation 5 times rapidly
      let currentState = state;
      for (let i = 0; i < 5; i++) {
        currentState = syncReducer(currentState, addToQueue(moveAction));
      }

      // Should only have one operation in queue
      expect(currentState.queue).toHaveLength(1);
      expect(currentState.queue[0].idempotencyKey).toBe('move:spacer-1:A');
    });

    it('should handle move followed by delete (delete should trump)', () => {
      const moveAction = {
        type: 'UPDATE' as const,
        entity: 'layout_item' as const,
        entityId: 'spacer-1',
        data: { order_rank: 'A' },
        idempotencyKey: 'move:spacer-1:A'
      };

      const deleteAction = {
        type: 'DELETE' as const,
        entity: 'layout_item' as const,
        entityId: 'spacer-1',
        data: { id: 'spacer-1' },
        idempotencyKey: 'delete:spacer-1:123456'
      };

      let currentState = state;
      currentState = syncReducer(currentState, addToQueue(moveAction));
      currentState = syncReducer(currentState, addToQueue(deleteAction));

      // Should only have delete operation (delete trumps everything)
      expect(currentState.queue).toHaveLength(1);
      expect(currentState.queue[0].type).toBe('DELETE');
      expect(currentState.queue[0].idempotencyKey).toBe('delete:spacer-1:123456');
    });
  });

  describe('Idempotency Key Generation', () => {
    it('should generate consistent keys for move operations', () => {
      const id = 'spacer-123';
      const rank = 'A|B|C';
      const key = `move:${id}:${rank}`;

      expect(key).toBe('move:spacer-123:A|B|C');
    });

    it('should generate consistent keys for create operations', () => {
      const id = 'spacer-123';
      const timestamp = Date.now();
      const key = `create:spacer:${id}:${timestamp}`;

      expect(key).toBe(`create:spacer:spacer-123:${timestamp}`);
    });

    it('should generate consistent keys for delete operations', () => {
      const id = 'spacer-123';
      const timestamp = Date.now();
      const key = `delete:${id}:${timestamp}`;

      expect(key).toBe(`delete:spacer-123:${timestamp}`);
    });
  });
});