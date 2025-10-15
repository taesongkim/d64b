import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  ImageStyle,
  ViewStyle,
  Easing,
} from 'react-native';

interface CellShimmerOverlayProps {
  size: number;
  radius: number;
  rowIndex: number;
  isToday: boolean;
  isVisible: boolean;
  reduceMotion: boolean;
}

// Full-white shimmer asset - opacity applied at runtime
// eslint-disable-next-line no-undef
const shimmerAsset = require('../../../assets/ui/shimmer-diagonal.png');

const SHIMMER_OPACITY = 0.5;
const ANIMATION_DURATION = 1500;
const CASCADE_DELAY = 100; // ms per row

export default function CellShimmerOverlay({
  size,
  radius,
  rowIndex,
  isToday,
  isVisible,
  reduceMotion,
}: CellShimmerOverlayProps): React.JSX.Element | null {
  // Dual band animated values
  const translateXA = useRef(new Animated.Value(0)).current;
  const translateXB = useRef(new Animated.Value(0)).current;

  // Calculate travel span with overscan for continuous coverage
  const cellDiagonal = size * 1.4142;
  const span = cellDiagonal * 1.25;

  const containerStyle = useMemo((): ViewStyle => ({
    position: 'absolute',
    top: 0,
    left: 0,
    width: size,
    height: size,
    borderRadius: radius,
    overflow: 'hidden',
    pointerEvents: 'none',
  }), [size, radius]);

  const bandBaseStyle = useMemo((): ViewStyle => ({
    position: 'absolute',
    top: -size * 0.5,
    left: 0,
    width: size * 2,
    height: size * 2,
  }), [size]);

  const bandAStyle = useMemo((): Animated.AnimatedProps<ImageStyle> => ({
    ...bandBaseStyle,
    opacity: SHIMMER_OPACITY,
    transform: [
      { rotate: '45deg' },
      { translateX: translateXA },
    ],
  }), [bandBaseStyle, translateXA]);

  const bandBStyle = useMemo((): Animated.AnimatedProps<ImageStyle> => ({
    ...bandBaseStyle,
    opacity: SHIMMER_OPACITY,
    transform: [
      { rotate: '45deg' },
      { translateX: translateXB },
    ],
  }), [bandBaseStyle, translateXB]);

  const staticBandStyle = useMemo((): ViewStyle => ({
    ...bandBaseStyle,
    opacity: SHIMMER_OPACITY,
    transform: [
      { rotate: '45deg' },
      { translateX: 0 },
    ],
  }), [bandBaseStyle]);

  useEffect(() => {
    if (!isToday || !isVisible) {
      return;
    }

    if (reduceMotion) {
      // Static band at 50% opacity for reduce motion
      translateXA.setValue(0);
      translateXB.setValue(0);
      return;
    }

    // Continuous loop setup
    const initialDelay = rowIndex * CASCADE_DELAY;
    const halfPhaseDelay = initialDelay + (ANIMATION_DURATION / 2);

    // Set initial positions
    translateXA.setValue(-span);
    translateXB.setValue(-span);

    // Band A animation (starts at cascade delay)
    const animationA = Animated.loop(
      Animated.timing(translateXA, {
        toValue: span,
        duration: ANIMATION_DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      { resetBeforeIteration: true }
    );

    // Band B animation (starts at half-phase offset)
    const animationB = Animated.loop(
      Animated.timing(translateXB, {
        toValue: span,
        duration: ANIMATION_DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      { resetBeforeIteration: true }
    );

    // Start Band A after initial cascade delay
    // eslint-disable-next-line no-undef
    const timeoutA = setTimeout(() => {
      animationA.start();
    }, initialDelay);

    // Start Band B after half-phase delay
    // eslint-disable-next-line no-undef
    const timeoutB = setTimeout(() => {
      animationB.start();
    }, halfPhaseDelay);

    return () => {
      // eslint-disable-next-line no-undef
      clearTimeout(timeoutA);
      // eslint-disable-next-line no-undef
      clearTimeout(timeoutB);
      animationA.stop();
      animationB.stop();
    };
  }, [isToday, isVisible, reduceMotion, rowIndex, span, translateXA, translateXB]);

  if (!isToday || !isVisible) {
    return null;
  }

  return (
    <Animated.View style={containerStyle}>
      {reduceMotion ? (
        // Static band for reduce motion
        <Animated.Image
          source={shimmerAsset}
          style={staticBandStyle}
          resizeMode="cover"
        />
      ) : (
        <>
          {/* Band A */}
          <Animated.Image
            source={shimmerAsset}
            style={bandAStyle}
            resizeMode="cover"
          />
          {/* Band B - Half phase offset for continuous coverage */}
          <Animated.Image
            source={shimmerAsset}
            style={bandBStyle}
            resizeMode="cover"
          />
        </>
      )}
    </Animated.View>
  );
}

