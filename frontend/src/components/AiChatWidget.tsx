import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import api from '../utils/api';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const CONVERSATION_STORAGE_KEY = 'tolemate_ai_conversation_id';

/**
 * Floating chat widget connected to whatever AI agent is configured in
 * Admin > AI Agent. Renders nothing until that connection is confirmed
 * enabled, so a fresh install with no agent connected stays silent rather
 * than showing a bubble that always errors.
 */
const AiChatWidget: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendingStatus, setSendingStatus] = useState('Typing…');
  const conversationId = useRef<string | null>(sessionStorage.getItem(CONVERSATION_STORAGE_KEY));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/ai-agent/status')
      .then(({ data }) => { if (!cancelled) setEnabled(!!data?.enabled); })
      .catch(() => { if (!cancelled) setEnabled(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  if (!enabled) return null;

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setSending(true);
    setSendingStatus('Typing…');
    // Runs entirely locally with no GPU, so a reply can genuinely take a
    // minute or two, especially mid-booking (checking availability,
    // confirming, etc. can mean several model calls in one request). A
    // progressively updating status reassures the visitor it's still
    // working rather than looking frozen or broken.
    const statusTimers = [
      setTimeout(() => setSendingStatus('Still thinking…'), 12000),
      setTimeout(() => setSendingStatus('Checking details, this can take a minute…'), 35000),
      setTimeout(() => setSendingStatus('Almost there…'), 90000),
    ];

    try {
      // Local CPU-only LLM inference can take well over the default 30s
      // client timeout, and a multi-step booking turn can need several
      // model calls in one request — matches the Laravel proxy's own
      // 280s allowance (AiAgentController) rather than cutting it short.
      const { data } = await api.post('/ai-agent/chat', {
        message: text,
        conversation_id: conversationId.current,
      }, { timeout: 280000 });
      if (data.conversation_id) {
        conversationId.current = data.conversation_id;
        sessionStorage.setItem(CONVERSATION_STORAGE_KEY, data.conversation_id);
      }
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || "Sorry, I didn't catch that." }]);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Something went wrong reaching the AI assistant.';
      setMessages(prev => [...prev, { role: 'assistant', content: message }]);
    } finally {
      statusTimers.forEach(clearTimeout);
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
      {open && (
        <div className="mb-3 w-[90vw] max-w-sm h-[28rem] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="bg-primary-600 text-white px-4 py-3 flex items-center gap-2">
            <Bot className="w-5 h-5" />
            <div className="flex-1">
              <p className="text-sm font-semibold leading-tight">ToleMate Assistant</p>
              <p className="text-xs text-primary-100 leading-tight">Usually replies instantly</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="text-primary-100 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center text-xs text-gray-400 mt-8 px-4">
                Ask about services, vendors, or your booking — e.g. "I need a plumber in Kathmandu".
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.role === 'user' ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-xl rounded-bl-sm px-3 py-2 text-sm text-gray-400">
                  {sendingStatus}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={sendMessage} className="p-2 border-t border-gray-200 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={sending}
            />
            <button type="submit" disabled={sending || !input.trim()} className="bg-primary-600 text-white p-2 rounded-lg disabled:opacity-50">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close AI chat' : 'Open AI chat'}
        className="w-14 h-14 rounded-full bg-primary-600 text-white shadow-xl flex items-center justify-center hover:bg-primary-700 transition-colors"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
};

export default AiChatWidget;
