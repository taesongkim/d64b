import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { Commitment, selectCommitmentById } from '@/store/slices/commitmentsSlice';
import { useAppSelector } from '@/store/hooks';
import Icon from './icons/Icon';

interface CommitmentDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  commitmentId: string | null;
  onUpdateCommitment: (id: string, updates: Partial<Commitment>) => void;
  notes: Array<{ date: string; notes: string | null }>; // Notes from commitment_records
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onSoftDelete: (id: string) => void;
  onPermanentDelete: (id: string) => void;
}

const CommitmentDetailsModal: React.FC<CommitmentDetailsModalProps> = ({
  visible,
  onClose,
  commitmentId,
  onUpdateCommitment,
  notes,
  onArchive,
  onRestore,
  onSoftDelete,
  onPermanentDelete,
}) => {
  const commitment = useAppSelector(state =>
    commitmentId ? selectCommitmentById(state, commitmentId) : null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

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

  const getTargetDisplay = () => {
    if (!commitment || commitment.commitmentType !== 'measurement') return '';

    return `${commitment.target} ${commitment.unit}`;
  };

  const filteredNotes = notes.filter(note => note.notes && note.notes.trim().length > 0);

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

          {/* Actions Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Actions</Text>

            {/* Action buttons */}
            <View style={styles.actionsSection}>
              {!isEditing && isActive && (
                <View style={styles.horizontalActions}>
                  <TouchableOpacity style={styles.horizontalActionButton} onPress={handleEdit}>
                    <Icon name="edit" size={16} color="#374151" style={styles.actionIcon} />
                    <Text style={styles.horizontalActionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.horizontalActionButton} onPress={handleArchive}>
                    <Icon name="archive" size={16} color="#374151" style={styles.actionIcon} />
                    <Text style={styles.horizontalActionText}>Archive</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.horizontalActionButton} onPress={handleSoftDelete}>
                    <Icon name="delete" size={16} color="#374151" style={styles.actionIcon} />
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
                    <Icon name="delete" size={16} color="#374151" style={styles.actionIcon} />
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
                    <Icon name="delete" size={16} color="#374151" style={styles.actionIcon} />
                    <Text style={styles.horizontalActionText}>Delete Permanently</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 20,
    color: '#111827',
    fontWeight: '400',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
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
    color: '#111827',
    lineHeight: 36,
    marginBottom: 8,
  },

  // Secondary Typography - Description (body)
  secondaryDescription: {
    fontSize: 16,
    fontWeight: '400',
    color: '#6B7280',
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
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#111827',
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButtonTextDisabled: {
    color: '#9CA3AF',
  },
  titleInput: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 36,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minHeight: 72,
  },
  descriptionInput: {
    fontSize: 16,
    fontWeight: '400',
    color: '#6B7280',
    lineHeight: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minHeight: 100,
  },

  // Meta Information - Tertiary Typography
  metaSection: {
    marginBottom: 32,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },

  // Legacy sections maintained
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  viewContainer: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  requirementText: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 4,
  },
  notesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
  },
  noteItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  noteDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 16,
    color: '#111827',
    lineHeight: 22,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionIcon: {
    marginRight: 8,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  horizontalActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
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
});

export default CommitmentDetailsModal;