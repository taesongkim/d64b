import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import CommitmentGrid from './CommitmentGrid';
import ViewToggle from './ViewToggle';
import { useFontStyle } from '@/hooks/useFontStyle';
import type { FriendChartData } from '@/services/friends';
import { RecordStatus } from '@/store/slices/recordsSlice';

interface FriendChartProps {
  friendChartData: FriendChartData;
  onFriendPress?: (friendId: string, friendName: string) => void;
}

export default function FriendChart({ 
  friendChartData, 
  onFriendPress 
}: FriendChartProps): React.JSX.Element {
  const fontStyle = useFontStyle();
  const { friend, commitments, records } = friendChartData;
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');

  const handleCellPress = (commitmentId: string, date: string) => {
    // Friends' charts are read-only - no interaction allowed
    console.log('👀 Viewing friend chart - no interaction allowed');
  };

  const handleSetRecordStatus = (commitmentId: string, date: string, status: RecordStatus) => {
    // Friends' charts are read-only - no interaction allowed
    console.log('👀 Viewing friend chart - no interaction allowed');
  };

  const handleFriendPress = () => {
    if (onFriendPress) {
      onFriendPress(friend.id, friend.full_name || friend.email);
    }
  };

  return (
    <View style={styles.container}>
      {/* Friend Header with Toggle */}
      <View style={styles.friendHeader}>
        <TouchableOpacity 
          style={styles.friendInfoSection}
          onPress={handleFriendPress}
          activeOpacity={0.7}
        >
          <View style={styles.friendAvatar}>
            <Text style={[styles.friendAvatarText, fontStyle]}>
              {(friend.full_name || friend.email).charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.friendInfo}>
            <Text style={[styles.friendName, fontStyle]} numberOfLines={1}>
              {friend.full_name || friend.email}
            </Text>
            <Text style={[styles.friendStats, fontStyle]}>
              {commitments.length} habit{commitments.length !== 1 ? 's' : ''} • {records.filter(r => r.status === 'completed').length} completed
            </Text>
          </View>
        </TouchableOpacity>
        
        {/* Toggle for this friend's chart */}
        <ViewToggle 
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </View>

      {/* Friend's Commitment Grid or Empty State */}
      {commitments.length > 0 ? (
        <CommitmentGrid
          commitments={commitments}
          records={records}
          onCellPress={handleCellPress}
          onSetRecordStatus={handleSetRecordStatus}
          hideToggle={true}
          viewMode={viewMode}
        />
      ) : (
        <View style={styles.emptyStateContainer}>
          <Text style={[styles.emptyStateText, fontStyle]}>
            No habits yet
          </Text>
          <Text style={[styles.emptyStateSubtext, fontStyle]}>
            {friend.full_name || friend.email} hasn't added any habits yet
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  friendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 8,
  },
  friendInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  friendAvatarText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  friendStats: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Manrope_400Regular',
  },
  emptyStateContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontFamily: 'Manrope_600SemiBold',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#D1D5DB',
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
  },
});
