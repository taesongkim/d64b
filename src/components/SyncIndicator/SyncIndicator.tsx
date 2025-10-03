import React from 'react';
import { Platform } from 'react-native';
import { useAppSelector } from '@/store/hooks';
import SyncIndicatorBanner from './SyncIndicatorBanner';
import SyncIndicatorLiveActivity from './SyncIndicatorLiveActivity.ios';
import SyncIndicatorOngoingNotification from './SyncIndicatorOngoingNotification.android';
import { useSyncStatus } from '@/hooks/useSyncStatus';

export default function SyncIndicator() {
  const syncState = useSyncStatus();
  const useSystemSurfaces = useAppSelector(
    (state) => state.settings.featureFlags?.sync?.useSystemSurfaces ?? false
  );

  if (syncState.phase === 'idle' && syncState.queueCount === 0) {
    return null;
  }

  if (useSystemSurfaces) {
    if (Platform.OS === 'ios') {
      return (
        <>
          <SyncIndicatorLiveActivity state={syncState} />
          <SyncIndicatorBanner state={syncState} />
        </>
      );
    } else if (Platform.OS === 'android') {
      return (
        <>
          <SyncIndicatorOngoingNotification state={syncState} />
          <SyncIndicatorBanner state={syncState} />
        </>
      );
    }
  }

  return <SyncIndicatorBanner state={syncState} />;
}