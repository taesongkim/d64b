# Task 3: Configure Basic Navigation

**Branch:** feat/navigation-setup  
**Phase:** Plan → Build → Verify → Merge  
**Estimated Time:** 2-3 hours  

## Overview
Set up React Navigation 6 with type-safe navigation following the Master Plan architecture. Create Auth stack for login/signup and Main tab navigator for core app screens.

## Dependencies to Install
```bash
yarn add @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context
```

## File Structure to Create
```
src/
├── navigation/
│   ├── AppNavigator.tsx          # Root navigation container (<150 LOC)
│   ├── AuthStack.tsx             # Auth flow navigation (<100 LOC)
│   ├── MainTabs.tsx              # Main tab navigator (<150 LOC)
│   └── types.ts                  # Navigation type definitions (<100 LOC)
├── screens/
│   ├── Auth/
│   │   ├── LoginScreen.tsx       # Login placeholder (<100 LOC)
│   │   └── RegisterScreen.tsx    # Register placeholder (<100 LOC)
│   ├── Dashboard/
│   │   └── DashboardScreen.tsx   # Main dashboard placeholder (<100 LOC)
│   ├── Social/
│   │   └── FriendsListScreen.tsx # Friends list placeholder (<100 LOC)
│   └── Profile/
│       └── ProfileScreen.tsx     # Profile placeholder (<100 LOC)
```

## Type Definitions for Navigation

### RootStackParamList
- Auth stack with no parameters
- Main tab navigator with no parameters

### AuthStackParamList  
- Login screen (no params)
- Register screen (no params)

### MainTabParamList
- Dashboard tab (no params) 
- Social tab (no params)
- Profile tab (no params)

## Implementation Plan

### Phase 1: Plan (CURRENT)
- [x] Create this plan document
- [x] Define file structure and dependencies
- [x] Specify type-safe navigation requirements

### Phase 2: Build
1. Create git branch `feat/navigation-setup`
2. Install React Navigation dependencies
3. Create type definitions in `src/navigation/types.ts`
4. Implement `AppNavigator.tsx` with conditional auth flow
5. Create `AuthStack.tsx` with Login/Register screens
6. Create `MainTabs.tsx` with Dashboard/Social/Profile tabs
7. Create placeholder screen components
8. Update `App.tsx` to use navigation
9. Configure deep linking support

### Phase 3: Verify  
- [ ] App builds without TypeScript errors
- [ ] Navigation between screens works smoothly
- [ ] Tab navigation functions properly
- [ ] Auth stack navigation works
- [ ] All files under 200 LOC constraint
- [ ] 60fps navigation transitions verified
- [ ] Type safety confirmed (no `any` types)

### Phase 4: Merge
- [ ] Create PR with proper description
- [ ] Self-review against acceptance criteria
- [ ] Merge to main branch
- [ ] Update TASKS.md status

## Acceptance Criteria

✅ **Functional Requirements:**
- [ ] User can navigate between Login and Register screens
- [ ] User can navigate between Dashboard, Social, and Profile tabs
- [ ] Navigation state is properly managed
- [ ] Back button works correctly on Android

✅ **Technical Requirements:**
- [ ] All navigation is type-safe (no `any` types)
- [ ] Files under 200 lines each
- [ ] Follows React Navigation 6 best practices
- [ ] Proper screen options configured
- [ ] Tab icons and labels configured

✅ **Performance Requirements:**
- [ ] Navigation transitions at 60fps
- [ ] No memory leaks from navigation
- [ ] Fast screen mounting (<100ms)

## Performance Benchmarks

### Navigation Transition Speed
- **Target:** 60fps for all transitions
- **Measurement:** Use React Native performance monitor
- **Acceptance:** No dropped frames during navigation

### Screen Load Time
- **Target:** <100ms for screen mounting
- **Measurement:** Console.time in screen constructors (dev only)
- **Acceptance:** All placeholder screens load instantly

### Memory Usage
- **Target:** No navigation-related memory leaks
- **Measurement:** React DevTools Profiler
- **Acceptance:** Memory usage stable during navigation

## Deep Linking Configuration

### URL Structure
```
d64b://
├── auth/
│   ├── login
│   └── register
└── main/
    ├── dashboard
    ├── social  
    └── profile
```

### Implementation Notes
- Configure linking in AppNavigator
- Add URL schemes to app.json
- Handle navigation state restoration

## Error Handling

### Navigation Errors
- Handle invalid route names
- Graceful fallback to default screen
- Log navigation errors for debugging

### Type Safety
- Strict TypeScript for all navigation params
- Runtime validation of navigation calls
- No usage of `any` type in navigation code

## Testing Strategy

### Manual Testing Checklist
- [ ] Navigate through all auth screens
- [ ] Switch between all main tabs
- [ ] Android back button behavior
- [ ] Deep link handling
- [ ] Screen state preservation

### Automated Testing
- Basic navigation flow tests
- Type checking passes
- Build succeeds on both platforms

## Risk Assessment

**Low Risk:**
- Standard React Navigation implementation
- Well-documented library
- Type-safe approach reduces bugs

**Mitigation:**
- Follow React Navigation documentation exactly
- Test on both iOS and Android
- Ensure proper cleanup of navigation listeners

## Notes
- Keep navigation structure simple for MVP
- Prepare for future additions (modals, nested navigators)  
- Consider animation performance on mid-range devices
- Follow accessibility guidelines for navigation

## Definition of Done
- [ ] All acceptance criteria met
- [ ] Performance benchmarks achieved
- [ ] Code reviewed and tested
- [ ] Documentation updated
- [ ] Ready for next task (Redux setup)