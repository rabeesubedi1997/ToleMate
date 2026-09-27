import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, Star, CheckCircle2, Plus } from 'lucide-react';
import api from '../utils/api';
import SeoHead from '../components/SeoHead';
import { useToast } from '../context/ToastContext';

interface Quote {
  id: number;
  price: string | number;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  service: { id: number; name: string; price: number | null };
  vendor: { id: number; business_name: string; rating: number; avatar?: string | null };
}

interface RequestItem {
  id: number;
  title: string;
  text: string;
  budget: string | number | null;
  status: 'open' | 'closed' | 'cancelled';
  created_at: string;
  category: { id: number; name: string } | null;
  quotes: Quote[];
}

const MyRequests: React.FC = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

  const load = async () => {
    try {
      const { data } = await api.get('/booking-requests/mine');
      setRequests(data.data || data);
    } catch (e) {
      console.error(e);
      toast('Could not load your requests.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const acceptQuote = async (quoteId: number) => {
    setAcceptingId(quoteId);
    try {
      await api.put(`/bookings/${quoteId}`, { status: 'accepted' });
      toast('Quote accepted! The request is now closed to other vendors.');
      load();
    } catch (err: any) {
      toast(err.response?.data?.message || 'Could not accept this quote.', 'error');
    } finally {
      setAcceptingId(null);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="spinner" /></div>;

  return (
    <>
      <SeoHead title="My Requests" description="Track your posted service requests and compare vendor quotes." noIndex={true} />
      <div className="container-custom max-w-3xl py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My requests</h1>
          <Link to="/post-request" className="btn-primary text-sm"><Plus className="w-4 h-4" /> New request</Link>
        </div>

        {requests.length === 0 ? (
          <div className="card p-10 text-center text-gray-400">
            <Inbox className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="mb-4">You haven't posted any requests yet.</p>
            <Link to="/post-request" className="btn-primary inline-flex">Post a request</Link>
          </div>
        ) : (
          <div className="space-y-5">
            {requests.map(req => (
              <div key={req.id} className="card p-5">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h2 className="font-semibold text-gray-900">{req.title}</h2>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${
                    req.status === 'open' ? 'bg-green-50 text-green-700' :
                    req.status === 'closed' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'
                  }`}>{req.status}</span>
                </div>
                <p className="text-sm text-gray-500 mb-3">{req.text}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                  {req.category && <span>{req.category.name}</span>}
                  {req.budget && <span>Budget: Rs. {Number(req.budget).toLocaleString()}</span>}
                  <span>{new Date(req.created_at).toLocaleDateString()}</span>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                    {req.quotes.length} {req.quotes.length === 1 ? 'quote' : 'quotes'} received
                  </p>
                  {req.quotes.length === 0 ? (
                    <p className="text-sm text-gray-400">No quotes yet — vendors matching your category will be notified.</p>
                  ) : (
                    <div className="space-y-3">
                      {req.quotes.map(q => (
                        <div key={q.id} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900 truncate">{q.vendor.business_name}</p>
                              <span className="flex items-center gap-0.5 text-xs text-amber-500 flex-shrink-0">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {q.vendor.rating || '—'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 truncate">{q.service.name}</p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="font-semibold text-gray-900 text-sm">Rs. {Number(q.price).toLocaleString()}</span>
                            {q.status === 'pending' && req.status === 'open' && (
                              <button
                                onClick={() => acceptQuote(q.id)}
                                disabled={acceptingId === q.id}
                                className="btn-primary text-xs py-1.5 px-3"
                              >
                                {acceptingId === q.id ? 'Accepting...' : 'Accept'}
                              </button>
                            )}
                            {q.status === 'accepted' && (
                              <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Accepted
                              </span>
                            )}
                            {q.status === 'cancelled' && (
                              <span className="text-xs text-gray-400">Not selected</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default MyRequests;
