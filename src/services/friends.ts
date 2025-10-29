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
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  avatar_animal: string | null;
  avatar_color: string | null;
  friendship_created_at?: string;
}

export interface FriendRequestWithProfile extends FriendRequest {
  sender_profile?: Profile;
  receiver_profile?: Profile;
}

// ==============================================
// FRIEND SEARCH
// ==============================================

// Note: searchUsersByEmail is now defined at the bottom of the file

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
    .select('id, email, username, full_name, avatar_url, avatar_animal, avatar_color')
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
      receiver_profile:profiles!receiver_id(id, email, username, full_name, avatar_url, avatar_animal, avatar_color)
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

export async function cancelFriendRequest(requestId: string) {
  if (!requestId) {
    return { data: null, error: { message: 'Request ID is required' } };
  }

  const { data, error } = await supabase
    .from('friend_requests')
    .delete()
    .eq('id', requestId)
    .select()
    .single();

  console.log('🚫 cancelFriendRequest result:', { 
    requestId: requestId.substring(0, 8) + '...', 
    error: error?.message || 'No error' 
  });

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
// FRIENDS CHARTS DATA
// ==============================================

export interface FriendChartData {
  friend: FriendProfile;
  commitments: Array<{
    id: string;
    title: string;
    color: string;
    type: 'binary' | 'counter' | 'timer';
    target?: number;
    streak: number;
    bestStreak: number;
    isActive: boolean;
    isPrivate: boolean;
    createdAt: string;
    updatedAt: string;
    // Display preference fields for friends to see user's settings
    showValues?: boolean;
    commitmentType?: 'checkbox' | 'measurement';
  }>;
  records: Array<{
    id: string;
    commitmentId: string;
    date: string;
    status: 'completed' | 'skipped' | 'failed' | 'none';
    value?: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export async function getFriendsChartsData(userId: string): Promise<{ data: FriendChartData[], error: any }> {
  console.log('📊 getFriendsChartsData called for user:', userId);


  try {
    // First get user's friends
    const { data: friends, error: friendsError } = await getUserFriends(userId);
    
    console.log('📊 getUserFriends result:', { 
      friendsCount: friends?.length || 0, 
      error: friendsError?.message || 'No error',
      friends: friends?.map(f => ({ id: f.id, name: f.full_name || f.email })) || []
    });
    
    if (friendsError || !friends || friends.length === 0) {
      console.log('📊 No friends found or error:', friendsError?.message || 'No friends');
      return { data: [], error: friendsError };
    }

    console.log('📊 Found friends:', friends.length);

    // For each friend, get their commitments and records
    const friendsChartsPromises = friends.map(async (friend) => {
      try {
        // Get friend's commitments
        console.log(`📊 Loading commitments for friend ${friend.id}`);
        
        const { data: commitments, error: commitmentsError } = await supabase
          .from('commitments')
          .select('*, order_rank, show_values, commitment_type')
          .eq('user_id', friend.id)
          .eq('is_active', true)
          .eq('archived', false)
          .is('deleted_at', null)
          .order('order_rank', { ascending: true })
          .order('updated_at', { ascending: true })
          .order('id', { ascending: true });

        console.log(`📊 Commitments query result for friend ${friend.id}:`, {
          commitmentsCount: commitments?.length || 0,
          error: commitmentsError?.message || 'No error',
          commitments: commitments?.map(c => ({ id: c.id, title: c.title, is_active: c.is_active })) || []
        });


        if (commitmentsError || !commitments) {
          console.log(`📊 Error loading commitments for friend ${friend.id}:`, commitmentsError?.message);
          return {
            friend,
            commitments: [],
            records: []
          };
        }

        // Convert commitments to the expected format and apply client-side ordering fallback
        const convertedCommitments = commitments
          .map(c => ({
            id: c.id,
            title: c.title,
            color: c.color,
            type: 'binary' as 'binary' | 'counter' | 'timer', // Default to binary for now
            target: c.target_days,
            streak: 0, // Will be calculated from records
            bestStreak: 0, // Will be calculated from records
            isActive: c.is_active,
            isPrivate: c.is_private || false, // Use database value, default to false
            createdAt: c.created_at,
            updatedAt: c.updated_at,
            order_rank: c.order_rank || '', // Include order_rank for client-side sorting
            // Display preference fields so friends can see user's preferred display format
            showValues: c.show_values || false,
            commitmentType: c.commitment_type || 'checkbox',
          }))
          .sort((a, b) => {
            // Client-side fallback ordering (matches selectActiveOrdered logic)
            const rankA = a.order_rank || '';
            const rankB = b.order_rank || '';
            const rankCompare = rankA.localeCompare(rankB);
            if (rankCompare !== 0) return rankCompare;

            const dateCompare = a.updatedAt.localeCompare(b.updatedAt);
            if (dateCompare !== 0) return dateCompare;

            return a.id.localeCompare(b.id);
          });

        if (__DEV__) {
          console.log(`👥 friends order applied: ${friend.id}, ${commitments.length}`);
        }

        // Get records for the last 30 days for all commitments
        let allRecords: any[] = [];
        if (commitments.length > 0) {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const startDate = thirtyDaysAgo.toISOString().split('T')[0];
          const endDate = new Date().toISOString().split('T')[0];

          const recordsPromises = commitments.map(commitment => 
            supabase
              .from('commitment_records')
              .select('*')
              .eq('commitment_id', commitment.id)
              .eq('user_id', friend.id)
              .gte('completed_at', `${startDate}T00:00:00Z`)
              .lte('completed_at', `${endDate}T23:59:59Z`)
              .order('completed_at', { ascending: true })
          );

          const recordsResults = await Promise.all(recordsPromises);
          allRecords = recordsResults.flatMap(result => result.data || []);
        }

        // Convert records to the expected format
        const convertedRecords = allRecords.map(r => ({
          id: r.id,
          commitmentId: r.commitment_id,
          date: r.completed_at.split('T')[0], // Extract date part
          status: r.status === 'complete' ? 'completed' : r.status as 'completed' | 'skipped' | 'failed' | 'none',
          value: r.value, // Preserve the actual value from database for measurement commitments
          notes: r.notes || undefined,
          createdAt: r.created_at,
          updatedAt: r.updated_at || r.created_at,
        }));

        console.log(`📊 Friend ${friend.id}: ${convertedCommitments.length} commitments, ${convertedRecords.length} records`);

        return {
          friend,
          commitments: convertedCommitments,
          records: convertedRecords
        };

      } catch (error) {
        console.error(`📊 Error processing friend ${friend.id}:`, error);
        return {
          friend,
          commitments: [],
          records: []
        };
      }
    });

    const friendsChartsData = await Promise.all(friendsChartsPromises);

    // Show all friends, even those without commitments (for empty state display)
    // const friendsWithCommitments = friendsChartsData.filter(data => data.commitments.length > 0);

    console.log('📊 Friends charts data loaded:', {
      totalFriends: friends.length,
      friendsWithCommitments: friendsChartsData.length
    });

    return { data: friendsChartsData, error: null };

  } catch (error) {
    console.error('📊 Error in getFriendsChartsData:', error);
    return { data: [], error };
  }
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

// ==============================================
// SEARCH FUNCTIONS
// ==============================================

export async function searchUsersByEmail(query: string) {
  const { data, error } = await supabase.rpc('search_users_by_email', {
    p_email_query: query
  });

  console.log('🔍 searchUsersByEmail result:', { 
    query,
    count: data?.length || 0, 
    error: error?.message || 'No error' 
  });

  return { data: data || [], error };
}
