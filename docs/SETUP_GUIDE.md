# Patrick Travel Services Mobile App - Complete Setup Guide

## 📋 Prerequisites

Ensure you have the following installed:
- **Node.js** 18 or higher
- **pnpm** (preferred) or yarn/npm
- **Expo CLI**: `npm install -g expo-cli`
- **iOS Simulator** (Mac only) or **Android Studio** (for Android development)
- **Git**

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
cd mobile
pnpm install
```

### Step 2: Configure Environment Variables

1. Create a `.env` file in the mobile directory:

```bash
# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:3000

# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

# UploadThing Configuration
EXPO_PUBLIC_UPLOADTHING_API_KEY=your-uploadthing-api-key
EXPO_PUBLIC_UPLOADTHING_APP_ID=your-uploadthing-app-id
```

**For Physical Devices:** Replace `localhost` with your computer's IP address:
```bash
EXPO_PUBLIC_API_URL=http://192.168.1.x:3000
```

Find your IP:
- **Mac/Linux**: `ifconfig | grep "inet "`
- **Windows**: `ipconfig`

### Step 3: Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or use existing one
3. Enable **Realtime Database**:
   - Go to Build > Realtime Database
   - Create database in test mode (change rules for production)
   - Copy the database URL
   
4. Enable **Authentication**:
   - Go to Build > Authentication
   - Enable Email/Password sign-in method
   
5. Get your Firebase config:
   - Go to Project Settings > General
   - Scroll to "Your apps"
   - Add a web app if you haven't already
   - Copy the configuration values to your `.env` file

**Firebase Realtime Database Rules (for development):**
```json
{
  "rules": {
    "chats": {
      "$caseId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

### Step 4: Set Up UploadThing

1. Go to [uploadthing.com](https://uploadthing.com)
2. Sign up or log in
3. Create a new app
4. Copy your API Key and App ID
5. Add them to your `.env` file

### Step 5: Start the App

```bash
# Start Expo development server
pnpm start

# Or run directly on a platform
pnpm ios      # iOS Simulator
pnpm android  # Android Emulator
pnpm web      # Web browser
```

## 📱 Running on Devices

### iOS (Mac only)

1. Install Xcode from App Store
2. Open Xcode and accept license agreements
3. Run: `pnpm ios`

### Android

1. Install Android Studio
2. Set up Android Emulator:
   - Open Android Studio
   - Tools > Device Manager
   - Create a new device
3. Set ANDROID_HOME environment variable:
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```
4. Run: `pnpm android`

### Physical Device

1. Install **Expo Go** app from App Store or Play Store
2. Ensure your phone and computer are on the same Wi-Fi network
3. Run `pnpm start`
4. Scan the QR code with:
   - **iOS**: Camera app
   - **Android**: Expo Go app

## 🔧 Backend Setup

The mobile app requires a running backend API. Make sure:

1. The web app backend is running
2. The API URL in `.env` is correct
3. The backend has the following endpoints available:
   - `/auth/*` - Authentication
   - `/cases/*` - Case management
   - `/documents/*` - Document management
   - `/messages/*` - Messaging
   - `/notifications/*` - Notifications
   - `/faq` - FAQs
   - `/users/*` - User management

## 🗂️ Project Structure

```
mobile/
├── app/                    # Expo Router app directory
│   ├── (auth)/            # Auth screens (login, register, etc.)
│   ├── (tabs)/            # Main tab navigation
│   ├── case/              # Case-related screens
│   ├── document/          # Document screens
│   ├── message/           # Chat screens
│   ├── help/              # Help & support screens
│   ├── _layout.tsx        # Root layout with providers
│   └── index.tsx          # Entry point
├── components/            # Reusable components
├── features/              # Feature modules
│   └── auth/
│       ├── hooks/         # Auth hooks
│       ├── schemas/       # Validation schemas
│       └── screens/       # Auth screens
├── lib/
│   ├── api/              # API client modules
│   ├── constants/        # App constants
│   ├── firebase/         # Firebase configuration
│   ├── services/         # External services
│   ├── storage/          # Secure storage
│   ├── types/            # TypeScript types
│   └── utils/            # Utilities
├── stores/               # Zustand stores
│   ├── auth/
│   ├── cases/
│   └── notifications/
├── app.json              # Expo configuration
├── package.json
└── tsconfig.json
```

## 🎯 Features Overview

### Authentication
- Email/password login
- User registration with validation
- Password recovery
- Email verification
- Remember me functionality
- Secure token storage

### Dashboard
- Quick statistics overview
- Cases, documents, messages count
- Quick actions for common tasks

### Case Management
- View all cases
- Filter by status
- Search by reference
- View case details & history
- Submit new cases
- Real-time status updates

### Document Management
- Upload documents (images, PDFs)
- View document status
- Download documents
- Document type categorization
- File size validation (10MB max)

### Messaging
- Real-time chat with advisors using Firebase
- Message history
- Unread count badges
- Read receipts
- Attachment support

### Help & Support
- Searchable FAQs
- Contact support form
- Email integration

## 🔐 Security

- All sensitive data encrypted in secure storage
- JWT token-based authentication
- Automatic token refresh
- HTTPS only in production
- File upload validation
- Input sanitization

## 🧪 Testing

```bash
# Type checking
pnpm type-check

# Linting
pnpm lint

# Format code
pnpm format
```

## 🚢 Building for Production

### iOS

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS Build
eas build:configure

# Build for iOS
eas build --platform ios
```

### Android

```bash
# Build for Android
eas build --platform android
```

## 🐛 Troubleshooting

### Cannot connect to backend

1. Check if backend is running
2. Verify `EXPO_PUBLIC_API_URL` in `.env`
3. If using physical device, use your computer's IP instead of localhost
4. Check firewall settings

### Firebase errors

1. Verify all Firebase config values in `.env`
2. Check Firebase console for enabled services
3. Ensure database rules allow read/write

### UploadThing errors

1. Verify API key and App ID
2. Check file size (max 10MB)
3. Ensure file type is allowed (images, PDFs)

### Metro bundler issues

```bash
# Clear cache
npx expo start -c

# Or
rm -rf node_modules
pnpm install
```

### Module not found

```bash
# Reinstall dependencies
rm -rf node_modules
pnpm install

# Clear Expo cache
npx expo start -c
```

## 📚 Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [UploadThing Documentation](https://docs.uploadthing.com/)
- [React Native Paper](https://callstack.github.io/react-native-paper/)
- [Expo Router](https://docs.expo.dev/router/introduction/)

## 🆘 Support

If you encounter issues:
1. Check this guide first
2. Review `IMPLEMENTATION_SUMMARY.md`
3. Check console errors
4. Verify all environment variables are set correctly

## ✅ Checklist

Before running the app, ensure:
- [ ] Dependencies installed (`pnpm install`)
- [ ] `.env` file created with all variables
- [ ] Firebase project set up and configured
- [ ] UploadThing account created
- [ ] Backend API is running
- [ ] Correct API URL in `.env` (use IP for physical devices)
- [ ] Firebase Authentication enabled
- [ ] Firebase Realtime Database created

---

**Happy Coding! 🚀**

