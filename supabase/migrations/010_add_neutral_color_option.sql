-- Add Neutral color option to avatar_color constraint
-- This adds a grayscale color option using the same colors as initials

-- Drop existing constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_avatar_color;

-- Add updated constraint with Neutral option
ALTER TABLE profiles ADD CONSTRAINT valid_avatar_color 
  CHECK (avatar_color IS NULL OR avatar_color IN ('Yellow', 'Blue', 'Red', 'Neutral'));

-- Update comment for documentation
COMMENT ON COLUMN profiles.avatar_color IS 'Selected color for avatar (4 options: Yellow, Blue, Red, Neutral)';
