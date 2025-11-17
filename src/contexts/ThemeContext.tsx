import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { ThemeMode, getThemeColors, createSemanticColors } from '@/constants/grayscaleTokens';
import { selectCurrentThemeMode, setSystemMode } from '@/store/slices/themeSlice';
import { RootState } from '@/store';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ReturnType<typeof getThemeColors>;
  semanticColors: ReturnType<typeof createSemanticColors>;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const dispatch = useDispatch();
  const systemColorScheme = useColorScheme();
  const currentMode = useSelector(selectCurrentThemeMode);

  // Update system mode when device appearance changes
  useEffect(() => {
    const systemMode: ThemeMode = systemColorScheme === 'dark' ? 'dark' : 'light';
    dispatch(setSystemMode(systemMode));
  }, [systemColorScheme, dispatch]);

  // Create theme values
  const colors = getThemeColors(currentMode);
  const semanticColors = createSemanticColors(currentMode);
  const isDark = currentMode === 'dark';

  const value: ThemeContextValue = {
    mode: currentMode,
    colors,
    semanticColors,
    isDark,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Convenience hooks for specific theme aspects
export function useThemeMode() {
  const { mode } = useTheme();
  return mode;
}

export function useThemeColors() {
  const { colors } = useTheme();
  return colors;
}

export function useSemanticColors() {
  const { semanticColors } = useTheme();
  return semanticColors;
}

export function useIsDark() {
  const { isDark } = useTheme();
  return isDark;
}