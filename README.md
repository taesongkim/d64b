# HabitTracker (D64B) - Minimalist Habit Tracker

A React Native habit tracking app with Expo, featuring offline-first architecture and social accountability.

## Quick Start

### Prerequisites
- Node.js 18+
- Xcode (for iOS development)
- CocoaPods (`sudo gem install cocoapods`)

### Installation & Running

```bash
# 1. Install dependencies
npm install
cd ios && pod install && cd ..

# 2. Set up environment variables
# Create .env file with:
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# 3. Start Metro bundler
npx expo start --clear

# 4. Run on iOS Simulator
# Open a new terminal and run:
npx expo run:ios

# OR open in Xcode:
open ios/HabitTracker.xcworkspace
# Then press Run (▶️)
```

### Development Features

- **Dev Mode Bypass**: In development, use "👨‍💻 Dev Mode: Skip Login" button to bypass authentication
- **Hot Reload**: Press `Cmd + R` in simulator to reload
- **Debug Menu**: Press `Cmd + Ctrl + Z` in simulator

### Common Commands

```bash
# Start Metro bundler
npx expo start --clear

# Run on iOS
npx expo run:ios

# Build for simulator (no Apple account needed)
eas build --platform ios --profile preview

# Clean and rebuild
cd ios && rm -rf Pods Podfile.lock && pod install && cd ..
npx expo start --clear
```

### Project Structure

```
├── src/
│   ├── screens/        # Screen components
│   ├── components/     # Reusable components
│   ├── navigation/     # Navigation setup
│   ├── services/       # External services (Supabase)
│   ├── contexts/       # React contexts
│   └── types/          # TypeScript types
├── ios/                # iOS native code
├── docs/              # Documentation
└── task-md/           # Development planning
```

### Troubleshooting

See [docs/iOS-SETUP-GUIDE.md](docs/iOS-SETUP-GUIDE.md) for detailed setup instructions and solutions to common issues including:
- NativeWind PostCSS errors
- Metro version conflicts
- Environment variable issues
- Multiple Xcode project conflicts
- App entry point errors

### Tech Stack

- **Frontend**: React Native with Expo SDK
- **State Management**: Redux Toolkit
- **Navigation**: React Navigation
- **Backend**: Supabase (PostgreSQL + Auth)
- **Offline Storage**: SQLite + MMKV
- **Styling**: React Native StyleSheet (NativeWind temporarily disabled)
- **Animations**: React Native Reanimated 3

### Development Status

Currently implementing MVP features:
- ✅ Authentication UI
- ✅ iOS build configuration
- 🚧 Dashboard with habit grid
- 🚧 Social features
- 🚧 Offline sync

### License

Private project - All rights reserved