import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface NotificationSettings {
  dailyReminders: boolean;
  streakAlerts: boolean;
  socialUpdates: boolean;
  weeklyReports: boolean;
  reminderTime: string; // HH:MM format
}

export interface AppPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timeFormat: '12h' | '24h';
  weekStartsOn: 'sunday' | 'monday';
  units: 'metric' | 'imperial';
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  showInLeaderboards: boolean;
  allowFriendRequests: boolean;
  dataAnalytics: boolean;
}

export interface FeatureFlags {
  sync: {
    useSystemSurfaces: boolean;
  };
}

interface SettingsState {
  notifications: NotificationSettings;
  preferences: AppPreferences;
  privacy: PrivacySettings;
  featureFlags: FeatureFlags;
  lexorankSeedDoneByUser: Record<string, boolean>;
  friendOrderSeedDoneByUser: Record<string, boolean>;
  isLoading: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  notifications: {
    dailyReminders: true,
    streakAlerts: true,
    socialUpdates: false,
    weeklyReports: true,
    reminderTime: '09:00',
  },
  preferences: {
    theme: 'system',
    language: 'en',
    timeFormat: '12h',
    weekStartsOn: 'sunday',
    units: 'metric',
  },
  privacy: {
    profileVisibility: 'friends',
    showInLeaderboards: true,
    allowFriendRequests: true,
    dataAnalytics: true,
  },
  featureFlags: {
    sync: {
      useSystemSurfaces: false,
    },
  },
  lexorankSeedDoneByUser: {},
  friendOrderSeedDoneByUser: {},
  isLoading: false,
  error: null,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    updateNotificationSettings: (state, action: PayloadAction<Partial<NotificationSettings>>) => {
      state.notifications = { ...state.notifications, ...action.payload };
    },
    updateAppPreferences: (state, action: PayloadAction<Partial<AppPreferences>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },
    updatePrivacySettings: (state, action: PayloadAction<Partial<PrivacySettings>>) => {
      state.privacy = { ...state.privacy, ...action.payload };
    },
    updateFeatureFlags: (state, action: PayloadAction<Partial<FeatureFlags>>) => {
      state.featureFlags = { ...state.featureFlags, ...action.payload };
    },
    setLexorankSeedDoneForUser: (state, action: PayloadAction<{ userId: string; done: boolean }>) => {
      const { userId, done } = action.payload;
      state.lexorankSeedDoneByUser[userId] = done;
    },
    setFriendOrderSeedDoneForUser: (state, action: PayloadAction<{ userId: string; done: boolean }>) => {
      const { userId, done } = action.payload;
      // Ensure the object exists before setting properties
      if (!state.friendOrderSeedDoneByUser) {
        state.friendOrderSeedDoneByUser = {};
      }
      state.friendOrderSeedDoneByUser[userId] = done;
    },
    resetSettings: (state) => {
      state.notifications = initialState.notifications;
      state.preferences = initialState.preferences;
      state.privacy = initialState.privacy;
      state.featureFlags = initialState.featureFlags;
      state.lexorankSeedDoneByUser = initialState.lexorankSeedDoneByUser;
      state.friendOrderSeedDoneByUser = initialState.friendOrderSeedDoneByUser;
    },
    importSettings: (state, action: PayloadAction<Partial<SettingsState>>) => {
      const { notifications, preferences, privacy, featureFlags } = action.payload;
      if (notifications) state.notifications = { ...state.notifications, ...notifications };
      if (preferences) state.preferences = { ...state.preferences, ...preferences };
      if (privacy) state.privacy = { ...state.privacy, ...privacy };
      if (featureFlags) state.featureFlags = { ...state.featureFlags, ...featureFlags };
    },
  },
});

export const {
  setLoading,
  setError,
  updateNotificationSettings,
  updateAppPreferences,
  updatePrivacySettings,
  updateFeatureFlags,
  setLexorankSeedDoneForUser,
  setFriendOrderSeedDoneForUser,
  resetSettings,
  importSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;