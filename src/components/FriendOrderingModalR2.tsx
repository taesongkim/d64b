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
import { selectFriendsOrdered } from '@/store/selectors/friendsOrder';
import { batchReorderRosterFriends } from '@/store/slices/socialSlice';
import { rankBetween } from '@/utils/rank';
import { useAuth } from '@/contexts/AuthContext';
import { designTokens } from '@/constants/designTokens';
import Icon from './icons/Icon';
import AnimalAvatar from './AnimalAvatar';
import type { OrderedFriend } from '@/store/selectors/friendsOrder';
import { AnimalType, ColorType } from '@/utils/avatarUtils';

interface FriendOrderingModalR2Props {
  visible: boolean;
  onClose: () => void;
  friendsCharts?: any[]; // Optional to maintain backward compatibility
}

interface DragState {
  isDragging: boolean;
  draggedIndex: number | null;
  draggedY: number;
  placeholderIndex: number | null;
  initialItemY: number;
}

const ROW_HEIGHT = 56; // Slightly taller for avatar + name

export default function FriendOrderingModalR2({
  visible,
  onClose
}: FriendOrderingModalR2Props): React.JSX.Element {
  const fontStyle = useFontStyle();
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  // Always use Redux roster as source of truth for optimistic updates
  const currentFriends = useAppSelector(selectFriendsOrdered);
  const syncState = useAppSelector((state) => state.sync);

  // Local state for reordering
  const [localFriends, setLocalFriends] = useState<OrderedFriend[]>([]);
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

  // Touch tracking refs
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const isDraggingRef = useRef(false);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const localFriendsRef = useRef<OrderedFriend[]>([]);
  const draggedIndexRef = useRef<number | null>(null);
  const placeholderIndexRef = useRef<number | null>(null);
  const initialItemYRef = useRef<number>(0);

  const touchStartY = useRef<number>(0);
  const scrollViewLayoutY = useRef<number>(0);
  const scrollViewLayoutReady = useRef<boolean>(false);
  const modalInitialized = useRef<boolean>(false);

  // Initialize local state when modal opens (but not during save or when Redux state changes)
  useEffect(() => {
    if (visible && !isSaving && !modalInitialized.current) {
      console.log('🔄 [Modal Open] Setting initial friends order:', currentFriends.map(f => ({ id: f.id, name: f.name, order_rank: f.order_rank })));
      setLocalFriends([...currentFriends]);
      setHasChanges(false);
      modalInitialized.current = true;
      // Reset drag state
      setDragState({
        isDragging: false,
        draggedIndex: null,
        draggedY: 0,
        placeholderIndex: null,
        initialItemY: 0,
      });
    } else if (!visible) {
      // Reset initialized flag when modal closes
      modalInitialized.current = false;
    }
  }, [visible, isSaving]);

  // Sync refs with local state
  useEffect(() => {
    localFriendsRef.current = localFriends;
  }, [localFriends]);


  const updateDragPosition = useCallback((gestureY: number) => {
    if (!isDraggingRef.current || draggedIndexRef.current === null) return;

    const scrollViewY = scrollViewLayoutY.current;
    const currentRelativeY = gestureY - scrollViewY;
    const deltaY = currentRelativeY - initialItemYRef.current;

    // Calculate placeholder index based on drag position
    const itemHeight = ROW_HEIGHT;
    const positionInList = Math.max(0, currentRelativeY);
    const candidatePlaceholderIndex = Math.min(
      localFriendsRef.current.length - 1,
      Math.max(0, Math.floor(positionInList / itemHeight))
    );

    placeholderIndexRef.current = candidatePlaceholderIndex;

    setDragState(prev => ({
      ...prev,
      draggedY: currentRelativeY,
      placeholderIndex: candidatePlaceholderIndex,
    }));

    // Update animated position
    draggedItemY.setValue(deltaY);

  }, [draggedItemY]);

  const endDrag = useCallback(() => {
    // Clear the auto-reset timeout
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }

    if (!isDraggingRef.current || draggedIndexRef.current === null) {
      return;
    }

    const sourceIndex = draggedIndexRef.current;
    const targetIndex = placeholderIndexRef.current;

    // Validate indices
    const currentFriends = localFriendsRef.current;
    if (sourceIndex === null || targetIndex === null ||
        sourceIndex < 0 || sourceIndex >= currentFriends.length ||
        targetIndex < 0 || targetIndex >= currentFriends.length) {
      return;
    }

    // Apply the reorder
    if (sourceIndex !== targetIndex) {
      const newFriends = [...currentFriends];
      const draggedFriend = newFriends[sourceIndex];

      if (!draggedFriend) {
        return;
      }

      console.log('🔄 [Modal Drag] Reordering friend:', {
        draggedFriend: draggedFriend.name,
        fromIndex: sourceIndex,
        toIndex: targetIndex,
        beforeReorder: currentFriends.map(f => f.name),
      });

      // Remove from source
      newFriends.splice(sourceIndex, 1);
      // Insert at target
      newFriends.splice(targetIndex, 0, draggedFriend);

      console.log('🔄 [Modal Drag] New order after drag:', newFriends.map(f => f.name));

      setLocalFriends(newFriends);
      setHasChanges(true);
    }

    // Update refs synchronously
    isDraggingRef.current = false;
    draggedIndexRef.current = null;
    placeholderIndexRef.current = null;
    initialItemYRef.current = 0;

    // Re-enable ScrollView scrolling
    if (scrollViewRef.current) {
      scrollViewRef.current.setNativeProps({ scrollEnabled: true });
    }

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
      Animated.timing(draggedItemY, {
        toValue: 0,
        duration: designTokens.animation.normal,
        useNativeDriver: false,
      }),
      Animated.timing(draggedItemScale, {
        toValue: 1,
        duration: designTokens.animation.normal,
        useNativeDriver: false,
      }),
      Animated.timing(draggedItemOpacity, {
        toValue: 1,
        duration: designTokens.animation.normal,
        useNativeDriver: false,
      }),
    ]).start();

  }, [draggedItemY, draggedItemScale, draggedItemOpacity]);

  // Start drag operation
  const startDrag = useCallback((index: number, initialRelativeY: number) => {
    const friend = localFriendsRef.current[index];
    if (!friend) return;

    console.log('🐾 Starting friend drag:', friend.name, 'at index:', index);

    // Calculate initial position
    const initialItemY = index * ROW_HEIGHT;

    // Disable ScrollView scrolling during drag to prevent accidental scrolling
    if (scrollViewRef.current) {
      scrollViewRef.current.setNativeProps({ scrollEnabled: false });
    }

    // Update refs synchronously for PanResponder FIRST
    isDraggingRef.current = true;
    draggedIndexRef.current = index;
    placeholderIndexRef.current = index;
    initialItemYRef.current = initialItemY;

    // Set drag state
    setDragState({
      isDragging: true,
      draggedIndex: index,
      initialItemY,
      placeholder: null,
    });

    // Set initial drag position
    draggedItemY.setValue(initialItemY);
    draggedItemScale.setValue(1);
    draggedItemOpacity.setValue(1);

    // Animate scale up
    Animated.spring(draggedItemScale, {
      toValue: designTokens.dnd.lift.scale,
      useNativeDriver: false,
    }).start();
  }, [draggedItemY, draggedItemScale, draggedItemOpacity]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true, // Need to capture for long press detection
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Only capture movement if we're already dragging
      return isDraggingRef.current;
    },
    onPanResponderGrant: (evt) => {
      // Store the initial page coordinates
      const initialPageY = evt.nativeEvent.pageY;

      // Calculate relative position within ScrollView
      touchStartY.current = initialPageY - scrollViewLayoutY.current;

      // Calculate which friend was touched
      const touchedIndex = Math.floor(touchStartY.current / ROW_HEIGHT);

      if (touchedIndex >= 0 && touchedIndex < localFriendsRef.current.length) {
        // Start long-press timer
        longPressTimer.current = setTimeout(() => {
          startDrag(touchedIndex, touchStartY.current);
        }, designTokens.dnd.gesture.longPressMs);
      }
    },
    onPanResponderMove: (evt, gestureState) => {
      if (isDraggingRef.current) {
        updateDragPosition(evt.nativeEvent.pageY);
      }
    },
    onPanResponderRelease: () => {
      // Clear long press timer
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }

      if (isDraggingRef.current) {
        endDrag();
      }
    },
    onPanResponderTerminate: () => {
      // Clear long press timer
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }

      if (isDraggingRef.current) {
        endDrag();
      }
    },
  }), [updateDragPosition, endDrag, startDrag]);


  const handleSave = useCallback(async () => {
    if (!hasChanges || isSaving) return;

    console.log('💾 [Modal Save] Starting save operation with local friends:', localFriends.map(f => ({ id: f.id, name: f.name })));

    setIsSaving(true);

    try {
      // Generate completely new ranks for ALL friends to avoid any conflicts
      // This ensures no duplicate constraint violations
      const rankUpdates = [];
      const timestamp = Date.now();

      for (let i = 0; i < localFriends.length; i++) {
        const friend = localFriends[i];
        // Generate a unique rank using timestamp + position to guarantee uniqueness
        const newRank = `${timestamp}_${i.toString().padStart(3, '0')}`;

        rankUpdates.push({
          id: friend.id,
          newRank
        });
      }

      console.log('💾 [Modal Save] Calculated rank updates:', rankUpdates);

      if (rankUpdates.length > 0) {
        // Dispatch batch update with fast-path sync
        console.log('💾 [Modal Save] Dispatching batch reorder to Redux...');
        await dispatch(batchReorderRosterFriends(user?.id || '', rankUpdates));

        // Wait a moment for sync to process before closing
        setTimeout(() => {
          setHasChanges(false);
          onClose();
        }, 100);
      } else {
        setHasChanges(false);
        onClose();
      }
    } catch (error) {
      console.error('❌ Error saving friend order:', error);
      Alert.alert('Error', 'Failed to save friend order. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [hasChanges, isSaving, localFriends, currentFriends, dispatch, onClose]);

  const handleCancel = useCallback(() => {
    setLocalFriends([...currentFriends]);
    setHasChanges(false);
    onClose();
  }, [currentFriends, onClose]);

  const renderFriendRow = useCallback((friend: OrderedFriend, index: number) => {
    const isDragged = dragState.isDragging && dragState.draggedIndex === index;
    const isPlaceholder = dragState.isDragging && dragState.placeholderIndex === index && dragState.draggedIndex !== index;

    let rowStyle = [styles.friendRow];
    if (isPlaceholder) {
      rowStyle.push({
        backgroundColor: designTokens.dnd.placeholder.tint.light,
        opacity: designTokens.dnd.placeholder.opacity,
      });
    }
    if (isDragged) {
      rowStyle.push(styles.draggedRow);
    }

    const rowContent = (
      <View style={rowStyle}>
        <AnimalAvatar
          animal={friend.avatar_animal as AnimalType}
          color={friend.avatar_color as ColorType}
          size={40}
          showInitials={true}
          name={friend.name || friend.username}
        />
        <View style={styles.friendInfo}>
          <Text style={[styles.friendName, fontStyle.regular]} numberOfLines={1}>
            {friend.name}
          </Text>
          <Text style={[styles.friendUsername, fontStyle.small]} numberOfLines={1}>
            @{friend.username}
          </Text>
        </View>
        <Icon name="menu" size={20} color={designTokens.colors.secondary} />
      </View>
    );

    if (isDragged) {
      return (
        <Animated.View
          key={`dragged-${friend.id}`}
          style={[
            styles.draggedContainer,
            {
              top: initialItemYRef.current,
              transform: [
                { translateY: draggedItemY },
                { scale: draggedItemScale }
              ],
              opacity: draggedItemOpacity,
              ...designTokens.dnd.lift.shadow,
            }
          ]}
        >
          {rowContent}
        </Animated.View>
      );
    }

    return (
      <View
        key={friend.id}
        style={{ opacity: isDragged ? 0 : 1 }}
      >
        {rowContent}
      </View>
    );
  }, [
    dragState,
    fontStyle,
    draggedItemY,
    draggedItemScale,
    draggedItemOpacity
  ]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, fontStyle.semibold]}>Reorder Friends</Text>
          <Text style={[styles.subtitle, fontStyle.small]}>
            Long press and drag to reorder
          </Text>
        </View>

        <View
          style={styles.scrollContainer}
          onLayout={(event) => {
            scrollViewLayoutY.current = event.nativeEvent.layout.y;
            scrollViewLayoutReady.current = true;
          }}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!dragState.isDragging}
          >
            <View style={styles.friendsList} {...panResponder.panHandlers}>
              {localFriends.map((friend, index) => renderFriendRow(friend, index))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
          >
            <Text style={[styles.cancelButtonText, fontStyle.medium]}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.saveButton,
              (!hasChanges || isSaving) && styles.disabledButton
            ]}
            onPress={handleSave}
            disabled={!hasChanges || isSaving}
          >
            <Text style={[styles.saveButtonText, fontStyle.medium]}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.border,
  },
  title: {
    fontSize: designTokens.typography.sizes.xl,
    color: designTokens.colors.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: designTokens.typography.sizes.sm,
    color: designTokens.colors.secondary,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  friendsList: {
    paddingVertical: designTokens.spacing.sm,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.sm,
    backgroundColor: designTokens.colors.surface,
    borderRadius: designTokens.radius.sm,
    marginHorizontal: designTokens.spacing.md,
    marginVertical: 2,
  },
  friendInfo: {
    flex: 1,
    marginLeft: designTokens.spacing.md,
  },
  friendName: {
    fontSize: designTokens.typography.sizes.md,
    color: designTokens.colors.primary,
    marginBottom: 2,
  },
  friendUsername: {
    fontSize: designTokens.typography.sizes.sm,
    color: designTokens.colors.secondary,
  },
  draggedRow: {
    backgroundColor: designTokens.colors.surface,
  },
  draggedContainer: {
    position: 'absolute',
    left: designTokens.spacing.md,
    right: designTokens.spacing.md,
    zIndex: 1000,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: designTokens.colors.border,
    gap: designTokens.spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.radius.sm,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: designTokens.colors.border,
  },
  cancelButtonText: {
    color: designTokens.colors.secondary,
    fontSize: designTokens.typography.sizes.md,
  },
  saveButton: {
    backgroundColor: designTokens.colors.primary,
  },
  saveButtonText: {
    color: 'white',
    fontSize: designTokens.typography.sizes.md,
  },
  disabledButton: {
    backgroundColor: designTokens.colors.border,
  },
});