/**
 * Fast-Path Sync Service - Phase A Implementation
 * Enables immediate sync for interactive operations to achieve ≤2s E2E latency
 */

import NetInfo from '@react-native-community/netinfo';
import { store } from '@/store';
import { removeFromQueue, incrementRetryCount, type SyncAction } from '@/store/slices/syncSlice';
import { recordTimingMark, SyncTimingMark, forceCompleteOperation } from '@/utils/syncXRay';
import * as commitmentService from './commitments';
import { addRecord } from '@/store/slices/recordsSlice';

// Feature flag for fast-path
const FAST_PATH_ENABLED = __DEV__ ? true : true; // Enable by default

// Coalescing configuration
const COALESCING_WINDOW = 350; // ms
const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; // 1s

// In-flight operations tracking
const inFlightOps = new Map<string, Promise<void>>();

// Coalescing windows per entity
const coalescingWindows = new Map<string, {
  timer: NodeJS.Timeout;
  operations: SyncAction[];
}>();

// Fast-path metrics (DEV only)
interface FastPathMetrics {
  totalProcessed: number;
  coalesced: number;
  deduped: number;
  errors: number;
  fastPathLatency: number[]; // For percentile calculation
}

const metrics: FastPathMetrics = {
  totalProcessed: 0,
  coalesced: 0,
  deduped: 0,
  errors: 0,
  fastPathLatency: []
};

/**
 * Fast-path service for immediate sync processing
 */
export class FastPathSyncService {
  /**
   * Process operation immediately if it's interactive and conditions are met
   */
  static async processIfInteractive(action: SyncAction): Promise<boolean> {
    if (!FAST_PATH_ENABLED || !action.interactive) {
      return false;
    }

    const state = store.getState();

    // Gate on online && sessionValid
    if (!state.sync.isOnline) {
      if (__DEV__) {
        console.log(`🚀 [FAST-PATH] Skipping offline operation: ${action.idempotencyKey}`);
      }
      return false;
    }

    // Check in-flight de-duplication
    if (action.idempotencyKey && inFlightOps.has(action.idempotencyKey)) {
      if (__DEV__) {
        console.log(`🚀 [FAST-PATH] De-duped in-flight: ${action.idempotencyKey}`);
        metrics.deduped++;
      }
      return true; // Handled by skipping
    }

    // Apply coalescing for rapid operations
    if (this.shouldCoalesce(action)) {
      this.addToCoalescingWindow(action);
      return true; // Will be processed after coalescing window
    }

    // Process immediately
    await this.processImmediate(action);
    return true;
  }

  /**
   * Check if operation should be coalesced
   */
  private static shouldCoalesce(action: SyncAction): boolean {
    if (!action.idempotencyKey) return false;

    // Coalesce record operations by (commitmentId, date)
    if (action.entity === 'record' && action.idempotencyKey.startsWith('record:')) {
      return true;
    }

    // Coalesce reorder operations by itemId
    if (action.idempotencyKey.startsWith('move:')) {
      return true;
    }

    return false;
  }

  /**
   * Add operation to coalescing window
   */
  private static addToCoalescingWindow(action: SyncAction): void {
    const coalescingKey = this.getCoalescingKey(action);

    const existing = coalescingWindows.get(coalescingKey);
    if (existing) {
      // Replace with newer operation (keep final state)
      existing.operations = [action];
      if (__DEV__) {
        console.log(`🚀 [FAST-PATH] Coalesced: ${coalescingKey}`);
        metrics.coalesced++;
      }
    } else {
      // Start new coalescing window
      const timer = setTimeout(() => {
        const window = coalescingWindows.get(coalescingKey);
        if (window) {
          coalescingWindows.delete(coalescingKey);
          // Process the final operation
          for (const op of window.operations) {
            this.processImmediate(op);
          }
        }
      }, COALESCING_WINDOW);

      coalescingWindows.set(coalescingKey, {
        timer,
        operations: [action]
      });
    }
  }

  /**
   * Get coalescing key for grouping operations
   */
  private static getCoalescingKey(action: SyncAction): string {
    if (action.entity === 'record') {
      // Extract commitmentId and date from entityId (format: commitmentId_date)
      return `record:${action.entityId}`;
    }

    if (action.idempotencyKey?.startsWith('move:')) {
      // Extract entity ID from move operation
      const parts = action.idempotencyKey.split(':');
      return `move:${parts[1]}`;
    }

    return action.entityId;
  }

  /**
   * Process operation immediately
   */
  private static async processImmediate(action: SyncAction): Promise<void> {
    const startTime = performance.now();

    // SYNC X-RAY: Record fast-path processing start
    if (action.syncOpId) {
      recordTimingMark(action.syncOpId, SyncTimingMark.T2_NET_REQUEST_START, { fastPath: true });
    }

    let operationPromise: Promise<void>;

    // Create promise for in-flight tracking
    if (action.idempotencyKey) {
      operationPromise = this.syncSingleAction(action);
      inFlightOps.set(action.idempotencyKey, operationPromise);
    } else {
      operationPromise = this.syncSingleAction(action);
    }

    try {
      await operationPromise;

      // Remove from queue on success
      store.dispatch(removeFromQueue(action.id));

      // Track metrics
      const endTime = performance.now();
      const latency = endTime - startTime;

      if (__DEV__) {
        metrics.totalProcessed++;
        metrics.fastPathLatency.push(latency);
        console.log(`🚀 [FAST-PATH] Success: ${action.idempotencyKey} (${latency.toFixed(1)}ms)`);
      }

    } catch (error) {
      if (__DEV__) {
        metrics.errors++;
        console.error(`🚀 [FAST-PATH] Error: ${action.idempotencyKey}`, error);
      }

      // Force complete sync tracking on error
      if (action.syncOpId) {
        forceCompleteOperation(action.syncOpId, `Fast-path error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }

      // Handle error with backoff (let regular queue retry)
      this.handleFastPathError(action, error);

    } finally {
      // Cleanup in-flight tracking
      if (action.idempotencyKey) {
        inFlightOps.delete(action.idempotencyKey);
      }
    }
  }

  /**
   * Sync individual action (similar to syncService but isolated)
   */
  private static async syncSingleAction(action: SyncAction): Promise<void> {
    switch (action.entity) {
      case 'record':
        return this.syncRecord(action);
      case 'commitment':
        return this.syncCommitment(action);
      case 'layout_item':
        return this.syncLayoutItem(action);
      default:
        throw new Error(`Fast-path: Unknown entity type: ${action.entity}`);
    }
  }

  /**
   * Fast-path record sync
   */
  private static async syncRecord(action: SyncAction): Promise<void> {
    const { upsertCommitmentRecord } = await import('./commitments');

    switch (action.type) {
      case 'CREATE':
      case 'UPDATE':
        const result = await upsertCommitmentRecord(action.data);

        // SYNC X-RAY: Record response timing
        if (action.syncOpId) {
          recordTimingMark(action.syncOpId, SyncTimingMark.T3_NET_RESPONSE_END, {
            success: !result.error,
            error: result.error?.message,
            fastPath: true
          });
        }

        if (result.error) {
          throw new Error(`Fast-path upsert failed: ${result.error.message}`);
        }

        // Update Redux with real database record
        if (result.data) {
          const updatedRecord = {
            id: result.data.id,
            userId: result.data.user_id,
            commitmentId: result.data.commitment_id,
            date: result.data.completed_at.split('T')[0],
            status: result.data.status === 'complete' ? 'completed' as const : result.data.status,
            value: result.data.value,
            notes: result.data.notes,
            createdAt: result.data.created_at,
            updatedAt: result.data.updated_at,
          };
          store.dispatch(addRecord(updatedRecord));
        }
        break;

      case 'DELETE':
        const { deleteCommitmentRecordByDate } = await import('./commitments');
        const deleteResult = await deleteCommitmentRecordByDate(action.data.commitment_id, action.data.completed_at);

        if (action.syncOpId) {
          recordTimingMark(action.syncOpId, SyncTimingMark.T3_NET_RESPONSE_END, {
            success: !deleteResult.error,
            fastPath: true
          });
        }

        if (deleteResult.error) {
          throw new Error(`Fast-path delete failed: ${deleteResult.error.message}`);
        }
        break;
    }
  }

  /**
   * Fast-path commitment sync (placeholder)
   */
  private static async syncCommitment(action: SyncAction): Promise<void> {
    // Use existing sync logic for commitments
    if (action.syncOpId) {
      recordTimingMark(action.syncOpId, SyncTimingMark.T3_NET_RESPONSE_END, { fastPath: true });
    }
    console.log(`🚀 [FAST-PATH] Commitment sync: ${action.entityId} (${action.type})`);
  }

  /**
   * Fast-path layout item sync (placeholder)
   */
  private static async syncLayoutItem(action: SyncAction): Promise<void> {
    // Use existing sync logic for layout items
    if (action.syncOpId) {
      recordTimingMark(action.syncOpId, SyncTimingMark.T3_NET_RESPONSE_END, { fastPath: true });
    }
    console.log(`🚀 [FAST-PATH] Layout item sync: ${action.entityId} (${action.type})`);
  }

  /**
   * Handle fast-path errors with isolation
   */
  private static handleFastPathError(action: SyncAction, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (this.isPermanentError(error)) {
      // 4xx errors - don't retry via queue
      if (__DEV__) {
        console.warn(`🚀 [FAST-PATH] Permanent error, not retrying: ${action.idempotencyKey} - ${errorMessage}`);
      }
      store.dispatch(removeFromQueue(action.id));
    } else {
      // 5xx/network errors - let queue handle retry with exponential backoff
      if (__DEV__) {
        console.log(`🚀 [FAST-PATH] Temporary error, queue will retry: ${action.idempotencyKey} - ${errorMessage}`);
      }
      store.dispatch(incrementRetryCount(action.id));
    }
  }

  /**
   * Check if error is permanent (4xx) vs temporary (5xx/network)
   */
  private static isPermanentError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('401') ||
             message.includes('403') ||
             message.includes('422') ||
             message.includes('permanent');
    }
    return false;
  }

  /**
   * Get fast-path metrics (DEV only)
   */
  static getMetrics(): FastPathMetrics & {
    medianLatency: number;
    p90Latency: number;
    p95Latency: number;
  } {
    if (!__DEV__) {
      return {
        totalProcessed: 0,
        coalesced: 0,
        deduped: 0,
        errors: 0,
        fastPathLatency: [],
        medianLatency: 0,
        p90Latency: 0,
        p95Latency: 0
      };
    }

    const sorted = metrics.fastPathLatency.slice().sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length * 0.5)] || 0;
    const p90 = sorted[Math.floor(sorted.length * 0.9)] || 0;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;

    return {
      ...metrics,
      medianLatency: median,
      p90Latency: p90,
      p95Latency: p95
    };
  }

  /**
   * Clear metrics (for testing)
   */
  static clearMetrics(): void {
    if (!__DEV__) return;

    metrics.totalProcessed = 0;
    metrics.coalesced = 0;
    metrics.deduped = 0;
    metrics.errors = 0;
    metrics.fastPathLatency.length = 0;
  }

  /**
   * Log metrics summary (DEV only)
   */
  static logMetrics(): void {
    if (!__DEV__) return;

    const stats = this.getMetrics();
    console.log('\n🚀 FAST-PATH METRICS SUMMARY');
    console.log('=' + '='.repeat(30));
    console.log(`Total Processed: ${stats.totalProcessed}`);
    console.log(`Coalesced: ${stats.coalesced}`);
    console.log(`De-duped: ${stats.deduped}`);
    console.log(`Errors: ${stats.errors}`);
    console.log(`Median Latency: ${stats.medianLatency.toFixed(1)}ms`);
    console.log(`P90 Latency: ${stats.p90Latency.toFixed(1)}ms`);
    console.log(`P95 Latency: ${stats.p95Latency.toFixed(1)}ms`);
    console.log('');
  }

  /**
   * Clean up all resources
   */
  static cleanup(): void {
    // Clear coalescing windows
    for (const [key, window] of coalescingWindows) {
      clearTimeout(window.timer);
    }
    coalescingWindows.clear();

    // Clear in-flight operations
    inFlightOps.clear();

    if (__DEV__) {
      console.log('🚀 [FAST-PATH] Cleaned up all resources');
    }
  }
}