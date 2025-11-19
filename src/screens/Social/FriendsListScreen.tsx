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
import { designTokens } from '@/constants/designTokens';
import { useThemeMode } from '@/contexts/ThemeContext';
import { getThemeColors } from '@/constants/grayscaleTokens';

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
  const themeMode = useThemeMode();
  const themeColors = getThemeColors(themeMode);
  const styles = createStyles(themeColors, themeMode);
  
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
  const [showFriendRequests, setShowFriendRequests] = useState(false);

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
    <View style={styles.friendCard}>
      <View style={styles.friendHeader}>
        <View style={styles.avatarContainer}>
          <AnimalAvatar
            animal={friend.avatar_animal as AnimalType}
            color={friend.avatar_color as ColorType}
            size={36}
            showInitials={true}
            name={friend.name}
          />
        </View>

        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{friend.name}</Text>
          <Text style={styles.friendUsername}>{friend.username}</Text>
        </View>

        <View style={styles.lastActiveContainer}>
          <Text style={styles.lastActiveText}>Last Active: Unknown</Text>
        </View>
      </View>

      {/* Horizontal Divider */}
      <View style={styles.friendDivider} />

      {/* Action Buttons Section */}
      <View style={styles.friendActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Message</Text>
        </TouchableOpacity>

        {isRealFriend && (
          <TouchableOpacity
            style={styles.actionButtonRemove}
            onPress={() => handleRemoveFriend(item.id, friend.name)}
          >
            <Text style={styles.actionButtonRemoveText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
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
        {/* Toggle between Friends and Friend Requests */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, !showFriendRequests && styles.toggleButtonActive]}
            onPress={() => setShowFriendRequests(false)}
          >
            <Text style={[styles.toggleText, !showFriendRequests && styles.toggleTextActive]}>
              Friends
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, showFriendRequests && styles.toggleButtonActive]}
            onPress={() => setShowFriendRequests(true)}
          >
            <Text style={[styles.toggleText, showFriendRequests && styles.toggleTextActive]}>
              Friend Requests{pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content based on toggle */}
      {showFriendRequests ? (
        // Friend Requests Tab
        <>
          {/* Pending Friend Requests */}
          {pendingRequests.length > 0 ? (
            <View style={styles.requestsContainer}>
              <Text style={styles.requestsSectionTitle}>
                Incoming Friend Requests
              </Text>
              {pendingRequests.map((request) => (
                <View key={request.id} style={styles.requestCard}>
                  <View style={styles.requestLeft}>
                    <View style={styles.requestAvatar}>
                      <Text style={styles.requestAvatarText}>
                        {(request.sender_profile?.username || request.sender_profile?.email)?.charAt(0).toUpperCase() || 'U'}
                      </Text>
                    </View>
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName}>
                        {request.sender_profile?.full_name ||
                         request.sender_profile?.username ||
                         request.sender_profile?.email?.split('@')[0] ||
                         'Loading...'}
                      </Text>
                      <Text style={styles.requestUsername}>
                        @{request.sender_profile?.username || 'loading...'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.requestActions}>
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
          ) : (
            <View style={styles.emptyState}>
              <Icon name="social" size={48} color={themeColors.gray500} style={styles.emptyStateIcon} />
              <Text style={styles.emptyStateTitle}>No friend requests</Text>
              <Text style={styles.emptyStateText}>
                You don't have any pending friend requests
              </Text>
            </View>
          )}

          {/* Sent Friend Requests */}
          {sentRequests.length > 0 && (
            <View style={styles.requestsContainer}>
              <Text style={styles.requestsSectionTitle}>
                Sent Requests
              </Text>
              {sentRequests.map((request) => (
                <View key={request.id} style={styles.requestCard}>
                  <View style={styles.requestLeft}>
                    <View style={styles.requestAvatar}>
                      <Text style={styles.requestAvatarText}>
                        {(request.receiver_profile?.username || request.receiver_profile?.email)?.charAt(0).toUpperCase() || 'U'}
                      </Text>
                    </View>
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName}>
                        {request.receiver_profile?.full_name ||
                         request.receiver_profile?.username ||
                         request.receiver_profile?.email?.split('@')[0] ||
                         'Loading...'}
                      </Text>
                      <Text style={styles.requestUsername}>
                        @{request.receiver_profile?.username || 'loading...'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.requestActions}>
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
              <ActivityIndicator size="large" color={themeColors.black} />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          )}
        </>
      ) : (
        // Friends Tab
        <>
          {/* Add Friend Button */}
          <View style={styles.addFriendContainer}>
            <TouchableOpacity
              style={styles.addFriendButton}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.addFriendButtonText}>+ Add Friend</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Icon name="search" size={16} color={themeColors.gray500} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search friends..."
              placeholderTextColor={themeColors.gray500}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Loading indicator */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themeColors.black} />
              <Text style={styles.loadingText}>Loading friends...</Text>
            </View>
          )}

          {/* Friends List */}
          <FlatList
            data={displayFriends}
            renderItem={renderFriendCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Icon name="social" size={48} color={themeColors.gray500} style={styles.emptyStateIcon} />
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
        </>
      )}

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
              placeholderTextColor={themeColors.gray500}
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
                <ActivityIndicator size="small" color={themeColors.black} />
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
                          <Icon name="add" size={20} color={themeColors.black} />
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

// Dynamic styles function for theme support
const createStyles = (themeColors: ReturnType<typeof getThemeColors>, themeMode: 'light' | 'dark') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.gray50,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Manrope_700Bold',
    color: themeColors.black,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: themeColors.gray100,
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: themeColors.white,
  },
  toggleText: {
    fontSize: 14,
    color: themeColors.gray700,
    fontFamily: 'Manrope_500Medium',
  },
  toggleTextActive: {
    color: themeColors.black,
    fontFamily: 'Manrope_600SemiBold',
  },
  addFriendContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  addFriendButton: {
    backgroundColor: themeMode === 'light' ? themeColors.gray300 : themeColors.gray500,
    paddingHorizontal: 16, // designTokens.spacing.lg
    paddingVertical: 12,   // designTokens.spacing.md
    borderRadius: 8,       // designTokens.radius.md
    alignItems: 'center',
  },
  addFriendButtonText: {
    color: themeColors.gray900, // Use gray900 instead of gray700 for better contrast
    fontSize: 16,             // designTokens.typography.sizes.md
    fontFamily: 'Manrope_600SemiBold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.white,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: themeColors.gray300,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: themeColors.black,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  friendCard: {
    backgroundColor: themeColors.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    ...designTokens.shadow.level1,
  },
  friendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  friendDivider: {
    height: 1,
    backgroundColor: themeColors.gray300,
    marginBottom: 12,
  },
  friendActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: themeColors.gray100,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    color: themeColors.gray800,
  },
  actionButtonRemove: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: themeMode === 'light' ? '#F47887' : '#7B2C36',
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonRemoveText: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    color: themeMode === 'light' ? '#BD3747' : '#F47887',
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
    backgroundColor: themeColors.black,
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
  lastActiveContainer: {
    alignItems: 'flex-end',
    alignSelf: 'flex-start',
  },
  lastActiveText: {
    fontSize: 12,
    color: themeColors.gray500,
    fontFamily: 'Manrope_400Regular',
  },
  friendName: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    color: themeColors.black,
  },
  friendUsername: {
    fontSize: 14,
    color: themeColors.gray700,
    marginTop: 1,
  },
  mutualFriends: {
    fontSize: 12,
    color: themeColors.gray500,
    marginTop: 2,
  },
  discoverCard: {
    backgroundColor: themeColors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: themeColors.gray300,
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
    color: themeColors.gray500,
    marginTop: 2,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: themeColors.gray100,
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: themeColors.black,
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
    color: themeColors.black,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: themeColors.gray700,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  emptyStateButton: {
    backgroundColor: themeColors.black,
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
    backgroundColor: themeColors.white,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxHeight: '80%',
    flexDirection: 'column',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Manrope_700Bold',
    color: themeColors.black,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: themeColors.gray700,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: themeColors.gray300,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: themeColors.black,
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
    borderColor: themeColors.gray300,
    alignItems: 'center',
  },
  modalCancelText: {
    color: themeColors.gray700,
    fontSize: 16,
    fontFamily: 'Manrope_500Medium',
  },
  modalAddButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: themeColors.black,
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
    color: themeColors.gray700,
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
    color: themeColors.black,
    marginBottom: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: themeColors.gray100,
    borderRadius: 8,
    marginBottom: 8,
  },
  searchResultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: themeColors.black,
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
    color: themeColors.black,
  },
  searchResultEmail: {
    fontSize: 14,
    color: themeColors.gray700,
  },
  searchResultUsername: {
    fontSize: 14,
    color: themeColors.gray700,
  },
  searchResultItemDisabled: {
    opacity: 0.6,
  },
  alreadyFriendsButton: {
    backgroundColor: themeColors.gray300,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  alreadyFriendsText: {
    fontSize: 12,
    fontFamily: 'Manrope_500Medium',
    color: themeColors.gray700,
  },
  // Pending requests styles
  pendingSection: {
    marginVertical: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: themeColors.gray300,
  },
  pendingSectionTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: themeColors.black,
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
    color: themeColors.black,
  },
  pendingRequestUsername: {
    fontSize: 12,
    color: themeColors.gray700,
  },
  pendingRequestButtons: {
    flexDirection: 'row',
  },
  acceptButton: {
    backgroundColor: themeMode === 'light' ? '#59CF92' : '#0E6848',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  acceptButtonText: {
    color: themeMode === 'light' ? '#308F6D' : '#59CF92',
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
  },
  declineButton: {
    backgroundColor: themeMode === 'light' ? '#F47887' : '#7B2C36',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  declineButtonText: {
    color: themeMode === 'light' ? '#BD3747' : '#F47887',
    fontSize: 12,
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
    color: themeColors.gray700,
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
    backgroundColor: themeColors.white,
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
    backgroundColor: themeColors.black,
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
    backgroundColor: themeColors.white,
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
    backgroundColor: themeColors.black,
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
    color: themeColors.black,
  },
  sentRequestUsername: {
    fontSize: 12,
    color: themeColors.gray700,
  },
  sentRequestActions: {
    flexDirection: 'row',
  },
  cancelButton: {
    backgroundColor: themeColors.gray700,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
  },
  // Friend Requests tab styles
  requestsContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  requestsSectionTitle: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    color: themeColors.black,
    marginBottom: 12,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    ...designTokens.shadow.level1,
  },
  requestLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: themeColors.black,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  requestAvatarText: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    color: 'white',
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    color: themeColors.black,
  },
  requestUsername: {
    fontSize: 14,
    color: themeColors.gray700,
    marginTop: 1,
  },
  requestActions: {
    flexDirection: 'row',
  },
});