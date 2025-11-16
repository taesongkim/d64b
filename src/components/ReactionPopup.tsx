import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions, Animated } from 'react-native';
import CustomXIcon from './CustomXIcon';
import CustomCircleDashIcon from './CustomCircleDashIcon';
import CustomCheckmarkIcon from './CustomCheckmarkIcon';
import { RecordStatus } from '@/store/slices/recordsSlice';

interface ReactionPopupProps {
  visible: boolean;
  onSelect: (status: RecordStatus) => void;
  onOpenDetails?: () => void;
  onDismiss: () => void;
  position: { x: number; y: number };
}

const { width: screenWidth } = Dimensions.get('window');

export default function ReactionPopup({ visible, onSelect, onOpenDetails, onDismiss, position }: ReactionPopupProps) {
  const fadeAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('🔴 Modal visible prop changed to:', visible, 'at', Date.now());
    if (visible) {
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleModalRequestClose = () => {
    console.log('🟠 Modal onRequestClose called at', Date.now());
    onDismiss();
  };

  const handleInstantHide = (callback: () => void) => {
    console.log('🔵 Starting instant hide animation at', Date.now());
    Animated.timing(fadeAnimation, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      callback();
    });
  };

  const handleSelect = (status: RecordStatus) => {
    console.log('🟡 ReactionPopup.handleSelect called at', Date.now());
    // Call onSelect immediately for instant UI feedback
    onSelect(status);
    // Then start fade animation
    handleInstantHide(() => {});
  };

  const handleOpenDetails = () => {
    if (onOpenDetails) {
      handleInstantHide(() => {
        onOpenDetails();
        onDismiss();
      });
    }
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleModalRequestClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnimation,
          }
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onDismiss}
        />
        <Animated.View style={[styles.popup, {
          left: Math.max(10, Math.min(position.x - 60, screenWidth - 130)),
          top: Math.max(10, position.y - 60),
          opacity: fadeAnimation,
        }]}>
          <TouchableOpacity 
            style={[styles.option, { backgroundColor: '#10B981' }]}
            onPress={() => handleSelect('completed')}
          >
            <CustomCheckmarkIcon size={15.84} color="white" strokeWidth={2.2} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.option, { backgroundColor: '#10B981' }]}
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

          {onOpenDetails && (
            <TouchableOpacity
              style={[styles.option, { backgroundColor: '#9CA3AF' }]}
              onPress={handleOpenDetails}
              accessibilityLabel="Open details"
            >
              <Text style={styles.detailsIcon}>⋯</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </Animated.View>
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
  skipIcon: {
    fontSize: 18,
    color: '#111827',
    fontWeight: 'bold',
  },
  detailsIcon: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
});
