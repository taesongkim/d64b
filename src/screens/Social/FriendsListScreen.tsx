import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { isFeatureEnabled } from '@/config/features';
import { Icon } from '@/components/icons';
import { useAuth } from '@/contexts/AuthContext';
import { 
  searchUsersByEmail, 
  sendFriendRequest, 
  getUserFriends,
  getPendingFriendRequests,
  getSentFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend,
  checkFriendshipStatus,
  type FriendProfile 
} from '@/services/friends';
import { triggerFriendsChartsRefresh } from '@/hooks/useFriendsCharts';
import AnimalAvatar from '@/components/AnimalAvatar';
import { AnimalType, ColorType } from '@/utils/avatarUtils';

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  avatar_animal?: string;
  avatar_color?: string;
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
  const { user } = useAuth();
  
  // Real friend data
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Search state
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Mock friends for fallback (will be replaced)
  const [mockFriends] = useState<Friend[]>([
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
  const [newFriendEmail, setNewFriendEmail] = useState('');
  const [selectedTab, setSelectedTab] = useState<'friends' | 'discover'>('friends');

  // Load friends and requests on mount
  useEffect(() => {
    if (user?.id) {
      loadFriendsData();
    }
  }, [user?.id]);

  const loadFriendsData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Load friends, pending requests, and sent requests
      const [friendsResult, requestsResult, sentResult] = await Promise.all([
        getUserFriends(user.id),
        getPendingFriendRequests(user.id),
        getSentFriendRequests(user.id)
      ]);

      if (friendsResult.data) {
        setFriends(friendsResult.data);
      }
      
      if (requestsResult.data) {
        console.log('📥 Loaded pending requests:', requestsResult.data.map(r => ({
          id: r.id.substring(0, 8) + '...',
          sender_email: r.sender_profile?.email || 'MISSING EMAIL',
          sender_name: r.sender_profile?.full_name || 'MISSING NAME',
          raw_sender_profile: r.sender_profile
        })));
        setPendingRequests(requestsResult.data);
      }

      if (sentResult.data) {
        console.log('📤 Loaded sent requests:', sentResult.data.length);
        setSentRequests(sentResult.data);
      }
    } catch (error) {
      console.error('Failed to load friends data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUsers = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const { data, error } = await searchUsersByEmail(query);
      
      if (data) {
        setSearchResults(data);
      }
      if (error) {
        console.error('Search error:', error);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Helper function to check if a user is already a friend
  const isAlreadyFriend = (userId: string): boolean => {
    return friends.some(friend => friend.id === userId);
  };

  const filteredFriends = friends.filter(friend =>
    (friend.full_name || '').toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
    friend.email.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  // Use real friends if available, otherwise fallback to mock
  const displayFriends = friends.length > 0 ? filteredFriends : mockFriends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const handleSendFriendRequest = async (receiverId: string, receiverUsername: string) => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await sendFriendRequest(receiverId);
      
      if (error) {
        if (error.message === 'Friend request already sent') {
          Alert.alert(
            'Request Already Sent',
            `You've already sent a friend request to @${receiverUsername}`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Error', `Failed to send friend request: ${error.message}`);
        }
      } else {
        Alert.alert(
          'Friend Request Sent!',
          `A friend request has been sent to @${receiverUsername}`,
          [{ text: 'OK' }]
        );
        setNewFriendEmail('');
        setSearchResults([]);
        setShowAddModal(false);
        loadFriendsData(); // Refresh friends data to show new sent request
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    if (!requestId) {
      Alert.alert('Error', 'Invalid request ID');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await acceptFriendRequest(requestId);
      
      if (error) {
        Alert.alert('Error', `Failed to accept request: ${error.message}`);
      } else {
        Alert.alert('Success', 'Friend request accepted!');
        loadFriendsData(); // Reload data
        triggerFriendsChartsRefresh(); // Refresh home page friends charts
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    if (!requestId) {
      Alert.alert('Error', 'Invalid request ID');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await declineFriendRequest(requestId);
      
      if (error) {
        Alert.alert('Error', `Failed to decline request: ${error.message}`);
      } else {
        loadFriendsData(); // Reload data
      }
    } catch (error) {
      console.error('Error declining friend request:', error);
      Alert.alert('Error', 'Failed to decline friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (requestId: string, receiverUsername: string) => {
    if (!requestId) {
      Alert.alert('Error', 'Invalid request ID');
      return;
    }

    Alert.alert(
      'Cancel Request',
      `Cancel friend request to @${receiverUsername}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const { error } = await cancelFriendRequest(requestId);
              
              if (error) {
                Alert.alert('Error', 'Failed to cancel friend request');
              } else {
                loadFriendsData(); // Reload data
              }
            } catch (error) {
              console.error('Error canceling friend request:', error);
              Alert.alert('Error', 'Failed to cancel friend request');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRemoveFriend = async (friendId: string, friendName: string) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friendName} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const { error } = await removeFriend(friendId);
              
              if (error) {
                Alert.alert('Error', `Failed to remove friend: ${error.message}`);
              } else {
                Alert.alert('Success', 'Friend removed');
                loadFriendsData(); // Reload data
                triggerFriendsChartsRefresh(); // Refresh home page friends charts
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove friend');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
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

  const renderFriendCard = ({ item }: { item: Friend | FriendProfile }) => {
    // Check if it's a real friend or mock friend
    const isRealFriend = 'email' in item;
    const friend = isRealFriend ? {
      id: item.id,
      name: item.full_name || item.email.split('@')[0],
      username: `@${item.username}`,
      avatar: item.avatar_url,
      avatar_animal: item.avatar_animal,
      avatar_color: item.avatar_color,
      mutualFriends: 0, // TODO: Calculate
      currentStreak: 0, // TODO: Calculate  
      completedToday: 0, // TODO: Calculate
      totalHabits: 0, // TODO: Calculate
    } : item as Friend;

    return (
    <TouchableOpacity style={styles.friendCard}>
      <View style={styles.friendHeader}>
        <View style={styles.avatarContainer}>
          <AnimalAvatar
            animal={friend.avatar_animal as AnimalType}
            color={friend.avatar_color as ColorType}
            size={48}
            showInitials={true}
            name={friend.name}
          />
        </View>
        
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{friend.name}</Text>
          <Text style={styles.friendUsername}>{friend.username}</Text>
        </View>

        <View style={styles.friendStats}>
          <View style={styles.statLine}>
            <Text style={styles.statLabel}>streak:</Text>
            <Text style={styles.statValue}>{friend.currentStreak}</Text>
          </View>
          <View style={styles.statLine}>
            <Text style={styles.statLabel}>today:</Text>
            <Text style={styles.statValue}>{friend.completedToday}/{friend.totalHabits}</Text>
          </View>
        </View>
      </View>

      <View style={styles.activitySection}>
        <Text style={styles.activityTitle}>Recent Activity</Text>
        <View style={styles.recentItems}>
          {(friend.recentActivity || []).slice(0, 2).map((activity, index) => (
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
        
        {/* Remove friend button for real friends */}
        {isRealFriend && (
          <TouchableOpacity
            style={styles.removeFriendButton}
            onPress={() => handleRemoveFriend(item.id, friend.name)}
          >
            <Text style={styles.removeFriendText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
    );
  };

  const renderDiscoverCard = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.discoverCard}>
      <View style={styles.discoverHeader}>
        <AnimalAvatar
          size={48}
          showInitials={true}
          name={item.name}
        />
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

      {/* Pending Friend Requests */}
      {pendingRequests.length > 0 && (
        <View style={styles.pendingRequestsSection}>
          <Text style={styles.pendingRequestsTitle}>
            Friend Requests ({pendingRequests.length})
          </Text>
          {pendingRequests.map((request) => (
            <View key={request.id} style={styles.pendingRequestCard}>
              <View style={styles.pendingRequestLeft}>
                <View style={styles.pendingRequestAvatar}>
                  <Text style={styles.pendingRequestAvatarText}>
                    {(request.sender_profile?.username || request.sender_profile?.email)?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
                <View style={styles.pendingRequestInfo}>
                  <Text style={styles.pendingRequestName}>
                    {request.sender_profile?.full_name || 
                     request.sender_profile?.username || 
                     request.sender_profile?.email?.split('@')[0] || 
                     'Loading...'}
                  </Text>
                  <Text style={styles.pendingRequestUsername}>
                    @{request.sender_profile?.username || 'loading...'}
                  </Text>
                </View>
              </View>
              <View style={styles.pendingRequestActions}>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAcceptRequest(request.id)}
                >
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.declineButton}
                  onPress={() => handleDeclineRequest(request.id)}
                >
                  <Text style={styles.declineButtonText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Sent Friend Requests */}
      {sentRequests.length > 0 && (
        <View style={styles.sentRequestsSection}>
          <Text style={styles.sentRequestsTitle}>
            Sent Requests ({sentRequests.length})
          </Text>
          {sentRequests.map((request) => (
            <View key={request.id} style={styles.sentRequestCard}>
              <View style={styles.sentRequestLeft}>
                <View style={styles.sentRequestAvatar}>
                  <Text style={styles.sentRequestAvatarText}>
                    {(request.receiver_profile?.username || request.receiver_profile?.email)?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
                <View style={styles.sentRequestInfo}>
                  <Text style={styles.sentRequestName}>
                    {request.receiver_profile?.full_name || 
                     request.receiver_profile?.username || 
                     request.receiver_profile?.email?.split('@')[0] || 
                     'Loading...'}
                  </Text>
                  <Text style={styles.sentRequestUsername}>
                    @{request.receiver_profile?.username || 'loading...'}
                  </Text>
                </View>
              </View>
              <View style={styles.sentRequestActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => handleCancelRequest(request.id, request.receiver_profile?.username || 'user')}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#111827" />
          <Text style={styles.loadingText}>Loading friends...</Text>
        </View>
      )}

      {/* MVP: Only show friends tab, hide discover for now */}
      <FlatList
        data={displayFriends}
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

      {/* Add Friend Modal with Search */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowAddModal(false);
          setNewFriendEmail('');
          setSearchResults([]);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Friend</Text>
            <Text style={styles.modalDescription}>
              Search by username or email to send a friend request
            </Text>
            
            {/* Search Input */}
            <TextInput
              style={styles.modalInput}
              placeholder="Enter username or email"
              placeholderTextColor="#9CA3AF"
              value={newFriendEmail}
              onChangeText={(text) => {
                setNewFriendEmail(text);
                handleSearchUsers(text.trim());
              }}
              autoCapitalize="none"
              autoFocus
            />

            {/* Search Results */}
            {searchLoading && (
              <View style={styles.searchLoading}>
                <ActivityIndicator size="small" color="#111827" />
                <Text style={styles.searchLoadingText}>Searching...</Text>
              </View>
            )}

            {searchResults.length > 0 ? (
              <View style={styles.searchResultsContainer}>
                <Text style={styles.searchResultsTitle}>Search Results:</Text>
                <ScrollView 
                  style={styles.searchResultsScrollView}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {searchResults.map((user) => {
                    const alreadyFriend = isAlreadyFriend(user.id);
                    return (
                      <TouchableOpacity
                        key={user.id}
                        style={[styles.searchResultItem, alreadyFriend && styles.searchResultItemDisabled]}
                        onPress={() => !alreadyFriend && handleSendFriendRequest(user.id, user.username)}
                        disabled={alreadyFriend}
                      >
                        <View style={styles.searchResultAvatar}>
                          <Text style={styles.searchResultAvatarText}>
                            {(user.username || user.email).charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.searchResultInfo}>
                          <Text style={styles.searchResultName}>
                            {user.full_name || user.username || user.email.split('@')[0]}
                          </Text>
                          <Text style={styles.searchResultUsername}>@{user.username}</Text>
                        </View>
                        {alreadyFriend ? (
                          <View style={styles.alreadyFriendsButton}>
                            <Text style={styles.alreadyFriendsText}>Already Friends</Text>
                          </View>
                        ) : (
                          <Icon name="add" size={20} color="#111827" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}


            {/* Modal Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowAddModal(false);
                  setNewFriendEmail('');
                  setSearchResults([]);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
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
    alignItems: 'center',
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
    justifyContent: 'center',
    height: 48, // Match avatar height to align bottom edges
  },
  statLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    width: 60, // Reduced width for more compact spacing
  },
  statValue: {
    fontSize: 14, // Slightly smaller for better fit
    fontFamily: 'Manrope_700Bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 9, // Smaller label for compactness
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
    maxHeight: '80%',
    flexDirection: 'column',
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
  // Search styles
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  searchLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  searchResultsContainer: {
    marginVertical: 16,
    minHeight: 200,
    maxHeight: 350,
  },
  searchResultsScrollView: {
    maxHeight: 310,
  },
  searchResults: {
    maxHeight: 200,
    marginVertical: 16,
  },
  searchResultsTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  searchResultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  searchResultAvatarText: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    color: 'white',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    color: '#111827',
  },
  searchResultEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  searchResultItemDisabled: {
    opacity: 0.6,
  },
  alreadyFriendsButton: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  alreadyFriendsText: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: '#6B7280',
  },
  // Pending requests styles
  pendingSection: {
    marginVertical: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  pendingSectionTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  pendingRequestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    marginBottom: 8,
  },
  pendingRequestInfo: {
    flex: 1,
  },
  pendingRequestName: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: '#111827',
  },
  pendingRequestUsername: {
    fontSize: 12,
    color: '#6B7280',
  },
  pendingRequestButtons: {
    flexDirection: 'row',
  },
  acceptButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
  },
  declineButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  declineButtonText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
  },
  removeFriendButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  removeFriendText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Manrope_600SemiBold',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  // Main page pending requests styles
  pendingRequestsSection: {
    backgroundColor: '#FEF3C7',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  pendingRequestsTitle: {
    fontSize: 16,
    fontFamily: 'Manrope_700Bold',
    color: '#92400E',
    marginBottom: 12,
  },
  pendingRequestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  pendingRequestLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pendingRequestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pendingRequestAvatarText: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    color: 'white',
  },
  pendingRequestActions: {
    flexDirection: 'row',
  },
  // Sent requests styles
  sentRequestsSection: {
    backgroundColor: '#E0E7FF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  sentRequestsTitle: {
    fontSize: 16,
    fontFamily: 'Manrope_700Bold',
    color: '#3730A3',
    marginBottom: 12,
  },
  sentRequestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  sentRequestLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sentRequestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sentRequestAvatarText: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    color: 'white',
  },
  sentRequestInfo: {
    flex: 1,
  },
  sentRequestName: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: '#111827',
  },
  sentRequestUsername: {
    fontSize: 12,
    color: '#6B7280',
  },
  sentRequestActions: {
    flexDirection: 'row',
  },
  cancelButton: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
  },
});