import React from 'react';
import { View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

interface CustomSkipIconProps {
  size?: number;
  color?: string;
}

export default function CustomSkipIcon({ size = 12, color = 'white' }: CustomSkipIconProps) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 12 12">
        {/* Shorter horizontal line with rounded ends */}
        <Line
          x1="3"
          y1="6"
          x2="9"
          y2="6"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
