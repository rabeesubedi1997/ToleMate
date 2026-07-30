import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Calendar, MessageCircle, CreditCard, Star, Settings, Trash2, ChevronDown } from 'lucide-react';
import SeoHead from '../components/SeoHead';
import api from '../utils/api';
import { serviceUrl } from '../utils/slug';

interface Notification { id: number; type: 'booking' | 'message' | 'payment' | 'review' | 'system'; title: string; message: string; data: any; is_read: boolean; created_at: string; }

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'booking' | 'message' | 'payment' | 'review' | 'system'>('all');
  const [showPrefs, setShowPrefs] = useState(false);

  const PREF_KEY = 'tolemate_notif_prefs';
  const defaultPrefs = { booking: true, message: true, payment: true, review: true, system: true };
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    try { return { ...defaultPrefs, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') }; }
    catch { return defaultPrefs; }
  });
  const [smsEnabled, setSmsEnabled] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem('tolemate_sms_pref') || 'false'); } catch { return false; }
  });
  const toggleSms = async () => {
    const next = !smsEnabled;
    setSmsEnabled(next);
    localStorage.setItem('tolemate_sms_pref', JSON.stringify(next));
    try {
      await api.put('/user/profile', { sms_notifications: next });
    } catch { /* ignore */ }
  };
  const togglePref = (key: string) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    localStorage.setItem(PREF_KEY, JSON.stringify(next));
  };

  useEffect(() => { fetchNotifications(); fetchUnreadCount(); }, [filter]);

  const fetchNotifications = async () => {
    try {
      const params: any = {};
      if (filter !== 'all') { if (filter === 'unread') params.unread_only = '1'; else params.type = filter; }
      const response = await api.get('/notifications', { params });
      setNotifications(response.data.data || response.data);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchUnreadCount = async () => {
    try { const response = await api.get('/notifications/unread-count'); setUnreadCount(response.data.unread_count); } catch (error) { console.error(error); }
  };

  const markAsRead = async (id?: number) => {
    try { const url = id ? `/notifications/${id}/read` : '/notifications/read';
      await api.put(url);
      fetchNotifications(); fetchUnreadCount();
    } catch (error) { console.error(error); }
  };

  const markAsUnread = async (id: number) => {
    try { await api.put(`/notifications/${id}/unread`); fetchNotifications(); fetchUnreadCount(); } catch (error) { console.error(error); }
  };

  const deleteNotification = async (id: number) => {
    try { await api.delete(`/notifications/${id}`); fetchNotifications(); fetchUnreadCount(); } catch (error) { console.error(error); }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString); const now = new Date(); const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000); const diffHours = Math.floor(diffMs / 3600000); const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now'; if (diffMins < 60) return `${diffMins}m ago`; if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getIcon = (type: string) => {
    const map: Record<string, any> = { booking: Calendar, message: MessageCircle, payment: CreditCard, review: Star, system: Settings };
    const Icon = map[type] || Bell; return <Icon className="w-4 h-4" />;
  };

  const getIconBg = (type: string) => {
    const map: Record<string, string> = { booking: 'bg-blue-100 text-blue-600', message: 'bg-green-100 text-green-600', payment: 'bg-yellow-100 text-yellow-600', review: 'bg-purple-100 text-purple-600', system: 'bg-gray-100 text-gray-600' };
    return map[type] || 'bg-gray-100 text-gray-600';
  };

  if (loading) return (
    <div className="min-h-screen py-8">
      <div className="container-custom max-w-3xl animate-pulse">
        <div className="h-7 bg-gray-200 rounded w-40 mb-1" />
        <div className="h-4 bg-gray-200 rounded w-56 mb-6" />
        <div className="card">
          <div className="p-3 border-b flex gap-2">
            {[1,2,3,4].map(i => <div key={i} className="h-7 w-16 bg-gray-200 rounded-md" />)}
          </div>
          <div className="divide-y divide-gray-100">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="p-4 flex gap-3">
                <div className="w-9 h-9 bg-gray-200 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-40" />
                  <div className="h-3 bg-gray-200 rounded w-72" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (<>
      <SeoHead
        title="Notifications"
        description="View your ToleMate notifications for booking updates and messages."
        noIndex={true}
      />
    <div className="min-h-screen py-8">
      <div className="container-custom max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500">Stay updated with your activity</p>
          </div>
          {unreadCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="badge badge-info">{unreadCount} unread</span>
              <button onClick={() => markAsRead()} className="btn-secondary text-xs">Mark all read</button>
            </div>
          )}
        </div>

        {/* Preferences panel */}
        <div className="card mb-4">
          <button onClick={() => setShowPrefs(s => !s)} className="w-full flex items-center justify-between p-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors rounded-xl">
            <span className="flex items-center gap-2"><Settings className="w-4 h-4 text-gray-400" /> Notification preferences</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showPrefs ? 'rotate-180' : ''}`} />
          </button>
          {showPrefs && (
            <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-gray-100 pt-4">
              {Object.entries(prefs).map(([key, val]) => (
                <label key={key} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 cursor-pointer select-none">
                  <span className="text-sm text-gray-700 capitalize">{key}</span>
                  <button onClick={() => togglePref(key)}
                    className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${val ? 'bg-primary-600' : 'bg-gray-200'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${val ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </label>
              ))}
              {/* SMS notifications */}
              <label className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 cursor-pointer select-none col-span-full">
                <div>
                  <span className="text-sm text-gray-700 font-medium">SMS Notifications</span>
                  <p className="text-xs text-gray-400">Receive booking updates via SMS</p>
                </div>
                <button onClick={toggleSms}
                  className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${smsEnabled ? 'bg-primary-600' : 'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${smsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </label>
            </div>
          )}
        </div>

        <div className="card">
          <div className="p-3 border-b border-gray-100 flex gap-1 overflow-x-auto">
            {(['all', 'unread', 'booking', 'message', 'payment', 'review', 'system'] as const).map((type) => (
              <button key={type} onClick={() => setFilter(type)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  filter === type ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}>{type.charAt(0).toUpperCase() + type.slice(1)}</button>
            ))}
          </div>

          <div className="divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <div className="p-12 text-center">
                <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <h3 className="font-medium text-gray-900 mb-1">No notifications</h3>
                <p className="text-sm text-gray-500">{filter === 'unread' ? 'All caught up!' : 'Nothing here yet'}</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`p-4 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-primary-50/50' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${getIconBg(n.type)}`}>
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-sm font-medium text-gray-900">{n.title}</h4>
                        {!n.is_read && <span className="w-2 h-2 bg-primary-500 rounded-full"></span>}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{n.message}</p>
                      {n.data && (
                        <div className="flex gap-3 text-xs">
                          {n.data.booking_id && <Link to={`/bookings/${n.data.booking_id}`} className="text-primary-600 hover:text-primary-700">View booking</Link>}
                          {n.data.service_id && <Link to={`/services/${n.data.service_id}`} className="text-primary-600 hover:text-primary-700">View service</Link>}
                          {n.data.message_id && <Link to={`/messages?booking=${n.data.booking_id}`} className="text-primary-600 hover:text-primary-700">View message</Link>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400">{formatDate(n.created_at)}</span>
                      <button onClick={() => n.is_read ? markAsUnread(n.id) : markAsRead(n.id)}
                        className="text-xs text-gray-400 hover:text-primary-600">{n.is_read ? 'Unread' : 'Read'}</button>
                      <button onClick={() => deleteNotification(n.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default Notifications;
