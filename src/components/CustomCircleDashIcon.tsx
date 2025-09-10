import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

interface CustomCircleDashIconProps {
  size?: number;
  color?: string;
}

export default function CustomCircleDashIcon({ size = 18, color = '#3B82F6' }: CustomCircleDashIconProps) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 18 18">
        {/* Circle outline */}
        <Circle
          cx="9"
          cy="9"
          r="7"
          stroke={color}
          strokeWidth="2"
          fill="none"
        />
        {/* Diagonal dash through the circle */}
        <Line
          x1="5"
          y1="5"
          x2="13"
          y2="13"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
