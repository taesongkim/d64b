import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Hook to detect if the user has enabled "Reduce Motion" accessibility setting
 * @returns boolean indicating if motion should be reduced/disabled
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    // Get initial state
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);

    // Listen for changes
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );

    return () => {
      subscription?.remove();
    };
  }, []);

  return reduceMotion;
}