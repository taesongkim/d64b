import React from 'react';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { getThemeColors, createSemanticColors, type ThemeMode } from '@/constants/grayscaleTokens';

interface ViewModeIconProps {
  size?: number;
  color?: string;
  isActive?: boolean;
  themeMode?: ThemeMode;
}

// Icon representing 2 cells (default/spacious view)
export function SpaciousViewIcon({ size = 20, color, isActive = false, themeMode = 'light' }: ViewModeIconProps) {
  const colors = getThemeColors(themeMode);
  const semanticColors = createSemanticColors(themeMode);
  const defaultColor = themeMode === 'light' ? colors.gray500 : colors.gray700;
  const activeColor = isActive ? (themeMode === 'light' ? colors.gray500 : semanticColors.primaryText) : (color || defaultColor);
  const opacity = isActive ? "1.0" : "0.4";

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 20 20">
        {/* Two square cells side by side with small gap, centered vertically */}
        <Rect x="3" y="7" width="6" height="6" rx="1" fill={activeColor} opacity={opacity} />
        <Rect x="11" y="7" width="6" height="6" rx="1" fill={activeColor} opacity={opacity} />
      </Svg>
    </View>
  );
}

// Icon representing 8 cells in compact grid (condensed view)
export function CompactViewIcon({ size = 20, color, isActive = false, themeMode = 'light' }: ViewModeIconProps) {
  const colors = getThemeColors(themeMode);
  const semanticColors = createSemanticColors(themeMode);
  const defaultColor = themeMode === 'light' ? colors.gray500 : colors.gray700;
  const activeColor = isActive ? (themeMode === 'light' ? colors.gray500 : semanticColors.primaryText) : (color || defaultColor);
  const opacity = isActive ? "1.0" : "0.4";

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 20 20">
        {/* 8 cells in 2x4 grid, perfectly centered */}
        <Rect x="2" y="6" width="3" height="3" rx="0.5" fill={activeColor} opacity={opacity} />
        <Rect x="6" y="6" width="3" height="3" rx="0.5" fill={activeColor} opacity={opacity} />
        <Rect x="10" y="6" width="3" height="3" rx="0.5" fill={activeColor} opacity={opacity} />
        <Rect x="14" y="6" width="3" height="3" rx="0.5" fill={activeColor} opacity={opacity} />
        <Rect x="2" y="10" width="3" height="3" rx="0.5" fill={activeColor} opacity={opacity} />
        <Rect x="6" y="10" width="3" height="3" rx="0.5" fill={activeColor} opacity={opacity} />
        <Rect x="10" y="10" width="3" height="3" rx="0.5" fill={activeColor} opacity={opacity} />
        <Rect x="14" y="10" width="3" height="3" rx="0.5" fill={activeColor} opacity={opacity} />
      </Svg>
    </View>
  );
}
