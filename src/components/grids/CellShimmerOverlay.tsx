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

const SHIMMER_OPACITY = 0.9;
const SHIMMER_DURATION_MS = 1500;
const SHIMMER_PAUSE_MS = 700;
const CASCADE_DELAY = 100; // ms per row

export default function CellShimmerOverlay({
  size,
  radius,
  rowIndex,
  isToday,
  isVisible,
  reduceMotion,
}: CellShimmerOverlayProps): React.JSX.Element | null {
  // Single band animated value
  const translateX = useRef(new Animated.Value(0)).current;

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

  const bandStyle = useMemo((): Animated.AnimatedProps<ImageStyle> => ({
    ...bandBaseStyle,
    opacity: SHIMMER_OPACITY,
    transform: [
      { rotate: '45deg' },
      { translateX: translateX },
    ],
  }), [bandBaseStyle, translateX]);

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
      // Static band at 90% opacity for reduce motion
      translateX.setValue(0);
      return;
    }

    // Single band with pause between loops
    const initialDelay = rowIndex * CASCADE_DELAY;

    // Set initial position
    translateX.setValue(-span);

    // Create timing + delay sequence
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: span,
          duration: SHIMMER_DURATION_MS,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.delay(SHIMMER_PAUSE_MS),
      ]),
      { resetBeforeIteration: true }
    );

    // Start animation after initial cascade delay
    // eslint-disable-next-line no-undef
    const timeout = setTimeout(() => {
      animation.start();
    }, initialDelay);

    return () => {
      // eslint-disable-next-line no-undef
      clearTimeout(timeout);
      animation.stop();
    };
  }, [isToday, isVisible, reduceMotion, rowIndex, span, translateX]);

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
        // Single animated band with pause sequence
        <Animated.Image
          source={shimmerAsset}
          style={bandStyle}
          resizeMode="cover"
        />
      )}
    </Animated.View>
  );
}

