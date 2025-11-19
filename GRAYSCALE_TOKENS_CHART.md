# Grayscale Color Tokens Chart

## Complete Grayscale Color System

| Token Name | Light Mode | Dark Mode | Usage Description | Key Locations |
|------------|------------|-----------|-------------------|---------------|
| **white** | `#FFFFFF` | `#0F0F0F` | Background surfaces, card content | Modal backgrounds, card content, input backgrounds |
| **gray50** | `#FAFAFA` | `#0F0F0F` | Main app background | App container, screen backgrounds |
| **gray100** | `#F5F5F5` | `#1C1C1C` | Light background for sections | Modal sections, disabled inputs, tab bars, headers |
| **gray200** | `#EEEEEE` | `#2A2A2A` | Subtle background for UI elements | Toggle backgrounds, subtle cards, view toggles |
| **gray300** | `#E0E0E0` | `#404040` | **Primary border color** | Input borders, card borders, dividers, grid lines |
| **gray400** | `#BDBDBD` | `#5A5A5A` | Medium borders and disabled states | Disabled buttons, secondary borders |
| **gray500** | `#9E9E9E` | `#8A8A8A` | Placeholder text and tertiary elements | Placeholder text, disabled text, inactive elements |
| **gray600** | `#8E8E8E` | `#D1D1D1` | Medium gray for inactive elements | Inactive tab text, secondary UI elements |
| **gray700** | `#707070` | `#E5E5E5` | Secondary text color | Secondary text, captions, helper text, form labels |
| **gray800** | `#424242` | `#F3F3F3` | Important secondary content | Important secondary text, form field text |
| **gray900** | `#212121` | `#FAFAFA` | Headings and emphasis | Headings, emphasized text, important UI elements |
| **black** | `#1C1C1C` | `#FFFFFF` | **Primary text/UI color** | Primary text, buttons, icons, main UI elements |

## Semantic Mappings (Theme-Aware)

### Backgrounds
- **App Background**: `gray50` - Main screen background
- **Card Background**: `white` - Cards, modals, elevated surfaces
- **Section Background**: `gray50` - Form sections, grouped content
- **Disabled Background**: `gray100` - Disabled inputs, inactive states

### Borders & Dividers
- **Default Border**: `gray300` - Primary border for all inputs, cards
- **Subtle Border**: `gray200` - Very light dividers
- **Strong Border**: `gray400` - Emphasized borders

### Text Hierarchy
- **Primary Text**: `black` - Main content, headings, button text
- **Secondary Text**: `gray900` - Supporting content, captions
- **Tertiary Text**: `gray500` - Helper text, placeholders
- **Disabled Text**: `gray500` - Inactive text elements

### Interactive Elements
- **Button Primary**: `black` - Main action buttons
- **Button Secondary**: `gray100` - Secondary action buttons
- **Button Disabled**: `gray400` - Inactive buttons

## Current Token Usage in Codebase

### Most Frequently Used Tokens
1. **`gray300`** - Primary border color (inputs, cards, dividers)
2. **`gray100`** - Section backgrounds (modals, disabled inputs, headers)
3. **`black`** - Primary text and UI elements
4. **`gray900`** - Secondary text content
5. **`gray500`** - Placeholder and tertiary text

### Screen Distribution
- **Dashboard**: Full spectrum usage - text hierarchy, borders, backgrounds
- **Modals** (Add/Edit): Borders, section backgrounds, form elements
- **Navigation**: Backgrounds, borders, text hierarchy
- **Social/Friends**: Cards, borders, text hierarchy, state indicators
- **Analytics**: Chart backgrounds, text hierarchy, card styling

## Theme System Implementation

### Access Patterns
```typescript
// Raw tokens (theme-aware)
const { colors } = useTheme();
colors.gray300  // Auto-switches: #E5E7EB → #404040

// Semantic colors (recommended)
const { semanticColors } = useTheme();
semanticColors.defaultBorder  // Maps to gray300
semanticColors.primaryText    // Maps to black
```

### Border Removal Impact
Removing `borderWidth` and `borderColor` from TextInput fields will rely on:
- **Light Mode**: Background contrast (`white` #FFFFFF on `gray50` #FAFAFA)
- **Dark Mode**: Background contrast (`white` #0F0F0F on `gray50` #0F0F0F)

**Note**: In dark mode, TextInput and container backgrounds are identical (#0F0F0F), so visual separation will depend on focus states, shadows, or padding.