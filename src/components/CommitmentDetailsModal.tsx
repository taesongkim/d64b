import React, { useState, useEffect } from 'react';
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
import { Commitment } from '@/store/slices/commitmentsSlice';
import { Icon } from './icons';

interface CommitmentDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  commitment: Commitment | null;
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
  commitment,
  onUpdateCommitment,
  notes,
  onArchive,
  onRestore,
  onSoftDelete,
  onPermanentDelete,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
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
  }, [commitment, visible]);

  const handleSaveTitle = () => {
    if (!commitment || !editedTitle.trim()) return;
    
    onUpdateCommitment(commitment.id, { title: editedTitle.trim() });
    setIsEditingTitle(false);
  };

  const handleSaveDescription = () => {
    if (!commitment) return;

    onUpdateCommitment(commitment.id, { description: editedDescription.trim() || undefined });
    setIsEditingDescription(false);
  };

  // Archive/Delete handlers
  const handleArchive = () => {
    if (!commitment) return;
    onArchive(commitment.id);
    onClose();
  };

  const handleRestore = () => {
    if (!commitment) return;
    onRestore(commitment.id);
    onClose();
  };

  const handleSoftDelete = () => {
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
  };

  const handlePermanentDelete = () => {
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
  };

  const getTargetDisplay = () => {
    if (!commitment || commitment.commitmentType !== 'measurement') return '';
    
    return `${commitment.target} ${commitment.unit}`;
  };

  const filteredNotes = notes.filter(note => note.notes && note.notes.trim().length > 0);

  if (!commitment) return null;

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
          <Text style={styles.title}>Commitment Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Commitment Name */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Name</Text>
              {isEditingTitle ? (
                <View style={styles.editContainer}>
                  <TextInput
                    style={styles.textInput}
                    value={editedTitle}
                    onChangeText={setEditedTitle}
                    placeholder="Enter commitment name"
                    autoFocus
                    onSubmitEditing={handleSaveTitle}
                    onBlur={handleSaveTitle}
                  />
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.viewContainer}
                  onPress={() => setIsEditingTitle(true)}
                >
                  <Text style={styles.viewText}>{commitment.title}</Text>
                  <Icon name="edit" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Description</Text>
              {isEditingDescription ? (
                <View style={styles.editContainer}>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={editedDescription}
                    onChangeText={setEditedDescription}
                    placeholder="Enter description (optional)"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    onSubmitEditing={handleSaveDescription}
                    onBlur={handleSaveDescription}
                  />
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.viewContainer}
                  onPress={() => setIsEditingDescription(true)}
                >
                  <Text style={styles.viewText}>
                    {commitment.description || 'No description'}
                  </Text>
                  <Icon name="edit" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>


            {/* Target (for measurement types) */}
            {commitment.commitmentType === 'measurement' && commitment.target && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Target</Text>
                <View style={styles.viewContainer}>
                  <Text style={styles.viewText}>{getTargetDisplay()}</Text>
                </View>
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
                {isActive && (
                  <>
                    <TouchableOpacity style={styles.actionButton} onPress={handleArchive}>
                      <Text style={[styles.actionIcon, styles.archiveIcon]}>📦</Text>
                      <Text style={styles.actionText}>Archive</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={handleSoftDelete}>
                      <Text style={[styles.actionIcon, styles.deleteIcon]}>🗑️</Text>
                      <Text style={[styles.actionText, styles.destructiveText]}>Delete</Text>
                    </TouchableOpacity>
                  </>
                )}

                {isArchived && (
                  <>
                    <TouchableOpacity style={styles.actionButton} onPress={handleRestore}>
                      <Text style={[styles.actionIcon, styles.restoreIcon]}>↩️</Text>
                      <Text style={[styles.actionText, styles.restoreText]}>Restore</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={handleSoftDelete}>
                      <Text style={[styles.actionIcon, styles.deleteIcon]}>🗑️</Text>
                      <Text style={[styles.actionText, styles.destructiveText]}>Delete</Text>
                    </TouchableOpacity>
                  </>
                )}

                {isRecentlyDeleted && (
                  <>
                    <TouchableOpacity style={styles.actionButton} onPress={handleRestore}>
                      <Text style={[styles.actionIcon, styles.restoreIcon]}>↩️</Text>
                      <Text style={[styles.actionText, styles.restoreText]}>Undelete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={handlePermanentDelete}>
                      <Text style={[styles.actionIcon, styles.permanentDeleteIcon]}>🗑️</Text>
                      <Text style={[styles.actionText, styles.permanentDeleteText]}>Delete Permanently</Text>
                    </TouchableOpacity>
                  </>
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
    backgroundColor: 'white',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 20,
    color: '#111827',
    fontWeight: '400',
  },
  headerSpacer: {
    width: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  viewText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  editContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textInput: {
    fontSize: 16,
    color: '#111827',
    padding: 12,
    backgroundColor: 'transparent',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  requirementText: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 4,
  },
  notesContainer: {
    backgroundColor: '#F9FAFB',
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  archiveIcon: {
    opacity: 0.8,
  },
  deleteIcon: {
    opacity: 0.8,
  },
  restoreIcon: {
    opacity: 0.8,
  },
  permanentDeleteIcon: {
    opacity: 0.8,
  },
  actionText: {
    fontSize: 16,
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
