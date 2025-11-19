import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from './types';
import DashboardScreen from '@/screens/Dashboard/DashboardScreen';
import AnalyticsScreen from '@/screens/Analytics/AnalyticsScreen';
import FriendsListScreen from '@/screens/Social/FriendsListScreen';
import ProfileStack from './ProfileStack';
import { isFeatureEnabled } from '@/config/features';
import { Icon } from '@/components/icons';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/ThemeToggle';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs(): React.JSX.Element {
  const { semanticColors } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        tabBarActiveTintColor: semanticColors.primaryText,
        tabBarInactiveTintColor: semanticColors.secondaryText,
        tabBarStyle: {
          backgroundColor: semanticColors.sectionBackground + 'CC', // Semi-transparent background (80% opacity)
          borderTopColor: semanticColors.defaultBorder,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 81, // Default (~49px) + 32px extra height
          paddingTop: 12, // Increased padding to move buttons down (was 4px)
        },
        headerStyle: {
          backgroundColor: semanticColors.sectionBackground,
          borderBottomWidth: 1,
          borderBottomColor: semanticColors.headerBorder,
        },
        headerTintColor: semanticColors.primaryText,
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
          headerRight: () => <ThemeToggle />,
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
        component={ProfileStack}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Icon name="profile" size={20} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}