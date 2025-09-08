# Task 4: Install UI Library (NativeWind)

**Branch:** chore/setup-nativewind  
**Phase:** Plan → Build → Verify → Merge  
**Estimated Time:** 1-2 hours  

## 1. Overview

### Purpose
Set up NativeWind (Tailwind CSS for React Native) to enable utility-first styling approach for rapid UI development.

### Why
- **Rapid Development**: Utility classes allow fast prototyping and consistent styling
- **Master Plan Alignment**: Follows the plan's requirement for utility-first styling approach with NativeWind
- **Design Consistency**: Enforces consistent spacing, colors, and typography across the app
- **Performance**: Optimized bundle with only used utilities included
- **Developer Experience**: Familiar Tailwind syntax with autocomplete support

## 2. Dependencies to Install

### Core Dependencies
```bash
yarn add nativewind@^2.0.11 
yarn add --dev tailwindcss@^3.3.0
```

### Required Peer Dependencies
- `react-native-reanimated` (for animations - already in Expo)
- `react-native-svg` (for SVG support - will add if needed)

### TypeScript Support
```bash
yarn add --dev @types/tailwindcss@^3.1.0
```

## 3. Configuration Files Needed

### tailwind.config.js (~30 lines)
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#007AFF',
        secondary: '#34C759',
        danger: '#FF3B30',
        warning: '#FF9500',
        dark: '#1C1C1E',
      },
    },
  },
  plugins: [],
}
```

### babel.config.js Updates (~15 lines total)
- Add NativeWind babel plugin
- Maintain existing Reanimated plugin order

### metro.config.js (if needed) (~20 lines)
- Configure CSS handling for React Native
- Ensure compatibility with Expo Metro config

### TypeScript Declaration File (~10 lines)
- Add types for className prop on React Native components
- Extend ComponentProps interfaces

## 4. Implementation Steps

### Phase 1: Plan (CURRENT)
- [x] Create this plan document
- [x] Define dependencies and configuration structure
- [x] Specify utility class testing strategy

### Phase 2: Build
1. Create git branch `chore/setup-nativewind`
2. Install NativeWind and Tailwind dependencies
3. Create `tailwind.config.js` with D64B theme colors
4. Update `babel.config.js` with NativeWind plugin
5. Create `metro.config.js` if needed for CSS processing
6. Add TypeScript declarations for className prop
7. Create test component with utility classes
8. Update existing placeholder screens to use utility classes
9. Test dark mode utilities

### Phase 3: Verify
- [ ] Utility classes render correctly (colors, spacing, typography)
- [ ] Hot reload maintains styles during development
- [ ] TypeScript recognizes className prop without errors
- [ ] All config files under 200 lines constraint
- [ ] Bundle size impact acceptable (<500kb addition)
- [ ] Dark mode utilities function properly
- [ ] No conflicts with existing React Navigation styles

### Phase 4: Merge
- [ ] Create PR with configuration changes
- [ ] Self-review against acceptance criteria
- [ ] Merge to main branch
- [ ] Update todo list and move to next task

## 5. Acceptance Criteria

### ✅ Functional Requirements
- [ ] Basic utility classes work: `bg-blue-500`, `text-white`, `p-4`, `m-2`
- [ ] Layout utilities work: `flex-1`, `justify-center`, `items-center`
- [ ] Typography utilities work: `text-lg`, `font-bold`, `text-center`
- [ ] Color utilities work with custom D64B theme colors
- [ ] Dark mode utilities work: `dark:bg-gray-800`, `dark:text-white`

### ✅ Technical Requirements
- [ ] TypeScript recognizes className prop on View, Text, TouchableOpacity
- [ ] Hot reload preserves styles during development
- [ ] All configuration files under 200 lines each
- [ ] No TypeScript errors or warnings
- [ ] ESLint passes with no style-related violations

### ✅ Performance Requirements
- [ ] Bundle size increase minimal (<500kb)
- [ ] Style processing doesn't impact app startup time
- [ ] No runtime performance degradation on mid-range devices

### ✅ Integration Requirements
- [ ] Works alongside existing StyleSheet styles
- [ ] No conflicts with React Navigation theming
- [ ] Compatible with Expo development workflow
- [ ] Supports both iOS and Android platforms

## 6. Verification Steps

### Utility Class Testing
1. **Basic Utilities Test**: Create test component with:
   ```tsx
   <View className="bg-blue-500 p-4 m-2 rounded-lg">
     <Text className="text-white font-bold text-center">
       NativeWind Test
     </Text>
   </View>
   ```

2. **Layout Testing**: Verify flexbox utilities:
   ```tsx
   <View className="flex-1 justify-center items-center">
     <Text>Centered Content</Text>
   </View>
   ```

3. **Theme Colors**: Test custom D64B colors:
   ```tsx
   <View className="bg-primary p-4">
     <Text className="text-white">Primary Color</Text>
   </View>
   ```

### Dark Mode Verification
- Test dark mode utilities: `dark:bg-gray-800`, `dark:text-white`
- Verify automatic switching based on system theme
- Ensure consistent appearance across screens

### Bundle Size Check
```bash
npx expo export --platform ios
# Check bundle size before and after NativeWind
```

### TypeScript Integration
- Verify className prop autocomplete in VS Code
- Confirm no TypeScript errors on existing components
- Test type safety with invalid class names

### Performance Testing
- Monitor app startup time with React Native Performance Monitor  
- Verify 60fps target maintained during navigation
- Test memory usage doesn't increase significantly

## Configuration Details

### Expected File Structure After Implementation
```
├── tailwind.config.js        # Tailwind configuration
├── metro.config.js           # Metro bundler config (if needed)  
├── babel.config.js           # Updated with NativeWind plugin
├── nativewind-env.d.ts       # TypeScript declarations
└── src/
    ├── screens/              # Updated to use utility classes
    └── components/           # Future components with utilities
```

### NativeWind Plugin Order in Babel
```javascript
plugins: [
  "nativewind/babel",         # NativeWind plugin first
  "react-native-reanimated/plugin", # Reanimated last (existing)
]
```

### Color Theme Integration
Custom colors will be added to match D64B branding:
- Primary: `#007AFF` (iOS blue)
- Secondary: `#34C759` (iOS green)  
- Danger: `#FF3B30` (iOS red)
- Warning: `#FF9500` (iOS orange)
- Dark: `#1C1C1E` (iOS dark background)

## Error Handling & Troubleshooting

### Common Issues
1. **Metro bundler conflicts**: Clear cache with `npx expo start -c`
2. **TypeScript errors**: Ensure proper type declarations imported
3. **Style not applying**: Verify content paths in tailwind.config.js
4. **Bundle size concerns**: Use purge configuration properly

### Rollback Plan
If NativeWind causes issues:
1. Remove NativeWind dependencies
2. Revert babel.config.js changes
3. Delete tailwind.config.js and type declarations
4. Fall back to StyleSheet for immediate development needs

## Definition of Done
- [ ] All acceptance criteria met
- [ ] Verification steps completed successfully
- [ ] No regression in existing functionality
- [ ] Documentation updated (inline comments in configs)
- [ ] Ready for next task (Redux Toolkit setup)

## Next Steps After Completion
Once NativeWind is configured, we'll be ready to:
1. Install Redux Toolkit for state management
2. Create reusable UI components with utility classes
3. Implement the habit tracking grid with consistent styling
4. Add animations using utilities + Reanimated integration