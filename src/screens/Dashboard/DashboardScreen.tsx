import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  RefreshControl
} from 'react-native';
import CommitmentGrid from '@/components/CommitmentGrid';
import AddCommitmentModal from '@/components/AddCommitmentModal';
import CommitmentDetailsModal from '@/components/CommitmentDetailsModal';
import CommitmentOrderingModalR2 from '@/components/CommitmentOrderingModalR2';
import ViewToggle from '@/components/ViewToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addCommitment, setCommitments, updateCommitment, selectActiveCommitments, archiveCommitmentThunk, restoreCommitmentThunk, softDeleteCommitmentThunk, permanentDeleteCommitmentThunk, type Commitment } from '@/store/slices/commitmentsSlice';
import { selectActiveOrdered } from '@/store/selectors/commitmentsOrder';
import { selectActiveLayoutItemsOrdered } from '@/store/slices/layoutItemsSlice';
import { toggleRecord, setRecordStatus, setRecords, loadAllRecordsThunk, type RecordStatus } from '@/store/slices/recordsSlice';
import { addToQueue } from '@/store/slices/syncSlice';
import { loadInitialDataFromDatabase } from '@/store/middleware/databaseMiddleware';
import { useFontStyle } from '@/hooks/useFontStyle';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { getTodayISO, getTodayDisplayDate, getCurrentTimestamp } from '@/utils/timeUtils';
import { getGridColors } from '@/components/grids/gridPalette';
import { normalizeUnit } from '@/utils/unitUtils';
import { rankAfter } from '@/utils/rank';
import { isFeatureEnabled } from '@/config/features';
import { useAuth } from '@/contexts/AuthContext';
import { getUserCommitments, createCommitment, updateCommitment as updateCommitmentService, upsertCommitmentRecord, getCommitmentRecords, deleteCommitmentRecordByDate, seedOrderRanksIfNeeded } from '@/services/commitments';
import { type FriendChartData } from '@/services/friends';
import FriendChart from '@/components/FriendChart';
import { useFriendsCharts } from '@/hooks/useFriendsCharts';
import { triggerManualSync, setSyncUserId } from '@/services/syncScheduler';
import { since } from '@/_shared/perf';

export default function DashboardScreen(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const commitments = useAppSelector(selectActiveOrdered);
  const layoutItems = useAppSelector(selectActiveLayoutItemsOrdered);
  const records = useAppSelector(state => state.records.records);
  const { user } = useAuth();
  
  const fontStyle = useFontStyle();
  const boldFontStyle = useFontStyle(undefined, 'bold');
  const semiBoldFontStyle = useFontStyle(undefined, 'semiBold');

  const styles = useThemedStyles(({ semanticColors, mode, colors }) => {
    const gridColors = getGridColors(mode);
    return {
    container: {
      flex: 1,
      backgroundColor: semanticColors.sectionBackground,
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
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    greeting: {
      fontSize: 24,
      color: semanticColors.primaryText,
    },
    date: {
      fontSize: 14,
      color: semanticColors.secondaryText,
      marginTop: 2,
    },
    addButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: semanticColors.primaryText,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addButtonText: {
      color: semanticColors.sectionBackground,
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
      backgroundColor: semanticColors.sectionBackground,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: semanticColors.defaultBorder,
    },
    statNumber: {
      fontSize: 24,
      color: semanticColors.primaryText,
    },
    statLabel: {
      fontSize: 11,
      color: semanticColors.secondaryText,
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
      color: semanticColors.primaryText,
    },
    headerControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    reorderButton: {
      backgroundColor: mode === 'light' ? colors.gray200 : gridColors.weekend,
      borderRadius: 8,
      padding: 2,
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    reorderButtonInner: {
      backgroundColor: mode === 'light' ? colors.white : gridColors.idle,
      borderRadius: 6,
      width: 28,
      height: 28,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    hamburgerIcon: {
      justifyContent: 'space-between',
      height: 12,
      width: 16,
    },
    hamburgerLine: {
      height: 2,
      backgroundColor: mode === 'light' ? colors.gray500 : semanticColors.primaryText,
      borderRadius: 1,
      opacity: 1.0,
    },
    emptyState: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
      minHeight: 200,
    },
    emptyStateText: {
      fontSize: 16,
      color: semanticColors.tertiaryText,
      marginBottom: 16,
    },
    emptyStateButton: {
      backgroundColor: semanticColors.primaryText,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
    },
    emptyStateButtonText: {
      color: semanticColors.primaryBackground,
      fontSize: 14,
    },
    comingSoonCard: {
      paddingVertical: 40,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 100,
    },
    comingSoonText: {
      color: semanticColors.secondaryText,
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
      backgroundColor: semanticColors.defaultBorder,
      marginVertical: 20,
      marginHorizontal: 0,
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
      color: semanticColors.secondaryText,
      fontSize: 14,
      fontStyle: 'italic',
    },
  };
  });
  
  // Use ref to prevent multiple simultaneous loads
  const isLoadingRef = useRef(false);
  const lastLoadedUserIdRef = useRef<string | null>(null);

  // Load authenticated user's data
  useEffect(() => {
    const currentUserId = user?.id;

    console.log('🔄 [DEBUG] Dashboard useEffect triggered:', {
      userId: currentUserId,
      isLoading: isLoadingRef.current,
      lastLoadedUserId: lastLoadedUserIdRef.current,
      shouldSkip: !currentUserId || isLoadingRef.current || lastLoadedUserIdRef.current === currentUserId,
      timestamp: new Date().toISOString()
    });

    // Skip if no user, already loading, or already loaded for this user
    if (!currentUserId || isLoadingRef.current || lastLoadedUserIdRef.current === currentUserId) {
      return;
    }

    const loadUserData = async () => {
      isLoadingRef.current = true;
      console.log('📊 Loading data for authenticated user:', currentUserId);
      
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
            showValues: c.show_values,
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
            // Order ranking fields
            order_rank: c.order_rank || '',
            last_active_rank: c.last_active_rank || null,
          }));

          dispatch(setCommitments(convertedCommitments));
          console.log('✅ User commitments loaded into Redux');

          // Load user's layout items from Supabase
          try {
            const { getUserLayoutItems } = await import('@/services/layoutItems');
            const userLayoutItems = await getUserLayoutItems(user.id);

            if (userLayoutItems && userLayoutItems.length > 0) {
              const { setLayoutItems } = await import('@/store/slices/layoutItemsSlice');
              dispatch(setLayoutItems(userLayoutItems));
              console.log('✅ User layout items loaded into Redux:', userLayoutItems.length);
            } else {
              console.log('📥 No layout items found for user');
            }
          } catch (layoutError) {
            console.error('❌ Error loading layout items:', layoutError);
          }

          // Seed order ranks if needed (DEV only)
          if (__DEV__) {
            try {
              const seedResult = await seedOrderRanksIfNeeded(user.id);
              if (seedResult.seeded > 0) {
                console.log('🌱 Seeded', seedResult.seeded, 'commitment order ranks');
                // Reload commitments to get updated ranks
                const { commitments: reloadedCommitments } = await getUserCommitments(user.id);
                if (reloadedCommitments) {
                  const reloadedConverted = reloadedCommitments.map(c => ({
                    ...convertedCommitments.find(cc => cc.id === c.id)!,
                    order_rank: c.order_rank || '',
                    last_active_rank: c.last_active_rank || null,
                  }));
                  dispatch(setCommitments(reloadedConverted));
                }
              }
            } catch (seedError) {
              console.warn('🌱 Order rank seeding failed:', seedError);
            }
          }
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
              userId: r.user_id || '',
              commitmentId: r.commitment_id,
              date: r.completed_at.split('T')[0], // Extract date part
              status: r.status === 'complete' ? 'completed' : r.status as RecordStatus,
              value: r.value, // Preserve the actual value from database!
              notes: r.notes || undefined,
              createdAt: r.created_at,
              updatedAt: r.updated_at || r.created_at,
            }));

            // Log records with values for debugging
            const recordsWithValues = convertedRecords.filter(r => r.value !== null && r.value !== undefined);
            console.log('✅ User records loaded:', convertedRecords.length, 'total,', recordsWithValues.length, 'with values');
            if (recordsWithValues.length > 0) {
              console.log('📊 Sample records with values:', recordsWithValues.slice(0, 3).map(r => ({
                id: r.id,
                value: r.value,
                valueType: typeof r.value,
                date: r.date
              })));
            }

            dispatch(setRecords(convertedRecords));
            console.log('TTFS(ms)', since('app:start'));
          } catch (recordError) {
            console.error('❌ Error loading records:', recordError);
          }
        }
        
      } catch (error) {
        console.error('💥 Failed to load user data:', error);
      } finally {
        isLoadingRef.current = false;
        lastLoadedUserIdRef.current = currentUserId;
      }
    };

    loadUserData();
  }, [user?.id]);


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
            commitmentType: 'checkbox',
            streak: 3,
            bestStreak: 3,
            isActive: true,
            isPrivate: false,
            createdAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp(),
            order_rank: 'V',
            last_active_rank: null
          },
          {
            id: '2',
            userId: 'current_user',
            title: 'Exercise',
            color: '#111827',
            type: 'binary',
            commitmentType: 'checkbox',
            streak: 7,
            bestStreak: 7,
            isActive: true,
            isPrivate: false,
            createdAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp(),
            order_rank: 'W',
            last_active_rank: null
          },
          {
            id: '3',
            userId: 'current_user',
            title: 'Read 30 mins',
            color: '#8B5CF6',
            type: 'binary',
            commitmentType: 'checkbox',
            streak: 1,
            bestStreak: 5,
            isActive: true,
            isPrivate: false,
            createdAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp(),
            order_rank: 'X',
            last_active_rank: null
          },
          {
            id: '4',
            userId: 'current_user',
            title: 'No Social Media',
            color: '#EF4444',
            type: 'binary',
            commitmentType: 'checkbox',
            streak: 2,
            bestStreak: 10,
            isActive: true,
            isPrivate: false,
            createdAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp(),
            order_rank: 'Y',
            last_active_rank: null
          },
          {
            id: '5',
            userId: 'current_user',
            title: 'Water (8 glasses)',
            color: '#06B6D4',
            type: 'counter',
            commitmentType: 'measurement',
            target: 8,
            unit: 'glasses',
            streak: 5,
            bestStreak: 12,
            isActive: true,
            isPrivate: false,
            createdAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp(),
            order_rank: 'Z',
            last_active_rank: null
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
  }, [user?.id, commitments.length]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [showCommitmentDetailsModal, setShowCommitmentDetailsModal] = useState(false);
  const [showOrderingModalR2, setShowOrderingModalR2] = useState(false);
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

  const handleSetRecordStatus = (commitmentId: string, date: string, status: RecordStatus, value?: any, notes?: string) => {
    if (!user?.id) {
      console.error('❌ Cannot update record: No authenticated user');
      return;
    }


    // STEP 1: Optimistic update - immediately update Redux state for instant UI feedback
    dispatch(setRecordStatus({ commitmentId, date, status, value }));

    // STEP 2: Check if there's any user data worth preserving
    const hasUserData = value !== undefined || notes !== undefined;

    // STEP 3: Add to sync queue for background database sync
    if (status !== 'none' || hasUserData) {
      // CREATE/UPDATE record - preserve when there's a status OR any user data
      const recordData = {
        commitment_id: commitmentId,
        completed_at: `${date}T12:00:00Z`,
        notes: notes || null,
        user_id: user.id,
        status: status === 'completed' ? 'complete' : status,
        value: value === undefined ? null : value,
      };

      dispatch(addToQueue({
        type: 'CREATE',
        entity: 'record',
        entityId: `${commitmentId}_${date}`,
        data: recordData
      }));
    } else {
      // DELETE record - only when status is 'none' AND no user data exists
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
      // Normalize unit for consistent database storage
      const normalizedUnit = commitmentData.unit ? normalizeUnit(commitmentData.unit) : undefined;

      // Assign order rank - place new commitments at the end
      const lastCommitment = commitments[commitments.length - 1];
      const newOrderRank = rankAfter(lastCommitment?.order_rank || null);

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
        unit: normalizedUnit,
        requirements: commitmentData.requirements,
        rating_range: commitmentData.ratingRange,
        // Order ranking
        order_rank: newOrderRank,
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
        unit: normalizedUnit, // Use normalized unit in Redux as well
        id: data?.id || Date.now().toString(),
        userId: user.id,
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
        order_rank: newOrderRank,
        last_active_rank: null,
      };
      
      dispatch(addCommitment(newCommitment));
      
    } catch (error) {
      console.error('💥 Unexpected error saving commitment:', error);
      // Still add to Redux for offline functionality
      const newCommitment: Commitment = {
        ...commitmentData,
        unit: normalizedUnit, // Use normalized unit in fallback case too
        id: Date.now().toString(),
        userId: user.id,
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
        order_rank: newOrderRank,
        last_active_rank: null,
      };
      dispatch(addCommitment(newCommitment));
    }
  };

  const handleCommitmentTitlePress = (commitmentId: string) => {
    setSelectedCommitmentId(commitmentId);
    setShowCommitmentDetailsModal(true);
  };

  const handleToggleShowValues = (commitmentId: string, showValues: boolean) => {
    console.log('🔄 Toggling show values for commitment:', { commitmentId, showValues });

    // Update Redux store
    dispatch(updateCommitment({ id: commitmentId, updates: { showValues } }));

    // Add to sync queue for database persistence
    dispatch(addToQueue({
      type: 'UPDATE',
      entity: 'commitment',
      entityId: commitmentId,
      data: {
        id: commitmentId,
        show_values: showValues,
        idempotencyKey: `${user?.id}:${commitmentId}:showValues:${Date.now()}`
      }
    }));
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
        supabaseUpdates.unit = normalizeUnit(updates.unit);
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
      
      // Update Redux state with normalized unit
      const normalizedUpdates = updates.unit !== undefined
        ? { ...updates, unit: normalizeUnit(updates.unit) }
        : updates;
      dispatch(updateCommitment({ id, updates: normalizedUpdates }));
      
    } catch (error) {
      console.error('💥 Error updating commitment:', error);
      // Still update Redux for offline functionality with normalized unit
      const normalizedUpdates = updates.unit !== undefined
        ? { ...updates, unit: normalizeUnit(updates.unit) }
        : updates;
      dispatch(updateCommitment({ id, updates: normalizedUpdates }));
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
            <Text style={[styles.greeting, fontStyle]}>{getTodayDisplayDate()}</Text>
            <Text style={[styles.date, fontStyle]}>
              {commitments.length} habit{commitments.length !== 1 ? 's' : ''} • {records.filter(r => r.date === getTodayISO() && r.status === 'completed').length} completed
            </Text>
          </View>
          <View style={styles.headerRight}>
            <ThemeToggle />
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={[styles.addButtonText, fontStyle]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.gridContainer}>
          {/* Header row with title and controls */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, fontStyle]}>Your Commitments</Text>
            <View style={styles.headerControls}>
              <TouchableOpacity
                style={styles.reorderButton}
                onPress={() => setShowOrderingModalR2(true)}
                accessibilityLabel="Reorder commitments"
              >
                <View style={styles.reorderButtonInner}>
                  <View style={styles.hamburgerIcon}>
                    <View style={styles.hamburgerLine} />
                    <View style={styles.hamburgerLine} />
                    <View style={styles.hamburgerLine} />
                  </View>
                </View>
              </TouchableOpacity>
              <ViewToggle
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            </View>
          </View>
          
          {commitments.length > 0 ? (
            <CommitmentGrid
              commitments={commitments}
              layoutItems={layoutItems}
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
        onToggleShowValues={handleToggleShowValues}
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


      <CommitmentOrderingModalR2
        visible={showOrderingModalR2}
        onClose={() => setShowOrderingModalR2(false)}
      />


    </SafeAreaView>
  );
}

