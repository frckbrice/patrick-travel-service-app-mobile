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
    backgroundColor: '#0066CC',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.patricktravel.mobile',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      UIViewControllerBasedStatusBarAppearance: true,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0066CC',
    },
    package: 'com.patricktravel.mobile',
    permissions: [
      'android.permission.CAMERA',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
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
    uploadthingApiKey: process.env.EXPO_PUBLIC_UPLOADTHING_API_KEY,
    uploadthingAppId: process.env.EXPO_PUBLIC_UPLOADTHING_APP_ID,
    eas: {
      projectId: '2c78e03f-b77b-4a17-afde-9d7cd2171610',
    },
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    enabled: false, // Disabled for development builds to prevent crashes
    url: 'https://u.expo.dev/2c78e03f-b77b-4a17-afde-9d7cd2171610',
  },
});
