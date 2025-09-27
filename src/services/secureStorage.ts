import AsyncStorage from '@react-native-async-storage/async-storage';

// Try to use SecureStore if available, fallback to AsyncStorage
let secureStoreImpl: any = null;
try {
  secureStoreImpl = require('expo-secure-store');
  if (__DEV__) {
    console.log('✅ Using SecureStore for secure session storage');
  }
} catch (error) {
  if (__DEV__) {
    console.warn('⚠️  expo-secure-store not available, falling back to AsyncStorage for session storage');
  }
}

export const secureStorage = {
  getItem: (key: string) => {
    if (secureStoreImpl) {
      return secureStoreImpl.getItemAsync(key);
    }
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (secureStoreImpl) {
      return secureStoreImpl.setItemAsync(key, value);
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (secureStoreImpl) {
      return secureStoreImpl.deleteItemAsync(key);
    }
    return AsyncStorage.removeItem(key);
  },
};