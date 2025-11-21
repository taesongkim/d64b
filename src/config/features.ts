// Feature flags for MVP vs future releases
export const FEATURES = {
  // MVP Features (enabled)
  AUTH: true,
  BASIC_COMMITMENTS: true,
  FRIEND_SYSTEM: true,
  OFFLINE_SYNC: true,
  
  // v1.1 Features (disabled for MVP)
  ANALYTICS_TAB: false,
  SOCIAL_AUTH: false,
  PROFILE_PICTURES: false,
  PUSH_NOTIFICATIONS: false,
  
  // v1.2 Features (disabled for MVP)
  THEMES: false,
  LANGUAGES: false,
  DATA_EXPORT: false,
  LEADERBOARDS: false,
  ACHIEVEMENTS: false,
  TEMPLATES: false,
  ADVANCED_SETTINGS: false,
  ACTIVITY_FEED: false,
  FRIEND_GROUPS: false,
  PROFILE_STATS: false,

  // UI Features
  BOTTOM_NAV_BLUR: true,
};

// Helper to check if feature is enabled
export const isFeatureEnabled = (feature: keyof typeof FEATURES): boolean => {
  return FEATURES[feature];
};

// Helper for "Coming Soon" alerts
export const showComingSoonAlert = (feature: string) => {
  // This will be used in components that need to show coming soon alerts
  return `${feature} will be available in a future update.`;
};

// Helper to check if blur is available on the current platform
export const isBlurAvailable = (): boolean => {
  // expo-blur shows "Unimplemented component" in Expo Go and some simulators
  // Disable blur for now until proper native build environment is available
  return false; // Disabled due to simulator limitations
};
