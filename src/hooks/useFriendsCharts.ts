import { useState, useEffect } from 'react';
import { getFriendsChartsData, type FriendChartData } from '@/services/friends';

// Global state to trigger refreshes across components
let globalRefreshTrigger = 0;
const refreshListeners: (() => void)[] = [];

export const triggerFriendsChartsRefresh = () => {
  globalRefreshTrigger++;
  refreshListeners.forEach(listener => listener());
};

export const useFriendsCharts = (userId: string | undefined) => {
  const [friendsCharts, setFriendsCharts] = useState<FriendChartData[]>([]);
  const [friendsChartsLoading, setFriendsChartsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load friends charts data
  const loadFriendsCharts = async () => {
    if (!userId) {
      console.log('📊 No user ID, clearing friends charts');
      setFriendsCharts([]);
      return;
    }

    console.log('📊 Starting to load friends charts for user:', userId);
    setFriendsChartsLoading(true);
    try {
      const { data, error } = await getFriendsChartsData(userId);
      
      if (error) {
        console.error('❌ Error loading friends charts:', error);
        setFriendsCharts([]);
      } else {
        console.log('📊 Friends charts loaded successfully:', {
          count: data.length,
          friends: data.map(f => ({ id: f.friend.id, name: f.friend.full_name || f.friend.email, commitments: f.commitments.length }))
        });

        // 🔍 DETAILED DEBUG: Log all commitment IDs for friend 8a1e7367-9995-4ae4-983a-519936ce7b87
        const targetFriend = data.find(f => f.friend.id === '8a1e7367-9995-4ae4-983a-519936ce7b87');
        if (targetFriend) {
          console.log('🔍 HOOK DEBUG - Friend 8a1e7367 commitments:', {
            count: targetFriend.commitments.length,
            commitmentIds: targetFriend.commitments.map(c => c.id),
            hasArchivedCommitment: targetFriend.commitments.some(c => c.id === 'd77e7fcb-47b6-41b3-ae5c-206944154596')
          });
        }

        setFriendsCharts(data);
      }
    } catch (error) {
      console.error('💥 Failed to load friends charts:', error);
      setFriendsCharts([]);
    } finally {
      setFriendsChartsLoading(false);
    }
  };

  // Initial load and refresh on user change
  useEffect(() => {
    loadFriendsCharts();
  }, [userId]);

  // Listen for global refresh triggers
  useEffect(() => {
    const handleRefresh = () => {
      setRefreshTrigger(prev => prev + 1);
    };

    refreshListeners.push(handleRefresh);

    return () => {
      const index = refreshListeners.indexOf(handleRefresh);
      if (index > -1) {
        refreshListeners.splice(index, 1);
      }
    };
  }, []);

  // Refresh when trigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      loadFriendsCharts();
    }
  }, [refreshTrigger]);

  return {
    friendsCharts,
    friendsChartsLoading,
    refreshFriendsCharts: loadFriendsCharts
  };
};
