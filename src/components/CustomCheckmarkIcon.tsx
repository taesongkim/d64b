import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface CustomCheckmarkIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export default function CustomCheckmarkIcon({ 
  size = 12.32, // 10% bigger than 11.2
  color = 'white', 
  strokeWidth = 2.2 // 10% thicker than 2.0
}: CustomCheckmarkIconProps) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 14 14">
        {/* Checkmark path */}
        <Path
          d="M2 7L5.5 10.5L12 4"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}
