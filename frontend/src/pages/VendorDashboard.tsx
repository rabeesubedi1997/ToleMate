import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Briefcase, Inbox, CalendarDays, ShoppingBag, Plus, DollarSign, Star, TrendingUp, Menu, X, Clock, MessageSquare, Lock, Camera, ChevronDown, ChevronUp, Zap, AlarmClock, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { API_BASE } from '../utils/config';
import { DashboardSkeleton } from '../components/Skeleton';
import TableControls from '../components/TableControls';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0') + ':00');

interface AvailSlot { day_of_week: number; start_time: string; end_time: string; is_available: boolean; }

interface Service { id: number; name: string; description: string; pricing_type: 'fixed' | 'hourly' | 'quote'; price: number | null; is_active: boolean; category: { name: string; }; created_at: string; images?: { image_url: string }[]; }
interface BookingRequest { id: number; text: string; status: string; created_at: string; customer: { name: string; email: string; phone: string; }; }
interface Booking { id: number; status: string; price: number | null; scheduled_time: string | null; created_at: string; service: { name: string; price?: number | null; }; customer: { name: string; }; review?: { rating: number; comment: string | null; } | null; reschedule_status?: string | null; reschedule_to?: string | null; }
interface Vendor { business_name: string; description: string; rating: number; service_area_radius: number; subscription_plan?: 'free' | 'basic' | 'pro'; id?: number; avatar?: string | null; location?: string | null; }

const VendorDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'requests' | 'bookings' | 'availability' | 'bundles' | 'portfolio' | 'reviews'>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookingFilter, setBookingFilter] = useState<'all' | 'pending' | 'active' | 'completed' | 'cancelled'>('all');

  // Leads (InDrive-style incoming requests)
  const [leads, setLeads] = useState<any[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [expandedLead, setExpandedLead] = useState<number | null>(null);
  const [counterPrices, setCounterPrices] = useState<Record<number, string>>({});
  const [bidSubmitting, setBidSubmitting] = useState<number | null>(null);
  const [myBids, setMyBids] = useState<Record<number, any>>({}); // requestId → bid

  // Availability state
  const [availability, setAvailability] = useState<AvailSlot[]>([]);
  const [availSaving, setAvailSaving] = useState(false);
  const [availSaved, setAvailSaved] = useState(false);

  // Reviews state
  const [vendorReviews, setVendorReviews] = useState<any[]>([]);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySaving, setReplySaving] = useState(false);

  // Feature flags from admin
  const [features, setFeatures] = useState<Record<string, boolean>>({ bookings: true, messaging: true, services: true, availability_edit: true, social_links: true, reviews: true });

  // Bundles
  const [bundles, setBundles] = useState<any[]>([]);
  const [bundleForm, setBundleForm] = useState({ name: '', description: '', service_ids: [] as number[], bundle_price: '', discount_percent: '' });
  const [bundleSaving, setBundleSaving] = useState(false);

  // Portfolio
  const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
  const [portfolioUploading, setPortfolioUploading] = useState(false);

  // ── Search / pagination state ──
  const [vSvcSearch, setVSvcSearch] = useState('');
  const [vSvcPage, setVSvcPage] = useState(1);
  const [vSvcRpp, setVSvcRpp] = useState(10);
  const [vBkSearch, setVBkSearch] = useState('');
  const [vBkPage, setVBkPage] = useState(1);
  const [vBkRpp, setVBkRpp] = useState(10);
  const [vLeadSearch, setVLeadSearch] = useState('');
  const [vLeadPage, setVLeadPage] = useState(1);
  const [vLeadRpp, setVLeadRpp] = useState(20);
  const [vRevSearch, setVRevSearch] = useState('');
  const [vRevPage, setVRevPage] = useState(1);
  const [vRevRpp, setVRevRpp] = useState(10);
  const [vBundSearch, setVBundSearch] = useState('');
  const [vBundPage, setVBundPage] = useState(1);
  const [vBundRpp, setVBundRpp] = useState(10);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    const fetchAll = async () => { setLoading(true); await Promise.all([fetchUser(), fetchVendorData(), fetchServices(), fetchBookingRequests(), fetchBookings(), fetchAvailability(), fetchVendorReviews(), fetchFeatures(), fetchBundles()]); setLoading(false); };
    fetchAll();
  }, [navigate]);

  // Handle ?tab= and ?request= URL params (from VendorRequestToast)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab') as any;
    const requestId = params.get('request');
    if (tab) setActiveTab(tab);
    if (requestId) {
      setExpandedLead(parseInt(requestId));
      if (!tab) setActiveTab('requests');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Fetch leads when requests tab is opened
  useEffect(() => {
    if (activeTab === 'requests') fetchLeads();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchUser = async () => { const r = await fetch(`${API_BASE}/api/user`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }); if (r.ok) setUser(await r.json()); };
  const fetchVendorData = async () => { const r = await fetch(`${API_BASE}/api/vendor/profile`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }); if (r.ok) { const d = await r.json(); setVendor(d); if (d.id) fetchPortfolio(d.id); } };
  const fetchServices = async () => { const r = await fetch(`${API_BASE}/api/services`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }); if (r.ok) { const d = await r.json(); setServices(d.data || d); } };
  const fetchBookingRequests = async () => { const r = await fetch(`${API_BASE}/api/booking-requests`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }); if (r.ok) { const d = await r.json(); setBookingRequests(d.data || d); } };
  const fetchBookings = async () => { const r = await fetch(`${API_BASE}/api/bookings`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }); if (r.ok) { const d = await r.json(); setAllBookings(d.data || d); } };
  const fetchAvailability = async () => {
    const r = await fetch(`${API_BASE}/api/vendor/availability`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
    if (r.ok) { const d = await r.json(); setAvailability(d.availability || []); }
  };

  const fetchVendorReviews = async () => {
    const r = await fetch(`${API_BASE}/api/vendor/profile`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
    if (r.ok) {
      const v = await r.json();
      if (v.id) {
        const rev = await fetch(`${API_BASE}/api/vendors/${v.id}/reviews`);
        if (rev.ok) { const d = await rev.json(); setVendorReviews(d.data || d); }
      }
    }
  };

  const fetchFeatures = async () => {
    const r = await fetch(`${API_BASE}/api/vendor/features`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
    if (r.ok) { const d = await r.json(); setFeatures(prev => ({ ...prev, ...d.features })); }
  };

  const fetchBundles = async () => {
    const r = await fetch(`${API_BASE}/api/vendor/bundles`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
    if (r.ok) { const d = await r.json(); setBundles(d.bundles || []); }
  };

  const fetchPortfolio = async (vendorId: number) => {
    const r = await fetch(`${API_BASE}/api/vendors/${vendorId}/portfolio`);
    if (r.ok) { const d = await r.json(); setPortfolioItems(d.portfolio || []); }
  };

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setPortfolioUploading(true);
    const fd = new FormData();
    fd.append('image', e.target.files[0]);
    const r = await fetch(`${API_BASE}/api/vendor/portfolio`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: fd,
    });
    setPortfolioUploading(false);
    if (r.ok) { const d = await r.json(); setPortfolioItems(prev => [...prev, d.item]); }
  };

  const deletePortfolioItem = async (itemId: number) => {
    const r = await fetch(`${API_BASE}/api/vendor/portfolio/${itemId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    });
    if (r.ok) setPortfolioItems(prev => prev.filter(i => i.id !== itemId));
  };

  const createBundle = async () => {
    if (!bundleForm.name || !bundleForm.bundle_price || bundleForm.service_ids.length < 2) return;
    setBundleSaving(true);
    const r = await fetch(`${API_BASE}/api/vendor/bundles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ ...bundleForm, discount_percent: bundleForm.discount_percent || 0 }),
    });
    setBundleSaving(false);
    if (r.ok) { const d = await r.json(); setBundles(prev => [...prev, d.bundle]); setBundleForm({ name: '', description: '', service_ids: [], bundle_price: '', discount_percent: '' }); }
  };

  const deleteBundle = async (id: number) => {
    const r = await fetch(`${API_BASE}/api/vendor/bundles/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
    if (r.ok) setBundles(prev => prev.filter(b => b.id !== id));
  };
  const saveAvailability = async () => {
    setAvailSaving(true);
    const r = await fetch(`${API_BASE}/api/vendor/availability`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ availability }),
    });
    setAvailSaving(false);
    if (r.ok) { setAvailSaved(true); setTimeout(() => setAvailSaved(false), 2500); }
  };

  const respondReschedule = async (bookingId: number, action: 'accept' | 'decline') => {
    const r = await fetch(`${API_BASE}/api/bookings/${bookingId}/reschedule-respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ action }),
    });
    if (r.ok) {
      const d = await r.json();
      setAllBookings(prev => prev.map(b => b.id === bookingId ? { ...b, ...d.booking } : b));
    }
  };

  const totalEarnings = allBookings.filter(b => b.status === 'completed').reduce((s, b) => s + (b.price || 0), 0);
  const activeBookingsCount = allBookings.filter(b => ['accepted', 'in_progress'].includes(b.status)).length;

  const toggleServiceStatus = async (serviceId: number, currentStatus: boolean) => {
    try { const r = await fetch(`${API_BASE}/api/services/${serviceId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify({ is_active: !currentStatus }) }); if (r.ok) fetchServices(); } catch (e) { console.error(e); }
  };

  const handleServiceImageUpload = async (serviceId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('image', file);
    try {
      const r = await fetch(`${API_BASE}/api/services/${serviceId}/image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: form,
      });
      if (r.ok) fetchServices();
    } catch (err) { console.error(err); }
  };

  const updateBookingStatus = async (bookingId: number, status: string) => {
    try { const r = await fetch(`${API_BASE}/api/bookings/${bookingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify({ status }) }); if (r.ok) fetchBookings(); } catch (e) { console.error(e); }
  };

  const postReply = async (reviewId: number) => {
    if (!replyText.trim()) return;
    setReplySaving(true);
    try {
      const r = await fetch(`${API_BASE}/api/reviews/${reviewId}/reply`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ vendor_reply: replyText }),
      });
      if (r.ok) { setReplyText(''); setReplyingTo(null); fetchVendorReviews(); }
    } finally { setReplySaving(false); }
  };

  const fetchLeads = async () => {
    setLeadsLoading(true);
    const r = await fetch(`${API_BASE}/api/vendor/incoming-requests`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    if (r.ok) {
      const d = await r.json();
      const items: any[] = d.data || d;
      setLeads(items);
      // Build myBids map: requestId → first bid from this vendor
      const bidsMap: Record<number, any> = {};
      items.forEach((req: any) => {
        if (req.bids && req.bids.length > 0) bidsMap[req.id] = req.bids[0];
      });
      setMyBids(bidsMap);
    }
    setLeadsLoading(false);
  };

  const placeBid = async (requestId: number, offeredPrice: number | null, note?: string) => {
    setBidSubmitting(requestId);
    const r = await fetch(`${API_BASE}/api/booking-requests/${requestId}/bid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ offered_price: offeredPrice, note }),
    });
    if (r.ok) {
      const d = await r.json();
      setMyBids(prev => ({ ...prev, [requestId]: d.bid }));
      setCounterPrices(prev => { const n = { ...prev }; delete n[requestId]; return n; });
    }
    setBidSubmitting(null);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) return <DashboardSkeleton />;

  // ── Filtered + paged data (after early-return guard) ──
  const vSvcFiltered = vSvcSearch
    ? services.filter(s => s.name?.toLowerCase().includes(vSvcSearch.toLowerCase()) || s.category?.name?.toLowerCase().includes(vSvcSearch.toLowerCase()))
    : services;
  const vSvcTP = Math.max(1, Math.ceil(vSvcFiltered.length / vSvcRpp));
  const vSvcSP = Math.min(Math.max(1, vSvcPage), vSvcTP);
  const vPagedSvc = vSvcFiltered.slice((vSvcSP - 1) * vSvcRpp, vSvcSP * vSvcRpp);

  const vBkBase = bookingFilter === 'all' ? allBookings
    : bookingFilter === 'active' ? allBookings.filter(b => ['accepted', 'in_progress'].includes(b.status))
    : allBookings.filter(b => b.status === bookingFilter);
  const vBkFiltered = vBkSearch
    ? vBkBase.filter(b => b.customer?.name?.toLowerCase().includes(vBkSearch.toLowerCase()) || b.service?.name?.toLowerCase().includes(vBkSearch.toLowerCase()))
    : vBkBase;
  const vBkTP = Math.max(1, Math.ceil(vBkFiltered.length / vBkRpp));
  const vBkSP = Math.min(Math.max(1, vBkPage), vBkTP);
  const vPagedBk = vBkFiltered.slice((vBkSP - 1) * vBkRpp, vBkSP * vBkRpp);

  const vLeadFiltered = vLeadSearch
    ? leads.filter(r => r.title?.toLowerCase().includes(vLeadSearch.toLowerCase()) || r.category?.name?.toLowerCase().includes(vLeadSearch.toLowerCase()) || r.customer?.name?.toLowerCase().includes(vLeadSearch.toLowerCase()))
    : leads;
  const vLeadTP = Math.max(1, Math.ceil(vLeadFiltered.length / vLeadRpp));
  const vLeadSP = Math.min(Math.max(1, vLeadPage), vLeadTP);
  const vPagedLead = vLeadFiltered.slice((vLeadSP - 1) * vLeadRpp, vLeadSP * vLeadRpp);

  const vRevFiltered = vRevSearch
    ? vendorReviews.filter(r => r.customer?.name?.toLowerCase().includes(vRevSearch.toLowerCase()) || r.comment?.toLowerCase().includes(vRevSearch.toLowerCase()))
    : vendorReviews;
  const vRevTP = Math.max(1, Math.ceil(vRevFiltered.length / vRevRpp));
  const vRevSP = Math.min(Math.max(1, vRevPage), vRevTP);
  const vPagedRev = vRevFiltered.slice((vRevSP - 1) * vRevRpp, vRevSP * vRevRpp);

  const vBundFiltered = vBundSearch
    ? bundles.filter(b => b.name?.toLowerCase().includes(vBundSearch.toLowerCase()))
    : bundles;
  const vBundTP = Math.max(1, Math.ceil(vBundFiltered.length / vBundRpp));
  const vBundSP = Math.min(Math.max(1, vBundPage), vBundTP);
  const vPagedBund = vBundFiltered.slice((vBundSP - 1) * vBundRpp, vBundSP * vBundRpp);

  const tabs = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'services', label: 'Services', icon: Briefcase },
    { key: 'requests', label: 'Leads', icon: Inbox },
    { key: 'bookings', label: 'Bookings', icon: CalendarDays },
    { key: 'reviews', label: 'Reviews', icon: Star },
    { key: 'availability', label: 'Availability', icon: Clock },
    { key: 'bundles', label: 'Bundles', icon: ShoppingBag },
    { key: 'portfolio', label: 'Portfolio', icon: Camera },
  ] as const;

  return (
    <div className="min-h-screen flex">
      {/* Mobile menu toggle */}
      <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden fixed bottom-6 right-6 z-50 w-12 h-12 bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center">
        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-16 left-0 h-[calc(100vh-4rem)] w-60 bg-white border-r border-gray-200 z-40 flex flex-col transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-400 uppercase mb-1">Business</p>
          <p className="font-semibold text-gray-900 text-sm truncate">{vendor?.business_name}</p>
        </div>
        <nav className="p-2 flex-1 space-y-0.5">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => { setActiveTab(key); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === key ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
              }`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
          <button onClick={() => navigate('/marketplace')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
            <ShoppingBag className="w-4 h-4" /> Marketplace
          </button>
        </nav>
        <div className="p-3 border-t border-gray-100 space-y-2">
          <Link to="/services/create" className="btn-primary w-full text-sm py-2"><Plus className="w-4 h-4" /> New service</Link>
          <Link to="/profile" className="btn-ghost w-full text-sm justify-start">Business profile</Link>
          <Link to="/messages" className="btn-ghost w-full text-sm justify-start">Messages</Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 capitalize">{activeTab}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-sm text-gray-500">{vendor?.business_name} dashboard</p>
                {vendor?.subscription_plan && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                    vendor.subscription_plan === 'pro' ? 'bg-purple-100 text-purple-700' :
                    vendor.subscription_plan === 'basic' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>{vendor.subscription_plan}</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Total earnings</p>
              <p className="text-xl font-bold text-green-600">Rs. {totalEarnings.toLocaleString()}</p>
            </div>
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-6">

              {/* Onboarding wizard — shown for new vendors with no services */}
              {services.length === 0 && allBookings.length === 0 && (
                <div className="card p-6 border-l-4 border-primary-500 bg-primary-50/40">
                  <h3 className="font-bold text-gray-900 mb-1">Welcome to your dashboard! 🎉</h3>
                  <p className="text-sm text-gray-500 mb-4">Complete these steps to start getting bookings.</p>
                  <div className="space-y-3">
                    {[
                      { done: !!(vendor?.business_name && vendor?.description), label: 'Complete your business profile', action: '/profile', cta: 'Set up profile' },
                      { done: services.length > 0, label: 'Add your first service', action: '/services/create', cta: 'Add service' },
                      { done: !!(availability.find(s => s.is_available)), label: 'Set your availability hours', action: undefined, cta: 'Set hours', onClick: () => setActiveTab('availability') },
                    ].map(({ done, label, action, cta, onClick }) => (
                      <div key={label} className={`flex items-center justify-between p-3 rounded-lg ${done ? 'bg-green-50 border border-green-100' : 'bg-white border border-gray-100'}`}>
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${done ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>{done ? '✓' : '○'}</span>
                          <span className={`text-sm ${done ? 'text-green-700 line-through' : 'text-gray-700'}`}>{label}</span>
                        </div>
                        {!done && (
                          action
                            ? <Link to={action} className="btn-primary text-xs py-1.5 px-3">{cta}</Link>
                            : <button onClick={onClick} className="btn-primary text-xs py-1.5 px-3">{cta}</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Services</p><p className="text-2xl font-bold text-gray-900">{services.length}</p></div>
                <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Active jobs</p><p className="text-2xl font-bold text-blue-600">{activeBookingsCount}</p></div>
                <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Leads</p><p className="text-2xl font-bold text-yellow-600">{bookingRequests.length}</p></div>
                <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Rating</p><p className="text-2xl font-bold text-gray-900">{vendor?.rating || '5.0'}</p></div>
              </div>

              {/* Earnings chart */}
              {(() => {
                const now = new Date();
                const months = Array.from({ length: 6 }, (_, i) => {
                  const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
                  return { label: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), month: d.getMonth() };
                });
                const data = months.map(m => ({
                  ...m,
                  value: allBookings.filter(b => {
                    if (b.status !== 'completed') return false;
                    const d = new Date(b.created_at);
                    return d.getFullYear() === m.year && d.getMonth() === m.month;
                  }).reduce((s, b) => s + (b.price || 0), 0),
                }));
                const maxVal = Math.max(...data.map(d => d.value), 1);
                return (
                  <div className="card p-6">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">Monthly Earnings</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Completed bookings · last 6 months</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Total</p>
                        <p className="text-lg font-bold text-green-600">Rs. {totalEarnings.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-end gap-2 h-32">
                      {data.map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                          <span className="text-xs font-semibold text-gray-600">
                            {d.value > 0 ? `${(d.value / 1000).toFixed(0)}k` : ''}
                          </span>
                          <div
                            className="w-full rounded-t-lg bg-primary-500 hover:bg-primary-600 transition-all duration-500 relative group"
                            style={{ height: `${Math.max((d.value / maxVal) * 100, d.value > 0 ? 4 : 0)}%`, minHeight: d.value > 0 ? '4px' : '0' }}
                            title={`Rs. ${d.value.toLocaleString()}`}
                          >
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                              Rs. {d.value.toLocaleString()}
                            </div>
                          </div>
                          <span className="text-xs text-gray-400">{d.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Profile completeness score */}
              {(() => {
                const checks = [
                  { done: !!(vendor?.business_name), label: 'Business name' },
                  { done: !!(vendor?.description && vendor.description.length >= 20), label: 'Description (20+ chars)' },
                  { done: !!(vendor?.avatar), label: 'Profile photo' },
                  { done: !!(vendor?.location), label: 'Location' },
                  { done: services.length > 0, label: 'At least 1 service' },
                  { done: !!(availability.find(s => s.is_available)), label: 'Availability set' },
                  { done: Number(vendor?.rating ?? 0) > 0, label: 'Has reviews' },
                ];
                const score = Math.round((checks.filter(c => c.done).length / checks.length) * 100);
                const color = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-400' : 'bg-red-400';
                return (
                  <div className="card p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 text-sm">Profile Completeness</h3>
                      <span className={`text-sm font-bold ${score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>{score}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full mb-4 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${score}%` }} />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {checks.map(({ done, label }) => (
                        <div key={label} className="flex items-center gap-1.5 text-xs">
                          <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] ${done ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-300'}`}>{done ? '✓' : '○'}</span>
                          <span className={done ? 'text-gray-600' : 'text-gray-400'}>{label}</span>
                        </div>
                      ))}
                    </div>
                    {score < 100 && (
                      <p className="text-xs text-gray-400 mt-3">Complete your profile to attract more bookings.</p>
                    )}
                  </div>
                );
              })()}

              {/* Top services by bookings */}
              {services.length > 0 && (() => {
                const svcStats = services.map(s => ({
                  ...s,
                  bookingCount: allBookings.filter(b => b.service.name === s.name).length,
                  revenue: allBookings.filter(b => b.service.name === s.name && b.status === 'completed').reduce((sum, b) => sum + (b.price || 0), 0),
                })).sort((a, b) => b.bookingCount - a.bookingCount).slice(0, 5);
                return (
                  <div className="card p-5">
                    <h3 className="font-semibold text-gray-900 text-sm mb-4">Top Services</h3>
                    <div className="space-y-3">
                      {svcStats.map((s, i) => (
                        <div key={s.id} className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-yellow-100 text-yellow-600' : i === 1 ? 'bg-gray-100 text-gray-500' : 'bg-orange-50 text-orange-400'}`}>{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                            <p className="text-xs text-gray-400">{s.bookingCount} booking{s.bookingCount !== 1 ? 's' : ''}</p>
                          </div>
                          <span className="text-sm font-semibold text-green-600 flex-shrink-0">Rs. {s.revenue.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="card">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900 text-sm">Recent activity</h3>
                  <button onClick={() => setActiveTab('bookings')} className="text-primary-600 text-xs font-medium hover:underline">View all</button>
                </div>
                <div className="divide-y divide-gray-100">
                  {allBookings.slice(0, 5).map(b => (
                    <div key={b.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{b.service.name}</p>
                        <p className="text-xs text-gray-500">Customer: {b.customer.name}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`badge ${b.status === 'completed' ? 'badge-success' : b.status === 'cancelled' ? 'badge-danger' : 'badge-info'}`}>{b.status.replace('_', ' ')}</span>
                        <span className="text-xs text-gray-400">{formatDate(b.created_at)}</span>
                      </div>
                    </div>
                  ))}
                  {allBookings.length === 0 && <div className="p-8 text-center text-sm text-gray-400">No bookings yet</div>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'services' && (
            features.services === false ? (
              <div className="card p-8 flex flex-col items-center justify-center text-center gap-3">
                <Lock className="w-8 h-8 text-gray-300" />
                <p className="font-medium text-gray-700">Service listings are disabled</p>
                <p className="text-sm text-gray-400">Contact your admin to enable this feature.</p>
              </div>
            ) : (
            <div className="space-y-4">
              <TableControls
                search={vSvcSearch} onSearch={v => { setVSvcSearch(v); setVSvcPage(1); }}
                searchPlaceholder="Search services…"
                page={vSvcSP} totalPages={vSvcTP} onPageChange={setVSvcPage}
                rowsPerPage={vSvcRpp} onRowsPerPageChange={v => { setVSvcRpp(v); setVSvcPage(1); }}
                totalItems={vSvcFiltered.length}
                exportFilename="services"
                exportRows={() => [
                  ['Name', 'Category', 'Price', 'Type', 'Status'],
                  ...vSvcFiltered.map(s => [s.name, s.category?.name, s.price ?? 'Quote', s.pricing_type, s.is_active ? 'Active' : 'Paused']),
                ]}
              />
              {vPagedSvc.map(s => (
                <div key={s.id} className="card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Service image */}
                    <label htmlFor={`svc-img-${s.id}`} className="w-14 h-14 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity relative group" title="Click to upload cover image">
                      {s.images?.[0]?.image_url ? (
                        <img src={`http://localhost:8001${s.images[0].image_url}`} alt={s.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                        </div>
                      )}
                      <input id={`svc-img-${s.id}`} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                        onChange={e => handleServiceImageUpload(s.id, e)} />
                    </label>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">{s.name}</h4>
                        <span className="badge badge-neutral">{s.category.name}</span>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-1 mb-2">{s.description}</p>
                      <p className="font-semibold text-gray-900">{s.price ? `Rs. ${Number(s.price).toLocaleString()}` : 'Quote'}{s.pricing_type === 'hourly' ? '/hr' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleServiceStatus(s.id, s.is_active)}
                      className={`badge ${s.is_active ? 'badge-success' : 'badge-danger'} cursor-pointer`}>
                      {s.is_active ? 'Active' : 'Paused'}
                    </button>
                    <Link to={`/services/${s.id}/edit`} className="text-primary-600 text-sm font-medium hover:underline">Edit</Link>
                  </div>
                </div>
              ))}
              {vSvcFiltered.length === 0 && <div className="card p-8 text-center text-sm text-gray-400">No services match your search.</div>}
            </div>
            )
          )}

          {(activeTab === 'requests' || activeTab === 'bookings') && (
            features.bookings === false ? (
              <div className="card p-8 flex flex-col items-center justify-center text-center gap-3">
                <Lock className="w-8 h-8 text-gray-300" />
                <p className="font-medium text-gray-700">Booking management is disabled</p>
                <p className="text-sm text-gray-400">Contact your admin to enable this feature.</p>
              </div>
            ) : (
            <div className="card overflow-hidden">
              {activeTab === 'requests' && (
                <div className="px-4 pt-3 pb-2 border-b border-gray-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Incoming requests</p>
                      <p className="text-xs text-gray-400">Open requests matching your service categories</p>
                    </div>
                    <button onClick={fetchLeads} disabled={leadsLoading} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                      {leadsLoading ? '…' : '↻ Refresh'}
                    </button>
                  </div>
                  <TableControls
                    search={vLeadSearch} onSearch={v => { setVLeadSearch(v); setVLeadPage(1); }}
                    searchPlaceholder="Search leads…"
                    page={vLeadSP} totalPages={vLeadTP} onPageChange={setVLeadPage}
                    rowsPerPage={vLeadRpp} onRowsPerPageChange={v => { setVLeadRpp(v); setVLeadPage(1); }}
                    totalItems={vLeadFiltered.length}
                    exportFilename="leads"
                    exportRows={() => [
                      ['Title', 'Category', 'Budget', 'Urgency', 'Customer'],
                      ...vLeadFiltered.map(r => [r.title, r.category?.name, r.budget ?? 'Open', r.urgency, r.customer?.name]),
                    ]}
                  />
                </div>
              )}
              {activeTab === 'bookings' && (
                <div className="px-4 pt-4 pb-0 space-y-3">
                  <div className="flex items-center gap-1 overflow-x-auto">
                  {([
                    { key: 'all',       label: 'All',       count: allBookings.length },
                    { key: 'pending',   label: 'Pending',   count: allBookings.filter(b => b.status === 'pending').length },
                    { key: 'active',    label: 'Active',    count: allBookings.filter(b => ['accepted','in_progress'].includes(b.status)).length },
                    { key: 'completed', label: 'Completed', count: allBookings.filter(b => b.status === 'completed').length },
                    { key: 'cancelled', label: 'Cancelled', count: allBookings.filter(b => b.status === 'cancelled').length },
                  ] as const).map(({ key, label, count }) => (
                    <button key={key} onClick={() => setBookingFilter(key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                        bookingFilter === key
                          ? 'border-primary-600 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}>
                      {label}
                      {count > 0 && <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${bookingFilter === key ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>{count}</span>}
                    </button>
                  ))}
                  </div>
                  <TableControls
                    search={vBkSearch} onSearch={v => { setVBkSearch(v); setVBkPage(1); }}
                    searchPlaceholder="Search by customer or service…"
                    page={vBkSP} totalPages={vBkTP} onPageChange={setVBkPage}
                    rowsPerPage={vBkRpp} onRowsPerPageChange={v => { setVBkRpp(v); setVBkPage(1); }}
                    totalItems={vBkFiltered.length}
                    exportFilename="bookings"
                    exportRows={() => [
                      ['Customer', 'Service', 'Status', 'Amount', 'Date'],
                      ...vBkFiltered.map(b => [b.customer?.name, b.service?.name, b.status, b.price ?? '', b.scheduled_time ? new Date(b.scheduled_time).toLocaleDateString() : new Date(b.created_at).toLocaleDateString()]),
                    ]}
                  />
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="bg-gray-50 text-xs text-gray-500 font-medium">
                    <th className="p-4">Client</th><th className="p-4">Details</th><th className="p-4">Status</th><th className="p-4 text-right">Action</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeTab === 'requests' && vPagedLead.map(req => {
                      const bid = myBids[req.id];
                      const isExpanded = expandedLead === req.id;
                      const urgencyColor: Record<string, string> = { asap: 'bg-red-100 text-red-700', this_week: 'bg-orange-100 text-orange-700', this_month: 'bg-blue-100 text-blue-700', flexible: 'bg-gray-100 text-gray-500' };
                      const urgencyLabel: Record<string, string> = { asap: 'ASAP', this_week: 'This week', this_month: 'This month', flexible: 'Flexible' };
                      return (
                        <tr key={req.id} className={`transition-colors ${isExpanded ? 'bg-primary-50/30' : 'hover:bg-gray-50'}`}>
                          <td colSpan={4} className="p-0">
                            {/* Compact row — InDrive card style */}
                            <div
                              className="flex items-start gap-3 px-4 py-3.5 cursor-pointer select-none"
                              onClick={() => setExpandedLead(isExpanded ? null : req.id)}
                            >
                              {/* Category badge / urgency */}
                              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm uppercase">
                                {(req.category?.name ?? 'S')[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-semibold text-gray-900 truncate">{req.title}</p>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${urgencyColor[req.urgency] ?? 'bg-gray-100 text-gray-500'}`}>{urgencyLabel[req.urgency] ?? req.urgency}</span>
                                  {bid && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Offer sent</span>}
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">{req.category?.name} · {req.customer?.name} · {req.budget ? `Budget: Rs. ${Number(req.budget).toLocaleString()}` : 'Open budget'}</p>
                              </div>
                              <div className="flex-shrink-0 flex items-center gap-1 ml-2">
                                {!bid && (
                                  <button
                                    onClick={e => { e.stopPropagation(); placeBid(req.id, req.budget, undefined); }}
                                    disabled={bidSubmitting === req.id}
                                    className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap"
                                  >
                                    {bidSubmitting === req.id ? '…' : req.budget ? `Accept · Rs.${Number(req.budget).toLocaleString()}` : 'Accept'}
                                  </button>
                                )}
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                              </div>
                            </div>

                            {/* Expanded detail panel */}
                            {isExpanded && (
                              <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3 animate-fade-in">
                                <p className="text-sm text-gray-700 leading-relaxed">{req.text}</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  {req.budget && <div className="bg-green-50 rounded-lg p-2.5"><p className="text-[10px] text-gray-400 mb-0.5">Budget</p><p className="text-sm font-bold text-green-700">Rs. {Number(req.budget).toLocaleString()}</p></div>}
                                  {req.preferred_date && <div className="bg-blue-50 rounded-lg p-2.5"><p className="text-[10px] text-gray-400 mb-0.5">Preferred date</p><p className="text-sm font-semibold text-blue-700">{new Date(req.preferred_date).toLocaleDateString()}</p></div>}
                                  <div className="bg-gray-50 rounded-lg p-2.5"><p className="text-[10px] text-gray-400 mb-0.5">Posted</p><p className="text-sm font-semibold text-gray-700">{formatDate(req.created_at)}</p></div>
                                  {req.category && <div className="bg-purple-50 rounded-lg p-2.5"><p className="text-[10px] text-gray-400 mb-0.5">Category</p><p className="text-sm font-semibold text-purple-700">{req.category.name}</p></div>}
                                </div>

                                {/* My bid status */}
                                {bid ? (
                                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                    <div className="flex-1">
                                      <p className="text-sm font-semibold text-green-800">Offer sent · Rs. {Number(bid.offered_price).toLocaleString()}</p>
                                      {bid.note && <p className="text-xs text-green-600 mt-0.5">"{bid.note}"</p>}
                                      <p className="text-[10px] text-green-500 mt-0.5">Status: {bid.status} · Expires {bid.expires_at ? new Date(bid.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                                    </div>
                                  </div>
                                ) : (
                                  /* Bid form */
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <div className="flex-1 min-w-[160px]">
                                      <input
                                        type="number"
                                        min={1}
                                        placeholder={req.budget ? `Counter price (default: Rs.${Number(req.budget).toLocaleString()})` : 'Your price (Rs.)'}
                                        value={counterPrices[req.id] ?? ''}
                                        onChange={e => setCounterPrices(prev => ({ ...prev, [req.id]: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                                      />
                                    </div>
                                    <button
                                      disabled={bidSubmitting === req.id}
                                      onClick={() => placeBid(req.id, counterPrices[req.id] ? parseFloat(counterPrices[req.id]) : req.budget, counterPrices[req.id] ? `I can do this for Rs. ${Number(counterPrices[req.id]).toLocaleString()}` : undefined)}
                                      className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap"
                                    >
                                      {bidSubmitting === req.id ? 'Sending…' : counterPrices[req.id] ? 'Send counter offer' : req.budget ? `Accept · Rs.${Number(req.budget).toLocaleString()}` : 'Accept'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {activeTab === 'bookings' && vPagedBk
                      .map(b => (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="p-4"><p className="text-sm font-medium text-gray-900">{b.customer.name}</p><p className="text-xs text-gray-400">{b.service.name}</p></td>
                        <td className="p-4"><p className="text-sm font-semibold text-gray-900">{b.price ? `Rs. ${Number(b.price).toLocaleString()}` : '—'}</p><p className="text-xs text-gray-400">{b.scheduled_time ? formatDate(b.scheduled_time) : 'Unscheduled'}</p></td>
                        <td className="p-4"><span className={`badge ${b.status === 'completed' ? 'badge-success' : 'badge-info'}`}>{b.status.replace('_', ' ')}</span>{b.review && <span className="ml-1.5 text-xs text-yellow-500 font-medium">★ {b.review.rating}</span>}
                          {b.reschedule_status === 'pending' && <span className="ml-1.5 text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-semibold">Reschedule req.</span>}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {b.reschedule_status === 'pending' && (
                            <>
                              <button onClick={() => respondReschedule(b.id, 'accept')} className="text-xs border border-green-200 text-green-600 hover:bg-green-50 rounded-lg px-2 py-1.5 mr-1 font-medium transition-colors">✓ OK</button>
                              <button onClick={() => respondReschedule(b.id, 'decline')} className="text-xs border border-red-200 text-red-500 hover:bg-red-50 rounded-lg px-2 py-1.5 mr-1 font-medium transition-colors">✕</button>
                            </>
                          )}
                          {b.status === 'pending' && (
                            <button onClick={() => updateBookingStatus(b.id, 'accepted')} className="btn-primary text-xs py-1.5 px-3 mr-1">Accept</button>
                          )}
                          {b.status === 'accepted' && (
                            <button onClick={() => updateBookingStatus(b.id, 'in_progress')} className="text-xs border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-lg px-3 py-1.5 mr-1 font-medium transition-colors">Start</button>
                          )}
                          {b.status === 'in_progress' && (
                            <button onClick={() => updateBookingStatus(b.id, 'completed')} className="text-xs border border-green-200 text-green-600 hover:bg-green-50 rounded-lg px-3 py-1.5 mr-1 font-medium transition-colors">✓ Complete</button>
                          )}
                          {b.status === 'pending' && (
                            <button onClick={() => updateBookingStatus(b.id, 'cancelled')} className="text-xs border border-red-200 text-red-500 hover:bg-red-50 rounded-lg px-3 py-1.5 mr-1 font-medium transition-colors">Decline</button>
                          )}
                          <Link to={`/messages?booking=${b.id}`} className="text-gray-400 text-xs font-medium hover:underline">Chat</Link>
                        </td>
                      </tr>
                    ))}
                    {activeTab === 'bookings' && vBkFiltered.length === 0 && (
                      <tr><td colSpan={4} className="p-8 text-center text-sm text-gray-400">No bookings in this category</td></tr>
                    )}
                    {activeTab === 'requests' && leadsLoading && (
                      <tr><td colSpan={4} className="p-8 text-center"><div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
                    )}
                    {activeTab === 'requests' && !leadsLoading && leads.length === 0 && (
                      <tr><td colSpan={4} className="p-10 text-center">
                        <Inbox className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No open requests matching your services right now.</p>
                        <p className="text-xs text-gray-300 mt-1">New requests will appear here and as instant popups when customers post.</p>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            )
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <TableControls
                search={vRevSearch} onSearch={v => { setVRevSearch(v); setVRevPage(1); }}
                searchPlaceholder="Search reviews…"
                page={vRevSP} totalPages={vRevTP} onPageChange={setVRevPage}
                rowsPerPage={vRevRpp} onRowsPerPageChange={v => { setVRevRpp(v); setVRevPage(1); }}
                totalItems={vRevFiltered.length}
                exportFilename="reviews"
                exportRows={() => [
                  ['Customer', 'Rating', 'Comment', 'Date'],
                  ...vRevFiltered.map(r => [r.customer?.name, r.rating, r.comment ?? '', new Date(r.created_at).toLocaleDateString()]),
                ]}
              />
              {vRevFiltered.length === 0 && (
                <div className="card p-12 text-center">
                  <Star className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">{vRevSearch ? 'No reviews match your search.' : 'No reviews yet. Complete bookings to receive reviews.'}</p>
                </div>
              )}
              {vPagedRev.map((rev: any) => (
                <div key={rev.id} className="card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900">{rev.customer?.name}</span>
                        <div className="flex text-yellow-400 text-xs">{'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}</div>
                        <span className="text-xs text-gray-400">{new Date(rev.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      {rev.comment && <p className="text-sm text-gray-600 mb-3">{rev.comment}</p>}

                      {/* Existing reply */}
                      {rev.vendor_reply && (
                        <div className="bg-blue-50 rounded-lg p-3 border-l-2 border-blue-300">
                          <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> Your reply
                          </p>
                          <p className="text-sm text-blue-800">{rev.vendor_reply}</p>
                        </div>
                      )}

                      {/* Reply form */}
                      {replyingTo === rev.id ? (
                        <div className="mt-3 space-y-2">
                          <textarea
                            rows={2}
                            className="input-field text-sm resize-none w-full"
                            placeholder="Write a professional response..."
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button disabled={replySaving || !replyText.trim()} onClick={() => postReply(rev.id)}
                              className="btn-primary text-xs py-1.5 px-4">{replySaving ? 'Saving…' : 'Post reply'}</button>
                            <button onClick={() => { setReplyingTo(null); setReplyText(''); }} className="btn-secondary text-xs py-1.5 px-4">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        !rev.vendor_reply && (
                          <button onClick={() => { setReplyingTo(rev.id); setReplyText(''); }}
                            className="mt-2 text-xs text-primary-600 font-medium hover:underline flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> Reply to this review
                          </button>
                        )
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-2xl font-bold text-gray-900">{rev.rating}</p>
                      <p className="text-xs text-gray-400">/ 5</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'availability' && (
            features.availability_edit === false ? (
              <div className="card p-8 flex flex-col items-center justify-center text-center gap-3 max-w-2xl">
                <Lock className="w-8 h-8 text-gray-300" />
                <p className="font-medium text-gray-700">Availability editing is disabled</p>
                <p className="text-sm text-gray-400">Contact your admin to enable this feature.</p>
              </div>
            ) : (
            <div className="card p-6 md:p-8 max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-gray-900">Weekly schedule</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Set the days and hours you're available to take bookings</p>
                </div>
                <button onClick={saveAvailability} disabled={availSaving || availability.length === 0}
                  className={`btn-primary text-sm py-2 px-4 ${availSaved ? 'bg-green-600 hover:bg-green-700' : ''}`}>
                  {availSaving ? 'Saving...' : availSaved ? '✓ Saved' : 'Save schedule'}
                </button>
              </div>

              <div className="space-y-3">
                {availability.map((slot, idx) => (
                  <div key={slot.day_of_week} className={`flex items-center gap-4 p-3 rounded-xl border transition-colors ${slot.is_available ? 'border-primary-200 bg-primary-50/40' : 'border-gray-200 bg-gray-50'}`}>
                    {/* Day toggle */}
                    <button
                      onClick={() => setAvailability(av => av.map((s, i) => i === idx ? { ...s, is_available: !s.is_available } : s))}
                      className={`w-20 flex-shrink-0 text-left text-sm font-semibold rounded-lg py-1.5 px-2 transition-colors ${slot.is_available ? 'text-primary-700' : 'text-gray-400'}`}
                    >
                      <span className={`inline-block w-3 h-3 rounded-full mr-2 transition-colors ${slot.is_available ? 'bg-primary-500' : 'bg-gray-300'}`} />
                      {DAY_LABELS[slot.day_of_week]}
                    </button>

                    {slot.is_available ? (
                      <div className="flex items-center gap-2 flex-1">
                        <select value={slot.start_time}
                          onChange={e => setAvailability(av => av.map((s, i) => i === idx ? { ...s, start_time: e.target.value } : s))}
                          className="input-field text-sm py-1.5 flex-1">
                          {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <span className="text-gray-400 text-sm flex-shrink-0">to</span>
                        <select value={slot.end_time}
                          onChange={e => setAvailability(av => av.map((s, i) => i === idx ? { ...s, end_time: e.target.value } : s))}
                          className="input-field text-sm py-1.5 flex-1">
                          {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Unavailable</span>
                    )}
                  </div>
                ))}

                {availability.length === 0 && (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    Loading schedule...
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-4">Click a day name to toggle availability. Customers will only see bookable slots within your available hours.</p>
            </div>
            )
          )}

          {/* Bundles tab */}
          {activeTab === 'bundles' && (
            <div className="space-y-6">
              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Create Service Bundle</h3>
                <div className="space-y-4">
                  <input className="input-field" placeholder="Bundle name" value={bundleForm.name} onChange={e => setBundleForm({...bundleForm, name: e.target.value})} />
                  <textarea className="input-field resize-none" rows={2} placeholder="Description (optional)" value={bundleForm.description} onChange={e => setBundleForm({...bundleForm, description: e.target.value})} />
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Include services (select 2+)</p>
                    <div className="grid grid-cols-2 gap-2">
                      {services.map(s => (
                        <label key={s.id} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer text-sm transition-colors ${bundleForm.service_ids.includes(s.id) ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <input type="checkbox" className="hidden" checked={bundleForm.service_ids.includes(s.id)}
                            onChange={e => setBundleForm(prev => ({ ...prev, service_ids: e.target.checked ? [...prev.service_ids, s.id] : prev.service_ids.filter(x => x !== s.id) }))} />
                          <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${bundleForm.service_ids.includes(s.id) ? 'bg-primary-600 border-primary-600' : 'border-gray-300'}`}>
                            {bundleForm.service_ids.includes(s.id) && <svg className="w-2.5 h-2.5 text-white fill-current" viewBox="0 0 12 10"><path d="M1 5l3 4L11 1"/></svg>}
                          </span>
                          <span className="truncate">{s.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bundle Price (Rs.)</label>
                      <input type="number" className="input-field" placeholder="0" value={bundleForm.bundle_price} onChange={e => setBundleForm({...bundleForm, bundle_price: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
                      <input type="number" className="input-field" placeholder="0" min="0" max="100" value={bundleForm.discount_percent} onChange={e => setBundleForm({...bundleForm, discount_percent: e.target.value})} />
                    </div>
                  </div>
                  <button onClick={createBundle} disabled={bundleSaving || !bundleForm.name || bundleForm.service_ids.length < 2 || !bundleForm.bundle_price}
                    className="btn-primary w-full disabled:opacity-50">
                    {bundleSaving ? 'Creating...' : 'Create Bundle'}
                  </button>
                </div>
              </div>
              {bundles.length > 0 && (
                <div className="space-y-3">
                  <TableControls
                    search={vBundSearch} onSearch={v => { setVBundSearch(v); setVBundPage(1); }}
                    searchPlaceholder="Search bundles…"
                    page={vBundSP} totalPages={vBundTP} onPageChange={setVBundPage}
                    rowsPerPage={vBundRpp} onRowsPerPageChange={v => { setVBundRpp(v); setVBundPage(1); }}
                    totalItems={vBundFiltered.length}
                    exportFilename="bundles"
                    exportRows={() => [
                      ['Name', 'Description', 'Price', 'Discount %'],
                      ...vBundFiltered.map(b => [b.name, b.description ?? '', b.bundle_price, b.discount_percent ?? 0]),
                    ]}
                  />
                  {vPagedBund.map(b => (
                    <div key={b.id} className="card p-4 flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{b.name}</h4>
                        {b.description && <p className="text-sm text-gray-500">{b.description}</p>}
                        <p className="font-semibold text-primary-600 mt-1">Rs. {b.bundle_price} {b.discount_percent > 0 && <span className="text-xs text-green-600 font-normal">({b.discount_percent}% off)</span>}</p>
                      </div>
                      <button onClick={() => deleteBundle(b.id)} className="text-red-400 hover:text-red-600 text-xs">Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Portfolio tab */}
          {activeTab === 'portfolio' && (
            <div className="space-y-4">
              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Upload Portfolio Photo</h3>
                <label className={`flex items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${portfolioUploading ? 'opacity-50 pointer-events-none' : 'border-gray-300 hover:border-primary-400 hover:bg-primary-50'}`}>
                  <div className="text-center">
                    <Camera className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                    <span className="text-sm text-gray-500">{portfolioUploading ? 'Uploading...' : 'Click to upload photo'}</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePortfolioUpload} disabled={portfolioUploading} />
                </label>
              </div>
              {portfolioItems.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {portfolioItems.map(item => (
                    <div key={item.id} className="relative group">
                      <img src={item.image_url} alt={item.caption || 'Portfolio'} className="w-full h-36 object-cover rounded-xl" onError={e => { (e.target as HTMLImageElement).src = '/placeholder.png'; }} />
                      <button onClick={() => deletePortfolioItem(item.id)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                      {item.caption && <p className="text-xs text-gray-500 mt-1 truncate">{item.caption}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card p-8 text-center text-sm text-gray-400">No portfolio photos yet. Upload your work to impress customers!</div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default VendorDashboard;
