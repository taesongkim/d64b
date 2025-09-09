import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface UserStats {
  totalHabits: number;
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
}

interface SettingItem {
  id: string;
  label: string;
  type: 'toggle' | 'link' | 'action';
  value?: boolean;
  onPress?: () => void;
}

export default function ProfileScreen(): React.JSX.Element {
  const navigation = useNavigation();
  
  // Mock user data
  const [userName] = useState('Alex Johnson');
  const [userEmail] = useState('alex.johnson@example.com');
  const [memberSince] = useState('October 2024');
  
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

  const renderStatCard = (label: string, value: string | number, unit?: string) => (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>
        {value}
        {unit && <Text style={styles.statUnit}>{unit}</Text>}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userName.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.userEmail}>{userEmail}</Text>
              <Text style={styles.memberSince}>Member since {memberSince}</Text>
            </View>
          </View>
        </View>

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

        {/* Notifications Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingsList}>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                thumbColor="white"
              />
            </View>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Daily Reminders</Text>
              <Switch
                value={reminders}
                onValueChange={setReminders}
                trackColor={{ false: '#E5E7EB', true: '#10B981' }}
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
                trackColor={{ false: '#E5E7EB', true: '#10B981' }}
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
                trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                thumbColor="white"
              />
            </View>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Share Progress with Friends</Text>
              <Switch
                value={shareProgress}
                onValueChange={setShareProgress}
                trackColor={{ false: '#E5E7EB', true: '#10B981' }}
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
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
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
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
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
    fontWeight: 'bold',
    color: '#111827',
  },
  statUnit: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#6B7280',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
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
    fontWeight: '600',
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
    fontWeight: '600',
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
    fontWeight: '600',
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
    fontWeight: '500',
  },
});