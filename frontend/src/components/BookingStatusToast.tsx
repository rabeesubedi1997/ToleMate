/**
 * BookingStatusToast — real-time popup for booking/bid status changes.
 *
 * Works for BOTH customers and vendors:
 *
 *  Customer sees:
 *    • bid_accepted  → green "Offer accepted! Booking created" (from acceptBid)
 *    • booking       → accepted/in_progress/completed/cancelled by vendor
 *
 *  Vendor sees:
 *    • bid_accepted  → green "Your offer was accepted!"
 *    • bid_declined  → gray "Not selected this time"
 *    • booking       → new booking request / status changes
 *
 * Uses SSE as the fast path + 10s polling fallback (same pattern as VendorRequestToast).
 * Auto-dismisses after 15s. Stacks up to 4.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CheckCircle2, XCircle, Clock, Briefcase, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../utils/config';

interface StatusToast {
  id: string;          // unique toast key
  notifId: number;     // DB notification id
  type: string;        // bid_accepted | bid_declined | booking
  status?: string;     // booking status value
  title: string;
  body: string;
  bookingId?: number;
  serviceName?: string;
  price?: number | null;
  arrivedAt: number;
}

const AUTO_DISMISS_MS = 15_000; // 15 seconds

// Colour / icon config per notification type + status
const TOAST_CONFIG: Record<string, { bg: string; icon: React.FC<any>; iconColor: string; action?: string }> = {
  bid_accepted:       { bg: 'bg-green-600',  icon: CheckCircle2, iconColor: 'text-green-600', action: 'View Booking' },
  bid_declined:       { bg: 'bg-gray-500',   icon: XCircle,      iconColor: 'text-gray-500' },
  booking_accepted:   { bg: 'bg-green-600',  icon: CheckCircle2, iconColor: 'text-green-600', action: 'View Booking' },
  booking_in_progress:{ bg: 'bg-blue-600',   icon: Loader2,      iconColor: 'text-blue-600',  action: 'View Booking' },
  booking_completed:  { bg: 'bg-primary-600',icon: CheckCircle2, iconColor: 'text-primary-600',action: 'View Booking' },
  booking_cancelled:  { bg: 'bg-red-500',    icon: XCircle,      iconColor: 'text-red-500' },
  booking_pending:    { bg: 'bg-blue-600',   icon: Briefcase,    iconColor: 'text-blue-600',  action: 'View Booking' },
  booking_default:    { bg: 'bg-gray-600',   icon: Clock,        iconColor: 'text-gray-500',  action: 'View Booking' },
};

const getConfig = (toast: StatusToast) => {
  if (toast.type === 'bid_accepted') return TOAST_CONFIG.bid_accepted;
  if (toast.type === 'bid_declined') return TOAST_CONFIG.bid_declined;
  if (toast.type === 'booking') {
    return TOAST_CONFIG[`booking_${toast.status}`] ?? TOAST_CONFIG.booking_default;
  }
  return TOAST_CONFIG.booking_default;
};

// Types that this component handles (all except new_service_request which VendorRequestToast owns)
const HANDLED_TYPES = new Set(['bid_accepted', 'bid_declined', 'booking']);

const BookingStatusToast: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<StatusToast[]>([]);
  const seenRef = useRef<Set<number>>(new Set());
  const pollBaselineRef = useRef<number | null>(null);

  const dismiss = useCallback((toastId: string) => {
    setToasts(prev => prev.filter(t => t.id !== toastId));
  }, []);

  // Auto-dismiss after 15s
  useEffect(() => {
    if (!toasts.length) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setToasts(prev => prev.filter(t => now - t.arrivedAt < AUTO_DISMISS_MS));
    }, 3000);
    return () => clearInterval(timer);
  }, [toasts.length]);

  // Convert a notification object → toast and add it if not already seen
  const showToast = useCallback((notif: any) => {
    if (!HANDLED_TYPES.has(notif.type)) return;
    if (seenRef.current.has(notif.id)) return;
    seenRef.current.add(notif.id);

    const d = notif.data ?? {};
    setToasts(prev => [
      {
        id: `${notif.id}-${Date.now()}`,
        notifId: notif.id,
        type: notif.type,
        status: d.status,
        title: notif.title,
        body: notif.message,
        bookingId: d.booking_id,
        serviceName: d.service_name,
        price: d.price ? Number(d.price) : null,
        arrivedAt: Date.now(),
      },
      ...prev,
    ].slice(0, 4));
  }, []);

  // ── Seed baseline: record current max notification id on mount ─────────
  useEffect(() => {
    if (!token || !user) return;
    fetch(`${API_BASE}/api/notifications?per_page=1`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const notifs: any[] = data?.data ?? [];
        notifs.forEach(n => seenRef.current.add(n.id));
        pollBaselineRef.current = notifs.length > 0 ? notifs[0].id : 0;
      })
      .catch(() => { pollBaselineRef.current = 0; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.id]);

  // ── Polling fallback: every 10s ─────────────────────────────────────────
  useEffect(() => {
    if (!token || !user) return;

    const poll = async () => {
      if (pollBaselineRef.current === null) return;
      try {
        const res = await fetch(
          `${API_BASE}/api/notifications?unread_only=1&per_page=10`,
          { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
        );
        if (!res.ok) return;
        const data = await res.json();
        const notifs: any[] = (data.data ?? []).filter(
          (n: any) => n.id > (pollBaselineRef.current ?? 0) && HANDLED_TYPES.has(n.type),
        );
        for (const notif of notifs) {
          pollBaselineRef.current = Math.max(pollBaselineRef.current ?? 0, notif.id);
          showToast(notif);
        }
      } catch {}
    };

    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.id, showToast]);

  // ── SSE fast path ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token || !user) return;

    let es: EventSource | null = null;
    let retryCount = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    const connect = () => {
      if (destroyed) return;
      es = new EventSource(`${API_BASE}/api/events?token=${encodeURIComponent(token)}&lastEventId=0`);

      es.addEventListener('open', () => { retryCount = 0; });

      es.addEventListener('notification', (e: MessageEvent) => {
        retryCount = 0;
        try {
          const notif = JSON.parse(e.data);
          if (!HANDLED_TYPES.has(notif.type)) return;
          if (pollBaselineRef.current !== null) {
            pollBaselineRef.current = Math.max(pollBaselineRef.current, notif.id);
          }
          showToast(notif);
        } catch {}
      });

      es.onerror = () => {
        es?.close();
        retryCount++;
        if (!destroyed && retryCount <= 8) {
          const delay = Math.min(5000 * Math.pow(2, retryCount - 1), 60000);
          reconnectTimer = setTimeout(connect, delay);
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
  }, [token, user?.id, showToast]);

  if (!toasts.length) return null;

  return (
    <div
      className="fixed bottom-20 md:bottom-6 left-4 md:left-6 z-[60] flex flex-col gap-3 items-start pointer-events-none"
      aria-live="polite"
    >
      {toasts.map(toast => {
        const cfg = getConfig(toast);
        const Icon = cfg.icon;
        const timeLeft = Math.max(0, Math.round((AUTO_DISMISS_MS - (Date.now() - toast.arrivedAt)) / 1000));

        return (
          <div
            key={toast.id}
            className="pointer-events-auto w-[320px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-slide-up"
          >
            {/* Colour header strip */}
            <div className={`flex items-center justify-between px-4 py-2.5 ${cfg.bg} text-white`}>
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span className="text-xs font-semibold">{toast.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] opacity-70">{timeLeft}s</span>
                <button
                  onClick={() => dismiss(toast.id)}
                  className="opacity-70 hover:opacity-100 transition-opacity p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-4 py-3">
              <p className="text-sm text-gray-700 leading-snug">{toast.body}</p>
              {toast.price && (
                <p className="text-xs font-semibold text-green-700 mt-1">
                  Rs. {Number(toast.price).toLocaleString()}
                </p>
              )}
            </div>

            {/* Action */}
            {cfg.action && toast.bookingId && (
              <div className="px-4 pb-3">
                <button
                  onClick={() => {
                    dismiss(toast.id);
                    navigate(`/bookings/${toast.bookingId}`);
                  }}
                  className={`w-full py-2 rounded-xl text-white text-xs font-semibold transition-opacity hover:opacity-90 ${cfg.bg}`}
                >
                  {cfg.action}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BookingStatusToast;
