import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { AuthProvider } from '@/contexts/AuthContext';
import AppNavigator from '@/navigation/AppNavigator';
import { store, persistor } from '@/store';
import { SyncService } from '@/services/syncService';

export default function App(): React.JSX.Element {
  useEffect(() => {
    // Initialize sync service after store is ready
    const initializeServices = async () => {
      await SyncService.initialize();
    };
    
    initializeServices();
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AuthProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </AuthProvider>
      </PersistGate>
    </Provider>
  );
}
