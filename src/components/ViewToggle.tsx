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
import { HapticService } from '@/services/hapticService';

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
  // Function to animate view mode changes using LayoutAnimation
  const animateToViewMode = (newMode: ViewMode) => {
    // Provide haptic feedback for the toggle interaction
    HapticService.light();
    
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

  return (
    <View style={styles.compactToggleContainer}>
      {/* Animated sliding background */}
      <View 
        style={[
          styles.toggleSlider,
          viewMode === 'weekly' && styles.toggleSliderRight
        ]} 
      />
      
      {/* Left icon positioned to match slider left position */}
      <TouchableOpacity
        style={styles.iconButtonLeft}
        onPress={() => animateToViewMode('daily')}
      >
        <SpaciousViewIcon size={16} isActive={viewMode === 'daily'} />
      </TouchableOpacity>
      
      {/* Right icon positioned to match slider right position */}
      <TouchableOpacity
        style={styles.iconButtonRight}
        onPress={() => animateToViewMode('weekly')}
      >
        <CompactViewIcon size={16} isActive={viewMode === 'weekly'} />
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
    backgroundColor: '#F3F4F6',
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
    backgroundColor: 'white',
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
