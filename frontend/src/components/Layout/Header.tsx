import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Menu, X, Globe, Heart, Bell, MessageCircle } from 'lucide-react';
import api from '../../utils/api';

interface MenuItem { id: number; label: string; path: string; icon?: string; children?: MenuItem[]; }

const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { getSetting } = useSettings();
  const { user, isAuthenticated, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [navLinks, setNavLinks] = useState<MenuItem[]>([]);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const { data } = await api.get('/menus');
        if (data) setNavLinks(data);
      } catch { }
    };
    fetchMenu();
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchCounts = () => {
      api.get('/notifications/unread-count')
        .then(({ data }) => { if (data) setUnreadCount(data.unread_count ?? 0); })
        .catch(() => {});

      api.get('/messages/unread-count')
        .then(({ data }) => { if (data) setUnreadMessages(data.unread_count ?? data.count ?? 0); })
        .catch(() => {});
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const siteName = getSetting('site_name', 'ToleMate');

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  const getDashboardPath = () => {
    if (!user) return '/dashboard';
    if (user.role === 'super_admin') return '/super-admin';
    if (user.role === 'admin') return '/admin-dashboard';
    if (user.role === 'vendor') return '/vendor-dashboard';
    return '/dashboard';
  };

  return (
    <header className={`sticky top-0 z-50 bg-white border-b transition-shadow duration-200 ${isScrolled ? 'shadow-sm border-gray-200' : 'border-gray-100'}`}>
      <div className="container-custom">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src="/apple-touch-icon.png" alt={siteName} className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-lg text-gray-900">{siteName}</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link: any, idx: number) => (
              <Link
                key={idx}
                to={link.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Globe className="w-4 h-4 flex-shrink-0" />
              <div id="google_translate_element" />
            </div>

            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                {user.role === 'customer' && (
                  <Link to="/favorites" title="Saved services" className="p-2 text-gray-500 hover:text-red-500 transition-colors relative">
                    <Heart className="w-5 h-5" />
                  </Link>
                )}
                <Link to="/messages" className="p-2 text-gray-500 hover:text-primary-600 transition-colors relative" title="Messages">
                  <MessageCircle className="w-5 h-5" />
                  {unreadMessages > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-blue-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </Link>
                <Link to="/notifications" className="p-2 text-gray-500 hover:text-primary-600 transition-colors relative" title="Notifications">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <Link
                  to={getDashboardPath()}
                  className="btn-primary text-sm"
                >
                  {user.role === 'admin' ? 'Admin Panel' : t('dashboard')}
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-red-600 font-medium transition-colors"
                >
                  {t('logout')}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                  {t('login')}
                </Link>
                <Link to="/register" className="btn-primary text-sm">
                  {t('signup')}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Controls */}
          <div className="md:hidden flex items-center gap-2">
            <div id="google_translate_element_mobile" className="text-xs" />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-600 hover:bg-gray-50 rounded-md"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute left-0 right-0 top-full z-40 bg-white animate-fade-in border-t border-gray-100 shadow-lg rounded-b-xl max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="container-custom py-3 space-y-1">
            {navLinks.map((link: any, idx: number) => (
              <Link
                key={idx}
                to={link.path}
                className={`block px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="pt-3 mt-2 border-t border-gray-100 space-y-1">
              {isAuthenticated && user ? (
                <>
                  <Link to={getDashboardPath()} className="block w-full btn-primary text-center text-sm">
                    {user.role === 'admin' ? 'Admin Panel' : t('dashboard')}
                  </Link>
                  <button onClick={handleLogout} className="block w-full px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md text-left">
                    {t('logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                    {t('login')}
                  </Link>
                  <Link to="/register" className="block w-full btn-primary text-center text-sm">
                    {t('signup')}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
