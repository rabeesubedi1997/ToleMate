import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, AtSign, Share2, Camera, Upload, Lock, Clock, Save } from 'lucide-react';
import { API_BASE, assetUrl } from '../utils/config';
import SeoHead from '../components/SeoHead';
import { useToast } from '../context/ToastContext';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKEND_DAYS = [0, 6]; // Sunday = 0, Saturday = 6

interface AvailSlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface VendorFeatures {
  bookings: boolean;
  messaging: boolean;
  services: boolean;
  availability_edit: boolean;
  social_links: boolean;
  reviews: boolean;
  [key: string]: boolean;
}

const VendorProfile: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({ business_name: '', description: '', service_area_radius: 50, website: '', instagram: '', facebook: '', avatar: '' });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [availability, setAvailability] = useState<AvailSlot[]>([]);
  const [savingAvail, setSavingAvail] = useState(false);
  const [features, setFeatures] = useState<VendorFeatures>({ bookings: true, messaging: true, services: true, availability_edit: true, social_links: true, reviews: true });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };
    try {
      const [profileRes, availRes, featRes] = await Promise.all([
        fetch(`${API_BASE}/api/vendor/profile`, { headers }),
        fetch(`${API_BASE}/api/vendor/availability`, { headers }),
        fetch(`${API_BASE}/api/vendor/features`, { headers }),
      ]);
      if (profileRes.ok) setProfile(await profileRes.json());
      if (availRes.ok) { const d = await availRes.json(); setAvailability(d.availability || []); }
      if (featRes.ok) { const d = await featRes.json(); setFeatures(prev => ({ ...prev, ...d.features })); }
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    const form = new FormData();
    form.append('avatar', file);
    try {
      const res = await fetch(`${API_BASE}/api/vendor/avatar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: form,
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(p => ({ ...p, avatar: data.avatar }));
        toast('Avatar updated!');
      } else { toast('Upload failed', 'error'); }
    } catch { toast('Upload error', 'error'); }
    finally { setAvatarUploading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/vendor/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ ...profile, service_radius_km: profile.service_area_radius })
      });
      if (res.ok) { toast('Profile updated!'); navigate('/vendor-dashboard'); }
    } catch (error) { console.error(error); }
    finally { setSaving(false); }
  };

  const handleSaveAvailability = async () => {
    setSavingAvail(true);
    try {
      const res = await fetch(`${API_BASE}/api/vendor/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ availability }),
      });
      if (res.ok) { toast('Availability saved!'); }
      else { const d = await res.json(); toast(d.message || 'Failed to save availability', 'error'); }
    } catch { toast('Error saving availability', 'error'); }
    finally { setSavingAvail(false); }
  };

  const updateSlot = (dayIndex: number, field: keyof AvailSlot, value: boolean | string) => {
    setAvailability(prev => prev.map(s => s.day_of_week === dayIndex ? { ...s, [field]: value } : s));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="spinner"></div></div>;

  return (
    <>
      <SeoHead
        title="Vendor Profile Settings"
        description="Manage your business profile, availability, and services on ToleMate."
        noIndex={true}
      />
    <div className="min-h-screen py-8">
      <div className="container-custom max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Business profile</h1>
            <p className="text-sm text-gray-500">Manage how customers see your business</p>
          </div>
          <button onClick={() => navigate('/vendor-dashboard')} className="btn-secondary text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>

        <div className="card p-6 md:p-8">
          {/* Avatar upload */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="relative">
              {profile.avatar ? (
                <img src={assetUrl(profile.avatar)} alt="Avatar" className="w-20 h-20 rounded-2xl object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-primary-100 flex items-center justify-center">
                  <span className="text-3xl font-bold text-primary-600">{profile.business_name?.charAt(0) || 'V'}</span>
                </div>
              )}
              <label htmlFor="avatar-upload" className="absolute -bottom-1.5 -right-1.5 p-1.5 bg-white rounded-full shadow border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                {avatarUploading ? <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /> : <Camera className="w-4 h-4 text-gray-600" />}
              </label>
              <input id="avatar-upload" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{profile.business_name || 'Your business'}</p>
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Upload className="w-3 h-3" /> Click the camera icon to change your avatar</p>
            </div>
          </div>
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Business name</label>
              <input type="text" className="input-field" value={profile.business_name}
                onChange={e => setProfile({...profile, business_name: e.target.value})} required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">About your business</label>
              <textarea rows={5} className="input-field resize-none" value={profile.description}
                onChange={e => setProfile({...profile, description: e.target.value})} required
                placeholder="Tell customers about your expertise and experience..." />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Service area radius</label>
              <div className="flex items-center gap-4">
                <input type="range" min="1" max="500"
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                  value={profile.service_area_radius}
                  onChange={e => setProfile({...profile, service_area_radius: parseInt(e.target.value)})} />
                <span className="text-lg font-bold text-gray-900 w-20 text-right">{profile.service_area_radius} km</span>
              </div>
              <p className="mt-2 text-xs text-gray-400">Customers within this distance will see your services prominently.</p>
            </div>

            <div className="pt-5 border-t border-gray-100">
              {features.social_links ? (
                <>
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-1.5"><Globe className="w-4 h-4" /> Social &amp; web links <span className="text-xs font-normal text-gray-400">(optional)</span></h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <input type="url" className="input-field flex-1" placeholder="https://yourwebsite.com"
                        value={profile.website} onChange={e => setProfile({...profile, website: e.target.value})} />
                    </div>
                    <div className="flex items-center gap-2">
                      <AtSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <input type="text" className="input-field flex-1" placeholder="instagram.com/yourhandle or @yourhandle"
                        value={profile.instagram} onChange={e => setProfile({...profile, instagram: e.target.value})} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <input type="text" className="input-field flex-1" placeholder="facebook.com/yourpage"
                        value={profile.facebook} onChange={e => setProfile({...profile, facebook: e.target.value})} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-50 rounded-xl p-4">
                  <Lock className="w-4 h-4 flex-shrink-0" />
                  <span>Social links are disabled for your account. Contact admin to enable.</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 flex gap-3">
              <button type="button" onClick={() => navigate('/vendor-dashboard')} className="btn-secondary flex-1">Discard</button>
              <button type="submit" disabled={saving} className="btn-primary flex-[2]">
                {saving ? 'Saving...' : 'Save profile'}
              </button>
            </div>
          </form>
        </div>

        {/* ── Availability Editor ── */}
        <div className="card p-6 md:p-8 mt-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Clock className="w-5 h-5 text-primary-600" /> Working Hours</h2>
              <p className="text-xs text-gray-400 mt-0.5">Set your daily availability. Weekends are managed by admin.</p>
            </div>
            {features.availability_edit && (
              <button onClick={handleSaveAvailability} disabled={savingAvail || availability.length === 0}
                className="btn-primary text-sm flex items-center gap-1.5 px-4 py-2">
                <Save className="w-4 h-4" />
                {savingAvail ? 'Saving...' : 'Save hours'}
              </button>
            )}
          </div>

          {!features.availability_edit ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-50 rounded-xl p-4">
              <Lock className="w-4 h-4 flex-shrink-0" />
              <span>Availability editing is disabled for your account. Contact admin to enable.</span>
            </div>
          ) : availability.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Loading availability...</p>
          ) : (
            <div className="space-y-2">
              {availability.map(slot => {
                const isWeekend = WEEKEND_DAYS.includes(slot.day_of_week);
                return (
                  <div key={slot.day_of_week}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isWeekend ? 'bg-gray-50 border-gray-100 opacity-70' : slot.is_available ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                    {/* Day toggle */}
                    <button
                      type="button"
                      disabled={isWeekend}
                      onClick={() => !isWeekend && updateSlot(slot.day_of_week, 'is_available', !slot.is_available)}
                      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${isWeekend ? 'cursor-not-allowed bg-gray-300' : slot.is_available ? 'bg-green-500' : 'bg-gray-300'}`}
                      title={isWeekend ? 'Contact admin to change weekend availability' : undefined}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${slot.is_available ? 'translate-x-5' : ''}`} />
                    </button>

                    {/* Day name */}
                    <span className={`w-24 text-sm font-medium flex-shrink-0 flex items-center gap-1.5 ${isWeekend ? 'text-gray-400' : 'text-gray-700'}`}>
                      {isWeekend && <Lock className="w-3 h-3 text-gray-400" />}
                      {DAY_NAMES[slot.day_of_week]}
                    </span>

                    {/* Time inputs */}
                    {slot.is_available ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input type="time" value={slot.start_time} disabled={isWeekend}
                          onChange={e => updateSlot(slot.day_of_week, 'start_time', e.target.value)}
                          className={`input-field py-1.5 text-sm w-32 ${isWeekend ? 'cursor-not-allowed opacity-60' : ''}`} />
                        <span className="text-gray-400 text-xs">to</span>
                        <input type="time" value={slot.end_time} disabled={isWeekend}
                          onChange={e => updateSlot(slot.day_of_week, 'end_time', e.target.value)}
                          className={`input-field py-1.5 text-sm w-32 ${isWeekend ? 'cursor-not-allowed opacity-60' : ''}`} />
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 flex-1">{isWeekend ? 'Admin controlled' : 'Closed'}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default VendorProfile;
