import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, CheckCircle, CalendarDays, ArrowRight } from 'lucide-react';
import { API_BASE } from '../utils/config';

const Checkout: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => { fetchBooking(); }, [id]);

  const fetchBooking = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) setBooking(await res.json());
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const res = await fetch(`${API_BASE}/api/payments/mock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ booking_id: id, payment_method: 'Stripe Mock', card_last_four: cardData.number.slice(-4) || '4242' })
      });
      if (res.ok) { setPaymentSuccess(true); }
    } catch (error) { console.error(error); } finally { setProcessing(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="spinner"></div></div>;
  if (!booking) return <div className="min-h-screen flex items-center justify-center text-gray-500">Booking not found</div>;

  if (paymentSuccess) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center animate-fade-in">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-9 h-9 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
        <p className="text-gray-500 mb-6 text-sm">Your booking for <span className="font-medium text-gray-800">{booking.service.name}</span> has been confirmed.</p>
        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Service</span>
            <span className="font-medium text-gray-900">{booking.service.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Vendor</span>
            <span className="font-medium text-gray-900">{booking.vendor?.business_name}</span>
          </div>
          {booking.price && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount paid</span>
              <span className="font-semibold text-primary-600">Rs. {Number(booking.price).toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Booking ref</span>
            <span className="font-mono text-xs text-gray-700">#TM-{String(booking.id).padStart(5, '0')}</span>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Link to="/dashboard" className="btn-primary flex items-center justify-center gap-2">
            <CalendarDays className="w-4 h-4" /> View my bookings
          </Link>
          <Link to="/services" className="btn-ghost flex items-center justify-center gap-2 text-sm">
            Browse more services <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen py-8">
      <div className="container-custom max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Checkout</h1>
        <p className="text-sm text-gray-500 mb-8">Complete payment for {booking.service.name}</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="space-y-5">
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Order summary</h3>
              <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-100">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-lg font-semibold text-gray-400">
                  {booking.service.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{booking.service.name}</h4>
                  <p className="text-xs text-gray-500">{booking.service.category.name}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600"><span>Service fee</span><span>Rs. {booking.price}</span></div>
                <div className="flex justify-between text-gray-600"><span>Platform fee</span><span>$2.00</span></div>
                <div className="flex justify-between pt-3 border-t border-gray-100 font-semibold text-gray-900">
                  <span>Total</span>
                  <span className="text-lg">Rs. {(parseFloat(booking.price) + 2).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-100">
              <Shield className="w-5 h-5 text-green-600 mt-0.5" />
              <p className="text-sm text-green-700">Your payment is protected by ToleMate Escrow. Funds are released only after service completion.</p>
            </div>
          </div>

          {/* Payment Form */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-5">Payment details</h3>
            <form onSubmit={handlePayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Cardholder name</label>
                <input type="text" className="input-field" placeholder="John Doe" value={cardData.name}
                  onChange={e => setCardData({...cardData, name: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Card number</label>
                <input type="text" className="input-field" placeholder="4242 4242 4242 4242" maxLength={19}
                  value={cardData.number} onChange={e => setCardData({...cardData, number: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Expiry</label>
                  <input type="text" className="input-field" placeholder="MM/YY" maxLength={5}
                    value={cardData.expiry} onChange={e => setCardData({...cardData, expiry: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">CVC</label>
                  <input type="password" className="input-field" placeholder="•••" maxLength={3}
                    value={cardData.cvc} onChange={e => setCardData({...cardData, cvc: e.target.value})} required />
                </div>
              </div>
              <button type="submit" disabled={processing} className="btn-primary w-full py-3 mt-2">
                {processing ? 'Processing...' : `Pay Rs. ${(parseFloat(booking.price) + 2).toFixed(2)}`}
              </button>
              <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" /> 256-bit SSL encrypted
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
