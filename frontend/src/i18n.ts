import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "hero_title": "Everything You Need, Delivered.",
      "hero_subtitle": "From home repairs to professional consulting, find the best local experts at your fingertips.",
      "explore_services": "Explore Services",
      "get_started": "Get Started",
      "become_vendor": "Become a Vendor",
      "login": "Sign In",
      "signup": "Get Started",
      "services": "Services",
      "dashboard": "Dashboard",
      "logout": "Logout",
      "search_placeholder": "What are you looking for?",
      "featured_categories": "Featured Categories"
    }
  },
  np: {
    translation: {
      "hero_title": "तपाईंलाई चाहिने सबै थोक, डेलिभर गरियो।",
      "hero_subtitle": "घर मर्मत देखि व्यावसायिक परामर्श सम्म, तपाईको औंलाको छेउमा उत्कृष्ट स्थानीय विशेषज्ञहरू फेला पार्नुहोस्।",
      "explore_services": "सेवाहरू अन्वेषण गर्नुहोस्",
      "get_started": "सुरु गर्नुहोस्",
      "become_vendor": "विक्रेता बन्नुहोस्",
      "login": "लगइन गर्नुहोस्",
      "signup": "दर्ता गर्नुहोस्",
      "services": "सेवाहरू",
      "dashboard": "ड्यासबोर्ड",
      "logout": "लगआउट",
      "search_placeholder": "तपाईं के खोज्दै हुनुहुन्छ?",
      "featured_categories": "प्रमुख वर्गहरू"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
