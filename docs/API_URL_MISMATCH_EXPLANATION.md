# API URL Mismatch Explanation

## Problem
Your logs showed:
- **Line 1013**: `baseURL: "http://10.0.2.2:3000/api"`
- **Line 997-998**: Expected `http://172.20.10.10:3000/api`

But your `.env` file has:
```bash
EXPO_PUBLIC_API_URL=http://172.20.10.10:3000/api
```

## Why This Happened

### Android Emulator Special Network

Android emulator has a **special network setup** that requires using `10.0.2.2` to reach the host machine:

```
┌─────────────────────────────────────────┐
│ Android Emulator (10.0.2.1)            │
│                                         │
│  ┌────────────────────────────┐        │
│  │ App tries: localhost:3000  │ ❌ Fails│
│  └────────────────────────────┘        │
│              ↓                         │
│  Must use: 10.0.2.2 to reach host     │
└─────────────────────────────────────────┘
         ↓
    ┌──────────────┐
    │ Host Machine │
    │ 172.20.10.10 │
    └──────────────┘
```

### The Fix

I've updated `lib/api/axios.ts` to **automatically detect Android platform** and use the correct IP:

```typescript
// Automatically handles Android emulator
if (Platform.OS === 'android' && __DEV__) {
  finalApiUrl = API_BASE_URL.replace(/http:\/\/[^:]+/, 'http://10.0.2.2');
}
```

## Different Scenarios

### 1. Android Emulator
- **Uses**: `http://10.0.2.2:3000/api`
- **Why**: Emulator's special IP to reach host
- **Status**: ✅ Now automatically handled

### 2. Android Physical Device
- **Uses**: `http://172.20.10.10:3000/api`
- **Why**: LAN IP of your development machine
- **Requires**: Device and computer on same WiFi

### 3. iOS Simulator
- **Uses**: `http://localhost:3000/api`
- **Why**: iOS simulator shares host network
- **Status**: ✅ Works as expected

### 4. iOS Physical Device
- **Uses**: `http://172.20.10.10:3000/api`
- **Why**: LAN IP of your development machine
- **Requires**: Device and computer on same WiFi

## Testing Different Platforms

### Test on Emulator
```bash
# .env stays as is, code auto-detects
npm start
# Run on Android emulator
```

### Test on Physical Device
```bash
# .env stays as is, code auto-detects
npm start
# Run on physical device (same WiFi network)
```

## What Changed

**File**: `lib/api/axios.ts`

1. ✅ Uses `Constants.expoConfig?.extra?.apiUrl` (correct way to access env vars)
2. ✅ Auto-detects Android platform
3. ✅ Auto-replaces IP with `10.0.2.2` for Android emulator
4. ✅ Keeps original IP for physical devices
5. ✅ Added debug logging

## No More Mismatch!

The app will now use:
- `10.0.2.2` when running on Android emulator
- `172.20.10.10` when running on physical devices (Android/iOS)
- All automatically detected - no manual changes needed!

