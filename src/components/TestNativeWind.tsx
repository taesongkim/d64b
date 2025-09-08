import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export default function TestNativeWind(): React.JSX.Element {
  return (
    <View className="flex-1 bg-gray-50 p-4">
      <Text className="text-2xl font-bold text-center mb-6 text-gray-800">
        NativeWind Test Component
      </Text>
      
      {/* Basic Color Test */}
      <View className="bg-primary p-4 rounded-lg mb-4">
        <Text className="text-white font-semibold text-center">
          Primary Color Background
        </Text>
      </View>
      
      {/* Layout Test */}
      <View className="flex-row justify-between items-center mb-4">
        <View className="bg-secondary p-3 rounded-md flex-1 mr-2">
          <Text className="text-white text-sm text-center">Secondary</Text>
        </View>
        <View className="bg-danger p-3 rounded-md flex-1 ml-2">
          <Text className="text-white text-sm text-center">Danger</Text>
        </View>
      </View>
      
      {/* Button Test */}
      <TouchableOpacity className="bg-warning p-4 rounded-lg mb-4 shadow-lg">
        <Text className="text-white font-bold text-center">
          Warning Button
        </Text>
      </TouchableOpacity>
      
      {/* Typography Test */}
      <View className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
        <Text className="text-lg font-bold text-gray-900 mb-2">
          Typography Test
        </Text>
        <Text className="text-base text-gray-700 mb-1">
          Regular text with base size
        </Text>
        <Text className="text-sm text-gray-500 italic">
          Small italic text in gray
        </Text>
      </View>
      
      {/* Dark Theme Test */}
      <View className="bg-dark p-4 rounded-lg">
        <Text className="text-white font-medium text-center">
          Dark Background
        </Text>
      </View>
    </View>
  );
}