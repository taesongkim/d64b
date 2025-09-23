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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFontStyle } from '@/hooks/useFontStyle';
import { Commitment } from '@/store/slices/commitmentsSlice';
import { RecordStatus } from '@/store/slices/recordsSlice';

interface CommitmentCellModalProps {
  visible: boolean;
  onClose: () => void;
  commitment: Commitment | null;
  date: string;
  existingRecord?: {
    status: RecordStatus;
    value?: any;
  } | null;
  onSave: (commitmentId: string, date: string, status: RecordStatus, value?: any) => void;
}

export default function CommitmentCellModal({
  visible,
  onClose,
  commitment,
  date,
  existingRecord,
  onSave,
}: CommitmentCellModalProps) {
  const fontStyle = useFontStyle();
  
  // State for different commitment types
  const [selectedStatus, setSelectedStatus] = useState<RecordStatus>('completed');
  const [ratingValue, setRatingValue] = useState('');
  const [measureValue, setMeasureValue] = useState('');
  const [requirementsChecked, setRequirementsChecked] = useState<boolean[]>([]);

  // Initialize state when modal opens
  useEffect(() => {
    if (visible && commitment) {
      // Set initial status
      if (existingRecord) {
        setSelectedStatus(existingRecord.status);
      } else {
        setSelectedStatus('completed');
      }

      // Initialize type-specific values
      if (commitment.commitmentType === 'measurement') {
        if (commitment.ratingRange) {
          // Rating type
          if (existingRecord?.value && typeof existingRecord.value === 'number') {
            setRatingValue(existingRecord.value.toString());
          } else {
            setRatingValue('');
          }
        } else {
          // Measure type
          if (existingRecord?.value && typeof existingRecord.value === 'number') {
            setMeasureValue(existingRecord.value.toString());
          } else {
            setMeasureValue('');
          }
        }
      } else if (commitment.commitmentType === 'checkbox' && commitment.requirements) {
        // Multiple requirements type
        const initialChecked = commitment.requirements.map(() => false);
        if (existingRecord?.value && Array.isArray(existingRecord.value)) {
          // Pre-populate with existing data
          commitment.requirements.forEach((req, index) => {
            if (existingRecord.value.includes(req)) {
              initialChecked[index] = true;
            }
          });
        }
        setRequirementsChecked(initialChecked);
      }
    }
  }, [visible, commitment, existingRecord]);

  const handleRequirementToggle = (index: number) => {
    const newChecked = [...requirementsChecked];
    newChecked[index] = !newChecked[index];
    setRequirementsChecked(newChecked);
  };

  const handleSave = () => {
    if (!commitment) return;

    let value: any = undefined;

    // Prepare value based on commitment type
    if (commitment.commitmentType === 'measurement') {
      if (commitment.ratingRange) {
        // Rating type
        const rating = parseFloat(ratingValue);
        if (isNaN(rating)) {
          Alert.alert('Error', 'Please enter a valid rating value.');
          return;
        }
        if (rating < commitment.ratingRange.min || rating > commitment.ratingRange.max) {
          Alert.alert('Error', `Rating must be between ${commitment.ratingRange.min} and ${commitment.ratingRange.max}.`);
          return;
        }
        value = rating;
      } else {
        // Measure type
        const measure = parseFloat(measureValue);
        if (isNaN(measure)) {
          Alert.alert('Error', 'Please enter a valid measurement value.');
          return;
        }
        value = measure;
      }
    } else if (commitment.commitmentType === 'checkbox' && commitment.requirements) {
      // Multiple requirements type
      const checkedRequirements = commitment.requirements.filter((_, index) => requirementsChecked[index]);
      value = checkedRequirements;
    }

    onSave(commitment.id, date, selectedStatus, value);
    onClose();
  };

  const getStatusButtonStyle = (status: RecordStatus) => {
    const isSelected = selectedStatus === status;
    return [
      styles.statusButton,
      isSelected && styles.selectedStatusButton,
    ];
  };

  const getStatusTextStyle = (status: RecordStatus) => {
    const isSelected = selectedStatus === status;
    return [
      styles.statusButtonText,
      fontStyle,
      isSelected && styles.selectedStatusButtonText,
    ];
  };

  if (!commitment) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <SafeAreaView style={styles.overlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.header}>
                <Text style={[styles.title, fontStyle]}>{commitment.title}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={[styles.closeText, fontStyle]}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.dateText, fontStyle]}>{date}</Text>

              {/* Multiple Requirements */}
              {commitment.commitmentType === 'checkbox' && commitment.requirements && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, fontStyle]}>Requirements</Text>
                  {commitment.requirements.map((requirement, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.requirementRow}
                      onPress={() => handleRequirementToggle(index)}
                    >
                      <View style={[
                        styles.checkbox,
                        requirementsChecked[index] && styles.checkedCheckbox
                      ]}>
                        {requirementsChecked[index] && (
                          <Text style={[styles.checkmark, fontStyle]}>✓</Text>
                        )}
                      </View>
                      <Text style={[styles.requirementText, fontStyle]}>{requirement}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Rating Input */}
              {commitment.commitmentType === 'measurement' && commitment.ratingRange && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, fontStyle]}>Rating</Text>
                  <Text style={[styles.ratingRangeText, fontStyle]}>
                    Enter a value between {commitment.ratingRange.min} and {commitment.ratingRange.max}
                  </Text>
                  <TextInput
                    style={[styles.input, fontStyle]}
                    placeholder={`${commitment.ratingRange.min}-${commitment.ratingRange.max}`}
                    placeholderTextColor="#9CA3AF"
                    value={ratingValue}
                    onChangeText={setRatingValue}
                    keyboardType="numeric"
                  />
                </View>
              )}

              {/* Measure Input */}
              {commitment.commitmentType === 'measurement' && !commitment.ratingRange && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, fontStyle]}>Measurement</Text>
                  <Text style={[styles.unitText, fontStyle]}>
                    Enter value in {commitment.unit || 'units'}
                  </Text>
                  <TextInput
                    style={[styles.input, fontStyle]}
                    placeholder="Enter value"
                    placeholderTextColor="#9CA3AF"
                    value={measureValue}
                    onChangeText={setMeasureValue}
                    keyboardType="numeric"
                  />
                </View>
              )}

              {/* Status Selection */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, fontStyle]}>Status</Text>
                <View style={styles.statusContainer}>
                  <TouchableOpacity
                    style={getStatusButtonStyle('completed')}
                    onPress={() => setSelectedStatus('completed')}
                  >
                    <Text style={getStatusTextStyle('completed')}>Complete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={getStatusButtonStyle('skipped')}
                    onPress={() => setSelectedStatus('skipped')}
                  >
                    <Text style={getStatusTextStyle('skipped')}>Skipped</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={getStatusButtonStyle('failed')}
                    onPress={() => setSelectedStatus('failed')}
                  >
                    <Text style={getStatusTextStyle('failed')}>Failed</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                  <Text style={[styles.cancelText, fontStyle]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={[styles.saveText, fontStyle]}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '100%',
    maxHeight: '90%',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    color: '#111827',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 18,
    color: '#6B7280',
  },
  dateText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 12,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedCheckbox: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  requirementText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  ratingRangeText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  unitText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  selectedStatusButton: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  statusButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectedStatusButtonText: {
    color: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelText: {
    color: '#6B7280',
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  saveText: {
    color: 'white',
    fontSize: 16,
  },
});
