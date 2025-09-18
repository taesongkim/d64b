import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from 'redux';

import authReducer from './slices/authSlice';
import commitmentsReducer from './slices/commitmentsSlice';
import recordsReducer from './slices/recordsSlice';
import socialReducer from './slices/socialSlice';
import syncReducer from './slices/syncSlice';
import settingsReducer from './slices/settingsSlice';
import { databaseMiddleware } from './middleware/databaseMiddleware';

const rootReducer = combineReducers({
  auth: authReducer,
  commitments: commitmentsReducer,
  records: recordsReducer,
  social: socialReducer,
  sync: syncReducer,
  settings: settingsReducer,
});

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'commitments', 'records', 'social', 'settings'],
  blacklist: ['sync'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }), // Temporarily disabled databaseMiddleware since we're doing immediate saves
    // .concat(databaseMiddleware),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;