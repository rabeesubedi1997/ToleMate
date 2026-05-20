import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Bell, MessageCircle, User, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../utils/config';

const MobileBottomNav: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [unreadMsg, setUnreadMsg] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const refreshCounts = () => {
      fetch(`${API_BASE}/api/notifications/unread-count`, { headers })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setUnreadNotif(d.unread_count ?? 0); })
        .catch(() => {});

      fetch(`${API_BASE}/api/messages/unread-count`, { headers })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setUnreadMsg(d.unread_count ?? d.count ?? 0); })
        .catch(() => {});
    };

    refreshCounts();

    // Reset notification badge immediately when user visits Notifications page
    const onNotifRead = () => setUnreadNotif(0);
    window.addEventListener('notif-read', onNotifRead);

    return () => window.removeEventListener('notif-read', onNotifRead);
  }, [isAuthenticated, location.pathname]);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const getDashboardPath = () => {
    if (!user) return '/dashboard';
    if (user.role === 'admin') return '/admin-dashboard';
    if (user.role === 'vendor') return '/vendor-dashboard';
    return '/dashboard';
  };

  const navItems = isAuthenticated && user
    ? [
        { to: '/',             icon: Home,          label: 'Home' },
        { to: '/services',     icon: Search,        label: 'Browse' },
        { to: '/notifications', icon: Bell,         label: 'Alerts', badge: unreadNotif },
        { to: '/messages',     icon: MessageCircle, label: 'Chat',   badge: unreadMsg },
        { to: getDashboardPath(), icon: LayoutDashboard, label: 'Dashboard' },
      ]
    : [
        { to: '/',         icon: Home,   label: 'Home' },
        { to: '/services', icon: Search, label: 'Browse' },
        { to: '/login',    icon: User,   label: 'Sign in' },
      ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-bottom shadow-lg">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ to, icon: Icon, label, badge }) => {
          const active = to === '/' ? location.pathname === '/' : isActive(to);
          return (
            <Link key={to} to={to}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 relative transition-colors ${
                active ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {badge && badge > 0 ? (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                    {badge > 9 ? '9+' : badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[10px] font-medium leading-none ${active ? 'text-primary-600' : ''}`}>{label}</span>
              {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary-600 rounded-full" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
