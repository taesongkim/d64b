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
import { batchReorderFriends } from '@/store/slices/socialSlice';
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

  // Get current friends from Redux
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

  // Initialize local state when modal opens
  useEffect(() => {
    if (visible) {
      setLocalFriends([...currentFriends]);
      setHasChanges(false);
      setIsSaving(false);
      // Reset drag state
      setDragState({
        isDragging: false,
        draggedIndex: null,
        draggedY: 0,
        placeholderIndex: null,
        initialItemY: 0,
      });
    }
  }, [visible, currentFriends]);

  // Sync refs with local state
  useEffect(() => {
    localFriendsRef.current = localFriends;
  }, [localFriends]);

  const startDrag = useCallback((index: number, gestureY: number) => {
    if (isDraggingRef.current) return;

    isDraggingRef.current = true;
    draggedIndexRef.current = index;
    placeholderIndexRef.current = index;

    // Calculate initial item position
    const itemY = index * ROW_HEIGHT;
    initialItemYRef.current = itemY;

    setDragState(prev => ({
      ...prev,
      isDragging: true,
      draggedIndex: index,
      placeholderIndex: index,
      initialItemY: itemY,
    }));

    // Animate lift effect using design tokens
    Animated.parallel([
      Animated.timing(draggedItemScale, {
        toValue: designTokens.dnd.lift.scale,
        duration: designTokens.animation.fast,
        useNativeDriver: false,
      }),
      Animated.timing(draggedItemOpacity, {
        toValue: designTokens.dnd.lift.opacity,
        duration: designTokens.animation.fast,
        useNativeDriver: false,
      }),
    ]).start();

    // Auto-reset if no movement after 5 seconds
    dragTimeoutRef.current = setTimeout(() => {
      endDrag();
    }, 5000);

  }, [draggedItemScale, draggedItemOpacity]);

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

      // Remove from source
      newFriends.splice(sourceIndex, 1);
      // Insert at target
      newFriends.splice(targetIndex, 0, draggedFriend);

      setLocalFriends(newFriends);
      setHasChanges(true);
    }

    // Update refs synchronously
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

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Only start dragging if we have a long press and moved enough
      const moved = Math.abs(gestureState.dx) > designTokens.dnd.gesture.activationDistance ||
                   Math.abs(gestureState.dy) > designTokens.dnd.gesture.activationDistance;
      return isDraggingRef.current && moved;
    },
    onPanResponderGrant: () => {},
    onPanResponderMove: (evt, gestureState) => {
      if (isDraggingRef.current) {
        updateDragPosition(evt.nativeEvent.pageY);
      }
    },
    onPanResponderRelease: () => {
      if (isDraggingRef.current) {
        endDrag();
      }
    },
    onPanResponderTerminate: () => {
      if (isDraggingRef.current) {
        endDrag();
      }
    },
  }), [updateDragPosition, endDrag]);

  const handleLongPress = useCallback((index: number) => {
    return (evt: any) => {
      const gestureY = evt.nativeEvent.pageY;
      touchStartY.current = gestureY;

      // Clear any existing timer
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }

      // Start long press timer using design token
      longPressTimer.current = setTimeout(() => {
        if (scrollViewLayoutReady.current) {
          startDrag(index, gestureY);
        }
      }, designTokens.dnd.gesture.longPressMs);
    };
  }, [startDrag]);

  const handlePressOut = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!hasChanges || isSaving) return;

    setIsSaving(true);

    try {
      // Calculate new ranks for moved friends only
      const rankUpdates = [];

      for (let i = 0; i < localFriends.length; i++) {
        const friend = localFriends[i];
        const originalIndex = currentFriends.findIndex(f => f.id === friend.id);

        // Only update ranks for friends that moved
        if (originalIndex !== i) {
          const prevRank = i > 0 ? localFriends[i - 1].order_rank || null : null;
          const nextRank = i < localFriends.length - 1 ? localFriends[i + 1].order_rank || null : null;
          const newRank = rankBetween(prevRank, nextRank);

          rankUpdates.push({
            id: friend.id,
            newRank
          });
        }
      }

      if (rankUpdates.length > 0) {
        // Dispatch batch update with fast-path sync
        await dispatch(batchReorderFriends(rankUpdates));
      }

      setHasChanges(false);
      onClose();
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
          animal={(friend.avatar_animal as AnimalType) || 'bear'}
          color={(friend.avatar_color as ColorType) || 'blue'}
          size={40}
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
      <TouchableOpacity
        key={friend.id}
        onPressIn={handleLongPress(index)}
        onPressOut={handlePressOut}
        style={{ opacity: isDragged ? 0 : 1 }}
        activeOpacity={0.8}
      >
        {rowContent}
      </TouchableOpacity>
    );
  }, [
    dragState,
    fontStyle,
    handleLongPress,
    handlePressOut,
    draggedItemY,
    draggedItemScale,
    draggedItemOpacity
  ]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
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
          {...panResponder.panHandlers}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.friendsList}>
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