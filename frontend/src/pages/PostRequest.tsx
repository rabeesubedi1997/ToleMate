import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, Inbox, Handshake, Zap, Clock, Calendar, AlarmClock, CheckCircle, ArrowRight } from 'lucide-react';
import { API_BASE } from '../utils/config';

interface Category { id: number; name: string; }

const URGENCY_OPTIONS = [
  { value: 'asap', label: 'ASAP', desc: 'Need it done today', icon: Zap, color: 'border-red-300 bg-red-50 text-red-700' },
  { value: 'this_week', label: 'This week', desc: 'Within 7 days', icon: AlarmClock, color: 'border-orange-300 bg-orange-50 text-orange-700' },
  { value: 'this_month', label: 'This month', desc: 'Within 30 days', icon: Clock, color: 'border-blue-300 bg-blue-50 text-blue-700' },
  { value: 'flexible', label: 'Flexible', desc: "I'm not in a rush", icon: Calendar, color: 'border-gray-300 bg-gray-50 text-gray-700' },
] as const;

const PostRequest: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    title: '',
    text: '',
    category_id: '',
    budget: '',
    preferred_date: '',
    urgency: 'flexible' as 'asap' | 'this_week' | 'this_month' | 'flexible',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [posted, setPosted] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/categories`)
      .then(r => r.json())
      .then(setCategories)
      .catch(console.error);
  }, []);

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const body: any = {
        title: form.title,
        text: form.text,
        urgency: form.urgency,
      };
      if (form.category_id) body.category_id = parseInt(form.category_id);
      if (form.budget) body.budget = parseFloat(form.budget);
      if (form.preferred_date) body.preferred_date = form.preferred_date;

      const res = await fetch(`${API_BASE}/api/booking-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setPosted(true);
      } else {
        const data = await res.json();
        setError(data.message || Object.values(data.errors || {}).flat().join(', ') || 'Failed to post request');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = step === 1 ? form.title.length >= 5 : true;

  if (posted) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center animate-fade-in">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-9 h-9 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Posted!</h2>
        <p className="text-gray-500 mb-6 text-sm">Your request <span className="font-medium text-gray-800">"{form.title}"</span> is live. Vendors matching your criteria will send you quotes.</p>
        <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 mb-6 text-left space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-primary-700"><Handshake className="w-4 h-4 flex-shrink-0" /> Vendors can see your request now</div>
          <div className="flex items-center gap-2 text-sm text-primary-700"><Inbox className="w-4 h-4 flex-shrink-0" /> You'll be notified when quotes arrive</div>
          {form.budget && <div className="flex items-center gap-2 text-sm text-primary-700"><FileText className="w-4 h-4 flex-shrink-0" /> Budget: Rs. {Number(form.budget).toLocaleString()}</div>}
        </div>
        <div className="flex flex-col gap-3">
          <Link to="/marketplace" className="btn-primary flex items-center justify-center gap-2">View marketplace</Link>
          <Link to="/dashboard" className="btn-ghost flex items-center justify-center gap-2 text-sm">My bookings <ArrowRight className="w-3.5 h-3.5" /></Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen py-8">
      <div className="container-custom max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Post a service request</h1>
          <p className="text-sm text-gray-500">Describe what you need and professionals will send you quotes</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2].map(n => (
            <React.Fragment key={n}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= n ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{n}</div>
              {n < 2 && <div className={`flex-1 h-1 rounded transition-colors ${step > n ? 'bg-primary-600' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="card p-6 md:p-8">
          {error && <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Request title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Install ceiling fan in bedroom"
                    value={form.title}
                    onChange={e => set('title', e.target.value)}
                    required
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-400 mt-1">{form.title.length}/100 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                  <select className="input-field" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
                    <option value="">All categories</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Describe what you need <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    className="input-field resize-none"
                    rows={5}
                    placeholder="Include details like: size, materials, special requirements, location notes..."
                    value={form.text}
                    onChange={e => set('text', e.target.value)}
                    minLength={20}
                  />
                </div>

                <button type="button" onClick={() => setStep(2)} disabled={!canProceed || form.text.length < 20}
                  className="btn-primary w-full py-3">
                  Next: Budget & timing →
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">How urgent is this?</label>
                  <div className="grid grid-cols-2 gap-3">
                    {URGENCY_OPTIONS.map(({ value, label, desc, icon: Icon, color }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => set('urgency', value)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${form.urgency === value ? color + ' border-opacity-100' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-semibold">{label}</span>
                        </div>
                        <p className="text-xs opacity-75">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Max budget ($)</label>
                    <input type="number" className="input-field" placeholder="Leave blank if unsure"
                      value={form.budget} onChange={e => set('budget', e.target.value)} min="0" step="0.01" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Preferred date</label>
                    <input type="date" className="input-field" value={form.preferred_date}
                      onChange={e => set('preferred_date', e.target.value)}
                      min={new Date().toISOString().split('T')[0]} />
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-2 text-sm">
                  <p className="font-medium text-gray-700">Review your request</p>
                  <p className="text-gray-900 font-semibold">{form.title}</p>
                  {form.category_id && <p className="text-gray-500">{categories.find(c => String(c.id) === form.category_id)?.name}</p>}
                  <p className="text-gray-600 text-xs line-clamp-2">"{form.text}"</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">← Back</button>
                  <button type="submit" disabled={submitting} className="btn-primary flex-[2] py-3">
                    {submitting ? 'Posting...' : '🚀 Post to marketplace'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-8">
          {[
            { icon: FileText, title: 'Describe', desc: 'Tell us what you need' },
            { icon: Inbox, title: 'Get quotes', desc: 'Pros send their offers' },
            { icon: Handshake, title: 'Hire', desc: 'Pick the best match' },
          ].map((item, idx) => (
            <div key={idx} className="text-center p-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <item.icon className="w-5 h-5 text-gray-500" />
              </div>
              <h4 className="text-sm font-medium text-gray-900 mb-0.5">{item.title}</h4>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PostRequest;

