import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions } from 'react-native';
import CustomXIcon from './CustomXIcon';
import CustomCircleDashIcon from './CustomCircleDashIcon';
import { RecordStatus } from '@/store/slices/recordsSlice';

interface ReactionPopupProps {
  visible: boolean;
  onSelect: (status: RecordStatus) => void;
  onDismiss: () => void;
  position: { x: number; y: number };
}

const { width: screenWidth } = Dimensions.get('window');

export default function ReactionPopup({ visible, onSelect, onDismiss, position }: ReactionPopupProps) {
  const handleSelect = (status: RecordStatus) => {
    onSelect(status);
    onDismiss();
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onDismiss}
      >
        <View style={[styles.popup, { 
          left: Math.max(10, Math.min(position.x - 60, screenWidth - 130)),
          top: Math.max(10, position.y - 60)
        }]}>
          <TouchableOpacity 
            style={[styles.option, { backgroundColor: '#3B82F6' }]}
            onPress={() => handleSelect('completed')}
          >
            <Text style={[styles.checkIcon, { color: 'white' }]}>✓</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.option, { backgroundColor: '#3B82F6' }]}
            onPress={() => handleSelect('skipped')}
          >
            <CustomCircleDashIcon size={18} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.option, { backgroundColor: '#EF4444' }]}
            onPress={() => handleSelect('failed')}
          >
            <CustomXIcon size={14} color="white" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  popup: {
    position: 'absolute',
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 25,
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  option: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: '#F9FAFB',
  },
  checkIcon: {
    fontSize: 18,
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  skipIcon: {
    fontSize: 18,
    color: '#3B82F6',
    fontWeight: 'bold',
  },
});
