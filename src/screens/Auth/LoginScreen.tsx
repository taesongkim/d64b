import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props): React.JSX.Element {
  const handleLogin = (): void => {
    // TODO: Implement actual auth logic
    navigation.getParent()?.navigate('MainTabs');
  };

  return (
    <View className="flex-1 justify-center items-center p-5 bg-white">
      <Text className="text-2xl font-bold mb-2 text-gray-900">Login</Text>
      <Text className="text-base text-gray-600 mb-10">Welcome back to D64B</Text>
      
      <TouchableOpacity 
        className="bg-primary px-10 py-3 rounded-lg mb-5 shadow-sm"
        onPress={handleLogin}
      >
        <Text className="text-white text-base font-semibold">Login (Mock)</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        className="p-2"
        onPress={() => navigation.navigate('Signup')}
      >
        <Text className="text-primary text-sm">Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </View>
  );
}