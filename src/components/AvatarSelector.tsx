import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Icon } from '@/components/icons';
import AnimalAvatar from './AnimalAvatar';
import { 
  AnimalType, 
  ColorType, 
  ALL_AVATAR_COMBINATIONS, 
  AVAILABLE_ANIMALS,
  AVAILABLE_COLORS,
  AvatarConfig 
} from '@/utils/avatarUtils';

interface AvatarSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (animal: AnimalType, color: ColorType) => void;
  currentAnimal?: AnimalType;
  currentColor?: ColorType;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({
  visible,
  onClose,
  onSelect,
  currentAnimal,
  currentColor
}) => {
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalType | null>(currentAnimal || null);
  const [selectedColor, setSelectedColor] = useState<ColorType | null>(currentColor || null);

  const handleAnimalSelect = (animal: AnimalType) => {
    setSelectedAnimal(animal);
  };

  const handleColorSelect = (color: ColorType) => {
    setSelectedColor(color);
  };

  const handleConfirm = () => {
    if (selectedAnimal && selectedColor) {
      onSelect(selectedAnimal, selectedColor);
      onClose();
    } else {
      Alert.alert('Selection Required', 'Please select both an animal and a color.');
    }
  };

  const handleClear = () => {
    setSelectedAnimal(null);
    setSelectedColor(null);
    onSelect(null as any, null as any); // Clear avatar
    onClose();
  };

  const handleCancel = () => {
    // Reset to original values and close without saving
    setSelectedAnimal(currentAnimal || null);
    setSelectedColor(currentColor || null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Choose Your Avatar</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Animal Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose Animal</Text>
            <View style={styles.animalGrid}>
              {AVAILABLE_ANIMALS.map((animal) => (
                <TouchableOpacity
                  key={animal}
                  style={[
                    styles.animalOption,
                    selectedAnimal === animal && styles.selectedOption
                  ]}
                  onPress={() => handleAnimalSelect(animal)}
                >
                  <AnimalAvatar
                    animal={animal}
                    color={selectedColor || AVAILABLE_COLORS[0]}
                    size={50}
                  />
                  <Text style={styles.animalLabel}>{animal}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Color Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose Color</Text>
            <View style={styles.colorGrid}>
              {AVAILABLE_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    selectedColor === color && styles.selectedOption
                  ]}
                  onPress={() => handleColorSelect(color)}
                >
                  <AnimalAvatar
                    animal={selectedAnimal || 'Kitty'}
                    color={color}
                    size={50}
                  />
                  <Text style={styles.colorLabel}>{color}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Preview */}
          {(selectedAnimal || selectedColor) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Preview</Text>
              <View style={styles.previewContainer}>
                <AnimalAvatar
                  animal={selectedAnimal || AVAILABLE_ANIMALS[0]}
                  color={selectedColor || AVAILABLE_COLORS[0]}
                  size={80}
                />
                <Text style={styles.previewText}>
                  {selectedAnimal && selectedColor 
                    ? `${selectedAnimal} (${selectedColor})`
                    : 'Select animal and color'
                  }
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
          >
            <Text style={styles.clearButtonText}>Clear Avatar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              (!selectedAnimal || !selectedColor) && styles.disabledButton
            ]}
            onPress={handleConfirm}
            disabled={!selectedAnimal || !selectedColor}
          >
            <Text style={[
              styles.confirmText,
              (!selectedAnimal || !selectedColor) && styles.disabledText
            ]}>
              Confirm Selection
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

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
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerSpacer: {
    width: 60, // Same width as cancel button to center title
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  animalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  animalOption: {
    alignItems: 'center',
    width: '30%',
    marginBottom: 20,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  colorGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  colorOption: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  selectedOption: {
    backgroundColor: '#DBEAFE',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  animalLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginTop: 8,
    textAlign: 'center',
  },
  colorLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginTop: 8,
  },
  previewContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
  },
  previewText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 12,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    gap: 12,
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmButton: {
    flex: 2,
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#E5E7EB',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledText: {
    color: '#9CA3AF',
  },
});

export default AvatarSelector;
