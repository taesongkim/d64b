import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import SuccessSparkle from './SuccessSparkle';
import { designTokens } from '@/constants/designTokens';

interface Sparkle {
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  size: number;
  duration: number;
  rotation: number;
}

interface SuccessCellAnimationProps {
  isSuccess: boolean;
  cellWidth: number;
  cellHeight: number;
  onAnimationComplete?: () => void;
  userTriggered?: boolean;
}

/**
 * Success cell animation component that handles:
 * 1. Spring-in fill animation for success background
 * 2. Radiating triangle sparkles from cell perimeter
 * 3. Fast tween-out on success removal
 */
export default function SuccessCellAnimation({
  isSuccess,
  cellWidth,
  cellHeight,
  onAnimationComplete,
  userTriggered = true
}: SuccessCellAnimationProps) {
  const fillScale = useRef(new Animated.Value(0)).current;
  const sparkleAnimations = useRef<Animated.Value[]>([]).current;
  const sparkleOpacity = useRef<Animated.Value[]>([]).current;
  const sparkleScale = useRef<Animated.Value[]>([]).current;
  const [sparkles, setSparkles] = React.useState<Sparkle[]>([]);

  // Generate sparkles when success state changes to true
  const generateSparkles = () => {
    const sparkleCount = 12;
    const rotationOffset = Math.random() * Math.PI * 2;

    // Calculate sparkle positions relative to container center
    // Container is (cellWidth + 32) x (cellHeight + 32) centered on cell
    // Start sparkles just outside cell edge
    const baseRadius = Math.max(cellWidth, cellHeight) / 2 + 4; // Start 4 pixels outside cell edge

    const newSparkles: Sparkle[] = Array.from({ length: sparkleCount }, (_, i) => {
      const angle = (i / sparkleCount) * Math.PI * 2 + rotationOffset;

      // Calculate position on rounded rectangle perimeter
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      const maxAxis = Math.max(Math.abs(x), Math.abs(y));

      // Start positions (from cell perimeter)
      const startX = (x / maxAxis) * baseRadius;
      const startY = (y / maxAxis) * baseRadius;

      // Variable travel distances - tighter animation
      const isEveryThird = i % 3 === 0;
      const travelDistance = isEveryThird ? 2 : 4;
      const endX = (x / maxAxis) * (baseRadius + travelDistance);
      const endY = (y / maxAxis) * (baseRadius + travelDistance);

      // Variable sizes
      const shouldBeSmall = i % 2 === 0 || i % 3 === 0;
      let size = shouldBeSmall ? 0.4 : 1;

      // Reduce size of specific large sparkles
      if (!shouldBeSmall && (i === 1 || i === 5)) {
        size = 0.75;
      }

      return {
        id: Date.now() + i,
        x: endX,
        y: endY,
        startX,
        startY,
        size,
        duration: isEveryThird ? 300 : 400,
        rotation: Math.random() * 360,
      };
    });

    return newSparkles;
  };

  // Animate sparkles
  const animateSparkles = (sparkles: Sparkle[]) => {
    // Clear previous animations
    sparkleAnimations.length = 0;
    sparkleOpacity.length = 0;
    sparkleScale.length = 0;

    sparkles.forEach((sparkle, index) => {
      const positionAnim = new Animated.Value(0);
      const opacityAnim = new Animated.Value(1);
      const scaleAnim = new Animated.Value(0);

      sparkleAnimations[index] = positionAnim;
      sparkleOpacity[index] = opacityAnim;
      sparkleScale[index] = scaleAnim;

      // Animate position, scale, and opacity

      Animated.parallel([
        Animated.timing(positionAnim, {
          toValue: 1,
          duration: sparkle.duration,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: sparkle.duration * 0.3,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.5,
            duration: sparkle.duration * 0.2,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0,
            duration: sparkle.duration * 0.5,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: sparkle.duration * 0.75,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: sparkle.duration * 0.25,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });

    // Clear sparkles after animation
    setTimeout(() => {
      setSparkles([]);
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    }, Math.max(...sparkles.map(s => s.duration)));
  };

  // Main animation effect
  useEffect(() => {
    if (isSuccess) {
      console.log('✨ Success animation starting at', Date.now());
      // Spring-in fill animation
      Animated.spring(fillScale, {
        toValue: 1,
        tension: 1000,
        friction: 30,
        useNativeDriver: true,
      }).start();

      // Generate and animate sparkles only if user-triggered
      if (userTriggered) {
        const newSparkles = generateSparkles();
        setSparkles(newSparkles);
        animateSparkles(newSparkles);
      }
    } else {
      // Fast tween-out
      Animated.timing(fillScale, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }).start();
      setSparkles([]);
    }
  }, [isSuccess]);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* Success fill background */}
      {isSuccess && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: designTokens.colors.success,
            borderRadius: designTokens.radius.sm,
            transform: [{ scale: fillScale }],
          }}
        />
      )}

      {/* Sparkles container - expanded for larger radius */}
      <View
        style={{
          position: 'absolute',
          top: -16,
          left: -16,
          width: cellWidth + 32,
          height: cellHeight + 32,
          pointerEvents: 'none',
          zIndex: 1000, // Ensure sparkles appear above neighboring cells
        }}
      >
        {sparkles.map((sparkle, index) => {
          const animatedPosition = sparkleAnimations[index];
          const animatedOpacity = sparkleOpacity[index];
          const animatedScale = sparkleScale[index];

          if (!animatedPosition || !animatedOpacity || !animatedScale) {
            return null;
          }

          return (
            <Animated.View
              key={sparkle.id}
              style={{
                position: 'absolute',
                left: 16 + cellWidth / 2 - 6, // Center 12x12 container for largest triangle
                top: 16 + cellHeight / 2 - 6,
                width: 12, // Size to contain largest triangle (size=1 * 12)
                height: 12,
                transform: [
                  {
                    translateX: animatedPosition.interpolate({
                      inputRange: [0, 1],
                      outputRange: [sparkle.startX, sparkle.x],
                    }),
                  },
                  {
                    translateY: animatedPosition.interpolate({
                      inputRange: [0, 1],
                      outputRange: [sparkle.startY, sparkle.y],
                    }),
                  },
                  {
                    scale: animatedScale,
                  },
                ],
                opacity: animatedOpacity,
              }}
            >
              <SuccessSparkle size={sparkle.size} rotation={sparkle.rotation} />
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}