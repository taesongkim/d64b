import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { toggleTheme, selectThemePreference } from '@/store/slices/themeSlice';

export function ThemeToggle() {
  const dispatch = useDispatch();
  const themePreference = useSelector(selectThemePreference);

  const styles = useThemedStyles(({ colors, semanticColors, isDark }) => ({
    toggleButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: semanticColors.sectionBackground,
      borderWidth: 1,
      borderColor: semanticColors.defaultBorder,
      justifyContent: 'center',
      alignItems: 'center',
    },
    toggleIcon: {
      fontSize: 18,
      color: semanticColors.primaryText,
    },
  }));

  const handleToggle = () => {
    dispatch(toggleTheme());
  };

  // Show appropriate icon based on theme preference
  const getIcon = () => {
    return themePreference === 'light' ? '☀️' : '🌙';
  };

  return (
    <TouchableOpacity
      style={styles.toggleButton}
      onPress={handleToggle}
      accessibilityLabel={`Theme toggle - currently ${themePreference}`}
      accessibilityRole="button"
    >
      <Text style={styles.toggleIcon}>{getIcon()}</Text>
    </TouchableOpacity>
  );
}