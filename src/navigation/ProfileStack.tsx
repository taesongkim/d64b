import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from './types';
import ProfileScreen from '@/screens/Profile/ProfileScreen';
import ManageCommitmentsScreen from '@/screens/Settings/ManageCommitmentsScreen';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStack(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="ManageCommitments" component={ManageCommitmentsScreen} />
    </Stack.Navigator>
  );
}