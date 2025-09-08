import React from 'react';
import { View, Text } from 'react-native';

export default function DashboardScreen(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center p-5 bg-gray-50">
      <Text className="text-3xl font-bold mb-2 text-gray-900">Dashboard</Text>
      <Text className="text-lg text-gray-600 mb-5 text-center">
        Habit tracking will go here
      </Text>
      <Text className="text-sm text-gray-500 text-center px-4 leading-5">
        This is where users will see their habit grid, mark habits as complete, and view their streaks.
      </Text>
    </View>
  );
}