import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  ImageStyle,
  ViewStyle,
} from 'react-native';

interface CellShimmerOverlayProps {
  size: number;
  radius: number;
  rowIndex: number;
  isToday: boolean;
  isVisible: boolean;
  reduceMotion: boolean;
}

// eslint-disable-next-line no-undef
const shimmerAsset = require('../../../assets/ui/shimmer-diagonal.png');

export default function CellShimmerOverlay({
  size,
  radius,
  rowIndex,
  isToday,
  isVisible,
  reduceMotion,
}: CellShimmerOverlayProps): React.JSX.Element | null {
  const translateX = useRef(new Animated.Value(-size * 1.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;

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

  const shimmerImageStyle = useMemo((): Animated.AnimatedProps<ImageStyle> => ({
    width: size * 2,
    height: size * 2,
    position: 'absolute',
    top: -size * 0.5,
    left: 0,
    transform: [
      { rotate: '45deg' },
      { translateX },
    ],
    opacity,
  }), [size, translateX, opacity]);

  useEffect(() => {
    if (!isToday || !isVisible || reduceMotion) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      return;
    }

    const cascadeDelay = rowIndex * 100;
    const animationDuration = 1200;
    const cyclePause = 2000;

    const startAnimation = () => {
      translateX.setValue(-size * 1.5);

      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: size * 1.5,
          duration: animationDuration,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(cyclePause),
      ]).start(({ finished }) => {
        if (finished) {
          startAnimation();
        }
      });
    };

    // eslint-disable-next-line no-undef
    const timeoutId = setTimeout(startAnimation, cascadeDelay);

    return () => {
      // eslint-disable-next-line no-undef
      clearTimeout(timeoutId);
      opacity.stopAnimation();
      translateX.stopAnimation();
    };
  }, [isToday, isVisible, reduceMotion, rowIndex, size, translateX, opacity]);

  if (!isToday || !isVisible) {
    return null;
  }

  return (
    <Animated.View style={containerStyle}>
      <Animated.Image
        source={shimmerAsset}
        style={shimmerImageStyle}
        resizeMode="cover"
      />
    </Animated.View>
  );
}