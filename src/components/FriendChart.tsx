import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import CommitmentGrid from './CommitmentGrid';
import ViewToggle from './ViewToggle';
import AnimalAvatar from './AnimalAvatar';
import { useFontStyle } from '@/hooks/useFontStyle';
import { useSemanticColors, useThemeMode } from '@/contexts/ThemeContext';
import { getGridColors } from '@/components/grids/gridPalette';
import { getThemeColors } from '@/constants/grayscaleTokens';
import type { FriendChartData } from '@/services/friends';
import { RecordStatus } from '@/store/slices/recordsSlice';
import { AnimalType, ColorType } from '@/utils/avatarUtils';
import { filterItemsForEmergencyRollback } from '@/utils/emergencyRollback';

interface FriendChartProps {
  friendChartData: FriendChartData;
  onFriendPress?: (friendId: string, friendName: string) => void;
}

export default function FriendChart({
  friendChartData,
  onFriendPress
}: FriendChartProps): React.JSX.Element {
  const fontStyle = useFontStyle();
  const semanticColors = useSemanticColors();
  const themeMode = useThemeMode();
  const gridColors = getGridColors(themeMode);
  const colors = getThemeColors(themeMode);
  const { friend, commitments, layoutItems, records } = friendChartData;
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');

  // Filter out hidden layout items for friend view and apply emergency rollback
  const visibleLayoutItems = filterItemsForEmergencyRollback(
    layoutItems.filter(item => !item.hidden)
  );


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
          <View style={styles.avatarContainer}>
            <AnimalAvatar
              animal={friend.avatar_animal as AnimalType}
              color={friend.avatar_color as ColorType}
              size={40}
              showInitials={true}
              name={friend.full_name || friend.email}
            />
          </View>
          <View style={styles.friendInfo}>
            <Text style={[styles.friendName, fontStyle, { color: semanticColors.primaryText }]} numberOfLines={1}>
              {friend.full_name || friend.email}
            </Text>
            <Text style={[styles.friendStats, fontStyle, { color: colors.gray500 }]}>
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
          layoutItems={visibleLayoutItems}
          records={records}
          onCellPress={handleCellPress}
          onSetRecordStatus={handleSetRecordStatus}
          hideToggle={true}
          viewMode={viewMode}
        />
      ) : (
        <View style={[styles.emptyStateContainer, { backgroundColor: themeMode === 'light' ? colors.gray200 : colors.gray200 }]}>
          <Text style={[styles.emptyStateSubtext, fontStyle, { color: themeMode === 'light' ? colors.gray500 : colors.gray400 }]}>
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
  avatarContainer: {
    marginRight: 12,
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
    fontFamily: 'Manrope_400Regular',
  },
  emptyStateContainer: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    borderRadius: 8,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
  },
});
