/**
 * Centralized modal styling system
 * Provides consistent styling tokens and patterns for all modal components
 */

import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { getThemeColors, createSemanticColors, type ThemeMode } from '@/constants/grayscaleTokens';

// Theme-aware color function for modal components
export const getModalColors = (themeMode: ThemeMode) => {
  const colors = getThemeColors(themeMode);
  const semanticColors = createSemanticColors(themeMode);

  return {
    // Overlay
    overlayBackground: themeMode === 'light' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.9)',

    // Content backgrounds
    contentBackground: semanticColors.modalBackground,
    sectionBackground: themeMode === 'light' ? '#F9FAFB' : colors.gray800,

    // Text colors
    primaryText: semanticColors.primaryText,
    secondaryText: semanticColors.secondaryText,
    placeholderText: themeMode === 'light' ? colors.gray400 : colors.gray500,

    // Border colors
    borderLight: themeMode === 'light' ? colors.gray200 : colors.gray700,
    borderDark: themeMode === 'light' ? colors.gray300 : colors.gray600,

    // Button colors
    primaryButton: semanticColors.primaryText,
    primaryButtonText: semanticColors.modalBackground,
    secondaryButton: themeMode === 'light' ? colors.gray100 : colors.gray200,
    secondaryButtonText: semanticColors.secondaryText,
    disabledButton: themeMode === 'light' ? colors.gray400 : colors.gray600,

    // Action button colors (secondary style with icons)
    actionButton: themeMode === 'light' ? semanticColors.modalBackground : colors.gray100,
    actionButtonBorder: themeMode === 'light' ? colors.gray200 : colors.gray700,
    actionButtonText: semanticColors.secondaryText,
    actionButtonIcon: semanticColors.secondaryText,

    // Content container colors
    contentCard: semanticColors.modalBackground,
    contentCardBorder: themeMode === 'light' ? colors.gray200 : colors.gray700,

    // Close button
    closeButtonBackground: themeMode === 'light' ? colors.gray100 : colors.gray200,
    closeButtonText: themeMode === 'light' ? semanticColors.secondaryText : colors.gray600,
  } as const;
};

// Spacing tokens
export const MODAL_SPACING = {
  // Overlay padding (space around modal)
  overlayPadding: 20,

  // Content padding (internal modal padding)
  contentPadding: 24,

  // Section spacing
  sectionMargin: 20,
  headerMargin: 24,

  // Element spacing
  elementGap: 8,
  buttonGap: 12,

  // Input padding
  inputPaddingHorizontal: 16,
  inputPaddingVertical: 12,
} as const;

// Size tokens
export const MODAL_SIZES = {
  // Modal dimensions
  maxHeight: '90%',
  width: '100%',

  // Border radius
  contentBorderRadius: 12,
  inputBorderRadius: 8,
  buttonBorderRadius: 8,
  closeButtonBorderRadius: 16,

  // Close button
  closeButtonSize: 32,

  // Input heights
  inputMinHeight: 44,
  textAreaMinHeight: 80,
} as const;

// Theme-aware typography function
export const getModalTypography = (themeMode: ThemeMode) => {
  const modalColors = getModalColors(themeMode);

  return {
    // Title sizes
    titleFontSize: 24,
    titleColor: modalColors.primaryText,

    // Label sizes
    labelFontSize: 16,
    labelColor: modalColors.primaryText,

    // Input text
    inputFontSize: 16,
    inputColor: modalColors.primaryText,

    // Button text
    buttonFontSize: 16,

    // Close button
    closeFontSize: 18,
  } as const;
};

// Base modal styles that can be reused across all modals
export const createModalStyles = (themeMode: ThemeMode = 'light') => {
  const modalColors = getModalColors(themeMode);
  const modalTypography = getModalTypography(themeMode);

  return StyleSheet.create({
    // Overlay container
    overlay: {
      flex: 1,
      backgroundColor: modalColors.overlayBackground,
      justifyContent: 'center',
      alignItems: 'center',
      padding: MODAL_SPACING.overlayPadding,
    } as ViewStyle,

    // Modal content container
    modalContent: {
      backgroundColor: modalColors.contentBackground,
      borderRadius: MODAL_SIZES.contentBorderRadius,
      width: MODAL_SIZES.width,
      maxHeight: MODAL_SIZES.maxHeight,
      padding: MODAL_SPACING.contentPadding,
    } as ViewStyle,

    // Header section
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: MODAL_SPACING.headerMargin,
    } as ViewStyle,

    // Title text
    title: {
      fontSize: modalTypography.titleFontSize,
      color: modalTypography.titleColor,
    } as TextStyle,

    // Close button
    closeButton: {
      width: MODAL_SIZES.closeButtonSize,
      height: MODAL_SIZES.closeButtonSize,
      borderRadius: MODAL_SIZES.closeButtonBorderRadius,
      backgroundColor: modalColors.closeButtonBackground,
      justifyContent: 'center',
      alignItems: 'center',
    } as ViewStyle,

    closeText: {
      fontSize: modalTypography.closeFontSize,
      color: modalColors.closeButtonText,
      lineHeight: modalTypography.closeFontSize,
      textAlign: 'center',
      textAlignVertical: 'center',
    } as TextStyle,

    // Section containers
    section: {
      marginBottom: MODAL_SPACING.sectionMargin,
    } as ViewStyle,

    // Labels
    label: {
      fontSize: modalTypography.labelFontSize,
      color: modalTypography.labelColor,
      marginBottom: MODAL_SPACING.elementGap,
    } as TextStyle,

    // Input fields
    input: {
      borderWidth: 1,
      borderColor: modalColors.borderLight,
      borderRadius: MODAL_SIZES.inputBorderRadius,
      paddingHorizontal: MODAL_SPACING.inputPaddingHorizontal,
      paddingVertical: MODAL_SPACING.inputPaddingVertical,
      fontSize: modalTypography.inputFontSize,
      color: modalTypography.inputColor,
      minHeight: MODAL_SIZES.inputMinHeight,
    } as ViewStyle & TextStyle,

    // Button container
    buttonContainer: {
      flexDirection: 'row',
      gap: MODAL_SPACING.buttonGap,
      marginTop: MODAL_SPACING.elementGap,
    } as ViewStyle,

    // Primary button (Save, Add, etc.)
    primaryButton: {
      flex: 1,
      paddingVertical: MODAL_SPACING.inputPaddingVertical + 4, // Slightly taller than inputs
      borderRadius: MODAL_SIZES.buttonBorderRadius,
      backgroundColor: modalColors.primaryButton,
      alignItems: 'center',
    } as ViewStyle,

    primaryButtonText: {
      color: modalColors.primaryButtonText,
      fontSize: modalTypography.buttonFontSize,
    } as TextStyle,

    // Secondary button (Cancel, etc.)
    secondaryButton: {
      flex: 1,
      paddingVertical: MODAL_SPACING.inputPaddingVertical + 4,
      borderRadius: MODAL_SIZES.buttonBorderRadius,
      borderWidth: 1,
      borderColor: modalColors.borderLight,
      alignItems: 'center',
    } as ViewStyle,

    secondaryButtonText: {
      color: modalColors.secondaryButtonText,
      fontSize: modalTypography.buttonFontSize,
    } as TextStyle,

    // Disabled button state
    disabledButton: {
      backgroundColor: modalColors.disabledButton,
    } as ViewStyle,
  });
};

// Shared component style generators
export const createSharedButtonStyles = (themeMode: ThemeMode) => {
  const modalColors = getModalColors(themeMode);

  return {
    // Base input styles (shared properties only)
    baseInput: {
      backgroundColor: modalColors.contentCard,
      borderColor: modalColors.borderLight,
      color: modalColors.primaryText,
      borderRadius: MODAL_SIZES.inputBorderRadius,
      borderWidth: 1,
    },

    // Primary button (Create/Save)
    primaryButton: {
      backgroundColor: modalColors.primaryButton,
      borderRadius: MODAL_SIZES.buttonBorderRadius,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: modalColors.primaryButtonText,
      fontSize: 16,
      fontWeight: '600',
    },

    // Secondary button (Cancel)
    secondaryButton: {
      backgroundColor: modalColors.secondaryButton,
      borderColor: modalColors.borderLight,
      borderWidth: 1,
      borderRadius: MODAL_SIZES.buttonBorderRadius,
      alignItems: 'center',
    },
    secondaryButtonText: {
      color: modalColors.secondaryButtonText,
      fontSize: 16,
      fontWeight: '500',
    },

    // Action button (Edit/Archive/Delete with icons)
    actionButton: {
      backgroundColor: modalColors.actionButton,
      borderColor: modalColors.actionButtonBorder,
      borderWidth: 1,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionButtonText: {
      color: modalColors.actionButtonText,
      fontSize: 14,
      fontWeight: '500',
    },

    // Content containers (white cards with borders)
    contentCard: {
      backgroundColor: modalColors.contentCard,
      borderColor: modalColors.contentCardBorder,
      borderWidth: 1,
      borderRadius: 8,
    },

    // Disabled states
    disabledButton: {
      backgroundColor: modalColors.disabledButton,
    },
    disabledButtonText: {
      color: modalColors.placeholderText,
    },
  };
};

// Export the base styles for light mode (backwards compatibility)
export const MODAL_STYLES = createModalStyles('light');

// Export function to get theme-aware modal styles
export const getModalStyles = (themeMode: ThemeMode) => createModalStyles(themeMode);