/* global setTimeout, clearTimeout */
import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getShimmerGradient, RING_THICKNESS, type ColorScheme } from './gridPalette';

interface TodayRingShimmerProps {
  size: number;
  radius: number;
  ringColor: string;
  isVisible: boolean;
  rowIndex: number;
  reduceMotion: boolean;
  colorScheme: ColorScheme;
}

const SHIMMER_DURATION = 1600; // ms - continuous loop duration
const SHIMMER_DELAY_PER_ROW = 50; // ms - cascade delay

export default function TodayRingShimmer({
  size,
  radius,
  ringColor,
  isVisible,
  rowIndex,
  reduceMotion,
  colorScheme,
}: TodayRingShimmerProps): React.JSX.Element {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  // Memoized gradient colors for shimmer effect
  const gradientColors = useMemo(() =>
    getShimmerGradient(ringColor, colorScheme),
    [ringColor, colorScheme]
  );

  // Memoized styles to prevent recreation
  const containerStyle = useMemo(() => [
    styles.container,
    {
      width: size,
      height: size,
      borderRadius: radius,
    },
  ], [size, radius]);

  const innerCoverStyle = useMemo(() => [
    styles.innerCover,
    {
      top: RING_THICKNESS,
      left: RING_THICKNESS,
      right: RING_THICKNESS,
      bottom: RING_THICKNESS,
      borderRadius: Math.max(0, radius - RING_THICKNESS),
    },
  ], [radius]);

  const gradientStyle = useMemo(() => [
    styles.gradient,
    {
      borderRadius: radius,
    },
  ], [radius]);

  // Animation setup with cascade delay
  useEffect(() => {
    if (!isVisible || reduceMotion) {
      shimmerAnimation.stopAnimation();
      return;
    }

    const startAnimation = () => {
      shimmerAnimation.setValue(0);
      Animated.loop(
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: SHIMMER_DURATION,
          easing: Easing.linear,
          useNativeDriver: false, // Linear gradient requires layout changes
        })
      ).start();
    };

    // Apply cascade delay based on row index
    const delay = rowIndex * SHIMMER_DELAY_PER_ROW;
    const timeout = setTimeout(startAnimation, delay);

    return () => {
      clearTimeout(timeout);
      shimmerAnimation.stopAnimation();
    };
  }, [isVisible, reduceMotion, rowIndex, shimmerAnimation]);

  // Static ring for reduce motion
  if (reduceMotion) {
    return (
      <View style={containerStyle} pointerEvents="none">
        <View style={[styles.staticRing, { borderColor: ringColor, borderRadius: radius }]} />
      </View>
    );
  }

  // Animated shimmer transform
  const shimmerTransform = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['-100%', '100%'], // Diagonal sweep from top-left to bottom-right
  });

  return (
    <View style={containerStyle} pointerEvents="none">
      <Animated.View
        style={[
          gradientStyle,
          {
            transform: [
              { translateX: shimmerTransform },
              { translateY: shimmerTransform },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.5, 1]}
          style={gradientStyle}
        />
      </Animated.View>

      {/* Inner cover to create ring effect */}
      <View style={innerCoverStyle} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  gradient: {
    width: '100%',
    height: '100%',
  },
  innerCover: {
    position: 'absolute',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  staticRing: {
    width: '100%',
    height: '100%',
    borderWidth: RING_THICKNESS,
  },
});