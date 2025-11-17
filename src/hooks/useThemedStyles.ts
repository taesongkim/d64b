import { useMemo } from 'react';
import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/**
 * Hook for creating theme-aware styles with automatic memoization
 *
 * Usage:
 * const styles = useThemedStyles(createStyles);
 *
 * Where createStyles is a function that receives theme data and returns styles
 */
export function useThemedStyles<T extends NamedStyles<T>>(
  createStyles: (theme: {
    colors: ReturnType<typeof import('@/constants/grayscaleTokens').getThemeColors>;
    semanticColors: ReturnType<typeof import('@/constants/grayscaleTokens').createSemanticColors>;
    mode: import('@/constants/grayscaleTokens').ThemeMode;
    isDark: boolean;
  }) => T
): T {
  const theme = useTheme();

  return useMemo(() => {
    const styles = createStyles(theme);
    return StyleSheet.create(styles);
  }, [theme, createStyles]);
}

/**
 * Hook for creating theme-aware dynamic styles (non-memoized)
 * Useful when styles depend on props or frequently changing state
 */
export function useDynamicThemedStyles<T extends NamedStyles<T>>(
  createStyles: (theme: {
    colors: ReturnType<typeof import('@/constants/grayscaleTokens').getThemeColors>;
    semanticColors: ReturnType<typeof import('@/constants/grayscaleTokens').createSemanticColors>;
    mode: import('@/constants/grayscaleTokens').ThemeMode;
    isDark: boolean;
  }) => T
): T {
  const theme = useTheme();

  const styles = createStyles(theme);
  return StyleSheet.create(styles);
}