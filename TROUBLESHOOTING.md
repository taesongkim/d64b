# iOS Simulator "No script URL provided" Error - Troubleshooting Protocol

## Quick Diagnosis Steps (in order)

### 0. Expo Go vs Development Build Error (Code 115)
If you get `xcrun simctl openurl` error with code 115:
```bash
# Use development build instead of Expo Go
npm run ios

# Alternative fixes if needed:
xcrun simctl shutdown [DEVICE_ID]
xcrun simctl boot [DEVICE_ID]
# Or try tunnel mode: npx expo start --tunnel --ios
```
**Note**: Projects with `"newArchEnabled": true` work better with development builds.

### 1. Check Metro Bundler Status
```bash
# Check if Metro is running
ps aux | grep -i metro

# Check if port 8081 is in use
netstat -an | grep 8081
```

### 2. Start Metro if Not Running
```bash
# Start Metro bundler
npm start

# Or start with specific platform
npm run dev:ios    # For iOS
npm run dev:android # For Android
```

### 3. Clear Cache if Metro Starts but Error Persists
```bash
# Clear Metro cache
npx expo start --clear

# Or clear React Native cache
npx react-native start --reset-cache
```

### 4. Network Connection Issues
```bash
# Check if simulator can reach localhost
# In iOS Simulator: Safari -> navigate to http://localhost:8081
# Should show Metro bundler interface

# Alternative: Use computer's IP instead of localhost
ifconfig | grep "inet " | grep -v 127.0.0.1
# Then start Metro with specific host:
npx expo start --host tunnel
```

### 5. Configuration Issues
```bash
# Verify app.json/app.config.js syntax
npx expo config --type public

# Check for conflicting Metro configs
ls -la | grep metro

# Verify package.json scripts exist
cat package.json | grep -A10 '"scripts"'
```

### 6. iOS Simulator Specific
```bash
# Reset iOS Simulator
# iOS Simulator -> Device -> Erase All Content and Settings

# Restart iOS Simulator completely
# Close and reopen from Xcode or Spotlight

# Check iOS Simulator version compatibility
xcrun simctl list devices
```

### 7. Nuclear Options (if all else fails)
```bash
# Clear all caches
rm -rf node_modules
rm -rf .expo
rm package-lock.json
npm install

# Reset iOS Simulator completely
xcrun simctl erase all

# Restart development environment
pkill -f "expo\|metro\|react-native"
npm start
```

## Common Causes by Frequency

1. **Metro not running** (80% of cases)
2. **Cache corruption** (10% of cases)
3. **Network/localhost issues** (5% of cases)
4. **Configuration changes** (3% of cases)
5. **iOS Simulator state corruption** (2% of cases)

## Prevention Strategies

- Always check `ps aux | grep metro` before opening simulator
- Add `npm start` to your development startup routine
- Use `npx expo start --clear` weekly to prevent cache buildup
- Monitor for configuration file changes in git diff
- Keep Metro running in dedicated terminal tab

## Quick Commands Reference

```bash
# Status check
ps aux | grep metro && netstat -an | grep 8081

# Standard restart
pkill -f metro; npm start

# Full reset
rm -rf .expo && npx expo start --clear
```