/**
 * VendorRequestToast — InDrive-style floating request card for vendors.
 *
 * Listens to the global SSE stream for `notification` events of type `new_service_request`.
 * When one arrives while the vendor is online, a toast card slides in from the bottom-right.
 * Vendor can Accept (at customer budget), Counter (enter own price), or Skip — all in one tap.
 *
 * Multiple toasts stack. Each auto-dismisses after 90s (matches the 2h bid expiry spirit
 * without cluttering the screen).
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Zap, Clock, Calendar, AlarmClock, ChevronRight, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../utils/config';

interface RequestToast {
  id: string;           // unique per toast (not DB id)
  notifId: number;
  requestId: number;
  title: string;
  textPreview: string;
  categoryName: string;
  budget: number | null;
  urgency: string;
  arrivedAt: number;    // Date.now() — for countdown
}

const URGENCY_COLOR: Record<string, string> = {
  asap:       'bg-red-100 text-red-700',
  this_week:  'bg-orange-100 text-orange-700',
  this_month: 'bg-blue-100 text-blue-700',
  flexible:   'bg-gray-100 text-gray-600',
};
const URGENCY_LABEL: Record<string, string> = {
  asap: 'ASAP', this_week: 'This week', this_month: 'This month', flexible: 'Flexible',
};
const URGENCY_ICON: Record<string, React.FC<any>> = {
  asap: Zap, this_week: AlarmClock, this_month: Clock, flexible: Calendar,
};

const AUTO_DISMISS_MS = 90_000; // 90 seconds

const VendorRequestToast: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<RequestToast[]>([]);
  const [counterFor, setCounterFor] = useState<string | null>(null); // toast.id
  const [counterPrice, setCounterPrice] = useState('');
  const [submitting, setSubmitting] = useState<string | null>(null);
  const seenRef = useRef<Set<number>>(new Set());
  // Polling baseline: the max notification ID present when the page loads.
  // Only notifications above this threshold trigger popup toasts.
  const pollBaselineRef = useRef<number | null>(null);

  const dismiss = useCallback((toastId: string) => {
    setToasts(prev => prev.filter(t => t.id !== toastId));
    if (counterFor === toastId) setCounterFor(null);
  }, [counterFor]);

  // Helper: turn a notification object into a toast and add it if not already seen
  const showNotifToast = useCallback((notif: any) => {
    if (seenRef.current.has(notif.id)) return;
    seenRef.current.add(notif.id);
    const d = notif.data ?? {};
    const toastId = `${notif.id}-${Date.now()}`;
    setToasts(prev => [
      {
        id: toastId,
        notifId: notif.id,
        requestId: d.request_id,
        title: d.title ?? notif.title,
        textPreview: d.text_preview ?? '',
        categoryName: d.category_name ?? 'Service',
        budget: d.budget ? Number(d.budget) : null,
        urgency: d.urgency ?? 'flexible',
        arrivedAt: Date.now(),
      },
      ...prev,
    ].slice(0, 5));
  }, []);

  // Auto-dismiss after 90s
  useEffect(() => {
    if (!toasts.length) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setToasts(prev => prev.filter(t => now - t.arrivedAt < AUTO_DISMISS_MS));
    }, 5000);
    return () => clearInterval(timer);
  }, [toasts.length]);

  // ── Initialise polling baseline (current max notification ID) ──────────
  useEffect(() => {
    if (!token || user?.role !== 'vendor') return;
    fetch(`${API_BASE}/api/notifications?type=new_service_request&per_page=1`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const notifs: any[] = data?.data ?? [];
        // Seed seenRef so existing notifications never trigger a toast on load
        notifs.forEach(n => seenRef.current.add(n.id));
        pollBaselineRef.current = notifs.length > 0 ? notifs[0].id : 0;
      })
      .catch(() => { pollBaselineRef.current = 0; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.role]);

  // ── Polling fallback: every 8s fetch new unread new_service_request notifs ──
  useEffect(() => {
    if (!token || user?.role !== 'vendor') return;

    const poll = async () => {
      if (pollBaselineRef.current === null) return; // baseline not ready yet
      try {
        const res = await fetch(
          `${API_BASE}/api/notifications?type=new_service_request&unread_only=1&per_page=10`,
          { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
        );
        if (!res.ok) return;
        const data = await res.json();
        const notifs: any[] = (data.data ?? []).filter(
          (n: any) => n.id > (pollBaselineRef.current ?? 0),
        );
        for (const notif of notifs) {
          // Advance baseline so we don't re-process on next poll
          pollBaselineRef.current = Math.max(pollBaselineRef.current ?? 0, notif.id);
          showNotifToast(notif);
        }
      } catch {}
    };

    const interval = setInterval(poll, 8000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.role, showNotifToast]);

  // ── SSE listener (real-time, bonus path) ──────────────────────────────
  useEffect(() => {
    if (!token || user?.role !== 'vendor') return;

    let es: EventSource | null = null;
    let retryCount = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    const connect = () => {
      if (destroyed) return;
      const url = `${API_BASE}/api/events?token=${encodeURIComponent(token)}&lastEventId=0`;
      es = new EventSource(url);

      es.addEventListener('open', () => { retryCount = 0; });

      es.addEventListener('notification', (e: MessageEvent) => {
        retryCount = 0;
        try {
          const notif = JSON.parse(e.data);
          if (notif.type !== 'new_service_request') return;
          // Advance baseline so polling fallback won't duplicate this toast
          if (pollBaselineRef.current !== null) {
            pollBaselineRef.current = Math.max(pollBaselineRef.current, notif.id);
          }
          showNotifToast(notif);
        } catch {}
      });

      es.onerror = () => {
        es?.close();
        retryCount++;
        if (!destroyed && retryCount <= 8) {
          const delay = Math.min(5000 * Math.pow(2, retryCount - 1), 60000);
          reconnectTimer = setTimeout(connect, delay);
        }
        // After max retries, polling fallback continues to work
      };
    };

    connect();
    return () => {
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.role, showNotifToast]);

  const placeBid = async (toast: RequestToast, price: number | null) => {
    setSubmitting(toast.id);
    try {
      const res = await fetch(`${API_BASE}/api/booking-requests/${toast.requestId}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: JSON.stringify({
          offered_price: price ?? toast.budget,
          note: price && toast.budget && price < toast.budget
            ? `I can do this for Rs. ${price.toLocaleString()}`
            : undefined,
        }),
      });
      if (res.ok) {
        dismiss(toast.id);
      }
    } catch {}
    finally { setSubmitting(null); }
  };

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[60] flex flex-col gap-3 items-end pointer-events-none" aria-live="polite">
      {toasts.map(toast => {
        const UrgIcon = URGENCY_ICON[toast.urgency] ?? Clock;
        const isCountering = counterFor === toast.id;
        const timeLeft = Math.max(0, Math.round((AUTO_DISMISS_MS - (Date.now() - toast.arrivedAt)) / 1000));

        return (
          <div
            key={toast.id}
            className="pointer-events-auto w-[340px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-slide-up"
          >
            {/* Header strip */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-primary-600 text-white">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide">{toast.categoryName}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${URGENCY_COLOR[toast.urgency]}`}>
                  <UrgIcon className="w-3 h-3" />{URGENCY_LABEL[toast.urgency] ?? toast.urgency}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-primary-200">{timeLeft}s</span>
                <button onClick={() => dismiss(toast.id)} className="text-primary-200 hover:text-white transition-colors p-0.5">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-4 pt-3 pb-1">
              <p className="font-semibold text-gray-900 text-sm leading-snug">{toast.title}</p>
              {toast.textPreview && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{toast.textPreview}</p>
              )}
              {toast.budget && (
                <p className="text-xs font-semibold text-green-700 mt-1.5">
                  Budget: Rs. {Number(toast.budget).toLocaleString()}
                </p>
              )}
            </div>

            {/* Counter-offer input */}
            {isCountering && (
              <div className="px-4 py-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="number"
                  min={1}
                  placeholder={`Your price (Rs.)`}
                  value={counterPrice}
                  onChange={e => setCounterPrice(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  autoFocus
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="px-4 pb-3 pt-1 flex gap-2">
              {!isCountering ? (
                <>
                  {/* Accept at customer budget */}
                  <button
                    disabled={submitting === toast.id}
                    onClick={() => placeBid(toast, null)}
                    className="flex-1 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold py-2 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {submitting === toast.id ? '…' : `Accept${toast.budget ? ` · Rs.${Number(toast.budget).toLocaleString()}` : ''}`}
                  </button>

                  {/* Counter offer */}
                  <button
                    onClick={() => { setCounterFor(toast.id); setCounterPrice(''); }}
                    className="flex-1 border border-gray-200 hover:border-primary-300 text-gray-700 text-xs font-semibold py-2 rounded-xl transition-colors"
                  >
                    Counter offer
                  </button>

                  {/* View details */}
                  <button
                    onClick={() => navigate(`/vendor-dashboard?tab=leads&request=${toast.requestId}`)}
                    className="p-2 border border-gray-200 hover:border-gray-300 rounded-xl text-gray-400 hover:text-gray-600 transition-colors"
                    title="View details"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    disabled={!counterPrice || submitting === toast.id}
                    onClick={() => placeBid(toast, parseFloat(counterPrice))}
                    className="flex-1 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold py-2 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {submitting === toast.id ? '…' : 'Send offer'}
                  </button>
                  <button
                    onClick={() => setCounterFor(null)}
                    className="flex-1 border border-gray-200 text-gray-600 text-xs font-semibold py-2 rounded-xl"
                  >
                    Back
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default VendorRequestToast;
