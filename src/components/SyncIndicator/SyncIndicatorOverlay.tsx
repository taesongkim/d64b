import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SyncIndicator from './SyncIndicator';

export default function SyncIndicatorOverlay() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.overlay, { top: insets.top + 8 }]} pointerEvents="box-none">
      <SyncIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    pointerEvents: 'box-none',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});