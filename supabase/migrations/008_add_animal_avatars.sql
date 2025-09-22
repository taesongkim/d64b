-- Add animal avatar support to profiles table
-- This allows users to select from 12 animals with 3 color options each

-- Add avatar columns to profiles table
ALTER TABLE profiles ADD COLUMN avatar_animal VARCHAR(20);
ALTER TABLE profiles ADD COLUMN avatar_color VARCHAR(20);

-- Add check constraints for valid values
ALTER TABLE profiles ADD CONSTRAINT valid_avatar_animal 
  CHECK (avatar_animal IS NULL OR avatar_animal IN (
    'Kitty', 'Meerkat', 'Mouse', 'Cow', 'Elephant', 'Bear', 
    'Hamster', 'Llama', 'Weasel', 'Bunny', 'Koala', 'Doggy'
  ));

ALTER TABLE profiles ADD CONSTRAINT valid_avatar_color 
  CHECK (avatar_color IS NULL OR avatar_color IN ('Yellow', 'Blue', 'Red'));

-- Add comment for documentation
COMMENT ON COLUMN profiles.avatar_animal IS 'Selected animal for avatar (12 options: Kitty, Meerkat, Mouse, Cow, Elephant, Bear, Hamster, Llama, Weasel, Bunny, Koala, Doggy)';
COMMENT ON COLUMN profiles.avatar_color IS 'Selected color for avatar (3 options: Yellow, Blue, Red)';
