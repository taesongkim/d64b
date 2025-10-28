import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch,
  Alert,
  Image,
  Share
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { isFeatureEnabled } from '@/config/features';
import { Icon } from '@/components/icons';
import { useAuth } from '@/contexts/AuthContext';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  updateNotificationSettings,
  updatePrivacySettings,
  updateFeatureFlags,
  resetSettings,
} from '@/store/slices/settingsSlice';
import { supabase } from '@/services/supabase';
import AnimalAvatar from '@/components/AnimalAvatar';
import AvatarSelector from '@/components/AvatarSelector';
import NameEditModal from '@/components/NameEditModal';
import { AnimalType, ColorType } from '@/utils/avatarUtils';

interface UserStats {
  totalHabits: number;
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
}

interface UserProfile {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  avatar_animal: string | null;
  avatar_color: string | null;
  created_at: string;
}

interface ProfileScreenProps {
  navigation: any;
}

export default function ProfileScreen({ navigation }: ProfileScreenProps): React.JSX.Element {
  const { user, signOut } = useAuth();
  const dispatch = useAppDispatch();
  const { notifications, preferences, privacy, featureFlags } = useAppSelector(state => state.settings);
  
  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [showNameEditModal, setShowNameEditModal] = useState(false);
  
  // Mock stats (TODO: Replace with real data)
  const stats: UserStats = {
    totalHabits: 12,
    currentStreak: 7,
    longestStreak: 23,
    completionRate: 78,
  };

  
  // Load user profile data
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error('Error loading profile:', error);
        } else {
          setUserProfile(data);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setProfileLoading(false);
      }
    };
    
    loadUserProfile();
  }, [user?.id]);

  // Derived user data - now using profile data with fallbacks
  const userName = userProfile?.full_name || userProfile?.username || user?.email?.split('@')[0] || 'User';
  const userEmail = userProfile?.email || user?.email || 'No email';
  const userUsername = userProfile?.username || 'No username';
  const memberSince = userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently';

  const handleLogout = (): void => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              // Navigation will happen automatically via AuthContext state change
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        }
      ]
    );
  };


  const pickImageFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to change your photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera permissions to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleAvatarSelect = async (animal: AnimalType | null, color: ColorType | null) => {
    if (!user?.id) return;

    try {
      console.log('Updating avatar with:', { animal, color, userId: user.id });
      
      const { error } = await supabase
        .from('profiles')
        .update({
          avatar_animal: animal,
          avatar_color: color,
        })
        .eq('id', user.id);

      if (error) {
        console.error('Detailed error updating avatar:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        Alert.alert('Error', `Failed to update avatar: ${error.message}`);
      } else {
        // Update local state
        setUserProfile(prev => prev ? {
          ...prev,
          avatar_animal: animal,
          avatar_color: color,
        } : null);
        
        Alert.alert('Success', 'Avatar updated successfully!');
      }
    } catch (error) {
      console.error('Catch block error updating avatar:', error);
      Alert.alert('Error', `Failed to update avatar: ${error}`);
    }
  };

  const handleNameUpdate = async (newName: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: newName })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating name:', error);
        throw error;
      }

      // Update local state
      setUserProfile(prev => prev ? { ...prev, full_name: newName } : null);
      
      Alert.alert('Success', 'Name updated successfully!');
    } catch (error) {
      console.error('Error updating name:', error);
      throw error;
    }
  };

  const handleChangePhoto = (): void => {
    Alert.alert(
      'Change Profile Photo',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImageFromLibrary },
        { text: 'Remove Photo', style: 'destructive', onPress: () => setProfileImage(null) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const renderStatCard = (label: string, value: string | number, unit?: string) => (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>
        {value}
        {unit && <Text style={styles.statUnit}>{unit}</Text>}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const renderProfileView = () => (
    <>
      {/* Stats Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Progress</Text>
        <View style={styles.statsGrid}>
          {renderStatCard('Total Habits', stats.totalHabits)}
          {renderStatCard('Current Streak', stats.currentStreak, ' days')}
          {renderStatCard('Best Streak', stats.longestStreak, ' days')}
          {renderStatCard('Completion', stats.completionRate, '%')}
        </View>
      </View>


      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityList}>
          <View style={styles.activityItem}>
            <View style={styles.activityIconContainer}>
              <Icon name="activity-completed" size={16} color="#10B981" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>Completed "Morning Meditation"</Text>
              <Text style={styles.activityTime}>2 hours ago</Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <View style={styles.activityIconContainer}>
              <Icon name="fire" size={16} color="#FF6B35" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>7 day streak on "Exercise"</Text>
              <Text style={styles.activityTime}>Yesterday</Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <View style={styles.activityIconContainer}>
              <Icon name="add" size={16} color="#111827" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>Added new habit "Read 30 mins"</Text>
              <Text style={styles.activityTime}>2 days ago</Text>
            </View>
          </View>
        </View>
      </View>
    </>
  );

  // Settings handlers
  const handleNotificationChange = (key: keyof typeof notifications, value: boolean) => {
    dispatch(updateNotificationSettings({ [key]: value }));
  };

  const handlePrivacyChange = (key: keyof typeof privacy, value: boolean) => {
    dispatch(updatePrivacySettings({ [key]: value }));
  };

  const handleFeatureFlagChange = (value: boolean) => {
    dispatch(updateFeatureFlags({ sync: { useSystemSurfaces: value } }));
  };

  const handleComingSoon = (feature: string) => {
    Alert.alert(
      'Coming Soon!',
      `${feature} will be available in a future update.`,
      [{ text: 'OK' }]
    );
  };

  const handleExportData = async () => {
    try {
      const exportData = {
        commitments: [], // Will be populated from Redux
        records: [],
        settings: { notifications, preferences, privacy },
        exportDate: new Date().toISOString(),
      };
      
      const jsonString = JSON.stringify(exportData, null, 2);
      
      await Share.share({
        message: jsonString,
        title: 'Habit Tracker Data Export',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your habits, records, and reset settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: () => {
            dispatch(resetSettings());
            Alert.alert('Success', 'All data has been cleared');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Feature', 'Account deletion coming soon!');
          },
        },
      ]
    );
  };

  const renderSettingsView = () => (
    <>
      {/* Profile Info in Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.settingsList}>
          <TouchableOpacity 
            style={styles.profileInfoItem}
            onPress={() => setShowNameEditModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.profileInfoLeft}>
              <Text style={styles.profileInfoLabel}>Name</Text>
              <Text style={styles.profileInfoValue}>{userName}</Text>
            </View>
            <View style={styles.profileInfoRight}>
              <Icon name="edit" size={16} color="#6B7280" />
            </View>
          </TouchableOpacity>
          <View style={styles.profileInfoItem}>
            <View style={styles.profileInfoLeft}>
              <Text style={styles.profileInfoLabel}>Email</Text>
              <Text style={styles.profileInfoValue}>{userEmail}</Text>
            </View>
          </View>
          <View style={styles.profileInfoItem}>
            <View style={styles.profileInfoLeft}>
              <Text style={styles.profileInfoLabel}>Member Since</Text>
              <Text style={styles.profileInfoValue}>{memberSince}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingsList}>
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Daily Reminders</Text>
              <Text style={styles.settingSubtitle}>Get reminded to check in on your habits</Text>
            </View>
            <Switch
              value={notifications.dailyReminders}
              onValueChange={(val) => handleNotificationChange('dailyReminders', val)}
              trackColor={{ false: '#E5E7EB', true: '#111827' }}
              thumbColor={notifications.dailyReminders ? '#FFFFFF' : '#9CA3AF'}
            />
          </View>
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Streak Alerts</Text>
              <Text style={styles.settingSubtitle}>Notifications when your streak is at risk</Text>
            </View>
            <Switch
              value={notifications.streakAlerts}
              onValueChange={(val) => handleNotificationChange('streakAlerts', val)}
              trackColor={{ false: '#E5E7EB', true: '#111827' }}
              thumbColor={notifications.streakAlerts ? '#FFFFFF' : '#9CA3AF'}
            />
          </View>
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Social Updates</Text>
              <Text style={styles.settingSubtitle}>Friend activities and achievements</Text>
            </View>
            <Switch
              value={notifications.socialUpdates}
              onValueChange={(val) => handleNotificationChange('socialUpdates', val)}
              trackColor={{ false: '#E5E7EB', true: '#111827' }}
              thumbColor={notifications.socialUpdates ? '#FFFFFF' : '#9CA3AF'}
            />
          </View>
        </View>
      </View>

      {/* Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.settingsList}>
          {/* MVP-HIDDEN: Theme Selection - Enable in v1.2 */}
          {isFeatureEnabled('THEMES') ? (
            <TouchableOpacity style={styles.settingItem} onPress={() => handleComingSoon('Theme selection')}>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Theme</Text>
                <Text style={styles.settingSubtitle}>Current: {preferences.theme}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.settingItem} onPress={() => handleComingSoon('Theme selection')}>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Theme</Text>
                <Text style={styles.settingSubtitle}>Light (Coming Soon)</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
          {/* MVP-HIDDEN: Language Selection - Enable in v1.2 */}
          {isFeatureEnabled('LANGUAGES') ? (
            <TouchableOpacity style={styles.settingItem} onPress={() => handleComingSoon('Language selection')}>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Language</Text>
                <Text style={styles.settingSubtitle}>English</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.settingItem} onPress={() => handleComingSoon('Language selection')}>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Language</Text>
                <Text style={styles.settingSubtitle}>English (Coming Soon)</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Privacy */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy</Text>
        <View style={styles.settingsList}>
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Allow Friend Requests</Text>
              <Text style={styles.settingSubtitle}>Others can send you friend requests</Text>
            </View>
            <Switch
              value={privacy.allowFriendRequests}
              onValueChange={(val) => handlePrivacyChange('allowFriendRequests', val)}
              trackColor={{ false: '#E5E7EB', true: '#111827' }}
              thumbColor={privacy.allowFriendRequests ? '#FFFFFF' : '#9CA3AF'}
            />
          </View>
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Analytics</Text>
              <Text style={styles.settingSubtitle}>Help improve the app with usage data</Text>
            </View>
            <Switch
              value={privacy.dataAnalytics}
              onValueChange={(val) => handlePrivacyChange('dataAnalytics', val)}
              trackColor={{ false: '#E5E7EB', true: '#111827' }}
              thumbColor={privacy.dataAnalytics ? '#FFFFFF' : '#9CA3AF'}
            />
          </View>
        </View>
      </View>

      {/* Advanced */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Advanced</Text>
        <View style={styles.settingsList}>
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>System Sync Surfaces</Text>
              <Text style={styles.settingSubtitle}>Use Dynamic Island (iOS) / Ongoing Notification (Android)</Text>
            </View>
            <Switch
              value={featureFlags?.sync?.useSystemSurfaces ?? false}
              onValueChange={handleFeatureFlagChange}
              trackColor={{ false: '#E5E7EB', true: '#111827' }}
              thumbColor={(featureFlags?.sync?.useSystemSurfaces ?? false) ? '#FFFFFF' : '#9CA3AF'}
            />
          </View>
        </View>
      </View>

      {/* Data Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <View style={styles.settingsList}>
          <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('ManageCommitments')}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Manage Commitments</Text>
              <Text style={styles.settingSubtitle}>View archived and deleted commitments</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          {/* MVP-HIDDEN: Data Export - Enable in v1.2 */}
          {isFeatureEnabled('DATA_EXPORT') && (
            <TouchableOpacity style={styles.settingItem} onPress={handleExportData}>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Export Data</Text>
                <Text style={styles.settingSubtitle}>Download your data as JSON</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.settingItem} onPress={handleClearData}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Clear All Data</Text>
              <Text style={styles.settingSubtitle}>Reset app to initial state</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.settingsList}>
          <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Logout</Text>
            </View>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={handleDeleteAccount}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Delete Account</Text>
              <Text style={styles.settingSubtitle}>Permanently delete your account</Text>
            </View>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.versionText}>Habit Tracker v1.0.0</Text>
        <View style={styles.footerTextContainer}>
          <Text style={styles.footerText}>Made with </Text>
          <Icon name="heart" size={16} color="#EF4444" />
          <Text style={styles.footerText}> for building better habits</Text>
        </View>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileInfo}>
            {/* Avatar Section */}
            <TouchableOpacity 
              onPress={() => setShowAvatarSelector(true)} 
              style={styles.avatarContainer}
            >
              <AnimalAvatar
                animal={userProfile?.avatar_animal as AnimalType}
                color={userProfile?.avatar_color as ColorType}
                size={72}
                showInitials={true}
                name={userName}
              />
              <View style={styles.cameraIcon}>
                <Icon name="edit" size={16} color="white" />
              </View>
            </TouchableOpacity>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.userUsername}>@{userUsername}</Text>
              <Text style={styles.memberSince}>Member since {memberSince}</Text>
            </View>
          </View>
          
          {/* Toggle between Profile and Settings */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity 
              style={[styles.toggleButton, !showSettings && styles.toggleButtonActive]}
              onPress={() => setShowSettings(false)}
            >
              <Text style={[styles.toggleText, !showSettings && styles.toggleTextActive]}>
                Profile
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleButton, showSettings && styles.toggleButtonActive]}
              onPress={() => setShowSettings(true)}
            >
              <Text style={[styles.toggleText, showSettings && styles.toggleTextActive]}>
                Settings
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content based on toggle */}
        {showSettings ? renderSettingsView() : renderProfileView()}

        {/* Dev Mode Info - Remove in production */}
        {__DEV__ && (
          <View style={styles.devInfo}>
            <Text style={styles.devText}>🔧 Development Build</Text>
            <Text style={styles.devText}>Environment: {__DEV__ ? 'Development' : 'Production'}</Text>
          </View>
        )}
      </ScrollView>

      {/* Avatar Selector Modal */}
      <AvatarSelector
        visible={showAvatarSelector}
        onClose={() => setShowAvatarSelector(false)}
        onSelect={handleAvatarSelect}
        currentAnimal={userProfile?.avatar_animal as AnimalType}
        currentColor={userProfile?.avatar_color as ColorType}
      />

      {/* Name Edit Modal */}
      <NameEditModal
        visible={showNameEditModal}
        onClose={() => setShowNameEditModal(false)}
        onSave={handleNameUpdate}
        currentName={userProfile?.full_name || ''}
        currentEmail={userProfile?.email || user?.email || ''}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 24,
    fontFamily: 'Manrope_700Bold',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontFamily: 'Manrope_600SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  memberSince: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
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
    backgroundColor: 'white',
  },
  toggleText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Manrope_500Medium',
  },
  toggleTextActive: {
    color: '#111827',
    fontFamily: 'Manrope_600SemiBold',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Manrope_600SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statCard: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontFamily: 'Manrope_700Bold',
    color: '#111827',
  },
  statUnit: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    color: '#6B7280',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  activityList: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityIconContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  activityTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  settingsList: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLabel: {
    fontSize: 16,
    color: '#374151',
  },
  linkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  linkText: {
    fontSize: 16,
    color: '#374151',
  },
  chevron: {
    fontSize: 20,
    color: '#9CA3AF',
  },
  aboutContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  appVersion: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  aboutText: {
    fontSize: 14,
    color: '#6B7280',
  },
  signOutButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  signOutText: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    color: '#374151',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 32,
  },
  devInfo: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  devText: {
    fontSize: 12,
    color: '#92400E',
    fontFamily: 'Manrope_500Medium',
  },
  // Settings styles
  profileInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  profileInfoLeft: {
    flex: 1,
  },
  profileInfoRight: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfoLabel: {
    fontSize: 16,
    fontFamily: 'Manrope_500Medium',
    color: '#111827',
    marginBottom: 2,
  },
  profileInfoValue: {
    fontSize: 14,
    color: '#6B7280',
  },
  settingContent: {
    flex: 1,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  logoutText: {
    fontSize: 16,
    color: '#111827',
    fontFamily: 'Manrope_500Medium',
  },
  deleteText: {
    fontSize: 16,
    color: '#EF4444',
    fontFamily: 'Manrope_500Medium',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  versionText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  footerTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});