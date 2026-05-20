import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Star, Shield, MessageCircle, CheckCircle, ChevronRight, Clock, Heart, ChevronLeft, ChevronRight as ChevronRightIcon, Share2, Send, X } from 'lucide-react';
import { getServiceImage } from '../utils/serviceImage';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../utils/config';
import { ServiceDetailSkeleton } from '../components/Skeleton';

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Quick Message Modal ────────────────────────────────────────────────────
interface QMsg {
  id: number;
  sender_id: number;
  receiver_id?: number;
  message: string;
  created_at: string;
  sender_label: string;
  sender_role: string;
}

interface QuickMessageModalProps {
  vendorUserId: number;
  vendorName: string;
  serviceName: string;
  token: string;
  currentUserId: number;
  onClose: () => void;
  onAuthError: () => void;
}

const QuickMessageModal: React.FC<QuickMessageModalProps> = ({
  vendorUserId, vendorName, serviceName, token, currentUserId, onClose, onAuthError,
}) => {
  const [messages, setMessages] = useState<QMsg[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [authFailed, setAuthFailed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Always-fresh headers — same pattern as Messages.tsx
  const getH = useCallback(
    () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' }),
    [token]
  );

  const handleAuthError = useCallback(() => {
    setAuthFailed(true);
    onAuthError();
  }, [onAuthError]);

  const mapMsg = useCallback((m: any): QMsg => ({
    id: m.id, sender_id: m.sender_id, receiver_id: m.receiver_id ?? m.receiver?.id,
    message: m.message, created_at: m.created_at,
    sender_label: m.sender_label ?? m.sender?.name ?? 'User',
    sender_role: m.sender_role ?? m.sender?.role ?? 'customer',
  }), []);

  // Load history once on open — detect 401 immediately
  useEffect(() => {
    setLoadingHistory(true);
    fetch(`${API_BASE}/api/messages?with=${vendorUserId}`, { headers: getH() })
      .then(r => {
        if (r.status === 401) { handleAuthError(); return null; }
        return r.ok ? r.json() : [];
      })
      .then((data: any[] | null) => {
        if (!data) return;
        const msgs = data.map(mapMsg);
        setMessages(msgs);
        if (msgs.length) lastIdRef.current = msgs[msgs.length - 1].id;
      })
      .catch(() => {})
      .finally(() => { setLoadingHistory(false); setTimeout(() => inputRef.current?.focus(), 50); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorUserId]);

  // SSE for real-time updates — same approach as Messages.tsx.
  // Exponential backoff: 5s → 10s → 20s → 40s → give up + call onAuthError.
  // Stops when authFailed becomes true (set by 401 in history fetch or SSE failure).
  useEffect(() => {
    if (authFailed) return;

    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;
    let retryCount = 0;
    const MAX_RETRIES = 4; // 5s, 10s, 20s, 40s — then give up

    const connect = () => {
      if (destroyed) return;
      const url = `${API_BASE}/api/events?token=${encodeURIComponent(token)}&lastEventId=${lastIdRef.current}`;
      es = new EventSource(url);

      es.addEventListener('open', () => { retryCount = 0; });

      es.addEventListener('message', (event: MessageEvent) => {
        retryCount = 0;
        const msg = JSON.parse(event.data);
        if (msg.booking_id != null) return;
        const fromVendor = msg.sender_id === vendorUserId;
        const toVendor   = (msg.receiver_id ?? msg.receiver?.id) === vendorUserId;
        if (!fromVendor && !toVendor) return;

        const msgId: number = msg.id;
        lastIdRef.current = Math.max(lastIdRef.current, msgId);
        setMessages(prev => {
          if (prev.some(m => m.id === msgId)) return prev;
          return [...prev.filter(m => m.id > 0), mapMsg(msg)];
        });
      });

      es.onerror = () => {
        es?.close();
        retryCount++;
        if (!destroyed && retryCount <= MAX_RETRIES) {
          const delay = Math.min(5000 * Math.pow(2, retryCount - 1), 60000);
          reconnectTimer = setTimeout(connect, delay);
        } else if (!destroyed) {
          // Persistent failure — likely stale/invalid token, stop trying
          handleAuthError();
        }
      };
    };

    connect();
    return () => {
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, vendorUserId, authFailed]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');
    const tempId = Date.now();
    const optimistic: QMsg = { id: tempId, sender_id: currentUserId, message: trimmed, created_at: new Date().toISOString(), sender_label: 'You', sender_role: 'customer' };
    setMessages(prev => [...prev, optimistic]);
    try {
      const res = await fetch(`${API_BASE}/api/messages`, {
        method: 'POST',
        headers: getH(),
        body: JSON.stringify({ receiver_id: vendorUserId, message: trimmed }),
      });
      if (res.status === 401) { handleAuthError(); return; }
      if (res.ok) {
        const data = await res.json();
        const real = mapMsg(data.message);
        setMessages(prev => prev.map(m => m.id === tempId ? real : m));
        lastIdRef.current = Math.max(lastIdRef.current, real.id);
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setText(trimmed);
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setText(trimmed);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const fmtTime = (s: string) => new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full sm:max-w-md bg-white sm:rounded-2xl shadow-2xl flex flex-col" style={{ height: '85vh', maxHeight: '600px' }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
            {vendorName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{vendorName}</p>
            <p className="text-xs text-gray-400 truncate">{serviceName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {loadingHistory ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-2">
              <MessageCircle className="w-10 h-10 opacity-30" />
              <p className="text-sm">No messages yet.</p>
              <p className="text-xs">Send a message to start the conversation.</p>
            </div>
          ) : (
            messages.map(msg => {
              const isMine = msg.sender_id === currentUserId;
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                    isMine
                      ? 'bg-primary-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                  }`}>
                    {!isMine && <p className="text-[10px] font-semibold mb-0.5 text-primary-600">{msg.sender_label}</p>}
                    <p className="leading-relaxed break-words">{msg.message}</p>
                    <p className={`text-[10px] mt-1 ${isMine ? 'text-primary-200' : 'text-gray-400'} text-right`}>{fmtTime(msg.created_at)}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex items-center gap-2 px-3 py-3 border-t border-gray-100 flex-shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={`Message ${vendorName}...`}
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            maxLength={2000}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary-600 text-white disabled:opacity-40 hover:bg-primary-700 transition-colors flex-shrink-0"
          >
            {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};
// ── End QuickMessageModal ──────────────────────────────────────────────────

const ServicesDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [service, setService] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [similarServices, setSimilarServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMsgModal, setShowMsgModal] = useState(false);
  const { getSetting } = useSettings();
  const siteName = getSetting('site_name', 'ToleMate');

  // Favorites
  const [isFavorite, setIsFavorite] = useState(false);
  // Carousel
  const [carouselIdx, setCarouselIdx] = useState(0);

  useEffect(() => {
    if (id) {
      try {
        const favs: number[] = JSON.parse(localStorage.getItem('tolemate_favorites') || '[]');
        setIsFavorite(favs.includes(Number(id)));
      } catch {}
    }
  }, [id]);

  const toggleFavorite = useCallback(() => {
    const serviceId = Number(id);
    setIsFavorite(prev => {
      try {
        const favs: number[] = JSON.parse(localStorage.getItem('tolemate_favorites') || '[]');
        const next = prev ? favs.filter(f => f !== serviceId) : [...favs, serviceId];
        localStorage.setItem('tolemate_favorites', JSON.stringify(next));
      } catch {}
      return !prev;
    });
  }, [id]);

  useEffect(() => {
    const fetchServiceData = async () => {
      try {
        const serviceRes = await fetch(`${API_BASE}/api/services/${id}`);
        if (!serviceRes.ok) throw new Error('Service not found');
        const serviceData = await serviceRes.json();
        const serviceObj = serviceData.service;
        setService(serviceObj);

        // Track recently viewed (max 10, most recent first)
        try {
          const viewed: any[] = JSON.parse(localStorage.getItem('tolemate_recently_viewed') || '[]');
          const filtered = viewed.filter((s: any) => s.id !== serviceObj.id);
          const entry = { id: serviceObj.id, name: serviceObj.name, price: serviceObj.price, vendor: serviceObj.vendor?.business_name, category: serviceObj.category?.name, viewed_at: Date.now() };
          localStorage.setItem('tolemate_recently_viewed', JSON.stringify([entry, ...filtered].slice(0, 10)));
        } catch {}

        const [reviewsRes, availRes] = await Promise.all([
          fetch(`${API_BASE}/api/vendors/${serviceObj.vendor_id}/reviews`),
          fetch(`${API_BASE}/api/vendors/${serviceObj.vendor_id}/availability`),
        ]);
        if (reviewsRes.ok) { const d = await reviewsRes.json(); setReviews(d.data || d); }
        if (availRes.ok) { const d = await availRes.json(); setAvailability(d.availability || []); }

        // Similar services: same category, exclude this service
        if (serviceObj.category_id) {
          const simRes = await fetch(`${API_BASE}/api/services/search?category_id=${serviceObj.category_id}&per_page=4`);
          if (simRes.ok) {
            const simData = await simRes.json();
            setSimilarServices((simData.data || simData).filter((s: any) => s.id !== serviceObj.id).slice(0, 3));
          }
        }
      } catch (error) { console.error(error); }
      finally { setLoading(false); }
    };
    fetchServiceData();
  }, [id]);

  /** Get next available day (within next 7 days) */
  const nextAvailable = useMemo(() => {
    if (!availability.length) return null;
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i);
      const dow = d.getDay();
      const slot = availability.find(s => s.day_of_week === dow && s.is_available);
      if (slot) return { date: d, slot, daysFromNow: i };
    }
    return null;
  }, [availability]);

  if (loading) return <ServiceDetailSkeleton />;
  if (!service) return <div className="min-h-screen pt-32 text-center text-gray-500">Service not found</div>;

  return (
    <>
      <Helmet>
        <title>{service.name} – {service.vendor?.business_name} | {siteName}</title>
        <meta name="description" content={`${service.description?.slice(0, 155)}...`} />
        <meta property="og:title" content={service.name} />
        <meta property="og:description" content={service.description?.slice(0, 200)} />
        <meta property="og:type" content="website" />
      </Helmet>
    <div className="min-h-screen py-8 animate-fade-in">
      <div className="container-custom max-w-5xl">
        {/* Breadcrumb + favorite */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link to="/services" className="hover:text-primary-600 transition-colors">Services</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-400">{service.category?.name}</span>
          </div>
          <button
            onClick={toggleFavorite}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
              isFavorite ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500' : ''}`} />
            {isFavorite ? 'Saved' : 'Save'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card overflow-hidden">
              {/* Image carousel */}
              {(() => {
                const images: string[] = [
                  ...(service.images?.map((img: any) => img.image_url || img.image_path) || []),
                ];
                if (!images.length) images.push(getServiceImage(service));
                const clampedIdx = Math.min(carouselIdx, images.length - 1);
                return (
                  <div className="relative h-56 md:h-72 overflow-hidden bg-gray-100">
                    <img
                      key={clampedIdx}
                      src={images[clampedIdx]}
                      alt={`${service.name} ${clampedIdx + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover transition-opacity duration-300"
                      onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&q=80'; }}
                    />
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={() => setCarouselIdx(i => (i - 1 + images.length) % images.length)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCarouselIdx(i => (i + 1) % images.length)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                        >
                          <ChevronRightIcon className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {images.map((_, i) => (
                            <button key={i} onClick={() => setCarouselIdx(i)}
                              className={`h-1.5 rounded-full transition-all duration-200 ${
                                i === clampedIdx ? 'bg-white w-4' : 'bg-white/60 w-1.5'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="absolute top-3 right-3 text-xs bg-black/50 text-white px-2 py-1 rounded-full">
                          {clampedIdx + 1} / {images.length}
                        </span>
                      </>
                    )}
                  </div>
                );
              })()}
              <div className="p-6 md:p-8">
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="badge badge-info">{service.category?.name}</span>
                <button
                  onClick={() => {
                    const shareData = { title: service.name, text: `Check out "${service.name}" on ToleMate`, url: window.location.href };
                    if (navigator.share) { navigator.share(shareData).catch(() => {}); }
                    else { navigator.clipboard.writeText(window.location.href); }
                  }}
                  className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors rounded-lg hover:bg-gray-100" title="Share this service">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-5">{service.name}</h1>
              
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                <Link to={`/vendors/${service.vendor_id}`} className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-semibold text-gray-600 text-sm hover:opacity-75 transition-opacity">
                  {service.vendor?.business_name?.charAt(0) || 'V'}
                </Link>
                <div>
                  <Link to={`/vendors/${service.vendor_id}`} className="font-medium text-gray-900 text-sm hover:text-primary-600 transition-colors">{service.vendor?.business_name}</Link>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      {service.vendor?.rating || 'New provider'}
                    </div>
                    {service.vendor?.is_verified && (
                      <span className="flex items-center gap-0.5 text-blue-600 font-medium"><CheckCircle className="w-3 h-3" /> Verified</span>
                    )}
                    {(() => {
                      const jobs = service.vendor?.completed_jobs ?? 0;
                      if (jobs >= 20) return <span className="flex items-center gap-0.5 text-green-600"><Clock className="w-3 h-3" /> Responds within 1 hr</span>;
                      if (jobs >= 5)  return <span className="flex items-center gap-0.5 text-green-600"><Clock className="w-3 h-3" /> Responds within 2 hrs</span>;
                      return null;
                    })()}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">About this service</h3>
                <div className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                  {service.description}
                </div>
              </div>

              {/* Cancellation policy */}
              {service.cancellation_policy && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1.5 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Cancellation Policy
                  </h4>
                  <p className="text-sm text-gray-600">{service.cancellation_policy}</p>
                </div>
              )}

              {/* Availability strip */}
              {availability.length > 0 && (
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Availability
                  </h4>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {availability.map(slot => (
                      <span key={slot.day_of_week}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${slot.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400 line-through'}`}>
                        {DAY_SHORT[slot.day_of_week]}
                        {slot.is_available && <span className="ml-1 text-[10px] opacity-70">{slot.start_time.slice(0,5)}–{slot.end_time.slice(0,5)}</span>}
                      </span>
                    ))}
                  </div>
                  {nextAvailable && (
                    <p className="text-xs text-green-700 font-medium">
                      {nextAvailable.daysFromNow === 0 ? '✓ Available today' : nextAvailable.daysFromNow === 1 ? '✓ Available tomorrow' : `✓ Next available: ${DAY_SHORT[nextAvailable.date.getDay()]}`}
                      {' '}{nextAvailable.slot.start_time.slice(0,5)}–{nextAvailable.slot.end_time.slice(0,5)}
                    </p>
                  )}
                </div>
              )}
              </div>{/* end card inner padding */}
            </div>

            {/* Packages / Tiers */}
            {service.packages && service.packages.length > 0 && (
              <div className="card p-6 md:p-8">
                <h3 className="font-semibold text-gray-900 mb-1">Choose a package</h3>
                <p className="text-sm text-gray-500 mb-5">Select the tier that fits your needs and budget</p>
                <div className={`grid gap-4 ${service.packages.length === 1 ? 'grid-cols-1 max-w-xs' : service.packages.length === 2 ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
                  {service.packages.map((pkg: any, idx: number) => {
                    const tierStyles = [
                      { border: 'border-gray-200', badge: 'bg-gray-100 text-gray-600', btn: 'btn-secondary' },
                      { border: 'border-blue-300 ring-1 ring-blue-200', badge: 'bg-blue-100 text-blue-700', btn: 'btn-primary' },
                      { border: 'border-purple-300 ring-1 ring-purple-200', badge: 'bg-purple-100 text-purple-700', btn: 'btn-primary' },
                    ];
                    const style = tierStyles[Math.min(idx, 2)];
                    return (
                      <div key={pkg.id} className={`rounded-xl border-2 p-5 flex flex-col ${style.border} ${idx === 1 ? 'relative' : ''}`}>
                        {idx === 1 && service.packages.length === 3 && (
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-0.5 bg-blue-600 text-white rounded-full">Popular</span>
                        )}
                        <div className="mb-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>{pkg.name}</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 mb-1">Rs. {Number(pkg.price).toLocaleString()}</p>
                        {pkg.delivery_days && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                            <Clock className="w-3 h-3" /> {pkg.delivery_days} day{pkg.delivery_days !== 1 ? 's' : ''} delivery
                          </p>
                        )}
                        {pkg.description && <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>}
                        {pkg.features && pkg.features.length > 0 && (
                          <ul className="space-y-1.5 mb-4 flex-1">
                            {pkg.features.map((f: string, fi: number) => (
                              <li key={fi} className="flex items-start gap-2 text-sm text-gray-700">
                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        )}
                        <Link to={`/book/${service.id}?package=${pkg.id}&price=${pkg.price}&pkg_name=${encodeURIComponent(pkg.name)}`}
                          className={`${style.btn} w-full text-center text-sm py-2 mt-auto`}>
                          Book {pkg.name}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="card p-6 md:p-8">
              {/* Rating summary */}
              {reviews.length > 0 && (() => {
                const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
                const counts = [5, 4, 3, 2, 1].map(star => ({
                  star,
                  count: reviews.filter(r => r.rating === star).length,
                  pct: (reviews.filter(r => r.rating === star).length / reviews.length) * 100,
                }));
                return (
                  <div className="flex items-start gap-8 mb-6 pb-6 border-b border-gray-100">
                    <div className="text-center flex-shrink-0">
                      <p className="text-4xl font-extrabold text-gray-900">{avg.toFixed(1)}</p>
                      <div className="flex text-yellow-400 text-sm my-1">{'★'.repeat(Math.round(avg))}{'☆'.repeat(5 - Math.round(avg))}</div>
                      <p className="text-xs text-gray-400">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {counts.map(({ star, count, pct }) => (
                        <div key={star} className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="w-4 text-right">{star}</span>
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-5 text-right">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <h3 className="font-semibold text-gray-900 mb-4">
                Reviews <span className="text-gray-400 font-normal">({reviews.length})</span>
              </h3>
              <div className="space-y-5">
                {reviews.slice(0, 5).map((review: any) => (
                  <div key={review.id} className="pb-5 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {review.customer?.name?.charAt(0) || 'U'}
                      </div>
                      <span className="font-medium text-sm text-gray-900">{review.customer?.name}</span>
                      <div className="flex text-yellow-400 text-xs">
                        {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                      </div>
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    {review.comment && <p className="text-sm text-gray-600 mb-2">{review.comment}</p>}
                    {/* Vendor reply */}
                    {review.vendor_reply && (
                      <div className="ml-4 mt-2 bg-gray-50 rounded-lg p-3 border-l-2 border-primary-200">
                        <p className="text-xs font-semibold text-primary-700 mb-1">Response from {service.vendor?.business_name}</p>
                        <p className="text-sm text-gray-600">{review.vendor_reply}</p>
                      </div>
                    )}
                  </div>
                ))}
                {reviews.length === 0 && (
                  <p className="text-sm text-gray-400">No reviews yet.</p>
                )}
              </div>
            </div>

            {/* Similar services */}
            {similarServices.length > 0 && (
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-4 text-sm">You may also like</h3>
                <div className="space-y-3">
                  {similarServices.map(s => (
                    <Link key={s.id} to={`/services/${s.id}`} className="flex gap-3 group hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors">
                      <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={getServiceImage(s)} alt={s.name} loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=200&q=70'; }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 line-clamp-1 group-hover:text-primary-600 transition-colors">{s.name}</p>
                        <p className="text-xs text-gray-400 line-clamp-1">{s.vendor?.business_name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          <span className="text-xs text-gray-500">{s.vendor?.rating ? Number(s.vendor.rating).toFixed(1) : 'New'}</span>
                          <span className="text-xs font-semibold text-primary-600 ml-auto">
                            {s.price ? `Rs. ${Number(s.price).toLocaleString()}` : 'Quote'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <div className="mb-4">
                {service.packages && service.packages.length > 0 ? (
                  <>
                    <p className="text-sm text-gray-500 mb-1">Starting from</p>
                    <p className="text-2xl font-bold text-gray-900">Rs. {Math.min(...service.packages.map((p: any) => Number(p.price))).toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{service.packages.length} package{service.packages.length !== 1 ? 's' : ''} available</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-gray-900">
                      {service.price ? `Rs. ${Number(service.price).toLocaleString()}` : 'Get a quote'}
                      {service.pricing_type === 'hourly' && <span className="text-sm text-gray-400 font-normal">/hour</span>}
                    </p>
                    <p className="text-sm text-gray-500">{service.pricing_type === 'fixed' ? 'Fixed price' : 'Price may vary'}</p>
                  </>
                )}
              </div>

              {service.packages && service.packages.length > 0 ? (
                <a href="#packages" onClick={e => { e.preventDefault(); document.querySelector('.packages-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="btn-primary w-full py-3 mb-3 text-center">
                  View packages ↓
                </a>
              ) : (
                <Link to={`/book/${service.id}`} className="btn-primary w-full py-3 mb-3">
                  Book now
                </Link>
              )}

              <button
                onClick={() => {
                  if (!token) { navigate(`/login?redirect=/services/${service.id}`); return; }
                  setShowMsgModal(true);
                }}
                className="btn-secondary w-full py-2.5 mb-3 flex items-center justify-center gap-2 text-sm font-medium"
              >
                <MessageCircle className="w-4 h-4" />
                Message vendor
              </button>

              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Verified professional</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <span>{siteName} guarantee</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <MessageCircle className="w-4 h-4 text-purple-500" />
                  <span>Direct messaging</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Quick Message Modal */}
      {showMsgModal && service?.vendor?.user?.id && token && user && (
        <QuickMessageModal
          vendorUserId={service.vendor.user.id}
          vendorName={service.vendor.business_name ?? 'Vendor'}
          serviceName={service.name}
          token={token}
          currentUserId={user.id}
          onClose={() => setShowMsgModal(false)}
          onAuthError={async () => {
            setShowMsgModal(false);
            await logout();
            navigate(`/login?redirect=/services/${id}`);
          }}
        />
      )}
    </>
  );
};

export default ServicesDetail;
