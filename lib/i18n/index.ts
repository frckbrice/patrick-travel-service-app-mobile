
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import fr from './locales/fr.json';

const deviceLanguage =
  Localization.getLocales?.()[0]?.languageCode ||
  (Localization.locale ? Localization.locale.split('-')[0] : 'en') ||
  'en';

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

export default i18n;
