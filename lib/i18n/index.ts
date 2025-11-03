import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import fr from './locales/fr.json';
import { STORAGE_KEYS } from '../constants';

// Get device language as fallback
const deviceLanguage =
  Localization.getLocales?.()[0]?.languageCode ||
  (Localization.locale ? Localization.locale.split('-')[0] : 'en') ||
  'en';

// Initialize i18n synchronously with device language
i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    lng: deviceLanguage,
    fallbackLng: 'en',
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    interpolation: { escapeValue: false },
  });

// Update language from stored preference if available (async, non-blocking)
AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE_PREFERENCE)
  .then((storedLanguage) => {
    if (storedLanguage === 'en' || storedLanguage === 'fr') {
      i18n.changeLanguage(storedLanguage);
    }
  })
  .catch((error) => {
    // Silently fail - device language is already set
    console.debug('Could not load stored language preference:', error);
  });

export default i18n;
