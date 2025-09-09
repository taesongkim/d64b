import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { debugSupabaseConnection, testSupabaseConnection } from '@/utils/testSupabase';

interface ConnectionTestProps {
  onHide: () => void;
}

export default function SupabaseConnectionTest({ onHide }: ConnectionTestProps): React.JSX.Element {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'success' | 'error' | 'idle'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    // Auto-test connection when component mounts
    testConnection();
  }, []);

  const testConnection = async (): Promise<void> => {
    setConnectionStatus('testing');
    setErrorMessage('');

    try {
      const success = await debugSupabaseConnection();
      setConnectionStatus(success ? 'success' : 'error');
      
      if (!success) {
        setErrorMessage('Check console for detailed error information');
      }
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

  const getStatusColor = (): string => {
    switch (connectionStatus) {
      case 'success': return 'bg-green-100';
      case 'error': return 'bg-red-100';
      case 'testing': return 'bg-yellow-100';
      default: return 'bg-gray-100';
    }
  };

  const getStatusText = (): string => {
    switch (connectionStatus) {
      case 'success': return '✅ Supabase Connected';
      case 'error': return '❌ Connection Failed';
      case 'testing': return '🔍 Testing Connection...';
      default: return '⏳ Ready to Test';
    }
  };

  return (
    <View className={`${getStatusColor()} p-4 m-4 rounded-lg border border-gray-300`}>
      <Text className="text-lg font-bold mb-2 text-center">Supabase Connection Test</Text>
      
      <Text className={`text-center text-base mb-3 ${
        connectionStatus === 'success' ? 'text-green-700' : 
        connectionStatus === 'error' ? 'text-red-700' : 'text-gray-700'
      }`}>
        {getStatusText()}
      </Text>

      {errorMessage ? (
        <Text className="text-red-600 text-sm text-center mb-3">
          {errorMessage}
        </Text>
      ) : null}

      {connectionStatus === 'error' && (
        <View className="mb-3">
          <Text className="text-sm text-gray-600 text-center mb-2">
            Common fixes:
          </Text>
          <Text className="text-xs text-gray-500 text-left">
            • Update .env.local with your actual Supabase credentials{'\n'}
            • Restart Expo server: npx expo start --clear{'\n'}
            • Check console for detailed error messages
          </Text>
        </View>
      )}

      <View className="flex-row justify-center space-x-3">
        <TouchableOpacity 
          className="bg-blue-500 px-4 py-2 rounded-lg"
          onPress={testConnection}
        >
          <Text className="text-white font-semibold">Test Again</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className="bg-gray-500 px-4 py-2 rounded-lg"
          onPress={onHide}
        >
          <Text className="text-white font-semibold">Hide</Text>
        </TouchableOpacity>
      </View>

      <Text className="text-xs text-gray-500 text-center mt-3">
        Remove this component after confirming connection works
      </Text>
    </View>
  );
}