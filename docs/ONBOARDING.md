# Onboarding Flow

## Overview

The onboarding screen is displayed only **once** when a user first opens the app. After completion, it will never show again unless the app is uninstalled and reinstalled.

## How It Works

### 1. First Launch
- User opens the app for the first time
- `app/index.tsx` checks AsyncStorage for `onboarding_completed` flag
- Flag doesn't exist → User is redirected to `/onboarding`
- User completes onboarding (via Next/Skip/Get Started button)
- Flag is saved to AsyncStorage
- User is redirected to login screen

### 2. Subsequent Launches
- User opens the app
- `app/index.tsx` checks AsyncStorage
- Flag exists (`onboarding_completed = 'true'`)
- Onboarding is skipped → User goes directly to login or home

### 3. After Uninstall/Reinstall
- App uninstall clears all AsyncStorage data
- On reinstall, the `onboarding_completed` flag is gone
- User sees onboarding again (as if first launch)

## Implementation Files

### Core Files
- **`app/index.tsx`** - Entry point that checks onboarding status
- **`app/onboarding.tsx`** - The onboarding screen component
- **`lib/utils/onboarding.ts`** - Utility functions for onboarding management
- **`lib/constants/index.ts`** - Storage keys constants

### Key Functions

```typescript
// Check if onboarding was completed
hasCompletedOnboarding(): Promise<boolean>

// Mark onboarding as completed
completeOnboarding(): Promise<void>

// Reset onboarding (for testing only)
resetOnboarding(): Promise<void>
```

## Testing

### To Reset Onboarding (for development/testing):

**Method 1: Using React Native Debugger**
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';
AsyncStorage.removeItem('onboarding_completed');
```

**Method 2: Using the utility function**
```typescript
import { resetOnboarding } from './lib/utils/onboarding';
await resetOnboarding();
```

**Method 3: Clear all app data**
- iOS: Delete and reinstall the app
- Android: Go to Settings → Apps → Patrick Travel Services → Storage → Clear Data

## Storage Details

- **Storage Type**: AsyncStorage (persistent local storage)
- **Storage Key**: `onboarding_completed`
- **Storage Value**: `'true'` when completed
- **Persistence**: Survives app restarts, cleared on uninstall
- **Platform**: Works on iOS, Android, and Web

## User Flow Diagram

```
┌─────────────────┐
│   App Launch    │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ Check AsyncStorage  │
│ onboarding_completed│
└────────┬────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
   No        Yes
    │         │
    ▼         ▼
┌───────┐  ┌──────┐
│Onboard│  │Login │
│Screen │  │/Home │
└───┬───┘  └──────┘
    │
    ▼
┌───────────┐
│ Complete  │
│& Save Flag│
└─────┬─────┘
      │
      ▼
   ┌──────┐
   │Login │
   └──────┘
```

## Customization

### To Change Onboarding Slides
Edit `app/onboarding.tsx` - modify the `getOnboardingSlides` function:

```typescript
const getOnboardingSlides = (t: TFunction): OnboardingSlide[] => [
  {
    id: '1',
    title: t('onboarding.slide1Title'),
    description: t('onboarding.slide1Description'),
    icon: 'shield-check',
    color: '#0066CC',
  },
  // Add more slides...
];
```

### To Change Skip/Next Behavior
Modify the handlers in `app/onboarding.tsx`:
- `handleNext()` - Next button behavior
- `handleSkip()` - Skip button behavior  
- `handleGetStarted()` - Final button behavior

## Notes

- The onboarding state is stored locally and not synced across devices
- If a user logs in on multiple devices, they'll see onboarding on each device once
- The implementation uses AsyncStorage which is unencrypted - suitable for non-sensitive preferences
- For testing, use `resetOnboarding()` to clear the flag without reinstalling

## Future Enhancements

Possible improvements:
1. Add version tracking to show onboarding after major updates
2. Add analytics to track completion rate
3. Add A/B testing for different onboarding flows
4. Sync onboarding status with backend for multi-device experience

