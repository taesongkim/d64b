import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Commitment } from '@/store/slices/commitmentsSlice';
import { useFontStyle } from '@/hooks/useFontStyle';
import { useSemanticColors, useThemeMode } from '@/contexts/ThemeContext';
import { getThemeColors, createSemanticColors } from '@/constants/grayscaleTokens';
import { getModalStyles, getModalColors, MODAL_SIZES } from './styles/modalStyles';

interface AddCommitmentModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (commitment: Omit<Commitment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
}

// New commitment types
const COMMITMENT_TYPES = [
  { 
    label: 'Yes/No', 
    value: 'yesno' as const, 
    description: 'Simple completion tracking',
    commitmentType: 'checkbox' as const,
    requirements: null
  },
  { 
    label: 'Multiple Requirements', 
    value: 'multiple' as const, 
    description: 'Track multiple tasks or requirements',
    commitmentType: 'checkbox' as const,
    requirements: ['']
  },
  { 
    label: 'Rating', 
    value: 'rating' as const, 
    description: '1 out of 5, 9/10 ... etc.',
    commitmentType: 'measurement' as const,
    requirements: null
  },
  { 
    label: 'Measure', 
    value: 'measure' as const, 
    description: 'Track amounts, durations, distances, etc.',
    commitmentType: 'measurement' as const,
    requirements: null
  },
];

export default function AddCommitmentModal({ visible, onClose, onAdd }: AddCommitmentModalProps) {
  const fontStyle = useFontStyle();
  const semanticColors = useSemanticColors();
  const themeMode = useThemeMode();
  const colors = getThemeColors(themeMode);
  const modalColors = getModalColors(themeMode);
  const MODAL_STYLES = getModalStyles(themeMode);
  const styles = createStyles(themeMode);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState<'yesno' | 'multiple' | 'rating' | 'measure'>('yesno');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  
  // For Multiple Requirements
  const [requirements, setRequirements] = useState<string[]>(['']);
  
  // For Rating
  const [ratingMin, setRatingMin] = useState('1');
  const [ratingMax, setRatingMax] = useState('5');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSelectedType('yesno');
    setTarget('');
    setUnit('');
    setIsPrivate(false);
    setRequirements(['']);
    setRatingMin('1');
    setRatingMax('5');
  };

  const addRequirement = () => {
    if (requirements.length < 10) {
      setRequirements([...requirements, '']);
    }
  };

  const removeRequirement = (index: number) => {
    if (requirements.length > 1) {
      setRequirements(requirements.filter((_, i) => i !== index));
    }
  };

  const updateRequirement = (index: number, value: string) => {
    const newRequirements = [...requirements];
    newRequirements[index] = value;
    setRequirements(newRequirements);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAdd = () => {
    if (!title.trim()) return;

    // Validation
    if (selectedType === 'multiple') {
      const validRequirements = requirements.filter(req => req.trim());
      if (validRequirements.length === 0) {
        Alert.alert('Error', 'Please add at least one requirement.');
        return;
      }
    }

    if (selectedType === 'measure' && !unit.trim()) {
      Alert.alert('Error', 'Please enter a unit for measurement.');
      return;
    }

    if (selectedType === 'rating') {
      const min = parseInt(ratingMin);
      const max = parseInt(ratingMax);
      if (isNaN(min) || isNaN(max) || min >= max) {
        Alert.alert('Error', 'Rating minimum must be less than maximum.');
        return;
      }
    }

    const selectedTypeConfig = COMMITMENT_TYPES.find(t => t.value === selectedType);
    if (!selectedTypeConfig) return;

    const commitment = {
      title: title.trim(),
      description: description.trim() || undefined,
      color: semanticColors.primaryText, // Theme-aware color
      commitmentType: selectedTypeConfig.commitmentType,
      target: selectedType === 'measure' && target ? parseInt(target) : undefined,
      unit: selectedType === 'measure' ? unit.trim() : undefined,
      requirements: selectedType === 'multiple' ? requirements.filter(req => req.trim()) : undefined,
      ratingRange: selectedType === 'rating' ? { min: parseInt(ratingMin), max: parseInt(ratingMax) } : undefined,
      // Legacy fields for backward compatibility
      type: selectedType === 'yesno' ? 'binary' as const :
            selectedType === 'multiple' ? 'binary' as const :
            selectedType === 'rating' ? 'counter' as const : 'timer' as const,
      streak: 0,
      bestStreak: 0,
      isActive: true,
      isPrivate,
      order_rank: '0', // Will be set by the handler
    };

    onAdd(commitment);
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={MODAL_STYLES.overlay}>
        <View style={MODAL_STYLES.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={MODAL_STYLES.header}>
              <Text style={[MODAL_STYLES.title, fontStyle]}>New Commitment</Text>
              <TouchableOpacity onPress={handleClose} style={MODAL_STYLES.closeButton}>
                <Text style={[MODAL_STYLES.closeText, fontStyle]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Title Input */}
            <View style={styles.section}>
              <Text style={[styles.label, fontStyle]}>Title</Text>
              <TextInput
                style={[styles.input, fontStyle]}
                placeholder="What's your commitment?"
                placeholderTextColor={modalColors.placeholderText}
                value={title}
                onChangeText={setTitle}
                autoFocus
              />
            </View>

            {/* Description Input */}
            <View style={styles.section}>
              <Text style={[styles.label, fontStyle]}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea, fontStyle]}
                placeholder="Add more details..."
                placeholderTextColor={modalColors.placeholderText}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Commitment Type */}
            <View style={styles.section}>
              <Text style={[styles.label, fontStyle]}>Type</Text>
              <View style={styles.typeContainer}>
                {COMMITMENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeOption,
                      selectedType === type.value && styles.selectedType,
                    ]}
                    onPress={() => {
                      setSelectedType(type.value);
                    }}
                  >
                    <Text
                      style={[
                        styles.typeLabel,
                        fontStyle,
                        selectedType === type.value && styles.selectedTypeLabel,
                      ]}
                    >
                      {type.label}
                    </Text>
                    <Text
                      style={[
                        styles.typeDescription,
                        fontStyle,
                        selectedType === type.value && styles.selectedTypeDescription,
                      ]}
                    >
                      {type.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Multiple Requirements */}
            {selectedType === 'multiple' && (
              <View style={styles.section}>
                <Text style={[styles.label, fontStyle]}>Requirements</Text>
                {requirements.map((req, index) => (
                  <View key={index} style={styles.requirementRow}>
                    <TextInput
                      style={[styles.input, styles.requirementInput, fontStyle]}
                      placeholder={`Requirement ${index + 1}`}
                      placeholderTextColor={modalColors.placeholderText}
                      value={req}
                      onChangeText={(value) => updateRequirement(index, value)}
                    />
                    {requirements.length > 1 && (
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeRequirement(index)}
                      >
                        <Text style={[styles.removeButtonText, fontStyle]}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {requirements.length < 10 && (
                  <TouchableOpacity style={styles.addRequirementButton} onPress={addRequirement}>
                    <Text style={[styles.addRequirementText, fontStyle]}>+ Add Requirement</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Rating Range */}
            {selectedType === 'rating' && (
              <View style={styles.section}>
                <Text style={[styles.label, fontStyle]}>Rating Range</Text>
                <View style={styles.ratingContainer}>
                  <View style={styles.ratingInputContainer}>
                    <Text style={[styles.ratingLabel, fontStyle]}>Lowest</Text>
                    <TextInput
                      style={[styles.input, styles.ratingInput, fontStyle]}
                      placeholder="1"
                      placeholderTextColor={modalColors.placeholderText}
                      value={ratingMin}
                      onChangeText={setRatingMin}
                      keyboardType="numeric"
                    />
                  </View>
                  <Text style={[styles.ratingSeparator, fontStyle]}>to</Text>
                  <View style={styles.ratingInputContainer}>
                    <Text style={[styles.ratingLabel, fontStyle]}>Highest</Text>
                    <TextInput
                      style={[styles.input, styles.ratingInput, fontStyle]}
                      placeholder="5"
                      placeholderTextColor={modalColors.placeholderText}
                      value={ratingMax}
                      onChangeText={setRatingMax}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                <View style={styles.comingSoonContainer}>
                  <Text style={[styles.comingSoonText, fontStyle]}>Target (coming soon)</Text>
                  <TextInput
                    style={[styles.input, styles.disabledInput, fontStyle]}
                    placeholder="Target value"
                    placeholderTextColor={modalColors.placeholderText}
                    editable={false}
                  />
                </View>
              </View>
            )}

            {/* Measure Unit and Target */}
            {selectedType === 'measure' && (
              <View style={styles.section}>
                <Text style={[styles.label, fontStyle]}>Unit</Text>
                <TextInput
                  style={[styles.input, fontStyle]}
                  placeholder="minutes, pages, reps, etc."
                  placeholderTextColor={modalColors.placeholderText}
                  value={unit}
                  onChangeText={setUnit}
                />
                <View style={styles.comingSoonContainer}>
                  <Text style={[styles.comingSoonText, fontStyle]}>Target (coming soon)</Text>
                  <TextInput
                    style={[styles.input, styles.disabledInput, fontStyle]}
                    placeholder="Target value"
                    placeholderTextColor={modalColors.placeholderText}
                    editable={false}
                  />
                </View>
              </View>
            )}

            {/* Color selection removed - using uniform blue style */}

            {/* Privacy Toggle */}
            <View style={styles.section}>
              <View style={styles.switchContainer}>
                <View style={styles.switchLabel}>
                  <Text style={[styles.label, fontStyle]}>Private Commitment</Text>
                  <Text style={[styles.switchDescription, fontStyle]}>
                    Only you can see this commitment
                  </Text>
                </View>
                <Switch
                  value={isPrivate}
                  onValueChange={(value) => {
                    setIsPrivate(value);
                  }}
                  trackColor={{ false: colors.gray200, true: semanticColors.primaryText }}
                  thumbColor={isPrivate ? semanticColors.cardBackground : colors.gray400}
                />
              </View>
            </View>

            {/* Action Buttons */}
            <View style={MODAL_STYLES.buttonContainer}>
              <TouchableOpacity style={MODAL_STYLES.secondaryButton} onPress={handleClose}>
                <Text style={[MODAL_STYLES.secondaryButtonText, fontStyle]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[MODAL_STYLES.primaryButton, !title.trim() && MODAL_STYLES.disabledButton]}
                onPress={handleAdd}
                disabled={!title.trim()}
              >
                <Text style={[MODAL_STYLES.primaryButtonText, fontStyle]}>Create</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Create theme-aware styles function
const createStyles = (themeMode: 'light' | 'dark') => {
  const colors = getThemeColors(themeMode);
  const semanticColors = createSemanticColors(themeMode);
  const modalColors = getModalColors(themeMode);

  return StyleSheet.create({
    section: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      color: semanticColors.primaryText,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: modalColors.borderLight,
      borderRadius: MODAL_SIZES.inputBorderRadius,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: semanticColors.primaryText,
      backgroundColor: semanticColors.cardBackground,
    },
    textArea: {
      height: 80,
      textAlignVertical: 'top',
    },
    typeContainer: {
      gap: 8,
    },
    typeOption: {
      borderWidth: 1,
      borderColor: modalColors.borderLight,
      borderRadius: MODAL_SIZES.inputBorderRadius,
      padding: 16,
      backgroundColor: themeMode === 'light' ? modalColors.sectionBackground : colors.gray100,
    },
    selectedType: {
      borderColor: semanticColors.primaryText,
      backgroundColor: themeMode === 'light' ? colors.gray200 : colors.gray200,
    },
    typeLabel: {
      fontSize: 16,
      color: themeMode === 'light' ? colors.gray700 : colors.gray300,
      marginBottom: 4,
    },
    selectedTypeLabel: {
      color: semanticColors.primaryText,
    },
    typeDescription: {
      fontSize: 14,
      color: semanticColors.secondaryText,
    },
    selectedTypeDescription: {
      color: themeMode === 'light' ? colors.gray600 : colors.gray400,
    },
    targetContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    targetInput: {
      flex: 1,
    },
    unitInput: {
      flex: 1,
    },
    colorContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    colorOption: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    selectedColor: {
      borderColor: semanticColors.primaryText,
    },
    switchContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    switchLabel: {
      flex: 1,
    },
    switchDescription: {
      fontSize: 14,
      color: semanticColors.secondaryText,
      marginTop: 2,
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
      borderColor: modalColors.borderLight,
      backgroundColor: themeMode === 'light' ? semanticColors.buttonSecondary : colors.gray200,
      alignItems: 'center',
    },
    cancelText: {
      color: themeMode === 'light' ? semanticColors.secondaryText : colors.white,
      fontSize: 16,
    },
    addButton: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 12,
      backgroundColor: semanticColors.primaryText,
      alignItems: 'center',
    },
    disabledButton: {
      backgroundColor: modalColors.disabledButton,
    },
    addText: {
      color: semanticColors.cardBackground,
      fontSize: 16,
    },
    // New styles for commitment types
    requirementRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 8,
    },
    requirementInput: {
      flex: 1,
    },
    removeButton: {
      width: 32,
      height: 32,
      borderRadius: MODAL_SIZES.closeButtonBorderRadius,
      backgroundColor: themeMode === 'light' ? '#FEE2E2' : '#7F1D1D',
      justifyContent: 'center',
      alignItems: 'center',
    },
    removeButtonText: {
      color: themeMode === 'light' ? '#DC2626' : '#FCA5A5',
      fontSize: 16,
      fontWeight: 'bold',
    },
    addRequirementButton: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: MODAL_SIZES.buttonBorderRadius,
      backgroundColor: modalColors.closeButtonBackground,
      alignItems: 'center',
      marginTop: 8,
    },
    addRequirementText: {
      color: semanticColors.secondaryText,
      fontSize: 14,
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 16,
    },
    ratingInputContainer: {
      flex: 1,
    },
    ratingLabel: {
      fontSize: 14,
      color: semanticColors.secondaryText,
      marginBottom: 4,
    },
    ratingInput: {
      textAlign: 'center',
    },
    ratingSeparator: {
      fontSize: 16,
      color: semanticColors.secondaryText,
      marginTop: 20,
    },
    comingSoonContainer: {
      marginTop: 16,
    },
    comingSoonText: {
      fontSize: 14,
      color: modalColors.placeholderText,
      marginBottom: 8,
      fontStyle: 'italic',
    },
    disabledInput: {
      backgroundColor: modalColors.sectionBackground,
      color: modalColors.placeholderText,
    },
  });
};