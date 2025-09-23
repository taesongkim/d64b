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
}

const CommitmentDetailsModal: React.FC<CommitmentDetailsModalProps> = ({
  visible,
  onClose,
  commitment,
  onUpdateCommitment,
  notes,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

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
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Commitment Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="activity-failed" size={24} color="#6B7280" />
            </TouchableOpacity>
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
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
});

export default CommitmentDetailsModal;
