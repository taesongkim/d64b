import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';

interface CompletionAnimationProps {
  visible: boolean;
  onComplete?: () => void;
}

// Simple celebration animation JSON (inline for demo purposes)
// In a real app, you'd want to use actual Lottie files
const celebrationAnimation = {
  "v": "5.7.4",
  "fr": 30,
  "ip": 0,
  "op": 60,
  "w": 200,
  "h": 200,
  "nm": "Celebration",
  "ddd": 0,
  "assets": [],
  "layers": [
    {
      "ddd": 0,
      "ind": 1,
      "ty": 4,
      "nm": "Circle",
      "sr": 1,
      "ks": {
        "o": {
          "a": 1,
          "k": [
            {
              "i": { "x": [0.833], "y": [0.833] },
              "o": { "x": [0.167], "y": [0.167] },
              "t": 0,
              "s": [0]
            },
            {
              "i": { "x": [0.833], "y": [0.833] },
              "o": { "x": [0.167], "y": [0.167] },
              "t": 15,
              "s": [100]
            },
            {
              "t": 45,
              "s": [0]
            }
          ]
        },
        "r": {
          "a": 1,
          "k": [
            {
              "i": { "x": [0.833], "y": [0.833] },
              "o": { "x": [0.167], "y": [0.167] },
              "t": 0,
              "s": [0]
            },
            {
              "t": 60,
              "s": [360]
            }
          ]
        },
        "p": { "a": 0, "k": [100, 100, 0] },
        "a": { "a": 0, "k": [0, 0, 0] },
        "s": {
          "a": 1,
          "k": [
            {
              "i": { "x": [0.833, 0.833, 0.833], "y": [0.833, 0.833, 0.833] },
              "o": { "x": [0.167, 0.167, 0.167], "y": [0.167, 0.167, 0.167] },
              "t": 0,
              "s": [0, 0, 100]
            },
            {
              "i": { "x": [0.833, 0.833, 0.833], "y": [0.833, 0.833, 0.833] },
              "o": { "x": [0.167, 0.167, 0.167], "y": [0.167, 0.167, 0.167] },
              "t": 15,
              "s": [120, 120, 100]
            },
            {
              "t": 30,
              "s": [100, 100, 100]
            }
          ]
        }
      },
      "ao": 0,
      "shapes": [
        {
          "ty": "gr",
          "it": [
            {
              "d": 1,
              "ty": "el",
              "s": { "a": 0, "k": [50, 50] },
              "p": { "a": 0, "k": [0, 0] },
              "nm": "Ellipse Path 1",
              "mn": "ADBE Vector Shape - Ellipse",
              "hd": false
            },
            {
              "ty": "fl",
              "c": { "a": 0, "k": [0.2, 0.8, 0.4, 1] },
              "o": { "a": 0, "k": 100 },
              "r": 1,
              "bm": 0,
              "nm": "Fill 1",
              "mn": "ADBE Vector Graphic - Fill",
              "hd": false
            },
            {
              "ty": "tr",
              "p": { "a": 0, "k": [0, 0] },
              "a": { "a": 0, "k": [0, 0] },
              "s": { "a": 0, "k": [100, 100] },
              "r": { "a": 0, "k": 0 },
              "o": { "a": 0, "k": 100 },
              "sk": { "a": 0, "k": 0 },
              "sa": { "a": 0, "k": 0 },
              "nm": "Transform"
            }
          ],
          "nm": "Ellipse 1",
          "np": 2,
          "cix": 2,
          "bm": 0,
          "ix": 1,
          "mn": "ADBE Vector Group",
          "hd": false
        }
      ],
      "ip": 0,
      "op": 60,
      "st": 0,
      "bm": 0
    }
  ],
  "markers": []
};

export default function CompletionAnimation({ visible, onComplete }: CompletionAnimationProps) {
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    if (visible && animationRef.current) {
      animationRef.current.play();
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.animationContainer}>
        <LottieView
          ref={animationRef}
          style={styles.animation}
          source={celebrationAnimation}
          autoPlay
          loop={false}
          onAnimationFinish={onComplete}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
  },
  animationContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animation: {
    width: 200,
    height: 200,
  },
});