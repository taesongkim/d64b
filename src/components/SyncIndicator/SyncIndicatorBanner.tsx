import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Platform, StyleSheet } from 'react-native';
import { SyncState } from '@/hooks/useSyncStatus';

interface SyncIndicatorBannerProps {
  state: SyncState;
}

export default function SyncIndicatorBanner({ state }: SyncIndicatorBannerProps) {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;
  const opacityAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (state.phase === 'syncing') {
      const shimmer = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnimation, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnimation, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      shimmer.start();
      return () => shimmer.stop();
    }
  }, [state.phase, shimmerAnimation]);

  useEffect(() => {
    Animated.timing(opacityAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [opacityAnimation]);

  const handleErrorTap = async () => {
    if (state.phase === 'error') {
      if (Platform.OS === 'ios') {
        try {
          // Dynamically import expo-haptics only if available
          const { Haptics } = await import('expo-haptics');
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {
          // Haptics not available, continue without feedback
        }
      }
      // Retry sync logic would go here
    }
  };

  const getLabel = () => {
    switch (state.phase) {
      case 'syncing':
        return `Syncing ${state.queueCount}…`;
      case 'offline':
        return `Offline — queued ${state.queueCount}`;
      case 'error':
        return 'Sync error — tap to retry';
      case 'done':
        return 'All caught up';
      default:
        return '';
    }
  };

  const getIcon = () => {
    switch (state.phase) {
      case 'syncing':
        return '🔄';
      case 'offline':
        return '📡';
      case 'error':
        return '⚠️';
      case 'done':
        return '✅';
      default:
        return '';
    }
  };

  if (state.phase === 'idle' && state.queueCount === 0) {
    return null;
  }

  const isError = state.phase === 'error';
  const Component = isError ? TouchableOpacity : View;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnimation,
        },
      ]}
    >
      <Component
        onPress={isError ? handleErrorTap : undefined}
        style={styles.content}
        activeOpacity={isError ? 0.7 : 1}
      >
        <Text style={styles.icon}>{getIcon()}</Text>
        <Text style={styles.label}>
          {getLabel()}
        </Text>
      </Component>

      {state.phase === 'syncing' && (
        <View style={styles.progressContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                transform: [
                  {
                    translateX: shimmerAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-100, 300],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 16,
  },
  label: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  progressContainer: {
    marginTop: 4,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    width: '30%',
    backgroundColor: '#60A5FA',
    borderRadius: 1,
  },
});