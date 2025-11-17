# Discovery Report: Reuse Mapping for "Reorder Friends" Feature

**Branch**: `chore/report-reuse-reorder-friends` (read-only)
**Goal**: Map existing reorder & R2 DnD logic for minimal-code implementation of personal friends ordering
**Status**: Discovery complete - no code modifications made

---

## 1. Rank & Ordering Utilities (Commitments)

**Primary utilities from `src/utils/rank.ts`:**
- `rankBetween(a: string | null, b: string | null): string` - Generate rank between two positions
- `rankAfter(a: string | null): string` - Generate rank after given position
- `rankBefore(b: string | null): string` - Generate rank before given position
- `compareRank(a: string | null, b: string | null): number` - Compare two ranks (-1, 0, 1)
- `findSafeRank(desiredRank: string, existingRanks: Array<{order_rank: string}>): string` - Conflict resolution

**Assumptions & Implementation:**
- **Alphabet**: `'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'` (62 chars)
- **Sentinels**: Empty string/null treated as MIN/MAX bounds
- **Conflict Resolution**: `findSafeRank()` handles duplicate ranks during concurrent edits

**Idempotency Key Patterns:**
- Commitments: `move:${commitmentId}:${newRank}` (from `src/store/slices/commitmentsSlice.ts:382`)
- Pattern for friends: `friend_move:${friendUserId}:${newRank}`

---

## 2. Reorder Mutations & Queue (Commitments)

**Core thunks from `src/store/slices/commitmentsSlice.ts`:**
- `reorderCommitmentBetween({ id, prevRank?, nextRank? })` - Primary reorder action using `rankBetween()`
- `reorderCommitmentToIndex({ id, targetIndex })` - Index-based reorder (uses `reorderCommitmentBetween` internally)
- `batchReorderCommitments(updates: Array<{id, newRank}>)` - Bulk operations for save

**Fast-Path Integration:**
- Interactive flag: `interactive: true` in `addToQueue()` triggers Phase A fast-path (≤2s)
- Coalescing window: 350ms for rapid operations with same `idempotencyKey`
- In-flight de-duplication: Prevents duplicate requests during processing

**Sync Queue Processing:**
- **Idempotency enforcement**: `src/store/slices/syncSlice.ts:52-63` prevents duplicate `idempotencyKey` operations
- **Conflict resolution**: `move:id:rank` pattern removes older moves for same entity
- **Error isolation**: 4xx errors removed from queue, 5xx errors retry

---

## 3. Selectors & Sorted Reads (Commitments)

**Primary selectors from `src/store/selectors/commitmentsOrder.ts`:**
- `selectActiveOrdered` - Returns commitments sorted by: `order_rank` → `updatedAt` → `id`
- `selectArchivedOrdered` - Uses `last_active_rank` fallback for archived items
- `selectCommitmentByIdWithRankContext` - Returns item with prev/next references for reordering

**Sort Algorithm (stable ordering):**
```typescript
.sort((a, b) => {
  const rankCompare = (a.order_rank || '').localeCompare(b.order_rank || '');
  if (rankCompare !== 0) return rankCompare;
  const dateCompare = a.updatedAt.localeCompare(b.updatedAt);
  if (dateCompare !== 0) return dateCompare;
  return a.id.localeCompare(b.id);
})
```

**Usage in UI:**
- `src/screens/Dashboard/DashboardScreen.tsx` - Primary consumer for grid display
- `src/components/CommitmentOrderingModalR2.tsx` - Reorder modal data source

---

## 4. R2 DnD Modal Mechanics

**Modal component: `src/components/CommitmentOrderingModalR2.tsx`**
- **Gesture Library**: React Native `PanResponder` with custom long-press detection
- **List Component**: `ScrollView` with custom row rendering (48px `ROW_HEIGHT`)
- **Unified ListItem Type**: Supports commitments + layout items (spacers/dividers)

**Lift Activation (300ms):**
- `longPressMs: 300` from `src/constants/designTokens.ts:28`
- `PanResponder` tracks touch duration before enabling drag
- Auto-reset timeout if no movement detected

**Design Tokens (confirmed paths - NO regeneration needed):**
- **File**: `src/constants/designTokens.ts`
- **DnD tokens**:
  - `dnd.lift.scale: 1.03`
  - `dnd.lift.shadow: {shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.15, shadowRadius: 8, elevation: 8}`
  - `dnd.lift.opacity: 0.95`
  - `dnd.placeholder.tint.light: '#E5E7EB'`, `dnd.placeholder.tint.dark: '#374151'`
  - `dnd.placeholder.opacity: 0.8`
  - `dnd.gesture.longPressMs: 300`
  - `dnd.gesture.activationDistance: 4`

**Placeholder Styling:**
- Tinted background using `designTokens.dnd.placeholder.tint.*`
- Opacity transition during drag operations
- Validation-aware positioning (uses `src/utils/reorderValidation.ts`)

---

## 5. Save/Cancel Model & Optimistic Patterns

**State Management in `CommitmentOrderingModalR2.tsx`:**
- **Snapshot**: `localItems` state tracks reorder changes separately from Redux
- **Optimistic Updates**: Local state changes immediately, Redux updated on Save
- **Save Logic**: Only moved items get new ranks using `batchReorderCommitments()`
- **Cancel Logic**: Resets `localItems` to original Redux state, discards changes

**Persistence Pattern:**
```typescript
// Save only calculates new ranks for moved items
const rankUpdates = movedItems.map(item => ({
  id: item.data.id,
  newRank: rankBetween(prevRank, nextRank) // LexoRank calculation
}));
dispatch(batchReorderCommitments(rankUpdates));
```

**Unsaved Changes**:
- `hasChanges` boolean flag tracks modification state
- No explicit "unsaved changes" prompt currently implemented
- Modal close resets to saved state

---

## 6. Seeding & Guards

**One-shot seeding: `src/utils/seedOrderRanks.ts`**
- **Function**: `seedOrderRanksOnce(userId: string)`
- **Guard Flag**: `state.settings.lexorankSeedDoneByUser[userId]` (per-user)
- **Logic**: Queries empty `order_rank` values, assigns sequential ranks using `rankAfter()`
- **Safety**: `onlyIfBlank: true` parameter prevents overwriting existing ranks

**Settings slice: `src/store/slices/settingsSlice.ts`**
- **Action**: `setLexorankSeedDoneForUser({ userId, done: true })`
- **Storage**: Per-user flags in Redux settings state

**Reuse Plan for Friends:**
- Mirror seeding with `friend_order` table and `friendOrderSeedDone` flag
- Initial order source: Could be friendship creation order or alphabetical by display name

---

## 7. Telemetry, Tests, Rollback

**DEV-only Telemetry:**
- **Sync X-Ray**: `src/utils/syncXRay.ts` - Phase A fast-path tracking with reorder instrumentation
- **Console Logging**: Rank conflicts, deduplication, and validation results in DEV mode
- **Fast-path metrics**: Coalescing, E2E latency tracking for ≤2s target

**Test Coverage (patterns to copy):**
- **Unit Tests**: `src/utils/__tests__/reorderValidation.test.ts`, `src/utils/__tests__/idempotency.test.ts`
- **Integration Tests**: `src/__tests__/integration/fastPathIntegration.test.ts` (latency validation)
- **Fast-path Tests**: `src/services/__tests__/fastPathSync.test.ts` (coalescing, error handling)

**Rollback Mechanism:**
- **Feature Flag**: Could use `isFeatureEnabled('friendsReorder')` pattern from `src/config/features.ts`
- **Graceful Degradation**: Falls back to standard friend list display without reorder capability
- **No Impact on Friends List**: Reorder feature is additive, doesn't affect existing friendship data

---

## 8. Minimal Reuse Plan for Friends Ordering (No Code Yet)

### Types (Adapter Layer)
```typescript
// Reuse existing patterns with friend-specific shape
interface FriendOrderItem {
  id: string;              // friend_user_id
  userId: string;          // current user_id
  displayName: string;     // name field
  avatar_animal?: string;  // avatar data
  avatar_color?: string;
  order_rank: string;      // LexoRank position
  updated_at: string;      // Last modified
}
```

### Selectors (Mirror Commitments)
```typescript
// src/store/selectors/friendsOrder.ts
export const selectFriendsOrdered = createSelector(
  [selectAllFriends],
  (friends) => friends
    .filter(f => !f.blocked) // equivalent to isActive filter
    .sort((a, b) => {
      const rankCompare = (a.order_rank || '').localeCompare(b.order_rank || '');
      if (rankCompare !== 0) return rankCompare;
      const dateCompare = a.updated_at.localeCompare(b.updated_at);
      if (dateCompare !== 0) return dateCompare;
      return a.id.localeCompare(b.id);
    })
);
```

### Thunks (Reuse Rank Utils + Fast-Path)
```typescript
// src/store/slices/socialSlice.ts (or new friendsOrderSlice.ts)
export const reorderFriendBetween = ({ friendUserId, prevRank?, nextRank? }) =>
  (dispatch: AppDispatch) => {
    const newRank = rankBetween(prevRank || null, nextRank || null);

    // Optimistic update
    dispatch(updateFriendOrder({ friendUserId, newRank }));

    // Fast-path sync with idempotency
    dispatch(addToQueue({
      type: 'UPDATE',
      entity: 'friend_order',
      entityId: friendUserId,
      data: { friend_user_id: friendUserId, order_rank: newRank },
      interactive: true, // ✅ Phase A fast-path
      idempotencyKey: `friend_move:${friendUserId}:${newRank}` // Coalescing
    }));
  };
```

### Seeding (Reuse Pattern)
```typescript
// src/utils/seedFriendOrderRanks.ts
export async function seedFriendOrderRanksOnce(userId: string) {
  // Check settings.friendOrderSeedDoneByUser[userId] flag
  // Query friends with empty order_rank
  // Assign sequential ranks by friendship creation date
  // Set completion flag
}
```

### Modal (Reuse R2 DnD Components)
- **Component**: Duplicate `CommitmentOrderingModalR2.tsx` as `FriendOrderingModalR2.tsx`
- **Row Renderer**: Replace commitment title with `displayName + AnimalAvatar`
- **No Layout Items**: Remove spacer/divider logic, pure friend list
- **Same Tokens**: Reuse all `designTokens.dnd.*` values
- **Same Gestures**: 300ms lift, same placeholder styling, Save/Cancel model

### Data Storage (Schema Recommendation)
```sql
-- New table (no implementation here)
CREATE TABLE friend_order (
  user_id UUID REFERENCES auth.users(id),
  friend_user_id UUID REFERENCES auth.users(id),
  group_name TEXT DEFAULT 'all',
  order_rank TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, group_name, friend_user_id),
  UNIQUE (user_id, group_name, order_rank)
);
```

**No Layout Items Needed**: Friends ordering is simple list reordering, no spacers or complex validation rules.

---

## 9. Risk & Impact Analysis

### Coupling Risks
- **Prop Assumptions**: `CommitmentOrderingModalR2.tsx` expects commitment-specific props (`title`, `color`, etc.)
- **Selector Dependencies**: Selectors tied to `commitments` slice, need friends equivalent
- **Type Conflicts**: `ListItem` type union includes commitment-specific fields

**Mitigation**: Create separate `FriendOrderingModalR2.tsx` instead of reusing component directly.

### Performance Considerations
- **Friend Count**: Dozens of friends vs hundreds of commitments - should be fine
- **Row Rendering**: Existing 48px `ROW_HEIGHT` and `ScrollView` pattern scales well
- **Virtualization**: Not needed for typical friend counts (<100), but `FlatList` available if needed

### Conflict Handling
- **Cross-Device**: Same last-write-wins pattern as commitments using `updated_at` timestamps
- **Race Conditions**: Existing `findSafeRank()` handles concurrent rank conflicts
- **Idempotency**: `friend_move:${friendUserId}:${newRank}` pattern prevents duplicate operations

### Additional Risks
- **Friends Privacy**: Assumes no private friends (per guardrails), but could affect visibility logic
- **Database Migrations**: New `friend_order` table requires migration, potential downtime
- **Rollback Impact**: Feature flag can disable, but seeded ranks remain in database

---

## 10. Verification Checklist (Process Only)

### UI Integration
- [ ] Button placement: Next to "Friends' Progress" title in social section
- [ ] Visibility: Hide reorder button when ≤1 friend (no point in reordering)
- [ ] Icon: Use existing sort/reorder icon from `src/components/icons`

### DnD Behavior
- [ ] 300ms lift activation using `designTokens.dnd.gesture.longPressMs`
- [ ] Lifted item: 1.03x scale, shadow, 0.95 opacity
- [ ] Placeholder: Tinted background using existing `dnd.placeholder.tint.*` colors
- [ ] Save/Cancel: Modal bottom buttons, same styling as commitment reorder

### Performance & Sync
- [ ] Save persists only moved items with new `order_rank` values
- [ ] Fast-path: Interactive operations ≤2s E2E latency (Phase A)
- [ ] Idempotency: `friend_move:${friendUserId}:${newRank}` enforced in sync queue
- [ ] Coalescing: 350ms window for rapid friend reordering

### Data & Reliability
- [ ] Seeding: Runs once per user with `friendOrderSeedDone` flag
- [ ] No token regeneration: All DnD tokens reused from `designTokens.ts`
- [ ] Sync X-Ray: E2E median ≤1s for friend reorder operations
- [ ] Error isolation: Failed friend reorders don't affect other sync operations

### Rollback & Monitoring
- [ ] Feature flag: Can disable friend reordering without breaking friends list
- [ ] DEV telemetry: Friend reorder operations visible in Sync X-Ray reports
- [ ] No regressions: Existing friend functionality unaffected

---

## Summary

**Reusable Components Identified:**
- ✅ **Rank Utils**: `src/utils/rank.ts` - All functions directly reusable
- ✅ **Fast-Path Sync**: Existing Phase A infrastructure supports friend operations
- ✅ **DnD Tokens**: `src/constants/designTokens.ts` - All values confirmed, no regeneration needed
- ✅ **Validation Framework**: `src/utils/reorderValidation.ts` - Adaptable for friends (simpler rules)
- ✅ **Modal Pattern**: `CommitmentOrderingModalR2.tsx` - Template for friends modal
- ✅ **Seeding Pattern**: `src/utils/seedOrderRanks.ts` - Copy for friend order initialization

**Minimal Implementation Estimate:**
- **New Files**: 3-4 (FriendOrderingModalR2.tsx, friendsOrder selectors, friend seeding utility)
- **Modified Files**: 2-3 (socialSlice.ts for thunks, settingsSlice.ts for seed flag, FriendsListScreen.tsx for button)
- **Database**: 1 new table (`friend_order`) + migration
- **Code Reuse**: ~80% of ordering logic, 100% of DnD tokens and gestures

**Risk Level**: **Low** - All core patterns proven in production, friends ordering simpler than commitments + layout items.
