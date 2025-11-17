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
    fail: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
  },

  // Cell color system for grid states
  cellColors: {
    light: {
      success: {
        background: '#59CF92',
        content: '#308F6D',
      },
      skipped: {
        background: '#59CF9280', // 50% opacity of #59CF92
        content: '#308F6D',
      },
      fail: {
        background: '#F47887',
        content: '#BD3747',
      },
      idle: {
        background: '#F3F4F6', // Will use gray200 token
        content: '#6B7280',
      },
      weekend: {
        background: '#E5E7EB', // Will use gray300 token
        content: '#6B7280',
      },
      today: {
        background: '#F3F4F6', // Will use gray200 token
        content: '#6B7280',
      },
    },
    dark: {
      success: {
        background: '#279F74',
        content: '#0E6848',
      },
      skipped: {
        background: '#279F7480', // 50% opacity of #279F74
        content: '#0E6848',
      },
      fail: {
        background: '#B43746',
        content: '#7B2C36',
      },
      idle: {
        background: '#2A2A2A', // Will use gray200 token
        content: '#8A8A8A',
      },
      weekend: {
        background: '#404040', // Will use gray300 token
        content: '#8A8A8A',
      },
      today: {
        background: '#2A2A2A', // Will use gray200 token
        content: '#8A8A8A',
      },
    },
  },

  // Subtle shadow for list items
  shadow: {
    subtle: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1, // Android
    },
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
        compact: 6,    // Minimal spacing for weekly/compact view
        regular: 12,   // Standard spacing for daily view
        comfortable: 48, // Extra spacing for visual separation
      },
    },
    divider: {
      thickness: 1,    // Line thickness for dividers (Phase 4)
      color: {
        light: '#E5E7EB',   // Gray-200 for subtle dividers (one notch darker)
        dark: '#555555',    // Neutral gray for prominent dividers (no blue tint)
        primary: '#3B82F6', // Blue-500 for themed dividers
        secondary: '#8B5CF6', // Purple-500 for accent dividers
        muted: '#F3F4F6',   // Gray-100 for very subtle dividers
      },
      style: {
        solid: 'solid' as const,
        dashed: 'dashed' as const,
        dotted: 'dotted' as const,
      },
      opacity: {
        subtle: 0.5,
        normal: 1.0,
        emphasized: 1.0,
      },
      borderRadius: {
        none: 0,
        small: 1,
        medium: 2,
      },
      // Layout positioning for grid integration
      layout: {
        verticalAlignment: 'center' as const,
        horizontalSpan: 'full' as const,
      },
    },
  },
} as const;

// Type-safe access to design tokens
export type DesignTokens = typeof designTokens;