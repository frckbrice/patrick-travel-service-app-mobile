// Firebase configuration
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import Constants from 'expo-constants';

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
  // getAuth handles persistence automatically on React Native
  // No need to use initializeAuth with getReactNativePersistence in Firebase v12
  auth = getAuth(app);
  database = getDatabase(app);
} else {
  app = getApps()[0];
  auth = getAuth(app);
  database = getDatabase(app);
}

export { app, auth, database };
