import { ExpoConfig, ConfigContext } from 'expo/config';


export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Patrick Travel Services',
  slug: 'patrick-travel-services',
  owner: 'ubuntu-dev-group',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF', // Modern clean white background for maximum logo visibility
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.unidov.patricktravel',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      UIViewControllerBasedStatusBarAppearance: true,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFFFFF', // Match splash screen for consistency
    },
    googleServicesFile: './google-services.json',
    package: 'com.unidov.patricktravel',
    permissions: [
      'android.permission.CAMERA',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.POST_NOTIFICATIONS', // Required for FCM on Android 13+
      'android.permission.RECEIVE_BOOT_COMPLETED', // For notification scheduling
      'com.google.android.c2dm.permission.RECEIVE', // FCM permission
    ],
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
    // output: 'server', // Required for API routes support (app/api/*.ts)
  },
  scheme: 'patrick-travel',
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-asset',
    'expo-font',
    'expo-localization',
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#0066CC',
        sound: true,
        defaultChannel: 'default',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api',
    firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    firebaseMessagingSenderId:
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    firebaseDatabaseUrl: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    eas: {
      projectId: '2c78e03f-b77b-4a17-afde-9d7cd2171610',
    },
  },
  // Temporarily disabled for Expo Go compatibility
  // runtimeVersion: {
  //   policy: 'appVersion',
  // },
  // updates: {
  //   enabled: false, // Disabled for development builds to prevent crashes
  //   url: 'https://u.expo.dev/2c78e03f-b77b-4a17-afde-9d7cd2171610',
  // },
});
