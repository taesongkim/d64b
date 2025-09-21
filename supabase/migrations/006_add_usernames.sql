-- Add username column to profiles table with proper constraints
ALTER TABLE profiles 
ADD COLUMN username VARCHAR(20); -- Max 20 characters as per rules

-- Create case-insensitive unique index for username lookups
CREATE UNIQUE INDEX idx_profiles_username_unique ON profiles(LOWER(username));

-- Add check constraints for username validation
ALTER TABLE profiles 
ADD CONSTRAINT username_length_check 
CHECK (LENGTH(username) >= 3 AND LENGTH(username) <= 20);

ALTER TABLE profiles 
ADD CONSTRAINT username_format_check 
CHECK (username ~ '^[a-zA-Z0-9][a-zA-Z0-9_]{1,18}[a-zA-Z0-9]$' OR username ~ '^[a-zA-Z0-9]{3}$');

ALTER TABLE profiles 
ADD CONSTRAINT username_no_consecutive_underscores 
CHECK (username !~ '__');

-- Function to ensure usernames are stored in lowercase
CREATE OR REPLACE FUNCTION normalize_username() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.username = LOWER(TRIM(NEW.username));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically lowercase usernames on insert/update
CREATE TRIGGER normalize_username_trigger
    BEFORE INSERT OR UPDATE OF username ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION normalize_username();

-- Update existing users with test usernames (in lowercase)
-- This will assign test1, test2, test3, etc. to existing users
DO $$
DECLARE
    user_record RECORD;
    counter INTEGER := 1;
    test_username TEXT;
BEGIN
    FOR user_record IN 
        SELECT id FROM profiles 
        WHERE username IS NULL 
        ORDER BY created_at ASC
    LOOP
        test_username := 'test' || counter::text;
        
        UPDATE profiles 
        SET username = test_username 
        WHERE id = user_record.id;
        
        counter := counter + 1;
    END LOOP;
END $$;

-- Add NOT NULL constraint since all users should have usernames
ALTER TABLE profiles 
ALTER COLUMN username SET NOT NULL;
