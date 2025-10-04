import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import type { RootStackParamList } from './types';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import SyncIndicatorOverlay from '@/components/SyncIndicator/SyncIndicatorOverlay';
import { useAuth } from '@/contexts/AuthContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Wrapper component for MainTabs with global overlays
function MainTabsWithBanner(): React.JSX.Element {
  return (
    <View style={styles.mainTabsContainer}>
      <MainTabs />
      <SyncIndicatorOverlay />
    </View>
  );
}

export default function AppNavigator(): React.JSX.Element {
  const { user, loading } = useAuth();

  console.log('🧭 AppNavigator render:', { 
    user: user?.id || 'No user', 
    loading,
    willShowMainTabs: !!user 
  });

  // Show loading screen while checking auth state
  if (loading) {
    console.log('⏳ Showing loading screen');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  const initialRoute = user ? 'MainTabs' : 'AuthStack';
  console.log('🎯 Initial route determined:', initialRoute);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {user ? (
          <Stack.Screen name="MainTabs" component={MainTabsWithBanner} />
        ) : (
          <Stack.Screen name="AuthStack" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  mainTabsContainer: {
    flex: 1,
  },
});