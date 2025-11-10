/**
 * Unit tests for Fast-Path Sync Service (Phase A)
 * Tests interactive operation classification, coalescing, and de-duplication
 */

import { FastPathSyncService } from '../fastPathSync';
import { store } from '@/store';
import { setOnlineStatus, type SyncAction } from '@/store/slices/syncSlice';

// Mock external dependencies
jest.mock('../commitments', () => ({
  upsertCommitmentRecord: jest.fn().mockResolvedValue({
    data: {
      id: 'test-record-id',
      user_id: 'test-user',
      commitment_id: 'test-commitment',
      completed_at: '2025-01-01T12:00:00Z',
      status: 'complete',
      value: null,
      notes: null,
      created_at: '2025-01-01T12:00:00Z',
      updated_at: '2025-01-01T12:00:00Z'
    },
    error: null
  }),
  deleteCommitmentRecordByDate: jest.fn().mockResolvedValue({
    data: { success: true },
    error: null
  })
}));

jest.mock('@/store', () => ({
  store: {
    getState: jest.fn(),
    dispatch: jest.fn()
  }
}));

jest.mock('@/utils/syncXRay', () => ({
  recordTimingMark: jest.fn(),
  forceCompleteOperation: jest.fn(),
  SyncTimingMark: {
    T2_NET_REQUEST_START: 'T2_NET_REQUEST_START',
    T3_NET_RESPONSE_END: 'T3_NET_RESPONSE_END'
  }
}));

describe('FastPathSyncService', () => {
  const mockStore = store as jest.Mocked<typeof store>;

  beforeEach(() => {
    jest.clearAllMocks();
    FastPathSyncService.clearMetrics();

    // Default store state
    mockStore.getState.mockReturnValue({
      sync: {
        isOnline: true,
        isSyncing: false,
        queue: [],
        lastSyncAt: null,
        error: null
      }
    } as any);
  });

  afterEach(() => {
    FastPathSyncService.cleanup();
  });

  describe('Interactive Operation Classification', () => {
    it('should process interactive operations when online', async () => {
      const action: SyncAction = {
        id: 'test-1',
        type: 'CREATE',
        entity: 'record',
        entityId: 'commitment-1_2025-01-01',
        data: { test: 'data' },
        timestamp: new Date().toISOString(),
        retryCount: 0,
        interactive: true,
        idempotencyKey: 'record:commitment-1:2025-01-01:complete'
      };

      const result = await FastPathSyncService.processIfInteractive(action);
      expect(result).toBe(true);
    });

    it('should skip non-interactive operations', async () => {
      const action: SyncAction = {
        id: 'test-2',
        type: 'CREATE',
        entity: 'record',
        entityId: 'commitment-1_2025-01-01',
        data: { test: 'data' },
        timestamp: new Date().toISOString(),
        retryCount: 0,
        interactive: false
      };

      const result = await FastPathSyncService.processIfInteractive(action);
      expect(result).toBe(false);
    });

    it('should skip operations when offline', async () => {
      mockStore.getState.mockReturnValue({
        sync: { isOnline: false, isSyncing: false, queue: [], lastSyncAt: null, error: null }
      } as any);

      const action: SyncAction = {
        id: 'test-3',
        type: 'CREATE',
        entity: 'record',
        entityId: 'commitment-1_2025-01-01',
        data: { test: 'data' },
        timestamp: new Date().toISOString(),
        retryCount: 0,
        interactive: true
      };

      const result = await FastPathSyncService.processIfInteractive(action);
      expect(result).toBe(false);
    });
  });

  describe('Coalescing Window', () => {
    it('should coalesce record operations by (commitmentId, date)', async () => {
      const action1: SyncAction = {
        id: 'test-4',
        type: 'CREATE',
        entity: 'record',
        entityId: 'commitment-1_2025-01-01',
        data: { status: 'completed' },
        timestamp: new Date().toISOString(),
        retryCount: 0,
        interactive: true,
        idempotencyKey: 'record:commitment-1:2025-01-01:completed'
      };

      const action2: SyncAction = {
        id: 'test-5',
        type: 'CREATE',
        entity: 'record',
        entityId: 'commitment-1_2025-01-01',
        data: { status: 'failed' },
        timestamp: new Date().toISOString(),
        retryCount: 0,
        interactive: true,
        idempotencyKey: 'record:commitment-1:2025-01-01:failed'
      };

      // Process both operations rapidly
      const result1 = await FastPathSyncService.processIfInteractive(action1);
      const result2 = await FastPathSyncService.processIfInteractive(action2);

      expect(result1).toBe(true);
      expect(result2).toBe(true);

      // Should show coalescing in metrics
      const metrics = FastPathSyncService.getMetrics();
      expect(metrics.coalesced).toBeGreaterThanOrEqual(1);
    });

    it('should coalesce move operations by itemId', async () => {
      const action1: SyncAction = {
        id: 'test-6',
        type: 'UPDATE',
        entity: 'layout_item',
        entityId: 'spacer-1',
        data: { order_rank: 'A' },
        timestamp: new Date().toISOString(),
        retryCount: 0,
        interactive: true,
        idempotencyKey: 'move:spacer-1:A'
      };

      const action2: SyncAction = {
        id: 'test-7',
        type: 'UPDATE',
        entity: 'layout_item',
        entityId: 'spacer-1',
        data: { order_rank: 'B' },
        timestamp: new Date().toISOString(),
        retryCount: 0,
        interactive: true,
        idempotencyKey: 'move:spacer-1:B'
      };

      const result1 = await FastPathSyncService.processIfInteractive(action1);
      const result2 = await FastPathSyncService.processIfInteractive(action2);

      expect(result1).toBe(true);
      expect(result2).toBe(true);

      // Verify coalescing occurred
      const metrics = FastPathSyncService.getMetrics();
      expect(metrics.coalesced).toBeGreaterThanOrEqual(1);
    });
  });

  describe('In-Flight De-duplication', () => {
    it('should de-duplicate operations with same idempotency key', async () => {
      const action1: SyncAction = {
        id: 'test-8',
        type: 'CREATE',
        entity: 'record',
        entityId: 'commitment-1_2025-01-01',
        data: { test: 'data' },
        timestamp: new Date().toISOString(),
        retryCount: 0,
        interactive: true,
        idempotencyKey: 'record:commitment-1:2025-01-01:complete'
      };

      const action2: SyncAction = {
        ...action1,
        id: 'test-9'
      };

      // Process both operations simultaneously
      const [result1, result2] = await Promise.all([
        FastPathSyncService.processIfInteractive(action1),
        FastPathSyncService.processIfInteractive(action2)
      ]);

      expect(result1).toBe(true);
      expect(result2).toBe(true);

      // Should show de-duplication in metrics
      const metrics = FastPathSyncService.getMetrics();
      expect(metrics.deduped).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error Handling & Isolation', () => {
    it('should handle permanent errors (4xx) without retry', async () => {
      const { upsertCommitmentRecord } = require('../commitments');
      upsertCommitmentRecord.mockRejectedValueOnce(new Error('422 Validation error'));

      const action: SyncAction = {
        id: 'test-10',
        type: 'CREATE',
        entity: 'record',
        entityId: 'commitment-1_2025-01-01',
        data: { test: 'invalid' },
        timestamp: new Date().toISOString(),
        retryCount: 0,
        interactive: true,
        idempotencyKey: 'record:commitment-1:2025-01-01:invalid'
      };

      await FastPathSyncService.processIfInteractive(action);

      // Should remove from queue (not retry)
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sync/removeFromQueue'
        })
      );

      const metrics = FastPathSyncService.getMetrics();
      expect(metrics.errors).toBe(1);
    });

    it('should handle temporary errors (5xx) with queue retry', async () => {
      const { upsertCommitmentRecord } = require('../commitments');
      upsertCommitmentRecord.mockRejectedValueOnce(new Error('500 Internal server error'));

      const action: SyncAction = {
        id: 'test-11',
        type: 'CREATE',
        entity: 'record',
        entityId: 'commitment-1_2025-01-01',
        data: { test: 'data' },
        timestamp: new Date().toISOString(),
        retryCount: 0,
        interactive: true,
        idempotencyKey: 'record:commitment-1:2025-01-01:temp-error'
      };

      await FastPathSyncService.processIfInteractive(action);

      // Should increment retry count (let queue handle retry)
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sync/incrementRetryCount'
        })
      );

      const metrics = FastPathSyncService.getMetrics();
      expect(metrics.errors).toBe(1);
    });

    it('should isolate errors - one failed op should not affect others', async () => {
      const { upsertCommitmentRecord } = require('../commitments');

      // First call fails, second succeeds
      upsertCommitmentRecord
        .mockRejectedValueOnce(new Error('500 Server error'))
        .mockResolvedValueOnce({
          data: { id: 'test-record' },
          error: null
        });

      const action1: SyncAction = {
        id: 'test-12',
        type: 'CREATE',
        entity: 'record',
        entityId: 'commitment-1_2025-01-01',
        data: { test: 'fail' },
        timestamp: new Date().toISOString(),
        retryCount: 0,
        interactive: true,
        idempotencyKey: 'record:commitment-1:2025-01-01:fail'
      };

      const action2: SyncAction = {
        id: 'test-13',
        type: 'CREATE',
        entity: 'record',
        entityId: 'commitment-2_2025-01-01',
        data: { test: 'success' },
        timestamp: new Date().toISOString(),
        retryCount: 0,
        interactive: true,
        idempotencyKey: 'record:commitment-2:2025-01-01:success'
      };

      await Promise.all([
        FastPathSyncService.processIfInteractive(action1),
        FastPathSyncService.processIfInteractive(action2)
      ]);

      const metrics = FastPathSyncService.getMetrics();
      expect(metrics.errors).toBe(1);
      expect(metrics.totalProcessed).toBe(1); // One succeeded
    });
  });

  describe('Metrics & Reporting', () => {
    it('should track fast-path metrics correctly', async () => {
      const action: SyncAction = {
        id: 'test-14',
        type: 'CREATE',
        entity: 'record',
        entityId: 'commitment-1_2025-01-01',
        data: { test: 'metrics' },
        timestamp: new Date().toISOString(),
        retryCount: 0,
        interactive: true,
        idempotencyKey: 'record:commitment-1:2025-01-01:metrics'
      };

      await FastPathSyncService.processIfInteractive(action);

      const metrics = FastPathSyncService.getMetrics();
      expect(metrics.totalProcessed).toBe(1);
      expect(metrics.fastPathLatency).toHaveLength(1);
      expect(metrics.medianLatency).toBeGreaterThan(0);
    });

    it('should calculate percentiles correctly', async () => {
      // Process multiple operations to test percentile calculation
      for (let i = 0; i < 5; i++) {
        const action: SyncAction = {
          id: `test-${15 + i}`,
          type: 'CREATE',
          entity: 'record',
          entityId: `commitment-${i}_2025-01-01`,
          data: { test: `percentile-${i}` },
          timestamp: new Date().toISOString(),
          retryCount: 0,
          interactive: true,
          idempotencyKey: `record:commitment-${i}:2025-01-01:percentile`
        };

        await FastPathSyncService.processIfInteractive(action);
      }

      const metrics = FastPathSyncService.getMetrics();
      expect(metrics.totalProcessed).toBe(5);
      expect(metrics.medianLatency).toBeGreaterThan(0);
      expect(metrics.p90Latency).toBeGreaterThanOrEqual(metrics.medianLatency);
      expect(metrics.p95Latency).toBeGreaterThanOrEqual(metrics.p90Latency);
    });

    it('should clear metrics properly', () => {
      // Add some test data
      FastPathSyncService.getMetrics(); // Initialize

      FastPathSyncService.clearMetrics();

      const metrics = FastPathSyncService.getMetrics();
      expect(metrics.totalProcessed).toBe(0);
      expect(metrics.coalesced).toBe(0);
      expect(metrics.deduped).toBe(0);
      expect(metrics.errors).toBe(0);
      expect(metrics.fastPathLatency).toHaveLength(0);
    });
  });

  describe('Integration with Sync X-Ray', () => {
    it('should record timing marks for tracked operations', async () => {
      const { recordTimingMark } = require('@/utils/syncXRay');

      const action: SyncAction = {
        id: 'test-20',
        type: 'CREATE',
        entity: 'record',
        entityId: 'commitment-1_2025-01-01',
        data: { test: 'xray' },
        timestamp: new Date().toISOString(),
        retryCount: 0,
        interactive: true,
        syncOpId: 'record_complete:commitment-1_2025-01-01:12345:abcd',
        idempotencyKey: 'record:commitment-1:2025-01-01:xray'
      };

      await FastPathSyncService.processIfInteractive(action);

      // Should have recorded T2 and T3 timing marks
      expect(recordTimingMark).toHaveBeenCalledWith(
        action.syncOpId,
        'T2_NET_REQUEST_START',
        expect.objectContaining({ fastPath: true })
      );

      expect(recordTimingMark).toHaveBeenCalledWith(
        action.syncOpId,
        'T3_NET_RESPONSE_END',
        expect.objectContaining({
          success: true,
          fastPath: true
        })
      );
    });

    it('should force complete operation tracking on error', async () => {
      const { forceCompleteOperation } = require('@/utils/syncXRay');
      const { upsertCommitmentRecord } = require('../commitments');

      upsertCommitmentRecord.mockRejectedValueOnce(new Error('Test error'));

      const action: SyncAction = {
        id: 'test-21',
        type: 'CREATE',
        entity: 'record',
        entityId: 'commitment-1_2025-01-01',
        data: { test: 'error' },
        timestamp: new Date().toISOString(),
        retryCount: 0,
        interactive: true,
        syncOpId: 'record_complete:commitment-1_2025-01-01:12345:error',
        idempotencyKey: 'record:commitment-1:2025-01-01:error'
      };

      await FastPathSyncService.processIfInteractive(action);

      expect(forceCompleteOperation).toHaveBeenCalledWith(
        action.syncOpId,
        'Fast-path error: Test error'
      );
    });
  });
});