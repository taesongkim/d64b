import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Icon } from './icons';

interface NameEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (newName: string) => void;
  currentName: string;
  currentEmail: string;
}

export default function NameEditModal({
  visible,
  onClose,
  onSave,
  currentName,
  currentEmail,
}: NameEditModalProps): React.JSX.Element {
  const [name, setName] = useState(currentName);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(currentName);
    }
  }, [visible, currentName]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    if (name.trim() === currentName) {
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      await onSave(name.trim());
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to update name. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setName(currentName);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Name</Text>
          <TouchableOpacity 
            onPress={handleSave} 
            style={[styles.saveButton, isLoading && styles.disabledButton]}
            disabled={isLoading}
          >
            <Text style={[styles.saveText, isLoading && styles.disabledText]}>
              {isLoading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.inputSection}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="#9CA3AF"
              autoFocus
              maxLength={50}
            />
            <Text style={styles.helperText}>
              This is how your name will appear to friends
            </Text>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Current Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Email:</Text>
              <Text style={styles.infoValue}>{currentEmail}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Current Name:</Text>
              <Text style={styles.infoValue}>{currentName || 'Not set'}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Manrope_500Medium',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Manrope_600SemiBold',
    color: '#111827',
  },
  saveButton: {
    padding: 8,
  },
  saveText: {
    fontSize: 16,
    color: '#3B82F6',
    fontFamily: 'Manrope_600SemiBold',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#9CA3AF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  inputSection: {
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Manrope_400Regular',
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  helperText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    fontFamily: 'Manrope_400Regular',
  },
  infoSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    color: '#374151',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoKey: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Manrope_500Medium',
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontFamily: 'Manrope_400Regular',
    flex: 1,
  },
});
