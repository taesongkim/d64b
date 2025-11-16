# Grayscale Color Tokens Chart

## Complete Grayscale Color System

| Token Name | Hex Value | RGB Values | Usage Description | Key Locations |
|------------|-----------|------------|-------------------|---------------|
| **white** | `#FFFFFF` | 255,255,255 | Pure white for text on dark backgrounds, card surfaces | Button text, modal backgrounds, card content |
| **gray50** | `#FAFAFA` | 250,250,250 | Nearly white - main app background | App container, screen backgrounds |
| **gray100** | `#F9FAFB` | 249,250,251 | Light background for sections and disabled states | Modal sections, disabled inputs, tab bars, header backgrounds |
| **gray200** | `#F3F4F6` | 243,244,246 | Subtle background for cards and UI elements | Toggle backgrounds, subtle cards, view toggles |
| **gray300** | `#E5E7EB` | 229,231,235 | **Primary border color** - most common border/divider | Input borders, card borders, dividers, switches, grid lines |
| **gray400** | `#D1D5DB` | 209,213,219 | Medium borders and disabled button states | Disabled buttons, secondary borders |
| **gray500** | `#9CA3AF` | 156,163,175 | Medium gray for placeholder text and tertiary elements | Placeholder text, disabled text, inactive elements, tertiary UI |
| **gray600** | `#8E8E93` | 142,142,147 | System gray for inactive navigation elements | Inactive tab text, iOS-style secondary elements |
| **gray700** | `#6B7280` | 107,114,128 | **Secondary text color** - readable secondary content | Secondary text, captions, helper text, form labels |
| **gray800** | `#4B5563` | 75,85,99 | Dark gray for important secondary content | Important secondary text, form field text |
| **gray900** | `#374151` | 55,65,81 | Very dark gray for headings and emphasis | Headings, emphasized text, important UI elements |
| **black** | `#111827` | 17,24,39 | **Primary text/UI color** - highest contrast | Primary text, buttons, icons, main UI elements |

## Semantic Mappings

### Backgrounds
- **App Background**: `gray50` (#FAFAFA) - Main screen background
- **Card Background**: `white` (#FFFFFF) - Cards, modals, elevated surfaces
- **Section Background**: `gray100` (#F9FAFB) - Form sections, grouped content
- **Disabled Background**: `gray100` (#F9FAFB) - Disabled inputs, inactive states

### Borders & Dividers
- **Default Border**: `gray300` (#E5E7EB) - Primary border for all inputs, cards
- **Subtle Border**: `gray200` (#F3F4F6) - Very light dividers
- **Strong Border**: `gray400` (#D1D5DB) - Emphasized borders

### Text Hierarchy
- **Primary Text**: `black` (#111827) - Main content, headings, button text
- **Secondary Text**: `gray700` (#6B7280) - Supporting content, captions
- **Tertiary Text**: `gray500` (#9CA3AF) - Helper text, placeholders
- **Disabled Text**: `gray500` (#9CA3AF) - Inactive text elements

### Interactive Elements
- **Button Primary**: `black` (#111827) - Main action buttons
- **Button Secondary**: `gray100` (#F9FAFB) - Secondary action buttons
- **Button Disabled**: `gray400` (#D1D5DB) - Inactive buttons

## Usage Statistics

### Most Frequently Used Colors
1. **`#E5E7EB` (gray300)** - 47+ occurrences - Primary border color
2. **`#F9FAFB` (gray100)** - 15+ occurrences - Section backgrounds
3. **`#111827` (black)** - 25+ occurrences - Primary text/UI elements
4. **`#6B7280` (gray700)** - 20+ occurrences - Secondary text
5. **`#9CA3AF` (gray500)** - 18+ occurrences - Placeholder/tertiary text

### Screen Distribution
- **Dashboard**: Uses full spectrum - primary text, secondary text, borders, backgrounds
- **Modals** (Add/Edit): Heavy use of borders, section backgrounds, form elements
- **Navigation**: Light backgrounds, borders, text hierarchy
- **Social/Friends**: Cards, borders, text hierarchy, state indicators
- **Analytics**: Chart backgrounds, text hierarchy, card styling

## Consolidations Made
- `#FFFFFF` + `#ffffff` → `white`
- `#F9FAFB` + `#f8f9fa` → `gray100`
- `#E5E7EB` + `#e5e5e7` → `gray300`

## Notes for Dark Mode Implementation
- Each gray level will need a corresponding dark mode value
- Text hierarchy relationships should be preserved (contrast ratios)
- Border visibility may need adjustment in dark mode
- Background layering system is well-established for dark mode adaptation