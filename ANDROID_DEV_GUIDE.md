# Android Development Build & Emulator Guide

Complete guide for installing, managing, and troubleshooting the Patrick Travel Services Android development build.

---

## 📋 Table of Contents

1. [Quick Start](#-quick-start)
2. [Install Development Build](#-install-development-build)
3. [Emulator Management](#-emulator-management)
4. [Troubleshooting](#-troubleshooting)
5. [Pro Tips](#-pro-tips)
6. [Reference](#-reference)

---

## 🚀 Quick Start

**🎯 Pixel_9_Pro_XL is configured as the default emulator.**

### **Method 1: Using NPM Scripts (Recommended)** ⭐

```bash
# Start emulator only
pnpm run emulator

# Start emulator + Metro (Expo Go)
pnpm run android:emulator

# Start emulator + Metro (Dev Client)
pnpm run dev:emulator
```

### **Method 2: Manual Setup**

```bash
# 1. Clean everything
killall node 2>/dev/null
killall qemu-system-x86_64 2>/dev/null
adb kill-server && adb start-server

# 2. Start default emulator (Pixel_9_Pro_XL)
./start-emulator.sh
# OR manually:
emulator -avd Pixel_9_Pro_XL > /dev/null 2>&1 &
adb wait-for-device

# 3. Verify only ONE device is running
adb devices

# 4. Check if app is installed (skip if already installed)
adb shell pm list packages | grep patrick
# If not found, install it:
curl -L -o patrick-travel-dev-new.apk "https://expo.dev/artifacts/eas/aa9e77f4-17ce-4ac4-84e1-8ee392302b65.apk"
adb install patrick-travel-dev-new.apk
rm patrick-travel-dev-new.apk

# 5. Start Metro bundler
npx expo start --dev-client --clear

# 6. Press 'a' to open app
```

---

## 📱 Install Development Build

### Your Build Information

**Latest Build (October 20, 2025)** ⭐
- **Build Page**: https://expo.dev/accounts/ubuntu-dev-group/projects/patrick-travel-services/builds/aa9e77f4-17ce-4ac4-84e1-8ee392302b65
- **Direct APK URL**: https://expo.dev/artifacts/eas/aa9e77f4-17ce-4ac4-84e1-8ee392302b65.apk
- **Package Name**: `com.patricktravel.mobile`
- **Status**: ✅ Fixed expo-updates crash, all native modules working
- **EAS URL Format**: `https://expo.dev/artifacts/eas/{BUILD_ID}.apk`

**Previous Build (Had Issues)**
- Build: 4904d21c-8c94-4d91-a77c-8e4401a5ab9f
- Issue: expo-updates crash on launch

### Method 1: Step-by-Step Installation

```bash
# Step 1: Download APK
curl -L -o patrick-travel-dev.apk "https://expo.dev/artifacts/eas/4904d21c-8c94-4d91-a77c-8e4401a5ab9f.apk"

# Step 2: Verify emulator is running
adb devices

# Step 3: Install APK
adb install patrick-travel-dev.apk

# Step 4: Clean up
rm patrick-travel-dev.apk

# Step 5: Start Metro bundler
npx expo start --dev-client --clear

# Step 6: Press 'a' or run:
adb shell am start -n com.patricktravel.mobile/.MainActivity
```

### Method 2: One-Liner Installation

```bash
curl -L -o patrick-travel-dev.apk "https://expo.dev/artifacts/eas/4904d21c-8c94-4d91-a77c-8e4401a5ab9f.apk" && adb install patrick-travel-dev.apk && rm patrick-travel-dev.apk
```

### Method 3: Drag and Drop (Easiest)

1. Download APK from build URL to your Mac
2. Drag and drop the APK file onto running Android emulator window
3. Emulator will automatically install it
4. Run: `npx expo start --dev-client`

### Verify Installation

```bash
# Check if app is installed
adb shell pm list packages | grep patrick
# Should output: package:com.patricktravel.mobile

# Get app version info
adb shell dumpsys package com.patricktravel.mobile | grep version

# List all installed packages (to check for conflicts)
adb shell pm list packages | grep -E "fintech|patrick|maebrie"
# Should ONLY show: package:com.patricktravel.mobile
```

---

## 🎮 Emulator Management

### Default Emulator Configuration ⭐

**Pixel_9_Pro_XL is set as the default emulator** for this project.

**Configuration:**
- ✅ Environment variable: `ANDROID_AVD=Pixel_9_Pro_XL` in `.env`
- ✅ Startup script: `start-emulator.sh` 
- ✅ NPM scripts: `pnpm run emulator`, `pnpm run android:emulator`, `pnpm run dev:emulator`

**Why Pixel_9_Pro_XL?**
- Clean installation (no conflicting apps)
- Modern device profile
- Good performance on emulator
- Larger screen for testing

### Available Emulators

Your system has:
- **Pixel_9_Pro_XL** - Default, clean, recommended ✅
- **Medium_Phone** - Old, had fintech app issues ❌

### List All Emulators

```bash
emulator -list-avds
```

### Start Specific Emulator

```bash
# Start in foreground
emulator -avd Pixel_9_Pro_XL

# Start in background (recommended)
emulator -avd Pixel_9_Pro_XL > /dev/null 2>&1 &

# Wait for boot
sleep 20 && adb wait-for-device
```

### Check Running Emulators

```bash
# List connected devices
adb devices

# List with detailed info
adb devices -l
# Example output:
# emulator-5554  device product:sdk_gphone64_x86_64 model:Pixel_9_Pro_XL ...
```

### Stop Emulator

```bash
# Method 1: Kill specific emulator
adb -s emulator-5554 emu kill

# Method 2: Kill all emulators
killall qemu-system-x86_64 2>/dev/null

# Method 3: Use ADB
adb emu kill
```

### Switch to Different Emulator

**Complete workflow:**

```bash
# 1. Stop everything
killall node 2>/dev/null
killall qemu-system-x86_64 2>/dev/null
adb kill-server && adb start-server

# 2. Start desired emulator
emulator -avd Pixel_9_Pro_XL > /dev/null 2>&1 &
sleep 20 && adb wait-for-device

# 3. Verify only ONE emulator
adb devices

# 4. Install app if needed
adb shell pm list packages | grep patrick
# If not found, install as shown in installation section

# 5. Start Metro
npx expo start --dev-client --clear
```

---

## 🐛 Troubleshooting

### Problem: Wrong Emulator Opens When Pressing 'a'

**Cause**: Multiple emulators running or ADB cached wrong device.

**Solution**:

```bash
# 1. Clean everything
killall node 2>/dev/null
killall qemu-system-x86_64 2>/dev/null
adb kill-server && adb start-server

# 2. Verify nothing is running
adb devices
# Should show empty list

# 3. Start ONLY the emulator you want
emulator -avd Pixel_9_Pro_XL > /dev/null 2>&1 &
sleep 20 && adb wait-for-device

# 4. Verify only ONE device
adb devices
# Should show only ONE device

# 5. Start Metro and press 'a'
npx expo start --dev-client --clear
```

### Problem: Old App Appears Instead of Patrick Travel

**Cause**: Multiple apps installed or wrong emulator.

**Solution**:

```bash
# Check installed apps
adb shell pm list packages | grep -E "fintech|patrick|maebrie"

# Uninstall old apps
adb uninstall com.maebrie2017.fintechapplem7bm3h6alqzcqkmeg

# Verify only Patrick Travel remains
adb shell pm list packages | grep patrick
# Should show: package:com.patricktravel.mobile
```

### Problem: "Activity not started, unable to resolve Intent"

**Cause**: Development build not installed on the emulator.

**Solution**:

```bash
# Check if app is installed
adb shell pm list packages | grep patrick

# If not found, install it:
curl -L -o patrick-travel-dev.apk "https://expo.dev/artifacts/eas/4904d21c-8c94-4d91-a77c-8e4401a5ab9f.apk"
adb install patrick-travel-dev.apk
rm patrick-travel-dev.apk

# Restart Metro
npx expo start --dev-client --clear
```

### Problem: "INSTALL_FAILED_UPDATE_INCOMPATIBLE"

**Cause**: Signature mismatch with existing app.

**Solution**:

```bash
# Uninstall old version first
adb uninstall com.patricktravel.mobile

# Then install new build
adb install patrick-travel-dev.apk
```

### Problem: "INSTALL_FAILED_INSUFFICIENT_STORAGE"

**Solution**:

```bash
# Clear app cache
adb shell pm clear com.patricktravel.mobile
adb shell pm clear host.exp.exponent

# Or wipe emulator data (nuclear option)
# Warning: This will delete ALL emulator data
emulator -avd Pixel_9_Pro_XL -wipe-data
```

### Problem: "Waiting for device" / ADB not detecting emulator

**Solution**:

```bash
# Restart ADB server
adb kill-server
adb start-server

# Check connection
adb devices

# If still not detected, check emulator is running
ps aux | grep qemu-system-x86_64
```

### Problem: Metro connects but app doesn't open

**Solution**:

```bash
# Manually open the app
adb shell am start -n com.patricktravel.mobile/.MainActivity

# Or use explicit device flag
adb devices  # Note the device ID
npx expo run:android --device emulator-5554
```

### Problem: Multiple Emulators Show Up

**Solution**:

```bash
# List all devices
adb devices

# Kill specific emulator
adb -s emulator-5554 emu kill

# Or kill all
killall qemu-system-x86_64

# Restart only the one you want
emulator -avd Pixel_9_Pro_XL > /dev/null 2>&1 &
```

### Problem: Expo cache issues

**Solution**:

```bash
# Clear Expo cache
npx expo start --clear --dev-client

# Or completely clear
rm -rf node_modules/.cache
rm -rf .expo
npx expo start --clear
```

### Problem: App crashes on splash screen with "DatabaseLauncher has already started"

**Cause**: Expo Updates module corruption in development build.

**Error**:
```
java.lang.AssertionError: DatabaseLauncher has already started. 
Create a new instance in order to launch a new version.
at expo.modules.updates.launcher.DatabaseLauncher.launch
```

**Solutions**:

**Option 1: Clear app data** (Quick fix, may not work)
```bash
adb shell pm clear com.patricktravel.mobile
adb shell am start -n com.patricktravel.mobile/.MainActivity
```

**Option 2: Use Expo Go temporarily**
```bash
# Start without --dev-client flag
killall node 2>/dev/null
npx expo start --clear

# Then press 'a' or install Expo Go on emulator
# Note: Some features won't work (push notifications, Google OAuth)
```

**Option 3: Disable expo-updates in app.config.ts** (Permanent fix)
```typescript
// In app.config.ts
updates: {
  enabled: false, // Disabled for development builds
  url: 'https://u.expo.dev/YOUR_PROJECT_ID',
},
```

Then rebuild the development build:
```bash
eas build --profile development --platform android
```

**Option 4: Rebuild without expo-updates**
```bash
# Remove from eas.json development profile
# Then rebuild
eas build --profile development --platform android
```

---

## ⚡ Pro Tips

### Quick Start Script

Create a script to automate the startup:

```bash
#!/bin/bash
# File: start-dev.sh

echo "🧹 Cleaning up..."
killall node 2>/dev/null
killall qemu-system-x86_64 2>/dev/null
adb kill-server && adb start-server

echo "🚀 Starting Pixel 9 Pro XL..."
emulator -avd Pixel_9_Pro_XL > /dev/null 2>&1 &

echo "⏳ Waiting for emulator to boot..."
sleep 20 && adb wait-for-device

echo "✅ Emulator ready!"
adb devices

echo "🎭 Starting Metro bundler..."
cd /Users/macbookpro/Documents/Projects_2025/MPE\ DIGITAL/mpe-digital-project-1/mobile
npx expo start --dev-client --clear
```

**Setup:**
```bash
chmod +x start-dev.sh
./start-dev.sh
```

### Keep APK for Quick Reinstalls

```bash
# Save APK with date
mkdir -p ~/Downloads/patrick-builds
curl -L -o ~/Downloads/patrick-builds/patrick-dev-$(date +%Y%m%d).apk "https://expo.dev/artifacts/eas/4904d21c-8c94-4d91-a77c-8e4401a5ab9f.apk"
```

### Install on Multiple Devices

```bash
# List all devices
adb devices

# Install on specific device
adb -s emulator-5554 install patrick-dev.apk
```

### Force Reinstall

```bash
# -r flag overwrites existing installation
adb install -r patrick-dev.apk
```

### Manually Open App

```bash
# If pressing 'a' doesn't work
adb shell am start -n com.patricktravel.mobile/.MainActivity
```

### Check Emulator Details

```bash
# Get detailed device info
adb devices -l

# Check Android version
adb shell getprop ro.build.version.release

# Check if emulator is fully booted
adb shell getprop sys.boot_completed
# Should return: 1
```

---

## 📝 Best Practices

1. ✅ **Always start with a clean state** - Kill all emulators before starting
2. ✅ **Run only ONE emulator at a time** - Avoids confusion when pressing 'a'
3. ✅ **Use Pixel_9_Pro_XL consistently** - It's clean and works reliably
4. ✅ **Verify with `adb devices`** before starting Metro
5. ✅ **Keep the app installed** - No need to reinstall each time
6. ✅ **Use `--dev-client` flag** - Required for development builds
7. ✅ **Clear cache when switching builds** - Use `--clear` flag

---

## 📚 Reference

### Important Commands Cheat Sheet

```bash
# Emulator management
emulator -list-avds                           # List all AVDs
emulator -avd Pixel_9_Pro_XL &               # Start emulator
killall qemu-system-x86_64                   # Kill all emulators
adb emu kill                                 # Kill current emulator

# ADB commands
adb devices                                  # List devices
adb devices -l                               # List with details
adb kill-server && adb start-server          # Restart ADB
adb wait-for-device                          # Wait for device ready

# App management
adb install app.apk                          # Install app
adb install -r app.apk                       # Reinstall app
adb uninstall com.patricktravel.mobile       # Uninstall app
adb shell pm list packages | grep patrick    # Check if installed
adb shell pm clear com.patricktravel.mobile  # Clear app data

# App launching
adb shell am start -n com.patricktravel.mobile/.MainActivity

# Metro bundler
npx expo start --dev-client                  # Start with dev-client
npx expo start --dev-client --clear          # Start with cache clear
npx expo run:android --device emulator-5554  # Run on specific device

# Process management
killall node                                 # Kill Metro bundler
ps aux | grep qemu                          # Check running emulators
ps aux | grep expo                          # Check Metro bundler
```

### Expo Go vs Development Build

| Feature | Expo Go | Development Build |
|---------|---------|------------------|
| **Installation** | From Play Store | Build with EAS |
| **Native Modules** | Limited | Full support ✅ |
| **Push Notifications** | ❌ No | ✅ Yes |
| **Google OAuth** | ❌ No | ✅ Yes |
| **Biometric Auth** | ❌ No | ✅ Yes |
| **Document/Image Picker** | ❌ Limited | ✅ Yes |
| **File Sharing** | ❌ Limited | ✅ Yes |
| **Localization** | ⚠️ Fallback | ✅ Full |
| **Reanimated** | ⚠️ Partial | ✅ Full |
| **Firebase Full** | ✅ Yes | ✅ Yes |
| **Performance** | Good | Better ✅ |
| **Production Match** | ❌ No | ✅ Exact |
| **Hot Reload** | ✅ Yes | ✅ Yes |
| **Setup Time** | Instant | ~15 min build |

**Recommendation**: Always use Development Build for production apps ✅

**Expo Go Compatibility Fixes Applied**:
- ✅ Optional native modules won't crash
- ✅ Fallback messages for unavailable features
- ✅ Graceful degradation
- ✅ Core functionality preserved

### Useful Links

- **EAS Dashboard**: https://expo.dev/accounts/ubuntu-dev-group/projects/patrick-travel-services/builds
- **Your Build**: https://expo.dev/accounts/ubuntu-dev-group/projects/patrick-travel-services/builds/4904d21c-8c94-4d91-a77c-8e4401a5ab9f
- **Expo Docs**: https://docs.expo.dev/development/build/
- **ADB Docs**: https://developer.android.com/tools/adb

### Project Paths

```bash
# Project directory
cd /Users/macbookpro/Documents/Projects_2025/MPE\ DIGITAL/mpe-digital-project-1/mobile

# Start Metro from project root
npx expo start --dev-client --clear
```

---

## 🎯 Next Time You Start Development

**Simple workflow:**

```bash
# 1. If emulator is already running with app installed:
npx expo start --dev-client

# 2. If starting fresh:
killall node 2>/dev/null && killall qemu-system-x86_64 2>/dev/null
emulator -avd Pixel_9_Pro_XL > /dev/null 2>&1 &
sleep 20 && adb wait-for-device
npx expo start --dev-client --clear
# Press 'a'
```

That's it! 🚀

---

**Last Updated**: Based on build `4904d21c-8c94-4d91-a77c-8e4401a5ab9f`  
**App Package**: `com.patricktravel.mobile`  
**Recommended Emulator**: Pixel_9_Pro_XL

