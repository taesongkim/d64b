import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { store } from '@/store';
import { triggerFriendsChartsRefresh } from '@/hooks/useFriendsCharts';
import { getUserCommitments } from './commitments';
import { setCommitments } from '@/store/slices/commitmentsSlice';

export interface SyncSchedulerConfig {
  periodicInterval: number; // milliseconds
  enabled: boolean;
}

class SyncScheduler {
  private config: SyncSchedulerConfig = {
    periodicInterval: 5 * 60 * 1000, // 5 minutes
    enabled: true,
  };

  private periodicTimer: NodeJS.Timeout | null = null;
  private appStateSubscription: any = null;
  private networkStateSubscription: any = null;
  private isOnline: boolean = true;
  private appState: AppStateStatus = 'active';

  constructor() {
    this.setupAppStateListener();
    this.setupNetworkListener();
  }

  public start() {
    if (!this.config.enabled) return;

    console.log('🔄 SyncScheduler: Starting periodic sync');
    this.startPeriodicSync();
  }

  public stop() {
    console.log('🛑 SyncScheduler: Stopping sync');
    this.stopPeriodicSync();
  }

  public configure(config: Partial<SyncSchedulerConfig>) {
    this.config = { ...this.config, ...config };

    if (this.config.enabled && this.periodicTimer === null) {
      this.start();
    } else if (!this.config.enabled && this.periodicTimer !== null) {
      this.stop();
    }
  }

  public async triggerManualSync() {
    console.log('🔄 SyncScheduler: Manual sync triggered');
    await this.performSync();
  }

  private setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      const wasInBackground = this.appState === 'background';
      const isNowActive = nextAppState === 'active';

      this.appState = nextAppState;

      if (wasInBackground && isNowActive) {
        console.log('📱 SyncScheduler: App foregrounded, triggering sync');
        this.performSync();
        this.startPeriodicSync();
      } else if (nextAppState === 'background') {
        console.log('📱 SyncScheduler: App backgrounded, stopping periodic sync');
        this.stopPeriodicSync();
      }
    });
  }

  private setupNetworkListener() {
    this.networkStateSubscription = NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      const isNowOnline = state.isConnected === true;

      this.isOnline = isNowOnline;

      if (wasOffline && isNowOnline) {
        console.log('🌐 SyncScheduler: Network reconnected, triggering sync');
        this.performSync();
      }
    });
  }

  private startPeriodicSync() {
    if (this.periodicTimer || this.appState !== 'active' || !this.isOnline) {
      return;
    }

    this.periodicTimer = setInterval(() => {
      if (this.appState === 'active' && this.isOnline) {
        console.log('⏰ SyncScheduler: Periodic sync triggered');
        this.performSync();
      }
    }, this.config.periodicInterval);
  }

  private stopPeriodicSync() {
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
      this.periodicTimer = null;
    }
  }

  private currentUserId: string | null = null;

  public setUserId(userId: string | null) {
    this.currentUserId = userId;
  }

  private async performSync() {
    if (!this.isOnline) {
      console.log('🔄 SyncScheduler: Skipping sync - offline');
      return;
    }

    if (!this.currentUserId) {
      console.log('🔄 SyncScheduler: No authenticated user, skipping sync');
      return;
    }

    try {
      console.log('🔄 SyncScheduler: Starting sync operations...');

      // Sync commitments data
      await this.syncCommitments(this.currentUserId);

      // Refresh friends charts
      triggerFriendsChartsRefresh();

      console.log('✅ SyncScheduler: Sync completed successfully');

    } catch (error) {
      console.error('❌ SyncScheduler: Sync failed:', error);
    }
  }

  private async syncCommitments(userId: string) {
    try {
      console.log('📊 SyncScheduler: Syncing commitments...');

      const { commitments: dbCommitments, error } = await getUserCommitments(userId);

      if (error) {
        console.error('❌ SyncScheduler: Failed to fetch commitments:', error);
        return;
      }

      if (dbCommitments && dbCommitments.length >= 0) {
        // Convert to Redux format
        const convertedCommitments = dbCommitments.map(c => ({
          id: c.id,
          userId: c.user_id,
          title: c.title,
          description: c.description || undefined,
          color: c.color,
          commitmentType: c.commitment_type || 'checkbox',
          target: c.target,
          unit: c.unit,
          requirements: c.requirements,
          ratingRange: c.rating_range,
          type: c.commitment_type === 'checkbox' && !c.requirements ? 'binary' as const :
                c.commitment_type === 'checkbox' && c.requirements ? 'binary' as const :
                c.commitment_type === 'measurement' && c.rating_range ? 'counter' as const : 'timer' as const,
          streak: 0, // Will be calculated from records
          bestStreak: 0, // Will be calculated from records
          isActive: c.is_active,
          isPrivate: c.is_private || false,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
          archived: c.archived || false,
          deletedAt: c.deleted_at || null,
        }));

        // Smart merge with existing Redux state to respect local changes
        const currentState = store.getState();
        const currentCommitments = currentState.commitments.commitments;
        const syncQueue = currentState.sync.queue;

        // Create a map of commitments that have pending sync operations
        const pendingSyncCommitmentIds = new Set(
          syncQueue
            .filter(item => item.entity === 'commitment')
            .map(item => item.entityId)
        );

        // Merge logic: prefer local state for items with pending sync operations
        const mergedCommitments = convertedCommitments.map(dbCommitment => {
          const hasPendingSync = pendingSyncCommitmentIds.has(dbCommitment.id);
          const localCommitment = currentCommitments.find(c => c.id === dbCommitment.id);

          if (hasPendingSync && localCommitment) {
            // Keep local state for items that have pending sync operations
            // But update non-conflicting fields from database
            return {
              ...dbCommitment,
              archived: localCommitment.archived,
              deletedAt: localCommitment.deletedAt,
              isActive: localCommitment.isActive,
            };
          }

          return dbCommitment;
        });

        // Add any local-only commitments that might not exist in database yet
        const dbCommitmentIds = new Set(convertedCommitments.map(c => c.id));
        const localOnlyCommitments = currentCommitments.filter(
          c => !dbCommitmentIds.has(c.id)
        );

        const finalCommitments = [...mergedCommitments, ...localOnlyCommitments];

        // Update Redux store with smart-merged data
        store.dispatch(setCommitments(finalCommitments));

        console.log('✅ SyncScheduler: Commitments synced');
      }

    } catch (error) {
      console.error('❌ SyncScheduler: Commitments sync failed:', error);
    }
  }

  public destroy() {
    this.stop();

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    if (this.networkStateSubscription) {
      this.networkStateSubscription();
    }
  }
}

// Export singleton instance
export const syncScheduler = new SyncScheduler();

// Convenience functions
export const startSync = () => syncScheduler.start();
export const stopSync = () => syncScheduler.stop();
export const configureSync = (config: Partial<SyncSchedulerConfig>) => syncScheduler.configure(config);
export const triggerManualSync = () => syncScheduler.triggerManualSync();
export const setSyncUserId = (userId: string | null) => syncScheduler.setUserId(userId);