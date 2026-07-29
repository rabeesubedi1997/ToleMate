import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckCircle, Clock, XCircle, CreditCard, MessageCircle, Star, Download, RefreshCw } from 'lucide-react';
import { API_BASE } from '../utils/config';
import SeoHead from '../components/SeoHead';
import { useToast } from '../context/ToastContext';

interface Booking {
  id: number;
  status: string;
  price: number | null;
  payment_status: string;
  scheduled_time: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  time_slot: string | null;
  reschedule_to: string | null;
  reschedule_status: string | null;
  reschedule_requested_at: string | null;
  service: {
    id: number;
    name: string;
    description: string;
    pricing_type: string;
    category: { name: string };
  };
  vendor?: { id: number; business_name: string; user?: { id: number } };
  customer?: { id: number; name: string; email: string; phone?: string };
  package?: { name: string; price: number } | null;
  review?: { rating: number; comment: string | null } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:     { label: 'Pending approval', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: <Clock className="w-4 h-4" /> },
  accepted:    { label: 'Accepted',         color: 'text-blue-600 bg-blue-50 border-blue-200',       icon: <CheckCircle className="w-4 h-4" /> },
  in_progress: { label: 'In progress',      color: 'text-blue-700 bg-blue-50 border-blue-200',       icon: <Clock className="w-4 h-4" /> },
  completed:   { label: 'Completed',        color: 'text-green-600 bg-green-50 border-green-200',    icon: <CheckCircle className="w-4 h-4" /> },
  cancelled:   { label: 'Cancelled',        color: 'text-red-600 bg-red-50 border-red-200',          icon: <XCircle className="w-4 h-4" /> },
};

const BookingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/bookings/${id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        });
        if (!res.ok) { setNotFound(true); return; }
        setBooking(await res.json());
      } catch { setNotFound(true); }
      finally { setLoading(false); }
    };
    fetchBooking();
  }, [id]);

  const handleRescheduleRequest = async () => {
    if (!rescheduleDate) return;
    setRescheduling(true);
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ reschedule_to: rescheduleDate }),
      });
      const data = await res.json();
      if (res.ok) {
        setBooking(prev => prev ? { ...prev, ...data.booking } : prev);
        setRescheduleOpen(false);
        toast('Reschedule request sent to vendor!');
      } else {
        toast(data.message || 'Failed to send request', 'error');
      }
    } catch { toast('Error sending request', 'error'); }
    finally { setRescheduling(false); }
  };

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) return (
    <div className="min-h-screen py-8 animate-pulse">
      <div className="container-custom max-w-2xl space-y-4">
        <div className="h-4 bg-gray-200 rounded w-24" />
        <div className="card p-6 space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-4 bg-gray-200 rounded w-full" />)}
        </div>
      </div>
    </div>
  );

  if (notFound || !booking) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <XCircle className="w-12 h-12 text-gray-300" />
      <p className="text-gray-500">Booking not found.</p>
      <Link to="/dashboard" className="btn-primary text-sm">Back to dashboard</Link>
    </div>
  );

  const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG['pending'];

  return (
    <>
      <SeoHead
        title="Booking Details"
        description="View the details of your booking on ToleMate."
        noIndex={true}
      />
    <div className="min-h-screen py-8 bg-gray-50">
      <div className="container-custom max-w-2xl">
        
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Status banner */}
        <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border mb-4 ${status.color}`}>
          {status.icon}
          <span className="font-semibold text-sm">{status.label}</span>
          <span className="ml-auto text-xs opacity-70">Booking #{booking.id}</span>
        </div>

        {/* Main card */}
        <div className="card p-6 mb-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">{booking.service.category?.name}</span>
              <h1 className="text-xl font-bold text-gray-900 mt-0.5">{booking.service.name}</h1>
              {booking.vendor && (
                <Link to={`/vendors/${booking.vendor.id}`} className="text-sm text-primary-600 hover:underline">
                  {booking.vendor.business_name}
                </Link>
              )}
            </div>
            {booking.price && (
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-400">Total</p>
                <p className="text-2xl font-bold text-gray-900">Rs. {Number(booking.price).toLocaleString()}</p>
                {booking.package && <p className="text-xs text-gray-500">{booking.package.name}</p>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Scheduled</p>
                <p className="font-medium">{booking.scheduled_time ? formatDateTime(booking.scheduled_time) : 'Not scheduled'}</p>
              </div>
            </div>
            {booking.time_slot && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Time slot</p>
                  <p className="font-medium">{booking.time_slot}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CreditCard className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Payment</p>
                <p className={`font-medium capitalize ${booking.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {booking.payment_status}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Booked on</p>
                <p className="font-medium">{formatDateTime(booking.created_at)}</p>
              </div>
            </div>
          </div>

          {booking.notes && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 border border-gray-100">
              <p className="text-xs font-semibold text-gray-400 mb-1">Notes</p>
              {booking.notes}
            </div>
          )}
        </div>

        {/* Review card if completed */}
        {booking.status === 'completed' && (
          <div className="card p-5 mb-4">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Your review</h3>
            {booking.review ? (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  {[1,2,3,4,5].map(i => (
                    <svg key={i} className={`w-4 h-4 fill-current ${i <= booking.review!.rating ? 'text-yellow-400' : 'text-gray-200'}`} viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                  <span className="text-sm font-semibold text-gray-700 ml-1">{booking.review.rating}/5</span>
                </div>
                {booking.review.comment && <p className="text-sm text-gray-600 italic">"{booking.review.comment}"</p>}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">You haven't reviewed this booking yet.</p>
                <Link to="/dashboard" state={{ openReview: booking.id }} className="btn-secondary text-xs">
                  <Star className="w-3.5 h-3.5" /> Write review
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {booking.status === 'accepted' && booking.payment_status === 'pending' && (
            <Link to={`/checkout/${booking.id}`} className="btn-primary flex-1 justify-center flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Pay now
            </Link>
          )}
          {['pending', 'accepted'].includes(booking.status) && !booking.reschedule_status && (
            <button onClick={() => setRescheduleOpen(true)}
              className="btn-secondary flex-1 justify-center flex items-center gap-2 text-sm">
              <RefreshCw className="w-4 h-4" /> Request reschedule
            </button>
          )}
          <Link to={`/messages?booking=${booking.id}`} className="btn-secondary flex-1 justify-center flex items-center gap-2 text-sm">
            <MessageCircle className="w-4 h-4" /> Chat with vendor
          </Link>
          <button
            onClick={() => window.print()}
            className="btn-ghost flex-1 justify-center flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" /> Print receipt
          </button>
        </div>

        {/* Reschedule status banner */}
        {booking.reschedule_status === 'pending' && (
          <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700">
            <RefreshCw className="w-4 h-4 flex-shrink-0" />
            <span>Reschedule request sent to {booking.vendor?.business_name || 'vendor'} — awaiting response.</span>
          </div>
        )}
        {booking.reschedule_status === 'accepted' && (
          <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>Reschedule accepted! New time: {booking.scheduled_time ? formatDateTime(booking.scheduled_time) : '—'}</span>
          </div>
        )}
        {booking.reschedule_status === 'declined' && (
          <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            <span>Reschedule request was declined by the vendor.</span>
          </div>
        )}

        {/* Reschedule modal */}
        {rescheduleOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
              <h3 className="font-bold text-gray-900 mb-1">Request Reschedule</h3>
              <p className="text-sm text-gray-500 mb-4">Choose your preferred new date and time.</p>
              <input type="datetime-local" className="input-field mb-4 w-full"
                value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)} />
              <div className="flex gap-3">
                <button onClick={() => setRescheduleOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleRescheduleRequest} disabled={rescheduling || !rescheduleDate}
                  className="btn-primary flex-[2]">{rescheduling ? 'Sending...' : 'Send request'}</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
    </>
  );
};

export default BookingDetail;
