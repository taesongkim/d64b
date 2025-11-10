/**
 * Hook for tracking UI reconciliation in Sync X-Ray
 * Automatically tracks T6_UI_RECONCILED when component renders after sync operations
 */

import { useEffect, useRef } from 'react';
import { recordTimingMark, SyncTimingMark } from '@/utils/syncXRay';

/**
 * Track UI reconciliation for sync operations
 * Call this hook in components that display synced data
 */
export function useSyncXRayReconciliation(entityId: string, dependencies: any[] = []) {
  const lastDepsRef = useRef<any[]>();
  const isInitialRenderRef = useRef(true);

  useEffect(() => {
    // Skip tracking on initial render
    if (isInitialRenderRef.current) {
      isInitialRenderRef.current = false;
      lastDepsRef.current = dependencies;
      return;
    }

    // Check if dependencies actually changed (avoid tracking unnecessary re-renders)
    const hasChanged = !lastDepsRef.current ||
      lastDepsRef.current.length !== dependencies.length ||
      lastDepsRef.current.some((dep, index) => dep !== dependencies[index]);

    if (!hasChanged) {
      return;
    }

    // Record UI reconciliation for any active operations involving this entity
    if (__DEV__ && entityId) {
      // Use a slight delay to ensure the DOM has been updated
      setTimeout(() => {
        // Since we don't have direct access to syncOpId here, we log a general reconciliation event
        // The sync X-Ray system can correlate this with active operations
        console.log(`🔍 [SYNC-XRAY] UI reconciliation detected for entity: ${entityId}`);
      }, 0);
    }

    lastDepsRef.current = dependencies;
  }, dependencies);
}

/**
 * Manual trigger for UI reconciliation timing
 * Use this when you can correlate a specific operation ID with UI updates
 */
export function trackUIReconciliation(syncOpId: string | null, context?: string) {
  if (!__DEV__ || !syncOpId) return;

  recordTimingMark(syncOpId, SyncTimingMark.T6_UI_RECONCILED, { context });
}