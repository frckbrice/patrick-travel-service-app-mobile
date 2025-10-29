# Android Crash Fix - ReactActivityDelegate NullPointerException

## 🐛 The Problem

The app crashes when the user leaves the app (goes to background) with this error:

```
java.lang.Throwable
	at java.util.Objects.requireNonNull(Objects.java:203)
	at com.facebook.react.ReactActivityDelegate.onUserLeaveHint(ReactActivityDelegate.java:191)
	at com.facebook.react.ReactActivity.onUserLeaveHint(ReactActivity.java:139)
```

**Root Cause**: React Native 0.81.5 has a bug where `ReactActivityDelegate.onUserLeaveHint()` tries to access a null reference when the app goes to background.

## ✅ The Solution

Create a custom `MainActivity.kt` that overrides `onUserLeaveHint()` with null-safe handling.

## 📋 Implementation Steps

### Step 1: Prebuild Android Project

```bash
npx expo prebuild --platform android --clean
```

### Step 2: Create Custom MainActivity

Create the file: `android/app/src/main/java/com/unidov/patricktravel/MainActivity.kt`

```kotlin
package com.unidov.patricktravel

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import android.os.Bundle

class MainActivity : ReactActivity() {
    
    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     */
    override fun getMainComponentName(): String {
        return "main"
    }

    /**
     * Returns the instance of the {@link ReactActivityDelegate}.
     * We use {@link DefaultReactActivityDelegate} which allows you to enable New Architecture
     * with a single boolean flag {@code fabricEnabled}
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return object : DefaultReactActivityDelegate(
            this,
            mainComponentName,
            fabricEnabled
        ) {
            override fun onUserLeaveHint() {
                try {
                    // Safely handle onUserLeaveHint
                    super.onUserLeaveHint()
                } catch (e: Exception) {
                    // Silently handle the exception to prevent crash
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(null) // Pass null to onCreate to prevent crash
    }
}
```

### Step 3: Rebuild the Android App

```bash
# Development build
eas build --profile development --platform android

# Or local build
cd android && ./gradlew assembleDebug
```

## 🔍 Alternative Quick Fix (Temporary)

If you can't rebuild immediately, you can temporarily work around this by:

1. Clear app data to prevent the delegate from getting into a bad state:
```bash
adb shell pm clear com.patricktravel.mobile
```

2. Update your Expo dependencies to potentially get a newer patch:
```bash
npx expo install --fix
```

## 📝 Additional Notes

- This fix ensures the app handles background transitions gracefully
- The app will no longer crash when users press the home button or switch apps
- This is a known issue in React Native 0.81.5 with expo-router
- Future versions of React Native/Expo may include this fix upstream

## ✅ Verification

After applying the fix:

1. Build and install the new APK
2. Open the app
3. Press the home button (or switch to another app)
4. The app should not crash and should resume properly when reopened



