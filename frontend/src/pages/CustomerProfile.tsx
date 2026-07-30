import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, MapPin, CalendarDays, Star, DollarSign } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import SeoHead from '../components/SeoHead';

const CustomerProfile: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [stats, setStats] = useState({ total: 0, completed: 0, spent: 0, avgRating: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, bookingRes] = await Promise.all([
          api.get('/user'),
          api.get('/bookings'),
        ]);
        const u = userRes.data;
        setUser(u);
        setForm({ name: u.name || '', email: u.email || '', phone: u.phone || '', address: u.address || '' });
        const d = bookingRes.data;
        const bookings = d.data || d;
        const completed = bookings.filter((b: any) => b.status === 'completed');
        const spent = completed.reduce((s: number, b: any) => s + (b.price || 0), 0);
        const reviews = bookings.filter((b: any) => b.review);
        const avgRating = reviews.length
          ? reviews.reduce((s: number, b: any) => s + (b.review?.rating || 0), 0) / reviews.length
          : 0;
        setStats({ total: bookings.length, completed: completed.length, spent, avgRating: Math.round(avgRating * 10) / 10 });
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/user/profile', form);
      toast('Profile updated!');
    } catch (err: any) {
      toast(err.response?.data?.message || 'Error updating profile', 'error');
    }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="min-h-screen py-8 animate-pulse">
      <div className="container-custom max-w-2xl space-y-4">
        {[1,2,3].map(i => <div key={i} className="card p-6 h-32 bg-gray-100 rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <>
      <SeoHead
        title="My Profile"
        description="Manage your ToleMate customer profile and preferences."
        noIndex={true}
      />
    <div className="min-h-screen py-8 bg-gray-50">
      <div className="container-custom max-w-2xl">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            <p className="text-sm text-gray-500">Manage your account details</p>
          </div>
          <button onClick={() => navigate(-1)} className="btn-secondary text-sm flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total bookings', value: stats.total, icon: CalendarDays, color: 'text-blue-600 bg-blue-50' },
            { label: 'Completed',      value: stats.completed, icon: CalendarDays, color: 'text-green-600 bg-green-50' },
            { label: 'Total spent',    value: `Rs. ${Number(stats.spent).toLocaleString()}`, icon: DollarSign, color: 'text-purple-600 bg-purple-50' },
            { label: 'Avg rating given', value: stats.avgRating || '—', icon: Star, color: 'text-yellow-600 bg-yellow-50' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-4 text-center">
              <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mx-auto mb-2`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-lg font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Edit form */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-600">{(user?.name || 'U').charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role} account</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5"><User className="w-4 h-4 text-gray-400" /> Full name</label>
              <input type="text" className="input-field" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5"><Mail className="w-4 h-4 text-gray-400" /> Email</label>
              <input type="email" className="input-field" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5"><Phone className="w-4 h-4 text-gray-400" /> Phone</label>
              <input type="tel" className="input-field" placeholder="+977 9800000000" value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gray-400" /> Saved address</label>
              <input type="text" className="input-field" placeholder="e.g. 45 Baneshwor, Kathmandu" value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })} />
              <p className="text-xs text-gray-400 mt-1">Used to prefill your address when booking services</p>
            </div>

            <div className="pt-3 border-t border-gray-100 flex gap-3">
              <Link to="/dashboard" className="btn-secondary flex-1 text-center">Cancel</Link>
              <button type="submit" disabled={saving} className="btn-primary flex-[2]">
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Quick links */}
        <div className="card p-5 mt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick links</h3>
          <div className="flex flex-wrap gap-2">
            <Link to="/dashboard" className="btn-secondary text-sm flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> My bookings</Link>
            <Link to="/services" className="btn-secondary text-sm flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Browse services</Link>
          </div>
        </div>

      </div>
    </div>
    </>
  );
};

export default CustomerProfile;
