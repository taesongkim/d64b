-- Phase 0: Architecture Foundation Migration
-- This migration adds new columns to existing tables and creates new tables for future features
-- All changes are additive and maintain 100% backward compatibility

-- ==============================================
-- 1. ADD NEW COLUMNS TO EXISTING TABLES
-- ==============================================

-- Add new columns to commitments table
ALTER TABLE commitments 
  ADD COLUMN lineage_id UUID,
  ADD COLUMN tracking_mode VARCHAR(20) DEFAULT 'success_fail',
  ADD COLUMN display_order INTEGER DEFAULT 0,
  ADD COLUMN is_archived BOOLEAN DEFAULT false,
  ADD COLUMN is_deleted BOOLEAN DEFAULT false,
  ADD COLUMN deleted_at TIMESTAMP,
  ADD COLUMN created_by UUID REFERENCES profiles(id),
  ADD COLUMN change_note TEXT,
  ADD COLUMN effective_from DATE DEFAULT CURRENT_DATE;

-- Add new columns to commitment_records table
ALTER TABLE commitment_records 
  ADD COLUMN user_id UUID REFERENCES profiles(id),
  ADD COLUMN status VARCHAR(20) DEFAULT 'complete',
  ADD COLUMN is_future_prefill BOOLEAN DEFAULT false,
  ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();

-- ==============================================
-- 2. POPULATE NEW COLUMNS WITH EXISTING DATA
-- ==============================================

-- Populate lineage_id for existing commitments (each commitment is its own lineage initially)
UPDATE commitments SET lineage_id = id WHERE lineage_id IS NULL;

-- Populate user_id in commitment_records from the parent commitment
UPDATE commitment_records 
SET user_id = (
  SELECT user_id FROM commitments 
  WHERE commitments.id = commitment_records.commitment_id
) 
WHERE user_id IS NULL;

-- Set status for existing records (all current records are "complete")
UPDATE commitment_records SET status = 'complete' WHERE status IS NULL;

-- ==============================================
-- 3. ADD INDEXES FOR PERFORMANCE
-- ==============================================

-- Index for lineage queries
CREATE INDEX idx_commitments_lineage ON commitments(lineage_id);

-- Index for active commitments queries
CREATE INDEX idx_commitments_user_active ON commitments(user_id, is_archived, is_deleted);

-- Index for commitment_records by user and date
CREATE INDEX idx_commitment_records_user_date ON commitment_records(user_id, completed_at);

-- ==============================================
-- 4. CREATE NEW TABLES FOR FUTURE FEATURES
-- ==============================================

-- Commitment Success Criteria (for measured and conditions types)
CREATE TABLE commitment_success_criteria (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  commitment_id UUID REFERENCES commitments(id) ON DELETE CASCADE,
  criteria_type VARCHAR(20) NOT NULL CHECK (criteria_type IN ('threshold', 'conditions_list')),
  
  -- For threshold type (measured commitments)
  operator VARCHAR(20) CHECK (operator IN ('greater_than', 'less_than', 'equal_to', 'between')),
  value DECIMAL,
  value_max DECIMAL,
  unit_label VARCHAR(20),
  numeric_type VARCHAR(20) CHECK (numeric_type IN ('integer', 'decimal', 'duration')),
  duration_unit VARCHAR(20) CHECK (duration_unit IN ('seconds', 'minutes', 'hours')),
  
  -- For conditions type
  total_conditions INTEGER CHECK (total_conditions <= 10),
  required_conditions INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual conditions for condition-type commitments
CREATE TABLE commitment_conditions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  commitment_id UUID REFERENCES commitments(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL CHECK (order_index >= 0 AND order_index <= 9),
  label VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commitment Day Data (for storing actual values entered)
CREATE TABLE commitment_day_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  commitment_record_id UUID REFERENCES commitment_records(id) ON DELETE CASCADE,
  data_type VARCHAR(20) NOT NULL CHECK (data_type IN ('binary', 'measured', 'conditions')),
  
  -- For binary type
  binary_value BOOLEAN,
  
  -- For measured type
  measured_value DECIMAL,
  unit_label VARCHAR(20),
  
  -- For conditions type
  completed_conditions JSONB,
  
  -- Common fields
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments on commitment days
CREATE TABLE commitment_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  commitment_record_id UUID REFERENCES commitment_records(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) <= 300),
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment edit history
CREATE TABLE commitment_comment_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  comment_id UUID REFERENCES commitment_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) <= 300),
  edited_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment mentions for notifications
CREATE TABLE commitment_comment_mentions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  comment_id UUID REFERENCES commitment_comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commitment permissions
CREATE TABLE commitment_permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  commitment_id UUID REFERENCES commitments(id) ON DELETE CASCADE,
  permission_type VARCHAR(20) NOT NULL CHECK (permission_type IN ('public', 'private', 'friends', 'specific_users', 'specific_groups')),
  can_view BOOLEAN DEFAULT true,
  can_comment BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Specific users granted permission
CREATE TABLE commitment_permission_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  permission_id UUID REFERENCES commitment_permissions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Specific groups granted permission
CREATE TABLE commitment_permission_groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  permission_id UUID REFERENCES commitment_permissions(id) ON DELETE CASCADE,
  group_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- Assuming groups are also profiles for now
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cached streak calculations
CREATE TABLE commitment_streaks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  commitment_id UUID REFERENCES commitments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_success_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- 5. ADD UPDATED_AT TRIGGERS FOR NEW TABLES
-- ==============================================

-- Add updated_at triggers for new tables
CREATE TRIGGER update_commitment_success_criteria_updated_at 
  BEFORE UPDATE ON commitment_success_criteria 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commitment_day_data_updated_at 
  BEFORE UPDATE ON commitment_day_data 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commitment_comments_updated_at 
  BEFORE UPDATE ON commitment_comments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commitment_permissions_updated_at 
  BEFORE UPDATE ON commitment_permissions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- 6. ADD INDEXES FOR NEW TABLES
-- ==============================================

-- Commitment success criteria indexes
CREATE INDEX idx_commitment_success_criteria_commitment ON commitment_success_criteria(commitment_id);

-- Commitment conditions indexes
CREATE INDEX idx_commitment_conditions_commitment ON commitment_conditions(commitment_id);
CREATE INDEX idx_commitment_conditions_order ON commitment_conditions(commitment_id, order_index);

-- Commitment day data indexes
CREATE INDEX idx_commitment_day_data_record ON commitment_day_data(commitment_record_id);

-- Comments indexes
CREATE INDEX idx_commitment_comments_record ON commitment_comments(commitment_record_id);
CREATE INDEX idx_commitment_comments_user ON commitment_comments(user_id);

-- Comment history indexes
CREATE INDEX idx_commitment_comment_history_comment ON commitment_comment_history(comment_id);

-- Comment mentions indexes
CREATE INDEX idx_commitment_comment_mentions_comment ON commitment_comment_mentions(comment_id);
CREATE INDEX idx_commitment_comment_mentions_user ON commitment_comment_mentions(mentioned_user_id);

-- Permissions indexes
CREATE INDEX idx_commitment_permissions_commitment ON commitment_permissions(commitment_id);

-- Permission users indexes
CREATE INDEX idx_commitment_permission_users_permission ON commitment_permission_users(permission_id);
CREATE INDEX idx_commitment_permission_users_user ON commitment_permission_users(user_id);

-- Permission groups indexes
CREATE INDEX idx_commitment_permission_groups_permission ON commitment_permission_groups(permission_id);

-- Streaks indexes
CREATE INDEX idx_commitment_streaks_commitment ON commitment_streaks(commitment_id);
CREATE INDEX idx_commitment_streaks_user ON commitment_streaks(user_id);

-- ==============================================
-- 7. VERIFICATION QUERIES
-- ==============================================

-- Verify lineage_id population
-- SELECT COUNT(*) as total_commitments, COUNT(lineage_id) as with_lineage_id FROM commitments;

-- Verify user_id population in commitment_records
-- SELECT COUNT(*) as total_records, COUNT(user_id) as with_user_id FROM commitment_records;

-- Verify status population
-- SELECT status, COUNT(*) FROM commitment_records GROUP BY status;

-- ==============================================
-- MIGRATION COMPLETE
-- ==============================================

-- This migration adds the foundation for the new architecture while maintaining
-- 100% backward compatibility with existing functionality.
-- 
-- New features that can be built on this foundation:
-- - Commitment versioning/lineage system
-- - Advanced commitment types (measured, conditions)
-- - Comments and social features
-- - Permission system
-- - Cached streak calculations
-- - Soft delete with recovery
-- - Neutral tracking mode
--
-- All existing API endpoints and frontend code will continue to work unchanged.
