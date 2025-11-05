/**
 * Design tokens for consistent theming across the application
 * Single source of truth for visual constants
 */

export const designTokens = {
  // Drag & Drop visual tokens
  dnd: {
    lift: {
      scale: 1.03,
      shadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8, // Android
      },
      opacity: 0.95,
    },
    placeholder: {
      tint: {
        light: '#E5E7EB', // Gray-200
        dark: '#374151',  // Gray-700
      },
      opacity: 0.8,
    },
    gesture: {
      longPressMs: 300,
      activationDistance: 4, // Minimum movement to activate drag
    },
  },

  // Animation durations
  animation: {
    fast: 150,
    normal: 250,
    slow: 350,
  },

  // Colors (extend as needed)
  colors: {
    primary: '#111827',
    secondary: '#6B7280',
    background: '#FAFAFA',
    surface: 'white',
    border: '#E5E7EB',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
  },

  // Spacing scale
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },

  // Border radius
  radius: {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
  },

  // Typography scale
  typography: {
    sizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
    },
    weights: {
      normal: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
  },

  // Layout items (spacers, dividers)
  layoutItems: {
    spacer: {
      height: {
        compact: 8,    // Minimal spacing for weekly/compact view
        regular: 16,   // Standard spacing for daily view
        comfortable: 48, // Extra spacing for visual separation
      },
    },
    divider: {
      thickness: 2,    // Line thickness for dividers (Phase 4)
      color: {
        light: '#E5E7EB', // Gray-200 for subtle dividers
        dark: '#6B7280',  // Gray-500 for prominent dividers
      },
    },
  },
} as const;

// Type-safe access to design tokens
export type DesignTokens = typeof designTokens;