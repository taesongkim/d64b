import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Platform } from 'react-native';

interface HapticOptions {
  enableVibrateFallback?: boolean;
  ignoreAndroidSystemSettings?: boolean;
}

const defaultOptions: HapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export class HapticService {
  static success(options: HapticOptions = {}) {
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('notificationSuccess', {
        ...defaultOptions,
        ...options,
      });
    } else {
      ReactNativeHapticFeedback.trigger('impactLight', {
        ...defaultOptions,
        ...options,
      });
    }
  }

  static warning(options: HapticOptions = {}) {
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('notificationWarning', {
        ...defaultOptions,
        ...options,
      });
    } else {
      ReactNativeHapticFeedback.trigger('impactMedium', {
        ...defaultOptions,
        ...options,
      });
    }
  }

  static error(options: HapticOptions = {}) {
    if (Platform.OS === 'ios') {
      ReactNativeHapticFeedback.trigger('notificationError', {
        ...defaultOptions,
        ...options,
      });
    } else {
      ReactNativeHapticFeedback.trigger('impactHeavy', {
        ...defaultOptions,
        ...options,
      });
    }
  }

  static light(options: HapticOptions = {}) {
    ReactNativeHapticFeedback.trigger('impactLight', {
      ...defaultOptions,
      ...options,
    });
  }

  static medium(options: HapticOptions = {}) {
    ReactNativeHapticFeedback.trigger('impactMedium', {
      ...defaultOptions,
      ...options,
    });
  }

  static heavy(options: HapticOptions = {}) {
    ReactNativeHapticFeedback.trigger('impactHeavy', {
      ...defaultOptions,
      ...options,
    });
  }

  static selection(options: HapticOptions = {}) {
    ReactNativeHapticFeedback.trigger('selection', {
      ...defaultOptions,
      ...options,
    });
  }
}