import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Megaphone, Send, DollarSign, Calendar, Zap, Clock, AlarmClock, Filter } from 'lucide-react';
import { API_BASE } from '../utils/config';
import { useToast } from '../context/ToastContext';

interface BookingRequest {
  id: number;
  title: string;
  text: string;
  status: string;
  created_at: string;
  urgency: 'asap' | 'this_week' | 'this_month' | 'flexible';
  budget: number | null;
  preferred_date: string | null;
  customer: { name: string };
  category: { id: number; name: string } | null;
}

interface Category { id: number; name: string }

const URGENCY_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  asap: { label: 'ASAP', color: 'bg-red-100 text-red-700 border-red-200', icon: Zap },
  this_week: { label: 'This week', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: AlarmClock },
  this_month: { label: 'This month', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock },
  flexible: { label: 'Flexible', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: Calendar },
};

const Marketplace: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<number | null>(null);
  const [quoteData, setQuoteData] = useState({ service_id: '', price: '', message: '' });
  const [services, setServices] = useState<any[]>([]);
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/categories`).then(r => r.json()).then(setCategories).catch(console.error);
    fetchMyServices();
  }, []);

  useEffect(() => { fetchRequests(); }, [filterCategory]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = filterCategory ? `?category_id=${filterCategory}` : '';
      const res = await fetch(`${API_BASE}/api/booking-requests${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) { const data = await res.json(); setRequests(data.data || []); }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchMyServices = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/services`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (res.ok) { const data = await res.json(); setServices(data.data || []); }
    } catch (error) { console.error(error); }
  };

  const handleRespond = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/booking-requests/${id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(quoteData),
      });
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== id));
        setRespondingTo(null);
        setQuoteData({ service_id: '', price: '', message: '' });
      } else {
        const data = await res.json();
        toast(data.message || 'Failed to send quote', 'error');
      }
    } catch (error) { console.error(error); }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="spinner"></div></div>;

  return (
    <div className="min-h-screen py-8">
      <div className="container-custom max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Service marketplace</h1>
            <p className="text-sm text-gray-500">{requests.length} open request{requests.length !== 1 ? 's' : ''} — submit quotes to win jobs</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select className="input-field text-sm py-2 w-40" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="">All categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {requests.map(req => {
            const urgency = URGENCY_CONFIG[req.urgency] || URGENCY_CONFIG.flexible;
            const UrgencyIcon = urgency.icon;
            return (
              <div key={req.id} className="card p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {req.category && <span className="badge badge-neutral">{req.category.name}</span>}
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${urgency.color}`}>
                        <UrgencyIcon className="w-3 h-3" /> {urgency.label}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-base">{req.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{req.customer.name} · Posted {formatDate(req.created_at)}</p>
                  </div>
                  <div className="flex-shrink-0 text-right space-y-1">
                    {req.budget && (
                      <div className="flex items-center justify-end gap-1 text-sm font-semibold text-green-700">
                        <DollarSign className="w-3.5 h-3.5" /> Budget: ${Number(req.budget).toLocaleString()}
                      </div>
                    )}
                    {req.preferred_date && (
                      <div className="flex items-center justify-end gap-1 text-xs text-gray-500">
                        <Calendar className="w-3.5 h-3.5" /> By {formatDate(req.preferred_date)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="bg-gray-50 border border-gray-100 p-4 rounded-lg mb-4">
                  <p className="text-sm text-gray-700 leading-relaxed">"{req.text}"</p>
                </div>

                {/* Quote form or Send button */}
                {respondingTo === req.id ? (
                  <div className="border border-primary-200 bg-primary-50 rounded-xl p-5 space-y-4 animate-fade-in">
                    <h4 className="font-semibold text-gray-900 text-sm">Submit your quote for: <span className="text-primary-700">{req.title}</span></h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Your service</label>
                        <select className="input-field text-sm bg-white" value={quoteData.service_id}
                          onChange={e => setQuoteData({ ...quoteData, service_id: e.target.value })}>
                          <option value="">Select service</option>
                          {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Your price ($){req.budget ? ` · Budget: $${req.budget}` : ''}
                        </label>
                        <input type="number" className="input-field text-sm bg-white" placeholder="0.00"
                          value={quoteData.price} onChange={e => setQuoteData({ ...quoteData, price: e.target.value })} min="0" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Cover message</label>
                      <textarea className="input-field text-sm bg-white resize-none" rows={3}
                        placeholder="Explain why you're the best fit for this job..."
                        value={quoteData.message} onChange={e => setQuoteData({ ...quoteData, message: e.target.value })} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setRespondingTo(null); setQuoteData({ service_id: '', price: '', message: '' }); }}
                        className="btn-secondary flex-1 text-sm">Cancel</button>
                      <button onClick={() => handleRespond(req.id)} disabled={!quoteData.service_id || !quoteData.price}
                        className="btn-primary flex-1 text-sm">
                        <Send className="w-4 h-4" /> Send quote
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setRespondingTo(req.id); setQuoteData({ service_id: '', price: '', message: '' }); }}
                    className="btn-primary w-full text-sm">
                    <Send className="w-4 h-4" /> Send a quote
                  </button>
                )}
              </div>
            );
          })}

          {requests.length === 0 && (
            <div className="card p-12 text-center">
              <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900 mb-1">No open requests</h3>
              <p className="text-sm text-gray-500">
                {filterCategory ? 'No requests in this category.' : 'Check back later for new opportunities.'}
              </p>
              {filterCategory && (
                <button onClick={() => setFilterCategory('')} className="btn-secondary text-sm mt-4">Clear filter</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Marketplace;

