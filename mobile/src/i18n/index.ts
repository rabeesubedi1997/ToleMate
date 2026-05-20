import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      welcome: 'Welcome to ToleMate',
      login: 'Login',
      signup: 'Sign Up',
      explore: 'Explore',
      dashboard: 'Dashboard',
      services: 'Services',
      // ... more
    },
  },
  np: {
    translation: {
      welcome: 'टोलेमेटमा स्वागत छ',
      login: 'लगइन',
      signup: 'दर्ता गर्नुहोस्',
      explore: 'अन्वेषण',
      dashboard: 'ड्यासबोर्ड',
      services: 'सेवाहरू',
      // ... more
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
