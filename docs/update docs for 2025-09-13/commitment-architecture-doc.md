# Commitment System - Data Architecture Documentation

## Overview
This document defines the complete data architecture for a commitment tracking system within a habit tracking application. Commitments represent trackable items that users monitor daily, displayed in a grid interface with rows (commitments) and columns (days).

## Core Entities

### 1. Commitment
The fundamental tracking unit that defines what a user wants to monitor.

#### Fields
- `id`: UUID - Unique identifier
- `lineage_id`: UUID - Groups related commitments that represent the same logical commitment over time
- `previous_version_id`: UUID (nullable) - Points to the previous version in the lineage
- `user_id`: UUID - Owner of the commitment (foreign key to Users)
- `name`: String (required, max 100 chars)
- `description`: Text (optional, max 500 chars)
- `type`: Enum ['binary', 'measured', 'conditions']
- `tracking_mode`: Enum ['success_fail', 'neutral']
- `display_order`: Integer - User-defined ordering position
- `is_archived`: Boolean (default: false)
- `is_deleted`: Boolean (default: false) - Soft delete flag
- `deleted_at`: Timestamp (nullable) - When soft deleted
- `created_by`: UUID - User who created the commitment
- `created_at`: Timestamp
- `updated_at`: Timestamp
- `effective_from`: Date - When this version becomes active
- `change_note`: Text (optional, max 500 chars) - Reason for creating new version

### 2. CommitmentSuccessCriteria
Defines what constitutes success for measured and condition-type commitments.

#### Fields
- `id`: UUID
- `commitment_id`: UUID (foreign key to Commitment)
- `criteria_type`: Enum ['threshold', 'conditions_list']

#### For Measured Type (threshold):
- `operator`: Enum ['greater_than', 'less_than', 'equal_to', 'between']
- `value`: Decimal - Target value
- `value_max`: Decimal (nullable) - For 'between' operator
- `unit_label`: String (optional, max 20 chars) - e.g., "miles", "minutes"
- `numeric_type`: Enum ['integer', 'decimal', 'duration']
- `duration_unit`: Enum ['seconds', 'minutes', 'hours'] (nullable) - For duration type

#### For Conditions Type:
- `total_conditions`: Integer (max 10) - Number of conditions
- `required_conditions`: Integer - How many must be met (currently equals total_conditions)

### 3. CommitmentCondition
Individual conditions for condition-type commitments.

#### Fields
- `id`: UUID
- `commitment_id`: UUID (foreign key to Commitment)
- `order_index`: Integer - Display order (0-9)
- `label`: String (required, max 100 chars)
- `created_at`: Timestamp

### 4. CommitmentDay
Represents a single day's entry for a commitment (a cell in the grid).

#### Fields
- `id`: UUID
- `commitment_id`: UUID (foreign key to Commitment)
- `user_id`: UUID - User who owns this entry
- `date`: Date - The day this entry represents
- `status`: Enum ['blank', 'complete', 'failed', 'skipped']
- `is_future_prefill`: Boolean (default: false) - True if entered for a future date
- `created_at`: Timestamp
- `updated_at`: Timestamp

#### Unique Constraint
- Composite unique on (`commitment_id`, `date`)

### 5. CommitmentDayData
Stores the actual data entered for each commitment day.

#### Fields
- `id`: UUID
- `commitment_day_id`: UUID (foreign key to CommitmentDay)
- `data_type`: Enum ['binary', 'measured', 'conditions']

#### For Binary Type:
- `binary_value`: Boolean (nullable)

#### For Measured Type:
- `measured_value`: Decimal (nullable)
- `unit_label`: String (optional) - Can override commitment's default

#### For Conditions Type:
- `completed_conditions`: JSON Array of condition IDs that were completed

#### Common Fields:
- `notes`: Text (optional, max 1000 chars) - Personal notes
- `created_at`: Timestamp
- `updated_at`: Timestamp

### 6. CommitmentComment
Comments on individual commitment days from users.

#### Fields
- `id`: UUID
- `commitment_day_id`: UUID (foreign key to CommitmentDay)
- `user_id`: UUID - Comment author
- `content`: Text (max 300 chars)
- `is_edited`: Boolean (default: false)
- `is_deleted`: Boolean (default: false) - Soft delete for comments
- `created_at`: Timestamp
- `updated_at`: Timestamp

### 7. CommitmentCommentHistory
Tracks edit history for comments.

#### Fields
- `id`: UUID
- `comment_id`: UUID (foreign key to CommitmentComment)
- `content`: Text (max 300 chars) - Previous content
- `edited_at`: Timestamp - When this version was replaced

### 8. CommitmentCommentMention
Tracks user mentions in comments for notifications.

#### Fields
- `id`: UUID
- `comment_id`: UUID (foreign key to CommitmentComment)
- `mentioned_user_id`: UUID - User being mentioned
- `created_at`: Timestamp

### 9. CommitmentPermission
Defines viewing and commenting permissions for commitments.

#### Fields
- `id`: UUID
- `commitment_id`: UUID (foreign key to Commitment)
- `permission_type`: Enum ['public', 'private', 'friends', 'specific_users', 'specific_groups']
- `can_view`: Boolean (default: true)
- `can_comment`: Boolean (default: true)
- `created_at`: Timestamp
- `updated_at`: Timestamp

### 10. CommitmentPermissionUser
Specific users granted permission (when permission_type = 'specific_users').

#### Fields
- `id`: UUID
- `permission_id`: UUID (foreign key to CommitmentPermission)
- `user_id`: UUID - User granted permission
- `created_at`: Timestamp

### 11. CommitmentPermissionGroup
Specific groups granted permission (when permission_type = 'specific_groups').

#### Fields
- `id`: UUID
- `permission_id`: UUID (foreign key to CommitmentPermission)
- `group_id`: UUID - Group granted permission
- `created_at`: Timestamp

### 12. CommitmentStreak
Cached streak calculations for performance.

#### Fields
- `id`: UUID
- `commitment_id`: UUID (foreign key to Commitment)
- `user_id`: UUID
- `current_streak`: Integer (default: 0)
- `best_streak`: Integer (default: 0)
- `last_success_date`: Date (nullable)
- `updated_at`: Timestamp

## Business Logic Rules

### Commitment Lifecycle
1. **Creation**: When created, automatically generate a blank CommitmentDay entry for today
2. **Evolution**: Any change to name, type, or success criteria creates a new Commitment with:
   - Same `lineage_id` as the original
   - `previous_version_id` pointing to the current version
   - `effective_from` set to today
   - All future prefilled days cleared
3. **Archiving**: Set `is_archived = true`, commitment disappears from grid but retains data
4. **Deletion**: Set `is_deleted = true` and `deleted_at = now()`. After 14 days, permanently delete
5. **Restoration**: Within 14 days of soft delete, can set `is_deleted = false`

### Day Management
1. **Status Calculation**:
   - Binary: `complete` if checked, `failed` if unchecked, `blank` if no data
   - Measured: `complete` if threshold met, `failed` if threshold not met, `blank` if no data
   - Conditions: `complete` if all required conditions met, `failed` otherwise, `blank` if no data
   - Neutral mode: Never shows `failed`, only `complete`, `blank`, or `skipped`
2. **Skipped Days**: Don't count against streaks, treated as non-existent for analytics
3. **Future Prefills**: Data can be entered for future dates but marked with `is_future_prefill = true`. Not included in analytics until the date arrives

### Streaks
1. **Current Streak**: Consecutive days of `complete` status, not broken by `skipped` days
2. **Best Streak**: Highest streak count ever achieved
3. **Calculation**: Updated whenever a CommitmentDay status changes

### Permissions
1. **Owner Rights**: Can always view, edit, delete their own commitments
2. **Viewer Rights**: Based on CommitmentPermission settings, can view and optionally comment
3. **Comment Management**: Only commitment owner can delete others' comments

## API Considerations

### Key Endpoints Needed
1. `GET /commitments` - List all active commitments for a user (ordered by display_order)
2. `POST /commitments` - Create new commitment
3. `PUT /commitments/{id}` - Update commitment (may create new version)
4. `DELETE /commitments/{id}` - Soft delete commitment
5. `POST /commitments/{id}/restore` - Restore soft-deleted commitment
6. `GET /commitments/{id}/days` - Get commitment days for date range
7. `PUT /commitment-days/{id}` - Update a specific day's data
8. `POST /commitment-days/{id}/comments` - Add comment
9. `PUT /commitments/reorder` - Batch update display_order

### Real-time Sync Requirements
1. Changes to commitments and commitment days should sync across devices
2. New comments should appear live to all users with view permissions
3. Implement optimistic updates with rollback on failure

### Offline Capability
1. Store recent commitment data locally
2. Queue changes when offline
3. Sync when connection restored
4. Handle conflict resolution (last-write-wins for most fields)

## Database Indexes

### Primary Indexes
- `commitments.lineage_id` - For grouping related versions
- `commitments.user_id` + `commitments.is_archived` + `commitments.is_deleted` - For active commitments list
- `commitment_days.commitment_id` + `commitment_days.date` - For date range queries
- `commitment_days.date` + `commitment_days.is_future_prefill` - For analytics queries
- `commitment_comments.commitment_day_id` - For loading comments

### Performance Considerations
1. **Grid View**: Paginate by date range (e.g., load 30 days at a time)
2. **Commitment List**: Limit to active commitments (not archived/deleted)
3. **Streak Calculation**: Cache in CommitmentStreak table, update async
4. **Comments**: Lazy load, paginate if > 10 per day

## Data Migration & Evolution

### Version Management
When commitment structure changes:
1. Create new commitment record with updated fields
2. Link via `lineage_id` and `previous_version_id`
3. Clear future prefilled days
4. Maintain historical data integrity

### Future Extensibility Hooks
1. **Projects/Sprints**: Add `project_id` field to commitments
2. **Multiple Thresholds**: Extend CommitmentSuccessCriteria to support arrays
3. **Weekday/Weekend Rules**: Add day-specific criteria table
4. **X out of Y Conditions**: Already supported via `required_conditions` field
5. **Threaded Comments**: Add `parent_comment_id` to CommitmentComment
6. **Time Zones**: Add `timezone` field to Users table, store all times in UTC

## Security & Privacy

### Access Control
1. Users can only modify their own commitments
2. Viewing requires explicit permission via CommitmentPermission
3. Soft-deleted items hidden from all non-owner queries
4. API should validate ownership/permissions on every request

### Data Retention
1. Active user data retained indefinitely
2. Inactive users (no login for 3 years) subject to data deletion
3. Soft-deleted items permanently removed after 14 days
4. Comment edit history retained for audit trail

## Sample SQL Schema Snippets

```sql
-- Core commitment table
CREATE TABLE commitments (
    id UUID PRIMARY KEY,
    lineage_id UUID NOT NULL,
    previous_version_id UUID REFERENCES commitments(id),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('binary', 'measured', 'conditions')),
    tracking_mode VARCHAR(20) NOT NULL CHECK (tracking_mode IN ('success_fail', 'neutral')),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    change_note TEXT,
    INDEX idx_lineage (lineage_id),
    INDEX idx_user_active (user_id, is_archived, is_deleted)
);

-- Commitment day entries
CREATE TABLE commitment_days (
    id UUID PRIMARY KEY,
    commitment_id UUID NOT NULL REFERENCES commitments(id),
    user_id UUID NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('blank', 'complete', 'failed', 'skipped')),
    is_future_prefill BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE KEY unique_commitment_date (commitment_id, date),
    INDEX idx_date_range (commitment_id, date),
    INDEX idx_analytics (date, is_future_prefill)
);
```

## Implementation Priority

### Phase 1 - Core Functionality
1. Basic commitment CRUD
2. Binary type support
3. Daily entry management
4. Simple permissions (public/private)

### Phase 2 - Advanced Types
1. Measured type with thresholds
2. Conditions type
3. Neutral tracking mode
4. Comments system

### Phase 3 - Polish & Scale
1. Streak tracking
2. Commitment evolution/versioning
3. Advanced permissions
4. Offline support
5. Real-time sync

This architecture provides a robust foundation that supports all current requirements while maintaining flexibility for future enhancements.