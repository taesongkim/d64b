/**
 * Centralized modal styling system
 * Provides consistent styling tokens and patterns for all modal components
 */

import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

// Color tokens for modal components
export const MODAL_COLORS = {
  // Overlay
  overlayBackground: 'rgba(0, 0, 0, 0.5)',

  // Content backgrounds
  contentBackground: 'white',
  sectionBackground: '#F9FAFB',

  // Text colors
  primaryText: '#111827',
  secondaryText: '#6B7280',
  placeholderText: '#9CA3AF',

  // Border colors
  borderLight: '#E5E7EB',
  borderDark: '#D1D5DB',

  // Button colors
  primaryButton: '#111827',
  primaryButtonText: 'white',
  secondaryButton: '#F9FAFB',
  secondaryButtonText: '#6B7280',
  disabledButton: '#9CA3AF',

  // Close button
  closeButtonBackground: '#F3F4F6',
  closeButtonText: '#6B7280',
} as const;

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

// Typography tokens
export const MODAL_TYPOGRAPHY = {
  // Title sizes
  titleFontSize: 24,
  titleColor: MODAL_COLORS.primaryText,

  // Label sizes
  labelFontSize: 16,
  labelColor: MODAL_COLORS.primaryText,

  // Input text
  inputFontSize: 16,
  inputColor: MODAL_COLORS.primaryText,

  // Button text
  buttonFontSize: 16,

  // Close button
  closeFontSize: 18,
} as const;

// Base modal styles that can be reused across all modals
export const createModalStyles = () => StyleSheet.create({
  // Overlay container
  overlay: {
    flex: 1,
    backgroundColor: MODAL_COLORS.overlayBackground,
    justifyContent: 'center',
    alignItems: 'center',
    padding: MODAL_SPACING.overlayPadding,
  } as ViewStyle,

  // Modal content container
  modalContent: {
    backgroundColor: MODAL_COLORS.contentBackground,
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
    fontSize: MODAL_TYPOGRAPHY.titleFontSize,
    color: MODAL_TYPOGRAPHY.titleColor,
  } as TextStyle,

  // Close button
  closeButton: {
    width: MODAL_SIZES.closeButtonSize,
    height: MODAL_SIZES.closeButtonSize,
    borderRadius: MODAL_SIZES.closeButtonBorderRadius,
    backgroundColor: MODAL_COLORS.closeButtonBackground,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,

  closeText: {
    fontSize: MODAL_TYPOGRAPHY.closeFontSize,
    color: MODAL_COLORS.closeButtonText,
  } as TextStyle,

  // Section containers
  section: {
    marginBottom: MODAL_SPACING.sectionMargin,
  } as ViewStyle,

  // Labels
  label: {
    fontSize: MODAL_TYPOGRAPHY.labelFontSize,
    color: MODAL_TYPOGRAPHY.labelColor,
    marginBottom: MODAL_SPACING.elementGap,
  } as TextStyle,

  // Input fields
  input: {
    borderWidth: 1,
    borderColor: MODAL_COLORS.borderLight,
    borderRadius: MODAL_SIZES.inputBorderRadius,
    paddingHorizontal: MODAL_SPACING.inputPaddingHorizontal,
    paddingVertical: MODAL_SPACING.inputPaddingVertical,
    fontSize: MODAL_TYPOGRAPHY.inputFontSize,
    color: MODAL_TYPOGRAPHY.inputColor,
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
    backgroundColor: MODAL_COLORS.primaryButton,
    alignItems: 'center',
  } as ViewStyle,

  primaryButtonText: {
    color: MODAL_COLORS.primaryButtonText,
    fontSize: MODAL_TYPOGRAPHY.buttonFontSize,
  } as TextStyle,

  // Secondary button (Cancel, etc.)
  secondaryButton: {
    flex: 1,
    paddingVertical: MODAL_SPACING.inputPaddingVertical + 4,
    borderRadius: MODAL_SIZES.buttonBorderRadius,
    borderWidth: 1,
    borderColor: MODAL_COLORS.borderLight,
    alignItems: 'center',
  } as ViewStyle,

  secondaryButtonText: {
    color: MODAL_COLORS.secondaryButtonText,
    fontSize: MODAL_TYPOGRAPHY.buttonFontSize,
  } as TextStyle,

  // Disabled button state
  disabledButton: {
    backgroundColor: MODAL_COLORS.disabledButton,
  } as ViewStyle,
});

// Export the base styles
export const MODAL_STYLES = createModalStyles();