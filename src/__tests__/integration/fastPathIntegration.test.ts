/**
 * Integration tests for Fast-Path Sync (Phase A)
 * Verifies end-to-end ≤2s target and real-world scenarios
 */

import { store } from '@/store';
import { addToQueue, setOnlineStatus } from '@/store/slices/syncSlice';
import { setRecordStatus } from '@/store/slices/recordsSlice';
import { FastPathSyncService } from '@/services/fastPathSync';
import { logFastPathReport, clearTimingData, exportTimingStats, startSyncOperation, recordTimingMark, SyncTimingMark } from '@/utils/syncXRay';

// Mock network requests to simulate controlled latencies
jest.mock('@/services/commitments', () => ({
  upsertCommitmentRecord: jest.fn().mockImplementation(() =>
    new Promise((resolve) => {
      // Simulate network latency (200-800ms)
      const delay = Math.random() * 600 + 200;
      setTimeout(() => {
        resolve({
          data: {
            id: `record-${Date.now()}`,
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
        });
      }, delay);
    })
  ),
  deleteCommitmentRecordByDate: jest.fn().mockImplementation(() =>
    new Promise((resolve) => {
      const delay = Math.random() * 400 + 100;
      setTimeout(() => {
        resolve({ data: { success: true }, error: null });
      }, delay);
    })
  )
}));

describe('Fast-Path Integration Tests', () => {
  beforeEach(() => {
    // Ensure online state
    store.dispatch(setOnlineStatus(true));

    // Clear metrics and timing data
    FastPathSyncService.clearMetrics();
    clearTimingData();
  });

  afterEach(() => {
    FastPathSyncService.cleanup();
  });

  describe('End-to-End Latency Targets', () => {
    it('should achieve ≤2s E2E for interactive record operations', async () => {
      console.log('\n🧪 Running 10-operation latency test...');

      const operations = [];
      const startTime = performance.now();

      // Simulate 10 interactive record operations
      for (let i = 0; i < 10; i++) {
        const commitmentId = `test-commitment-${i}`;
        const date = '2025-01-01';
        const syncOpId = startSyncOperation('record_complete', `${commitmentId}_${date}`);

        // Simulate the complete handleSetRecordStatus flow
        const operationPromise = (async () => {
          // T0: UI Action (simulated)
          // T1: Queue Enqueued
          recordTimingMark(syncOpId, SyncTimingMark.T1_QUEUE_ENQUEUED);

          // Optimistic update
          store.dispatch(setRecordStatus({
            commitmentId,
            date,
            status: 'completed',
            value: undefined
          }));

          // T5: Store Applied
          recordTimingMark(syncOpId, SyncTimingMark.T5_STORE_APPLIED);

          // Queue for sync (triggers fast-path)
          store.dispatch(addToQueue({
            type: 'CREATE',
            entity: 'record',
            entityId: `${commitmentId}_${date}`,
            data: {
              commitment_id: commitmentId,
              completed_at: `${date}T12:00:00Z`,
              status: 'complete',
              user_id: 'test-user'
            },
            syncOpId,
            interactive: true,
            idempotencyKey: `record:${commitmentId}:${date}:complete`
          }));

          // Wait for fast-path processing
          await new Promise(resolve => setTimeout(resolve, 50));

          // Simulate UI reconciliation
          await new Promise(resolve => setTimeout(resolve, 10));
          recordTimingMark(syncOpId, SyncTimingMark.T6_UI_RECONCILED);
        })();

        operations.push(operationPromise);
      }

      // Wait for all operations to complete
      await Promise.all(operations);

      // Allow additional time for any pending async operations
      await new Promise(resolve => setTimeout(resolve, 1000));

      const endTime = performance.now();
      const totalTestTime = endTime - startTime;

      console.log(`✅ Test completed in ${totalTestTime.toFixed(1)}ms`);

      // Generate and log the fast-path report
      logFastPathReport();

      // Get timing statistics
      const stats = exportTimingStats();
      const fastPathMetrics = FastPathSyncService.getMetrics();

      console.log('\n📊 INTEGRATION TEST RESULTS');
      console.log('=' + '='.repeat(30));
      console.log(`Operations Completed: ${stats.recentCompleted.length}`);
      console.log(`Fast-path Processed: ${fastPathMetrics.totalProcessed}`);
      console.log(`Median E2E: ${stats.statistics.medianE2E.toFixed(1)}ms`);
      console.log(`P90 E2E: ${stats.statistics.p90E2E.toFixed(1)}ms`);
      console.log(`P95 E2E: ${stats.statistics.p95E2E.toFixed(1)}ms`);

      // Verify Phase A targets
      expect(stats.statistics.medianE2E).toBeLessThanOrEqual(1000); // ≤1s median target
      expect(stats.statistics.p90E2E).toBeLessThanOrEqual(2000); // ≤2s p90 target
      expect(fastPathMetrics.totalProcessed).toBeGreaterThan(0);
      expect(stats.recentCompleted.length).toBeGreaterThanOrEqual(5); // At least half completed
    }, 15000); // 15 second timeout

    it('should handle rapid toggles with coalescing', async () => {
      console.log('\n🧪 Testing rapid toggle coalescing...');

      const commitmentId = 'test-rapid-toggle';
      const date = '2025-01-01';

      // Simulate rapid status toggles (complete → failed → complete → skipped)
      const toggles = ['completed', 'failed', 'completed', 'skipped'];

      for (const status of toggles) {
        const syncOpId = startSyncOperation('record_complete', `${commitmentId}_${date}`);

        store.dispatch(setRecordStatus({ commitmentId, date, status }));
        recordTimingMark(syncOpId, SyncTimingMark.T5_STORE_APPLIED);

        store.dispatch(addToQueue({
          type: 'CREATE',
          entity: 'record',
          entityId: `${commitmentId}_${date}`,
          data: {
            commitment_id: commitmentId,
            completed_at: `${date}T12:00:00Z`,
            status: status === 'completed' ? 'complete' : status,
            user_id: 'test-user'
          },
          syncOpId,
          interactive: true,
          idempotencyKey: `record:${commitmentId}:${date}:${status}`
        }));

        // Small delay between toggles
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Wait for coalescing window to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      const metrics = FastPathSyncService.getMetrics();

      console.log(`Coalesced operations: ${metrics.coalesced}`);
      console.log(`Total processed: ${metrics.totalProcessed}`);

      // Should have coalesced multiple operations into fewer network requests
      expect(metrics.coalesced).toBeGreaterThan(0);
      expect(metrics.totalProcessed).toBeLessThan(toggles.length); // Fewer than total due to coalescing
    });

    it('should handle offline → online transition', async () => {
      console.log('\n🧪 Testing offline → online transition...');

      // Start offline
      store.dispatch(setOnlineStatus(false));

      const commitmentId = 'test-offline';
      const date = '2025-01-01';
      const syncOpId = startSyncOperation('record_complete', `${commitmentId}_${date}`);

      // Try to sync while offline
      store.dispatch(addToQueue({
        type: 'CREATE',
        entity: 'record',
        entityId: `${commitmentId}_${date}`,
        data: {
          commitment_id: commitmentId,
          completed_at: `${date}T12:00:00Z`,
          status: 'complete',
          user_id: 'test-user'
        },
        syncOpId,
        interactive: true,
        idempotencyKey: `record:${commitmentId}:${date}:offline`
      }));

      let initialMetrics = FastPathSyncService.getMetrics();
      expect(initialMetrics.totalProcessed).toBe(0); // Should not process while offline

      // Go online
      store.dispatch(setOnlineStatus(true));

      // Try again (should work now)
      const onlineSyncOpId = startSyncOperation('record_complete', `${commitmentId}_online_${date}`);
      store.dispatch(addToQueue({
        type: 'CREATE',
        entity: 'record',
        entityId: `${commitmentId}_online_${date}`,
        data: {
          commitment_id: `${commitmentId}_online`,
          completed_at: `${date}T12:00:00Z`,
          status: 'complete',
          user_id: 'test-user'
        },
        syncOpId: onlineSyncOpId,
        interactive: true,
        idempotencyKey: `record:${commitmentId}_online:${date}:online`
      }));

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      const finalMetrics = FastPathSyncService.getMetrics();
      expect(finalMetrics.totalProcessed).toBeGreaterThan(0); // Should process when online
    });
  });

  describe('Error Resilience', () => {
    it('should isolate errors between operations', async () => {
      console.log('\n🧪 Testing error isolation...');

      const { upsertCommitmentRecord } = require('@/services/commitments');

      // Mock first operation to fail, others to succeed
      upsertCommitmentRecord
        .mockRejectedValueOnce(new Error('500 Server error'))
        .mockResolvedValue({
          data: { id: 'success' },
          error: null
        });

      const operations = [];

      // Operation 1: Will fail
      operations.push((async () => {
        const syncOpId = startSyncOperation('record_complete', 'fail_test');
        store.dispatch(addToQueue({
          type: 'CREATE',
          entity: 'record',
          entityId: 'fail_test',
          data: { test: 'fail' },
          syncOpId,
          interactive: true,
          idempotencyKey: 'record:fail:test'
        }));
      })());

      // Operations 2-3: Should succeed
      for (let i = 1; i <= 2; i++) {
        operations.push((async () => {
          const syncOpId = startSyncOperation('record_complete', `success_test_${i}`);
          store.dispatch(addToQueue({
            type: 'CREATE',
            entity: 'record',
            entityId: `success_test_${i}`,
            data: { test: 'success' },
            syncOpId,
            interactive: true,
            idempotencyKey: `record:success:${i}`
          }));
        })());
      }

      // Execute all operations
      await Promise.all(operations);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      const metrics = FastPathSyncService.getMetrics();

      console.log(`Errors: ${metrics.errors}`);
      console.log(`Successful: ${metrics.totalProcessed}`);

      expect(metrics.errors).toBe(1); // One failed
      expect(metrics.totalProcessed).toBe(2); // Two succeeded
    });
  });

  describe('Performance Benchmarks', () => {
    it('should maintain fast-path latency under load', async () => {
      console.log('\n🧪 Testing performance under load (20 operations)...');

      const operations = [];
      const startTime = performance.now();

      // 20 concurrent operations
      for (let i = 0; i < 20; i++) {
        operations.push((async () => {
          const syncOpId = startSyncOperation('record_complete', `load_test_${i}`);

          recordTimingMark(syncOpId, SyncTimingMark.T1_QUEUE_ENQUEUED);
          recordTimingMark(syncOpId, SyncTimingMark.T5_STORE_APPLIED);

          store.dispatch(addToQueue({
            type: 'CREATE',
            entity: 'record',
            entityId: `load_test_${i}`,
            data: {
              commitment_id: `load_commitment_${i}`,
              completed_at: '2025-01-01T12:00:00Z',
              status: 'complete',
              user_id: 'test-user'
            },
            syncOpId,
            interactive: true,
            idempotencyKey: `record:load:${i}`
          }));

          // Simulate UI reconciliation
          await new Promise(resolve => setTimeout(resolve, 16)); // ~60fps
          recordTimingMark(syncOpId, SyncTimingMark.T6_UI_RECONCILED);
        })());
      }

      await Promise.all(operations);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for processing

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      const metrics = FastPathSyncService.getMetrics();
      const stats = exportTimingStats();

      console.log(`Total test time: ${totalTime.toFixed(1)}ms`);
      console.log(`Operations processed: ${metrics.totalProcessed}`);
      console.log(`Median fast-path latency: ${metrics.medianLatency.toFixed(1)}ms`);
      console.log(`P95 E2E latency: ${stats.statistics.p95E2E.toFixed(1)}ms`);

      // Performance targets
      expect(metrics.medianLatency).toBeLessThan(1000); // Fast-path processing < 1s
      expect(stats.statistics.p95E2E).toBeLessThan(3000); // E2E < 3s even under load
      expect(metrics.totalProcessed).toBeGreaterThan(10); // Most operations succeeded
    }, 20000); // 20 second timeout for load test
  });
});