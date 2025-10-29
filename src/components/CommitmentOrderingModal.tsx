import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useFontStyle } from '@/hooks/useFontStyle';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectActiveOrdered } from '@/store/selectors/commitmentsOrder';
import { batchReorderCommitments } from '@/store/slices/commitmentsSlice';
import { addToQueue } from '@/store/slices/syncSlice';
import { rankBetween } from '@/utils/rank';
import { useAuth } from '@/contexts/AuthContext';
import type { Commitment } from '@/store/slices/commitmentsSlice';

interface CommitmentOrderingModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CommitmentOrderingModal({
  visible,
  onClose
}: CommitmentOrderingModalProps): React.JSX.Element {
  const fontStyle = useFontStyle();
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  // Get current commitments from Redux (including private ones)
  const currentCommitments = useAppSelector(selectActiveOrdered);

  // Local state for reordering (working copy)
  const [localCommitments, setLocalCommitments] = useState<Commitment[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local state when modal opens
  useEffect(() => {
    if (visible) {
      setLocalCommitments([...currentCommitments]);
      setHasChanges(false);
    }
  }, [visible, currentCommitments]);

  // Handle move commitment to new index
  const handleMoveCommitment = (fromIndex: number, direction: 'up' | 'down' | 'top' | 'bottom') => {
    const newCommitments = [...localCommitments];
    const commitment = newCommitments[fromIndex];

    let toIndex: number;

    switch (direction) {
      case 'up':
        toIndex = Math.max(0, fromIndex - 1);
        break;
      case 'down':
        toIndex = Math.min(newCommitments.length - 1, fromIndex + 1);
        break;
      case 'top':
        toIndex = 0;
        break;
      case 'bottom':
        toIndex = newCommitments.length - 1;
        break;
    }

    if (fromIndex === toIndex) return; // No change needed

    // Remove from old position and insert at new position
    newCommitments.splice(fromIndex, 1);
    newCommitments.splice(toIndex, 0, commitment);

    setLocalCommitments(newCommitments);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!hasChanges) {
      onClose();
      return;
    }

    if (!user?.id) {
      console.error('❌ Cannot reorder: No authenticated user');
      return;
    }

    // SOLUTION: Always repair ranks to match user's intended order
    // This handles duplicates, invalid ordering, and ensures consistency

    console.log('🔧 Generating fresh ranks for user\'s intended order...');

    // Generate fresh ranks for ALL commitments in REVERSE order
    // Bottom modal item (highest index) gets smallest rank (appears first in grid)
    const allUpdates: Array<{id: string, newRank: string}> = [];
    let nextRank: string | null = null;

    // Process from bottom to top (reverse order)
    for (let i = localCommitments.length - 1; i >= 0; i--) {
      const commitment = localCommitments[i];
      const newRank = rankBetween(null, nextRank);

      allUpdates.push({
        id: commitment.id,
        newRank
      });

      nextRank = newRank;
      console.log(`🔧 Assigning rank '${newRank}' to ${commitment.title} at modal position ${i} (will appear at grid position ${localCommitments.length - 1 - i})`);
    }

    // Apply all fresh ranks atomically
    console.log(`🔧 Applying ${allUpdates.length} fresh rank assignments`);
    dispatch(batchReorderCommitments(allUpdates));

    // Add all sync queue operations
    allUpdates.forEach(({ id, newRank }) => {
      dispatch(addToQueue({
        type: 'UPDATE',
        entity: 'commitment',
        entityId: id,
        data: {
          id,
          order_rank: newRank,
          idempotencyKey: `move:${id}:${newRank}`
        }
      }));
    });

    console.log(`✅ Applied ${allUpdates.length} rank updates to match user's intended order`);
    onClose();
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to cancel?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onClose }
        ]
      );
    } else {
      onClose();
    }
  };

  // Edge case: no commitments or only one
  const canReorder = localCommitments.length > 1;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
          >
            <Text style={[styles.cancelButtonText, fontStyle]}>Cancel</Text>
          </TouchableOpacity>

          <Text style={[styles.title, fontStyle]}>Commitment Ordering</Text>

          <TouchableOpacity
            style={[styles.saveButton, hasChanges && styles.saveButtonActive]}
            onPress={handleSave}
          >
            <Text style={[styles.saveButtonText, fontStyle, hasChanges && styles.saveButtonTextActive]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {localCommitments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, fontStyle]}>No commitments to reorder</Text>
            </View>
          ) : !canReorder ? (
            <View style={styles.disabledState}>
              <Text style={[styles.disabledStateText, fontStyle]}>
                You need at least 2 commitments to reorder
              </Text>
              {localCommitments.map((commitment) => (
                <View key={commitment.id} style={styles.commitmentItemDisabled}>
                  <View style={[styles.commitmentColorBadge, { backgroundColor: commitment.color }]} />
                  <Text style={[styles.commitmentTitle, fontStyle]} numberOfLines={1}>
                    {commitment.title}
                  </Text>
                  {commitment.isPrivate && (
                    <Text style={[styles.privateIndicator, fontStyle]}>🔒</Text>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.commitmentsList}>
              {localCommitments.map((commitment, index) => (
                <View key={commitment.id} style={styles.commitmentItem}>
                  <View style={styles.commitmentInfo}>
                    <View style={[styles.commitmentColorBadge, { backgroundColor: commitment.color }]} />
                    <Text style={[styles.commitmentTitle, fontStyle]} numberOfLines={1}>
                      {commitment.title}
                    </Text>
                    {commitment.isPrivate && (
                      <Text style={[styles.privateIndicator, fontStyle]}>🔒</Text>
                    )}
                  </View>

                  <View style={styles.controls}>
                    <TouchableOpacity
                      style={[styles.controlButton, index === 0 && styles.controlButtonDisabled]}
                      onPress={() => handleMoveCommitment(index, 'top')}
                      disabled={index === 0}
                    >
                      <Text style={[styles.controlButtonText, fontStyle]}>⤴</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.controlButton, index === 0 && styles.controlButtonDisabled]}
                      onPress={() => handleMoveCommitment(index, 'up')}
                      disabled={index === 0}
                    >
                      <Text style={[styles.controlButtonText, fontStyle]}>▲</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.controlButton, index === localCommitments.length - 1 && styles.controlButtonDisabled]}
                      onPress={() => handleMoveCommitment(index, 'down')}
                      disabled={index === localCommitments.length - 1}
                    >
                      <Text style={[styles.controlButtonText, fontStyle]}>▼</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.controlButton, index === localCommitments.length - 1 && styles.controlButtonDisabled]}
                      onPress={() => handleMoveCommitment(index, 'bottom')}
                      disabled={index === localCommitments.length - 1}
                    >
                      <Text style={[styles.controlButtonText, fontStyle]}>⤵</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonActive: {
    backgroundColor: '#111827',
  },
  saveButtonText: {
    color: '#6B7280',
    fontSize: 16,
  },
  saveButtonTextActive: {
    color: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  disabledState: {
    paddingVertical: 20,
  },
  disabledStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  commitmentsList: {
    paddingBottom: 20,
  },
  commitmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  commitmentItemDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  commitmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  commitmentColorBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  commitmentTitle: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  privateIndicator: {
    fontSize: 12,
    marginLeft: 8,
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  controlButtonDisabled: {
    backgroundColor: '#F9FAFB',
    borderColor: '#F3F4F6',
  },
  controlButtonText: {
    fontSize: 16,
    color: '#374151',
  },
});