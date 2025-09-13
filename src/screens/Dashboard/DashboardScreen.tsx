import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import CommitmentGrid from '@/components/CommitmentGrid';
import AddCommitmentModal from '@/components/AddCommitmentModal';
import NetworkStatusBanner from '@/components/NetworkStatusBanner';
import CompletionAnimation from '@/components/CompletionAnimation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addCommitment, type Commitment } from '@/store/slices/commitmentsSlice';
import { toggleRecord, setRecordStatus, type DayRecord, type RecordStatus } from '@/store/slices/recordsSlice';
import { loadInitialDataFromDatabase } from '@/store/middleware/databaseMiddleware';
import { HapticService } from '@/services/hapticService';
import { useFontStyle } from '@/hooks/useFontStyle';
import { getTodayISO, getTodayDisplayDate, getCurrentTimestamp } from '@/utils/timeUtils';

export default function DashboardScreen(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const commitments = useAppSelector(state => state.commitments.commitments);
  const records = useAppSelector(state => state.records.records);
  
  const fontStyle = useFontStyle();
  
  // Load data from database on mount
  useEffect(() => {
    loadInitialDataFromDatabase(dispatch);
  }, [dispatch]);


  // Initialize with sample data if empty (only after database load)
  useEffect(() => {
    // Add a small delay to ensure database has been checked first
    const timer = setTimeout(() => {
      if (commitments.length === 0) {
        const sampleCommitments: Commitment[] = [
          { 
            id: '1', 
            userId: 'current_user',
            title: 'Morning Meditation', 
            color: '#3B82F6', 
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
            color: '#3B82F6', 
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
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [commitments.length, dispatch]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showCompletionAnimation, setShowCompletionAnimation] = useState(false);
  
  const handleCellPress = (commitmentId: string, date: string) => {
    // Check if record currently exists to determine which haptic feedback to use
    const existingRecord = records.find(
      r => r.commitmentId === commitmentId && r.date === date
    );
    
    if (existingRecord) {
      HapticService.light(); // Light feedback for unchecking
    } else {
      HapticService.success(); // Success feedback for completing
      // Show completion animation for new completions
      setShowCompletionAnimation(true);
    }
    
    dispatch(toggleRecord({ commitmentId, date }));
  };

  const handleSetRecordStatus = (commitmentId: string, date: string, status: RecordStatus) => {
    // Provide haptic feedback based on status
    if (status === 'completed') {
      HapticService.success();
      setShowCompletionAnimation(true);
    } else if (status === 'failed') {
      HapticService.error();
    } else if (status === 'skipped') {
      HapticService.light();
    } else {
      HapticService.light(); // For 'none' status (removing record)
    }
    
    dispatch(setRecordStatus({ commitmentId, date, status }));
  };

  const handleAddCommitment = (commitmentData: Omit<Commitment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    HapticService.success(); // Success feedback for adding commitment
    const newCommitment: Commitment = {
      ...commitmentData,
      id: Date.now().toString(),
      userId: 'current_user',
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    };
    dispatch(addCommitment(newCommitment));
  };

  return (
    <SafeAreaView style={styles.container}>
      <NetworkStatusBanner />
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
        <Text style={[styles.sectionTitle, fontStyle]}>Your Commitments</Text>
        {commitments.length > 0 ? (
          <CommitmentGrid
            commitments={commitments}
            records={records}
            onCellPress={handleCellPress}
            onSetRecordStatus={handleSetRecordStatus}
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

      <AddCommitmentModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddCommitment}
      />
      
      <CompletionAnimation
        visible={showCompletionAnimation}
        onComplete={() => setShowCompletionAnimation(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
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
    fontFamily: 'Manrope_700Bold',
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
    fontFamily: 'Manrope_400Regular',
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
    fontFamily: 'Manrope_700Bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  gridContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Manrope_600SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
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
    fontFamily: 'Manrope_600SemiBold',
  },
});