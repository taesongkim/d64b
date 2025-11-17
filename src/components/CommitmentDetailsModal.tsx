import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  SafeAreaView,
  Switch,
} from 'react-native';
import { Commitment, selectCommitmentById } from '@/store/slices/commitmentsSlice';
import { useAppSelector } from '@/store/hooks';
import { RecordStatus } from '@/store/slices/recordsSlice';
import Icon from './icons/Icon';
import GridMonthHeader from './grids/GridMonthHeader';
import GridDateHeader from './grids/GridDateHeader';
import SingleCommitmentRow from './grids/SingleCommitmentRow';
import ReactionPopup from './ReactionPopup';
import CommitmentCellModal from './CommitmentCellModal';
import { useGridDates } from '@/hooks/useGridDates';
import { useGridVisibleRange, type ViewMode } from '@/hooks/useGridVisibleRange';
import { useSemanticColors, useThemeMode } from '@/contexts/ThemeContext';
import { getThemeColors, createSemanticColors } from '@/constants/grayscaleTokens';
import { getModalColors, createSharedButtonStyles } from './styles/modalStyles';

interface DayRecord {
  date: string;
  commitmentId: string;
  status: RecordStatus;
  value?: any;
}

interface CommitmentDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  commitmentId: string | null;
  onUpdateCommitment: (id: string, updates: Partial<Commitment>) => void;
  onToggleShowValues?: (commitmentId: string, showValues: boolean) => void;
  notes: Array<{ date: string; notes: string | null }>; // Notes from commitment_records
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onSoftDelete: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  // Grid-related props
  records: DayRecord[];
  onCellPress: (commitmentId: string, date: string) => void;
  onSetRecordStatus: (commitmentId: string, date: string, status: RecordStatus, value?: any) => void;
  earliestDate?: string;
}

const CommitmentDetailsModal: React.FC<CommitmentDetailsModalProps> = ({
  visible,
  onClose,
  commitmentId,
  onUpdateCommitment,
  onToggleShowValues,
  notes,
  onArchive,
  onRestore,
  onSoftDelete,
  onPermanentDelete,
  records,
  onCellPress,
  onSetRecordStatus,
  earliestDate,
}) => {
  const commitment = useAppSelector(state =>
    commitmentId ? selectCommitmentById(state, commitmentId) : null
  );

  // Theme hooks
  const semanticColors = useSemanticColors();
  const themeMode = useThemeMode();
  const colors = getThemeColors(themeMode);
  const modalColors = getModalColors(themeMode);
  const styles = createStyles(themeMode);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  // Grid state
  const [viewMode] = useState<ViewMode>('daily'); // Fixed to daily for modal
  const [scrollX, setScrollX] = useState(0);
  const gridScrollRef = useRef<ScrollView>(null);
  const userTriggeredChangesRef = useRef<Set<string>>(new Set());

  // Popup state for grid interactions
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [selectedCell, setSelectedCell] = useState<{ commitmentId: string; date: string } | null>(null);
  const popupOpenRef = useRef(false);

  // Cell modal state for grid
  const [cellModalVisible, setCellModalVisible] = useState(false);
  const [selectedCommitmentForCell, setSelectedCommitmentForCell] = useState<Commitment | null>(null);
  const [selectedDate, setSelectedDate] = useState('');

  // Grid hooks
  const minRecordDate = records.length > 0 ? records.reduce((min, r) => r.date < min ? r.date : min, records[0].date) : null;
  const { dates, todayIndex, appendFutureDates } = useGridDates({
    viewMode,
    earliestDate,
    minRecordDate,
  });
  const { monthLabel, columnWidth } = useGridVisibleRange({
    scrollX,
    dates,
    viewMode,
    includeLeftCol: false, // Modal has no left column
  });

  // Archive/Delete state logic
  const isActive = commitment && !commitment.archived && !commitment.deletedAt;
  const isArchived = commitment && commitment.archived === true && !commitment.deletedAt;
  const isRecentlyDeleted = commitment && commitment.deletedAt &&
    new Date(commitment.deletedAt).getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000;

  useEffect(() => {
    if (commitment) {
      setEditedTitle(commitment.title);
      setEditedDescription(commitment.description || '');
    }
    setIsEditing(false);
  }, [commitment, visible]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleCancel = useCallback(() => {
    if (commitment) {
      setEditedTitle(commitment.title);
      setEditedDescription(commitment.description || '');
    }
    setIsEditing(false);
  }, [commitment]);

  const handleSave = useCallback(() => {
    if (!commitment || !editedTitle.trim()) return;

    const updates: Partial<Commitment> = {
      title: editedTitle.trim(),
      description: editedDescription.trim() || undefined,
    };

    onUpdateCommitment(commitment.id, updates);
    setIsEditing(false);
  }, [commitment, editedTitle, editedDescription, onUpdateCommitment]);

  // Archive/Delete handlers
  const handleArchive = useCallback(() => {
    if (!commitment) return;
    onArchive(commitment.id);
    onClose();
  }, [commitment, onArchive, onClose]);

  const handleRestore = useCallback(() => {
    if (!commitment) return;
    onRestore(commitment.id);
    onClose();
  }, [commitment, onRestore, onClose]);

  const handleSoftDelete = useCallback(() => {
    if (!commitment) return;
    Alert.alert(
      'Delete Commitment',
      'This commitment will be moved to Recently Deleted and can be restored within 7 days.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
          onSoftDelete(commitment.id);
          onClose();
        }},
      ]
    );
  }, [commitment, onSoftDelete, onClose]);

  const handlePermanentDelete = useCallback(() => {
    if (!commitment) return;
    Alert.alert(
      'Delete Permanently',
      'This commitment will be permanently deleted and cannot be restored. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Forever', style: 'destructive', onPress: () => {
          onPermanentDelete(commitment.id);
          onClose();
        }},
      ]
    );
  }, [commitment, onPermanentDelete, onClose]);

  // Grid handlers
  const handleGridCellPress = useCallback((commitmentId: string, date: string, event: any) => {
    // Prevent opening new popup if one is already visible
    if (popupOpenRef.current) return;

    const { pageX, pageY } = event.nativeEvent;
    setSelectedCell({ commitmentId, date });
    setPopupPosition({ x: pageX, y: pageY });
    setPopupVisible(true);
    popupOpenRef.current = true;
  }, []);

  const handleGridLongPress = useCallback((commitmentId: string, date: string) => {
    if (!commitment) return;

    // Open CommitmentCellModal for long-press
    setSelectedCommitmentForCell(commitment);
    setSelectedDate(date);
    setCellModalVisible(true);
  }, [commitment]);

  const handlePopupSelect = useCallback((status: RecordStatus) => {
    if (selectedCell) {
      // Dev-only logging to verify offline queue idempotency
      if (__DEV__) {
        const idempotencyKey = `${selectedCell.commitmentId}_${selectedCell.date}`;
        console.log(`🔄 ReactionPopup → Queue enqueue: ${status} [${idempotencyKey}]`);
      }

      // Track user-triggered change for animation
      if (status === 'completed') {
        const changeKey = `${selectedCell.commitmentId}_${selectedCell.date}`;
        userTriggeredChangesRef.current.add(changeKey);

        // Clear tracking after animation duration
        setTimeout(() => {
          userTriggeredChangesRef.current.delete(changeKey);
        }, 1000);
      }

      onSetRecordStatus(selectedCell.commitmentId, selectedCell.date, status);
    }
    setPopupVisible(false);
    setSelectedCell(null);
    popupOpenRef.current = false;
  }, [selectedCell, onSetRecordStatus]);

  const handlePopupDismiss = useCallback(() => {
    setPopupVisible(false);
    setSelectedCell(null);
    popupOpenRef.current = false;
  }, []);

  const handleOpenDetails = useCallback(() => {
    if (selectedCell && commitment) {
      setSelectedCommitmentForCell(commitment);
      setSelectedDate(selectedCell.date);
      setCellModalVisible(true);
      setPopupVisible(false);
      setSelectedCell(null);
      popupOpenRef.current = false;
    }
  }, [selectedCell, commitment]);

  const handleCellModalSave = useCallback((commitmentId: string, date: string, status: RecordStatus, value?: any) => {
    // Track user-triggered change for animation
    if (status === 'completed') {
      const changeKey = `${commitmentId}_${date}`;
      userTriggeredChangesRef.current.add(changeKey);

      // Clear tracking after animation duration
      setTimeout(() => {
        userTriggeredChangesRef.current.delete(changeKey);
      }, 1000);
    }

    onSetRecordStatus(commitmentId, date, status, value);
    setCellModalVisible(false);
  }, [onSetRecordStatus]);

  const handleScrollChange = useCallback((e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    setScrollX(x);
  }, []);

  const handleMomentumScrollEnd = useCallback((e: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    if (contentOffset.x + layoutMeasurement.width >= contentSize.width - columnWidth * 2) {
      appendFutureDates();
    }
  }, [columnWidth, appendFutureDates]);

  const handleCellModalClose = useCallback(() => {
    setCellModalVisible(false);
  }, []);

  const getTargetDisplay = () => {
    if (!commitment || commitment.commitmentType !== 'measurement') return '';

    return `${commitment.target} ${commitment.unit}`;
  };

  const filteredNotes = notes.filter(note => note.notes && note.notes.trim().length > 0);

  const handleToggleShowValues = useCallback((value: boolean) => {
    if (onToggleShowValues && commitment) {
      onToggleShowValues(commitment.id, value);
    }
  }, [onToggleShowValues, commitment]);

  if (!commitment) return null;

  const isSaveDisabled = !editedTitle.trim();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.fullScreenContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Commitment Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Title and Description - Read-first with Edit mode */}
          <View style={styles.titleDescriptionSection}>
            {isEditing ? (
              <>
                {/* Edit Mode */}
                <View style={styles.editActionsContainer}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancel}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, isSaveDisabled && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={isSaveDisabled}
                  >
                    <Text style={[styles.saveButtonText, isSaveDisabled && styles.saveButtonTextDisabled]}>
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.titleInput}
                  value={editedTitle}
                  onChangeText={setEditedTitle}
                  placeholder="Enter commitment title"
                  multiline
                  maxLength={100}
                />

                <TextInput
                  style={styles.descriptionInput}
                  value={editedDescription}
                  onChangeText={setEditedDescription}
                  placeholder="Add a description (optional)"
                  multiline
                  textAlignVertical="top"
                  maxLength={500}
                />
              </>
            ) : (
              <>
                {/* Read Mode */}
                {/* Title - Primary Typography */}
                <Text
                  style={styles.primaryTitle}
                  numberOfLines={2}
                  allowFontScaling
                >
                  {commitment.title}
                </Text>

                {/* Description - Secondary Typography */}
                {commitment.description ? (
                  <Text
                    style={styles.secondaryDescription}
                    numberOfLines={5}
                    allowFontScaling
                  >
                    {commitment.description}
                  </Text>
                ) : null}
              </>
            )}
          </View>

          {/* Commitment Grid - Single Row */}
          {commitment && (
            <View style={styles.gridSection}>
              <GridMonthHeader monthLabel={monthLabel} />
              <ScrollView
                ref={gridScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentOffset={{ x: todayIndex * columnWidth, y: 0 }}
                onScroll={handleScrollChange}
                scrollEventThrottle={16}
                onMomentumScrollEnd={handleMomentumScrollEnd}
              >
                <View>
                  <GridDateHeader dates={dates} viewMode={viewMode} />
                  <SingleCommitmentRow
                    commitment={commitment}
                    dates={dates}
                    records={records}
                    viewMode={viewMode}
                    rowIndex={0}
                    onCellPress={handleGridCellPress}
                    onLongPress={handleGridLongPress}
                    gridContext="modal"
                    userTriggeredChangesRef={userTriggeredChangesRef}
                  />
                </View>
              </ScrollView>
            </View>
          )}

          {/* Meta Information - Tertiary Typography */}
          {(commitment.commitmentType === 'measurement' && commitment.target) && (
            <View style={styles.metaSection}>
              <Text style={styles.metaLabel}>TARGET</Text>
              <Text style={styles.metaValue}>{getTargetDisplay()}</Text>
            </View>
          )}

          {/* Requirements (for checkbox types with multiple tasks) */}
          {commitment.commitmentType === 'checkbox' && commitment.requirements && commitment.requirements.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Tasks</Text>
              <View style={styles.viewContainer}>
                {commitment.requirements.map((requirement, index) => (
                  <Text key={index} style={styles.requirementText}>
                    • {requirement}
                  </Text>
                ))}
              </View>
            </View>
          )}

          {/* Notes Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Notes</Text>
            {filteredNotes.length > 0 ? (
              <View style={styles.notesContainer}>
                {filteredNotes.map((note, index) => (
                  <View key={index} style={styles.noteItem}>
                    <Text style={styles.noteDate}>
                      {new Date(note.date).toLocaleDateString()}
                    </Text>
                    <Text style={styles.noteText}>{note.notes}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.viewContainer}>
                <Text style={styles.emptyText}>No notes yet</Text>
              </View>
            )}
          </View>

          {/* Display Settings Section - only for measurement commitments */}
          {commitment.commitmentType === 'measurement' && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Display Settings</Text>
              <View style={styles.toggleContainer}>
                <View style={styles.toggleLabelContainer}>
                  <Text style={styles.toggleLabel}>Show Values in Grid</Text>
                  <Text style={styles.toggleDescription}>
                    Display numeric values instead of status icons in the grid cells
                  </Text>
                </View>
                <Switch
                  value={commitment.showValues || false}
                  onValueChange={handleToggleShowValues}
                  trackColor={{ false: colors.gray200, true: '#10B981' }}
                  thumbColor={semanticColors.modalBackground}
                  ios_backgroundColor={colors.gray200}
                />
              </View>
            </View>
          )}

          {/* Actions Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Actions</Text>

            {/* Action buttons */}
            <View style={styles.actionsSection}>
              {!isEditing && isActive && (
                <View style={styles.horizontalActions}>
                  <TouchableOpacity style={styles.horizontalActionButton} onPress={handleEdit}>
                    <Icon name="edit" size={16} color={modalColors.actionButtonIcon} style={styles.actionIcon} />
                    <Text style={styles.horizontalActionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.horizontalActionButton} onPress={handleArchive}>
                    <Icon name="archive" size={16} color={modalColors.actionButtonIcon} style={styles.actionIcon} />
                    <Text style={styles.horizontalActionText}>Archive</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.horizontalActionButton} onPress={handleSoftDelete}>
                    <Icon name="delete" size={16} color={modalColors.actionButtonIcon} style={styles.actionIcon} />
                    <Text style={styles.horizontalActionText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}

              {isArchived && (
                <View style={styles.horizontalActions}>
                  <TouchableOpacity style={styles.horizontalActionButton} onPress={handleRestore}>
                    <Icon name="restore" size={16} color="#059669" style={styles.actionIcon} />
                    <Text style={[styles.horizontalActionText, styles.restoreText]}>Restore</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.horizontalActionButton} onPress={handleSoftDelete}>
                    <Icon name="delete" size={16} color={modalColors.actionButtonIcon} style={styles.actionIcon} />
                    <Text style={styles.horizontalActionText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}

              {isRecentlyDeleted && (
                <View style={styles.horizontalActions}>
                  <TouchableOpacity style={styles.horizontalActionButton} onPress={handleRestore}>
                    <Icon name="restore" size={16} color="#059669" style={styles.actionIcon} />
                    <Text style={[styles.horizontalActionText, styles.restoreText]}>Undelete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.horizontalActionButton} onPress={handlePermanentDelete}>
                    <Icon name="delete" size={16} color={modalColors.actionButtonIcon} style={styles.actionIcon} />
                    <Text style={styles.horizontalActionText}>Delete Permanently</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Grid Reaction Popup */}
      <ReactionPopup
        visible={popupVisible}
        onSelect={handlePopupSelect}
        onOpenDetails={handleOpenDetails}
        onDismiss={handlePopupDismiss}
        position={popupPosition}
      />

      {/* Grid Cell Modal for Non-Binary Commitments */}
      <CommitmentCellModal
        visible={cellModalVisible}
        onClose={handleCellModalClose}
        commitment={selectedCommitmentForCell}
        date={selectedDate}
        existingRecord={selectedCommitmentForCell ? records.find(r =>
          r.commitmentId === selectedCommitmentForCell.id && r.date === selectedDate
        ) : null}
        onSave={handleCellModalSave}
      />
    </Modal>
  );
};

// Create theme-aware styles function
const createStyles = (themeMode: 'light' | 'dark') => {
  const colors = getThemeColors(themeMode);
  const semanticColors = createSemanticColors(themeMode);
  const modalColors = getModalColors(themeMode);

  return StyleSheet.create({
    fullScreenContainer: {
      flex: 1,
      backgroundColor: semanticColors.appBackground,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: semanticColors.modalBackground,
      borderBottomWidth: 1,
      borderBottomColor: modalColors.borderLight,
    },
    backButton: {
      padding: 8,
    },
    backButtonText: {
      fontSize: 20,
      color: semanticColors.primaryText,
      fontWeight: '400',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: semanticColors.primaryText,
    },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Title and Description Section
  titleDescriptionSection: {
    paddingTop: 24,
    paddingBottom: 32,
  },

    // Primary Typography - Title (H1-ish)
    primaryTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: semanticColors.primaryText,
      lineHeight: 36,
      marginBottom: 8,
    },

    // Secondary Typography - Description (body)
    secondaryDescription: {
      fontSize: 16,
      fontWeight: '400',
      color: semanticColors.secondaryText,
      lineHeight: 24,
    },

  // Edit Mode
  editActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
    gap: 12,
  },
    cancelButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: modalColors.secondaryButton,
      borderColor: modalColors.borderLight,
      borderWidth: 1,
      borderRadius: 8,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: modalColors.secondaryButtonText,
    },
    saveButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: modalColors.primaryButton,
      borderRadius: 8,
      alignItems: 'center',
    },
    saveButtonDisabled: {
      backgroundColor: modalColors.disabledButton,
    },
    saveButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: modalColors.primaryButtonText,
    },
    saveButtonTextDisabled: {
      color: modalColors.placeholderText,
    },
    titleInput: {
      fontSize: 28,
      fontWeight: '700',
      lineHeight: 36,
      marginBottom: 16,
      backgroundColor: modalColors.contentCard,
      borderColor: modalColors.borderLight,
      color: modalColors.primaryText,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 2,
      minHeight: 72,
    },
    descriptionInput: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
      backgroundColor: modalColors.contentCard,
      borderColor: modalColors.borderLight,
      color: modalColors.primaryText,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 2,
      minHeight: 100,
    },

  // Grid Section
  gridSection: {
    marginBottom: 32,
    marginTop: 8,
  },

  // Meta Information - Tertiary Typography
  metaSection: {
    marginBottom: 32,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: themeMode === 'light' ? colors.gray400 : colors.gray500,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '500',
    color: semanticColors.primaryText,
  },

  // Legacy sections maintained
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: semanticColors.primaryText,
    marginBottom: 8,
  },
    viewContainer: {
      padding: 12,
      backgroundColor: modalColors.contentCard,
      borderColor: modalColors.contentCardBorder,
      borderWidth: 1,
      borderRadius: 8,
    },
    requirementText: {
      fontSize: 16,
      color: semanticColors.primaryText,
      marginBottom: 4,
    },
    notesContainer: {
      padding: 12,
      backgroundColor: modalColors.contentCard,
      borderColor: modalColors.contentCardBorder,
      borderWidth: 1,
      borderRadius: 8,
    },
  noteItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: modalColors.borderLight,
  },
  noteDate: {
    fontSize: 14,
    fontWeight: '600',
    color: semanticColors.secondaryText,
    marginBottom: 4,
  },
  noteText: {
    fontSize: 16,
    color: semanticColors.primaryText,
    lineHeight: 22,
  },
  emptyText: {
    fontSize: 16,
    color: modalColors.placeholderText,
    fontStyle: 'italic',
  },
  actionsSection: {
    gap: 12,
  },
  horizontalActions: {
    flexDirection: 'row',
    gap: 8,
  },
    horizontalActionButton: {
      backgroundColor: modalColors.actionButton,
      borderColor: modalColors.actionButtonBorder,
      borderWidth: 1,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      padding: 12,
    },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: modalColors.actionButton,
    borderWidth: 1,
    borderColor: modalColors.actionButtonBorder,
  },
  actionIcon: {
    marginRight: 8,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
    color: modalColors.actionButtonText,
  },
    horizontalActionText: {
      color: modalColors.actionButtonText,
      fontSize: 14,
      fontWeight: '500',
    },
  destructiveText: {
    color: '#EF4444',
  },
  permanentDeleteText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  restoreText: {
    color: '#059669',
  },
  // Toggle styles
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  toggleLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
    toggleLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: semanticColors.primaryText,
      marginBottom: 2,
    },
    toggleDescription: {
      fontSize: 14,
      color: semanticColors.secondaryText,
      lineHeight: 18,
    },
  });
};

export default CommitmentDetailsModal;