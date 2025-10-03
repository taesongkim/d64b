import { useEffect, useRef } from 'react';
import { SyncState } from '@/hooks/useSyncStatus';

interface SyncIndicatorLiveActivityProps {
  state: SyncState;
}

let hasLoggedOnce = false;

export default function SyncIndicatorLiveActivity({ state }: SyncIndicatorLiveActivityProps) {
  const activityIdRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      // Dynamically import expo-live-activity to handle cases where it's not available
      import('expo-live-activity').then((LiveActivity) => {
        // Don't show Live Activity for idle state
        if (state.phase === 'idle' && state.queueCount === 0) {
          if (activityIdRef.current) {
            try {
              LiveActivity.stopActivity(activityIdRef.current, { title: '', subtitle: '' });
            } catch (error) {
              // Ignore stop errors to prevent crashes
            }
            activityIdRef.current = null;
          }
          return;
        }

        const getActivityState = () => {
          const baseState = {
            title: 'Sync Status',
            subtitle: getStatusMessage(),
            progressBar: state.phase === 'syncing' ? {
              date: new Date(Date.now() + 30 * 1000).getTime()
            } : undefined,
          };

          return baseState;
        };

        const getStatusMessage = () => {
          switch (state.phase) {
            case 'syncing':
              return `Syncing ${state.queueCount} items...`;
            case 'offline':
              return `Offline — ${state.queueCount} queued`;
            case 'error':
              return 'Sync error — tap to retry';
            case 'done':
              return 'All caught up';
            default:
              return 'Sync status';
          }
        };

        const getActivityAttributes = () => ({
          name: 'HabitTracker Sync',
          backgroundColor: state.phase === 'error' ? '#EF4444' : '#111827',
          titleColor: '#FFFFFF',
          subtitleColor: '#E5E7EB',
          progressViewTint: '#3B82F6',
          timerType: 'circular',
        });

        const activityState = getActivityState();
        const activityAttributes = getActivityAttributes();

        if (activityIdRef.current) {
          // Update existing activity
          LiveActivity.updateActivity(activityIdRef.current, activityState, activityAttributes);
        } else {
          // Start new activity
          activityIdRef.current = LiveActivity.startActivity(activityState, activityAttributes);

          if (!hasLoggedOnce) {
            console.info('📱 iOS Live Activity: Started Dynamic Island activity');
            hasLoggedOnce = true;
          }
        }
      }).catch(() => {
        if (!hasLoggedOnce) {
          // Fallback gracefully if expo-live-activity is not available
          hasLoggedOnce = true;
        }
      });
    } catch {
      if (!hasLoggedOnce) {
        // Fallback gracefully
        hasLoggedOnce = true;
      }
    }
  }, [state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activityIdRef.current) {
        try {
          import('expo-live-activity').then((LiveActivity) => {
            if (activityIdRef.current) {
              try {
                LiveActivity.stopActivity(activityIdRef.current, { title: '', subtitle: '' });
              } catch (error) {
                // Ignore stop errors during cleanup
              }
            }
          }).catch(() => {
            // Ignore cleanup errors
          });
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  // Return null as the actual UI is handled by the system Dynamic Island
  // The banner will be shown as fallback
  return null;
}