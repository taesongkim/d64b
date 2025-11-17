import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { toggleTheme, selectThemePreference } from '@/store/slices/themeSlice';
import { Icon } from './icons';
import { getGridColors } from '@/components/grids/gridPalette';

export function ThemeToggle() {
  const dispatch = useDispatch();
  const themePreference = useSelector(selectThemePreference);

  const { styles, iconColor } = useThemedStyles(({ colors, semanticColors, mode }) => {
    const gridColors = getGridColors(mode);
    return {
      styles: {
        toggleButton: {
          backgroundColor: mode === 'light' ? colors.gray200 : gridColors.weekend,
          borderRadius: 8,
          padding: 2,
          width: 32,
          height: 32,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 16, // Add spacing when used in navigation header
        },
        toggleButtonInner: {
          backgroundColor: mode === 'light' ? colors.white : gridColors.idle,
          borderRadius: 6,
          width: 28,
          height: 28,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2,
        },
      },
      iconColor: mode === 'light' ? colors.gray500 : semanticColors.primaryText,
    };
  });

  const handleToggle = () => {
    dispatch(toggleTheme());
  };

  return (
    <TouchableOpacity
      key={themePreference}
      style={styles.toggleButton}
      onPress={handleToggle}
      accessibilityLabel={`Theme toggle - currently ${themePreference}`}
      accessibilityRole="button"
      activeOpacity={0.7}
    >
      <View style={styles.toggleButtonInner}>
        <Icon
          name={themePreference === 'light' ? 'sun' : 'moon'}
          size={16}
          color={iconColor}
        />
      </View>
    </TouchableOpacity>
  );
}