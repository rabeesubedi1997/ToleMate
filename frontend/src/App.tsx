import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { SettingsProvider } from './context/SettingsContext';
import { useSettings } from './context/SettingsContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import MobileBottomNav from './components/Layout/MobileBottomNav';
import ScrollToTop from './components/ScrollToTop';
import './index.css';

const Home               = lazy(() => import('./pages/Home'));
const Login              = lazy(() => import('./pages/Login'));
const Register           = lazy(() => import('./pages/Register'));
const ForgotPassword     = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword      = lazy(() => import('./pages/ResetPassword'));
const Services           = lazy(() => import('./pages/Services'));
const ServicesDetail     = lazy(() => import('./pages/ServicesDetail'));
const BookService        = lazy(() => import('./pages/BookService'));
const Dashboard          = lazy(() => import('./pages/Dashboard'));
const Messages           = lazy(() => import('./pages/Messages'));
const VendorDashboard    = lazy(() => import('./pages/VendorDashboard'));
const AdminDashboard     = lazy(() => import('./pages/AdminDashboard'));

const ServiceEdit        = lazy(() => import('./pages/ServiceEdit'));
const UserEdit           = lazy(() => import('./pages/UserEdit'));
const Notifications      = lazy(() => import('./pages/Notifications'));
const Marketplace        = lazy(() => import('./pages/Marketplace'));
const PostRequest        = lazy(() => import('./pages/PostRequest'));
const VendorProfile      = lazy(() => import('./pages/VendorProfile'));
const VendorPublicProfile= lazy(() => import('./pages/VendorPublicProfile'));
const Checkout           = lazy(() => import('./pages/Checkout'));
const Favorites          = lazy(() => import('./pages/Favorites'));
const BookingDetail      = lazy(() => import('./pages/BookingDetail'));
const CustomerProfile    = lazy(() => import('./pages/CustomerProfile'));
const CategoryPage       = lazy(() => import('./pages/CategoryPage'));

const DefaultSeo: React.FC = () => {
  const { getSetting } = useSettings();
  const siteName = getSetting('site_name', 'ToleMate');
  const desc = getSetting('home_meta_description', 'Find trusted local service providers for home repairs, professional consulting, and more.');
  return (
    <Helmet titleTemplate={`%s | ${siteName}`} defaultTitle={siteName}>
      <meta name="description" content={desc} />
      <meta property="og:site_name" content={siteName} />
      <meta name="robots" content="index, follow" />
    </Helmet>
  );
};

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="spinner" />
  </div>
);

function AppLayout() {
  const { pathname } = useLocation();
  const isDashboardRoute =
    pathname.startsWith('/admin-dashboard') ||
    pathname.startsWith('/vendor-dashboard') ||
    pathname.startsWith('/super-admin');

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow pb-16 md:pb-0">
        <Suspense fallback={<PageLoader />}>
          <Routes>
                {/* Public routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/services" element={<Services />} />
                <Route path="/services/:id/:slug?" element={<ServicesDetail />} />
                <Route path="/categories/:id" element={<CategoryPage />} />
                <Route path="/vendors/:id" element={<VendorPublicProfile />} />

                {/* Customer routes */}
                <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['customer']}><Dashboard /></ProtectedRoute>} />
                <Route path="/customer/profile" element={<ProtectedRoute allowedRoles={['customer']}><CustomerProfile /></ProtectedRoute>} />
                <Route path="/bookings/:id" element={<ProtectedRoute><BookingDetail /></ProtectedRoute>} />
                <Route path="/book/:id" element={<ProtectedRoute allowedRoles={['customer', 'admin', 'vendor']}><BookService /></ProtectedRoute>} />
                <Route path="/checkout/:id" element={<ProtectedRoute allowedRoles={['customer', 'admin', 'vendor']}><Checkout /></ProtectedRoute>} />
                <Route path="/post-request" element={<ProtectedRoute allowedRoles={['customer']}><PostRequest /></ProtectedRoute>} />
                <Route path="/favorites" element={<ProtectedRoute allowedRoles={['customer']}><Favorites /></ProtectedRoute>} />

                {/* Vendor routes */}
                <Route path="/vendor-dashboard" element={<ProtectedRoute allowedRoles={['vendor']}><VendorDashboard /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute allowedRoles={['vendor']}><VendorProfile /></ProtectedRoute>} />
                <Route path="/services/create" element={<ProtectedRoute allowedRoles={['vendor', 'admin']}><ServiceEdit /></ProtectedRoute>} />
                <Route path="/services/:id/edit" element={<ProtectedRoute allowedRoles={['vendor', 'admin']}><ServiceEdit /></ProtectedRoute>} />

                {/* Admin routes */}
                <Route path="/admin-dashboard" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AdminDashboard /></ProtectedRoute>} />
                <Route path="/super-admin" element={<Navigate to="/admin-dashboard" replace />} />
                <Route path="/admin/users/:id/edit" element={<ProtectedRoute allowedRoles={['admin']}><UserEdit /></ProtectedRoute>} />

                {/* Shared authenticated routes */}
                <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
          {!isDashboardRoute && <Footer />}
          <MobileBottomNav />
        </div>
  );
}

function AppContent() {
  return (
    <SettingsProvider>
      <Router>
        <ScrollToTop />
        <DefaultSeo />
        <AppLayout />
      </Router>
    </SettingsProvider>
  );
}

function App() {
  return (
    <HelmetProvider>
      <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
      </ToastProvider>
    </HelmetProvider>
  );
}
export default App;

