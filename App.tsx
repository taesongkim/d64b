import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { useFonts } from 'expo-font';
import { AuthProvider } from '@/contexts/AuthContext';
import { FontProvider } from '@/contexts/FontContext';
import AppNavigator from '@/navigation/AppNavigator';
import { store, persistor } from '@/store';
import { SyncService } from '@/services/syncService';
import { mark } from '@/_shared/perf';

// Initialize Sentry if DSN is provided and package is available
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (sentryDsn) {
  try {
    // Dynamic import to avoid bundle errors when @sentry/react-native is not installed
    const Sentry = require('@sentry/react-native');
    Sentry.init({
      dsn: sentryDsn,
      tracesSampleRate: 0.1,
    });
  } catch (error) {
    if (__DEV__) {
      console.warn('Sentry initialization failed - @sentry/react-native not installed:', error);
    }
  }
}

export default function App(): React.JSX.Element {
  const [fontsLoaded] = useFonts({
    // Golos Text fonts
    'GolosText-Regular': require('./assets/fonts/GolosText-Regular.ttf'),
    'GolosText-Medium': require('./assets/fonts/GolosText-Medium.ttf'),
    'GolosText-SemiBold': require('./assets/fonts/GolosText-SemiBold.ttf'),
    'GolosText-Bold': require('./assets/fonts/GolosText-Bold.ttf'),
  });

  useEffect(() => {
    // Mark app start for TTFS timing
    mark('app:start');

    // Initialize sync service after store is ready
    const initializeServices = async () => {
      await SyncService.initialize();
    };

    initializeServices();
  }, []);

  // Don't render the app until fonts are loaded
  if (!fontsLoaded) {
    return null;
  }

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <FontProvider>
          <AuthProvider>
            <AppNavigator />
            <StatusBar style="auto" />
          </AuthProvider>
        </FontProvider>
      </PersistGate>
    </Provider>
  );
}
