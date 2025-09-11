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

export default function App(): React.JSX.Element {
  const [fontsLoaded] = useFonts({
    // Golos Text fonts
    'GolosText-Regular': require('./assets/fonts/GolosText-Regular.ttf'),
    'GolosText-Medium': require('./assets/fonts/GolosText-Medium.ttf'),
    'GolosText-SemiBold': require('./assets/fonts/GolosText-SemiBold.ttf'),
    'GolosText-Bold': require('./assets/fonts/GolosText-Bold.ttf'),
  });

  useEffect(() => {
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
