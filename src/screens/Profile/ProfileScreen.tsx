import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch,
  Alert,
  Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { isFeatureEnabled } from '@/config/features';
import { Icon } from '@/components/icons';

interface UserStats {
  totalHabits: number;
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
}

export default function ProfileScreen(): React.JSX.Element {
  const navigation = useNavigation();
  
  // Mock user data
  const [userName] = useState('Taesong Kim');
  const [userEmail] = useState('taesong.kim@example.com');
  const [memberSince] = useState('October 2024');
  const [showSettings, setShowSettings] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  // Mock stats
  const stats: UserStats = {
    totalHabits: 12,
    currentStreak: 7,
    longestStreak: 23,
    completionRate: 78,
  };
  
  // Settings state
  const [notifications, setNotifications] = useState(true);
  const [reminders, setReminders] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [publicProfile, setPublicProfile] = useState(true);
  const [shareProgress, setShareProgress] = useState(false);

  const handleLogout = (): void => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: () => navigation.getParent()?.navigate('AuthStack')
        }
      ]
    );
  };

  const handleDeleteAccount = (): void => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => console.log('Account deletion requested')
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

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIcon}>
              <Icon name="stats" size={20} color="#6B7280" />
            </View>
            <Text style={styles.actionLabel}>Stats</Text>
          </TouchableOpacity>
          {/* MVP-HIDDEN: Achievements - Enable in v1.2 */}
          {isFeatureEnabled('ACHIEVEMENTS') && (
            <TouchableOpacity style={styles.actionButton}>
              <View style={styles.actionIcon}>
                <Icon name="trophy" size={20} color="#6B7280" />
              </View>
              <Text style={styles.actionLabel}>Achievements</Text>
            </TouchableOpacity>
          )}
          {/* MVP-HIDDEN: Data Export - Enable in v1.2 */}
          {isFeatureEnabled('DATA_EXPORT') && (
            <TouchableOpacity style={styles.actionButton}>
              <View style={styles.actionIcon}>
                <Icon name="export" size={20} color="#6B7280" />
              </View>
              <Text style={styles.actionLabel}>Export</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIcon}>
              <Icon name="friends" size={20} color="#6B7280" />
            </View>
            <Text style={styles.actionLabel}>Friends</Text>
          </TouchableOpacity>
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

  const renderSettingsView = () => (
    <>
      {/* Notifications Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingsList}>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#E5E7EB', true: '#111827' }}
              thumbColor="white"
            />
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Daily Reminders</Text>
            <Switch
              value={reminders}
              onValueChange={setReminders}
              trackColor={{ false: '#E5E7EB', true: '#111827' }}
              thumbColor="white"
            />
          </View>
        </View>
      </View>

      {/* Appearance Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.settingsList}>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#E5E7EB', true: '#111827' }}
              thumbColor="white"
            />
          </View>
        </View>
      </View>

      {/* Privacy Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy</Text>
        <View style={styles.settingsList}>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Public Profile</Text>
            <Switch
              value={publicProfile}
              onValueChange={setPublicProfile}
              trackColor={{ false: '#E5E7EB', true: '#111827' }}
              thumbColor="white"
            />
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Share Progress with Friends</Text>
            <Switch
              value={shareProgress}
              onValueChange={setShareProgress}
              trackColor={{ false: '#E5E7EB', true: '#111827' }}
              thumbColor="white"
            />
          </View>
        </View>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.settingsList}>
          <TouchableOpacity style={styles.linkItem}>
            <Text style={styles.linkText}>Help Center</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkItem}>
            <Text style={styles.linkText}>Privacy Policy</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkItem}>
            <Text style={styles.linkText}>Terms of Service</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkItem}>
            <Text style={styles.linkText}>Contact Us</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutContent}>
          <Text style={styles.appVersion}>D64B Version 1.0.0</Text>
          <Text style={styles.aboutText}>
            Build better habits, one day at a time.
          </Text>
        </View>
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.signOutButton}
          onPress={handleLogout}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
        >
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileInfo}>
            {/* MVP-HIDDEN: Profile Picture Upload - Enable in v1.1 */}
            {isFeatureEnabled('PROFILE_PICTURES') ? (
              <TouchableOpacity onPress={handleChangePhoto} style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>
                      {userName.split(' ').map(n => n[0]).join('')}
                    </Text>
                  )}
                </View>
                <View style={styles.cameraIcon}>
                  <Icon name="camera" size={16} color="#6B7280" />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {userName.split(' ').map(n => n[0]).join('')}
                  </Text>
                </View>
              </View>
            )}
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.userEmail}>{userEmail}</Text>
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
    borderRadius: 12,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
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
  userEmail: {
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
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionLabel: {
    fontSize: 12,
    color: '#6B7280',
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
  deleteText: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    color: '#DC2626',
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
});