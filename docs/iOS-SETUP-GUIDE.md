# iOS Setup and Troubleshooting Guide

## Overview
This guide documents how to set up, build, and run the HabitTracker app on iOS, including solutions to common issues encountered during development.

## Prerequisites
- macOS with Xcode installed (version 14+ recommended)
- Node.js 18+ and npm/yarn
- CocoaPods (`sudo gem install cocoapods`)
- EAS CLI for Expo builds (`npm install -g eas-cli`)
- Apple Developer Account (for device builds)

## Initial Setup

### 1. Install Dependencies
```bash
# Install Node modules
npm install

# Install iOS dependencies
cd ios
pod install
cd ..
```

### 2. Environment Variables
Create a `.env` file in the project root:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important:** For Expo, environment variables MUST have the `EXPO_PUBLIC_` prefix to be accessible in the app.

## Running the App

### Method 1: Using Expo (Recommended)
```bash
# Start Metro bundler with cache cleared
npx expo start --clear

# In another terminal, run on iOS
npx expo run:ios
```

### Method 2: Using Xcode
1. Start Metro bundler first:
```bash
npx expo start --clear
```

2. Open Xcode workspace:
```bash
open ios/HabitTracker.xcworkspace
```

3. In Xcode:
   - Select your simulator or device
   - Press the Run button (▶️)

## Common Issues and Solutions

### Issue 1: NativeWind PostCSS Error
**Error:** "Use process(css).then(cb) to work with async plugins"

**Solution:**
Temporarily disable NativeWind in `babel.config.js`:
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // 'nativewind/babel', // Temporarily disabled due to PostCSS issue
    ],
  };
};
```

### Issue 2: Metro Version Conflicts
**Error:** "Package subpath './src/stores/FileStore' is not defined by exports"

**Solution:**
Install compatible Metro versions:
```bash
npm install metro@0.82.5 metro-cache@0.82.5 metro-core@0.82.5 --save-exact
```

### Issue 3: Environment Variables Not Loading
**Error:** "Missing Supabase environment variables"

**Solution:**
1. Ensure variables have `EXPO_PUBLIC_` prefix
2. Restart Metro with cache cleared:
```bash
npx expo start --clear
```

### Issue 4: Multiple Xcode Projects
**Error:** "Found multiple project.pbxproj file paths"

**Solution:**
Remove duplicate Xcode projects:
```bash
rm -rf ios/D64B.xcodeproj  # Remove old project
```

Update Podfile to use correct project:
```ruby
project 'HabitTracker.xcodeproj'
target 'HabitTracker' do
  # ...
end
```

### Issue 5: App Entry Not Found
**Error:** "The app entry point named 'main' was not registered"

**Solution:**
1. Check that `index.ts` properly registers the app:
```typescript
import { registerRootComponent } from 'expo';
import App from './App';
registerRootComponent(App);
```

2. Ensure Metro is running and bundling correctly
3. Check for JavaScript errors in Metro logs

### Issue 6: CocoaPods Issues
**Error:** "Unable to find the Xcode project"

**Solution:**
```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
```

## Build Configuration

### EAS Build Setup
1. Configure EAS:
```bash
eas build:configure --platform ios
```

2. For simulator builds (no Apple Developer account needed):
Edit `eas.json`:
```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    }
  }
}
```

3. Build:
```bash
eas build --platform ios --profile preview
```

### Local Builds with Xcode
1. Ensure you have proper signing certificates
2. Select your development team in Xcode
3. Build directly from Xcode (Product → Build)

## Development Workflow

### Hot Reloading
- Press `Cmd + R` in iOS Simulator to reload
- Shake device (`Cmd + Ctrl + Z`) for developer menu

### Debugging
- Use React Native Debugger or Flipper
- Check Metro logs for bundle errors
- Use Xcode console for native errors

### Performance Monitoring
- Enable FPS monitor in developer menu
- Use Xcode Instruments for profiling
- Target 60fps on iPhone 8 and newer

## Project Structure

```
ios/
├── HabitTracker/           # Main app code
│   ├── AppDelegate.swift  # App entry point
│   ├── Info.plist         # App configuration
│   └── Images.xcassets/   # App icons and images
├── HabitTracker.xcodeproj/ # Xcode project
├── HabitTracker.xcworkspace/ # Xcode workspace (use this)
├── Podfile                # CocoaPods dependencies
└── Pods/                  # Installed pods
```

## Deployment Checklist

- [ ] Environment variables properly set
- [ ] Metro bundler running without errors
- [ ] All dependencies installed (`npm install` and `pod install`)
- [ ] Correct Xcode project selected (HabitTracker.xcworkspace)
- [ ] Signing certificates configured (for device builds)
- [ ] Bundle size under 20MB target
- [ ] Performance at 60fps on target devices

## Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Troubleshooting React Native](https://reactnative.dev/docs/troubleshooting)