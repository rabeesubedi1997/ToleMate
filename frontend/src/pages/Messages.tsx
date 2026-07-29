import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Send, MessageCircle, Plus, ArrowLeft, CheckCheck } from 'lucide-react';
import SeoHead from '../components/SeoHead';

import { API_BASE } from '../utils/config';

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);
const fmtWA = (p: string) => p.replace(/\D/g, '');

interface IMessage {
  id: number;
  message: string;
  created_at: string;
  is_read: boolean;
  booking_id: number | null;
  sender_id: number;
  receiver_id?: number;       // flat field — present in both REST and SSE payloads
  sender_label: string;   // display name: business name for vendor, "Support" for admin, name for customer
  sender_role: string;    // 'customer' | 'vendor' | 'admin'
  sender: { id: number; name: string; role?: string };
  receiver: { id: number; name: string };
}

interface Conversation {
  type: 'booking' | 'direct';
  id: number | string;
  other: { id: number; name: string; role?: string };
  service?: string;
  customer?: { id: number; name: string };
  vendor?: { id: number; name: string; vendor?: { business_name: string } };
  lastMessage?: string;
  lastTime?: string;
  unread?: number;
}

const API = `${API_BASE}/api`;

// Role-specific bubble colours for received messages
const ROLE_COLORS: Record<string, string> = {
  admin:    'bg-purple-100 text-purple-900 border-purple-200',
  vendor:   'bg-blue-50 text-blue-900 border-blue-200',
  customer: 'bg-white text-gray-900 border-gray-200',
};
const ROLE_AVATAR: Record<string, string> = {
  admin:    'bg-purple-200 text-purple-700',
  vendor:   'bg-blue-200 text-blue-700',
  customer: 'bg-gray-200 text-gray-600',
};
const ROLE_NAME_COLOR: Record<string, string> = {
  admin:    'text-purple-600',
  vendor:   'text-blue-600',
  customer: 'text-gray-500',
};

const Messages: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastIdRef = useRef<number>(0);
  const convFetchController = useRef<AbortController | null>(null);
  const selectedRef = useRef<Conversation | null>(null); // mirrors selected — readable inside SSE without re-creating connection

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [adminUser, setAdminUser] = useState<{ id: number; name: string } | null>(null);
  const [otherPhone, setOtherPhone] = useState<string | null>(null);

  const h = useCallback(
    () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }),
    [token]
  );

  const fetchAdminUser = useCallback(async () => {
    try {
      const r = await fetch(`${API}/admin-contact`, { headers: h() });
      if (r.ok) setAdminUser(await r.json());
    } catch {}
  }, [h]);

  const fetchConversations = useCallback(async () => {
    // Cancel any in-flight request before starting a new one
    convFetchController.current?.abort();
    const controller = new AbortController();
    convFetchController.current = controller;
    try {
      const [bookingRes, directRes] = await Promise.all([
        fetch(`${API}/conversations`, { headers: h(), signal: controller.signal }),
        fetch(`${API}/direct-conversations`, { headers: h(), signal: controller.signal }),
      ]);

      const convs: Conversation[] = [];

      if (bookingRes.ok) {
        const bookings: any[] = await bookingRes.json();
        bookings.forEach((b: any) => {
          // For admin, show customer name as "other"; for vendor show customer; for customer show vendor
          let other: { id: number; name: string; role: string };
          if (user?.role === 'vendor') {
            other = { id: b.customer?.id, name: b.customer?.name ?? 'Customer', role: 'customer' };
          } else if (user?.role === 'admin') {
            // Admin sees booking as customerâ†”vendor thread
            other = { id: b.customer?.id, name: b.customer?.name ?? 'Customer', role: 'customer' };
          } else {
            other = {
              id: b.vendor?.id,
              name: b.vendor?.vendor?.business_name ?? b.vendor?.name ?? 'Vendor',
              role: 'vendor',
            };
          }
          const lastMsg = b.messages?.[0];
          convs.push({
            type: 'booking',
            id: b.id,
            other,
            service: b.service?.name,
            customer: b.customer,
            vendor: b.vendor,
            lastMessage: lastMsg?.message,
            lastTime: lastMsg?.created_at,
            unread: 0,
          });
        });
      }

      if (directRes.ok) {
        const directs: any[] = await directRes.json();
        directs.forEach((d: any) => {
          convs.push({
            type: 'direct',
            id: `direct_${d.other_user.id}`,
            other: { id: d.other_user.id, name: d.other_user.name, role: d.other_user.role },
            lastMessage: d.last_message,
            lastTime: d.last_at,
            unread: d.unread_count ?? 0,
          });
        });
      }

      setConversations(convs);
      setLoading(false);

      const params = new URLSearchParams(location.search);
      const bookingParam = params.get('booking');
      const withParam = params.get('with');

      setSelected(prev => {
        if (prev) return prev;
        if (bookingParam) return convs.find(c => c.type === 'booking' && c.id === parseInt(bookingParam)) ?? null;
        if (withParam) return convs.find(c => c.type === 'direct' && c.other.id === parseInt(withParam)) ?? null;
        return null;
      });
    } catch (e: any) {
      if (e?.name !== 'AbortError') setLoading(false);
    }
  }, [h, user?.role, location.search]);



  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text || !selected || sending) return;
    setSending(true);
    setNewMessage('');

    // Optimistic update â€” add a temp message immediately
    const tempId = Date.now();
    const optimistic: IMessage = {
      id: tempId,
      message: text,
      created_at: new Date().toISOString(),
      is_read: false,
      booking_id: selected.type === 'booking' ? (selected.id as number) : null,
      sender_id: user!.id,
      sender_label: user?.role === 'admin' ? 'Support' : (user?.name ?? 'Me'),
      sender_role: user?.role ?? 'customer',
      sender: { id: user!.id, name: user?.name ?? 'Me', role: user?.role },
      receiver: { id: selected.other.id, name: selected.other.name },
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const body: any = { message: text };
      if (selected.type === 'booking') body.booking_id = selected.id;
      else body.receiver_id = selected.other.id;

      const r = await fetch(`${API}/messages`, {
        method: 'POST',
        headers: h(),
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const data = await r.json();
        // Replace optimistic with real message
        setMessages(prev => prev.map(m => m.id === tempId ? data.message : m));
        setConversations(prev =>
          prev.map(c => c.id === selected.id ? { ...c, lastMessage: text, lastTime: new Date().toISOString() } : c)
        );
      } else {
        // Remove optimistic on failure
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setNewMessage(text);
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSelect = (conv: Conversation) => {
    setSelected(conv);
    selectedRef.current = conv;
    setMessages([]);
    setShowSidebar(false);
    setOtherPhone(null);
    // Fetch phone for vendor or admin to show WhatsApp button
    if (conv.other.role === 'vendor' || conv.other.role === 'admin') {
      fetch(`${API}/users/${conv.other.id}/phone`, { headers: h() })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.phone) setOtherPhone(d.phone); })
        .catch(() => {});
    }
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const contactSupport = () => {
    if (!adminUser) return;
    const existing = conversations.find(c => c.type === 'direct' && c.other.id === adminUser.id);
    if (existing) { handleSelect(existing); return; }
    const conv: Conversation = {
      type: 'direct',
      id: `direct_${adminUser.id}`,
      other: { id: adminUser.id, name: adminUser.name, role: 'admin' },
    };
    setConversations(prev => [conv, ...prev]);
    handleSelect(conv);
  };

  // Handle ?with= URL param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const withParam = params.get('with');
    if (!withParam || !token || loading) return;
    const userId = parseInt(withParam);
    const existing = conversations.find(c => c.type === 'direct' && c.other.id === userId);
    if (existing) { handleSelect(existing); return; }
    const conv: Conversation = {
      type: 'direct',
      id: `direct_${userId}`,
      other: { id: userId, name: 'User', role: '' },
    };
    setConversations(prev => prev.some(c => c.id === conv.id) ? prev : [conv, ...prev]);
    setSelected(conv);
    setShowSidebar(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, loading]);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetchAdminUser();
    fetchConversations();
    // NO interval — the global SSE below handles all real-time updates
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Keep selectedRef in sync with selected state (needed by SSE handler which can't use state directly)
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  // ── One-time message history load when a conversation is selected ────────
  useEffect(() => {
    if (!selected || !token) return;

    lastIdRef.current = 0;
    setMessages([]);

    let cancelled = false;
    const param = selected.type === 'booking'
      ? `booking_id=${selected.id}`
      : `with=${selected.other.id}`;

    fetch(`${API}/messages?${param}`, { headers: h() })
      .then(r => r.ok ? r.json() : [])
      .then((msgs: IMessage[]) => {
        if (cancelled) return;
        setMessages(msgs);
        if (msgs.length > 0) {
          lastIdRef.current = Math.max(lastIdRef.current, msgs[msgs.length - 1].id);
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, token]);

  // ── Global event stream — one SSE connection handles ALL real-time updates ─
  // Server closes after 55s; browser auto-reconnects with Last-Event-ID header.
  // Works properly with Laragon Apache + mod_fcgid (multi-worker).
  useEffect(() => {
    if (!token || !user) return;

    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    const connect = (fromLastId: number) => {
      if (destroyed) return;
      const url = `${API}/events?token=${encodeURIComponent(token)}&lastEventId=${fromLastId}`;
      es = new EventSource(url);

      // Handle incoming message event
      es.addEventListener('message', (event: MessageEvent) => {
        const msg: IMessage = JSON.parse(event.data);
        const msgId = msg.id;
        lastIdRef.current = Math.max(lastIdRef.current, msgId);

        const cur = selectedRef.current;

        // ① Update message list if this message belongs to the open conversation
        if (cur) {
          const inBooking = cur.type === 'booking' && msg.booking_id === (cur.id as number);
          const inDirect  = cur.type === 'direct'  && msg.booking_id == null &&
            (msg.sender_id === cur.other.id || (msg.receiver?.id ?? msg.receiver_id) === cur.other.id);

          if (inBooking || inDirect) {
            setMessages(prev => {
              const ids = new Set(prev.map(m => m.id));
              // Skip if already present (e.g., our own optimistic message already replaced)
              if (ids.has(msgId)) return prev;
              return [...prev.filter(m => m.id > 0), msg];
            });
          }
        }

        // ② Always update sidebar conversation preview
        const convId: string | number = msg.booking_id != null
          ? msg.booking_id
          : `direct_${msg.sender_id === user.id ? (msg.receiver?.id ?? msg.receiver_id) : msg.sender_id}`;

        setConversations(prev => prev.map(c =>
          c.id === convId
            ? { ...c, lastMessage: msg.message, lastTime: msg.created_at }
            : c
        ));
      });

      // On network error — retry after 5s with last known position
      es.onerror = () => {
        es?.close();
        if (!destroyed) {
          reconnectTimer = setTimeout(() => connect(lastIdRef.current), 5000);
        }
      };
    };

    connect(lastIdRef.current);

    return () => {
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const formatTime = (s: string) =>
    new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const bookingConvs = conversations.filter(c => c.type === 'booking');
  const directConvs = conversations.filter(c => c.type === 'direct');

  // Sidebar label for conversation
  const convSubLabel = (c: Conversation) => {
    if (c.type === 'booking') return c.service ?? 'Booking';
    const role = c.other.role ?? '';
    return role.charAt(0).toUpperCase() + role.slice(1) || 'User';
  };

  // Header participants label (for booking chats show all participants)
  const headerParticipants = (c: Conversation) => {
    if (c.type !== 'booking') return c.other.role ?? 'User';
    if (user?.role === 'admin') {
      const cust = c.customer?.name ?? 'Customer';
      const vend = c.vendor?.vendor?.business_name ?? c.vendor?.name ?? 'Vendor';
      return `${cust} · ${vend}`;
    }
    return c.service ?? 'Booking';
  };

  const ConvItem = ({ c }: { c: Conversation }) => {
    const isActive = selected?.id === c.id;
    return (
      <button
        onClick={() => handleSelect(c)}
        className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors border-b border-gray-50 ${
          isActive ? 'bg-green-50 border-l-4 border-l-green-600' : 'hover:bg-gray-50 border-l-4 border-l-transparent'
        }`}
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isActive ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          {c.other.name?.charAt(0)?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{c.other.name}</p>
            {(c.unread ?? 0) > 0 && (
              <span className="bg-green-600 text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 flex-shrink-0">
                {c.unread}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 truncate">{convSubLabel(c)}</p>
          {c.lastMessage && <p className="text-xs text-gray-400 truncate mt-0.5">{c.lastMessage}</p>}
        </div>
      </button>
    );
  };

  return (<>
      <SeoHead
        title="Messages"
        description="Your conversations with service providers on ToleMate."
        noIndex={true}
      />
    <div className="h-[calc(100vh-4rem)] flex bg-white overflow-hidden">

      {/* â”€â”€ Sidebar â”€â”€ */}
      <div className={`${showSidebar ? 'flex' : 'hidden md:flex'} w-full md:w-72 lg:w-80 flex-col border-r border-gray-200 bg-white flex-shrink-0`}>
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-gray-900 text-base leading-tight">Messages</h2>
            <p className="text-xs text-gray-400">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
          </div>
          {(user?.role === 'customer' || user?.role === 'vendor') && adminUser && (
            <button
              onClick={contactSupport}
              className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-full transition-colors flex-shrink-0"
            >
              <Plus className="w-3 h-3" /> Support
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <div className="p-8 text-center text-xs text-gray-400">Loadingâ€¦</div>}

          {bookingConvs.length > 0 && (
            <>
              <div className="px-4 py-2 bg-gray-50 border-b">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Booking Chats</p>
              </div>
              {bookingConvs.map(c => <ConvItem key={String(c.id)} c={c} />)}
            </>
          )}

          {directConvs.length > 0 && (
            <>
              <div className="px-4 py-2 bg-gray-50 border-b">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Direct Messages</p>
              </div>
              {directConvs.map(c => <ConvItem key={String(c.id)} c={c} />)}
            </>
          )}

          {!loading && conversations.length === 0 && (
            <div className="p-10 text-center">
              <MessageCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400 mb-4">No conversations yet</p>
              {(user?.role === 'customer' || user?.role === 'vendor') && adminUser && (
                <button onClick={contactSupport} className="text-xs bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full">
                  Contact Support
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* â”€â”€ Chat panel â”€â”€ */}
      <div className={`${showSidebar ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-[#f0f2f5] min-w-0`}>
        {selected ? (
          <>
            {/* Header */}
            <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center gap-3 flex-shrink-0 shadow-sm">
              <button className="md:hidden text-gray-500 p-1 hover:bg-gray-100 rounded-full mr-1" onClick={() => setShowSidebar(true)}>
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                {selected.other.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{selected.other.name}</p>
                <p className="text-xs text-gray-500 truncate">{headerParticipants(selected)}</p>
              </div>
              {/* WhatsApp button — shown when other user is vendor/admin and has a phone */}
              {otherPhone && (
                <a
                  href={`https://wa.me/${fmtWA(otherPhone)}?text=${encodeURIComponent(`Hi ${selected.other.name}! Contacting you via ToleMate chat.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Chat on WhatsApp"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#1ebe5c] text-white rounded-lg text-xs font-medium transition-colors flex-shrink-0"
                >
                  <WhatsAppIcon />
                  <span className="hidden sm:inline">WhatsApp</span>
                </a>
              )}
              {/* Online indicator */}
              <div className="flex items-center gap-1 text-xs text-green-600 flex-shrink-0">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                <span className="hidden sm:inline">Active</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
              {messages.length === 0 && (
                <div className="text-center py-16 text-sm text-gray-400">No messages yet â€” start the conversation!</div>
              )}

              {messages.map((m, idx) => {
                const isMe = m.sender_id === user?.id || m.sender?.id === user?.id;
                const role = m.sender_role ?? m.sender?.role ?? 'customer';
                const label = m.sender_label ?? m.sender?.name ?? '';
                const prevMsg = messages[idx - 1];
                const isSameGroup = prevMsg && (prevMsg.sender_id ?? prevMsg.sender?.id) === (m.sender_id ?? m.sender?.id);

                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isSameGroup ? 'mt-0.5' : 'mt-3'}`}>
                    {/* Avatar for received â€” only show on first in group */}
                    {!isMe && (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mr-2 self-end mb-1 ${isSameGroup ? 'opacity-0' : ROLE_AVATAR[role] ?? 'bg-gray-200 text-gray-600'}`}>
                        {label?.charAt(0)?.toUpperCase()}
                      </div>
                    )}

                    <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                      {/* Sender name for received â€” only on first in group */}
                      {!isMe && !isSameGroup && (
                        <p className={`text-xs font-semibold mb-1 ml-1 ${ROLE_NAME_COLOR[role] ?? 'text-gray-500'}`}>
                          {label}
                          {role === 'admin' && <span className="ml-1 text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">Support</span>}
                          {role === 'vendor' && <span className="ml-1 text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">Vendor</span>}
                        </p>
                      )}

                      {/* Bubble */}
                      <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                        isMe
                          ? 'bg-green-600 text-white rounded-tr-sm shadow-sm'
                          : `border shadow-sm ${ROLE_COLORS[role] ?? 'bg-white text-gray-900 border-gray-200'} rounded-tl-sm`
                      }`}>
                        {m.message}
                      </div>

                      {/* Timestamp + read receipt */}
                      <div className={`flex items-center gap-1 mt-0.5 mx-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <span className="text-[10px] text-gray-400">{formatTime(m.created_at)}</span>
                        {isMe && <CheckCheck className={`w-3 h-3 ${m.is_read ? 'text-blue-400' : 'text-gray-400'}`} />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="px-4 py-3 bg-white border-t border-gray-200 flex-shrink-0">
              <form onSubmit={sendMessage} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type a messageâ€¦"
                  className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                  disabled={sending}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-10 h-10 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-full flex items-center justify-center flex-shrink-0 transition-colors shadow"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-5">
              <MessageCircle className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">Your Messages</h3>
            <p className="text-sm text-gray-400 max-w-xs mb-5">
              Select a conversation from the sidebar, or start a new support chat.
            </p>
            {(user?.role === 'customer' || user?.role === 'vendor') && adminUser && (
              <button
                onClick={contactSupport}
                className="text-sm bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-full transition-colors shadow"
              >
                Contact Support
              </button>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default Messages;
