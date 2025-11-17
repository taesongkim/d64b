import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ThemeMode } from '@/constants/grayscaleTokens';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeState {
  preference: ThemePreference;
  currentMode: ThemeMode;
  systemMode: ThemeMode;
}

const initialState: ThemeState = {
  preference: 'system', // Default to system preference
  currentMode: 'light', // Will be updated based on system/preference
  systemMode: 'light', // Will be updated by system appearance
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setThemePreference: (state, action: PayloadAction<ThemePreference>) => {
      state.preference = action.payload;

      // Update current mode based on new preference
      if (action.payload === 'system') {
        state.currentMode = state.systemMode;
      } else {
        state.currentMode = action.payload;
      }
    },

    setSystemMode: (state, action: PayloadAction<ThemeMode>) => {
      state.systemMode = action.payload;

      // If user prefers system mode, update current mode
      if (state.preference === 'system') {
        state.currentMode = action.payload;
      }
    },

    toggleTheme: (state) => {
      // Toggle between light and dark only
      if (state.preference === 'light') {
        state.preference = 'dark';
        state.currentMode = 'dark';
      } else {
        state.preference = 'light';
        state.currentMode = 'light';
      }
    }
  },
});

export const { setThemePreference, setSystemMode, toggleTheme } = themeSlice.actions;

// Selectors
export const selectThemePreference = (state: { theme: ThemeState }) => state.theme.preference;
export const selectCurrentThemeMode = (state: { theme: ThemeState }) => state.theme.currentMode;
export const selectSystemThemeMode = (state: { theme: ThemeState }) => state.theme.systemMode;

export default themeSlice.reducer;