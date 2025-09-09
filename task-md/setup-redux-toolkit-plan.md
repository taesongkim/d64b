# Task 6: Set up Redux Toolkit + MMKV Persistence

**Branch:** feat/setup-redux-toolkit  
**Phase:** Plan → Build → Verify → Merge  
**Estimated Time:** 2-3 hours  

## 1. Overview

### Purpose
Set up Redux Toolkit with MMKV persistence for efficient offline-first state management in the D64B habit tracker app.

### Why Redux Toolkit + MMKV
- **Offline-First**: MMKV provides fast, synchronous storage for immediate app responsiveness
- **Performance**: MMKV is 30x faster than AsyncStorage
- **Redux Toolkit**: Reduces boilerplate, provides excellent DevTools integration
- **Optimistic Updates**: Essential for habit tracking UX (mark complete instantly)
- **Sync Management**: Track offline changes for later Supabase sync
- **Type Safety**: Full TypeScript integration with RTK

## 2. Dependencies to Install

### Core Redux Dependencies
```bash
yarn add @reduxjs/toolkit react-redux
```

### Persistence & Storage
```bash
yarn add react-native-mmkv redux-persist
yarn add --dev @types/redux-persist
```

### React Native Integration
MMKV is already included in React Native 0.70+ (via JSI), no additional native linking needed.

## 3. Architecture Design

### Store Structure
```
store/
├── index.ts              # Store configuration & types
├── middleware/           # Custom middleware
│   ├── offlineSync.ts    # Offline sync middleware  
│   └── persistConfig.ts  # MMKV persistence config
├── slices/              # Feature slices
│   ├── authSlice.ts     # User authentication state
│   ├── commitmentSlice.ts # Commitments & records
│   └── syncSlice.ts     # Offline sync queue state
└── hooks.ts             # Typed Redux hooks
```

### State Schema
```typescript
RootState {
  auth: {
    user: User | null
    session: Session | null
    isAuthenticated: boolean
    loading: boolean
  }
  commitments: {
    items: Commitment[]
    records: CommitmentRecord[]
    loading: boolean
    lastSync: string | null
  }
  sync: {
    pendingOperations: OfflineOperation[]
    isOnline: boolean
    lastSuccessfulSync: string | null
    syncInProgress: boolean
  }
}
```

## 4. Implementation Steps

### Phase 1: Plan (CURRENT)
- [x] Create this comprehensive plan
- [x] Define store structure and state schema
- [x] Specify middleware architecture

### Phase 2: Build
1. **Install Dependencies**
   - Add Redux Toolkit and React Redux
   - Add MMKV and Redux Persist
   - Add TypeScript types

2. **Configure Store**
   - Create store with MMKV persistence
   - Set up middleware chain
   - Configure TypeScript types

3. **Create Slices**
   - Auth slice with Supabase integration
   - Commitments slice with CRUD operations
   - Sync slice for offline queue management

4. **Integrate with App**
   - Wrap app with Redux Provider
   - Connect AuthContext to Redux
   - Set up persistence rehydration

5. **Create Middleware**
   - Offline sync middleware
   - Optimistic update middleware
   - MMKV persistence configuration

6. **Add Typed Hooks**
   - useAppDispatch, useAppSelector
   - Custom hooks for common operations

### Phase 3: Verify
- [ ] Store persistence works across app restarts
- [ ] TypeScript integration has no errors
- [ ] Auth state syncs with Supabase
- [ ] Optimistic updates work correctly
- [ ] Offline queue accumulates operations
- [ ] Performance remains 60fps target
- [ ] Memory usage stays reasonable
- [ ] All files under 200 lines

### Phase 4: Merge
- [ ] Create PR with Redux integration
- [ ] Self-review against acceptance criteria
- [ ] Merge to main branch
- [ ] Update documentation

## 5. File-by-File Implementation Plan

### store/index.ts (~50 lines)
```typescript
// Configure store with MMKV persistence
// Set up middleware chain
// Export store and types
// Configure devtools for development
```

### store/middleware/persistConfig.ts (~40 lines)
```typescript
// MMKV storage engine configuration
// Persist config for different slices
// Blacklist sensitive data from persistence
// Configure serialization
```

### store/middleware/offlineSync.ts (~80 lines)
```typescript
// Middleware to queue operations when offline
// Automatic retry logic
// Integration with Supabase sync
// Conflict resolution strategies
```

### store/slices/authSlice.ts (~70 lines)
```typescript
// Auth state management
// Integration with AuthContext
// Login/logout actions
// Session persistence
```

### store/slices/commitmentSlice.ts (~90 lines)
```typescript
// Commitments CRUD operations
// Optimistic updates for records
// Local state for offline operations
// Sync status tracking
```

### store/slices/syncSlice.ts (~60 lines)
```typescript
// Offline operation queue
// Network status monitoring
// Sync progress tracking
// Error handling and retry logic
```

### store/hooks.ts (~30 lines)
```typescript
// Typed useSelector and useDispatch hooks
// Custom hooks for common operations
// Performance optimized selectors
```

## 6. Integration Points

### With Supabase Services
- Redux actions will call existing Supabase service functions
- Service results update Redux state
- Offline operations queue to sync services

### With AuthContext  
- Migrate auth state from Context to Redux
- Keep AuthContext as thin wrapper for compatibility
- Maintain existing component interfaces

### With Navigation
- Auth state determines navigation flow
- No changes needed to existing navigation structure

### With Components
- Replace useState with Redux selectors
- Use typed hooks for better performance
- Maintain existing prop interfaces

## 7. Performance Considerations

### MMKV Optimizations
- Use separate MMKV instances for different data types
- Implement lazy loading for large datasets
- Configure appropriate persistence blacklists

### Redux Optimizations
- Use RTK Query for data fetching (future enhancement)
- Implement proper selector memoization
- Batch related state updates

### Memory Management
- Limit stored records to recent data
- Implement data pruning strategies
- Monitor bundle size impact

## 8. Acceptance Criteria

### ✅ Functional Requirements
- [ ] Store persists across app restarts using MMKV
- [ ] Auth state integrates with existing Supabase auth
- [ ] Commitments can be created/updated offline
- [ ] Records can be marked complete with optimistic updates
- [ ] Offline operations queue for later sync
- [ ] Network status properly detected

### ✅ Technical Requirements
- [ ] Full TypeScript support with no errors
- [ ] Store configuration under 200 lines total
- [ ] Each slice under 100 lines
- [ ] Proper error boundaries and loading states
- [ ] Redux DevTools integration works in development

### ✅ Performance Requirements
- [ ] App startup time not impacted (< 100ms additional)
- [ ] Memory usage stays under +10MB
- [ ] 60fps maintained during state updates
- [ ] MMKV operations complete in < 1ms

### ✅ Integration Requirements
- [ ] Existing AuthContext compatibility maintained
- [ ] No breaking changes to current navigation
- [ ] Supabase services work with Redux actions
- [ ] Offline-first behavior for commitment operations

## 9. Testing Strategy

### Unit Tests
```typescript
// Test each slice reducer separately
// Test middleware functionality
// Test selector functions
// Test action creators
```

### Integration Tests
```typescript
// Test store persistence
// Test offline/online state transitions
// Test optimistic updates and rollbacks
// Test auth state synchronization
```

### Performance Tests
```typescript
// Measure store rehydration time
// Test memory usage over time
// Validate 60fps during heavy operations
// Test MMKV read/write performance
```

## 10. Migration Strategy

### Phase 1: Install & Configure (Non-Breaking)
- Add Redux store alongside existing state
- No component changes initially
- Verify persistence works

### Phase 2: Auth Migration (Gradual)
- Move auth state to Redux
- Keep AuthContext as wrapper
- Update components one by one

### Phase 3: Feature Integration (Incremental)  
- Add commitment operations to Redux
- Implement optimistic updates
- Enable offline queue

### Phase 4: Full Integration
- Remove duplicate state management
- Optimize selectors and performance
- Clean up unused code

## 11. Error Handling & Rollback

### Common Issues
1. **MMKV persistence fails**: Fallback to memory-only store
2. **Store rehydration errors**: Clear corrupted state, start fresh
3. **TypeScript errors**: Strict type checking for all actions/state
4. **Performance degradation**: Monitor and optimize selectors

### Rollback Plan
If Redux integration causes issues:
1. Feature flag to disable Redux
2. Keep existing state management as backup
3. Gradual rollback of component integrations
4. Remove Redux dependencies if needed

## 12. Success Metrics

- [ ] ✅ Store boots in < 50ms
- [ ] ✅ Offline operations work seamlessly  
- [ ] ✅ No TypeScript errors
- [ ] ✅ 60fps performance maintained
- [ ] ✅ Memory usage < 50MB total
- [ ] ✅ All existing functionality preserved
- [ ] ✅ Ready for habit grid implementation

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Performance tests pass
- [ ] Integration tests pass
- [ ] Documentation updated
- [ ] No breaking changes to existing features
- [ ] Ready for Task 7: Basic Commitment CRUD

## Next Steps After Completion

Once Redux Toolkit is integrated:
1. **Task 7**: Implement basic commitment CRUD with Redux
2. **Task 8**: Build habit tracking grid UI
3. **Task 9**: Add offline sync mechanisms
4. **Task 10**: Implement streak calculations and progress tracking