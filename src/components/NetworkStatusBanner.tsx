import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useAppSelector } from '@/store/hooks';

export default function NetworkStatusBanner() {
  const { isOnline, isSyncing, queue, error } = useAppSelector(state => state.sync);
  const [fadeAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    const shouldShow = !isOnline || isSyncing || queue.length > 0 || error;
    
    Animated.timing(fadeAnim, {
      toValue: shouldShow ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOnline, isSyncing, queue.length, error, fadeAnim]);

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
        text: 'Syncing...',
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
      <Text style={[styles.text, { color: bannerConfig.textColor }]}>
        {bannerConfig.text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});