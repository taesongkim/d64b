-- Create friends system tables
-- This migration adds friend requests and friendships functionality

-- ==============================================
-- 1. FRIEND REQUESTS TABLE
-- ==============================================

CREATE TABLE friend_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  message TEXT, -- Optional message with request
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(sender_id, receiver_id), -- Prevent duplicate requests
  CHECK(sender_id != receiver_id) -- Can't send request to yourself
);

-- ==============================================
-- 2. FRIENDSHIPS TABLE  
-- ==============================================

CREATE TABLE friendships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user1_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user1_id, user2_id), -- Prevent duplicate friendships
  CHECK(user1_id != user2_id), -- Can't be friends with yourself
  CHECK(user1_id < user2_id) -- Ensure consistent ordering (smaller UUID first)
);

-- ==============================================
-- 3. INDEXES FOR PERFORMANCE
-- ==============================================

-- Friend requests indexes
CREATE INDEX idx_friend_requests_receiver ON friend_requests(receiver_id, status);
CREATE INDEX idx_friend_requests_sender ON friend_requests(sender_id, status);
CREATE INDEX idx_friend_requests_status ON friend_requests(status, created_at);

-- Friendships indexes  
CREATE INDEX idx_friendships_user1 ON friendships(user1_id);
CREATE INDEX idx_friendships_user2 ON friendships(user2_id);

-- ==============================================
-- 4. TRIGGERS
-- ==============================================

-- Add updated_at trigger for friend_requests
CREATE TRIGGER update_friend_requests_updated_at 
  BEFORE UPDATE ON friend_requests 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ==============================================

-- Enable RLS
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Friend Requests Policies
CREATE POLICY "Users can view friend requests they sent or received" ON friend_requests
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests" ON friend_requests
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update friend requests they received" ON friend_requests
  FOR UPDATE USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete friend requests they sent or received" ON friend_requests
  FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Friendships Policies
CREATE POLICY "Users can view their friendships" ON friendships
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "System can create friendships" ON friendships
  FOR INSERT WITH CHECK (true); -- Will be created by functions, not direct inserts

CREATE POLICY "Users can delete their friendships" ON friendships
  FOR DELETE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ==============================================
-- 6. HELPER FUNCTIONS
-- ==============================================

-- Function to get user's friends (returns profiles of friends)
CREATE OR REPLACE FUNCTION get_user_friends(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
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
  WHERE f.user1_id = p_user_id OR f.user2_id = p_user_id
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if users are friends
CREATE OR REPLACE FUNCTION are_users_friends(p_user1_id UUID, p_user2_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  friendship_exists BOOLEAN := false;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM friendships 
    WHERE (user1_id = LEAST(p_user1_id, p_user2_id) AND user2_id = GREATEST(p_user1_id, p_user2_id))
  ) INTO friendship_exists;
  
  RETURN friendship_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept friend request (creates friendship and removes request)
CREATE OR REPLACE FUNCTION accept_friend_request(p_request_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_request RECORD;
  v_user1_id UUID;
  v_user2_id UUID;
BEGIN
  -- Get the friend request
  SELECT * INTO v_request 
  FROM friend_requests 
  WHERE id = p_request_id 
    AND receiver_id = auth.uid() 
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Ensure consistent ordering for friendship
  v_user1_id := LEAST(v_request.sender_id, v_request.receiver_id);
  v_user2_id := GREATEST(v_request.sender_id, v_request.receiver_id);
  
  -- Create friendship
  INSERT INTO friendships (user1_id, user2_id)
  VALUES (v_user1_id, v_user2_id)
  ON CONFLICT DO NOTHING;
  
  -- Update request status
  UPDATE friend_requests 
  SET status = 'accepted', updated_at = NOW()
  WHERE id = p_request_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search users by email (for adding friends)
CREATE OR REPLACE FUNCTION search_users_by_email(p_email_query TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.avatar_url
  FROM profiles p
  WHERE p.email ILIKE '%' || p_email_query || '%'
    AND p.id != auth.uid() -- Exclude self
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
