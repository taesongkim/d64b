import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
  Modal,
  Alert,
} from 'react-native';
import { isFeatureEnabled } from '@/config/features';
import { Icon } from '@/components/icons';

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  mutualFriends: number;
  currentStreak: number;
  completedToday: number;
  totalHabits: number;
  recentActivity: {
    habitName: string;
    date: string;
    completed: boolean;
  }[];
}

export default function FriendsListScreen(): React.JSX.Element {
  const [friends, setFriends] = useState<Friend[]>([
    {
      id: '1',
      name: 'Sarah Chen',
      username: '@sarahc',
      mutualFriends: 3,
      currentStreak: 15,
      completedToday: 4,
      totalHabits: 6,
      recentActivity: [
        { habitName: 'Morning Yoga', date: 'Today', completed: true },
        { habitName: 'Read 30 mins', date: 'Today', completed: true },
        { habitName: 'Meditation', date: 'Yesterday', completed: true },
      ],
    },
    {
      id: '2',
      name: 'Alex Rodriguez',
      username: '@alexr',
      mutualFriends: 5,
      currentStreak: 8,
      completedToday: 2,
      totalHabits: 4,
      recentActivity: [
        { habitName: 'Run 5K', date: 'Today', completed: true },
        { habitName: 'No Sugar', date: 'Today', completed: false },
        { habitName: 'Journal', date: 'Yesterday', completed: true },
      ],
    },
    {
      id: '3',
      name: 'Emma Wilson',
      username: '@emmaw',
      mutualFriends: 2,
      currentStreak: 23,
      completedToday: 5,
      totalHabits: 5,
      recentActivity: [
        { habitName: 'Water Intake', date: 'Today', completed: true },
        { habitName: 'Sleep 8 hours', date: 'Today', completed: true },
        { habitName: 'Workout', date: 'Today', completed: true },
      ],
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFriendUsername, setNewFriendUsername] = useState('');
  const [selectedTab, setSelectedTab] = useState<'friends' | 'discover'>('friends');

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddFriend = () => {
    if (newFriendUsername.trim()) {
      Alert.alert(
        'Friend Request Sent',
        `A friend request has been sent to ${newFriendUsername}`,
        [{ text: 'OK', onPress: () => {
          setNewFriendUsername('');
          setShowAddModal(false);
        }}]
      );
    }
  };

  const renderMiniHabitGrid = (friend: Friend) => {
    // Show last 7 days mini grid
    const days = Array(7).fill(0).map((_, i) => {
      const randomComplete = Math.random() > 0.3;
      return randomComplete;
    });

    return (
      <View style={styles.miniGrid}>
        {days.map((completed, index) => (
          <View
            key={index}
            style={[
              styles.miniGridCell,
              completed && styles.miniGridCellCompleted,
            ]}
          />
        ))}
      </View>
    );
  };

  const renderFriendCard = ({ item: friend }: { item: Friend }) => (
    <TouchableOpacity style={styles.friendCard}>
      <View style={styles.friendHeader}>
        <View style={styles.avatarContainer}>
          {friend.avatar ? (
            <Image source={{ uri: friend.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {friend.name.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
          )}
          {friend.currentStreak > 7 && (
          <View style={styles.streakBadge}>
            <Icon name="fire" size={14} color="#FF6B35" />
          </View>
          )}
        </View>
        
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{friend.name}</Text>
          <Text style={styles.friendUsername}>{friend.username}</Text>
          <Text style={styles.mutualFriends}>
            {friend.mutualFriends} mutual friends
          </Text>
        </View>

        <View style={styles.friendStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{friend.currentStreak}</Text>
            <Text style={styles.statLabel}>streak</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{friend.completedToday}/{friend.totalHabits}</Text>
            <Text style={styles.statLabel}>today</Text>
          </View>
        </View>
      </View>

      <View style={styles.activitySection}>
        <Text style={styles.activityTitle}>Recent Activity</Text>
        {renderMiniHabitGrid(friend)}
        <View style={styles.recentItems}>
          {friend.recentActivity.slice(0, 2).map((activity, index) => (
            <View key={index} style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Icon 
                  name={activity.completed ? 'activity-completed' : 'activity-failed'} 
                  size={16} 
                  color={activity.completed ? '#10B981' : '#EF4444'} 
                />
              </View>
              <Text style={styles.activityText} numberOfLines={1}>
                {activity.habitName}
              </Text>
              <Text style={styles.activityDate}>{activity.date}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderDiscoverCard = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.discoverCard}>
      <View style={styles.discoverHeader}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>
            {item.name.split(' ').map((n: string) => n[0]).join('')}
          </Text>
        </View>
        <View style={styles.discoverInfo}>
          <Text style={styles.friendName}>{item.name}</Text>
          <Text style={styles.friendUsername}>{item.username}</Text>
          <Text style={styles.discoverReason}>{item.reason}</Text>
        </View>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const discoverPeople = [
    { id: '1', name: 'John Doe', username: '@johnd', reason: 'Friend of Sarah' },
    { id: '2', name: 'Lisa Park', username: '@lisap', reason: '12 mutual friends' },
    { id: '3', name: 'Mike Johnson', username: '@mikej', reason: 'Similar habits' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Social</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.headerButtonText}>+ Add Friend</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'friends' && styles.tabActive]}
          onPress={() => setSelectedTab('friends')}
        >
          <Text style={[styles.tabText, selectedTab === 'friends' && styles.tabTextActive]}>
            Friends ({friends.length})
          </Text>
        </TouchableOpacity>
        {/* MVP-HIDDEN: Discover Tab - Enable in v1.1 */}
        {isFeatureEnabled('FRIEND_GROUPS') && (
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'discover' && styles.tabActive]}
            onPress={() => setSelectedTab('discover')}
          >
            <Text style={[styles.tabText, selectedTab === 'discover' && styles.tabTextActive]}>
              Discover
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={16} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search friends..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* MVP: Only show friends tab, hide discover for now */}
      <FlatList
        data={filteredFriends}
        renderItem={renderFriendCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="social" size={48} color="#9CA3AF" style={styles.emptyStateIcon} />
              <Text style={styles.emptyStateTitle}>No friends yet</Text>
              <Text style={styles.emptyStateText}>
                Add friends to see their progress and stay motivated together
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => setShowAddModal(true)}
              >
                <Text style={styles.emptyStateButtonText}>Find Friends</Text>
              </TouchableOpacity>
            </View>
          }
      />

      {/* Add Friend Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Friend</Text>
            <Text style={styles.modalDescription}>
              Enter their username or email to send a friend request
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="@username or email"
              placeholderTextColor="#9CA3AF"
              value={newFriendUsername}
              onChangeText={setNewFriendUsername}
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowAddModal(false);
                  setNewFriendUsername('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalAddButton}
                onPress={handleAddFriend}
              >
                <Text style={styles.modalAddText}>Send Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Manrope_700Bold',
    color: '#111827',
  },
  headerButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  headerButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: 'white',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Manrope_500Medium',
  },
  tabTextActive: {
    color: '#111827',
    fontFamily: 'Manrope_600SemiBold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  friendCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  friendHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Manrope_700Bold',
  },
  streakBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    color: '#111827',
  },
  friendUsername: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 1,
  },
  mutualFriends: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  friendStats: {
    alignItems: 'flex-end',
  },
  statItem: {
    alignItems: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Manrope_700Bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  activitySection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  activityTitle: {
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  miniGrid: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 8,
  },
  miniGridCell: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  miniGridCellCompleted: {
    backgroundColor: '#10B981',
  },
  recentItems: {
    gap: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activityIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
  },
  activityDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  discoverCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  discoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discoverInfo: {
    flex: 1,
    marginLeft: 12,
  },
  discoverReason: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: '#111827',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: 'Manrope_600SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  emptyStateButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Manrope_700Bold',
    color: '#111827',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#6B7280',
    fontSize: 16,
    fontFamily: 'Manrope_500Medium',
  },
  modalAddButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  modalAddText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
  },
});