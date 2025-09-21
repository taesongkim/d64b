-- Update friends functions to include username field

-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS get_user_friends(UUID);

-- Update get_user_friends function to include username
CREATE OR REPLACE FUNCTION get_user_friends(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  friendship_created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.username::TEXT,
    p.full_name,
    p.avatar_url,
    p.created_at,
    f.created_at as friendship_created_at
  FROM friendships f
  JOIN profiles p ON (
    CASE 
      WHEN f.user1_id = p_user_id THEN p.id = f.user2_id
      WHEN f.user2_id = p_user_id THEN p.id = f.user1_id
      ELSE false
    END
  )
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing search function first to avoid return type conflicts  
DROP FUNCTION IF EXISTS search_users_by_email(TEXT);

-- Update search function to search by both email and username
CREATE OR REPLACE FUNCTION search_users_by_email(p_email_query TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.username::TEXT,
    p.full_name,
    p.avatar_url
  FROM profiles p
  WHERE (p.email ILIKE '%' || p_email_query || '%' OR p.username ILIKE '%' || p_email_query || '%')
    AND p.id != auth.uid() -- Exclude self
  ORDER BY 
    -- Prioritize exact username matches, then email matches
    CASE 
      WHEN p.username ILIKE p_email_query THEN 1
      WHEN p.username ILIKE p_email_query || '%' THEN 2
      WHEN p.email ILIKE p_email_query || '%' THEN 3
      ELSE 4
    END
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
