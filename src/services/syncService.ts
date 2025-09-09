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
// import { DatabaseService } from './database'; // Disabled - using Supabase

const MAX_RETRY_COUNT = 3;
const RETRY_DELAY = 5000; // 5 seconds

export class SyncService {
  private static syncInterval: NodeJS.Timeout | null = null;
  private static isInitialized = false;

  /**
   * Initialize the sync service
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Monitor network connectivity
    NetInfo.addEventListener(state => {
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
          console.log(`Successfully synced item ${item.id}`);
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);
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
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));

    // TODO: Replace with actual API endpoints
    const apiEndpoint = process.env.EXPO_PUBLIC_API_URL || 'https://api.example.com';
    
    switch (item.type) {
      case 'CREATE':
        // await fetch(`${apiEndpoint}/commitments`, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(item.data)
        // });
        console.log('Would sync CREATE commitment:', item.data);
        break;
        
      case 'UPDATE':
        // await fetch(`${apiEndpoint}/commitments/${item.entityId}`, {
        //   method: 'PUT',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(item.data)
        // });
        console.log('Would sync UPDATE commitment:', item.data);
        break;
        
      case 'DELETE':
        // await fetch(`${apiEndpoint}/commitments/${item.entityId}`, {
        //   method: 'DELETE'
        // });
        console.log('Would sync DELETE commitment:', item.entityId);
        break;
    }
  }

  /**
   * Sync record with server
   */
  private static async syncRecord(item: SyncAction): Promise<void> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));

    // TODO: Replace with actual API endpoints
    const apiEndpoint = process.env.EXPO_PUBLIC_API_URL || 'https://api.example.com';
    
    switch (item.type) {
      case 'CREATE':
        // await fetch(`${apiEndpoint}/records`, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(item.data)
        // });
        console.log('Would sync CREATE record:', item.data);
        break;
        
      case 'UPDATE':
        // await fetch(`${apiEndpoint}/records/${item.entityId}`, {
        //   method: 'PUT',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(item.data)
        // });
        console.log('Would sync UPDATE record:', item.data);
        break;
        
      case 'DELETE':
        // await fetch(`${apiEndpoint}/records/${item.entityId}`, {
        //   method: 'DELETE'
        // });
        console.log('Would sync DELETE record:', item.entityId);
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
}