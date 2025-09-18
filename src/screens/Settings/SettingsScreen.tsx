import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Alert,
  Share,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  updateNotificationSettings,
  updatePrivacySettings,
  resetSettings,
} from '@/store/slices/settingsSlice';
import { logout } from '@/store/slices/authSlice';
import { HapticService } from '@/services/hapticService';
import { isFeatureEnabled } from '@/config/features';
import { Icon } from '@/components/icons';
import { useAuth } from '@/contexts/AuthContext';

interface SettingRowProps {
  title: string;
  subtitle?: string;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showArrow?: boolean;
}

function SettingRow({ 
  title, 
  subtitle, 
  value, 
  onValueChange, 
  onPress, 
  rightElement, 
  showArrow = false 
}: SettingRowProps) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      
      <View style={styles.settingRight}>
        {rightElement}
        {onValueChange && (
          <Switch
            value={value}
            onValueChange={(val) => {
              HapticService.selection();
              onValueChange(val);
            }}
            trackColor={{ false: '#E5E7EB', true: '#111827' }}
            thumbColor={value ? '#FFFFFF' : '#9CA3AF'}
          />
        )}
        {showArrow && (
          <Text style={styles.settingArrow}>→</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const { notifications, preferences, privacy } = useAppSelector(state => state.settings);
  const { user, signOut } = useAuth();

  const handleNotificationChange = (key: keyof typeof notifications, value: boolean) => {
    dispatch(updateNotificationSettings({ [key]: value }));
  };

  const handlePrivacyChange = (key: keyof typeof privacy, value: boolean) => {
    dispatch(updatePrivacySettings({ [key]: value }));
  };

  const handleComingSoon = (feature: string) => {
    HapticService.selection();
    Alert.alert(
      'Coming Soon!',
      `${feature} will be available in a future update.`,
      [{ text: 'OK' }]
    );
  };

  const handleThemePress = () => {
    handleComingSoon('Theme selection');
  };

  const handleLanguagePress = () => {
    handleComingSoon('Language selection');
  };

  const handleExportData = async () => {
    HapticService.selection();
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
    HapticService.warning();
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your habits, records, and reset settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: () => {
            // TODO: Clear all Redux state
            dispatch(resetSettings());
            Alert.alert('Success', 'All data has been cleared');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    HapticService.error();
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement account deletion
            Alert.alert('Feature', 'Account deletion coming soon!');
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    HapticService.light();
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'default',
          onPress: async () => {
            try {
              await signOut();
              dispatch(logout()); // Also clear Redux auth state
              // Navigation will happen automatically via AuthContext
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
              </Text>
              <Text style={styles.profileEmail}>{user?.email || 'No email'}</Text>
            </View>
            <TouchableOpacity style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingsCard}>
            <SettingRow
              title="Daily Reminders"
              subtitle="Get reminded to check in on your habits"
              value={notifications.dailyReminders}
              onValueChange={(val) => handleNotificationChange('dailyReminders', val)}
            />
            <SettingRow
              title="Streak Alerts"
              subtitle="Notifications when your streak is at risk"
              value={notifications.streakAlerts}
              onValueChange={(val) => handleNotificationChange('streakAlerts', val)}
            />
            <SettingRow
              title="Social Updates"
              subtitle="Friend activities and achievements"
              value={notifications.socialUpdates}
              onValueChange={(val) => handleNotificationChange('socialUpdates', val)}
            />
            <SettingRow
              title="Weekly Reports"
              subtitle="Summary of your progress each week"
              value={notifications.weeklyReports}
              onValueChange={(val) => handleNotificationChange('weeklyReports', val)}
            />
          </View>
        </View>

        {/* App Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.settingsCard}>
            {/* MVP-HIDDEN: Theme Selection - Enable in v1.2 */}
            {isFeatureEnabled('THEMES') ? (
              <SettingRow
                title="Theme"
                subtitle={`Current: ${preferences.theme}`}
                onPress={handleThemePress}
                showArrow
              />
            ) : (
              <SettingRow
                title="Theme"
                subtitle="Light (Coming Soon)"
                onPress={handleThemePress}
                showArrow
              />
            )}
            {/* MVP-HIDDEN: Language Selection - Enable in v1.2 */}
            {isFeatureEnabled('LANGUAGES') ? (
              <SettingRow
                title="Language"
                subtitle="English"
                onPress={handleLanguagePress}
                showArrow
              />
            ) : (
              <SettingRow
                title="Language"
                subtitle="English (Coming Soon)"
                onPress={handleLanguagePress}
                showArrow
              />
            )}
            <SettingRow
              title="Week Starts On"
              subtitle={preferences.weekStartsOn === 'sunday' ? 'Sunday' : 'Monday'}
              showArrow
            />
          </View>
        </View>

        {/* Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.settingsCard}>
            {/* MVP-HIDDEN: Leaderboards - Enable in v1.2 */}
            {isFeatureEnabled('LEADERBOARDS') && (
              <SettingRow
                title="Show in Leaderboards"
                subtitle="Appear in public rankings"
                value={privacy.showInLeaderboards}
                onValueChange={(val) => handlePrivacyChange('showInLeaderboards', val)}
              />
            )}
            <SettingRow
              title="Allow Friend Requests"
              subtitle="Others can send you friend requests"
              value={privacy.allowFriendRequests}
              onValueChange={(val) => handlePrivacyChange('allowFriendRequests', val)}
            />
            <SettingRow
              title="Analytics"
              subtitle="Help improve the app with usage data"
              value={privacy.dataAnalytics}
              onValueChange={(val) => handlePrivacyChange('dataAnalytics', val)}
            />
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          <View style={styles.settingsCard}>
            {/* MVP-HIDDEN: Data Export - Enable in v1.2 */}
            {isFeatureEnabled('DATA_EXPORT') && (
              <SettingRow
                title="Export Data"
                subtitle="Download your data as JSON"
                onPress={handleExportData}
                showArrow
              />
            )}
            <SettingRow
              title="Clear All Data"
              subtitle="Reset app to initial state"
              onPress={handleClearData}
              showArrow
            />
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.settingsCard}>
            <SettingRow
              title="Logout"
              onPress={handleLogout}
              rightElement={<Text style={styles.logoutText}>Logout</Text>}
            />
            <SettingRow
              title="Delete Account"
              subtitle="Permanently delete your account"
              onPress={handleDeleteAccount}
              rightElement={<Text style={styles.deleteText}>Delete</Text>}
            />
          </View>
        </View>

        {/* Version Info */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>Habit Tracker v1.0.0</Text>
          <View style={styles.footerTextContainer}>
            <Text style={styles.footerText}>Made with </Text>
            <Icon name="heart" size={16} color="#EF4444" />
            <Text style={styles.footerText}> for building better habits</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Manrope_700Bold',
    color: '#111827',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  profileCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontFamily: 'Manrope_700Bold',
    color: 'white',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontFamily: 'Manrope_600SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  editButtonText: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    color: '#374151',
  },
  settingsCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Manrope_500Medium',
    color: '#111827',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingArrow: {
    fontSize: 18,
    color: '#9CA3AF',
    marginLeft: 8,
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