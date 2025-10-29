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
  initialItemY: number; // Add initial item position
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
    initialItemY: 0,
  });

  // Animation values
  const draggedItemY = useRef(new Animated.Value(0)).current;
  const draggedItemScale = useRef(new Animated.Value(1)).current;
  const draggedItemOpacity = useRef(new Animated.Value(1)).current;

  // Touch tracking
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const isDraggingRef = useRef(false); // Synchronous drag state for PanResponder
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Auto-reset if no movement
  const localCommitmentsRef = useRef<Commitment[]>([]); // Current commitments for PanResponder
  const draggedIndexRef = useRef<number | null>(null); // Current dragged index for PanResponder
  const placeholderIndexRef = useRef<number | null>(null); // Current placeholder index for PanResponder
  const initialItemYRef = useRef<number>(0); // Initial item Y position for PanResponder

  // Track touch coordinates for drag calculation
  const touchStartY = useRef<number>(0);
  const scrollViewLayoutY = useRef<number>(0);

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

  // Keep ref in sync with local commitments for PanResponder access
  useEffect(() => {
    localCommitmentsRef.current = localCommitments;
    if (__DEV__) {
      console.log(`🔄 Updated localCommitmentsRef with ${localCommitments.length} commitments`);
    }
  }, [localCommitments]);


  // Reset drag state when modal closes
  useEffect(() => {
    if (!visible) {
      isDraggingRef.current = false;
      setDragState({
        isDragging: false,
        draggedIndex: null,
        draggedY: 0,
        placeholderIndex: null,
        initialItemY: 0,
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

  const startDrag = useCallback((index: number, initialRelativeY: number) => {
    if (__DEV__) {
      console.log('🎯 [R2-DEBUG] startDrag called:', {
        index,
        initialRelativeY,
        commitment: localCommitments[index]?.title,
        currentDragState: dragState
      });
    }

    // Calculate the item's position within the ScrollView content
    const contentPaddingTop = designTokens.spacing.lg; // ScrollView content padding top
    const itemHeight = ROW_HEIGHT + designTokens.spacing.xs; // Row height + margin bottom
    const initialItemY = contentPaddingTop + (index * itemHeight);

    // Update refs synchronously for PanResponder FIRST
    isDraggingRef.current = true;
    draggedIndexRef.current = index;
    placeholderIndexRef.current = index;
    initialItemYRef.current = initialItemY;

    if (__DEV__) {
      console.log('🎯 [R2-DEBUG] Set refs: isDragging=true, draggedIndex=', index, 'placeholderIndex=', index, 'initialItemY=', initialItemY);
    }

    setDragState(prev => {
      if (__DEV__) {
        console.log('🎯 [R2-DEBUG] Setting drag state:', {
          prev,
          new: { isDragging: true, draggedIndex: index, draggedY: initialRelativeY, placeholderIndex: index, initialItemY }
        });
      }
      return {
        isDragging: true,
        draggedIndex: index,
        draggedY: initialRelativeY,
        placeholderIndex: index,
        initialItemY,
      };
    });

    if (__DEV__) {
      console.log('🎯 [R2-DEBUG] Starting lift animations with values:', {
        targetScale: designTokens.dnd.lift.scale,
        targetOpacity: designTokens.dnd.lift.opacity,
        duration: designTokens.animation.fast
      });
    }

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
    ]).start((finished) => {
      if (__DEV__) {
        console.log('🎯 [R2-DEBUG] Lift animations completed:', { finished });
      }
    });

    if (__DEV__) {
      console.log(`🎯 [R2-DEBUG] Drag setup complete for item ${index}: ${localCommitmentsRef.current[index]?.title}`);
    }
  }, [localCommitments, dragState, endDrag]);

  const updateDrag = useCallback((currentRelativeY: number) => {
    if (!isDraggingRef.current || draggedIndexRef.current === null) {
      if (__DEV__) {
        console.log('🎯 [R2-DEBUG] updateDrag early return:', {
          isDraggingRef: isDraggingRef.current,
          draggedIndexRef: draggedIndexRef.current
        });
      }
      return;
    }

    // Clear the auto-reset timeout since we have actual movement
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }


    // Calculate offset from initial touch position (both now relative to ScrollView)
    const deltaY = currentRelativeY - touchStartY.current;

    // Calculate where the dragged item should be positioned
    const newItemY = initialItemYRef.current + deltaY;

    // Calculate which index this corresponds to
    const itemHeight = ROW_HEIGHT + designTokens.spacing.xs; // Row height + margin bottom
    const contentPaddingTop = designTokens.spacing.lg; // Same as in startDrag

    // Calculate index based on position within the scrollable content
    const positionInList = Math.max(0, newItemY - contentPaddingTop);
    const newPlaceholderIndex = Math.max(0, Math.min(
      localCommitmentsRef.current.length - 1,
      Math.round(positionInList / itemHeight)
    ));

    // Update placeholder ref for immediate access
    placeholderIndexRef.current = newPlaceholderIndex;

    setDragState(prev => ({
      ...prev,
      draggedY: currentRelativeY,
      placeholderIndex: newPlaceholderIndex,
    }));

    // Update animated position (relative to original position)
    draggedItemY.setValue(deltaY);

  }, [dragState, localCommitments.length]);

  const endDrag = useCallback(() => {
    if (__DEV__) {
      console.log('🎯 [R2-DEBUG] endDrag called:', dragState);
    }

    // Clear the auto-reset timeout
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }

    if (!isDraggingRef.current || draggedIndexRef.current === null) {
      if (__DEV__) {
        console.log('🎯 [R2-DEBUG] endDrag early return - not dragging or missing indices');
      }
      return;
    }

    const sourceIndex = draggedIndexRef.current;
    const targetIndex = placeholderIndexRef.current;

    // Validate indices using ref for current commitments
    const currentCommitments = localCommitmentsRef.current;
    if (sourceIndex === null || targetIndex === null ||
        sourceIndex < 0 || sourceIndex >= currentCommitments.length ||
        targetIndex < 0 || targetIndex >= currentCommitments.length) {
      if (__DEV__) {
        console.log('🎯 [R2-DEBUG] Invalid indices - skipping reorder:', { sourceIndex, targetIndex, length: currentCommitments.length });
      }
      return;
    }

    // Apply the reorder
    if (sourceIndex !== targetIndex) {
      const newCommitments = [...currentCommitments];
      const draggedItem = newCommitments[sourceIndex];

      if (!draggedItem) {
        if (__DEV__) {
          console.log('🎯 [R2-DEBUG] No item found at sourceIndex:', sourceIndex);
        }
        return;
      }

      // Remove from source
      newCommitments.splice(sourceIndex, 1);
      // Insert at target
      newCommitments.splice(targetIndex, 0, draggedItem);

      setLocalCommitments(newCommitments);
      setHasChanges(true);

      if (__DEV__) {
        console.log(`🎯 [R2-DEBUG] Dropped item from ${sourceIndex} to ${targetIndex}: ${draggedItem.title}`);
      }
    } else {
      if (__DEV__) {
        console.log('🎯 [R2-DEBUG] No reorder needed - same position');
      }
    }

    // Update refs synchronously for PanResponder
    isDraggingRef.current = false;
    draggedIndexRef.current = null;
    placeholderIndexRef.current = null;
    initialItemYRef.current = 0;

    // Reset drag state
    setDragState({
      isDragging: false,
      draggedIndex: null,
      draggedY: 0,
      placeholderIndex: null,
      initialItemY: 0,
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
    ]).start((finished) => {
      if (__DEV__) {
        console.log('🎯 [R2-DEBUG] Reset animations completed:', { finished });
      }
    });
  }, [dragState, localCommitments, draggedItemScale, draggedItemOpacity, draggedItemY]);


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

  // Create a single PanResponder for all rows to avoid recreation
  const globalPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => {
        const shouldMove = isDraggingRef.current;
        if (__DEV__) {
          console.log('🎯 [R2-DEBUG] onMoveShouldSetPanResponder called, isDragging:', shouldMove);
        }
        return shouldMove;
      },

      onPanResponderGrant: (evt) => {
        // Store the initial page coordinates
        const initialPageY = evt.nativeEvent.pageY;

        if (__DEV__) {
          console.log('🎯 [R2-DEBUG] Global PanResponder grant:', {
            pageY: initialPageY
          });
        }

        // Disable ScrollView scrolling immediately
        if (scrollViewRef.current) {
          scrollViewRef.current.setNativeProps({ scrollEnabled: false });
          if (__DEV__) {
            console.log('🎯 [R2-DEBUG] Disabled scroll for potential drag');
          }
        } else {
          if (__DEV__) {
            console.log('🎯 [R2-DEBUG] WARNING: scrollViewRef.current is null!');
          }
        }

        if (__DEV__) {
          console.log('🎯 [R2-DEBUG] About to calculate coordinates...');
        }

        // Use estimated ScrollView position (header height + SafeAreaView)
        // This is more reliable than async measure
        const estimatedScrollViewTop = 100; // Rough estimate based on header
        scrollViewLayoutY.current = estimatedScrollViewTop;
        touchStartY.current = initialPageY - estimatedScrollViewTop;

        if (__DEV__) {
          console.log('🎯 [R2-DEBUG] Using estimated coordinates:', {
            estimatedScrollViewTop,
            relativeY: touchStartY.current
          });
        }

        if (__DEV__) {
          console.log('🎯 [R2-DEBUG] About to calculate touched index...');
        }

        // Determine which item was touched
        const contentPaddingTop = designTokens.spacing.lg;
        const itemHeight = ROW_HEIGHT + designTokens.spacing.xs; // Row height + margin bottom
        const touchedIndex = Math.round((touchStartY.current - contentPaddingTop) / itemHeight);

        if (__DEV__) {
          console.log('🎯 [R2-DEBUG] Calculated touched index:', {
            touchedIndex,
            contentPaddingTop,
            itemHeight,
            totalCommitments: localCommitmentsRef.current.length
          });
        }

        if (touchedIndex >= 0 && touchedIndex < localCommitmentsRef.current.length) {
          if (__DEV__) {
            console.log('🎯 [R2-DEBUG] Valid touch detected on index:', touchedIndex);
          }

          // Start long-press timer
          longPressTimer.current = setTimeout(() => {
            if (__DEV__) {
              console.log('🎯 [R2-DEBUG] Global long press timer fired for index:', touchedIndex);
            }
            startDrag(touchedIndex, touchStartY.current);
          }, designTokens.dnd.gesture.longPressMs);
        } else {
          if (__DEV__) {
            console.log('🎯 [R2-DEBUG] Touch outside valid item area, ignoring');
          }
        }
      },

      onPanResponderMove: (evt) => {
        if (isDraggingRef.current) {
          const currentRelativeY = evt.nativeEvent.pageY - scrollViewLayoutY.current;
          updateDrag(currentRelativeY);
        }
      },

      onPanResponderRelease: () => {
        // Re-enable ScrollView scrolling
        if (scrollViewRef.current) {
          scrollViewRef.current.setNativeProps({ scrollEnabled: true });
          if (__DEV__) {
            console.log('🎯 [R2-DEBUG] Re-enabled scroll on release');
          }
        }

        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }

        if (isDraggingRef.current) {
          if (__DEV__) {
            console.log('🎯 [R2-DEBUG] Global PanResponder release - calling endDrag');
          }
          endDrag();
        }
      },

      onPanResponderTerminate: () => {
        // Re-enable ScrollView scrolling
        if (scrollViewRef.current) {
          scrollViewRef.current.setNativeProps({ scrollEnabled: true });
        }

        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }

        if (isDraggingRef.current) {
          if (__DEV__) {
            console.log('🎯 [R2-DEBUG] Global PanResponder terminate - calling endDrag');
          }
          endDrag();
        }
      },
    })
  ).current;

  const renderCommitmentRow = useCallback((commitment: Commitment, index: number) => {
    const isDraggedItem = dragState.draggedIndex === index;

    // Method 2: Don't render the dragged item at all during drag
    if (isDraggedItem && dragState.isDragging) {
      return null;
    }

    // Calculate the effective index (position in the list without the dragged item)
    const effectiveIndex = dragState.isDragging && dragState.draggedIndex !== null && index > dragState.draggedIndex
      ? index - 1  // Items below the dragged item shift up by 1
      : index;     // Items above stay the same

    const isPlaceholder = dragState.placeholderIndex === effectiveIndex && dragState.isDragging;

    // Check if this is the last item and placeholder should go after it
    const isLastItem = index === localCommitments.length - 1;
    const shouldShowPlaceholderAfter = dragState.isDragging &&
      dragState.placeholderIndex === (dragState.draggedIndex !== null && dragState.draggedIndex < localCommitments.length
        ? localCommitments.length - 1  // Dragged item removed, so max index is length - 1
        : localCommitments.length) &&
      isLastItem;

    return (
      <View key={commitment.id}>
        {isPlaceholder && <View style={styles.placeholder} />}
        <View style={styles.commitmentRow}>
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
        {shouldShowPlaceholderAfter && <View style={styles.placeholder} />}
      </View>
    );
  }, [dragState, fontStyle, startDrag]);

  const renderDraggedItem = useCallback(() => {
    if (__DEV__) {
      console.log('🎯 [R2-DEBUG] renderDraggedItem called:', {
        isDragging: dragState.isDragging,
        draggedIndex: dragState.draggedIndex,
        commitment: dragState.draggedIndex !== null ? localCommitments[dragState.draggedIndex]?.title : 'none'
      });
    }

    if (!dragState.isDragging || dragState.draggedIndex === null) {
      if (__DEV__) {
        console.log('🎯 [R2-DEBUG] Not rendering dragged item - not dragging or no index');
      }
      return null;
    }

    const commitment = localCommitments[dragState.draggedIndex];
    if (!commitment) {
      if (__DEV__) {
        console.log('🎯 [R2-DEBUG] Not rendering dragged item - no commitment found');
      }
      return null;
    }

    if (__DEV__) {
      console.log('🎯 [R2-DEBUG] Rendering dragged item overlay:', {
        title: commitment.title,
        shadow: designTokens.dnd.lift.shadow
      });
    }

    return (
      <Animated.View
        style={[
          styles.draggedItem,
          {
            top: scrollViewLayoutY.current + dragState.initialItemY, // Position relative to modal container
            transform: [
              { translateY: draggedItemY },
              { scale: draggedItemScale },
            ],
            opacity: draggedItemOpacity,
            ...designTokens.dnd.lift.shadow,
            // DEBUG: Make it super obvious
            backgroundColor: __DEV__ ? 'rgba(255, 0, 0, 0.1)' : designTokens.colors.surface,
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
      presentationStyle="fullScreen"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={styles.container} {...globalPanResponder.panHandlers}>
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