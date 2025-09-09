import React, { useState } from 'react';
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

interface Commitment {
  id: string;
  title: string;
  color: string;
  type: 'binary' | 'counter' | 'timer';
  streak: number;
}

interface DayRecord {
  date: string;
  commitmentId: string;
  completed: boolean;
  value?: number;
}

export default function DashboardScreen(): React.JSX.Element {
  // Mock data - will be replaced with Redux state
  const [commitments, setCommitments] = useState<Commitment[]>([
    { id: '1', title: 'Morning Meditation', color: '#3B82F6', type: 'binary', streak: 3 },
    { id: '2', title: 'Exercise', color: '#3B82F6', type: 'binary', streak: 7 },
    { id: '3', title: 'Read 30 mins', color: '#8B5CF6', type: 'binary', streak: 1 },
    { id: '4', title: 'No Social Media', color: '#EF4444', type: 'binary', streak: 2 },
    { id: '5', title: 'Water (8 glasses)', color: '#06B6D4', type: 'counter', streak: 5 },
  ]);
  
  const [records, setRecords] = useState<DayRecord[]>([
    // Some sample completed records
    { date: new Date().toISOString().split('T')[0], commitmentId: '1', completed: true },
    { date: new Date().toISOString().split('T')[0], commitmentId: '2', completed: true },
    { date: new Date(Date.now() - 86400000).toISOString().split('T')[0], commitmentId: '1', completed: true },
    { date: new Date(Date.now() - 86400000).toISOString().split('T')[0], commitmentId: '2', completed: true },
    { date: new Date(Date.now() - 86400000).toISOString().split('T')[0], commitmentId: '5', completed: true },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newCommitmentTitle, setNewCommitmentTitle] = useState('');
  
  const handleCellPress = (commitmentId: string, date: string) => {
    const existingRecord = records.find(
      r => r.commitmentId === commitmentId && r.date === date
    );
    
    if (existingRecord) {
      // Remove the record (uncheck)
      setRecords(records.filter(
        r => !(r.commitmentId === commitmentId && r.date === date)
      ));
    } else {
      // Add a new record (check)
      setRecords([...records, {
        date,
        commitmentId,
        completed: true,
      }]);
    }
  };

  const handleAddCommitment = () => {
    if (newCommitmentTitle.trim()) {
      const colors = ['#3B82F6', '#6366F1', '#8B5CF6', '#EF4444', '#F59E0B', '#06B6D4'];
      const newCommitment: Commitment = {
        id: Date.now().toString(),
        title: newCommitmentTitle,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: 'binary',
        streak: 0,
      };
      setCommitments([...commitments, newCommitment]);
      setNewCommitmentTitle('');
      setShowAddModal(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning!</Text>
          <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })}</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{commitments.length}</Text>
          <Text style={styles.statLabel}>Active Habits</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {records.filter(r => r.date === new Date().toISOString().split('T')[0]).length}
          </Text>
          <Text style={styles.statLabel}>Completed Today</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {Math.max(...commitments.map(c => c.streak), 0)}
          </Text>
          <Text style={styles.statLabel}>Best Streak</Text>
        </View>
      </View>
      
      <View style={styles.gridContainer}>
        <Text style={styles.sectionTitle}>Your Commitments</Text>
        {commitments.length > 0 ? (
          <CommitmentGrid
            commitments={commitments}
            records={records}
            onCellPress={handleCellPress}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No habits yet</Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.emptyStateButtonText}>Add your first habit</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Add Commitment Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Commitment</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter habit name"
              placeholderTextColor="#9CA3AF"
              value={newCommitmentTitle}
              onChangeText={setNewCommitmentTitle}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowAddModal(false);
                  setNewCommitmentTitle('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalAddButton}
                onPress={handleAddCommitment}
              >
                <Text style={styles.modalAddText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontWeight: 'bold',
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
    fontWeight: '400',
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
    fontWeight: 'bold',
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
    fontWeight: '600',
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
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  modalAddButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  modalAddText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});