/**
 * Shared styling system for reorder modals
 * Provides theme-aware styles for CommitmentOrderingModalR2 and FriendOrderingModalR2
 */

import { StyleSheet } from 'react-native';
import { designTokens } from '@/constants/designTokens';
import { getThemeColors, type ThemeMode } from '@/constants/grayscaleTokens';
import { getModalColors, MODAL_SIZES } from './modalStyles';

// Preview state colors derived from skip cell colors (50% opacity)
export function getPreviewColors(mode: ThemeMode) {
  const cellColors = designTokens.cellColors[mode];
  return {
    background: cellColors.skipped.background, // Already 50% opacity
    border: mode === 'light'
      ? designTokens.cellColors.light.success.background // Solid green for border
      : designTokens.cellColors.dark.success.background,
  };
}

// Core reorder modal styles that both modals can share
export function createReorderModalStyles(mode: ThemeMode) {
  const modalColors = getModalColors(mode);
  const previewColors = getPreviewColors(mode);
  const themeColors = getThemeColors(mode);

  return StyleSheet.create({
    // Container and Layout
    container: {
      flex: 1,
      backgroundColor: themeColors.gray50, // Theme-aware background: light=#FAFAFA, dark=#0F0F0F
    },

    // Header Section Styles
    header: {
      paddingHorizontal: designTokens.spacing.lg,
      paddingVertical: designTokens.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.gray300, // Theme-aware border to match home page
    },
    headerTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: designTokens.spacing.sm,
    },
    headerBottomRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: designTokens.spacing.md,
      marginTop: designTokens.spacing.xl,
      marginBottom: designTokens.spacing.lg,
    },

    // Title and Text Styles
    title: {
      fontSize: designTokens.typography.sizes.xl,
      color: modalColors.primaryText,
      fontWeight: designTokens.typography.weights.semibold,
      flex: 1,
      textAlign: 'center',
    },
    titleLarge: {
      fontSize: designTokens.typography.sizes.xxl, // For commitment modal
    },
    description: {
      fontSize: designTokens.typography.sizes.sm,
      color: designTokens.colors.secondary, // Keep original lighter gray
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: designTokens.spacing.sm,
    },

    // Button Styles
    cancelButton: {
      paddingVertical: designTokens.spacing.sm,
      paddingHorizontal: designTokens.spacing.md,
    },
    cancelButtonText: {
      fontSize: designTokens.typography.sizes.md,
      color: modalColors.secondaryText,
    },
    saveButton: {
      paddingVertical: designTokens.spacing.sm,
      paddingHorizontal: designTokens.spacing.md,
      borderRadius: designTokens.radius.sm,
    },
    saveButtonActive: {
      backgroundColor: modalColors.primaryButton,
    },
    saveButtonText: {
      fontSize: designTokens.typography.sizes.md,
      color: modalColors.secondaryText,
    },
    saveButtonTextActive: {
      color: modalColors.primaryButtonText,
    },

    // Add Spacer/Divider Button Styles (used in CommitmentOrderingModalR2)
    addItemButton: {
      paddingHorizontal: designTokens.spacing.lg,
      paddingVertical: designTokens.spacing.md,
      borderRadius: designTokens.radius.md,
      backgroundColor: mode === 'light' ? themeColors.gray300 : themeColors.gray500, // Light: gray300, Dark: gray500
    },

    addItemButtonText: {
      color: modalColors.secondaryText, // Theme-aware secondary text color
      fontSize: designTokens.typography.sizes.md,
    },

    // Preview/Confirmation Box Styles
    previewBox: {
      backgroundColor: previewColors.background,
      borderWidth: 1,
      borderColor: previewColors.border,
      borderRadius: designTokens.radius.md,
      padding: designTokens.spacing.md,
      marginTop: designTokens.spacing.md,
    },

    // ScrollView and List Styles
    scrollContainer: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },

    // Draggable Item Row Styles
    baseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: mode === 'light' ? themeColors.white : themeColors.gray200, // Light: white, Dark: 2 notches lighter
      borderRadius: designTokens.radius.md,
      marginBottom: designTokens.spacing.xs,
    },

    // Commitment Row (used in CommitmentOrderingModalR2)
    commitmentRow: {
      justifyContent: 'space-between',
      padding: designTokens.spacing.md,
      height: 48, // ROW_HEIGHT from modal
      ...designTokens.shadow.level1,
    },

    // Friend Row (used in FriendOrderingModalR2)
    friendRow: {
      paddingHorizontal: designTokens.spacing.lg,
      paddingVertical: designTokens.spacing.sm,
      borderRadius: designTokens.radius.sm,
      marginHorizontal: designTokens.spacing.md,
      marginVertical: 2,
      height: 56, // ROW_HEIGHT from friend modal
      ...designTokens.shadow.level1,
    },

    // Spacer/Divider Rows (used in CommitmentOrderingModalR2)
    layoutItemRow: {
      position: 'relative',
      justifyContent: 'center',
      backgroundColor: themeColors.gray50, // Slightly different background
      padding: designTokens.spacing.md,
      height: 48, // ROW_HEIGHT from modal
      ...designTokens.shadow.level1,
    },

    // Disabled Row State
    disabledRow: {
      backgroundColor: themeColors.gray100,
    },

    // Info Container Styles
    itemInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },

    layoutItemInfo: {
      position: 'absolute',
      left: designTokens.spacing.md,
      right: designTokens.spacing.md,
      top: designTokens.spacing.md,
      bottom: designTokens.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Text Label Styles
    itemTitle: {
      fontSize: designTokens.typography.sizes.md,
      color: modalColors.primaryText,
      flex: 1,
    },

    itemLabel: {
      fontSize: designTokens.typography.sizes.md,
      color: designTokens.colors.secondary, // Keep original lighter gray
      fontStyle: 'italic',
    },

    // Private indicator
    privateIndicator: {
      fontSize: 12,
      marginLeft: designTokens.spacing.xs,
    },

    // Friend-specific styles (used in FriendOrderingModalR2)
    friendInfo: {
      flex: 1,
      marginLeft: designTokens.spacing.md,
    },

    friendName: {
      fontSize: designTokens.typography.sizes.md,
      color: modalColors.primaryText,
      marginBottom: 2,
    },

    friendUsername: {
      fontSize: designTokens.typography.sizes.sm,
      color: designTokens.colors.secondary, // Keep original lighter gray
    },

    // Action Button Styles
    deleteButton: {
      position: 'absolute',
      right: designTokens.spacing.md,
      top: '50%',
      transform: [{ translateY: -1 }],
      padding: designTokens.spacing.xs,
      borderRadius: designTokens.radius.sm,
      backgroundColor: 'transparent',
      zIndex: 1,
    },

    // Drag & Drop Visual States
    placeholder: {
      height: 48, // Default ROW_HEIGHT, should be overridden per modal
      backgroundColor: previewColors.background,
      borderRadius: designTokens.radius.md,
      borderWidth: 1,
      borderColor: previewColors.border,
      marginBottom: designTokens.spacing.xs,
      opacity: designTokens.dnd.placeholder.opacity,
    },

    placeholderFriend: {
      height: 56, // Friend modal ROW_HEIGHT
      marginHorizontal: designTokens.spacing.md,
    },

    draggedItem: {
      position: 'absolute',
      left: designTokens.spacing.lg,
      right: designTokens.spacing.lg,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      // backgroundColor will be set per item type in the modal
      borderRadius: designTokens.radius.md,
      padding: designTokens.spacing.md,
      height: 48, // Default, should be overridden per modal
      zIndex: 1000,
      ...designTokens.dnd.lift.shadow,
    },

  });
}