/**
 * Grayscale Color Tokens
 *
 * Complete tokenization of all grayscale colors used throughout the app.
 * Supports both light and dark themes with semantic relationships preserved.
 */

export type ThemeMode = 'light' | 'dark';

export const grayscaleTokens = {
  light: {
    // Pure white
    white: '#FFFFFF',

    // Very light grays - backgrounds (neutral)
    gray50: '#FAFAFA',    // Nearly white background (main app background)
    gray100: '#F5F5F5',   // Light background (modal sections, disabled inputs) - neutral
    gray200: '#EEEEEE',   // Subtle background (cards, toggles) - neutral

    // Light grays - borders and dividers (neutral)
    gray300: '#E0E0E0',   // Primary border color (inputs, cards, dividers) - neutral
    gray400: '#BDBDBD',   // Medium-light borders (disabled states) - neutral

    // Medium grays - text and secondary elements (neutral)
    gray500: '#9E9E9E',   // Medium gray (placeholder text, disabled text) - neutral
    gray600: '#8E8E8E',   // Medium gray (inactive elements) - neutral
    gray700: '#707070',   // Dark medium gray (secondary text) - neutral
    gray800: '#424242',   // Dark gray (body text) - neutral
    gray900: '#212121',   // Very dark gray (headings, important text) - neutral

    // Almost black (neutral)
    black: '#1C1C1C',     // Primary text, buttons, main UI elements - neutral
  },

  dark: {
    // Pure white (inverted context)
    white: '#161616',     // Dark background (neutral dark)

    // Dark backgrounds (neutral grays)
    gray50: '#0F0F0F',    // Darkest background (main app background)
    gray100: '#1C1C1C',   // Dark background (modal sections, disabled inputs)
    gray200: '#2A2A2A',   // Subtle dark background (cards, toggles)

    // Dark borders and dividers (neutral)
    gray300: '#404040',   // Primary border color (inputs, cards, dividers)
    gray400: '#5A5A5A',   // Medium borders (disabled states)

    // Light grays for text on dark backgrounds (neutral)
    gray500: '#8A8A8A',   // Medium gray (placeholder text)
    gray600: '#D1D1D1',   // Light gray (iOS-style inactive elements)
    gray700: '#E5E5E5',   // Light gray (secondary text)
    gray800: '#F3F3F3',   // Very light gray (body text)
    gray900: '#FAFAFA',   // Nearly white (headings, important text)

    // Pure white for highest contrast
    black: '#FFFFFF',     // Primary text, buttons, main UI elements
  }
} as const;

/**
 * Theme-aware color resolver function
 */
export const getThemeColors = (mode: ThemeMode) => {
  return grayscaleTokens[mode];
};

/**
 * Semantic color mappings for common use cases
 * These return the appropriate color based on the current theme mode
 */
export const createSemanticColors = (mode: ThemeMode) => {
  const colors = getThemeColors(mode);

  return {
    // Backgrounds
    appBackground: colors.gray50,
    cardBackground: colors.white,
    modalBackground: colors.white,
    sectionBackground: colors.gray50,
    disabledBackground: colors.gray100,

    // Borders
    defaultBorder: colors.gray300,
    subtleBorder: colors.gray200,
    strongBorder: colors.gray400,

    // Text
    primaryText: colors.black,
    secondaryText: colors.gray900,
    tertiaryText: colors.gray500,
    placeholderText: colors.gray500,
    disabledText: colors.gray500,

    // Interactive elements
    buttonPrimary: colors.black,
    buttonSecondary: colors.gray100,
    buttonDisabled: colors.gray400,

    // Navigation
    tabBarBackground: colors.gray100,
    tabBarBorder: colors.gray300,
    headerBackground: colors.gray100,
    headerBorder: colors.gray300,

    // Overlays and shadows
    overlay: mode === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.5)',
    shadowColor: mode === 'light' ? '#000000' : '#000000',
  } as const;
};

// Type exports for TypeScript usage
export type GrayscaleToken = keyof typeof grayscaleTokens.light;
export type SemanticColors = ReturnType<typeof createSemanticColors>;