import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, ImagePlus, X, ArrowLeft, Lightbulb, Plus, Trash2, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { API_BASE } from '../utils/config';
import SeoHead from '../components/SeoHead';


const ServiceEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [mediaLibrary, setMediaLibrary] = useState<any[]>([]);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [formData, setFormData] = useState<any>({
    name: '', description: '', price: '', pricing_type: 'fixed',
    category_id: '', is_active: true, images: [], vendor_id: '', cancellation_policy: '',
    sale_price: '', sale_ends_at: '',
  });

  // Packages state
  const [packages, setPackages] = useState<any[]>([]);
  const [pkgForm, setPkgForm] = useState({ name: '', description: '', price: '', delivery_days: '', features: '' });
  const [editingPkg, setEditingPkg] = useState<number | null>(null);
  const [savingPkg, setSavingPkg] = useState(false);



  useEffect(() => {
    fetchCategories();
    fetchMedia();
    if (user?.role === 'admin') {
      fetchVendors();
    } else if (user?.role === 'vendor') {
      // Auto-fetch the logged-in vendor's profile to get their vendor record id
      fetchMyVendorProfile();
    }
    if (id) fetchService(); else setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.role]);
  const fetchPackages = async () => {
    if (!id) return;
    try {
      const { data } = await api.get(`/services/${id}`);
      setPackages((data.service || data).packages || []);
    } catch {}
  };

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(data);
    } catch {}
  };

  const fetchMedia = async () => {
    try {
      const { data } = await api.get('/admin/media');
      setMediaLibrary(data.data || data);
    } catch {}
  };

  const fetchVendors = async () => {
    try {
      const { data } = await api.get('/admin/vendors');
      setVendors(data.data || data);
    } catch {}
  };

  const fetchMyVendorProfile = async () => {
    try {
      const { data } = await api.get('/vendor/profile');
      setFormData((prev: any) => ({ ...prev, vendor_id: data.id?.toString() ?? '' }));
    } catch {}
  };

  const fetchService = async () => {
    try {
      const { data: s } = await api.get(`/services/${id}`);
      setFormData({
        name: s.name,
        description: s.description,
        price: s.price?.toString() || '',
        pricing_type: s.pricing_type,
        category_id: s.category_id.toString(),
        is_active: s.is_active,
        images: s.images ? s.images.map((img: any) => img.image_url) : [],
        vendor_id: s.vendor_id?.toString() ?? '',
        cancellation_policy: s.cancellation_policy || '',
        sale_price: s.sale_price?.toString() || '',
        sale_ends_at: s.sale_ends_at ? s.sale_ends_at.slice(0, 16) : '',
      });
    } catch {}
    setLoading(false);
  };

  useEffect(() => { if (id) fetchPackages(); }, [id]);  // eslint-disable-line

  const handleSavePackage = async () => {
    if (!id || !pkgForm.name || !pkgForm.price) return;
    setSavingPkg(true);
    const payload = {
      name: pkgForm.name,
      description: pkgForm.description || null,
      price: parseFloat(pkgForm.price),
      delivery_days: pkgForm.delivery_days ? parseInt(pkgForm.delivery_days) : null,
      features: pkgForm.features ? pkgForm.features.split('\n').map(f => f.trim()).filter(Boolean) : [],
      sort_order: editingPkg === null ? packages.length : packages.findIndex(p => p.id === editingPkg),
    };
    const url = editingPkg === null
      ? `/services/${id}/packages`
      : `/services/${id}/packages/${editingPkg}`;
    const method = editingPkg === null ? 'POST' : 'PUT';
    try {
      if (editingPkg === null) {
        await api.post(url, payload);
      } else {
        await api.put(url, payload);
      }
      setPkgForm({ name: '', description: '', price: '', delivery_days: '', features: '' }); setEditingPkg(null); fetchPackages();
    } catch {} finally { setSavingPkg(false); }
  };

  const handleDeletePackage = async (pkgId: number) => {
    if (!id) return;
    try {
      await api.delete(`/services/${id}/packages/${pkgId}`);
      fetchPackages();
    } catch {}
  };

  const startEditPkg = (pkg: any) => {
    setEditingPkg(pkg.id);
    setPkgForm({
      name: pkg.name,
      description: pkg.description || '',
      price: String(pkg.price),
      delivery_days: pkg.delivery_days ? String(pkg.delivery_days) : '',
      features: pkg.features ? pkg.features.join('\n') : '',
    });
  };

  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const uploadData = new FormData(); uploadData.append('file', file);
    try {
      const { data } = await api.post('/admin/media', uploadData);
      setFormData((prev: any) => ({ ...prev, images: [...prev.images, data.media.file_path] })); fetchMedia();
    } catch (err) { console.error(err); }
  };

  const removeImage = (url: string) => { setFormData((prev: any) => ({ ...prev, images: prev.images.filter((img: string) => img !== url) })); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (id) {
        await api.put(`/services/${id}`, formData);
      } else {
        await api.post('/services', formData);
      }
      navigate(-1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Connection error');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="spinner"></div></div>;

  return (
    <>
      <SeoHead
        title={id ? 'Edit Service' : 'Create Service'}
        description={id ? 'Edit your service listing on ToleMate.' : 'Create a new service listing on ToleMate.'}
        noIndex={true}
      />
    <div className="min-h-screen py-8">
      <div className="container-custom max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{id ? 'Edit service' : 'Create new service'}</h1>
            <p className="text-sm text-gray-500">Define your service details and add images</p>
          </div>
          <button onClick={() => navigate(-1)} className="btn-secondary text-sm"><ArrowLeft className="w-4 h-4" /> Back</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6 md:p-8">
              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Service title</label>
                  <input type="text" required className="input-field" placeholder="e.g. Professional Sofa Deep Cleaning" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>

                {/* Vendor selector — admin only */}
                {user?.role === 'admin' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Vendor <span className="text-red-500">*</span></label>
                    <select required className="input-field" value={formData.vendor_id} onChange={e => setFormData({...formData, vendor_id: e.target.value})}>
                      <option value="">Select a vendor</option>
                      {vendors.map((v: any) => (
                        <option key={v.id} value={v.id}>{v.business_name} — {v.user?.name ?? ''}</option>
                      ))}
                    </select>
                    {vendors.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">No vendors found. Please add a vendor profile first.</p>
                    )}
                  </div>
                )}

                {/* Vendor name display — vendor user */}
                {user?.role === 'vendor' && (
                  <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-800">
                    This service will be listed under your vendor profile.
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                    <select required className="input-field" value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})}>
                      <option value="">Select category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Pricing model</label>
                    <select className="input-field" value={formData.pricing_type} onChange={e => setFormData({...formData, pricing_type: e.target.value})}>
                      <option value="fixed">Fixed price</option><option value="hourly">Hourly rate</option><option value="quote">Quote</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Price (Rs.)</label>
                    <input type="number" className="input-field" placeholder="0.00" disabled={formData.pricing_type === 'quote'} value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                  </div>
                  <div className="flex items-center gap-3 pb-1">
                    <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${formData.is_active ? 'bg-primary-600' : 'bg-gray-200'}`} onClick={() => setFormData({...formData, is_active: !formData.is_active})}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                    <span className="text-sm text-gray-700">Active & visible</span>
                  </div>
                </div>                {/* Flash sale fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Sale Price (Rs.) <span className="text-gray-400 font-normal text-xs">optional</span></label>
                    <input type="number" className="input-field" placeholder="Discounted price" value={formData.sale_price} onChange={e => setFormData({...formData, sale_price: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Sale Ends At <span className="text-gray-400 font-normal text-xs">optional</span></label>
                    <input type="datetime-local" className="input-field" value={formData.sale_ends_at} onChange={e => setFormData({...formData, sale_ends_at: e.target.value})} />
                  </div>
                </div>                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                  <textarea required rows={6} className="input-field resize-none" placeholder="Describe your service..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Cancellation Policy <span className="text-gray-400 font-normal">(optional)</span></label>
                  <textarea rows={2} className="input-field resize-none" placeholder="e.g. Free cancellation up to 24 hours before the scheduled time" value={formData.cancellation_policy || ''} onChange={e => setFormData({...formData, cancellation_policy: e.target.value})} />
                </div>
                <div className="pt-4 border-t border-gray-100 flex gap-3">
                  <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : id ? 'Update service' : 'Create service'}</button>
                </div>
              </form>
            </div>

            {/* Packages card — only for existing services */}
            {id && (
              <div className="card p-6 md:p-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">Pricing packages</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Offer Basic / Standard / Premium tiers</p>
                  </div>
                  {packages.length < 3 && editingPkg === null && !pkgForm.name && (
                    <button onClick={() => setPkgForm({ name: packages.length === 0 ? 'Basic' : packages.length === 1 ? 'Standard' : 'Premium', description: '', price: '', delivery_days: '', features: '' })}
                      className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" /> Add tier
                    </button>
                  )}
                </div>

                {/* Existing packages */}
                <div className="space-y-3 mb-4">
                  {packages.map((pkg: any) => (
                    <div key={pkg.id} className="border border-gray-200 rounded-lg p-3 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{pkg.name}</span>
                          <span className="text-sm font-bold text-primary-600">Rs. {Number(pkg.price).toLocaleString()}</span>
                        </div>
                        {pkg.delivery_days && <p className="text-xs text-gray-400">{pkg.delivery_days}d delivery</p>}
                        {pkg.features && pkg.features.length > 0 && (
                          <p className="text-xs text-gray-500 truncate">{pkg.features.slice(0, 2).join(' · ')}{pkg.features.length > 2 ? ` +${pkg.features.length - 2}` : ''}</p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => startEditPkg(pkg)} className="text-xs text-primary-600 hover:underline">Edit</button>
                        <button onClick={() => handleDeletePackage(pkg.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                      </div>
                    </div>
                  ))}
                  {packages.length === 0 && !pkgForm.name && (
                    <p className="text-sm text-gray-400 text-center py-4">No packages yet. Add up to 3 tiers.</p>
                  )}
                </div>

                {/* Add / Edit package form */}
                {pkgForm.name !== '' || editingPkg !== null ? (
                  <div className="border border-primary-200 bg-primary-50 rounded-xl p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-800">{editingPkg !== null ? 'Edit' : 'New'} package</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Tier name</label>
                        <input className="input-field text-sm bg-white" value={pkgForm.name} onChange={e => setPkgForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Basic" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Price (Rs.)</label>
                        <input type="number" className="input-field text-sm bg-white" value={pkgForm.price} onChange={e => setPkgForm(p => ({ ...p, price: e.target.value }))} placeholder="0.00" min="0" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Delivery days (optional)</label>
                        <input type="number" className="input-field text-sm bg-white" value={pkgForm.delivery_days} onChange={e => setPkgForm(p => ({ ...p, delivery_days: e.target.value }))} placeholder="e.g. 3" min="1" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Short description</label>
                        <input className="input-field text-sm bg-white" value={pkgForm.description} onChange={e => setPkgForm(p => ({ ...p, description: e.target.value }))} placeholder="What's included" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Features (one per line)</label>
                      <textarea className="input-field text-sm bg-white resize-none" rows={3} value={pkgForm.features}
                        onChange={e => setPkgForm(p => ({ ...p, features: e.target.value }))}
                        placeholder={"Professional cleaning solution\nEquipment included\nSame-day service"} />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setPkgForm({ name: '', description: '', price: '', delivery_days: '', features: '' }); setEditingPkg(null); }} className="btn-secondary flex-1 text-sm">Cancel</button>
                      <button type="button" onClick={handleSavePackage} disabled={savingPkg || !pkgForm.name || !pkgForm.price} className="btn-primary flex-1 text-sm">
                        <CheckCircle className="w-4 h-4" /> {savingPkg ? 'Saving...' : 'Save package'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>{/* end lg:col-span-2 */}

          {/* Gallery sidebar */}
          <div className="space-y-5">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 text-sm">Gallery</h3>
                <span className="text-xs text-gray-400">{formData.images.length}/5</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {formData.images.map((url: string, idx: number) => (
                  <div key={idx} className="relative aspect-square group">
                    <img src={`${API_BASE}${url}`} className="w-full h-full object-cover rounded-lg border border-gray-100" alt="Service" />
                    <button onClick={() => removeImage(url)} className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                  </div>
                ))}
                {formData.images.length < 5 && (
                  <button onClick={() => setShowMediaModal(true)} className="aspect-square border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-primary-400 hover:text-primary-500 transition-colors">
                    <ImagePlus className="w-5 h-5 mb-1" /><span className="text-[10px]">Add</span>
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <button onClick={() => fileInputRef.current?.click()} className="btn-primary w-full text-sm"><Upload className="w-4 h-4" /> Upload</button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleDirectUpload} accept="image/*" />
                <button onClick={() => setShowMediaModal(true)} className="btn-secondary w-full text-sm"><ImagePlus className="w-4 h-4" /> Library</button>
              </div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100 flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-yellow-600 mt-0.5" />
              <p className="text-xs text-yellow-700 leading-relaxed">Services with 3+ quality images get 65% more bookings.</p>
            </div>
          </div>
        </div>{/* end grid */}
      </div>{/* end container-custom */}


      {showMediaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMediaModal(false)}></div>
          <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div><h3 className="font-semibold text-gray-900">Media library</h3><p className="text-xs text-gray-500">Select from uploaded images</p></div>
              <button onClick={() => setShowMediaModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {mediaLibrary.map((item: any) => (
                  <button key={item.id} onClick={() => { if (!formData.images.includes(item.file_path)) setFormData({...formData, images: [...formData.images, item.file_path]}); setShowMediaModal(false); }}
                    className="group relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-primary-500 transition-all">
                    <img src={`${API_BASE}${item.file_path}`} className="w-full h-full object-cover" alt="Library" />
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end"><button onClick={() => setShowMediaModal(false)} className="btn-primary text-sm">Done</button></div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default ServiceEdit;
