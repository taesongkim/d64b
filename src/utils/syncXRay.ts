/**
 * Sync X-Ray - DEV-only end-to-end sync latency measurement
 * Tracks correlated timing marks from UI event to final reconciliation
 */

// Timing mark types for the sync pipeline
export type SyncTimingMark =
  | 'T0_UI_ACTION'           // User interaction (button press, etc.)
  | 'T1_QUEUE_ENQUEUED'      // Action added to sync queue
  | 'T2_NET_REQUEST_START'   // Network request initiated
  | 'T3_NET_RESPONSE_END'    // Server response received
  | 'T4_REALTIME_EVENT_RECEIVED' // Realtime event received (if applicable)
  | 'T5_STORE_APPLIED'       // Redux store state updated
  | 'T6_UI_RECONCILED';      // UI component re-rendered with new state

// Export timing mark enum for easier usage
export const SyncTimingMark = {
  T0_UI_ACTION: 'T0_UI_ACTION' as const,
  T1_QUEUE_ENQUEUED: 'T1_QUEUE_ENQUEUED' as const,
  T2_NET_REQUEST_START: 'T2_NET_REQUEST_START' as const,
  T3_NET_RESPONSE_END: 'T3_NET_RESPONSE_END' as const,
  T4_REALTIME_EVENT_RECEIVED: 'T4_REALTIME_EVENT_RECEIVED' as const,
  T5_STORE_APPLIED: 'T5_STORE_APPLIED' as const,
  T6_UI_RECONCILED: 'T6_UI_RECONCILED' as const,
} as const;

// Sync operation details
export interface SyncOperation {
  id: string;           // Unique operation ID
  type: string;         // Operation type (e.g., 'record_complete', 'commitment_update')
  entityId: string;     // Entity being synced
  startTime: number;    // T0 timestamp
  marks: Map<SyncTimingMark, number>; // Timing marks
  metadata?: any;       // Additional context (no PII)
}

// Active operations tracking
const activeOperations = new Map<string, SyncOperation>();

// Store subscription for tracking UI reconciliation
let storeUnsubscribe: (() => void) | null = null;

// Completed operations for analysis (limited history)
const completedOperations: SyncOperation[] = [];
const MAX_COMPLETED_HISTORY = 50;

/**
 * Generate a unique sync operation ID
 * Format: {type}:{entityId}:{timestamp}:{random}
 */
export function generateSyncOpId(type: string, entityId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${type}:${entityId}:${timestamp}:${random}`;
}

/**
 * Start tracking a new sync operation
 */
export function startSyncOperation(
  type: string,
  entityId: string,
  metadata?: any
): string | null {
  if (!__DEV__) return null;

  const opId = generateSyncOpId(type, entityId);
  const startTime = performance.now();

  const operation: SyncOperation = {
    id: opId,
    type,
    entityId,
    startTime,
    marks: new Map([[SyncTimingMark.T0_UI_ACTION, startTime]]),
    metadata
  };

  activeOperations.set(opId, operation);

  console.log(`🔍 [SYNC-XRAY] Started tracking: ${opId} (${type})`);
  return opId;
}

/**
 * Record a timing mark for an active operation
 */
export function recordTimingMark(
  opId: string | null,
  mark: keyof typeof SyncTimingMark,
  metadata?: any
): void {
  if (!__DEV__ || !opId) return;

  const operation = activeOperations.get(opId);
  if (!operation) {
    console.warn(`🔍 [SYNC-XRAY] Unknown operation: ${opId}`);
    return;
  }

  const timestamp = performance.now();
  operation.marks.set(mark, timestamp);

  // Calculate delta from previous mark
  const markValues = Array.from(operation.marks.values());
  const previousTime = markValues[markValues.length - 2] || operation.startTime;
  const delta = timestamp - previousTime;

  console.log(`🔍 [SYNC-XRAY] ${opId} | ${mark} (+${delta.toFixed(1)}ms)${metadata ? ` | ${JSON.stringify(metadata)}` : ''}`);

  // If this is the final mark, complete the operation
  if (mark === SyncTimingMark.T6_UI_RECONCILED) {
    completeOperation(opId);
  }
}

/**
 * Complete an operation and move to completed history
 */
function completeOperation(opId: string): void {
  const operation = activeOperations.get(opId);
  if (!operation) return;

  activeOperations.delete(opId);
  completedOperations.push(operation);

  // Trim history if needed
  if (completedOperations.length > MAX_COMPLETED_HISTORY) {
    completedOperations.shift();
  }

  // Log completion summary
  const totalTime = (operation.marks.get(SyncTimingMark.T6_UI_RECONCILED) || 0) - operation.startTime;
  console.log(`🔍 [SYNC-XRAY] Completed: ${opId} | Total: ${totalTime.toFixed(1)}ms`);
}

/**
 * Force complete an operation (for timeout/error cases)
 */
export function forceCompleteOperation(opId: string | null, reason?: string): void {
  if (!__DEV__ || !opId) return;

  const operation = activeOperations.get(opId);
  if (!operation) return;

  if (reason) {
    console.log(`🔍 [SYNC-XRAY] Force completing: ${opId} | Reason: ${reason}`);
  }

  completeOperation(opId);
}

/**
 * Get timing deltas for an operation
 */
export function getOperationDeltas(operation: SyncOperation): {
  mark: string;
  delta: number;
  cumulative: number;
}[] {
  const marks = Array.from(operation.marks.entries()).sort((a, b) => a[1] - b[1]);
  const deltas = [];
  let previousTime = operation.startTime;

  for (const [mark, timestamp] of marks) {
    const delta = timestamp - previousTime;
    const cumulative = timestamp - operation.startTime;

    deltas.push({
      mark: mark.replace('T', '').replace('_', '-'),
      delta: Math.round(delta * 10) / 10,
      cumulative: Math.round(cumulative * 10) / 10
    });

    previousTime = timestamp;
  }

  return deltas;
}

/**
 * Export timing statistics for analysis
 */
export function exportTimingStats(): {
  totalOperations: number;
  activeOperations: number;
  recentCompleted: SyncOperation[];
  statistics: {
    medianE2E: number;
    p90E2E: number;
    p95E2E: number;
    deltaStats: { [key: string]: { median: number; p90: number; p95: number } };
  };
} {
  if (!__DEV__) {
    return {
      totalOperations: 0,
      activeOperations: 0,
      recentCompleted: [],
      statistics: {
        medianE2E: 0,
        p90E2E: 0,
        p95E2E: 0,
        deltaStats: {}
      }
    };
  }

  // Calculate E2E times
  const e2eTimes = completedOperations
    .filter(op => op.marks.has(SyncTimingMark.T6_UI_RECONCILED))
    .map(op => (op.marks.get(SyncTimingMark.T6_UI_RECONCILED)! - op.startTime));

  // Calculate delta statistics by mark type
  const deltaStats: { [key: string]: number[] } = {};

  for (const operation of completedOperations) {
    const deltas = getOperationDeltas(operation);
    for (const { mark, delta } of deltas) {
      if (!deltaStats[mark]) deltaStats[mark] = [];
      deltaStats[mark].push(delta);
    }
  }

  // Calculate percentiles
  const calculatePercentiles = (values: number[]) => {
    if (values.length === 0) return { median: 0, p90: 0, p95: 0 };

    const sorted = values.slice().sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length * 0.5)];
    const p90 = sorted[Math.floor(sorted.length * 0.9)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];

    return { median, p90, p95 };
  };

  const e2eStats = calculatePercentiles(e2eTimes);
  const deltaPercentiles: { [key: string]: { median: number; p90: number; p95: number } } = {};

  for (const [mark, values] of Object.entries(deltaStats)) {
    deltaPercentiles[mark] = calculatePercentiles(values);
  }

  return {
    totalOperations: completedOperations.length + activeOperations.size,
    activeOperations: activeOperations.size,
    recentCompleted: completedOperations.slice(-10),
    statistics: {
      medianE2E: e2eStats.median,
      p90E2E: e2eStats.p90,
      p95E2E: e2eStats.p95,
      deltaStats: deltaPercentiles
    }
  };
}

/**
 * Clear all timing data (for testing)
 */
export function clearTimingData(): void {
  if (!__DEV__) return;

  activeOperations.clear();
  completedOperations.length = 0;
  console.log('🔍 [SYNC-XRAY] Cleared all timing data');
}

/**
 * Log current active operations (debugging)
 */
export function logActiveOperations(): void {
  if (!__DEV__) return;

  console.log(`🔍 [SYNC-XRAY] Active operations: ${activeOperations.size}`);
  for (const [opId, operation] of activeOperations) {
    const elapsed = performance.now() - operation.startTime;
    const lastMark = Array.from(operation.marks.keys()).pop() || 'T0_UI_ACTION';
    console.log(`  ${opId} | ${lastMark} | ${elapsed.toFixed(1)}ms elapsed`);
  }
}

/**
 * Initialize store subscription for tracking UI reconciliation
 */
export function initializeStoreTracking() {
  if (!__DEV__ || storeUnsubscribe) return;

  // Dynamically import store to avoid circular dependencies
  import('@/store').then(({ store }) => {
    let previousRecordsState: any = null;

    storeUnsubscribe = store.subscribe(() => {
      const state = store.getState();
      const currentRecordsState = state.records.records;

      // Track when records state changes (indicates UI will update)
      if (previousRecordsState !== null && currentRecordsState !== previousRecordsState) {
        // Find any active operations that might be related to this state change
        for (const [opId, operation] of activeOperations) {
          if (operation.type.includes('record') && !operation.marks.has(SyncTimingMark.T6_UI_RECONCILED)) {
            // Use setTimeout to ensure this runs after React has reconciled
            setTimeout(() => {
              recordTimingMark(opId, SyncTimingMark.T6_UI_RECONCILED, { trigger: 'store_change' });
            }, 10);
          }
        }
      }

      previousRecordsState = currentRecordsState;
    });
  }).catch(error => {
    console.warn('🔍 [SYNC-XRAY] Failed to initialize store tracking:', error);
  });
}

/**
 * Cleanup store subscription
 */
export function cleanupStoreTracking(): void {
  if (storeUnsubscribe) {
    storeUnsubscribe();
    storeUnsubscribe = null;
  }
}

/**
 * Generate a summary report for completed operations (for baseline measurements)
 */
export function generateSyncReport(): string {
  if (!__DEV__) return 'Sync X-Ray not available in production';

  const stats = exportTimingStats();
  const report = [];

  report.push('🔍 SYNC X-RAY TIMING REPORT');
  report.push('=' .repeat(50));
  report.push(`Total Operations Tracked: ${stats.totalOperations}`);
  report.push(`Currently Active: ${stats.activeOperations}`);
  report.push(`Completed: ${stats.recentCompleted.length}`);
  report.push('');

  if (stats.recentCompleted.length > 0) {
    report.push('📊 END-TO-END LATENCY SUMMARY');
    report.push('-'.repeat(30));
    report.push(`Median: ${stats.statistics.medianE2E.toFixed(1)}ms`);
    report.push(`P90: ${stats.statistics.p90E2E.toFixed(1)}ms`);
    report.push(`P95: ${stats.statistics.p95E2E.toFixed(1)}ms`);
    report.push('');

    report.push('⏱️  TIMING BREAKDOWN BY STAGE');
    report.push('-'.repeat(30));
    for (const [stage, percentiles] of Object.entries(stats.statistics.deltaStats)) {
      report.push(`${stage.padEnd(20)} | Med: ${percentiles.median.toFixed(1)}ms | P90: ${percentiles.p90.toFixed(1)}ms | P95: ${percentiles.p95.toFixed(1)}ms`);
    }
    report.push('');

    // Show details for slowest operations
    const sortedOps = stats.recentCompleted
      .filter(op => op.marks.has(SyncTimingMark.T6_UI_RECONCILED))
      .map(op => ({
        id: op.id,
        total: (op.marks.get(SyncTimingMark.T6_UI_RECONCILED)! - op.startTime),
        deltas: getOperationDeltas(op)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);

    if (sortedOps.length > 0) {
      report.push('🐌 SLOWEST OPERATIONS');
      report.push('-'.repeat(30));
      for (const [index, op] of sortedOps.entries()) {
        report.push(`#${index + 1}: ${op.id} (${op.total.toFixed(1)}ms total)`);
        for (const { mark, delta } of op.deltas) {
          report.push(`  ${mark}: ${delta.toFixed(1)}ms`);
        }
        report.push('');
      }
    }
  } else {
    report.push('No completed operations to analyze.');
  }

  return report.join('\n');
}

/**
 * Console log a formatted timing report (for easy testing)
 */
export function logSyncReport(): void {
  if (!__DEV__) return;
  console.log('\n' + generateSyncReport() + '\n');
}

/**
 * Generate fast-path specific report with Phase A targets
 */
export function generateFastPathReport(): string {
  if (!__DEV__) return 'Fast-path report not available in production';

  // Import fast-path metrics
  let fastPathMetrics;
  try {
    const { FastPathSyncService } = require('@/services/fastPathSync');
    fastPathMetrics = FastPathSyncService.getMetrics();
  } catch (error) {
    return 'Fast-path service not available';
  }

  const stats = exportTimingStats();
  const report = [];

  report.push('🚀 FAST-PATH SYNC REPORT (Phase A)');
  report.push('=' .repeat(50));

  // Fast-path specific metrics
  report.push('📈 FAST-PATH OPERATIONS');
  report.push('-'.repeat(25));
  report.push(`Total Processed: ${fastPathMetrics.totalProcessed}`);
  report.push(`Coalesced: ${fastPathMetrics.coalesced}`);
  report.push(`De-duplicated: ${fastPathMetrics.deduped}`);
  report.push(`Errors: ${fastPathMetrics.errors}`);
  report.push('');

  report.push('⚡ FAST-PATH LATENCY');
  report.push('-'.repeat(25));
  report.push(`Median: ${fastPathMetrics.medianLatency.toFixed(1)}ms`);
  report.push(`P90: ${fastPathMetrics.p90Latency.toFixed(1)}ms`);
  report.push(`P95: ${fastPathMetrics.p95Latency.toFixed(1)}ms`);
  report.push('');

  // Phase A targets check
  report.push('🎯 PHASE A TARGETS (≤2s E2E)');
  report.push('-'.repeat(25));
  const medianE2E = stats.statistics.medianE2E;
  const p90E2E = stats.statistics.p90E2E;

  const medianTarget = medianE2E <= 1000;
  const p90Target = p90E2E <= 2000;

  report.push(`Median E2E: ${medianE2E.toFixed(1)}ms ${medianTarget ? '✅' : '❌'} (target: ≤1000ms)`);
  report.push(`P90 E2E: ${p90E2E.toFixed(1)}ms ${p90Target ? '✅' : '❌'} (target: ≤2000ms)`);
  report.push(`Overall: ${medianTarget && p90Target ? '✅ TARGETS MET' : '❌ NEEDS IMPROVEMENT'}`);
  report.push('');

  // Interactive vs background breakdown
  const interactiveOps = stats.recentCompleted.filter(op =>
    op.metadata?.status || op.type.includes('record')
  );

  if (interactiveOps.length > 0) {
    report.push('🎮 INTERACTIVE vs BACKGROUND');
    report.push('-'.repeat(25));
    report.push(`Interactive Ops: ${interactiveOps.length}`);
    report.push(`Background Ops: ${stats.recentCompleted.length - interactiveOps.length}`);
    report.push('');
  }

  return report.join('\n');
}

/**
 * Log fast-path report to console
 */
export function logFastPathReport(): void {
  if (!__DEV__) return;
  console.log('\n' + generateFastPathReport() + '\n');
}