import React from 'react';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

interface ViewModeIconProps {
  size?: number;
  color?: string;
  isActive?: boolean;
}

// Icon representing 2 cells (default/spacious view)
export function SpaciousViewIcon({ size = 20, color = '#6B7280', isActive = false }: ViewModeIconProps) {
  const activeColor = isActive ? '#111827' : color;
  
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 20 20">
        {/* Two square cells side by side with small gap, centered vertically */}
        <Rect x="3" y="7" width="6" height="6" rx="1" fill={activeColor} opacity="0.3" />
        <Rect x="11" y="7" width="6" height="6" rx="1" fill={activeColor} opacity="0.3" />
      </Svg>
    </View>
  );
}

// Icon representing 8 cells in compact grid (condensed view)
export function CompactViewIcon({ size = 20, color = '#6B7280', isActive = false }: ViewModeIconProps) {
  const activeColor = isActive ? '#111827' : color;
  
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 20 20">
        {/* 8 cells in 2x4 grid, perfectly centered */}
        <Rect x="2" y="5" width="3" height="3" rx="0.5" fill={activeColor} opacity="0.3" />
        <Rect x="6" y="5" width="3" height="3" rx="0.5" fill={activeColor} opacity="0.3" />
        <Rect x="10" y="5" width="3" height="3" rx="0.5" fill={activeColor} opacity="0.3" />
        <Rect x="14" y="5" width="3" height="3" rx="0.5" fill={activeColor} opacity="0.3" />
        <Rect x="2" y="9" width="3" height="3" rx="0.5" fill={activeColor} opacity="0.3" />
        <Rect x="6" y="9" width="3" height="3" rx="0.5" fill={activeColor} opacity="0.3" />
        <Rect x="10" y="9" width="3" height="3" rx="0.5" fill={activeColor} opacity="0.3" />
        <Rect x="14" y="9" width="3" height="3" rx="0.5" fill={activeColor} opacity="0.3" />
      </Svg>
    </View>
  );
}
