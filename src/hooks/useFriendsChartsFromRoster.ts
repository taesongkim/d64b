import { useState, useEffect, useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import { getFriendsChartsData, type FriendChartData } from '@/services/friends';
import { selectFriendsOrdered } from '@/store/selectors/friendsOrder';

/**
 * Hook that derives friends charts from the canonical roster
 * Ensures UI consistency between Friends' Progress and Reorder modal
 */
export const useFriendsChartsFromRoster = (userId: string | undefined) => {
  const [friendsCharts, setFriendsCharts] = useState<FriendChartData[]>([]);
  const [friendsChartsLoading, setFriendsChartsLoading] = useState(false);

  // Get ordered friends from the selector (properly sorted by order_rank)
  const orderedFriends = useAppSelector(selectFriendsOrdered);
  const rosterLoading = useAppSelector(state => state.social.rosterLoading);

  console.log('🔍 [Charts Hook] Current ordered friends from selector:', orderedFriends.map(f => ({ id: f.id, name: f.displayName, order_rank: f.order_rank })));
  console.log('🔍 [Charts Hook] Render triggered, orderedFriends length:', orderedFriends.length);

  // Extract friend IDs from ordered friends
  const friendIds = useMemo(() => orderedFriends.map(f => f.id), [orderedFriends]);

  // Load charts data for roster friends
  const loadFriendsCharts = async () => {
    if (!userId || friendIds.length === 0) {
      console.log('📊 No user ID or friends in roster, clearing charts');
      setFriendsCharts([]);
      return;
    }

    console.log('📊 Loading charts for roster friends:', { userId, friendCount: friendIds.length });
    setFriendsChartsLoading(true);

    try {
      // Use existing service but filter to roster friends only
      const { data, error } = await getFriendsChartsData(userId);

      if (error) {
        console.error('❌ Error loading friends charts:', error);
        setFriendsCharts([]);
      } else {
        // Filter to only include friends in the roster
        const rosterFriendsSet = new Set(friendIds);
        const filteredData = (data || []).filter(friendData =>
          rosterFriendsSet.has(friendData.friend.id)
        );

        // Sort filtered data according to orderedFriends order
        const friendsOrderMap = new Map(orderedFriends.map((friend, index) => [friend.id, index]));
        const orderedData = filteredData.sort((a, b) => {
          const orderA = friendsOrderMap.get(a.friend.id) ?? 999;
          const orderB = friendsOrderMap.get(b.friend.id) ?? 999;
          return orderA - orderB;
        });

        console.log('📊 [Charts Hook] Charts loaded, filtered by roster, and ordered:', {
          totalFriends: data?.length || 0,
          orderedFriends: orderedData.length,
          friends: orderedData.map(f => ({ id: f.friend.id, name: f.friend.full_name || f.friend.email }))
        });

        setFriendsCharts(orderedData);
      }
    } catch (error) {
      console.error('💥 Failed to load friends charts from roster:', error);
      setFriendsCharts([]);
    } finally {
      setFriendsChartsLoading(false);
    }
  };

  // Track previous friend IDs to detect when we need to reload vs just re-sort
  const [prevFriendIds, setPrevFriendIds] = useState<string>('');

  // Load when roster or userId changes
  useEffect(() => {
    const currentFriendIdsStr = friendIds.join(',');

    // If friend IDs changed (not just order), reload from database
    if (prevFriendIds !== currentFriendIdsStr) {
      console.log('📊 [Charts Hook] Friend IDs changed, reloading charts from database');
      setPrevFriendIds(currentFriendIdsStr);
      loadFriendsCharts();
    }
    // If same friends but different order, just re-sort existing data
    else if (friendsCharts.length > 0 && orderedFriends.length > 0) {
      console.log('📊 [Charts Hook] Same friends, different order - re-sorting existing charts');

      // Create order map from Redux roster
      const friendsOrderMap = new Map(orderedFriends.map((friend, index) => [friend.id, index]));

      // Re-sort existing charts data according to new order
      const reorderedCharts = [...friendsCharts].sort((a, b) => {
        const orderA = friendsOrderMap.get(a.friend.id) ?? 999;
        const orderB = friendsOrderMap.get(b.friend.id) ?? 999;
        return orderA - orderB;
      });

      console.log('📊 [Charts Hook] Reordered charts:', reorderedCharts.map(f => ({ id: f.friend.id, name: f.friend.full_name || f.friend.email })));
      setFriendsCharts(reorderedCharts);
    }
  }, [userId, orderedFriends]);

  return {
    friendsCharts,
    friendsChartsLoading: friendsChartsLoading || rosterLoading,
    refreshFriendsCharts: loadFriendsCharts
  };
};