/**
 * Grayscale Color Tokens
 *
 * Complete tokenization of all grayscale colors used throughout the app.
 * Organized from lightest to darkest with semantic naming.
 */

export const grayscaleTokens = {
  // Pure white
  white: '#FFFFFF',

  // Very light grays - backgrounds
  gray50: '#FAFAFA',    // Nearly white background (main app background)
  gray100: '#F9FAFB',   // Light background (modal sections, disabled inputs)
  gray200: '#F3F4F6',   // Subtle background (cards, toggles)

  // Light grays - borders and dividers
  gray300: '#E5E7EB',   // Primary border color (inputs, cards, dividers)
  gray400: '#D1D5DB',   // Medium-light borders (disabled states)

  // Medium grays - text and secondary elements
  gray500: '#9CA3AF',   // Medium gray (placeholder text, disabled text)
  gray600: '#8E8E93',   // System gray (iOS-style inactive elements)
  gray700: '#6B7280',   // Dark medium gray (secondary text)
  gray800: '#4B5563',   // Dark gray (body text)
  gray900: '#374151',   // Very dark gray (headings, important text)

  // Almost black
  black: '#111827',     // Primary text, buttons, main UI elements
} as const;

/**
 * Semantic color mappings for common use cases
 */
export const semanticGrays = {
  // Backgrounds
  appBackground: grayscaleTokens.gray50,
  cardBackground: grayscaleTokens.white,
  modalBackground: grayscaleTokens.white,
  sectionBackground: grayscaleTokens.gray100,
  disabledBackground: grayscaleTokens.gray100,

  // Borders
  defaultBorder: grayscaleTokens.gray300,
  subtleBorder: grayscaleTokens.gray200,
  strongBorder: grayscaleTokens.gray400,

  // Text
  primaryText: grayscaleTokens.black,
  secondaryText: grayscaleTokens.gray700,
  tertiaryText: grayscaleTokens.gray500,
  placeholderText: grayscaleTokens.gray500,
  disabledText: grayscaleTokens.gray500,

  // Interactive elements
  buttonPrimary: grayscaleTokens.black,
  buttonSecondary: grayscaleTokens.gray100,
  buttonDisabled: grayscaleTokens.gray400,

  // Navigation
  tabBarBackground: grayscaleTokens.gray100,
  tabBarBorder: grayscaleTokens.gray300,
  headerBackground: grayscaleTokens.gray100,

  // Overlays and shadows
  overlay: 'rgba(0, 0, 0, 0.1)', // For modals
  shadowColor: '#000000',
} as const;

// Type exports for TypeScript usage
export type GrayscaleToken = keyof typeof grayscaleTokens;
export type SemanticGray = keyof typeof semanticGrays;