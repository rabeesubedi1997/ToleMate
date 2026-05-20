import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, CheckCircle, CalendarDays, ArrowRight, Banknote, CreditCard, Smartphone } from 'lucide-react';
import { API_BASE } from '../utils/config';

type PayMethod = 'cod' | 'esewa' | 'khalti' | 'card';

const PAY_METHODS: { id: PayMethod; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  { id: 'cod',    label: 'Cash on Delivery', desc: 'Pay the vendor in cash when they arrive',      icon: <Banknote className="w-5 h-5" />,   color: 'border-yellow-400 bg-yellow-50 text-yellow-800' },
  { id: 'esewa',  label: 'eSewa',            desc: 'Pay with your eSewa digital wallet',            icon: <span className="font-bold text-green-700 text-sm">e</span>, color: 'border-green-400 bg-green-50 text-green-800' },
  { id: 'khalti', label: 'Khalti',           desc: 'Pay with your Khalti wallet',                  icon: <Smartphone className="w-5 h-5" />, color: 'border-purple-400 bg-purple-50 text-purple-800' },
  { id: 'card',   label: 'Card',             desc: 'Visa / Mastercard — secure online payment',    icon: <CreditCard className="w-5 h-5" />, color: 'border-blue-400 bg-blue-50 text-blue-800' },
];

const Checkout: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [method, setMethod] = useState<PayMethod>('cod');
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [walletId, setWalletId] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isCod, setIsCod] = useState(false);

  useEffect(() => { fetchBooking(); }, [id]);

  const fetchBooking = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) setBooking(await res.json());
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const body: any = { booking_id: id, payment_method: method };
      if (method === 'card') {
        body.card_last_four = cardData.number.replace(/\s/g, '').slice(-4) || '4242';
      }
      const res = await fetch(`${API_BASE}/api/payments/mock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        if (method === 'cod') { setIsCod(true); }
        setPaymentSuccess(true);
      }
    } catch (error) { console.error(error); } finally { setProcessing(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="spinner"></div></div>;
  if (!booking) return <div className="min-h-screen flex items-center justify-center text-gray-500">Booking not found</div>;

  if (paymentSuccess) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center animate-fade-in">
        <div className={`w-16 h-16 ${isCod ? 'bg-yellow-100' : 'bg-green-100'} rounded-full flex items-center justify-center mx-auto mb-5`}>
          {isCod
            ? <Banknote className="w-9 h-9 text-yellow-500" />
            : <CheckCircle className="w-9 h-9 text-green-500" />}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isCod ? 'COD Confirmed!' : 'Payment Successful!'}
        </h2>
        <p className="text-gray-500 mb-6 text-sm">
          {isCod
            ? <>Please have <span className="font-semibold text-gray-800">Rs. {Number(booking.price).toLocaleString()}</span> ready to pay the vendor in cash.</>
            : <>Your booking for <span className="font-medium text-gray-800">{booking.service.name}</span> has been confirmed.</>}
        </p>
        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2">
          <div className="flex justify-between text-sm"><span className="text-gray-500">Service</span><span className="font-medium text-gray-900">{booking.service.name}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-500">Vendor</span><span className="font-medium text-gray-900">{booking.vendor?.business_name}</span></div>
          {booking.price && (
            <div className="flex justify-between text-sm"><span className="text-gray-500">{isCod ? 'Cash to pay' : 'Amount paid'}</span><span className="font-semibold text-primary-600">Rs. {Number(booking.price).toLocaleString()}</span></div>
          )}
          <div className="flex justify-between text-sm"><span className="text-gray-500">Method</span><span className="font-medium text-gray-900 capitalize">{method === 'cod' ? 'Cash on Delivery' : method}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-500">Booking ref</span><span className="font-mono text-xs text-gray-700">#TM-{String(booking.id).padStart(5, '0')}</span></div>
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

  const selectedCfg = PAY_METHODS.find(m => m.id === method)!;

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
                <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center text-lg font-semibold text-primary-500">
                  {booking.service.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{booking.service.name}</h4>
                  <p className="text-xs text-gray-500">{booking.service.category?.name}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600"><span>Service fee</span><span>Rs. {Number(booking.price).toLocaleString()}</span></div>
                <div className="flex justify-between pt-3 border-t border-gray-100 font-semibold text-gray-900">
                  <span>Total</span>
                  <span className="text-lg">Rs. {Number(booking.price).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-100">
              <Shield className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-700">Your booking is protected by ToleMate. Funds are only released after service completion.</p>
            </div>
          </div>

          {/* Payment panel */}
          <form onSubmit={handlePay} className="space-y-4">
            {/* Method selector */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Choose payment method</h3>
              <div className="grid grid-cols-2 gap-2.5">
                {PAY_METHODS.map(pm => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setMethod(pm.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                      method === pm.id ? pm.color + ' ring-2 ring-offset-1 ring-current' : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm">{pm.icon}</span>
                    <span className="text-xs font-semibold leading-tight">{pm.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">{selectedCfg.desc}</p>
            </div>

            {/* Card form — only for card method */}
            {method === 'card' && (
              <div className="card p-5 space-y-4">
                <h3 className="font-semibold text-gray-900 text-sm">Card details</h3>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cardholder name</label>
                  <input type="text" className="input-field" placeholder="John Doe" value={cardData.name}
                    onChange={e => setCardData({...cardData, name: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Card number</label>
                  <input type="text" className="input-field" placeholder="4242 4242 4242 4242" maxLength={19}
                    value={cardData.number} onChange={e => setCardData({...cardData, number: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Expiry (MM/YY)</label>
                    <input type="text" className="input-field" placeholder="12/27" maxLength={5}
                      value={cardData.expiry} onChange={e => setCardData({...cardData, expiry: e.target.value})} required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">CVC</label>
                    <input type="password" className="input-field" placeholder="•••" maxLength={3}
                      value={cardData.cvc} onChange={e => setCardData({...cardData, cvc: e.target.value})} required />
                  </div>
                </div>
              </div>
            )}

            {/* eSewa / Khalti mock form */}
            {(method === 'esewa' || method === 'khalti') && (
              <div className="card p-5 space-y-3">
                <h3 className="font-semibold text-gray-900 text-sm capitalize">{method} account</h3>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Registered mobile / ID</label>
                  <input type="text" className="input-field" placeholder="98XXXXXXXX"
                    value={walletId} onChange={e => setWalletId(e.target.value)} required />
                </div>
                <p className="text-xs text-gray-400">A mock confirmation will be sent — no real transaction occurs.</p>
              </div>
            )}

            {/* COD info */}
            {method === 'cod' && (
              <div className="card p-5 bg-yellow-50 border-yellow-200">
                <div className="flex items-start gap-3">
                  <Banknote className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-800">Pay cash when vendor arrives</p>
                    <p className="text-xs text-yellow-700 mt-1">Have <strong>Rs. {Number(booking.price).toLocaleString()}</strong> ready. The vendor will mark payment received after collecting cash.</p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={processing}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              {processing ? (
                <><span className="spinner-sm" /> Processing…</>
              ) : method === 'cod' ? (
                <><Banknote className="w-4 h-4" /> Confirm COD — Rs. {Number(booking.price).toLocaleString()}</>
              ) : (
                <><Lock className="w-3.5 h-3.5" /> Pay Rs. {Number(booking.price).toLocaleString()} via {selectedCfg.label}</>
              )}
            </button>
            <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" /> Secured by ToleMate
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
