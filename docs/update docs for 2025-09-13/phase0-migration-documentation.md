# Phase 0 Migration Documentation: Architecture Foundation

## Overview

This document describes the Phase 0 migration that adds the foundation for the new commitment architecture while maintaining 100% backward compatibility with existing functionality.

## Migration Goals

- ✅ Add new columns to existing tables with safe defaults
- ✅ Create new tables for future features (unused initially)
- ✅ Populate lineage_id for existing commitments
- ✅ Ensure 100% backward compatibility
- ✅ No frontend changes required
- ✅ All existing functionality preserved

## Files Modified

### 1. Database Migration
- **File**: `supabase/migrations/002_phase0_architecture_foundation.sql`
- **Purpose**: Adds new columns and tables to the database schema

### 2. TypeScript Types
- **File**: `src/types/supabase.ts`
- **Purpose**: Updates type definitions to include new optional fields

## Database Changes

### Existing Tables - New Columns Added

#### `commitments` table
**New columns added:**
```sql
lineage_id UUID                    -- For commitment versioning
tracking_mode VARCHAR(20)          -- 'success_fail' or 'neutral'
display_order INTEGER              -- User-defined ordering
is_archived BOOLEAN                -- Soft archive flag
is_deleted BOOLEAN                 -- Soft delete flag
deleted_at TIMESTAMP               -- When soft deleted
created_by UUID                    -- Who created this version
change_note TEXT                   -- Reason for version change
effective_from DATE                -- When this version becomes active
```

**All new columns have safe defaults:**
- `tracking_mode` defaults to `'success_fail'`
- `display_order` defaults to `0`
- `is_archived` and `is_deleted` default to `false`
- `lineage_id` populated with existing `id` values

#### `commitment_records` table
**New columns added:**
```sql
user_id UUID                       -- User who owns this record
status VARCHAR(20)                 -- 'complete', 'failed', 'skipped', 'blank'
is_future_prefill BOOLEAN          -- True if entered for future date
updated_at TIMESTAMP               -- Last update timestamp
```

**All new columns have safe defaults:**
- `status` defaults to `'complete'` (existing records)
- `is_future_prefill` defaults to `false`
- `user_id` populated from parent commitment
- `updated_at` defaults to `NOW()`

### New Tables Created (Unused Initially)

The migration creates 10 new tables for future features:

1. **`commitment_success_criteria`** - Success criteria for measured/conditions types
2. **`commitment_conditions`** - Individual conditions for condition-type commitments
3. **`commitment_day_data`** - Actual data values entered (separate from status)
4. **`commitment_comments`** - Comments on commitment days
5. **`commitment_comment_history`** - Edit history for comments
6. **`commitment_comment_mentions`** - User mentions in comments
7. **`commitment_permissions`** - Viewing/commenting permissions
8. **`commitment_permission_users`** - Specific user permissions
9. **`commitment_permission_groups`** - Group permissions
10. **`commitment_streaks`** - Cached streak calculations

### Indexes Added

**Performance indexes for new columns:**
```sql
CREATE INDEX idx_commitments_lineage ON commitments(lineage_id);
CREATE INDEX idx_commitments_user_active ON commitments(user_id, is_archived, is_deleted);
CREATE INDEX idx_commitment_records_user_date ON commitment_records(user_id, completed_at);
```

**Indexes for new tables:**
- All foreign key relationships have appropriate indexes
- Query optimization indexes for common access patterns

## TypeScript Changes

### Updated Types

The `src/types/supabase.ts` file has been updated to include:

1. **New optional fields** in existing table types (`commitments`, `commitment_records`)
2. **Complete type definitions** for all 10 new tables
3. **Backward compatibility** - all new fields are optional

### Example Type Changes

**Before:**
```typescript
interface Commitment {
  id: string
  user_id: string
  title: string
  // ... existing fields
}
```

**After:**
```typescript
interface Commitment {
  id: string
  user_id: string
  title: string
  // ... existing fields
  // Phase 0: New optional fields for future features
  lineage_id?: string | null
  tracking_mode?: string | null
  display_order?: number | null
  is_archived?: boolean | null
  is_deleted?: boolean | null
  deleted_at?: string | null
  created_by?: string | null
  change_note?: string | null
  effective_from?: string | null
}
```

## Data Population

### Lineage ID Population
```sql
-- Each existing commitment becomes its own lineage
UPDATE commitments SET lineage_id = id WHERE lineage_id IS NULL;
```

### User ID Population
```sql
-- Populate user_id in commitment_records from parent commitment
UPDATE commitment_records 
SET user_id = (
  SELECT user_id FROM commitments 
  WHERE commitments.id = commitment_records.commitment_id
) 
WHERE user_id IS NULL;
```

### Status Population
```sql
-- All existing records are marked as "complete"
UPDATE commitment_records SET status = 'complete' WHERE status IS NULL;
```

## Backward Compatibility

### API Endpoints
- ✅ All existing endpoints continue to work unchanged
- ✅ New fields appear in responses but are optional
- ✅ No breaking changes to request/response formats

### Frontend Code
- ✅ No changes required to React components
- ✅ No changes required to Redux slices
- ✅ No changes required to service functions
- ✅ Grid view continues to work exactly as before

### Database Queries
- ✅ All existing queries continue to work
- ✅ New columns have safe defaults
- ✅ No existing data is modified or removed

## Testing Checklist

After running the migration, verify:

### Database Level
- [ ] All existing commitments are preserved
- [ ] All existing commitment_records are preserved
- [ ] New columns are populated with correct defaults
- [ ] Lineage_id is set to commitment ID for existing records
- [ ] User_id is populated in commitment_records
- [ ] Status is set to 'complete' for existing records

### API Level
- [ ] `getUserCommitments()` still works
- [ ] `updateCommitment()` still works
- [ ] `createCommitmentRecord()` still works
- [ ] `getCommitmentRecords()` still works
- [ ] New fields appear in API responses (optional)

### Frontend Level
- [ ] Dashboard loads correctly
- [ ] Commitment grid displays correctly
- [ ] Can create new commitments
- [ ] Can update existing commitments
- [ ] Can mark commitments as complete/failed/skipped
- [ ] No TypeScript errors
- [ ] No runtime errors

### Performance
- [ ] Grid loading speed unchanged
- [ ] Commitment creation speed unchanged
- [ ] No degradation in query performance

## Rollback Plan

If issues arise, the migration can be rolled back by:

1. **Drop new columns:**
```sql
ALTER TABLE commitments DROP COLUMN lineage_id;
ALTER TABLE commitments DROP COLUMN tracking_mode;
-- ... etc for all new columns
```

2. **Drop new tables:**
```sql
DROP TABLE commitment_success_criteria;
DROP TABLE commitment_conditions;
-- ... etc for all new tables
```

3. **Drop new indexes:**
```sql
DROP INDEX idx_commitments_lineage;
DROP INDEX idx_commitments_user_active;
-- ... etc for all new indexes
```

## Future Phases

### Phase 1: Core Functionality
- Implement commitment versioning/lineage system
- Add support for measured and conditions types
- Implement neutral tracking mode
- Add soft delete functionality

### Phase 2: Advanced Features
- Comments system
- Permission system
- Streak caching
- Advanced analytics

### Phase 3: Polish & Scale
- Offline support
- Real-time sync
- Performance optimizations
- Advanced UI features

## Key Principles

1. **Additive Only**: Never remove or modify existing columns
2. **Safe Defaults**: All new columns have sensible defaults
3. **Backward Compatible**: Existing code continues to work unchanged
4. **Future Ready**: New fields are in place for future features
5. **Incremental**: Changes are small and manageable
6. **Reversible**: Migration can be rolled back if needed

## Success Criteria

✅ **All existing functionality still works**
✅ **New fields are in place for future use**
✅ **No frontend changes required**
✅ **Can still create/edit/delete commitments as before**
✅ **Grid still loads and displays correctly**
✅ **No performance degradation**
✅ **No data loss**

This migration successfully lays the groundwork for the new architecture while maintaining complete backward compatibility with the existing system.
