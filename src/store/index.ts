import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from 'redux';
import { FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';

import authReducer from './slices/authSlice';
import commitmentsReducer from './slices/commitmentsSlice';
import layoutItemsReducer from './slices/layoutItemsSlice';
import recordsReducer from './slices/recordsSlice';
import socialReducer from './slices/socialSlice';
import syncReducer from './slices/syncSlice';
import settingsReducer from './slices/settingsSlice';
import { databaseMiddleware } from './middleware/databaseMiddleware';

import { logoutGlobal } from './slices/authSlice';

const appReducer = combineReducers({
  auth: authReducer,
  commitments: commitmentsReducer,
  layoutItems: layoutItemsReducer,
  records: recordsReducer,
  social: socialReducer,
  sync: syncReducer,
  settings: settingsReducer,
});

const rootReducer = (state: any, action: any) => {
  if (action.type === 'auth/LOGOUT_GLOBAL') {
    // Clear all persisted state (returns undefined → triggers slice initialState)
    return appReducer(undefined, action);
  }
  return appReducer(state, action);
};

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'settings', 'sync'],
  blacklist: ['commitments', 'layoutItems', 'records', 'social'],
};

// Dev-only: Guard against persist whitelist drift
if (__DEV__) {
  const expectedWhitelist = ['auth', 'settings', 'sync'];
  const actualWhitelist = persistConfig.whitelist;

  const whitelistMatch = expectedWhitelist.length === actualWhitelist.length &&
    expectedWhitelist.every(item => actualWhitelist.includes(item));

  if (!whitelistMatch) {
    console.warn(
      '⚠️  PERSIST WHITELIST DRIFT DETECTED!\n' +
      `Expected: [${expectedWhitelist.join(', ')}]\n` +
      `Actual: [${actualWhitelist.join(', ')}]\n` +
      'This may compromise pre-TestFlight guardrails. Please review changes.'
    );
  }
}

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }), // Temporarily disabled databaseMiddleware since we're doing immediate saves
    // .concat(databaseMiddleware),
});

export const persistor = persistStore(store);

// Export logoutGlobal action for use in AuthContext
export { logoutGlobal } from './slices/authSlice';

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;