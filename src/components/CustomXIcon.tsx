import React from 'react';
import { View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

interface CustomXIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export default function CustomXIcon({ size = 14, color = 'white', strokeWidth = 2 }: CustomXIconProps) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 14 14">
        {/* First diagonal line (top-left to bottom-right) */}
        <Line
          x1="2"
          y1="2"
          x2="12"
          y2="12"
          stroke={color}
          strokeWidth={strokeWidth.toString()}
          strokeLinecap="round"
        />
        {/* Second diagonal line (top-right to bottom-left) */}
        <Line
          x1="12"
          y1="2"
          x2="2"
          y2="12"
          stroke={color}
          strokeLinecap="round"
          strokeWidth={strokeWidth.toString()}
        />
      </Svg>
    </View>
  );
}
