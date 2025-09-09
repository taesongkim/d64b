# UI/UX Design System

## Design Principles

### Core Philosophy
1. **Invisible Interface** - The UI should disappear, leaving only the user's intentions
2. **Quiet Confidence** - Subtle animations and transitions that feel inevitable
3. **Information Density** - Show more with less, but never feel cramped
4. **Respectful Interruption** - Only grab attention when absolutely necessary

## Color System

### Base Palette
```scss
// Neutral Scale (True Neutrals)
$gray-50:  #FAFAFA;  // Backgrounds
$gray-100: #F5F5F5;  // Subtle backgrounds
$gray-200: #E5E5E5;  // Borders
$gray-300: #D4D4D4;  // Disabled borders
$gray-400: #A3A3A3;  // Placeholder text
$gray-500: #737373;  // Secondary text
$gray-600: #525252;  // Primary text
$gray-700: #404040;  // Headings
$gray-800: #262626;  // High emphasis
$gray-900: #171717;  // Maximum contrast

// Accent Colors (Sparingly Used)
$success:     #10B981;  // Completion, streaks
$warning:     #F59E0B;  // Nudges, reminders
$danger:      #EF4444;  // Failures, breaks
$info:        #3B82F6;  // Information, tips
$purple:      #8B5CF6;  // Premium features

// Semantic Assignments
$background:        $gray-50;
$surface:          #FFFFFF;
$text-primary:     $gray-700;
$text-secondary:   $gray-500;
$border:           $gray-200;
$shadow:           rgba(0, 0, 0, 0.05);
```

### Dark Mode
```scss
// Inverted Scale
$dark-background:    $gray-900;
$dark-surface:      $gray-800;
$dark-text-primary: $gray-100;
$dark-text-secondary: $gray-400;
$dark-border:       $gray-700;
```

## Typography

### Type Scale
```scss
// Font Family
$font-sans: 'Inter', system-ui, -apple-system, sans-serif;
$font-mono: 'JetBrains Mono', monospace;

// Size Scale (Mobile)
$text-xs:   11px;  // Meta information
$text-sm:   13px;  // Secondary text
$text-base: 15px;  // Body text
$text-lg:   17px;  // Emphasized body
$text-xl:   20px;  // Section headers
$text-2xl:  24px;  // Page titles
$text-3xl:  30px;  // Hero text

// Weight Scale
$font-normal:  400;  // Body text
$font-medium:  500;  // Emphasized body
$font-semibold: 600; // Headers
$font-bold:    700;  // CTAs

// Line Heights
$leading-tight:  1.25;
$leading-normal: 1.5;
$leading-relaxed: 1.75;
```

## Spacing System

### Base Unit: 4px
```scss
$space-0:  0;
$space-1:  4px;
$space-2:  8px;
$space-3:  12px;
$space-4:  16px;
$space-5:  20px;
$space-6:  24px;
$space-8:  32px;
$space-10: 40px;
$space-12: 48px;
$space-16: 64px;
```

## Component Specifications

### Commitment Card
```scss
.commitment-card {
  background: $surface;
  border: 1px solid $border;
  border-radius: 8px;
  padding: $space-4;
  
  &.completed {
    border-color: $success;
    background: linear-gradient(135deg, 
      rgba($success, 0.05) 0%, 
      transparent 100%);
  }
  
  &.failed {
    opacity: 0.7;
  }
}
```

### Grid Cell States
```scss
.grid-cell {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  
  &.success {
    background: $success;
    color: white;
  }
  
  &.failed {
    background: $gray-100;
    color: $gray-400;
  }
  
  &.skipped {
    background: $gray-50;
    border: 1px dashed $gray-300;
  }
  
  &.pending {
    background: $surface;
    border: 1px solid $gray-200;
  }
}
```

### Button Hierarchy
```scss
.button {
  // Primary - Major actions
  &.primary {
    background: $gray-900;
    color: white;
    border: none;
    
    &:active {
      background: $gray-800;
    }
  }
  
  // Secondary - Alternative actions
  &.secondary {
    background: transparent;
    color: $gray-700;
    border: 1px solid $gray-300;
  }
  
  // Ghost - Tertiary actions
  &.ghost {
    background: transparent;
    color: $gray-600;
    border: none;
  }
}
```

## Animation Specifications

### Timing Functions
```javascript
const easings = {
  // Default - Most UI transitions
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  
  // Smooth - Continuous animations
  smooth: 'cubic-bezier(0.37, 0, 0.63, 1)',
  
  // Snappy - Quick feedback
  snappy: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  
  // Gentle - Subtle movements
  gentle: 'cubic-bezier(0.4, 0, 0.6, 1)'
};
```

### Duration Scale
```javascript
const durations = {
  instant: 100,   // Hover states
  fast: 200,      // Micro-interactions
  normal: 300,    // Standard transitions
  slow: 500,      // Complex animations
  slower: 800     // Celebration moments
};
```

### Completion Animation Sequence
```javascript
// 1. Scale up (100ms)
// 2. Checkmark draws (200ms)
// 3. Subtle pulse (300ms)
// 4. Particle burst (400ms)
// 5. Settle to final state (200ms)
// Total: ~1200ms of delight
```

## Layout Patterns

### Screen Structure
```
┌─────────────────────────┐
│   Status Bar (System)   │
├─────────────────────────┤
│   Header (48px)         │
├─────────────────────────┤
│                         │
│   Content Area          │
│   (Scrollable)          │
│                         │
├─────────────────────────┤
│   Tab Bar (56px)        │
└─────────────────────────┘
```

### Grid Layout (Mobile)
- **Default View**: 7 days visible
- **Extended View**: 14 days visible
- **Month View**: 30 days visible
- **Cell Size**: 40x40px with 4px gap
- **Scroll**: Horizontal with snap points

### Information Hierarchy
1. **Current State** - Largest, most prominent
2. **Actions** - Clear and accessible
3. **Historical Data** - Subdued but readable
4. **Metadata** - Smallest, least prominent

## Interaction Patterns

### Touch Targets
- Minimum: 44x44px (iOS) / 48x48px (Android)
- Preferred: 48x48px for primary actions
- Spacing: 8px minimum between targets

### Gestures
- **Tap**: Select, complete
- **Long Press**: More options
- **Swipe Right**: Mark complete
- **Swipe Left**: Mark failed
- **Pull to Refresh**: Sync data
- **Pinch**: Zoom timeline (future)

### Feedback States
```scss
// Visual feedback for all interactions
.touchable {
  // Rest state
  opacity: 1;
  transform: scale(1);
  
  // Pressed state
  &:active {
    opacity: 0.8;
    transform: scale(0.98);
  }
  
  // Disabled state
  &:disabled {
    opacity: 0.5;
    pointer-events: none;
  }
}
```

## Navigation Patterns

### Tab Bar Icons (24x24px)
- Home: Grid/Dashboard icon
- Social: Friends/People icon
- Library: Template/Collection icon
- Profile: User avatar

### Screen Transitions
- **Push**: Slide from right (300ms)
- **Modal**: Slide from bottom (400ms)
- **Tab Switch**: Fade (200ms)
- **Pop**: Slide to right (300ms)

## Accessibility

### WCAG 2.1 AA Compliance
- **Color Contrast**: 4.5:1 minimum for body text
- **Touch Targets**: 44x44px minimum
- **Focus Indicators**: 2px outline with 2px offset
- **Screen Reader**: Semantic labels on all interactive elements

### Accessibility Colors
```scss
$focus-ring: #3B82F6;
$error-text: #DC2626;  // Higher contrast than $danger
$success-text: #059669;  // Higher contrast than $success
```

## Motion Principles

### When to Animate
1. **State Changes**: Commitment completion, streak updates
2. **Navigation**: Screen transitions, tab switches
3. **Feedback**: Button presses, form validation
4. **Delight**: Milestone achievements, friend interactions

### When NOT to Animate
1. **Data Loading**: Use skeletons, not spinners
2. **Batch Operations**: Instant updates for multiple items
3. **Error States**: Immediate feedback
4. **Accessibility Mode**: Respect reduced motion preference

## Empty States

### Design Pattern
```
┌─────────────────────────┐
│                         │
│     [Simple Icon]       │
│                         │
│    Primary Message      │
│   Secondary Message     │
│                         │
│     [CTA Button]        │
│                         │
└─────────────────────────┘
```

### Copy Guidelines
- **Primary**: What's missing (8 words max)
- **Secondary**: How to fix it (15 words max)
- **CTA**: Single clear action

## Loading States

### Skeleton Screens
- Match exact layout of loaded content
- Subtle shimmer animation (2s duration)
- Progressive loading (header → content → footer)

### Progress Indicators
- **Determinate**: For known durations (file uploads)
- **Indeterminate**: For unknown durations (avoid when possible)
- **Stepped**: For multi-stage processes

## Error Handling

### Error Message Hierarchy
1. **Inline Validation**: Immediate, next to field
2. **Toast Messages**: Temporary, non-critical
3. **Alert Dialogs**: Critical, requires action
4. **Full Screen**: Network/system failures

### Error Message Format
```
[What went wrong]
[How to fix it]
[Action button]
```

## Sound Design (Future)

### Sound Palette
- **Complete**: Soft chime (C major chord)
- **Streak**: Ascending notes
- **Nudge**: Gentle tap sound
- **Failure**: Subtle descending tone
- **Navigation**: Quiet whoosh

### Sound Principles
- Optional by default
- Haptic feedback paired with sound
- Volume respects system settings
- No sounds in silent mode

## Responsive Breakpoints

### Device Classes
```scss
$mobile-sm: 320px;   // iPhone SE
$mobile-md: 375px;   // iPhone 12/13/14
$mobile-lg: 428px;   // iPhone Pro Max
$tablet-sm: 768px;   // iPad Mini
$tablet-lg: 1024px;  // iPad Pro
$desktop: 1280px;    // Web (future)
```

## Performance Guidelines

### Image Optimization
- Profile images: 200x200px max, WebP format
- Compression: 85% quality
- Lazy loading beyond viewport
- Placeholder blur while loading

### Rendering Performance
- 60fps for all animations
- Virtual lists for >50 items
- Memoization for expensive components
- Native driver for animations

## Platform Differences

### iOS Specific
- San Francisco font
- Haptic feedback on actions
- Swipe-back gesture
- Dynamic Type support

### Android Specific
- Roboto font
- Material ripple effects
- Back button handling
- Material You theming (Android 12+)