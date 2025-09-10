import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { Commitment } from '@/store/slices/commitmentsSlice';
import { HapticService } from '@/services/hapticService';

interface AddCommitmentModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (commitment: Omit<Commitment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
}

// Colors removed - using uniform blue style

const COMMITMENT_TYPES = [
  { label: 'Yes/No', value: 'binary' as const, description: 'Simple completion tracking' },
  { label: 'Counter', value: 'counter' as const, description: 'Track a specific number' },
  { label: 'Timer', value: 'timer' as const, description: 'Track time duration' },
];

export default function AddCommitmentModal({ visible, onClose, onAdd }: AddCommitmentModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // Color selection removed - using uniform blue
  const [selectedType, setSelectedType] = useState<'binary' | 'counter' | 'timer'>('binary');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSelectedType('binary');
    setTarget('');
    setUnit('');
    setIsPrivate(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAdd = () => {
    if (!title.trim()) return;

    const commitment = {
      title: title.trim(),
      description: description.trim() || undefined,
      color: '#3B82F6', // Uniform blue color
      type: selectedType,
      target: selectedType !== 'binary' && target ? parseInt(target) : undefined,
      unit: selectedType !== 'binary' && unit ? unit.trim() : undefined,
      streak: 0,
      bestStreak: 0,
      isActive: true,
      isPrivate,
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
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Text style={styles.title}>New Commitment</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Title Input */}
            <View style={styles.section}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="What's your commitment?"
                placeholderTextColor="#9CA3AF"
                value={title}
                onChangeText={setTitle}
                autoFocus
              />
            </View>

            {/* Description Input */}
            <View style={styles.section}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add more details..."
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Commitment Type */}
            <View style={styles.section}>
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeContainer}>
                {COMMITMENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeOption,
                      selectedType === type.value && styles.selectedType,
                    ]}
                    onPress={() => {
                      HapticService.selection();
                      setSelectedType(type.value);
                    }}
                  >
                    <Text
                      style={[
                        styles.typeLabel,
                        selectedType === type.value && styles.selectedTypeLabel,
                      ]}
                    >
                      {type.label}
                    </Text>
                    <Text
                      style={[
                        styles.typeDescription,
                        selectedType === type.value && styles.selectedTypeDescription,
                      ]}
                    >
                      {type.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Target and Unit (for counter/timer types) */}
            {selectedType !== 'binary' && (
              <View style={styles.section}>
                <Text style={styles.label}>
                  {selectedType === 'counter' ? 'Target Amount' : 'Target Duration'}
                </Text>
                <View style={styles.targetContainer}>
                  <TextInput
                    style={[styles.input, styles.targetInput]}
                    placeholder={selectedType === 'counter' ? '8' : '30'}
                    placeholderTextColor="#9CA3AF"
                    value={target}
                    onChangeText={setTarget}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.input, styles.unitInput]}
                    placeholder={selectedType === 'counter' ? 'glasses' : 'minutes'}
                    placeholderTextColor="#9CA3AF"
                    value={unit}
                    onChangeText={setUnit}
                  />
                </View>
              </View>
            )}

            {/* Color selection removed - using uniform blue style */}

            {/* Privacy Toggle */}
            <View style={styles.section}>
              <View style={styles.switchContainer}>
                <View style={styles.switchLabel}>
                  <Text style={styles.label}>Private Commitment</Text>
                  <Text style={styles.switchDescription}>
                    Only you can see this commitment
                  </Text>
                </View>
                <Switch
                  value={isPrivate}
                  onValueChange={(value) => {
                    HapticService.selection();
                    setIsPrivate(value);
                  }}
                  trackColor={{ false: '#E5E7EB', true: '#111827' }}
                  thumbColor={isPrivate ? '#FFFFFF' : '#9CA3AF'}
                />
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.addButton, !title.trim() && styles.disabledButton]} 
                onPress={handleAdd}
                disabled={!title.trim()}
              >
                <Text style={styles.addText}>Add Commitment</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Manrope_700Bold',
    color: '#111827',
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
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    color: '#111827',
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeContainer: {
    gap: 8,
  },
  typeOption: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FAFAFA',
  },
  selectedType: {
    borderColor: '#111827',
    backgroundColor: '#F9FAFB',
  },
  typeLabel: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    color: '#374151',
    marginBottom: 4,
  },
  selectedTypeLabel: {
    color: '#111827',
  },
  typeDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectedTypeDescription: {
    color: '#4B5563',
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
    borderColor: '#111827',
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
    color: '#6B7280',
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
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelText: {
    color: '#6B7280',
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
  },
  addButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  addText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
  },
});