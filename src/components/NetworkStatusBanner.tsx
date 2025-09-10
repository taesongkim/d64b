import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useAppSelector } from '@/store/hooks';

export default function NetworkStatusBanner() {
  const { isOnline, isSyncing, queue, error } = useAppSelector(state => state.sync);
  const [fadeAnim] = React.useState(new Animated.Value(0));
  const [dotsAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    const shouldShow = !isOnline || isSyncing || queue.length > 0 || error;
    
    Animated.timing(fadeAnim, {
      toValue: shouldShow ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOnline, isSyncing, queue.length, error, fadeAnim]);

  // Start dots animation for long-running processes
  React.useEffect(() => {
    const shouldAnimate = isSyncing || (!isOnline && queue.length > 0) || (queue.length > 0 && isOnline);
    
    if (shouldAnimate) {
      const startDotsAnimation = () => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(dotsAnim, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(dotsAnim, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        ).start();
      };
      
      // Start animation after a short delay to avoid flickering for quick operations
      const timer = setTimeout(startDotsAnimation, 1000);
      return () => clearTimeout(timer);
    } else {
      dotsAnim.setValue(0);
    }
  }, [isSyncing, isOnline, queue.length, dotsAnim]);

  const getBannerConfig = () => {
    if (error) {
      return {
        text: `Sync error: ${error}`,
        backgroundColor: '#EF4444',
        textColor: '#FFFFFF',
      };
    }
    
    if (!isOnline) {
      return {
        text: `Offline ${queue.length > 0 ? `• ${queue.length} pending` : ''}`,
        backgroundColor: '#F59E0B',
        textColor: '#FFFFFF',
      };
    }
    
    if (isSyncing) {
      return {
        text: 'Syncing',
        backgroundColor: '#3B82F6',
        textColor: '#FFFFFF',
      };
    }
    
    if (queue.length > 0) {
      return {
        text: `${queue.length} pending sync`,
        backgroundColor: '#6B7280',
        textColor: '#FFFFFF',
      };
    }
    
    return null;
  };

  const bannerConfig = getBannerConfig();
  
  if (!bannerConfig) {
    return null;
  }

  // Animated dots component for long-running processes
  const AnimatedDots = () => {
    const shouldAnimate = isSyncing || (!isOnline && queue.length > 0) || (queue.length > 0 && isOnline);
    
    if (!shouldAnimate) {
      return null;
    }

    const dotOpacity = dotsAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.dotsContainer}>
        <Animated.Text style={[styles.dot, { opacity: dotOpacity, color: bannerConfig.textColor }]}>.</Animated.Text>
        <Animated.Text style={[styles.dot, { opacity: dotOpacity, color: bannerConfig.textColor }]}>.</Animated.Text>
        <Animated.Text style={[styles.dot, { opacity: dotOpacity, color: bannerConfig.textColor }]}>.</Animated.Text>
      </View>
    );
  };

  return (
    <Animated.View 
      style={[
        styles.banner, 
        { 
          backgroundColor: bannerConfig.backgroundColor,
          opacity: fadeAnim,
        }
      ]}
    >
      <View style={styles.textContainer}>
        <Text style={[styles.text, { color: bannerConfig.textColor }]}>
          {bannerConfig.text}
        </Text>
        <AnimatedDots />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginLeft: 2,
  },
  dot: {
    fontSize: 12,
    fontWeight: '500',
  },
});