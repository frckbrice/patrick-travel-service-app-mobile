// Firebase configuration
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId,
  appId: Constants.expoConfig?.extra?.firebaseAppId,
  databaseURL: Constants.expoConfig?.extra?.firebaseDatabaseUrl,
};

// Validate Firebase configuration
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Firebase config is missing required fields:', {
    hasApiKey: !!firebaseConfig.apiKey,
    hasProjectId: !!firebaseConfig.projectId,
    hasAuthDomain: !!firebaseConfig.authDomain,
  });
}

let app: FirebaseApp;
let auth: ReturnType<typeof getAuth>;
let database: ReturnType<typeof getDatabase>;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  // Initialize Auth with AsyncStorage persistence for React Native
  // This ensures auth state persists between app sessions
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error: any) {
    // If auth already initialized (e.g., hot reload), use getAuth instead
    if (error.code === 'auth/already-initialized') {
      auth = getAuth(app);
    } else {
      throw error;
    }
  }
  database = getDatabase(app);
} else {
  app = getApps()[0];
  auth = getAuth(app);
  database = getDatabase(app);
}

export { app, auth, database };
