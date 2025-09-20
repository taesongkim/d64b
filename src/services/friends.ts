import { supabase } from './supabase';
import type { Database } from '@/types/supabase';

// Type definitions
type FriendRequest = Database['public']['Tables']['friend_requests']['Row'];
type FriendRequestInsert = Database['public']['Tables']['friend_requests']['Insert'];
type Friendship = Database['public']['Tables']['friendships']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export interface FriendProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  friendship_created_at?: string;
}

export interface FriendRequestWithProfile extends FriendRequest {
  sender_profile?: Profile;
  receiver_profile?: Profile;
}

// ==============================================
// FRIEND SEARCH
// ==============================================

export async function searchUsersByEmail(emailQuery: string) {
  console.log('🔍 searchUsersByEmail called:', { emailQuery });
  
  const { data, error } = await supabase.rpc('search_users_by_email', {
    p_email_query: emailQuery
  });

  console.log('🔍 searchUsersByEmail result:', { 
    count: data?.length || 0, 
    error: error?.message || 'No error' 
  });

  return { data: data || [], error };
}

// ==============================================
// FRIEND REQUESTS
// ==============================================

export async function sendFriendRequest(receiverId: string, message?: string) {
  const { data: currentUser } = await supabase.auth.getUser();
  if (!currentUser?.user?.id) {
    return { data: null, error: { message: 'Not authenticated' } };
  }

  // First check if there's already a request
  const { data: existingRequest } = await supabase
    .from('friend_requests')
    .select('id, status')
    .eq('sender_id', currentUser.user.id)
    .eq('receiver_id', receiverId)
    .single();

  if (existingRequest) {
    if (existingRequest.status === 'pending') {
      return { data: null, error: { message: 'Friend request already sent' } };
    } else {
      // Update existing request to pending
      const { data, error } = await supabase
        .from('friend_requests')
        .update({ 
          status: 'pending', 
          message: message || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRequest.id)
        .select()
        .single();
      
      return { data, error };
    }
  }

  // Create new request
  const requestData: FriendRequestInsert = {
    sender_id: currentUser.user.id,
    receiver_id: receiverId,
    message: message || null,
  };

  const { data, error } = await supabase
    .from('friend_requests')
    .insert([requestData])
    .select()
    .single();

  return { data, error };
}

export async function getPendingFriendRequests(userId: string) {
  // Get the friend requests
  const { data: requests, error: requestsError } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (requestsError || !requests) {
    return { data: [], error: requestsError };
  }

  // Get the sender profiles separately
  const senderIds = requests.map(r => r.sender_id);
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url')
    .in('id', senderIds);

  // Combine the data
  const requestsWithProfiles = requests.map(request => ({
    ...request,
    sender_profile: profiles?.find(p => p.id === request.sender_id) || null
  }));

  return { data: requestsWithProfiles, error: null };
}

export async function getSentFriendRequests(userId: string) {

  const { data, error } = await supabase
    .from('friend_requests')
    .select(`
      *,
      receiver_profile:profiles!receiver_id(id, email, full_name, avatar_url)
    `)
    .eq('sender_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  console.log('📤 getSentFriendRequests result:', { 
    count: data?.length || 0, 
    error: error?.message || 'No error' 
  });

  return { data: data || [], error };
}

export async function acceptFriendRequest(requestId: string) {
  if (!requestId) {
    return { data: null, error: { message: 'Request ID is required' } };
  }

  const { data, error } = await supabase.rpc('accept_friend_request', {
    p_request_id: requestId
  });

  return { data, error };
}

export async function declineFriendRequest(requestId: string) {
  if (!requestId) {
    return { data: null, error: { message: 'Request ID is required' } };
  }

  const { data, error } = await supabase
    .from('friend_requests')
    .update({ status: 'declined' })
    .eq('id', requestId)
    .select()
    .single();

  return { data, error };
}

// ==============================================
// FRIENDSHIPS
// ==============================================

export async function getUserFriends(userId: string) {

  const { data, error } = await supabase.rpc('get_user_friends', {
    p_user_id: userId
  });

  console.log('👥 getUserFriends result:', { 
    count: data?.length || 0, 
    error: error?.message || 'No error' 
  });

  return { data: data || [], error };
}

export async function removeFriend(friendUserId: string) {

  const { data: currentUser } = await supabase.auth.getUser();
  if (!currentUser?.user?.id) {
    return { data: null, error: { message: 'Not authenticated' } };
  }

  const currentUserId = currentUser.user.id;
  
  // Ensure consistent ordering for deletion
  const user1Id = currentUserId < friendUserId ? currentUserId : friendUserId;
  const user2Id = currentUserId < friendUserId ? friendUserId : currentUserId;

  const { data, error } = await supabase
    .from('friendships')
    .delete()
    .eq('user1_id', user1Id)
    .eq('user2_id', user2Id)
    .select()
    .single();

  console.log('🗑️ removeFriend result:', { 
    success: !!data, 
    error: error?.message || 'No error' 
  });

  return { data, error };
}

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

export async function checkFriendshipStatus(otherUserId: string) {

  const { data: currentUser } = await supabase.auth.getUser();
  if (!currentUser?.user?.id) {
    return { 
      areFriends: false, 
      hasPendingRequest: false, 
      hasSentRequest: false,
      error: { message: 'Not authenticated' }
    };
  }

  const currentUserId = currentUser.user.id;

  // Check if already friends
  const { data: friendshipData } = await supabase.rpc('are_users_friends', {
    p_user1_id: currentUserId,
    p_user2_id: otherUserId
  });

  // Check for pending requests (received)
  const { data: pendingRequests } = await supabase
    .from('friend_requests')
    .select('id')
    .eq('sender_id', otherUserId)
    .eq('receiver_id', currentUserId)
    .eq('status', 'pending');

  // Check for sent requests  
  const { data: sentRequests } = await supabase
    .from('friend_requests')
    .select('id')
    .eq('sender_id', currentUserId)
    .eq('receiver_id', otherUserId)
    .eq('status', 'pending');

  const result = {
    areFriends: friendshipData || false,
    hasPendingRequest: (pendingRequests?.length || 0) > 0,
    hasSentRequest: (sentRequests?.length || 0) > 0,
    error: null
  };

  console.log('🔍 checkFriendshipStatus result:', result);

  return result;
}
