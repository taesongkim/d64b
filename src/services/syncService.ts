import NetInfo from '@react-native-community/netinfo';
import { store } from '@/store';
import {
  setSyncing,
  removeFromQueue,
  incrementRetryCount,
  setOnlineStatus,
  setSyncError,
  setLastSyncAt,
  type SyncAction
} from '@/store/slices/syncSlice';
import * as commitmentService from './commitments';
import { addRecord } from '@/store/slices/recordsSlice';
// import { DatabaseService } from './database'; // Disabled - using Supabase

const MAX_RETRY_COUNT = 3;
const RETRY_DELAY = 5000; // 5 seconds

export class SyncService {
  private static syncInterval: NodeJS.Timeout | null = null;
  private static isInitialized = false;
  private static abortController: AbortController | null = null;
  private static netInfoUnsubscribe: (() => void) | null = null;

  /**
   * Initialize the sync service
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Monitor network connectivity
    this.netInfoUnsubscribe = NetInfo.addEventListener(state => {
      const isOnline = state.isConnected && state.isInternetReachable;
      store.dispatch(setOnlineStatus(isOnline ?? false));

      if (isOnline) {
        console.log('Network connected, starting sync...');
        this.startSync();
      } else {
        console.log('Network disconnected, stopping sync...');
        this.stopSync();
      }
    });

    // Initial network check
    const networkState = await NetInfo.fetch();
    const isOnline = networkState.isConnected && networkState.isInternetReachable;
    store.dispatch(setOnlineStatus(isOnline ?? false));

    // Start periodic sync if online
    if (isOnline) {
      this.startSync();
    }

    this.isInitialized = true;
    console.log('Sync service initialized');
  }

  /**
   * Start periodic sync process
   */
  private static startSync(): void {
    if (this.syncInterval) return;

    // Immediate sync
    this.processSyncQueue();

    // Periodic sync every 30 seconds
    this.syncInterval = setInterval(() => {
      this.processSyncQueue();
    }, 30000);
  }

  /**
   * Stop periodic sync process
   */
  private static stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Process the sync queue
   */
  private static async processSyncQueue(): Promise<void> {
    const state = store.getState();

    if (!state.sync.isOnline || state.sync.isSyncing || state.sync.queue.length === 0) {
      return;
    }

    store.dispatch(setSyncing(true));
    console.log(`Processing sync queue with ${state.sync.queue.length} items`);

    try {
      const queue = state.sync.queue;
      
      for (const item of queue) {

        if (item.retryCount >= MAX_RETRY_COUNT) {
          console.warn(`Max retry count reached for item ${item.id}, removing from queue`);
          store.dispatch(removeFromQueue(item.id));
          continue;
        }

        try {
          await this.syncItem(item);
          store.dispatch(removeFromQueue(item.id));
          console.log(`✅ Successfully synced item ${item.id}`);
        } catch (error) {
          console.error(`❌ Failed to sync item ${item.id}:`, error);
          store.dispatch(incrementRetryCount(item.id));

          // Add delay before next retry
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }

      store.dispatch(setLastSyncAt(new Date().toISOString()));
      store.dispatch(setSyncError(null));
    } catch (error) {
      console.error('Sync queue processing failed:', error);
      store.dispatch(setSyncError(error instanceof Error ? error.message : 'Sync failed'));
    } finally {
      store.dispatch(setSyncing(false));
    }
  }

  /**
   * Sync individual item with server
   */
  private static async syncItem(item: SyncAction): Promise<void> {
    // TODO: Replace with actual API calls to your backend
    // This is a placeholder that simulates API calls
    
    switch (item.entity) {
      case 'commitment':
        return this.syncCommitment(item);
      case 'record':
        return this.syncRecord(item);
      default:
        throw new Error(`Unknown entity type: ${item.entity}`);
    }
  }

  /**
   * Sync commitment with server
   */
  private static async syncCommitment(item: SyncAction): Promise<void> {
    console.log(`Syncing commitment ${item.type}:`, { entityId: item.entityId });

    switch (item.type) {
      case 'CREATE':
        console.log('Would sync CREATE commitment:', item.data);
        break;

      case 'UPDATE':
        // Handle archive/delete operations based on data payload
        const data = item.data;

        if (data.idempotencyKey?.includes(':archive')) {
          const result = await commitmentService.setArchived(item.entityId, data.archived, { is_active: data.is_active });
          if (result.error) {
            throw new Error(`setArchived failed: ${result.error.message}`);
          }
          console.log(`Synced archive status for commitment ${item.entityId}`);
        } else if (data.idempotencyKey?.includes(':restore')) {
          await commitmentService.setArchived(item.entityId, data.archived, { is_active: data.is_active });
          await commitmentService.setDeletedAt(item.entityId, data.deletedAt, { is_active: data.is_active });
          console.log(`Synced restore for commitment ${item.entityId}`);
        } else if (data.idempotencyKey?.includes(':deletedAt:')) {
          await commitmentService.setDeletedAt(item.entityId, data.deletedAt, { is_active: data.is_active });
          await commitmentService.setArchived(item.entityId, data.archived, { is_active: data.is_active });
          console.log(`Synced soft delete for commitment ${item.entityId}`);
        } else if (data.idempotencyKey?.includes(':showValues:')) {
          // Handle show_values toggle update
          const result = await commitmentService.updateCommitment(item.entityId, { show_values: data.show_values });
          if (result.error) {
            throw new Error(`updateCommitment show_values failed: ${result.error.message}`);
          }
          console.log(`Synced show_values=${data.show_values} for commitment ${item.entityId}`);
        } else if (data.idempotencyKey?.startsWith('move:')) {
          // Handle commitment reordering
          const result = await commitmentService.updateOrderRank(item.entityId, data.order_rank);
          if (result.error) {
            throw new Error(`updateOrderRank failed: ${result.error.message}`);
          }
          console.log(`Synced order_rank=${data.order_rank} for commitment ${item.entityId}`);
        } else {
          // Regular update
          console.log('No matching idempotency pattern for UPDATE');
        }
        break;

      case 'DELETE':
        if (item.data?.idempotencyKey?.includes(':permaDelete:')) {
          await commitmentService.permanentDelete(item.entityId);
          console.log(`Synced permanent delete for commitment ${item.entityId}`);
        } else {
          console.log('Would sync DELETE commitment:', item.entityId);
        }
        break;
    }
  }

  /**
   * Sync record with server
   */
  private static async syncRecord(item: SyncAction): Promise<void> {

    switch (item.type) {
      case 'CREATE':
        // Use Supabase upsert for records
        const { upsertCommitmentRecord } = await import('./commitments');
        const result = await upsertCommitmentRecord(item.data);
        if (result.error) {
          throw new Error(`upsertCommitmentRecord failed: ${result.error.message}`);
        }

        // Update Redux with the real database record (with proper ID)
        if (result.data) {
          const updatedRecord = {
            id: result.data.id,
            userId: result.data.user_id,
            commitmentId: result.data.commitment_id,
            date: result.data.completed_at.split('T')[0], // Extract date part
            status: result.data.status === 'complete' ? 'completed' as const : result.data.status,
            value: result.data.value,
            notes: result.data.notes,
            createdAt: result.data.created_at,
            updatedAt: result.data.updated_at,
          };
          store.dispatch(addRecord(updatedRecord));
        }
        console.log(`✅ Synced CREATE record for ${item.entityId}`);
        break;

      case 'UPDATE':
        // For records, UPDATE is the same as CREATE (upsert)
        const { upsertCommitmentRecord: upsertUpdate } = await import('./commitments');
        const updateResult = await upsertUpdate(item.data);
        if (updateResult.error) {
          throw new Error(`upsertCommitmentRecord failed: ${updateResult.error.message}`);
        }

        // Update Redux with the real database record (with proper ID)
        if (updateResult.data) {
          const updatedRecord = {
            id: updateResult.data.id,
            userId: updateResult.data.user_id,
            commitmentId: updateResult.data.commitment_id,
            date: updateResult.data.completed_at.split('T')[0], // Extract date part
            status: updateResult.data.status === 'complete' ? 'completed' as const : updateResult.data.status,
            value: updateResult.data.value,
            notes: updateResult.data.notes,
            createdAt: updateResult.data.created_at,
            updatedAt: updateResult.data.updated_at,
          };
          store.dispatch(addRecord(updatedRecord));
        }
        console.log(`✅ Synced UPDATE record for ${item.entityId}`);
        break;

      case 'DELETE':
        // Delete record by commitment_id and date
        const { deleteCommitmentRecordByDate } = await import('./commitments');
        const deleteResult = await deleteCommitmentRecordByDate(
          item.data.commitment_id,
          item.data.completed_at
        );
        if (deleteResult.error) {
          throw new Error(`deleteCommitmentRecordByDate failed: ${deleteResult.error.message}`);
        }
        // Note: For DELETE, we don't need to update Redux since the record should already be removed
        console.log(`✅ Synced DELETE record for ${item.entityId}`);
        break;
    }
  }

  /**
   * Force sync now (manual trigger)
   */
  static async forcSync(): Promise<void> {
    const state = store.getState();
    
    if (!state.sync.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    if (state.sync.isSyncing) {
      throw new Error('Sync already in progress');
    }

    await this.processSyncQueue();
  }

  /**
   * Get sync status
   */
  static getSyncStatus() {
    const state = store.getState();
    return {
      isOnline: state.sync.isOnline,
      isSyncing: state.sync.isSyncing,
      queueLength: state.sync.queue.length,
      lastSyncAt: state.sync.lastSyncAt,
      error: state.sync.error,
    };
  }

  /**
   * Clear sync error
   */
  static clearSyncError(): void {
    store.dispatch(setSyncError(null));
  }

  /**
   * Stop sync service completely (for logout/cleanup)
   */
  static stop(): void {
    console.log('Stopping sync service...');

    // Stop periodic sync
    this.stopSync();

    // Abort any in-flight requests
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Unsubscribe from network listeners
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }

    // Reset initialization flag
    this.isInitialized = false;

    // Clear any pending sync state
    store.dispatch(setSyncing(false));
    store.dispatch(setSyncError(null));

    console.log('Sync service stopped');
  }
}