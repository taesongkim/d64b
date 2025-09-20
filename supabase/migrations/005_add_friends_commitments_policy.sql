-- Add privacy support and friends viewing for commitments
-- This enables the friends charts feature while respecting privacy settings

-- Step 1: Add is_private column to commitments table
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- Step 2: Update existing commitments to be public by default (since they were created before privacy feature)
UPDATE commitments SET is_private = false WHERE is_private IS NULL;

-- Step 3: Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own commitments" ON commitments;
DROP POLICY IF EXISTS "Users can view own commitment records" ON commitment_records;

-- Step 4: Create new policy that respects privacy settings
CREATE POLICY "Users and friends can view public commitments" ON commitments
  FOR SELECT USING (
    -- Allow if user owns the commitment (always, regardless of privacy)
    auth.uid() = user_id
    OR
    -- Allow if user is friends with the commitment owner AND commitment is public
    (
      EXISTS (
        SELECT 1 FROM friendships
        WHERE (user1_id = auth.uid() AND user2_id = user_id)
           OR (user2_id = auth.uid() AND user1_id = user_id)
      )
      AND is_private = false
    )
  );

-- Step 5: Update commitment_records policy to respect privacy
CREATE POLICY "Users and friends can view public commitment records" ON commitment_records
  FOR SELECT USING (
    -- Allow if user owns the commitment (always, regardless of privacy)
    EXISTS (
      SELECT 1 FROM commitments 
      WHERE id = commitment_records.commitment_id 
      AND user_id = auth.uid()
    )
    OR
    -- Allow if user is friends with the commitment owner AND commitment is public
    EXISTS (
      SELECT 1 FROM commitments c
      JOIN friendships f ON (
        (f.user1_id = auth.uid() AND f.user2_id = c.user_id)
        OR (f.user2_id = auth.uid() AND f.user1_id = c.user_id)
      )
      WHERE c.id = commitment_records.commitment_id
      AND c.is_private = false
    )
  );

-- Step 6: Add index for better performance on privacy queries
CREATE INDEX IF NOT EXISTS idx_commitments_privacy ON commitments(user_id, is_private);
