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

    console.log(`🔍 [SYNC-DEBUG] processSyncQueue called:`, {
      isOnline: state.sync.isOnline,
      isSyncing: state.sync.isSyncing,
      queueLength: state.sync.queue.length
    });

    if (!state.sync.isOnline || state.sync.queue.length === 0) {
      console.log(`🔍 [SYNC-DEBUG] Early return from processSyncQueue:`, {
        reason: !state.sync.isOnline ? 'offline' : 'empty queue'
      });
      return;
    }

    // Handle deadlock: if isSyncing is true but we have items to process, reset the state
    if (state.sync.isSyncing) {
      console.warn(`🔧 [SYNC-DEBUG] Detected sync deadlock - resetting isSyncing state. Queue has ${state.sync.queue.length} items.`);
      store.dispatch(setSyncing(false));
      // Small delay to ensure state update is processed
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    store.dispatch(setSyncing(true));
    console.log(`Processing sync queue with ${state.sync.queue.length} items`);

    // Detailed queue inspection
    console.log(`🔍 [SYNC-QUEUE-DEBUG] Queue contents:`, state.sync.queue.map((item, index) => ({
      index,
      id: item.id,
      entity: item.entity,
      type: item.type,
      entityId: item.entityId,
      entityIdType: typeof item.entityId,
      retryCount: item.retryCount,
      hasData: !!item.data,
      dataUserId: item.data?.userId || item.data?.user_id,
      dataKeys: item.data ? Object.keys(item.data) : 'no data',
      isTemp: item.entityId?.startsWith('temp-')
    })));

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
      case 'layout_item':
        return this.syncLayoutItem(item);
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
          console.log(`🔄 DEBUG: Restore sync data:`, {
            entityId: item.entityId,
            archived: data.archived,
            deletedAt: data.deletedAt,
            is_active: data.is_active,
            fullData: data
          });

          const archivedResult = await commitmentService.setArchived(item.entityId, data.archived, { is_active: data.is_active });
          if (archivedResult.error) {
            console.error(`❌ setArchived failed in restore:`, archivedResult.error);
            throw new Error(`setArchived failed: ${archivedResult.error.message}`);
          }
          console.log(`✅ setArchived success in restore:`, archivedResult.data);

          const deletedResult = await commitmentService.setDeletedAt(item.entityId, data.deletedAt, { is_active: data.is_active });
          if (deletedResult.error) {
            console.error(`❌ setDeletedAt failed in restore:`, deletedResult.error);
            throw new Error(`setDeletedAt failed: ${deletedResult.error.message}`);
          }
          console.log(`✅ setDeletedAt success in restore:`, deletedResult.data);

          console.log(`✅ Synced restore for commitment ${item.entityId}`);
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
   * Sync layout item with server
   */
  private static async syncLayoutItem(item: SyncAction): Promise<void> {
    console.log(`🔍 [SYNC-LAYOUT-DEBUG] About to sync layout item ${item.type}:`, {
      entityId: item.entityId,
      isTemp: item.entityId.startsWith('temp-spacer-'),
      entityIdType: typeof item.entityId,
      entityIdValue: item.entityId,
      data: item.data,
      userId: item.data?.userId || item.data?.user_id,
      hasUserId: !!(item.data?.userId || item.data?.user_id),
      userIdType: typeof (item.data?.userId || item.data?.user_id),
      idempotencyKey: item.data?.idempotencyKey,
      dataKeys: item.data ? Object.keys(item.data) : 'no data'
    });

    // Skip temp spacer IDs - they should never be synced with UPDATE operations
    if (item.entityId.startsWith('temp-spacer-') && item.type === 'UPDATE') {
      console.log(`⚠️ Skipping UPDATE for temp spacer ${item.entityId} - temp spacers should only be CREATE operations`);
      return; // Don't throw error, just skip
    }

    // Validate UUID format for non-temp IDs
    if (!item.entityId.startsWith('temp-') && (item.entityId === 'undefined' || !item.entityId || typeof item.entityId !== 'string')) {
      console.error(`❌ Invalid entityId for layout item sync: ${item.entityId}`);
      throw new Error(`Invalid entityId: ${item.entityId}`);
    }

    // Validate userId exists - if invalid, mark item for removal instead of throwing error
    const userId = item.data?.userId || item.data?.user_id;
    if (!userId || userId === 'undefined') {
      console.warn(`🗑️ [SYNC-CLEANUP] Removing sync item with invalid userId: ${userId}. Item ID: ${item.id}`);
      // Remove the problematic item from queue immediately
      store.dispatch(removeFromQueue(item.id));
      return; // Skip processing this item
    }

    switch (item.type) {
      case 'CREATE':
        // For new spacers, we already created them in the R2 save logic
        // This sync action is mainly for verification/redundancy
        // Check if the item already exists, if not create it
        try {
          const { createLayoutItem } = await import('./layoutItems');
          const spacerData = item.data;
          await createLayoutItem({
            userId: spacerData.user_id || spacerData.userId,
            type: spacerData.type,
            height: spacerData.height,
            order_rank: spacerData.order_rank,
            isActive: spacerData.is_active !== undefined ? spacerData.is_active : true,
            archived: spacerData.archived || false,
            deletedAt: spacerData.deleted_at || null,
          });
          console.log(`Created layout item ${item.entityId} via sync`);
        } catch (error) {
          // If creation fails due to duplicate, that's fine - it means it already exists
          if (error?.message?.includes('duplicate') || error?.code === '23505') {
            console.log(`Layout item ${item.entityId} already exists, skipping CREATE`);
          } else {
            throw error;
          }
        }
        break;

      case 'UPDATE':
        // Handle layout item updates (mainly reordering)
        const data = item.data;

        console.log(`🔍 [SYNC-SERVICE-UPDATE-DEBUG] Processing UPDATE:`, {
          entityId: item.entityId,
          isTemp: item.entityId.startsWith('temp-spacer-'),
          idempotencyKey: data.idempotencyKey,
          startsWithMove: data.idempotencyKey?.startsWith('move:'),
          order_rank: data.order_rank,
          userId: data.user_id || data.userId
        });

        // Skip UPDATE operations for temp spacers - they should only be CREATE operations
        if (item.entityId.startsWith('temp-spacer-')) {
          console.log(`⚠️ Skipping UPDATE for temp spacer ${item.entityId} - temp spacers should only be CREATE operations`);
          break;
        }

        if (data.idempotencyKey?.startsWith('move:')) {
          // Handle layout item reordering
          const { updateLayoutItem } = await import('./layoutItems');
          await updateLayoutItem({
            id: item.entityId,
            userId: data.user_id || data.userId,
            order_rank: data.order_rank,
          });
          console.log(`✅ Synced order_rank=${data.order_rank} for layout item ${item.entityId}`);
        } else {
          // Regular update
          console.log('❌ No matching idempotency pattern for layout item UPDATE');
        }
        break;

      case 'DELETE':
        // Handle layout item deletion
        const { deleteLayoutItem } = await import('./layoutItems');
        await deleteLayoutItem(item.entityId, item.data.user_id || item.data.userId);
        console.log(`Synced DELETE for layout item ${item.entityId}`);
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