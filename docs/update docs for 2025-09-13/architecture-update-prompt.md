# Commitment Architecture Update - Implementation Guide & Context

## Purpose of This Document
This document contains refined data architecture for our commitment tracking system. We've done deeper thinking about the long-term implications of our design decisions. The attached architecture document represents our target state, but **we need to migrate carefully from our existing implementation**.

## Key Context for Implementation

### What We're Building
A habit/commitment tracking app where users track daily progress in a grid view (rows = commitments, columns = days). The core insight is that commitments can evolve over time while maintaining visual continuity for the user.

### Critical Requirement
**DO NOT BREAK THE EXISTING UI**. We have a working interface that users are already interacting with. Any backend changes must be backward compatible or include migration strategies.

## Major Architecture Decisions & Reasoning

### 1. Commitment Evolution via Lineage System
**What we decided:** When users edit a commitment (name, type, or success criteria), we create a new commitment record while maintaining the same visual row through a `lineage_id`.

**Why:** This preserves historical accuracy (old days keep their original success criteria) while allowing commitments to evolve naturally. Users see continuity, but we maintain data integrity.

**Implementation note:** You may need to retrofit existing commitments with lineage_ids. Consider whether current "edit" functionality updates in place or already creates versions.

### 2. Three Data Types with Flexible Success Criteria
**Types:**
- **Binary**: Simple yes/no tracking
- **Measured**: Numeric values with optional thresholds (>, <, =, between)
- **Conditions**: Multiple checkboxes (max 10) that must all be completed

**Why:** Covers 90% of tracking use cases while keeping the UI manageable. The measured type is particularly flexible with support for different numeric types and units.

### 3. Neutral Tracking Mode
**What we decided:** A toggle that changes display behavior, not data structure. In neutral mode, we never show "failed" - only tracked/not tracked.

**Why:** Some users want to track without the psychological weight of failure. This is more of a UI concern than a database concern.

### 4. Soft Delete with 14-Day Recovery
**What we decided:** Deleted commitments are marked with a flag and timestamp, then permanently removed after 14 days.

**Why:** Prevents accidental data loss while not holding deleted data forever.

### 5. Comments with Mentions
**What we decided:** 300-character comments with user tagging, edit history, and notification support.

**Why:** Keeps social features lightweight but functional. The character limit prevents comment sections from becoming unwieldy.

## Expected Differences from Current Implementation

You'll likely find these differences between the current system and this document:

1. **Lineage/versioning system** - This might be entirely new
2. **Separation of CommitmentDay and CommitmentDayData** - You might have these combined
3. **Explicit permission system** - Current system might use simpler public/private flags
4. **Cached streak table** - Current system might calculate on the fly
5. **Comment mentions and history** - Might not exist yet
6. **Success criteria as separate table** - Might be JSON or columns on commitment table

## Questions to Ask Before Implementation

Please analyze the current codebase and ask about:

### Database Structure
1. "I see you currently have [X tables]. The new architecture has 11 tables. Should I create migration scripts for the new tables, or would you prefer to refactor existing ones?"
2. "Your current commitment table has [list fields]. How should I map these to the new structure?"
3. "Do you have existing data that needs to be migrated? How many users/commitments are in production?"

### Commitment Editing
4. "Currently, when a user edits a commitment, does it update in place or create a new record? This affects how we implement the lineage system."
5. "Are users currently able to change commitment types (e.g., binary to measured)? How is this handled?"

### UI Dependencies
6. "Which API endpoints is the frontend currently using? I need to ensure these continue working."
7. "How does the UI currently identify commitments? By ID? This matters for the lineage system."
8. "What data does the grid view expect for each cell? Format?"

### Features in Use
9. "Are comments already implemented? If so, what's the current structure?"
10. "Is there any streak tracking currently? How is it calculated?"
11. "Are there any sharing/permission features already built?"

### Data Integrity
12. "How should we handle the transition period? Should we run both systems in parallel briefly?"
13. "What's your deployment strategy? Can we have downtime for migration?"

## Implementation Strategy

### Recommended Phases

#### Phase 0: Analysis & Planning
- Map current schema to new schema
- Identify all API endpoints that need to maintain compatibility
- Create migration plan
- Set up feature flags for gradual rollout

#### Phase 1: Non-Breaking Additions
- Add new tables that don't exist yet
- Add new columns to existing tables (with defaults)
- Create new API endpoints alongside existing ones
- Don't remove or rename anything yet

#### Phase 2: Data Migration
- Populate lineage_ids for existing commitments
- Migrate existing data to new structure
- Run both old and new systems in parallel
- Verify data integrity

#### Phase 3: Gradual Cutover
- Update UI to use new endpoints (with feature flags)
- Monitor for issues
- Keep old system as fallback

#### Phase 4: Cleanup
- Remove old columns/tables
- Remove deprecated API endpoints
- Update documentation

## Specific Migration Considerations

### For Existing Commitments
```sql
-- Example: Adding lineage support to existing commitments
UPDATE commitments 
SET lineage_id = id 
WHERE lineage_id IS NULL;
```

### For Current Day Entries
- May need to split into CommitmentDay and CommitmentDayData
- Preserve all existing data
- Map current status values to new enum values

### For Permissions
- Default existing commitments to current privacy settings
- Create permission records based on current sharing setup

## Code Compatibility Checklist

Ensure these remain functional:
- [ ] Grid view data loading
- [ ] Commitment creation flow
- [ ] Daily entry updates
- [ ] Any existing analytics/reporting
- [ ] User authentication and authorization
- [ ] Any mobile app APIs
- [ ] Webhook or third-party integrations

## Testing Requirements

Before deploying:
1. **Data integrity**: All existing data is preserved and accessible
2. **API compatibility**: Old endpoints still work (even if redirecting to new logic)
3. **UI functionality**: Every user action in the current UI still works
4. **Performance**: Grid loading and updates are same speed or faster
5. **Migration rollback**: Can revert if issues arise

## Final Notes

**Remember:** The goal is to evolve the architecture without disrupting current users. When in doubt, ask for clarification rather than making assumptions. The new architecture is our target state, but the migration path is just as important as the destination.

**Key principle:** Every existing feature should continue working throughout the migration. New features can be added once the foundation is stable.

**Communication:** Please surface any concerns about:
- Data loss risks
- Performance implications  
- Breaking changes
- Complex migration steps
- Ambiguous mappings between old and new structures

This is a living system with real users. Careful, incremental progress is better than a risky big-bang migration.