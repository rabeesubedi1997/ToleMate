import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { CalendarDays, Search, MessageCircle, CreditCard, Star, Plus, RefreshCw, XCircle, UserCog, ChevronDown, Lock } from 'lucide-react';
import { DashboardSkeleton } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { API_BASE } from '../utils/config';

interface Booking {
  id: number;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  price: number | null;
  payment_status: 'pending' | 'paid' | 'failed';
  scheduled_time: string | null;
  created_at: string;
  service: { id: number; name: string; pricing_type: 'fixed' | 'hourly' | 'quote'; category: { name: string; }; };
  vendor?: { business_name: string; };
  customer?: { name: string; };
  review?: { id: number; rating: number; comment: string | null; } | null;
}

interface User { id: number; name: string; email: string; role: 'customer' | 'vendor' | 'admin'; }

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    completed: 'badge-success', pending: 'badge-warning', cancelled: 'badge-danger',
    accepted: 'badge-info', in_progress: 'badge-info',
  };
  return map[status] || 'badge-neutral';
};

const TIMELINE_STEPS: { key: string; label: string }[] = [
  { key: 'pending',     label: 'Requested' },
  { key: 'accepted',    label: 'Accepted' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed',   label: 'Done' },
];
const StatusTimeline: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'cancelled') return (
    <div className="flex items-center gap-1.5 mt-2">
      <span className="w-2 h-2 rounded-full bg-red-400" />
      <span className="text-xs text-red-500 font-medium">Booking cancelled</span>
    </div>
  );
  const active = TIMELINE_STEPS.findIndex(s => s.key === status);
  return (
    <div className="flex items-center gap-0 mt-3">
      {TIMELINE_STEPS.map((step, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                done ? 'bg-primary-600 border-primary-600' :
                current ? 'bg-white border-primary-600 ring-2 ring-primary-200' :
                'bg-white border-gray-200'
              }`}>
                {done && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                {current && <span className="w-2 h-2 rounded-full bg-primary-600 inline-block" />}
              </div>
              <span className={`text-[9px] mt-0.5 font-medium whitespace-nowrap ${current ? 'text-primary-600' : done ? 'text-gray-500' : 'text-gray-300'}`}>{step.label}</span>
            </div>
            {i < TIMELINE_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mb-3.5 mx-0.5 transition-colors ${i < active ? 'bg-primary-600' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'accepted' | 'in_progress' | 'completed'>('all');
  const [message, setMessage] = useState('');
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<Booking | null>(null);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileData, setProfileData] = useState({ name: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [expandedBooking, setExpandedBooking] = useState<number | null>(null);
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [pwData, setPwData] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });
  const [savingPw, setSavingPw] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState<number | null>(null);

  useEffect(() => {
    if (location.state?.message) { setMessage(location.state.message); setTimeout(() => setMessage(''), 5000); }
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    fetchUser(); fetchBookings();
    // Fetch loyalty points
    fetch(`${API_BASE}/api/loyalty`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d != null) setLoyaltyPoints(d.balance); })
      .catch(() => {});
  }, [navigate, location.state]);

  useEffect(() => { if (user) fetchBookings(activeTab === 'all' ? undefined : activeTab); }, [activeTab, user]);

  const fetchUser = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE}/api/user`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) {
        const u = await response.json();
        setUser(u);
        setProfileData({ name: u.name || '', phone: u.phone || '' });
      }
    } catch (error) { console.error(error); }
  };

  const fetchBookings = async (status?: string) => {
    const token = localStorage.getItem('token');
    const params = status ? `?status=${status}` : '';
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/bookings${params}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) { const data = await response.json(); setBookings(data.data || data); }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const openReviewModal = (booking: Booking) => {
    setSelectedBookingForReview(booking); setReviewData({ rating: 5, comment: '' }); setReviewError(''); setReviewModalOpen(true);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingForReview) return;
    setSubmittingReview(true); setReviewError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/reviews`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ booking_id: selectedBookingForReview.id, rating: reviewData.rating, comment: reviewData.comment }),
      });
      if (response.ok) { setMessage('Review submitted!'); setReviewModalOpen(false); fetchBookings(activeTab === 'all' ? undefined : activeTab); }
      else { setReviewError((await response.json()).message || 'Failed to submit review'); }
    } catch (error) { setReviewError('Network error.'); } finally { setSubmittingReview(false); }
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const cancelBooking = async (bookingId: number) => {
    if (!window.confirm('Cancel this booking?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (res.ok) {
        toast('Booking cancelled', 'info');
        fetchBookings(activeTab === 'all' ? undefined : activeTab);
      } else {
        toast('Could not cancel booking', 'error');
      }
    } catch { toast('Network error', 'error'); }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch(`${API_BASE}/api/user/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(profileData),
      });
      if (res.ok) {
        const updated = await res.json();
        setUser(prev => prev ? { ...prev, name: updated.name || profileData.name } : prev);
        toast('Profile updated!');
        setProfileModalOpen(false);
      } else {
        toast('Could not update profile', 'error');
      }
    } catch { toast('Network error', 'error'); }
    finally { setSavingProfile(false); }
  };

  if (loading && !user) return <DashboardSkeleton />;
  if (!user) return null;

  const tabs = ['all', 'pending', 'accepted', 'in_progress', 'completed'] as const;

  return (
    <div className="min-h-screen py-8 animate-fade-in">
      <div className="container-custom">
        {message && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center gap-2">
            <span>✓</span> {message}
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.name}</h1>
            <p className="text-sm text-gray-500">Track your bookings and discover services</p>
            {loyaltyPoints !== null && (
              <span className="inline-flex items-center gap-1 mt-1 text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200 px-2.5 py-0.5 rounded-full">
                ⭐ {loyaltyPoints} loyalty point{loyaltyPoints !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Link to="/services" className="btn-primary text-sm">
              <Search className="w-4 h-4" /> Find services
            </Link>
            <Link to="/post-request" className="btn-secondary text-sm">
              <Plus className="w-4 h-4" /> Post request
            </Link>
            <button onClick={() => setProfileModalOpen(true)} className="btn-ghost text-sm" title="Edit profile">
              <UserCog className="w-4 h-4" />
            </button>
            <Link to="/customer/profile" className="btn-ghost text-sm" title="My profile">
              <UserCog className="w-4 h-4" />
            </Link>
            <button onClick={() => setPwModalOpen(true)} className="btn-ghost text-sm" title="Change password">
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">Total bookings</p>
            <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{bookings.filter(b => b.status === 'pending').length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">In progress</p>
            <p className="text-2xl font-bold text-blue-600">{bookings.filter(b => b.status === 'in_progress' || b.status === 'accepted').length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500 mb-1">Completed</p>
            <p className="text-2xl font-bold text-green-600">{bookings.filter(b => b.status === 'completed').length}</p>
          </div>
        </div>

        {/* Bookings */}
        <div className="card">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-semibold text-gray-900">Your bookings</h2>
            <div className="flex gap-1 overflow-x-auto">
              {tabs.map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >{tab.charAt(0).toUpperCase() + tab.slice(1).replace('_', ' ')}</button>
              ))}
            </div>
          </div>

          {bookings.length === 0 ? (
            <div className="p-12 text-center">
              <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900 mb-1">No bookings yet</h3>
              <p className="text-sm text-gray-500 mb-4">Start by browsing services</p>
              <Link to="/services" className="btn-primary text-sm">Browse services</Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {bookings.map((booking) => (
                <div key={booking.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1 cursor-pointer" onClick={() => setExpandedBooking(expandedBooking === booking.id ? null : booking.id)}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`badge ${statusBadge(booking.status)}`}>{booking.status.replace('_', ' ')}</span>
                        {booking.payment_status === 'paid' && <span className="badge badge-success">Paid</span>}
                        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedBooking === booking.id ? 'rotate-180' : ''}`} />
                      </div>
                      <h4 className="font-medium text-gray-900">{booking.service.name}</h4>
                      <p className="text-xs text-gray-500">{booking.vendor?.business_name} · {formatDate(booking.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {booking.price && <span className="font-semibold text-gray-900">Rs. {Number(booking.price).toLocaleString()}</span>}
                      {booking.status === 'accepted' && booking.payment_status === 'pending' && (
                        <button onClick={() => navigate(`/checkout/${booking.id}`)} className="btn-primary text-xs py-1.5 px-3">
                          <CreditCard className="w-3.5 h-3.5" /> Pay now
                        </button>
                      )}
                      {booking.status === 'completed' && (
                        booking.review
                          ? <span className="flex items-center gap-1 text-xs text-green-600 font-medium px-2 py-1.5"><Star className="w-3.5 h-3.5 fill-current" /> Reviewed</span>
                          : <button onClick={() => openReviewModal(booking)} className="btn-secondary text-xs py-1.5 px-3"><Star className="w-3.5 h-3.5" /> Review</button>
                      )}
                      {booking.status === 'completed' && (
                        <Link to={`/book/${booking.service.id}`} className="btn-ghost text-xs" title="Book this service again">
                          <RefreshCw className="w-3.5 h-3.5" /> Book again
                        </Link>
                      )}
                      {(booking.status === 'pending' || booking.status === 'accepted') && (
                        <button onClick={() => cancelBooking(booking.id)} className="btn-ghost text-xs text-red-500 hover:text-red-700 hover:bg-red-50">
                          <XCircle className="w-3.5 h-3.5" /> Cancel
                        </button>
                      )}
                      <Link to={`/messages?booking=${booking.id}`} className="btn-ghost text-xs">
                        <MessageCircle className="w-3.5 h-3.5" /> Chat
                      </Link>
                      <Link to={`/bookings/${booking.id}`} className="btn-ghost text-xs text-gray-400">
                        Details
                      </Link>
                    </div>
                  </div>
                  {expandedBooking === booking.id && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <StatusTimeline status={booking.status} />
                      {booking.scheduled_time && (
                        <p className="text-xs text-gray-500 mt-2">📅 Scheduled: {formatDate(booking.scheduled_time)}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Profile Edit Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm p-6 rounded-xl shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Edit Profile</h3>
              <button onClick={() => setProfileModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
                <input type="text" className="input-field" required value={profileData.name}
                  onChange={e => setProfileData(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone number</label>
                <input type="tel" className="input-field" value={profileData.phone}
                  onChange={e => setProfileData(p => ({ ...p, phone: e.target.value }))}
                  placeholder="98XXXXXXXX" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setProfileModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={savingProfile} className="btn-primary flex-1">
                  {savingProfile ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModalOpen && selectedBookingForReview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Leave a review</h3>
            <p className="text-sm text-gray-500 mb-5">How was your experience with {selectedBookingForReview.vendor?.business_name}?</p>
            <form onSubmit={submitReview}>
              {reviewError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">{reviewError}</div>}
              <div className="mb-5 flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" onClick={() => setReviewData(prev => ({ ...prev, rating: star }))}
                    className={`text-3xl transition-colors ${star <= reviewData.rating ? 'text-yellow-400' : 'text-gray-200'}`}
                  >★</button>
                ))}
              </div>
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Your feedback (optional)</label>
                <textarea className="input-field resize-none" rows={3} value={reviewData.comment}
                  onChange={(e) => setReviewData(prev => ({ ...prev, comment: e.target.value }))} placeholder="Tell us about your experience..."
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setReviewModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={submittingReview} className="btn-primary flex-1">{submittingReview ? 'Submitting...' : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {pwModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm p-6 rounded-xl shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Change Password</h3>
              <button onClick={() => setPwModalOpen(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5" /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setSavingPw(true);
              try {
                const res = await fetch(`${API_BASE}/api/user/change-password`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                  body: JSON.stringify(pwData),
                });
                if (res.ok) {
                  toast('Password changed!');
                  setPwModalOpen(false);
                  setPwData({ current_password: '', new_password: '', new_password_confirmation: '' });
                } else {
                  const d = await res.json();
                  toast(d.message || Object.values(d.errors || {}).flat().join(', ') || 'Failed', 'error');
                }
              } catch { toast('Network error', 'error'); }
              finally { setSavingPw(false); }
            }} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Current password</label>
                <input type="password" className="input-field" required value={pwData.current_password}
                  onChange={e => setPwData(p => ({ ...p, current_password: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
                <input type="password" className="input-field" required minLength={8} value={pwData.new_password}
                  onChange={e => setPwData(p => ({ ...p, new_password: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm new password</label>
                <input type="password" className="input-field" required minLength={8} value={pwData.new_password_confirmation}
                  onChange={e => setPwData(p => ({ ...p, new_password_confirmation: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setPwModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={savingPw} className="btn-primary flex-1">{savingPw ? 'Saving...' : 'Change'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
