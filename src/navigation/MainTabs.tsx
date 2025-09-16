import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from './types';
import DashboardScreen from '@/screens/Dashboard/DashboardScreen';
import AnalyticsScreen from '@/screens/Analytics/AnalyticsScreen';
import FriendsListScreen from '@/screens/Social/FriendsListScreen';
import ProfileScreen from '@/screens/Profile/ProfileScreen';
import SettingsScreen from '@/screens/Settings/SettingsScreen';
import { isFeatureEnabled } from '@/config/features';
import { Icon } from '@/components/icons';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs(): React.JSX.Element {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#f8f9fa',
          borderTopColor: '#e5e5e7',
        },
        headerStyle: {
          backgroundColor: '#f8f9fa',
        },
        headerTintColor: '#333',
        headerTitleStyle: {
          fontFamily: 'Manrope_700Bold',
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Icon name="home" size={20} color={color} />,
        }}
      />
      {/* MVP-HIDDEN: Analytics Tab - Enable in v1.1 */}
      {isFeatureEnabled('ANALYTICS_TAB') && (
        <Tab.Screen 
          name="Analytics" 
          component={AnalyticsScreen}
          options={{
            title: 'Analytics',
            tabBarLabel: 'Analytics',
            tabBarIcon: ({ color }) => <Icon name="analytics" size={20} color={color} />,
          }}
        />
      )}
      <Tab.Screen 
        name="Social" 
        component={FriendsListScreen}
        options={{
          title: 'Friends',
          tabBarLabel: 'Social',
          tabBarIcon: ({ color }) => <Icon name="social" size={20} color={color} />,
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Icon name="profile" size={20} color={color} />,
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => <Icon name="settings" size={20} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}