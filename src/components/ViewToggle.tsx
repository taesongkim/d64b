import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SpaciousViewIcon, CompactViewIcon } from './ViewModeIcons';
import { useThemeMode } from '@/contexts/ThemeContext';
import { getGridColors } from '@/components/grids/gridPalette';
import { getThemeColors } from '@/constants/grayscaleTokens';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

type ViewMode = 'daily' | 'weekly';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export default function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps): React.JSX.Element {
  const themeMode = useThemeMode();
  const gridColors = getGridColors(themeMode);
  const colors = getThemeColors(themeMode);

  // Function to animate view mode changes using LayoutAnimation
  const animateToViewMode = (newMode: ViewMode) => {
    // Configure LayoutAnimation for smooth transitions
    LayoutAnimation.configureNext({
      duration: 200,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.scaleXY,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.scaleXY,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
    
    onViewModeChange(newMode);
  };

  // Dynamic styles using theme-aware colors - match weekday cell color
  const dynamicStyles = {
    compactToggleContainer: {
      ...styles.compactToggleContainer,
      backgroundColor: themeMode === 'light' ? colors.gray200 : gridColors.weekend,
    },
    toggleSlider: {
      ...styles.toggleSlider,
      backgroundColor: themeMode === 'light' ? colors.white : gridColors.idle,
    },
  };

  return (
    <View style={dynamicStyles.compactToggleContainer}>
      {/* Animated sliding background */}
      <View
        style={[
          dynamicStyles.toggleSlider,
          viewMode === 'weekly' && styles.toggleSliderRight
        ]}
      />
      
      {/* Left icon positioned to match slider left position */}
      <TouchableOpacity
        style={styles.iconButtonLeft}
        onPress={() => animateToViewMode('daily')}
      >
        <SpaciousViewIcon size={16} isActive={viewMode === 'daily'} themeMode={themeMode} />
      </TouchableOpacity>

      {/* Right icon positioned to match slider right position */}
      <TouchableOpacity
        style={styles.iconButtonRight}
        onPress={() => animateToViewMode('weekly')}
      >
        <CompactViewIcon size={16} isActive={viewMode === 'weekly'} themeMode={themeMode} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  compactToggleContainer: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    marginBottom: 0, // Remove bottom margin when in header
    marginRight: 0,
    borderRadius: 8,
    padding: 2,
    position: 'relative',
    width: 64, // Fixed width for consistent layout
    height: 32,
  },
  toggleSlider: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 28, // Half of container width minus padding
    height: 28,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleSliderRight: {
    left: 32, // Move to right position (half of container width minus padding)
  },
  iconButtonLeft: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    height: 28,
  },
  iconButtonRight: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    height: 28,
  },
});
