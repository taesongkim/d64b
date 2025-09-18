-- Fix RLS policies for commitment_records to use the new user_id column
-- This addresses the RLS violation error when inserting records

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own commitment records" ON commitment_records;
DROP POLICY IF EXISTS "Users can insert own commitment records" ON commitment_records;
DROP POLICY IF EXISTS "Users can delete own commitment records" ON commitment_records;

-- Create new policies using the user_id column directly (more efficient)
CREATE POLICY "Users can view own commitment records" ON commitment_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own commitment records" ON commitment_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own commitment records" ON commitment_records
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own commitment records" ON commitment_records
  FOR DELETE USING (auth.uid() = user_id);
