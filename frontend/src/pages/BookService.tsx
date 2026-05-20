import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, MessageSquare, Star, Package, CheckCircle, ArrowRight, MapPin } from 'lucide-react';
import { getServiceImage } from '../utils/serviceImage';
import { API_BASE } from '../utils/config';



interface AvailSlot { day_of_week: number; start_time: string; end_time: string; is_available: boolean; }

/** Generate hourly slots between start_time and end_time (HH:MM format) */
function buildTimeSlots(start: string, end: string): string[] {
  const [sh, sm] = start.split(':').map(Number);
  const [eh] = end.split(':').map(Number);
  const slots: string[] = [];
  for (let h = sh; h < eh; h++) {
    slots.push(`${String(h).padStart(2, '0')}:${sm === 30 ? '30' : '00'}`);
    if (sm === 0 && h < eh - 1) slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
}

const BookService: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();

  // Extract package info from URL query params
  const searchParams = new URLSearchParams(location.search);
  const packageId = searchParams.get('package');
  const packagePrice = searchParams.get('price');
  const packageName = searchParams.get('pkg_name');

  const [service, setService] = useState<any>(null);
  const [availability, setAvailability] = useState<AvailSlot[]>([]);
  const [date, setDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [message, setMessage] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState<any>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponData, setCouponData] = useState<{ discount: number; final: number; coupon: any } | null>(null);
  const [couponError, setCouponError] = useState('');

  // Minimum bookable date is today
  const today = new Date().toISOString().split('T')[0];

  // Prefill address from user profile
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/user`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(u => { if (u?.address) setAddress(u.address); })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!id) { setError('No service ID provided'); return; }
    fetch(`${API_BASE}/api/services/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        const svc = data.service || data;
        setService(svc);
        // Fetch vendor availability
        if (svc.vendor_id) {
          fetch(`${API_BASE}/api/vendors/${svc.vendor_id}/availability`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.availability) setAvailability(d.availability); })
            .catch(() => {});
        }
      })
      .catch(() => setError('Failed to load service details'));
  }, [id]);

  /** Time slots available for the selected date based on vendor's weekly schedule */
  const timeSlots = useMemo(() => {
    if (!date || availability.length === 0) return [];
    const dow = new Date(date + 'T00:00:00').getDay(); // 0=Sun
    const slot = availability.find(s => s.day_of_week === dow);
    if (!slot || !slot.is_available) return [];
    return buildTimeSlots(slot.start_time, slot.end_time);
  }, [date, availability]);

  /** Whether the selected date is an unavailable day */
  const dateUnavailable = useMemo(() => {
    if (!date || availability.length === 0) return false;
    const dow = new Date(date + 'T00:00:00').getDay();
    const slot = availability.find(s => s.day_of_week === dow);
    return slot ? !slot.is_available : false;
  }, [date, availability]);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    setCouponData(null);
    try {
      const price = service?.price ? Number(service.price) : 0;
      const res = await fetch(`${API_BASE}/api/coupons/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), amount: price }),
      });
      const data = await res.json();
      if (!res.ok) { setCouponError(data.message || 'Invalid coupon.'); return; }
      setCouponData(data);
    } catch {
      setCouponError('Failed to apply coupon.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) { setError('Please select a preferred date.'); return; }
    if (timeSlots.length > 0 && !selectedSlot) { setError('Please select a time slot.'); return; }
    setLoading(true);
    setError('');

    try {
      const scheduledTime = selectedSlot ? `${date} ${selectedSlot}:00` : `${date} 09:00:00`;

      const response = await fetch(`${API_BASE}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          service_id: id,
          booking_type: 'instant',
          message,
          address: address || undefined,
          scheduled_time: scheduledTime,
          ...(packageId ? { package_id: Number(packageId) } : {}),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setBookingSuccess({
          service: service?.name,
          vendor: service?.vendor?.business_name,
          date: date,
          slot: selectedSlot || '09:00',
          price: packagePrice || service?.price,
          packageName,
          bookingId: data.booking?.id || data.id,
        });
      } else {
        const err = await response.json();
        const msg = err.message
          || (err.errors ? Object.values(err.errors as Record<string, string[]>).flat().join(' ') : null)
          || 'Booking failed. Please try again.';
        setError(msg);
      }
    } catch {
      setError('Could not connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (error && !service) return (
    <div className="min-h-screen pt-32 flex flex-col items-center gap-4">
      <p className="text-red-500 text-sm">{error}</p>
      <button onClick={() => navigate('/services')} className="btn-secondary text-sm">Back to Services</button>
    </div>
  );

  if (bookingSuccess) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center animate-fade-in">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-9 h-9 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Submitted!</h2>
        <p className="text-gray-500 mb-6 text-sm">Your request has been sent to the vendor. You'll be notified once they confirm.</p>
        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Service</span>
            <span className="font-medium text-gray-900 text-right max-w-[55%] line-clamp-1">{bookingSuccess.service}</span>
          </div>
          {bookingSuccess.packageName && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Package</span>
              <span className="font-medium text-gray-900">{bookingSuccess.packageName}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Vendor</span>
            <span className="font-medium text-gray-900">{bookingSuccess.vendor}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Scheduled</span>
            <span className="font-medium text-gray-900">{bookingSuccess.date} at {bookingSuccess.slot}</span>
          </div>
          {bookingSuccess.price && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Estimated</span>
              <span className="font-semibold text-primary-600">Rs. {Number(bookingSuccess.price).toLocaleString()}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <Link to="/dashboard" className="btn-primary flex items-center justify-center gap-2">
            <Calendar className="w-4 h-4" /> View my bookings
          </Link>
          <Link to="/services" className="btn-ghost flex items-center justify-center gap-2 text-sm">
            Browse more services <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );

  if (!service) return (
    <div className="min-h-screen flex items-center justify-center"><div className="spinner"></div></div>
  );

  return (
    <div className="min-h-screen py-8 bg-gray-50 animate-fade-in">
      <div className="container-custom max-w-3xl px-4">

        {/* Page header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-gray-500 hover:text-gray-700 mb-3 inline-flex items-center gap-1"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Book Service</h1>
          <p className="text-sm text-gray-500 mt-0.5">Fill in the details to send a booking request</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">

          {/* ── Service summary ── */}
          <div className="md:col-span-2">
            <div className="card overflow-hidden md:sticky md:top-24">
              <div className="relative h-40 overflow-hidden">
                <img
                  src={getServiceImage(service)}
                  alt={service.name}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&q=70'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <span className="absolute bottom-2 left-3 text-xs text-white font-medium bg-black/30 px-2 py-0.5 rounded-full">
                  {service.category?.name}
                </span>
              </div>
              <div className="p-4">
                <h2 className="font-semibold text-gray-900 mb-1">{service.name}</h2>
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{service.description}</p>
                <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-1 text-gray-600">
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    <span className="font-medium">{Number(service.vendor?.rating || 0).toFixed(1)}</span>
                  </div>
                  <span className="font-bold text-primary-600 text-base">
                    {packagePrice
                      ? `Rs. ${Number(packagePrice).toLocaleString()}`
                      : service.price ? `Rs. ${Number(service.price).toLocaleString()}` : 'Free quote'}
                  </span>
                </div>
                {packageName && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs bg-primary-50 text-primary-700 rounded-lg px-3 py-1.5">
                    <Package className="w-3.5 h-3.5" />
                    <span className="font-medium">{packageName} package selected</span>
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {service.vendor?.business_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-800">{service.vendor?.business_name}</p>
                    <p className="text-xs text-gray-400">Service Provider</p>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* ── Booking form ── */}
          <div className="md:col-span-3">
            <div className="card p-5 sm:p-6">

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
                  <span>⚠️</span> <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Calendar className="w-4 h-4 inline mr-1 text-primary-500" />
                    Preferred Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={today}
                    className="input-field"
                    value={date}
                    onChange={e => { setDate(e.target.value); setSelectedSlot(''); }}
                  />
                </div>

                {/* Time slots */}
                {date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Clock className="w-4 h-4 inline mr-1 text-primary-500" />
                      Available Time Slots
                    </label>
                    {dateUnavailable ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                        The vendor is not available on this day. Please pick another date.
                      </div>
                    ) : timeSlots.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2">
                        {timeSlots.map(slot => (
                          <button key={slot} type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={`py-2 px-1 rounded-lg border text-sm font-medium transition-colors ${selectedSlot === slot ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-700 hover:border-primary-400 hover:text-primary-600'}`}>
                            {slot}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No specific schedule set — vendor accepts any time.</p>
                    )}
                  </div>
                )}

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <MapPin className="w-4 h-4 inline mr-1 text-primary-500" />
                    Service address
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. 45 Baneshwor, Kathmandu"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">Where should the vendor come? <a href="/customer/profile" className="text-primary-600 hover:underline">Save default address</a></p>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <MessageSquare className="w-4 h-4 inline mr-1 text-primary-500" />
                    Message for Provider <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    className="input-field resize-none"
                    placeholder="Describe what you need help with, any special requirements..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                  />
                </div>

                {/* Coupon code */}
                {service?.price && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Promo Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="input-field flex-1 uppercase"
                        placeholder="Enter coupon code"
                        value={couponCode}
                        onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponData(null); setCouponError(''); }}
                      />
                      <button type="button" onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()}
                        className="btn-outline px-4 text-sm whitespace-nowrap">
                        {couponLoading ? '...' : 'Apply'}
                      </button>
                    </div>
                    {couponError && <p className="text-xs text-red-500 mt-1">{couponError}</p>}
                    {couponData && (
                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                        <p className="text-green-700 font-medium">✓ Coupon applied — saving Rs. {couponData.discount.toLocaleString()}</p>
                        <p className="text-green-600 text-xs mt-0.5">
                          Original: Rs. {Number(service.price).toLocaleString()} → <strong>Rs. {couponData.final.toLocaleString()}</strong>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Submit */}
                <div className="pt-4 border-t border-gray-100">
                  <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Submitting...
                      </span>
                    ) : 'Submit Booking Request'}
                  </button>
                  <p className="text-xs text-gray-400 text-center mt-3">
                    You won't be charged until the provider confirms your booking.
                  </p>
                </div>

              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default BookService;
