-- Migration: Commitment Type Architecture
-- Backend Simplicity, Frontend Flexibility
-- 
-- This migration implements a new commitment type system:
-- - Backend stores only 2 types: 'checkbox' and 'measurement'
-- - Frontend intelligently renders UI based on data structure
-- - Clean separation between tracking philosophy and interaction type

-- Add new commitment type column
ALTER TABLE commitments ADD COLUMN commitment_type VARCHAR(20) DEFAULT 'checkbox';

-- Add constraint for valid commitment types
ALTER TABLE commitments ADD CONSTRAINT valid_commitment_type 
  CHECK (commitment_type IN ('checkbox', 'measurement'));

-- Add target column for measurement goals
ALTER TABLE commitments ADD COLUMN target NUMERIC;

-- Add unit column for measurement units
ALTER TABLE commitments ADD COLUMN unit TEXT;

-- Add requirements column for checkbox task lists
ALTER TABLE commitments ADD COLUMN requirements JSONB;

-- Add new JSONB value column to commitment_records
-- This will store complex data structures for the new commitment type system
ALTER TABLE commitment_records ADD COLUMN value JSONB;

-- Add comments for documentation
COMMENT ON COLUMN commitments.commitment_type IS 'Commitment interaction type: checkbox (completion-based) or measurement (numeric with units)';
COMMENT ON COLUMN commitments.target IS 'Target value for measurement-type commitments (e.g., 30 for 30 minutes)';
COMMENT ON COLUMN commitments.unit IS 'Unit for measurement-type commitments (e.g., minutes, pages, reps)';
COMMENT ON COLUMN commitments.requirements IS 'JSONB array of task names for checkbox-type commitments with multiple requirements';
COMMENT ON COLUMN commitment_records.value IS 'JSONB value storing completion data: boolean for simple checkboxes, object for complex data';

-- Example data structures:
-- 
-- Simple checkbox commitment:
-- commitment_type: 'checkbox', requirements: NULL
-- records.value: true/false
--
-- Multiple checkbox commitment:
-- commitment_type: 'checkbox', requirements: ['Make bed', 'Drink water', 'Stretch']
-- records.value: {'Make bed': true, 'Drink water': true, 'Stretch': false}
--
-- Measurement commitment:
-- commitment_type: 'measurement', target: 30, unit: 'minutes'
-- records.value: {'amount': 25, 'unit': 'minutes'}
