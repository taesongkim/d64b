import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  PanResponder,
  Animated,
} from 'react-native';
import { useFontStyle } from '@/hooks/useFontStyle';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectActiveOrdered } from '@/store/selectors/commitmentsOrder';
import { batchReorderCommitments } from '@/store/slices/commitmentsSlice';
import { addToQueue } from '@/store/slices/syncSlice';
import { rankBetween } from '@/utils/rank';
import { useAuth } from '@/contexts/AuthContext';
import type { Commitment } from '@/store/slices/commitmentsSlice';
import { designTokens } from '@/constants/designTokens';
import {
  validateReorderLayout,
  logValidationResult,
  type LayoutItem,
} from '@/utils/reorderValidation';

interface CommitmentOrderingModalR2Props {
  visible: boolean;
  onClose: () => void;
}

interface DragState {
  isDragging: boolean;
  draggedIndex: number | null;
  draggedY: number;
  placeholderIndex: number | null;
}

const ROW_HEIGHT = 64; // Standard row height

export default function CommitmentOrderingModalR2({
  visible,
  onClose
}: CommitmentOrderingModalR2Props): React.JSX.Element {
  const fontStyle = useFontStyle();
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  // Get current commitments from Redux
  const currentCommitments = useAppSelector(selectActiveOrdered);

  // Local state for reordering
  const [localCommitments, setLocalCommitments] = useState<Commitment[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Drag state
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedIndex: null,
    draggedY: 0,
    placeholderIndex: null,
  });

  // Animation values
  const draggedItemY = useRef(new Animated.Value(0)).current;
  const draggedItemScale = useRef(new Animated.Value(1)).current;
  const draggedItemOpacity = useRef(new Animated.Value(1)).current;

  // Touch tracking
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Initialize local state when modal opens
  useEffect(() => {
    if (visible) {
      setLocalCommitments([...currentCommitments]);
      setHasChanges(false);

      // DEV logging
      if (__DEV__) {
        console.log(`📱 R2 Modal opened with ${currentCommitments.length} commitments`);
      }
    }
  }, [visible, currentCommitments]);

  // Reset drag state when modal closes
  useEffect(() => {
    if (!visible) {
      setDragState({
        isDragging: false,
        draggedIndex: null,
        draggedY: 0,
        placeholderIndex: null,
      });

      // Reset animations
      draggedItemY.setValue(0);
      draggedItemScale.setValue(1);
      draggedItemOpacity.setValue(1);
    }
  }, [visible]);

  // Create layout items for validation
  const layoutItems: LayoutItem[] = useMemo(() =>
    localCommitments.map(commitment => ({
      id: commitment.id,
      type: 'commitment' as const,
      title: commitment.title,
    })),
    [localCommitments]
  );

  const startDrag = useCallback((index: number, initialY: number) => {
    setDragState({
      isDragging: true,
      draggedIndex: index,
      draggedY: initialY,
      placeholderIndex: index,
    });

    // Animate lift effect
    Animated.parallel([
      Animated.spring(draggedItemScale, {
        toValue: designTokens.dnd.lift.scale,
        useNativeDriver: true,
        tension: 300,
        friction: 20,
      }),
      Animated.timing(draggedItemOpacity, {
        toValue: designTokens.dnd.lift.opacity,
        duration: designTokens.animation.fast,
        useNativeDriver: true,
      }),
    ]).start();

    if (__DEV__) {
      console.log(`🎯 Started drag for item ${index}: ${localCommitments[index]?.title}`);
    }
  }, [localCommitments]);

  const updateDrag = useCallback((newY: number) => {
    if (!dragState.isDragging || dragState.draggedIndex === null) return;

    // Calculate new placeholder position based on Y coordinate
    const itemHeight = ROW_HEIGHT;
    const newPlaceholderIndex = Math.max(0, Math.min(
      localCommitments.length - 1,
      Math.round(newY / itemHeight)
    ));

    setDragState(prev => ({
      ...prev,
      draggedY: newY,
      placeholderIndex: newPlaceholderIndex,
    }));

    // Update drag position
    draggedItemY.setValue(newY - (dragState.draggedIndex * itemHeight));
  }, [dragState, localCommitments.length]);

  const endDrag = useCallback(() => {
    if (!dragState.isDragging || dragState.draggedIndex === null || dragState.placeholderIndex === null) {
      return;
    }

    const sourceIndex = dragState.draggedIndex;
    const targetIndex = dragState.placeholderIndex;

    // Apply the reorder
    if (sourceIndex !== targetIndex) {
      const newCommitments = [...localCommitments];
      const draggedItem = newCommitments[sourceIndex];

      // Remove from source
      newCommitments.splice(sourceIndex, 1);
      // Insert at target
      newCommitments.splice(targetIndex, 0, draggedItem);

      setLocalCommitments(newCommitments);
      setHasChanges(true);

      if (__DEV__) {
        console.log(`🎯 Dropped item from ${sourceIndex} to ${targetIndex}: ${draggedItem.title}`);
      }
    }

    // Reset drag state
    setDragState({
      isDragging: false,
      draggedIndex: null,
      draggedY: 0,
      placeholderIndex: null,
    });

    // Reset animations
    Animated.parallel([
      Animated.spring(draggedItemScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 20,
      }),
      Animated.timing(draggedItemOpacity, {
        toValue: 1,
        duration: designTokens.animation.fast,
        useNativeDriver: true,
      }),
      Animated.spring(draggedItemY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 300,
        friction: 20,
      }),
    ]).start();
  }, [dragState, localCommitments]);

  const createPanResponder = useCallback((index: number) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        return Math.abs(dx) > designTokens.dnd.gesture.activationDistance ||
               Math.abs(dy) > designTokens.dnd.gesture.activationDistance;
      },

      onPanResponderGrant: (evt) => {
        // Start long press timer
        longPressTimer.current = setTimeout(() => {
          const { pageY } = evt.nativeEvent;
          startDrag(index, pageY);
        }, designTokens.dnd.gesture.longPressMs);
      },

      onPanResponderMove: (evt) => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }

        if (dragState.isDragging) {
          const { pageY } = evt.nativeEvent;
          updateDrag(pageY);
        }
      },

      onPanResponderRelease: () => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }

        if (dragState.isDragging) {
          endDrag();
        }
      },

      onPanResponderTerminate: () => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }

        if (dragState.isDragging) {
          endDrag();
        }
      },
    });
  }, [dragState, startDrag, updateDrag, endDrag]);

  const handleSave = useCallback(async () => {
    if (!hasChanges || isSaving) {
      onClose();
      return;
    }

    if (!user?.id) {
      console.error('❌ Cannot reorder: No authenticated user');
      return;
    }

    setIsSaving(true);

    try {
      // Validate the final layout
      const validationResult = validateReorderLayout(layoutItems);
      logValidationResult(validationResult, 'R2 Save');

      let finalOrder = localCommitments;
      if (!validationResult.isValid && validationResult.repairedOrder) {
        // Auto-repair if needed
        const repairedIds = validationResult.repairedOrder.map(item => item.id);
        finalOrder = localCommitments.filter(c => repairedIds.includes(c.id));

        if (__DEV__) {
          console.log('🔧 Applied auto-repair for validation violations');
        }
      }

      // Generate fresh ranks for ALL commitments in final order
      const allUpdates: Array<{id: string, newRank: string}> = [];
      let nextRank: string | null = null;

      // Process from bottom to top to match grid display order
      for (let i = finalOrder.length - 1; i >= 0; i--) {
        const commitment = finalOrder[i];
        const newRank = rankBetween(null, nextRank);

        allUpdates.push({
          id: commitment.id,
          newRank
        });

        nextRank = newRank;
      }

      // Apply updates atomically
      dispatch(batchReorderCommitments(allUpdates));

      // Add to sync queue
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

      if (__DEV__) {
        console.log(`✅ R2 Save: Applied ${allUpdates.length} rank updates`);
      }

      onClose();
    } catch (error) {
      console.error('❌ R2 Save failed:', error);
      Alert.alert(
        'Save Failed',
        'Failed to save commitment order. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSaving(false);
    }
  }, [hasChanges, isSaving, user?.id, layoutItems, localCommitments, dispatch, onClose]);

  const handleCancel = useCallback(() => {
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
  }, [hasChanges, onClose]);

  const renderCommitmentRow = useCallback((commitment: Commitment, index: number) => {
    const isDraggedItem = dragState.draggedIndex === index;
    const isPlaceholder = dragState.placeholderIndex === index && dragState.isDragging && !isDraggedItem;

    const panResponder = createPanResponder(index);

    // Don't render the dragged item in its original position
    if (isDraggedItem && dragState.isDragging) {
      return (
        <View key={commitment.id} style={styles.hiddenRow}>
          {isPlaceholder && <View style={styles.placeholder} />}
        </View>
      );
    }

    return (
      <View key={commitment.id}>
        {isPlaceholder && <View style={styles.placeholder} />}
        <View
          style={styles.commitmentRow}
          {...panResponder.panHandlers}
        >
          <View style={styles.commitmentInfo}>
            <View style={[styles.colorBadge, { backgroundColor: commitment.color }]} />
            <Text style={[styles.commitmentTitle, fontStyle]} numberOfLines={1}>
              {commitment.title}
            </Text>
            {commitment.isPrivate && (
              <Text style={[styles.privateIndicator, fontStyle]}>🔒</Text>
            )}
          </View>
          <View style={styles.dragHandle}>
            <Text style={styles.dragHandleText}>⋮⋮</Text>
          </View>
        </View>
      </View>
    );
  }, [dragState, createPanResponder, fontStyle]);

  const renderDraggedItem = useCallback(() => {
    if (!dragState.isDragging || dragState.draggedIndex === null) return null;

    const commitment = localCommitments[dragState.draggedIndex];
    if (!commitment) return null;

    return (
      <Animated.View
        style={[
          styles.draggedItem,
          {
            transform: [
              { translateY: draggedItemY },
              { scale: draggedItemScale },
            ],
            opacity: draggedItemOpacity,
            ...designTokens.dnd.lift.shadow,
          },
        ]}
        pointerEvents="none"
      >
        <View style={styles.commitmentInfo}>
          <View style={[styles.colorBadge, { backgroundColor: commitment.color }]} />
          <Text style={[styles.commitmentTitle, fontStyle]} numberOfLines={1}>
            {commitment.title}
          </Text>
          {commitment.isPrivate && (
            <Text style={[styles.privateIndicator, fontStyle]}>🔒</Text>
          )}
        </View>
        <View style={styles.dragHandle}>
          <Text style={styles.dragHandleText}>⋮⋮</Text>
        </View>
      </Animated.View>
    );
  }, [dragState, localCommitments, draggedItemY, draggedItemScale, draggedItemOpacity, fontStyle]);

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

          <Text style={[styles.title, fontStyle]}>Reorder (R2)</Text>

          <TouchableOpacity
            style={[
              styles.saveButton,
              (hasChanges && !dragState.isDragging && !isSaving) && styles.saveButtonActive
            ]}
            onPress={handleSave}
            disabled={dragState.isDragging || isSaving}
          >
            <Text style={[
              styles.saveButtonText,
              fontStyle,
              (hasChanges && !dragState.isDragging && !isSaving) && styles.saveButtonTextActive
            ]}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!dragState.isDragging}
        >
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
                <View key={commitment.id} style={styles.commitmentRowDisabled}>
                  <View style={styles.commitmentInfo}>
                    <View style={[styles.colorBadge, { backgroundColor: commitment.color }]} />
                    <Text style={[styles.commitmentTitle, fontStyle]} numberOfLines={1}>
                      {commitment.title}
                    </Text>
                    {commitment.isPrivate && (
                      <Text style={[styles.privateIndicator, fontStyle]}>🔒</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.commitmentsList}>
              {localCommitments.map((commitment, index) =>
                renderCommitmentRow(commitment, index)
              )}
            </View>
          )}
        </ScrollView>

        {/* Render dragged item overlay */}
        {renderDraggedItem()}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.border,
  },
  title: {
    fontSize: designTokens.typography.sizes.lg,
    color: designTokens.colors.primary,
    flex: 1,
    textAlign: 'center',
  },
  cancelButton: {
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
  },
  cancelButtonText: {
    color: designTokens.colors.secondary,
    fontSize: designTokens.typography.sizes.md,
  },
  saveButton: {
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.radius.md,
  },
  saveButtonActive: {
    backgroundColor: designTokens.colors.primary,
  },
  saveButtonText: {
    color: designTokens.colors.secondary,
    fontSize: designTokens.typography.sizes.md,
  },
  saveButtonTextActive: {
    color: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: designTokens.spacing.lg,
    paddingTop: designTokens.spacing.lg,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: designTokens.spacing.xxl,
  },
  emptyStateText: {
    fontSize: designTokens.typography.sizes.md,
    color: designTokens.colors.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  disabledState: {
    paddingVertical: designTokens.spacing.lg,
  },
  disabledStateText: {
    fontSize: designTokens.typography.sizes.md,
    color: designTokens.colors.secondary,
    textAlign: 'center',
    marginBottom: designTokens.spacing.lg,
    fontStyle: 'italic',
  },
  commitmentsList: {
    paddingBottom: designTokens.spacing.lg,
  },
  commitmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: designTokens.colors.surface,
    borderRadius: designTokens.radius.lg,
    padding: designTokens.spacing.md,
    marginBottom: designTokens.spacing.xs,
    borderWidth: 1,
    borderColor: designTokens.colors.border,
    height: ROW_HEIGHT,
  },
  commitmentRowDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: designTokens.radius.lg,
    padding: designTokens.spacing.md,
    marginBottom: designTokens.spacing.xs,
    borderWidth: 1,
    borderColor: designTokens.colors.border,
    height: ROW_HEIGHT,
  },
  commitmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: designTokens.spacing.sm,
  },
  commitmentTitle: {
    fontSize: designTokens.typography.sizes.md,
    color: designTokens.colors.primary,
    flex: 1,
  },
  privateIndicator: {
    fontSize: 12,
    marginLeft: designTokens.spacing.xs,
  },
  dragHandle: {
    padding: designTokens.spacing.xs,
    marginLeft: designTokens.spacing.sm,
  },
  dragHandleText: {
    fontSize: 16,
    color: designTokens.colors.secondary,
    lineHeight: 16,
  },
  hiddenRow: {
    height: ROW_HEIGHT,
    marginBottom: designTokens.spacing.xs,
  },
  placeholder: {
    height: 4,
    backgroundColor: designTokens.dnd.placeholder.tint.light,
    borderRadius: 2,
    marginBottom: designTokens.spacing.xs,
    opacity: designTokens.dnd.placeholder.opacity,
  },
  draggedItem: {
    position: 'absolute',
    left: designTokens.spacing.lg,
    right: designTokens.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: designTokens.colors.surface,
    borderRadius: designTokens.radius.lg,
    padding: designTokens.spacing.md,
    borderWidth: 1,
    borderColor: designTokens.colors.border,
    height: ROW_HEIGHT,
    zIndex: 1000,
  },
});