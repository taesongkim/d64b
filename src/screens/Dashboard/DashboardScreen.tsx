import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  RefreshControl
} from 'react-native';
import CommitmentGrid from '@/components/CommitmentGrid';
import AddCommitmentModal from '@/components/AddCommitmentModal';
import CommitmentDetailsModal from '@/components/CommitmentDetailsModal';
import ViewToggle from '@/components/ViewToggle';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addCommitment, setCommitments, updateCommitment, selectActiveCommitments, archiveCommitmentThunk, restoreCommitmentThunk, softDeleteCommitmentThunk, permanentDeleteCommitmentThunk, type Commitment } from '@/store/slices/commitmentsSlice';
import { toggleRecord, setRecordStatus, setRecords, type RecordStatus } from '@/store/slices/recordsSlice';
import { addToQueue } from '@/store/slices/syncSlice';
import { loadInitialDataFromDatabase } from '@/store/middleware/databaseMiddleware';
import { useFontStyle } from '@/hooks/useFontStyle';
import { getTodayISO, getTodayDisplayDate, getCurrentTimestamp } from '@/utils/timeUtils';
import { isFeatureEnabled } from '@/config/features';
import { useAuth } from '@/contexts/AuthContext';
import { getUserCommitments, createCommitment, updateCommitment as updateCommitmentService, upsertCommitmentRecord, getCommitmentRecords, deleteCommitmentRecordByDate } from '@/services/commitments';
import { type FriendChartData } from '@/services/friends';
import FriendChart from '@/components/FriendChart';
import { useFriendsCharts } from '@/hooks/useFriendsCharts';
import { triggerManualSync, setSyncUserId } from '@/services/syncScheduler';
import { since } from '@/_shared/perf';

export default function DashboardScreen(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const commitments = useAppSelector(selectActiveCommitments);
  const records = useAppSelector(state => state.records.records);
  const { user } = useAuth();
  
  const fontStyle = useFontStyle();
  const boldFontStyle = useFontStyle(undefined, 'bold');
  const semiBoldFontStyle = useFontStyle(undefined, 'semiBold');
  
  // Load authenticated user's data
  useEffect(() => {
    const loadUserData = async () => {
      if (!user?.id) {
        console.log('No authenticated user, skipping data load');
        return;
      }

      console.log('📊 Loading data for authenticated user:', user.id);
      
      try {
        // Load user's commitments from Supabase
        const { commitments: userCommitments, error } = await getUserCommitments(user.id);
        
        if (error) {
          console.error('❌ Error loading user commitments:', error);
          return;
        }

        console.log('📥 Loaded commitments:', userCommitments?.length || 0);
        
        if (userCommitments && userCommitments.length > 0) {
          // Convert Supabase data to Redux format
          const convertedCommitments = userCommitments.map(c => ({
            id: c.id,
            userId: c.user_id,
            title: c.title,
            description: c.description || undefined,
            color: c.color,
            // New commitment type architecture
            commitmentType: c.commitment_type || 'checkbox', // Default to checkbox for existing commitments
            target: c.target,
            unit: c.unit,
            requirements: c.requirements,
            ratingRange: c.rating_range,
            // Legacy fields for backward compatibility
            type: c.commitment_type === 'checkbox' && !c.requirements ? 'binary' as const :
                  c.commitment_type === 'checkbox' && c.requirements ? 'binary' as const :
                  c.commitment_type === 'measurement' && c.rating_range ? 'counter' as const : 'timer' as const,
            streak: 0, // Will be calculated from records
            bestStreak: 0, // Will be calculated from records
            isActive: c.is_active,
            isPrivate: c.is_private || false, // Use database value, default to false
            createdAt: c.created_at,
            updatedAt: c.updated_at,
            // Archive and soft delete fields
            archived: c.archived || false,
            deletedAt: c.deleted_at || null,
          }));

          dispatch(setCommitments(convertedCommitments));
          console.log('✅ User commitments loaded into Redux');
        } else {
          console.log('📝 No commitments found for user');
          dispatch(setCommitments([]));
        }
        
        // Load user's records for the last 30 days
        console.log('🔍 Checking if should load records:', { 
          hasCommitments: !!userCommitments, 
          commitmentCount: userCommitments?.length || 0 
        });
        
        if (userCommitments && userCommitments.length > 0) {
          console.log('📊 Loading user records for', userCommitments.length, 'commitments...');
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const startDate = thirtyDaysAgo.toISOString().split('T')[0];
          const endDate = new Date().toISOString().split('T')[0];

          // Get records for all commitments
          const recordsPromises = userCommitments.map(commitment => 
            getCommitmentRecords(commitment.id, startDate, endDate)
          );

          try {
            const recordsResults = await Promise.all(recordsPromises);
            const allRecords = recordsResults.flatMap(result => result.data || []);
            
            // Convert to Redux format
            const convertedRecords = allRecords.map(r => ({
              id: r.id,
              commitmentId: r.commitment_id,
              date: r.completed_at.split('T')[0], // Extract date part
              status: r.status === 'complete' ? 'completed' : r.status as RecordStatus,
              value: undefined,
              notes: r.notes || undefined,
              createdAt: r.created_at,
              updatedAt: r.updated_at || r.created_at,
            }));

            dispatch(setRecords(convertedRecords));
            console.log('✅ User records loaded:', convertedRecords.length);
            console.log('TTFS(ms)', since('app:start'));
          } catch (recordError) {
            console.error('❌ Error loading records:', recordError);
          }
        }
        
      } catch (error) {
        console.error('💥 Failed to load user data:', error);
      }
    };

    loadUserData();
  }, [user?.id, dispatch]);


  // Fallback sample data for development (only if no user authenticated)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (!user?.id && commitments.length === 0) {
      timer = setTimeout(() => {
        const sampleCommitments: Commitment[] = [
          { 
            id: '1', 
            userId: 'current_user',
            title: 'Morning Meditation', 
            color: '#111827', 
            type: 'binary', 
            streak: 3,
            bestStreak: 3,
            isActive: true,
            isPrivate: false,
            createdAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp()
          },
          { 
            id: '2', 
            userId: 'current_user',
            title: 'Exercise', 
            color: '#111827', 
            type: 'binary', 
            streak: 7,
            bestStreak: 7,
            isActive: true,
            isPrivate: false,
            createdAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp()
          },
          { 
            id: '3', 
            userId: 'current_user',
            title: 'Read 30 mins', 
            color: '#8B5CF6', 
            type: 'binary', 
            streak: 1,
            bestStreak: 5,
            isActive: true,
            isPrivate: false,
            createdAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp()
          },
          { 
            id: '4', 
            userId: 'current_user',
            title: 'No Social Media', 
            color: '#EF4444', 
            type: 'binary', 
            streak: 2,
            bestStreak: 10,
            isActive: true,
            isPrivate: false,
            createdAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp()
          },
          { 
            id: '5', 
            userId: 'current_user',
            title: 'Water (8 glasses)', 
            color: '#06B6D4', 
            type: 'counter', 
            target: 8,
            unit: 'glasses',
            streak: 5,
            bestStreak: 12,
            isActive: true,
            isPrivate: false,
            createdAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp()
          },
        ];
        
        sampleCommitments.forEach(commitment => {
          dispatch(addCommitment(commitment));
        });
      }, 500);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [user?.id, commitments.length, dispatch]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [showCommitmentDetailsModal, setShowCommitmentDetailsModal] = useState(false);
  const [selectedCommitmentId, setSelectedCommitmentId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Use the friends charts hook for global state management
  const { friendsCharts, friendsChartsLoading } = useFriendsCharts(user?.id);

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Ensure sync scheduler has current user ID before triggering sync
      if (user?.id) {
        setSyncUserId(user.id);
      }
      await triggerManualSync();
      console.log('🔄 Manual sync completed');
    } catch (error) {
      console.error('❌ Manual sync failed:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  const handleCellPress = (commitmentId: string, date: string, event: any) => {
    // This handler is now used by CommitmentGrid for showing quick options popup
    // The actual gesture handling is delegated to CommitmentGrid component
    console.log('📱 Cell press delegated to CommitmentGrid for quick options');
  };

  const handleSetRecordStatus = (commitmentId: string, date: string, status: RecordStatus, value?: any) => {
    if (!user?.id) {
      console.error('❌ Cannot update record: No authenticated user');
      return;
    }

    console.log('📝 Updating record status (optimistic):', { commitmentId, date, status, userId: user.id });

    // STEP 1: Optimistic update - immediately update Redux state for instant UI feedback
    dispatch(setRecordStatus({ commitmentId, date, status, value }));

    // STEP 2: Add to sync queue for background database sync
    const recordData = status !== 'none' ? {
      commitment_id: commitmentId,
      completed_at: `${date}T12:00:00Z`,
      notes: null,
      user_id: user.id,
      status: status === 'completed' ? 'complete' : status,
      value: value || null,
    } : null;

    if (status !== 'none') {
      // CREATE/UPDATE record
      dispatch(addToQueue({
        type: 'CREATE',
        entity: 'record',
        entityId: `${commitmentId}_${date}`,
        data: recordData
      }));
    } else {
      // DELETE record
      dispatch(addToQueue({
        type: 'DELETE',
        entity: 'record',
        entityId: `${commitmentId}_${date}`,
        data: {
          commitment_id: commitmentId,
          completed_at: `${date}T12:00:00Z`
        }
      }));
    }

    console.log('✅ Record update queued for sync');
  };

  const handleAddCommitment = async (commitmentData: Omit<Commitment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user?.id) {
      console.error('❌ Cannot add commitment: No authenticated user');
      return;
    }

    console.log('➕ Adding commitment for user:', user.id);
    
    try {
      // Save to Supabase first
      const supabaseData = {
        user_id: user.id,
        title: commitmentData.title,
        description: commitmentData.description || null,
        color: commitmentData.color,
        target_days: commitmentData.target || 30,
        is_active: true,
        is_private: commitmentData.isPrivate || false,
        // New commitment type architecture
        commitment_type: commitmentData.commitmentType,
        target: commitmentData.target,
        unit: commitmentData.unit,
        requirements: commitmentData.requirements,
        rating_range: commitmentData.ratingRange,
        // Note: 'type' field doesn't exist in current schema
        // tracking_mode and other Phase 0 fields will be used later
      };

      console.log('💾 Saving commitment to Supabase...');
      const { data, error } = await createCommitment(supabaseData);
      
      if (error) {
        console.error('❌ Failed to save commitment to database:', error);
        // Still add to Redux for offline functionality
      } else {
        console.log('✅ Commitment saved to database:', data?.id);
      }

      // Add to Redux (use Supabase ID if available, fallback to timestamp)
      const newCommitment: Commitment = {
        ...commitmentData,
        id: data?.id || Date.now().toString(),
        userId: user.id,
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      };
      
      dispatch(addCommitment(newCommitment));
      
    } catch (error) {
      console.error('💥 Unexpected error saving commitment:', error);
      // Still add to Redux for offline functionality
      const newCommitment: Commitment = {
        ...commitmentData,
        id: Date.now().toString(),
        userId: user.id,
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      };
      dispatch(addCommitment(newCommitment));
    }
  };

  const handleCommitmentTitlePress = (commitmentId: string) => {
    setSelectedCommitmentId(commitmentId);
    setShowCommitmentDetailsModal(true);
  };

  const handleUpdateCommitment = async (id: string, updates: Partial<Commitment>) => {
    if (!user?.id) {
      console.error('❌ Cannot update commitment: No authenticated user');
      return;
    }

    try {
      console.log('📝 Updating commitment:', id, updates);
      
      // Convert Redux commitment updates to Supabase format
      const supabaseUpdates: any = {};
      
      if (updates.title !== undefined) {
        supabaseUpdates.title = updates.title;
      }
      if (updates.description !== undefined) {
        supabaseUpdates.description = updates.description || null;
      }
      if (updates.color !== undefined) {
        supabaseUpdates.color = updates.color;
      }
      if (updates.target !== undefined) {
        supabaseUpdates.target = updates.target;
      }
      if (updates.unit !== undefined) {
        supabaseUpdates.unit = updates.unit;
      }
      if (updates.requirements !== undefined) {
        supabaseUpdates.requirements = updates.requirements;
      }
      if (updates.commitmentType !== undefined) {
        supabaseUpdates.commitment_type = updates.commitmentType;
      }
      
      // Update in Supabase
      const { error } = await updateCommitmentService(id, supabaseUpdates);
      
      if (error) {
        console.error('❌ Failed to update commitment in database:', error);
        // Still update Redux for offline functionality
      } else {
        console.log('✅ Commitment updated in database');
      }
      
      // Update Redux state
      dispatch(updateCommitment({ id, updates }));
      
    } catch (error) {
      console.error('💥 Error updating commitment:', error);
      // Still update Redux for offline functionality
      dispatch(updateCommitment({ id, updates }));
    }
  };

  const handleArchiveCommitment = (id: string) => {
    dispatch(archiveCommitmentThunk(id));
  };

  const handleRestoreCommitment = (id: string) => {
    dispatch(restoreCommitmentThunk(id));
  };

  const handleSoftDeleteCommitment = (id: string) => {
    dispatch(softDeleteCommitmentThunk(id));
  };

  const handlePermanentDeleteCommitment = (id: string) => {
    dispatch(permanentDeleteCommitmentThunk(id));
  };

  // Get notes for the selected commitment
  const getCommitmentNotes = () => {
    if (!selectedCommitmentId) return [];

    return records
      .filter(r => r.commitmentId === selectedCommitmentId && r.notes)
      .map(r => ({
        date: r.date,
        notes: r.notes || null,
      }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#111827"
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, fontStyle]}>Good morning!</Text>
            <Text style={[styles.date, fontStyle]}>{getTodayDisplayDate()}</Text>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={[styles.addButtonText, fontStyle]}>+</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, fontStyle]}>{commitments.length}</Text>
            <Text style={[styles.statLabel, fontStyle]}>Active Habits</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, fontStyle]}>
              {records.filter(r => r.date === getTodayISO()).length}
            </Text>
            <Text style={[styles.statLabel, fontStyle]}>Completed Today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, fontStyle]}>
              {Math.max(...commitments.map(c => c.streak), 0)}
            </Text>
            <Text style={[styles.statLabel, fontStyle]}>Best Streak</Text>
          </View>
        </View>
        
        <View style={styles.gridContainer}>
          {/* Header row with title and toggle */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, fontStyle]}>Your Commitments</Text>
            <ViewToggle 
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </View>
          
          {commitments.length > 0 ? (
            <CommitmentGrid
              commitments={commitments}
              records={records}
              onCellPress={handleCellPress}
              onSetRecordStatus={handleSetRecordStatus}
              onCommitmentTitlePress={handleCommitmentTitlePress}
              hideToggle={true}
              viewMode={viewMode}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, fontStyle]}>No habits yet</Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => setShowAddModal(true)}
              >
                <Text style={[styles.emptyStateButtonText, fontStyle]}>Add your first habit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

      {/* Friends Charts Section */}
      {user?.id && (
        <>
          {/* Divider */}
          <View style={styles.divider} />
          
          <View style={styles.friendsChartsContainer}>
            <Text style={[styles.sectionTitle, fontStyle]}>Friends' Progress</Text>
            {friendsChartsLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={[styles.loadingText, fontStyle]}>Loading friends' charts...</Text>
              </View>
            ) : friendsCharts.length > 0 ? (
              friendsCharts.map((friendChartData) => (
                <FriendChart
                  key={friendChartData.friend.id}
                  friendChartData={friendChartData}
                  onFriendPress={(friendId, friendName) => {
                    console.log('👀 Friend pressed:', friendId, friendName);
                    // TODO: Navigate to friend's detailed view in future
                  }}
                />
              ))
            ) : (
              <View style={styles.comingSoonCard}>
                <Text style={[styles.comingSoonText, fontStyle]}>
                  Connect with friends to see their progress here!
                </Text>
              </View>
            )}
          </View>
        </>
      )}
      </ScrollView>

      <AddCommitmentModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddCommitment}
      />
      
      <CommitmentDetailsModal
        visible={showCommitmentDetailsModal}
        onClose={() => {
          setShowCommitmentDetailsModal(false);
          setSelectedCommitmentId(null);
        }}
        commitmentId={selectedCommitmentId}
        onUpdateCommitment={handleUpdateCommitment}
        notes={getCommitmentNotes()}
        onArchive={handleArchiveCommitment}
        onRestore={handleRestoreCommitment}
        onSoftDelete={handleSoftDeleteCommitment}
        onPermanentDelete={handlePermanentDeleteCommitment}
        records={records}
        onCellPress={handleCellPress}
        onSetRecordStatus={handleSetRecordStatus}
        earliestDate={user?.created_at ? user.created_at.split('T')[0] : undefined}
      />


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  greeting: {
    fontSize: 24,
    color: '#111827',
  },
  date: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statNumber: {
    fontSize: 24,
    color: '#111827',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  gridContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#111827',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    minHeight: 200,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: 'white',
    fontSize: 14,
  },
  comingSoonCard: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  comingSoonText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  activityContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
    marginHorizontal: 20,
  },
  friendsChartsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
    fontStyle: 'italic',
  },
});