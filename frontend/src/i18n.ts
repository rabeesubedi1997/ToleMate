import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { API_BASE } from './utils/config';

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
      "featured_categories": "Featured Categories",
      "home": "Home",
      "about": "About",
      "contact": "Contact",
      "marketplace": "Marketplace",
      "bookings": "Bookings",
      "messages": "Messages",
      "notifications": "Notifications",
      "profile": "Profile",
      "settings": "Settings",
      "favorites": "Favorites",
      "admin_panel": "Admin Panel",
      "vendor_dashboard": "Vendor Dashboard",
      "loading": "Loading...",
      "no_results": "No results found",
      "save": "Save",
      "cancel": "Cancel",
      "delete": "Delete",
      "confirm": "Confirm",
      "search": "Search",
      "filter": "Filter",
      "sort": "Sort",
      "view_all": "View All",
      "see_more": "See More",
      "learn_more": "Learn More",
      "book_now": "Book Now",
      "contact_vendor": "Contact Vendor",
      "send_message": "Send Message",
      "reviews": "Reviews",
      "rating": "Rating",
      "price": "Price",
      "location": "Location",
      "category": "Category",
      "description": "Description",
      "status_pending": "Pending",
      "status_accepted": "Accepted",
      "status_completed": "Completed",
      "status_cancelled": "Cancelled",
      "pay_now": "Pay Now",
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
      "featured_categories": "प्रमुख वर्गहरू",
      "home": "गृहपृष्ठ",
      "about": "बारेमा",
      "contact": "सम्पर्क",
      "marketplace": "बजार",
      "bookings": "बुकिङहरू",
      "messages": "सन्देशहरू",
      "notifications": "सूचनाहरू",
      "profile": "प्रोफाइल",
      "settings": "सेटिङहरू",
      "favorites": "मनपर्ने",
      "admin_panel": "प्रशासक प्यानल",
      "vendor_dashboard": "विक्रेता ड्यासबोर्ड",
      "loading": "लोड हुँदै...",
      "no_results": "कुनै परिणाम भेटिएन",
      "save": "सुरक्षित गर्नुहोस्",
      "cancel": "रद्द गर्नुहोस्",
      "delete": "मेटाउनुहोस्",
      "confirm": "पुष्टि गर्नुहोस्",
      "search": "खोज्नुहोस्",
      "filter": "फिल्टर",
      "sort": "क्रमबद्ध गर्नुहोस्",
      "view_all": "सबै हेर्नुहोस्",
      "see_more": "थप हेर्नुहोस्",
      "learn_more": "थप जान्नुहोस्",
      "book_now": "अहिले बुक गर्नुहोस्",
      "contact_vendor": "विक्रेतालाई सम्पर्क गर्नुहोस्",
      "send_message": "सन्देश पठाउनुहोस्",
      "reviews": "समीक्षाहरू",
      "rating": "मूल्याङ्कन",
      "price": "मूल्य",
      "location": "स्थान",
      "category": "श्रेणी",
      "description": "विवरण",
      "status_pending": "पर्खिरहेको",
      "status_accepted": "स्वीकृत",
      "status_completed": "पूरा भयो",
      "status_cancelled": "रद्द गरियो",
      "pay_now": "अहिले भुक्तानी गर्नुहोस्",
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

// Load server-side translations after init
fetch(`${API_BASE}/api/translations`)
  .then(r => r.ok ? r.json() : null)
  .then(data => {
    if (data) {
      Object.entries(data).forEach(([lang, keys]) => {
        if (typeof keys === 'object' && keys !== null) {
          (i18n as any).addResourceBundle(lang, 'translation', keys as Record<string, string>, true);
        }
      });
    }
  })
  .catch(() => {});

export default i18n;
