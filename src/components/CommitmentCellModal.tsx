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
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useFontStyle } from '@/hooks/useFontStyle';
import { Commitment } from '@/store/slices/commitmentsSlice';
import { RecordStatus } from '@/store/slices/recordsSlice';
import { MODAL_STYLES, MODAL_SIZES } from './styles/modalStyles';
import CustomCheckmarkIcon from './CustomCheckmarkIcon';
import CustomCircleDashIcon from './CustomCircleDashIcon';
import CustomXIcon from './CustomXIcon';
import { parseLocalISODate } from '@/utils/timeUtils';
import { getDisplayUnit } from '@/utils/unitUtils';
import { useThemeMode } from '@/contexts/ThemeContext';
import { designTokens } from '@/constants/designTokens';

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

const formatDate = (dateString: string): string => {
  const date = parseLocalISODate(dateString);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return date.toLocaleDateString('en-US', options).replace(',', ' |');
};

export default function CommitmentCellModal({
  visible,
  onClose,
  commitment,
  date,
  existingRecord,
  onSave,
}: CommitmentCellModalProps) {
  const fontStyle = useFontStyle();
  const themeMode = useThemeMode();
  const cellColors = designTokens.cellColors[themeMode];
  
  // State for different commitment types
  const [selectedStatus, setSelectedStatus] = useState<RecordStatus | 'none'>('completed');
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
        setSelectedStatus('none');
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
        const rating = parseFloat(ratingValue.trim());
        if (isNaN(rating)) {
          Alert.alert('Error', 'Please enter a valid rating value.');
          return;
        }
        if (rating < commitment.ratingRange.min || rating > commitment.ratingRange.max) {
          Alert.alert('Error', `Rating must be between ${commitment.ratingRange.min} and ${commitment.ratingRange.max}.`);
          return;
        }
        value = rating;
        console.log('💾 [Modal] Rating value prepared:', value);
      } else {
        // Measure type
        const measure = parseFloat(measureValue.trim());
        if (isNaN(measure)) {
          Alert.alert('Error', 'Please enter a valid measurement value.');
          return;
        }
        value = measure;
        console.log('💾 [Modal] Measure value prepared:', value, 'from input:', measureValue);
      }
    } else if (commitment.commitmentType === 'checkbox' && commitment.requirements) {
      // Multiple requirements type
      const checkedRequirements = commitment.requirements.filter((_, index) => requirementsChecked[index]);
      value = checkedRequirements;
    }


    // Handle clearing the record if status is 'none' AND no value was entered
    if (selectedStatus === 'none' && value === undefined) {
      onSave(commitment.id, date, 'none' as RecordStatus, undefined);
    } else {
      // Save the value regardless of status - preserves user input even for 'none' status
      onSave(commitment.id, date, selectedStatus as RecordStatus, value);
    }
    onClose();
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
        <View style={MODAL_STYLES.overlay}>
          <View style={MODAL_STYLES.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header with date/title group on left, close button on right */}
              <View style={styles.headerContainer}>
                <View style={styles.leftHeaderContent}>
                  {/* Date Subheader - left aligned */}
                  <Text style={[styles.dateSubheader, fontStyle]}>{formatDate(date)}</Text>
                  {/* Title */}
                  <Text style={[MODAL_STYLES.title, styles.titleInHeader, fontStyle]}>{commitment.title}</Text>
                  {/* Status Text or Rating Summary */}
                  <Text style={[
                    styles.statusText,
                    {
                      color: selectedStatus === 'none' ? '#6B7280' :
                             selectedStatus === 'completed' ? '#10B981' :
                             selectedStatus === 'skipped' ? '#10B981' :
                             selectedStatus === 'failed' ? '#EF4444' : '#6B7280'
                    },
                    fontStyle
                  ]}>
                    {commitment.commitmentType === 'measurement' && commitment.ratingRange && existingRecord?.value !== undefined && existingRecord?.value !== null ?
                      `${existingRecord.value} out of ${commitment.ratingRange.max}` :
                      commitment.commitmentType === 'measurement' && !commitment.ratingRange && existingRecord?.value !== undefined && existingRecord?.value !== null ?
                        (() => {
                          const value = existingRecord.value;
                          const unit = commitment.unit || 'unit';
                          const valueStr = value.toString();
                          const formattedValue = value < 1 && value > 0 && !valueStr.startsWith('0.') ? `0.${valueStr.substring(valueStr.indexOf('.') + 1)}` : valueStr;
                          const displayUnit = getDisplayUnit(unit, value);
                          return `${formattedValue} ${displayUnit}`;
                        })() :
                        (selectedStatus === 'none' ? 'Unknown' :
                         selectedStatus === 'completed' ? 'Complete' :
                         selectedStatus === 'skipped' ? 'Skipped' :
                         selectedStatus === 'failed' ? 'Failed' : 'Unknown')
                    }
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={MODAL_STYLES.closeButton}>
                  <Text style={[MODAL_STYLES.closeText, fontStyle]}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Status Selection - moved up after title */}
              <View style={styles.statusSection}>
                <View style={styles.statusButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.circularStatusButton,
                    { backgroundColor: cellColors.success.background },
                    { opacity: selectedStatus === 'completed' ? 1 : 0.3 }
                  ]}
                  onPress={() => setSelectedStatus('completed')}
                >
                  <CustomCheckmarkIcon size={16} color={cellColors.success.content} strokeWidth={2.4} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.circularStatusButton,
                    { backgroundColor: cellColors.skipped.background },
                    { opacity: selectedStatus === 'skipped' ? 1 : 0.3 }
                  ]}
                  onPress={() => setSelectedStatus('skipped')}
                >
                  <CustomCircleDashIcon size={18} color={cellColors.skipped.content} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.circularStatusButton,
                    { backgroundColor: cellColors.fail.background },
                    { opacity: selectedStatus === 'failed' ? 1 : 0.3 }
                  ]}
                  onPress={() => setSelectedStatus('failed')}
                >
                  <CustomXIcon size={15} color={cellColors.fail.content} strokeWidth={2.2} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.circularStatusButton,
                    { backgroundColor: '#E5E7EB' },
                    { opacity: selectedStatus === 'none' ? 1 : 0.3 }
                  ]}
                  onPress={() => setSelectedStatus('none')}
                >
                </TouchableOpacity>
                </View>
                {/* Triangle indicator below active button */}
                <View style={styles.triangleContainer}>
                  {selectedStatus === 'completed' && <View style={[styles.triangleUp, styles.triangleGreen, { marginLeft: 16 }]} />}
                  {selectedStatus === 'skipped' && <View style={[styles.triangleUp, styles.triangleGreen, { marginLeft: 62 }]} />}
                  {selectedStatus === 'failed' && <View style={[styles.triangleUp, styles.triangleRed, { marginLeft: 108 }]} />}
                  {selectedStatus === 'none' && <View style={[styles.triangleUp, styles.triangleGray, { marginLeft: 154 }]} />}
                </View>
              </View>

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
                          <CustomCheckmarkIcon size={10} color="white" strokeWidth={2.2} />
                        )}
                      </View>
                      <Text style={[
                        styles.requirementText,
                        requirementsChecked[index] && styles.checkedRequirementText,
                        fontStyle
                      ]}>{requirement}</Text>
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
                  <Text style={[styles.sectionTitle, fontStyle]}>
                    Value (in {getDisplayUnit(commitment.unit || 'unit', 2)})
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

              {/* Action Buttons */}
              <View style={MODAL_STYLES.buttonContainer}>
                <TouchableOpacity style={MODAL_STYLES.secondaryButton} onPress={onClose}>
                  <Text style={[MODAL_STYLES.secondaryButtonText, fontStyle]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={MODAL_STYLES.primaryButton} onPress={handleSave}>
                  <Text style={[MODAL_STYLES.primaryButtonText, fontStyle]}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
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
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  leftHeaderContent: {
    flex: 1,
    marginRight: 16,
  },
  dateSubheader: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
    textAlign: 'left',
  },
  titleInHeader: {
    marginBottom: 0,
  },
  statusText: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'left',
  },
  statusSection: {
    marginBottom: 24,
  },
  triangleContainer: {
    height: 8,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 4,
  },
  triangleUp: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  triangleGray: {
    borderBottomColor: '#6B7280',
  },
  triangleGreen: {
    borderBottomColor: '#10B981',
  },
  triangleRed: {
    borderBottomColor: '#EF4444',
  },
  statusButtonsContainer: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'flex-start',
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
    marginBottom: 6,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 0,
    backgroundColor: '#E5E7EB',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedCheckbox: {
    backgroundColor: designTokens.cellColors.light.success.background, // Will need dynamic theming
    borderColor: designTokens.cellColors.light.success.background,
  },
  checkmark: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  requirementText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  checkedRequirementText: {
    color: '#10B981',
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
    borderRadius: MODAL_SIZES.inputBorderRadius,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'flex-start',
  },
  circularStatusButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: 'transparent',
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
