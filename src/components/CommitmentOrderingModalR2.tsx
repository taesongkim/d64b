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
import { selectActiveLayoutItemsOrdered, addLayoutItem, batchReorderLayoutItems } from '@/store/slices/layoutItemsSlice';
import { addToQueue } from '@/store/slices/syncSlice';
import { rankBetween } from '@/utils/rank';
import { useAuth } from '@/contexts/AuthContext';
import type { Commitment } from '@/store/slices/commitmentsSlice';
import type { LayoutItem as LayoutItemData } from '@/store/slices/layoutItemsSlice';
import { createDefaultSpacer, createLayoutItemAtPosition } from '@/services/layoutItems';
import { designTokens } from '@/constants/designTokens';
import {
  validateReorderLayout,
  isDropPositionValid,
  logValidationResult,
  findFirstValidInsertPosition,
  type LayoutItem,
} from '@/utils/reorderValidation';

interface CommitmentOrderingModalR2Props {
  visible: boolean;
  onClose: () => void;
}

// Unified type for drag & drop list items
type ListItem =
  | { type: 'commitment'; data: Commitment }
  | { type: 'spacer'; data: LayoutItemData }
  | { type: 'divider'; data: LayoutItemData };

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

  // Get current commitments and layout items from Redux
  const currentCommitments = useAppSelector(selectActiveOrdered);
  const currentLayoutItems = useAppSelector(selectActiveLayoutItemsOrdered);
  const syncState = useAppSelector((state) => state.sync);

  // Local state for reordering (unified list of commitments and spacers)
  const [localItems, setLocalItems] = useState<ListItem[]>([]);
  const [localCommitments, setLocalCommitments] = useState<Commitment[]>([]); // Keep for backward compatibility during transition
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lockedLocalItems, setLockedLocalItems] = useState<ListItem[] | null>(null);

  // Drag state
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedIndex: null,
    draggedY: 0,
    placeholderIndex: null,
    initialItemY: 0,
  });

  // Helper function to get display text for layout items
  const getLayoutItemDisplayText = useCallback((item: LayoutItemData): string => {
    switch (item.type) {
      case 'spacer':
        return `${item.height || 0}px`;
      case 'divider':
        return `${item.style || 'solid'} divider`;
      default:
        // Future-proofing for new layout item types
        return `${item.type} item`;
    }
  }, []);

  // Helper function to get display text for any ListItem
  const getItemDisplayText = useCallback((item: ListItem): string => {
    if (item.type === 'commitment') {
      return item.data.title;
    } else {
      return getLayoutItemDisplayText(item.data);
    }
  }, [getLayoutItemDisplayText]);

  // Merge and sort commitments and layout items by order_rank
  const createUnifiedList = useCallback((commitments: Commitment[], layoutItems: LayoutItemData[]): ListItem[] => {
    const commitmentItems: ListItem[] = commitments.map(commitment => ({
      type: 'commitment' as const,
      data: commitment
    }));

    // Preserve the actual layout item types (spacer, divider, future types)
    const layoutItemsList: ListItem[] = layoutItems.map(item => ({
      type: item.type as any, // Preserve actual type (future-proofed)
      data: item
    }));

    const combined = [...commitmentItems, ...layoutItemsList];

    // Sort by order_rank (lexicographic ordering) - matches CommitmentGrid logic
    return combined.sort((a, b) => a.data.order_rank.localeCompare(b.data.order_rank));
  }, []);

  // Animation values
  const draggedItemY = useRef(new Animated.Value(0)).current;
  const draggedItemScale = useRef(new Animated.Value(1)).current;
  const draggedItemOpacity = useRef(new Animated.Value(1)).current;

  // Touch tracking
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const isDraggingRef = useRef(false); // Synchronous drag state for PanResponder
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Auto-reset if no movement
  const localCommitmentsRef = useRef<Commitment[]>([]); // Current commitments for PanResponder (backward compatibility)
  const localItemsRef = useRef<ListItem[]>([]); // Current unified list for PanResponder
  const draggedIndexRef = useRef<number | null>(null); // Current dragged index for PanResponder
  const placeholderIndexRef = useRef<number | null>(null); // Current placeholder index for PanResponder
  const initialItemYRef = useRef<number>(0); // Initial item Y position for PanResponder

  // Track touch coordinates for drag calculation
  const touchStartY = useRef<number>(0);
  const scrollViewLayoutY = useRef<number>(0);

  // Initialize local state when modal opens
  useEffect(() => {
    if (visible) {
      const unifiedList = createUnifiedList(currentCommitments, currentLayoutItems);
      setLocalItems(unifiedList);
      setLocalCommitments([...currentCommitments]); // Keep for backward compatibility
      setHasChanges(false);

      // DEV logging
      if (__DEV__) {
        console.log(`📱 R2 Modal opened with ${currentCommitments.length} commitments and ${currentLayoutItems.length} layout items`);
        console.log(`📱 R2 Unified list has ${unifiedList.length} total items:`,
          unifiedList.map(item => `${item.type}:${getItemDisplayText(item)}`));
      }
    }
  }, [visible, currentCommitments, currentLayoutItems, getItemDisplayText]);


  // Keep refs in sync for PanResponder access
  useEffect(() => {
    localCommitmentsRef.current = localCommitments;
    if (__DEV__) {
      console.log(`🔄 Updated localCommitmentsRef with ${localCommitments.length} commitments`);
    }
  }, [localCommitments]);

  useEffect(() => {
    localItemsRef.current = localItems;
    if (__DEV__) {
      console.log(`🔄 Updated localItemsRef with ${localItems.length} items`);
    }
  }, [localItems]);

  // Generic add layout item handler (for future expansion to dividers)
  const handleAddLayoutItem = useCallback((type: 'spacer' | 'divider') => {
    if (!user?.id) return;

    // Count active commitments to check if layout items are allowed
    const activeCommitments = localItems.filter(item => item.type === 'commitment');
    if (activeCommitments.length <= 1) {
      Alert.alert(
        'Cannot Add Layout Item',
        `You need at least 2 commitments to add ${type}s.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Convert to validation format for placement algorithm
    const currentLayoutItems: LayoutItem[] = localItems.map(item => ({
      id: item.data.id,
      type: item.type,
      title: item.type === 'commitment' ? item.data.title : undefined,
      height: item.type === 'spacer' ? item.data.height : undefined,
      style: item.type === 'divider' ? item.data.style : undefined,
    }));

    // Find first valid position for the layout item
    const insertIndex = findFirstValidInsertPosition(currentLayoutItems, type);

    if (insertIndex === null) {
      Alert.alert(
        'Cannot Add Layout Item',
        `No valid position available for ${type} placement.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Create layout item at the calculated position
    let newItem: ListItem;
    if (type === 'spacer') {
      newItem = createLayoutItemAtPosition(
        'spacer',
        insertIndex,
        localItems,
        user.id,
        { height: designTokens.layoutItems.spacer.height.regular }
      );
    } else {
      // Future divider support
      newItem = createLayoutItemAtPosition(
        'divider',
        insertIndex,
        localItems,
        user.id,
        { style: 'solid' }
      );
    }

    // Insert at the calculated position
    setLocalItems(prev => {
      const newItems = [...prev];
      newItems.splice(insertIndex, 0, newItem);
      return newItems;
    });
    setHasChanges(true);

    if (__DEV__) {
      console.log(`🔲 Added ${type} at position ${insertIndex} with rank:`, newItem.data.order_rank);
    }
  }, [localItems, user?.id]);

  // Add Spacer functionality (wrapper around generic handler)
  const handleAddSpacer = useCallback(() => {
    handleAddLayoutItem('spacer');
  }, [handleAddLayoutItem]);

  // Add Divider functionality (wrapper around generic handler)
  const handleAddDivider = useCallback(() => {
    handleAddLayoutItem('divider');
  }, [handleAddLayoutItem]);

  // Delete spacer functionality
  const handleDeleteSpacer = useCallback((spacerId: string) => {
    // Remove from local state
    setLocalItems(prev => prev.filter(item => item.data.id !== spacerId));
    setHasChanges(true);

    if (__DEV__) {
      console.log('🗑️ Deleted spacer:', spacerId);
    }
  }, []);

  // Delete divider functionality
  const handleDeleteDivider = useCallback((dividerId: string) => {
    // Remove from local state
    setLocalItems(prev => prev.filter(item => item.data.id !== dividerId));
    setHasChanges(true);

    if (__DEV__) {
      console.log('🗑️ Deleted divider:', dividerId);
    }
  }, []);

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
    localItems.map(item => ({
      id: item.data.id,
      type: item.type,
      title: item.type === 'commitment' ? item.data.title : undefined,
      height: item.type === 'spacer' ? item.data.height : undefined,
      style: item.type === 'divider' ? item.data.style : undefined,
    })),
    [localItems]
  );

  const startDrag = useCallback((index: number, initialRelativeY: number) => {
    const item = localItemsRef.current[index];

    // Calculate the item's position within the ScrollView content
    const contentPaddingTop = designTokens.spacing.lg; // ScrollView content padding top
    const itemHeight = ROW_HEIGHT + designTokens.spacing.xs; // Row height + margin bottom
    const initialItemY = contentPaddingTop + (index * itemHeight);

    // Disable ScrollView scrolling during drag to prevent accidental scrolling
    if (scrollViewRef.current) {
      scrollViewRef.current.setNativeProps({ scrollEnabled: false });
    }

    // Update refs synchronously for PanResponder FIRST
    isDraggingRef.current = true;
    draggedIndexRef.current = index;
    placeholderIndexRef.current = index;
    initialItemYRef.current = initialItemY;


    setDragState(prev => {
      return {
        isDragging: true,
        draggedIndex: index,
        draggedY: initialRelativeY,
        placeholderIndex: index,
        initialItemY,
      };
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

  }, [localItems, dragState]);

  const updateDrag = useCallback((currentRelativeY: number) => {
    if (!isDraggingRef.current || draggedIndexRef.current === null) {
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
    const candidatePlaceholderIndex = Math.max(0, Math.min(
      localItemsRef.current.length - 1,
      Math.floor(positionInList / itemHeight)
    ));

    // Validate the drop position using live validation
    const draggedItemIndex = draggedIndexRef.current;
    let newPlaceholderIndex = candidatePlaceholderIndex; // Default to candidate position

    if (draggedItemIndex !== null && draggedItemIndex < localItemsRef.current.length) {
      const draggedItem = localItemsRef.current[draggedItemIndex];
      const draggedLayoutItem: LayoutItem = {
        id: draggedItem.data.id,
        type: draggedItem.type,
        title: draggedItem.type === 'commitment' ? draggedItem.data.title : undefined,
        height: draggedItem.type === 'spacer' ? draggedItem.data.height : undefined,
      };

      // Use ref data for validation during drag operations
      const currentItems = localItemsRef.current;
      const currentLayoutItems: LayoutItem[] = currentItems.map(item => ({
        id: item.data.id,
        type: item.type,
        title: item.type === 'commitment' ? item.data.title : undefined,
        height: item.type === 'spacer' ? item.data.height : undefined,
        style: item.type === 'divider' ? item.data.style : undefined,
      }));


      const isValidPosition = isDropPositionValid(currentLayoutItems, draggedLayoutItem, candidatePlaceholderIndex);


      // Only update placeholder if position is valid
      newPlaceholderIndex = isValidPosition ? candidatePlaceholderIndex : (placeholderIndexRef.current ?? candidatePlaceholderIndex);
    }

    placeholderIndexRef.current = newPlaceholderIndex;

    setDragState(prev => ({
      ...prev,
      draggedY: currentRelativeY,
      placeholderIndex: newPlaceholderIndex,
    }));

    // Update animated position (relative to original position)
    draggedItemY.setValue(deltaY);

  }, [dragState, localItems.length]);

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

    // Validate indices using ref for current items
    const currentItems = localItemsRef.current;
    if (sourceIndex === null || targetIndex === null ||
        sourceIndex < 0 || sourceIndex >= currentItems.length ||
        targetIndex < 0 || targetIndex >= currentItems.length) {
      return;
    }

    // Apply the reorder
    if (sourceIndex !== targetIndex) {
      const newItems = [...currentItems];
      const draggedItem = newItems[sourceIndex];

      if (!draggedItem) {
        return;
      }

      // Remove from source
      newItems.splice(sourceIndex, 1);
      // Insert at target
      newItems.splice(targetIndex, 0, draggedItem);

      setLocalItems(newItems);
      setHasChanges(true);

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
    ]).start();
  }, [dragState, localCommitments, draggedItemScale, draggedItemOpacity, draggedItemY]);


  const handleSave = useCallback(async () => {
    console.log('🔍 [SAVE-DEBUG] handleSave called:', { hasChanges, isSaving, userId: user?.id });

    if (!hasChanges || isSaving) {
      console.log('🔍 [SAVE-DEBUG] Early return - no changes or already saving');
      onClose();
      return;
    }

    if (!user?.id) {
      console.error('❌ Cannot reorder: No authenticated user');
      return;
    }

    setIsSaving(true);
    // Lock the visual state to prevent flickering during save
    setLockedLocalItems([...localItems]);

    try {
      // Validate the final layout using current localItems data
      const finalLayoutItems: LayoutItem[] = localItems.map(item => ({
        id: item.data.id,
        type: item.type,
        title: item.type === 'commitment' ? item.data.title : undefined,
        height: item.type === 'spacer' ? item.data.height : undefined,
        style: item.type === 'divider' ? item.data.style : undefined,
      }));


      const validationResult = validateReorderLayout(finalLayoutItems);
      logValidationResult(validationResult, 'R2 Save');

      let finalItems = localItems;
      if (!validationResult.isValid && validationResult.repairedOrder) {
        // Auto-repair if needed - filter items to match repaired order
        const repairedIds = validationResult.repairedOrder.map(item => item.id);
        finalItems = localItems.filter(item => repairedIds.includes(item.data.id));

        if (__DEV__) {
          console.log('🔧 Applied auto-repair for validation violations');
        }
      }

      // Generate fresh ranks for ALL items in final order
      const commitmentUpdates: Array<{id: string, newRank: string}> = [];
      const layoutItemUpdates: Array<{id: string, newRank: string}> = [];
      const newSpacerRanks: Map<string, string> = new Map(); // Track ranks for new spacers
      let nextRank: string | null = null;

      if (__DEV__) {
        console.log('🔍 [SAVE-DEBUG] Final items before ranking:', finalItems.map((item, index) => ({
          index,
          type: item.type,
          id: item.data.id,
          isTemp: item.data.id.startsWith('temp-'),
          title: getItemDisplayText(item)
        })));
      }

      // Process from bottom to top to match grid display order
      for (let i = finalItems.length - 1; i >= 0; i--) {
        const item = finalItems[i];
        const newRank = rankBetween(null, nextRank);

        if (item.type === 'commitment') {
          commitmentUpdates.push({
            id: item.data.id,
            newRank
          });
        } else if (item.type === 'spacer') {
          if (__DEV__) {
            console.log('🔍 [RANK-DEBUG] Processing spacer:', {
              id: item.data.id,
              isTemp: item.data.id.startsWith('temp-'),
              newRank,
              itemIndex: i
            });
          }

          if (item.data.id.startsWith('temp-spacer-')) {
            // Track rank for new spacers
            newSpacerRanks.set(item.data.id, newRank);
          } else {
            // Process existing spacers for updates
            layoutItemUpdates.push({
              id: item.data.id,
              newRank
            });
          }
        } else if (item.type === 'divider') {
          if (__DEV__) {
            console.log('🔍 [RANK-DEBUG] Processing divider:', {
              id: item.data.id,
              isTemp: item.data.id.startsWith('temp-'),
              newRank,
              itemIndex: i
            });
          }

          if (item.data.id.startsWith('temp-divider-')) {
            // Track rank for new dividers
            newSpacerRanks.set(item.data.id, newRank);
          } else {
            // Process existing dividers for updates
            layoutItemUpdates.push({
              id: item.data.id,
              newRank
            });
          }
        }

        nextRank = newRank;
      }

      // Apply updates atomically
      if (commitmentUpdates.length > 0) {
        dispatch(batchReorderCommitments(commitmentUpdates));

        // Add commitment updates to sync queue
        commitmentUpdates.forEach(({ id, newRank }) => {
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
      }

      if (layoutItemUpdates.length > 0) {
        if (__DEV__) {
          console.log('🔍 [SAVE-DEBUG] Layout item updates:', layoutItemUpdates.map(update => ({
            id: update.id,
            newRank: update.newRank,
            isTemp: update.id.startsWith('temp-spacer-')
          })));
        }

        dispatch(batchReorderLayoutItems(layoutItemUpdates));

        // Add layout item updates to sync queue
        layoutItemUpdates.forEach(({ id, newRank }) => {
          if (__DEV__) {
            console.log('🔍 [SYNC-QUEUE-DEBUG] Adding layout item to sync queue:', {
              entityId: id,
              isTemp: id.startsWith('temp-spacer-'),
              newRank,
              idempotencyKey: `move:${id}:${newRank}`
            });
          }

          // Skip UPDATE operations for temp spacers - they should only be CREATE operations
          if (id.startsWith('temp-spacer-')) {
            console.log(`⚠️ Skipping UPDATE sync for temp spacer ${id} - temp spacers should only be CREATE operations`);
            return; // Skip adding to sync queue
          }

          dispatch(addToQueue({
            type: 'UPDATE',
            entity: 'layout_item',
            entityId: id,
            data: {
              id,
              user_id: user.id,
              order_rank: newRank,
              idempotencyKey: `move:${id}:${newRank}`
            }
          }));
        });
      }

      // Handle deleted layout items (present in original Redux state but not in final local state)
      // TODO: This diff logic could be optimized to only process changes instead of all items
      const originalLayoutItemIds = currentLayoutItems  // Use ORIGINAL Redux layout items, not modified local items
        .filter(item => item.type !== 'commitment') // All layout items (spacer, divider, future types)
        .map(item => item.id);
      const finalLayoutItemIds = finalItems
        .filter(item => item.type !== 'commitment') // All layout items (spacer, divider, future types)
        .map(item => item.data.id);
      const deletedLayoutItemIds = originalLayoutItemIds.filter(id => !finalLayoutItemIds.includes(id));

      if (__DEV__) {
        console.log('🔍 [DELETE-DEBUG] Layout item deletion analysis:', {
          originalLayoutItemIds,
          finalLayoutItemIds,
          deletedLayoutItemIds,
          originalCount: originalLayoutItemIds.length,
          finalCount: finalLayoutItemIds.length,
          deletedCount: deletedLayoutItemIds.length
        });
      }

      // Delete layout items from database and Redux
      for (const deletedId of deletedLayoutItemIds) {
        try {
          const { deleteLayoutItem } = await import('@/services/layoutItems');
          await deleteLayoutItem(deletedId, user.id);

          // Remove from Redux
          const { deleteLayoutItem: deleteFromRedux } = await import('@/store/slices/layoutItemsSlice');
          dispatch(deleteFromRedux(deletedId));

          // Add to sync queue
          dispatch(addToQueue({
            type: 'DELETE',
            entity: 'layout_item',
            entityId: deletedId,
            data: {
              id: deletedId,
              user_id: user.id,
              idempotencyKey: `delete:${deletedId}:${Date.now()}`
            }
          }));

          if (__DEV__) {
            console.log('✅ Deleted layout item:', deletedId);
          }
        } catch (error) {
          console.error('❌ Failed to delete layout item:', deletedId, error);
        }
      }

      // Handle new layout items (spacers and dividers with temporary IDs)
      const newSpacers = finalItems.filter(item =>
        item.type === 'spacer' && item.data.id.startsWith('temp-spacer-')
      );
      const newDividers = finalItems.filter(item =>
        item.type === 'divider' && item.data.id.startsWith('temp-divider-')
      );

      for (const newSpacerItem of newSpacers) {
        const spacerData = newSpacerItem.data;
        // Get the rank that was calculated in the main ranking loop
        const rank = newSpacerRanks.get(spacerData.id) || spacerData.order_rank;

        try {
          // Create the spacer in the database
          const { createLayoutItem } = await import('@/services/layoutItems');
          const createdSpacer = await createLayoutItem({
            userId: spacerData.userId,
            type: 'spacer',
            height: spacerData.type === 'spacer' ? spacerData.height : undefined,
            order_rank: rank,
            isActive: true,
            archived: false,
            deletedAt: null,
          });

          // Add the created spacer to Redux
          dispatch(addLayoutItem(createdSpacer));

          // Add CREATE sync action for the new spacer
          dispatch(addToQueue({
            type: 'CREATE',
            entity: 'layout_item',
            entityId: createdSpacer.id,
            data: {
              userId: createdSpacer.userId,
              user_id: createdSpacer.userId,
              type: createdSpacer.type,
              height: createdSpacer.height,
              order_rank: createdSpacer.order_rank,
              is_active: createdSpacer.isActive,
              archived: createdSpacer.archived,
              deleted_at: createdSpacer.deletedAt,
              idempotencyKey: `create:spacer:${createdSpacer.id}:${Date.now()}`
            }
          }));

          if (__DEV__) {
            console.log('✅ Created new spacer:', createdSpacer.id);
          }
        } catch (error) {
          console.error('❌ Failed to create spacer:', error);
        }
      }

      for (const newDividerItem of newDividers) {
        const dividerData = newDividerItem.data;
        // Get the rank that was calculated in the main ranking loop
        const rank = newSpacerRanks.get(dividerData.id) || dividerData.order_rank;

        try {
          // Create the divider in the database
          const { createLayoutItem } = await import('@/services/layoutItems');
          const createdDivider = await createLayoutItem({
            userId: dividerData.userId,
            type: 'divider',
            style: dividerData.type === 'divider' ? dividerData.style : undefined,
            order_rank: rank,
            isActive: true,
            archived: false,
            deletedAt: null,
          });

          // Add the created divider to Redux
          dispatch(addLayoutItem(createdDivider));

          // Add CREATE sync action for the new divider
          dispatch(addToQueue({
            type: 'CREATE',
            entity: 'layout_item',
            entityId: createdDivider.id,
            data: {
              userId: createdDivider.userId,
              user_id: createdDivider.userId,
              type: createdDivider.type,
              style: createdDivider.style,
              order_rank: createdDivider.order_rank,
              is_active: createdDivider.isActive,
              archived: createdDivider.archived,
              deleted_at: createdDivider.deletedAt,
              idempotencyKey: `create:divider:${createdDivider.id}:${Date.now()}`
            }
          }));

          if (__DEV__) {
            console.log('✅ Created new divider:', createdDivider.id);
          }
        } catch (error) {
          console.error('❌ Failed to create divider:', error);
        }
      }

      if (__DEV__) {
        console.log(`✅ R2 Save: Applied ${commitmentUpdates.length} commitment updates, ${layoutItemUpdates.length} layout item updates, ${deletedLayoutItemIds.length} deleted layout items, ${newSpacers.length} new spacers, ${newDividers.length} new dividers`);
      }

      onClose();
    } catch (error) {
      console.error('❌ R2 Save failed:', error);
      Alert.alert(
        'Save Failed',
        'Failed to save order changes. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSaving(false);
      setLockedLocalItems(null);
    }
  }, [hasChanges, isSaving, user?.id, layoutItems, localItems, dispatch, onClose]);

  // Debounced save to prevent rapid successive saves
  const debouncedHandleSave = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => handleSave(), 300);
    };
  }, [handleSave]);

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
      onStartShouldSetPanResponder: () => true, // Need to capture for long press detection
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only capture movement if we're already dragging
        return isDraggingRef.current;
      },

      onPanResponderGrant: (evt) => {
        // Store the initial page coordinates
        const initialPageY = evt.nativeEvent.pageY;


        // DON'T disable scrolling immediately - only disable when drag actually starts


        // Use estimated ScrollView position (header height + SafeAreaView)
        // This is more reliable than async measure
        const estimatedScrollViewTop = 100; // Rough estimate based on header
        scrollViewLayoutY.current = estimatedScrollViewTop;
        touchStartY.current = initialPageY - estimatedScrollViewTop;



        // Determine which item was touched
        const contentPaddingTop = designTokens.spacing.lg;
        const itemHeight = ROW_HEIGHT + designTokens.spacing.xs; // Row height + margin bottom
        const touchedIndex = Math.floor((touchStartY.current - contentPaddingTop) / itemHeight);


        if (touchedIndex >= 0 && touchedIndex < localItemsRef.current.length) {

          // Start long-press timer
          longPressTimer.current = setTimeout(() => {
            startDrag(touchedIndex, touchStartY.current);
          }, designTokens.dnd.gesture.longPressMs);
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
        }

        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }

        if (isDraggingRef.current) {
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
    const isLastItem = index === itemsToRender.length - 1;
    const shouldShowPlaceholderAfter = dragState.isDragging &&
      dragState.placeholderIndex === (dragState.draggedIndex !== null && dragState.draggedIndex < itemsToRender.length
        ? itemsToRender.length - 1  // Dragged item removed, so max index is length - 1
        : itemsToRender.length) &&
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
  }, [dragState, fontStyle, localItems.length]);

  const renderSpacerRow = useCallback((spacer: LayoutItemData, index: number) => {
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
    const isLastItem = index === itemsToRender.length - 1;
    const shouldShowPlaceholderAfter = dragState.isDragging &&
      dragState.placeholderIndex === (dragState.draggedIndex !== null && dragState.draggedIndex < itemsToRender.length
        ? itemsToRender.length - 1  // Dragged item removed, so max index is length - 1
        : itemsToRender.length) &&
      isLastItem;

    return (
      <View key={spacer.id}>
        {isPlaceholder && <View style={styles.placeholder} />}
        <View style={styles.spacerRow}>
          <View style={styles.spacerInfo}>
            <Text style={[styles.spacerLabel, fontStyle]}>Spacer</Text>
            <Text style={[styles.spacerHeight, fontStyle]}>{spacer.height}px</Text>
          </View>
          <View style={styles.spacerActions}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteSpacer(spacer.id)}
              disabled={dragState.isDragging}
            >
              <Text style={styles.deleteButtonText}>🗑️</Text>
            </TouchableOpacity>
            <View style={styles.dragHandle}>
              <Text style={styles.dragHandleText}>⋮⋮</Text>
            </View>
          </View>
        </View>
        {shouldShowPlaceholderAfter && <View style={styles.placeholder} />}
      </View>
    );
  }, [dragState, fontStyle, localItems.length, handleDeleteSpacer]);

  const renderDividerRow = useCallback((divider: LayoutItemData, index: number) => {
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
    const isLastItem = index === itemsToRender.length - 1;
    const shouldShowPlaceholderAfter = dragState.isDragging &&
      dragState.placeholderIndex === (dragState.draggedIndex !== null && dragState.draggedIndex < itemsToRender.length
        ? itemsToRender.length - 1  // Dragged item removed, so max index is length - 1
        : itemsToRender.length) &&
      isLastItem;

    return (
      <View key={divider.id}>
        {isPlaceholder && <View style={styles.placeholder} />}
        <View style={styles.dividerRow}>
          <View style={styles.dividerInfo}>
            <Text style={[styles.dividerLabel, fontStyle]}>Divider</Text>
            <Text style={[styles.dividerStyle, fontStyle]}>{divider.style || 'solid'}</Text>
          </View>
          <View style={styles.dividerActions}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteDivider(divider.id)}
              disabled={dragState.isDragging}
            >
              <Text style={styles.deleteButtonText}>🗑️</Text>
            </TouchableOpacity>
            <View style={styles.dragHandle}>
              <Text style={styles.dragHandleText}>⋮⋮</Text>
            </View>
          </View>
        </View>
        {shouldShowPlaceholderAfter && <View style={styles.placeholder} />}
      </View>
    );
  }, [dragState, fontStyle, localItems.length, handleDeleteDivider]);

  // Determine which items to render: locked state during save, or live state
  const itemsToRender = (isSaving && lockedLocalItems) ? lockedLocalItems : localItems;

  // Unified renderer for list items (commitments, spacers, and dividers)
  const renderListItem = useCallback((item: ListItem, index: number) => {
    if (item.type === 'commitment') {
      return renderCommitmentRow(item.data, index);
    } else if (item.type === 'spacer') {
      return renderSpacerRow(item.data, index);
    } else if (item.type === 'divider') {
      return renderDividerRow(item.data, index);
    } else {
      // Future-proofing: fallback for unknown layout item types
      if (__DEV__) {
        console.warn(`⚠️ Unknown layout item type: ${item.type}`);
      }
      return renderSpacerRow(item.data, index); // Use spacer as fallback
    }
  }, [renderCommitmentRow, renderSpacerRow, renderDividerRow]);

  const renderDraggedItem = useCallback(() => {

    if (!dragState.isDragging || dragState.draggedIndex === null) {
      return null;
    }

    const draggedItem = itemsToRender[dragState.draggedIndex];
    if (!draggedItem) {
      return null;
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
        {draggedItem.type === 'commitment' ? (
          <View style={styles.commitmentInfo}>
            <View style={[styles.colorBadge, { backgroundColor: draggedItem.data.color }]} />
            <Text style={[styles.commitmentTitle, fontStyle]} numberOfLines={1}>
              {draggedItem.data.title}
            </Text>
            {draggedItem.data.isPrivate && (
              <Text style={[styles.privateIndicator, fontStyle]}>🔒</Text>
            )}
          </View>
        ) : draggedItem.type === 'spacer' ? (
          <View style={styles.spacerInfo}>
            <Text style={[styles.spacerLabel, fontStyle]}>Spacer</Text>
            <Text style={[styles.spacerHeight, fontStyle]}>{draggedItem.data.height}px</Text>
          </View>
        ) : (
          <View style={styles.dividerInfo}>
            <Text style={[styles.dividerLabel, fontStyle]}>Divider</Text>
            <Text style={[styles.dividerStyle, fontStyle]}>{draggedItem.data.style || 'solid'}</Text>
          </View>
        )}
        <View style={styles.dragHandle}>
          <Text style={styles.dragHandleText}>⋮⋮</Text>
        </View>
      </Animated.View>
    );
  }, [dragState, localItems, draggedItemY, draggedItemScale, draggedItemOpacity, fontStyle]);

  const canReorder = itemsToRender.length > 1;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
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
            style={styles.addSpacerButton}
            onPress={handleAddSpacer}
            disabled={dragState.isDragging || isSaving}
          >
            <Text style={[styles.addSpacerButtonText, fontStyle]}>+ Spacer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addDividerButton}
            onPress={handleAddDivider}
            disabled={dragState.isDragging || isSaving}
          >
            <Text style={[styles.addDividerButtonText, fontStyle]}>+ Divider</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.saveButton,
              (hasChanges && !dragState.isDragging && !isSaving && !syncState.isSyncing) && styles.saveButtonActive
            ]}
            onPress={debouncedHandleSave}
            disabled={dragState.isDragging || isSaving || syncState.isSyncing}
          >
            <Text style={[
              styles.saveButtonText,
              fontStyle,
              (hasChanges && !dragState.isDragging && !isSaving) && styles.saveButtonTextActive
            ]}>
              {isSaving ? 'Saving...' : syncState.isSyncing ? 'Syncing...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {itemsToRender.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, fontStyle]}>No items to reorder</Text>
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
            <View style={styles.commitmentsList} {...globalPanResponder.panHandlers}>
              {itemsToRender.map((item, index) =>
                renderListItem(item, index)
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
  addSpacerButton: {
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.radius.md,
    backgroundColor: designTokens.colors.background,
    borderWidth: 1,
    borderColor: designTokens.colors.border,
  },
  addSpacerButtonText: {
    color: designTokens.colors.secondary,
    fontSize: designTokens.typography.sizes.sm,
  },
  addDividerButton: {
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.radius.md,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: designTokens.colors.border,
  },
  addDividerButtonText: {
    color: designTokens.colors.secondary,
    fontSize: designTokens.typography.sizes.sm,
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
  spacerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: designTokens.layoutItems.divider.color.light,
    borderRadius: designTokens.radius.lg,
    padding: designTokens.spacing.md,
    marginBottom: designTokens.spacing.xs,
    borderWidth: 1,
    borderColor: designTokens.colors.border,
    height: ROW_HEIGHT,
    borderStyle: 'dashed',
  },
  spacerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  spacerLabel: {
    fontSize: designTokens.typography.sizes.md,
    color: designTokens.colors.secondary,
    fontStyle: 'italic',
  },
  spacerHeight: {
    fontSize: designTokens.typography.sizes.sm,
    color: designTokens.colors.secondary,
    marginLeft: designTokens.spacing.sm,
  },
  placeholder: {
    height: ROW_HEIGHT,
    backgroundColor: designTokens.dnd.placeholder.tint.light,
    borderRadius: designTokens.radius.lg,
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
  spacerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  deleteButton: {
    padding: designTokens.spacing.xs,
    borderRadius: designTokens.radius.sm,
    backgroundColor: 'transparent',
  },
  deleteButtonText: {
    fontSize: 16,
    color: designTokens.colors.error,
  },
  dividerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3F4F6', // Light gray background for dividers
    borderRadius: designTokens.radius.lg,
    padding: designTokens.spacing.md,
    marginBottom: designTokens.spacing.xs,
    borderWidth: 1,
    borderColor: designTokens.colors.border,
    height: ROW_HEIGHT,
    borderStyle: 'dotted',
  },
  dividerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dividerLabel: {
    fontSize: designTokens.typography.sizes.md,
    color: designTokens.colors.secondary,
    fontStyle: 'italic',
  },
  dividerStyle: {
    fontSize: designTokens.typography.sizes.sm,
    color: designTokens.colors.secondary,
    marginLeft: designTokens.spacing.sm,
  },
  dividerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
});