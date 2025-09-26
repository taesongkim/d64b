# Logout Reset Centralization Plan

## Phase 1.0 Findings

**Date/Time:** 2025-09-24 14:08 EDT
**Branch:** feat/logout-reset-centralization
**Status:** Analysis Complete

### Current Logout Flow Issues

1. **Scattered Logout Logic:**
   - AuthContext handles Supabase auth logout
   - ProfileScreen handles UI logout trigger
   - DashboardScreen clears Redux state when user becomes null
   - Redux authSlice has unused logout action

2. **Cross-Account Data Persistence Risk:**
   - Redux Persist stores: auth, commitments, records, social, settings
   - No persistor.purge() on logout
   - User A's data survives logout until User B's DashboardScreen loads

3. **Performance Baseline (Analysis Phase):**
   - Bundle Size: Not measured (requires build)
   - Assets: 1MB total (fonts 252KB)
   - FPS/CPU/Memory: Not measured (requires running app)

4. **Security/Accessibility:**
   - No WebView/CSP risks found
   - Missing accessibility labels throughout app

### Phase 1.1 Detailed Implementation Plan

### Root Reset Strategy

**File:** `/Users/taesongkim/Code/d64b/justintest/src/store/index.ts`
**Lines:** Replace combineReducers call (lines 14-21) with rootReducer wrapper:
```typescript
const appReducer = combineReducers({
  auth: authReducer,
  commitments: commitmentsReducer,
  records: recordsReducer,
  social: socialReducer,
  sync: syncReducer,
  settings: settingsReducer,
});

const rootReducer = (state: any, action: any) => {
  if (action.type === 'auth/LOGOUT_GLOBAL') {
    // Clear all persisted state (returns undefined → triggers slice initialState)
    return appReducer(undefined, action);
  }
  return appReducer(state, action);
};
```
**Lines:** Update persistedReducer call (line 30) to use rootReducer instead of direct combineReducers
**Lines:** Add export after persistConfig (lines 22-29): `export const logoutGlobal = () => ({ type: 'auth/LOGOUT_GLOBAL' });`

**File:** `/Users/taesongkim/Code/d64b/justintest/src/store/slices/authSlice.ts`
**Lines:** Add export after existing actions (line 62-69):
```typescript
export const logoutGlobal = () => ({ type: 'auth/LOGOUT_GLOBAL' });
```
**Lines:** Confirm existing logout action behavior (lines 45-50) - should reset to initialState
**Lines:** No extraReducers needed - root reducer handles global reset

### Persist Purge Invocation

**File:** `/Users/taesongkim/Code/d64b/justintest/src/contexts/AuthContext.tsx`
**Lines:** Add imports (after line 4):
```typescript
import { persistor } from '@/store';
import { useAppDispatch } from '@/store/hooks';
import { logoutGlobal } from '@/store/slices/authSlice';
```
**Lines:** Update AuthContextType interface (lines 6-13) - add dispatch parameter (not needed, will use hook)
**Lines:** In AuthProvider function (line 17), add: `const dispatch = useAppDispatch();`
**Lines:** Modify SIGNED_OUT handler (lines 57-62):
```typescript
if (event === 'SIGNED_OUT') {
  console.log('👋 User signed out, clearing state...');

  // Dispatch global logout to clear Redux state
  dispatch(logoutGlobal());

  // Purge persisted state
  try {
    await persistor.purge();
    console.log('🧹 Persistor purged successfully');
  } catch (error) {
    console.error('❌ Error purging persistor:', error);
  }

  setUser(null);
  setSession(null);
}
```
**Lines:** In signOut() method (lines 143-150), add before supabase.auth.signOut():
```typescript
// Proactive cleanup (idempotent with SIGNED_OUT handler)
dispatch(logoutGlobal());
```

### Remove UI-level Clearing

**File:** `/Users/taesongkim/Code/d64b/justintest/src/screens/Dashboard/DashboardScreen.tsx`
**Lines:** Remove lines 42-46 (clearing logic when !user?.id):
```typescript
// DELETE THESE LINES:
console.log('❌ No authenticated user, clearing data');
dispatch(setCommitments([]));
dispatch(setRecords([]));
return;
```
**Lines:** Replace with read-only guard (line 42):
```typescript
if (!user?.id) {
  console.log('❌ No authenticated user, skipping data load');
  return;
}
```

### Slices Verify Reset

**Files:** All slices already have proper initialState - no changes needed
- `/Users/taesongkim/Code/d64b/justintest/src/store/slices/authSlice.ts` - lines 18-23 (initialState)
- `/Users/taesongkim/Code/d64b/justintest/src/store/slices/commitmentsSlice.ts` - check initialState definition
- `/Users/taesongkim/Code/d64b/justintest/src/store/slices/recordsSlice.ts` - check initialState definition
- `/Users/taesongkim/Code/d64b/justintest/src/store/slices/socialSlice.ts` - check initialState definition
- `/Users/taesongkim/Code/d64b/justintest/src/store/slices/settingsSlice.ts` - check initialState definition

### Navigation Consistency

**File:** `/Users/taesongkim/Code/d64b/justintest/src/navigation/AppNavigator.tsx` (or equivalent)
**Action:** No changes needed - navigation should automatically redirect to Auth stack when user becomes null via AuthContext state change

## Commit & PR

### Commit Message Schema
```
feat(logout): add root reset + persistor.purge()

- Add auth/LOGOUT_GLOBAL action with root reducer intercept
- Implement persistor.purge() in AuthContext SIGNED_OUT handler
- Remove UI-level state clearing from DashboardScreen lines 40-46
- Centralize logout logic in auth layer for data consistency

Fixes cross-account data persistence vulnerability
```

### PR Template
- Link to Task-MD plan: `/Users/taesongkim/Code/d64b/justintest/task-md/logout-reset-centralization-plan.md`
- Include URLs for visual verification:
  - Dashboard route: Navigate to Dashboard after logout should show empty state
  - Profile route: Should show signed-out state
- List all absolute file paths modified
- QA checklist completion confirmation

## Rollback Plan

**Revert Steps:**
1. `git revert <short-SHA>` to restore previous behavior
2. Keep `_archive/DashboardScreen-logout-effect.txt` copy of removed lines 40-46:
```typescript
if (!user?.id) {
  console.log('❌ No authenticated user, clearing data');
  dispatch(setCommitments([]));
  dispatch(setRecords([]));
  return;
}
```
3. Quick flip-back: restore _archive file to DashboardScreen if root reset fails

## QA Checklist (Explicit)

### Primary Test Scenarios
1. **Logout as User A → app returns to Auth screen**
   - Visual verification: Dashboard route shows 0 commitments after logout
   - Navigation state: App navigates to auth stack automatically

2. **Login as User B → no User A commitments/records visible**
   - Visual verification: Dashboard shows only User B's data
   - Redux DevTools: Verify store state reset between users

3. **Cold start after logout → store is empty of User A data**
   - Force-close app after logout
   - Restart app and login as User B
   - Verify no stale data persistence

4. **Offline: toggle airplane mode → logout → relaunch → no stale data**
   - Test network connectivity during logout
   - Verify persistor.purge() works offline

5. **Background/foreground after logout → state remains empty**
   - Logout, background app, foreground
   - Verify state consistency

### Visual Verification Routes
- **Dashboard route:** Navigate to Dashboard after logout shows empty state (0 commitments)
- **Profile route:** Shows signed-out state, redirects to auth
- **App navigation:** Automatic redirect to Auth stack post-logout

### Cross-Feature Risks

1. **Sync Service Interaction:**
   - Sync service may attempt operations during logout
   - Risk: Race conditions between sync and state clearing
   - Mitigation: Ensure sync service handles null user state

2. **Redux Persist Rehydration:**
   - Timing issues between purge and rehydration
   - Risk: Partial state restoration after logout
   - Mitigation: Proper async/await handling of persistor.purge()

3. **Navigation State:**
   - App navigation may be affected during logout clearing
   - Risk: Navigation errors during state transitions
   - Mitigation: Test all logout scenarios from different screens

## Security/Performance Considerations

### Sensitive Data Eviction
- Ensure user tokens cleared from AsyncStorage
- Verify biometric data (if any) cleared
- Check for cached images/user data in temp directories

### Redux Persist I/O Overhead
- persistor.purge() performs disk I/O operations
- Average overhead: 50-200ms on modern devices
- Consider showing logout loading indicator for UX

### Memory Management
- Root reducer reset clears all in-memory state
- Prevents memory leaks from large datasets
- Monitor memory usage during logout process

## Files Modified (Absolute Paths)

- `/Users/taesongkim/Code/d64b/justintest/src/store/index.ts` (root reducer wrapper, logoutGlobal action)
- `/Users/taesongkim/Code/d64b/justintest/src/contexts/AuthContext.tsx` (centralized logout with persistor.purge)
- `/Users/taesongkim/Code/d64b/justintest/src/store/slices/authSlice.ts` (add logoutGlobal export)
- `/Users/taesongkim/Code/d64b/justintest/src/screens/Dashboard/DashboardScreen.tsx` (remove clearing logic lines 40-46)

## Rollback Plan

**Commit Hash:** TBD (will be logged after Phase 1.2 completion)

**Rollback Steps:**
1. `git revert <commit-hash>`
2. Restore previous AuthContext logout behavior
3. Re-enable DashboardScreen clearing logic

## Performance/Security Notes

- persistor.purge() is async I/O operation
- Monitor Redux Persist initialization time
- No sensitive data logged during logout process
- Implement proper error handling for purge failures