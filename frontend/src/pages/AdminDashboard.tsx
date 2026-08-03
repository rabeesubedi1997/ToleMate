import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { API_BASE, FALLBACK_IMAGE } from '../utils/config';
import { useToast } from '../context/ToastContext';
import {
  LayoutDashboard, Users, Briefcase, Image, Star, Settings,
  ShoppingBag, RefreshCw, Plus, Trash2, Store, ChevronRight,
  Eye, X, Layers, Calendar, Tag, MessageSquare, ArrowUp,
  ArrowDown, ToggleLeft, ToggleRight, ExternalLink, Edit2, Check, CheckCircle2,
  Ticket, Globe, Search, List, FileText, DollarSign, Shield, Activity, Clock
} from 'lucide-react';
import SeoHead from '../components/SeoHead';
import MenuManager from '../components/MenuManager';
import PageSeoManager from '../components/PageSeoManager';

type Tab = 'dashboard' | 'users' | 'vendors' | 'bookings' | 'services' |
           'categories' | 'media' | 'slider' | 'messages' | 'reviews' | 'settings' | 'coupons' | 'seo' | 'menus' | 'page-seo' |
           'commissions' | 'kyc' | 'moderation' | 'activities';

const DEFAULT_SLIDES = [
  { url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&q=80', title: 'Professional Home Repair Services', link: '/services', enabled: true },
  { url: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=1200&q=80', title: 'Trusted Cleaning Professionals', link: '/services', enabled: true },
  { url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80', title: 'Expert Tech Support at Your Door', link: '/services', enabled: true },
  { url: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1200&q=80', title: 'Perfect Events, Every Time', link: '/services', enabled: true },
];

const AdminDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [activeTab]);

  // Data state
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [directConvs, setDirectConvs] = useState<any[]>([]);

  // Coupons
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponForm, setCouponForm] = useState({ code: '', discount_type: 'flat', discount_value: '', min_order: '', max_uses: '', expires_at: '', description: '' });
  const [couponSaving, setCouponSaving] = useState(false);
  const [showCouponForm, setShowCouponForm] = useState(false);

  // Settings
  const [siteName, setSiteName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');

  const [sliderInterval, setSliderInterval] = useState('5000');
  const [savingSettings, setSavingSettings] = useState(false);

  // SEO
  const [seoHomeTitle, setSeoHomeTitle] = useState('');
  const [seoHomeDesc, setSeoHomeDesc] = useState('');
  const [seoHomeKeywords, setSeoHomeKeywords] = useState('');
  const [seoOgImage, setSeoOgImage] = useState('');
  const [seoGtmId, setSeoGtmId] = useState('');
  const [seoSiteVerification, setSeoSiteVerification] = useState('');
  const [seoSchemaOrg, setSeoSchemaOrg] = useState('');
  const [savingSeo, setSavingSeo] = useState(false);

  // Slider
  const [sliderImages, setSliderImages] = useState<any[]>([]);
  const [sliderUploading, setSliderUploading] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [savingSlider, setSavingSlider] = useState(false);

  // Media
  const [uploading, setUploading] = useState(false);

  // Vendor detail
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [vendorDetailTab, setVendorDetailTab] = useState<'services' | 'bookings' | 'chats' | 'features' | 'availability'>('services');
  const [vendorBookings, setVendorBookings] = useState<any[]>([]);
  const [vendorChats, setVendorChats] = useState<any[]>([]);
  const [vendorServices, setVendorServices] = useState<any[]>([]);
  const [vendorFeatures, setVendorFeatures] = useState<Record<string, boolean>>({});
  const [savingFeatures, setSavingFeatures] = useState(false);
  const [vendorAvailability, setVendorAvailability] = useState<any[]>([]);
  const [savingAdminAvail, setSavingAdminAvail] = useState(false);
  const [showVendorEdit, setShowVendorEdit] = useState(false);
  const [vendorEditForm, setVendorEditForm] = useState<any>({});
  const [savingVendorEdit, setSavingVendorEdit] = useState(false);

  // Vendor bulk selection
  const [selectedVendorIds, setSelectedVendorIds] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Modals
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateVendor, setShowCreateVendor] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [editCategoryItem, setEditCategoryItem] = useState<any>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'customer', phone: '' });
  const [newVendor, setNewVendor] = useState({ name: '', email: '', password: '', phone: '', business_name: '', description: '' });
  const [newCategory, setNewCategory] = useState('');
  const [bookingFilter, setBookingFilter] = useState('');
  const [formError, setFormError] = useState('');

  // Reset password modal
  const [resetTarget, setResetTarget] = useState<any>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<{ type: 'password' | 'email'; value: string } | null>(null);
  const [resetError, setResetError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Super Admin state
  const [pendingServices, setPendingServices] = useState<any[]>([]);
  const [moderationFilter, setModerationFilter] = useState('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [commissionStats, setCommissionStats] = useState<any>(null);
  const [commissionFilter, setCommissionFilter] = useState('');
  const [newRate, setNewRate] = useState('10');
  const [showRateModal, setShowRateModal] = useState(false);
  const [kycVendors, setKycVendors] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const { data } = await api.get('/admin/stats');
        setStats(data);
      } else if (activeTab === 'users') {
        const { data } = await api.get('/admin/users');
        setUsers(data.data || data);
      } else if (activeTab === 'vendors') {
        const { data } = await api.get('/admin/vendors');
        setVendors(data.data || data);
      } else if (activeTab === 'bookings') {
        const url = bookingFilter ? `/admin/bookings?status=${bookingFilter}` : '/admin/bookings';
        const { data } = await api.get(url);
        setBookings(data.data || data);
      } else if (activeTab === 'services') {
        const { data } = await api.get('/services');
        setServices(data.data || data);
      } else if (activeTab === 'categories') {
        const { data } = await api.get('/admin/categories');
        setCategories(Array.isArray(data) ? data : data.data || []);
      } else if (activeTab === 'media') {
        const { data } = await api.get('/admin/media');
        setMedia(data.data || data);
      } else if (activeTab === 'slider') {
        const [settingsRes, mediaRes] = await Promise.allSettled([
          api.get('/settings'),
          api.get('/admin/media'),
        ]);
        if (settingsRes.status === 'fulfilled') {
          const data = settingsRes.value.data;
          const raw = data?.slider_images;
          try {
            const parsed = JSON.parse(raw || '[]');
            setSliderImages(parsed.length > 0 ? parsed : []);
          } catch { setSliderImages([]); }
        }
        if (mediaRes.status === 'fulfilled') {
          const d = mediaRes.value.data;
          setMedia(d.data || d);
        }
      } else if (activeTab === 'messages') {
        const controller = new AbortController();
        const abortTimer = setTimeout(() => controller.abort(), 15000);
        const [convResult, directResult] = await Promise.allSettled([
          api.get('/admin/conversations', { signal: controller.signal }),
          api.get('/direct-conversations', { signal: controller.signal }),
        ]);
        clearTimeout(abortTimer);
        if (convResult.status === 'fulfilled') {
          const d = convResult.value.data; setConversations(d.data || d);
        }
        if (directResult.status === 'fulfilled') {
          const d = directResult.value.data; setDirectConvs(d);
        }
      } else if (activeTab === 'reviews') {
        const { data } = await api.get('/admin/reviews');
        setReviews(data.data || data);
      } else if (activeTab === 'coupons') {
        const { data } = await api.get('/admin/coupons');
        setCoupons(data);
      } else if (activeTab === 'settings') {
        const { data } = await api.get('/settings');
        const find = (k: string) => data?.[k] || '';
        setSiteName(find('site_name'));
        setContactEmail(find('contact_email'));
        setHeroTitle(find('hero_title'));
        setHeroSubtitle(find('hero_subtitle'));

        setSliderInterval(data?.slider_interval || '5000');
        setSeoHomeTitle(find('seo_home_title'));
        setSeoHomeDesc(find('seo_home_desc'));
        setSeoHomeKeywords(find('seo_home_keywords'));
        setSeoOgImage(find('seo_og_image'));
        setSeoGtmId(find('seo_gtm_id'));
        setSeoSiteVerification(find('seo_site_verification'));
        setSeoSchemaOrg(find('seo_schema_org'));
      } else if (activeTab === 'seo') {
        const { data } = await api.get('/settings');
        const find = (k: string) => data?.[k] || '';
        setSeoHomeTitle(find('seo_home_title'));
        setSeoHomeDesc(find('seo_home_desc'));
        setSeoHomeKeywords(find('seo_home_keywords'));
        setSeoOgImage(find('seo_og_image'));
        setSeoGtmId(find('seo_gtm_id'));
        setSeoSiteVerification(find('seo_site_verification'));
        setSeoSchemaOrg(find('seo_schema_org'));
      } else if (activeTab === 'moderation') {
        const { data } = await api.get(`/super-admin/services/moderation?status=${moderationFilter}`);
        setPendingServices(data.data || data);
      } else if (activeTab === 'commissions') {
        const params = commissionFilter ? `?status=${commissionFilter}` : '';
        const [r1, r2] = await Promise.allSettled([
          api.get(`/super-admin/commissions${params}`),
          api.get('/super-admin/commissions/stats'),
        ]);
        if (r1.status === 'fulfilled') { const d = r1.value.data; setCommissions(d.data || d); }
        if (r2.status === 'fulfilled') { const d = r2.value.data; setCommissionStats(d); setNewRate(String(d.default_rate ?? 10)); }
      } else if (activeTab === 'kyc') {
        const { data } = await api.get('/super-admin/kyc/pending');
        setKycVendors(data);
      } else if (activeTab === 'activities') {
        const { data } = await api.get('/super-admin/activity-logs');
        setActivities(data.data || data);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [activeTab, bookingFilter, moderationFilter, commissionFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openVendorDetail = async (vendor: any) => {
    setSelectedVendor(vendor);
    setVendorDetailTab('services');
    setVendorBookings([]); setVendorChats([]); setVendorServices([]);
    setVendorFeatures({}); setVendorAvailability([]);
    try {
      const [sRes, bRes, mRes, fRes, aRes] = await Promise.allSettled([
        api.get(`/admin/vendors/${vendor.id}/services`),
        api.get(`/admin/vendors/${vendor.id}/bookings`),
        api.get(`/admin/vendors/${vendor.id}/messages`),
        api.get(`/admin/vendors/${vendor.id}/features`),
        api.get(`/admin/vendors/${vendor.id}/availability`),
      ]);
      if (sRes.status === 'fulfilled') { const d = sRes.value.data; setVendorServices(d.data || d); } else { console.warn('vendor services fetch rejected', sRes.reason); }
      if (bRes.status === 'fulfilled') { const d = bRes.value.data; setVendorBookings(d.data || d); } else { console.warn('vendor bookings fetch rejected', bRes.reason); }
      if (mRes.status === 'fulfilled') { const d = mRes.value.data; setVendorChats(d.data || d); } else { console.warn('vendor messages fetch rejected', mRes.reason); }
      if (fRes.status === 'fulfilled') { const d = fRes.value.data; setVendorFeatures(d.features || {}); } else { console.warn('vendor features fetch rejected', fRes.reason); }
      if (aRes.status === 'fulfilled') { const d = aRes.value.data; setVendorAvailability(d.availability || []); } else { console.warn('vendor availability fetch rejected', aRes.reason); }
    } catch (e) { console.error(e); }
  };

  // ─── User actions ───
  const handleChangeRole = async (userId: number, newRole: string) => {
    if (!window.confirm(`Change role to "${newRole}"?`)) return;
    try {
      await api.put(`/admin/users/${userId}`, { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch {}
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(users.filter(u => u.id !== id));
    } catch {}
  };

  const handleAdminResetPassword = async (action: 'generate' | 'email') => {
    if (!resetTarget) return;
    setResetLoading(true);
    setResetError('');
    setResetResult(null);
    try {
      const { data } = await api.post(`/admin/users/${resetTarget.id}/reset-password`, { action });
      if (action === 'generate' && data.new_password) {
        setResetResult({ type: 'password', value: data.new_password });
      } else {
        setResetResult({ type: 'email', value: data.message });
      }
    } catch (err: any) {
      setResetError(err.response?.data?.message || 'Could not connect to the server.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError(''); setFormSuccess('');
    try {
      await api.post('/admin/users', newUser);
      setFormSuccess('User created successfully!');
      setNewUser({ name: '', email: '', password: '', role: 'customer', phone: '' });
      fetchData();
      setTimeout(() => { setShowCreateUser(false); setFormSuccess(''); }, 1500);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create user.');
    }
  };

  // ─── Vendor actions ───
  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError(''); setFormSuccess('');
    try {
      await api.post('/admin/users', { ...newVendor, role: 'vendor' });
      setFormSuccess('Vendor created successfully!');
      setNewVendor({ name: '', email: '', password: '', phone: '', business_name: '', description: '' });
      fetchData();
      setTimeout(() => { setShowCreateVendor(false); setFormSuccess(''); }, 1500);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create vendor.');
    }
  };

  const handleDeleteVendor = async (id: number) => {
    if (!window.confirm('Delete this vendor and all their services?')) return;
    try {
      await api.delete(`/super-admin/vendors/${id}`);
      setVendors(vendors.filter(v => v.id !== id)); setSelectedVendor(null);
    } catch {}
  };

  const handleVerifyVendor = async (id: number) => {
    try {
      const { data } = await api.put(`/super-admin/vendors/${id}/verify`);
      setVendors(vendors.map(v => v.id === id ? { ...v, is_verified: data.vendor.is_verified } : v));
      if (selectedVendor?.id === id) setSelectedVendor((prev: any) => ({ ...prev, is_verified: data.vendor.is_verified }));
    } catch {}
  };

  const handleFeatureVendor = async (id: number) => {
    try {
      const { data } = await api.put(`/super-admin/vendors/${id}/feature`);
      setVendors(vendors.map(v => v.id === id ? { ...v, is_featured: data.vendor.is_featured } : v));
      if (selectedVendor?.id === id) setSelectedVendor((prev: any) => ({ ...prev, is_featured: data.vendor.is_featured }));
    } catch {}
  };

  const handleBulkVendorAction = async (action: 'verify' | 'unverify' | 'feature' | 'unfeature' | 'delete') => {
    if (selectedVendorIds.size === 0) return;
    if (action === 'delete' && !window.confirm(`Delete ${selectedVendorIds.size} vendor(s)? This cannot be undone.`)) return;
    setBulkLoading(true);
    try {
      await api.post('/super-admin/vendors/bulk', { ids: Array.from(selectedVendorIds), action });
      toast(`Bulk ${action} applied to ${selectedVendorIds.size} vendor(s)`);
      setSelectedVendorIds(new Set());
      fetchData();
    } catch { toast('Error performing bulk action', 'error'); }
    finally { setBulkLoading(false); }
  };

  const handleSaveFeatures = async () => {
    if (!selectedVendor) return;
    setSavingFeatures(true);
    try {
      const resp = await api.put(`/super-admin/vendors/${selectedVendor.id}/features`, { features: vendorFeatures });
      toast('Features updated!');
      console.log('Features saved:', resp.data);
    } catch (err: any) { console.error('Save features error:', err.response?.data || err); toast('Error saving features', 'error'); }
    finally { setSavingFeatures(false); }
  };

  const updateAdminSlot = (dayIndex: number, field: string, value: boolean | string) => {
    setVendorAvailability(prev => prev.map((s: any) => s.day_of_week === dayIndex ? { ...s, [field]: value } : s));
  };

  const handleSaveVendorEdit = async () => {
    if (!selectedVendor) return;
    setSavingVendorEdit(true);
    try {
      const { data } = await api.put(`/super-admin/vendors/${selectedVendor.id}/profile`, vendorEditForm);
      setSelectedVendor(data.vendor);
      setVendors(prev => prev.map(v => v.id === selectedVendor.id ? data.vendor : v));
      setShowVendorEdit(false);
      toast('Vendor profile updated!');
    } catch (err: any) { console.error('Vendor edit error:', err.response?.data || err); toast('Error updating vendor', 'error'); }
    finally { setSavingVendorEdit(false); }
  };

  const handleSaveAdminAvailability = async () => {
    if (!selectedVendor) return;
    setSavingAdminAvail(true);
    try {
      await api.put(`/super-admin/vendors/${selectedVendor.id}/availability`, { availability: vendorAvailability });
      toast('Availability updated!');
    } catch { toast('Error saving availability', 'error'); }
    finally { setSavingAdminAvail(false); }
  };

  // ─── Booking actions ───
  const handleBookingStatus = async (id: number, status: string) => {
    try {
      await api.put(`/admin/bookings/${id}/status`, { status });
      setBookings(bookings.map(b => b.id === id ? { ...b, status } : b));
    } catch {}
  };

  // ─── Service actions ───
  const handleDeleteService = async (id: number) => {
    if (!window.confirm('Delete this service?')) return;
    try {
      await api.delete(`/services/${id}`);
      setServices(services.filter(s => s.id !== id));
    } catch {}
  };

  // ─── Category actions ───
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError(''); setFormSuccess('');
    try {
      await api.post('/admin/categories', { name: newCategory });
      setFormSuccess('Category created!');
      setNewCategory('');
      fetchData();
      setTimeout(() => { setShowCreateCategory(false); setFormSuccess(''); }, 1200);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed.');
    }
  };

  const handleUpdateCategory = async (id: number, name: string) => {
    try {
      await api.put(`/admin/categories/${id}`, { name });
      setCategories(categories.map(c => c.id === id ? { ...c, name } : c)); setEditCategoryItem(null);
    } catch {}
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await api.delete(`/admin/categories/${id}`);
      setCategories(categories.filter(c => c.id !== id));
    } catch {}
  };

  // ─── Review actions ───
  const handleDeleteReview = async (id: number) => {
    if (!window.confirm('Remove this review?')) return;
    try {
      await api.delete(`/admin/reviews/${id}`);
      setReviews(reviews.filter(rev => rev.id !== id));
    } catch {}
  };

  // ─── Media actions ───
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append('file', file);
    try {
      await api.post('/admin/media', fd);
      fetchData();
    } catch (e) { console.error(e); } finally { setUploading(false); }
  };

  const handleDeleteMedia = async (id: number) => {
    if (!window.confirm('Delete this asset?')) return;
    try {
      await api.delete(`/admin/media/${id}`);
      setMedia(media.filter(m => m.id !== id));
    } catch {}
  };

  // ─── Settings ───
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingSettings(true);
    try {
      await api.post('/admin/settings', { settings: [
        { key: 'site_name', value: siteName },
        { key: 'contact_email', value: contactEmail },
        { key: 'hero_title', value: heroTitle },
        { key: 'hero_subtitle', value: heroSubtitle },
        { key: 'slider_interval', value: sliderInterval },
      ]});
      toast('Settings saved!');
    } catch (e) { console.error(e); } finally { setSavingSettings(false); }
  };

  // ─── SEO ───
  const handleSaveSeo = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingSeo(true);
    try {
      await api.post('/admin/settings', { settings: [
        { key: 'seo_home_title', value: seoHomeTitle },
        { key: 'seo_home_desc', value: seoHomeDesc },
        { key: 'seo_home_keywords', value: seoHomeKeywords },
        { key: 'seo_og_image', value: seoOgImage },
        { key: 'seo_gtm_id', value: seoGtmId },
        { key: 'seo_site_verification', value: seoSiteVerification },
        { key: 'seo_schema_org', value: seoSchemaOrg },
      ]});
      toast('SEO settings saved!');
    } catch (e) { console.error(e); } finally { setSavingSeo(false); }
  };

  // ─── Slider ───
  const saveSliderImages = async (images: any[]) => {
    try {
      await api.post('/admin/settings', { settings: [{ key: 'slider_images', value: JSON.stringify(images) }] });
    } catch {}
  };

  const handleSliderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setSliderUploading(true);
    const fd = new FormData(); fd.append('file', file);
    try {
      const { data } = await api.post('/admin/media', fd);
      const url = `${API_BASE}${data.file_path}`;
      const updated = [...sliderImages, { url, title: '', link: '', enabled: true }];
      setSliderImages(updated);
      await saveSliderImages(updated);
      // refresh media list
      const mr = await api.get('/admin/media');
      setMedia(mr.data.data || mr.data);
    } catch (e) { console.error(e); } finally { setSliderUploading(false); }
  };

  const addSlideFromLibrary = async (mediaItem: any) => {
    const url = `${API_BASE}${mediaItem.file_path}`;
    const updated = [...sliderImages, { url, title: '', link: '', enabled: true }];
    setSliderImages(updated);
    await saveSliderImages(updated);
    setShowMediaPicker(false);
  };

  const handleLoadDefaults = async () => {
    if (!window.confirm('This will replace current slider with 4 default images. Continue?')) return;
    setSliderImages(DEFAULT_SLIDES);
    await saveSliderImages(DEFAULT_SLIDES);
  };

  const updateSlide = (idx: number, field: string, val: any) => {
    setSliderImages(sliderImages.map((s, i) => i === idx ? { ...s, [field]: val } : s));
  };

  const moveSlide = async (idx: number, dir: 'up' | 'down') => {
    const arr = [...sliderImages];
    const to = dir === 'up' ? idx - 1 : idx + 1;
    if (to < 0 || to >= arr.length) return;
    [arr[idx], arr[to]] = [arr[to], arr[idx]];
    setSliderImages(arr);
  };

  const removeSlide = (idx: number) => {
    setSliderImages(sliderImages.filter((_, i) => i !== idx));
  };

  const handleSaveSlider = async () => {
    setSavingSlider(true);
    await saveSliderImages(sliderImages);
    setSavingSlider(false);
    toast('Slider saved!');
  };

  // ─── Helpers ───
  const roleBadge = (role: string) => {
    const cls: Record<string, string> = { admin: 'bg-red-100 text-red-700', vendor: 'bg-blue-100 text-blue-700', customer: 'bg-green-100 text-green-700' };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls[role] || 'bg-gray-100 text-gray-600'}`}>{role}</span>;
  };

  const statusBadge = (s: string) => {
    const cls: Record<string, string> = { completed: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700', in_progress: 'bg-blue-100 text-blue-700', cancelled: 'bg-red-100 text-red-700', accepted: 'bg-teal-100 text-teal-700' };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls[s] || 'bg-gray-100 text-gray-600'}`}>{s?.replace('_', ' ')}</span>;
  };

  const sidebarGroups = [
    { label: 'Main', items: [
      { key: 'dashboard', label: 'Overview', icon: LayoutDashboard },
      { key: 'bookings', label: 'Bookings', icon: Calendar },
    ]},
    { label: 'People', items: [
      { key: 'users', label: 'Users', icon: Users },
      { key: 'vendors', label: 'Vendors', icon: Store },
    ]},
    { label: 'Content', items: [
      { key: 'services', label: 'Services', icon: Briefcase },
      { key: 'categories', label: 'Categories', icon: Tag },
      { key: 'reviews', label: 'Reviews', icon: Star },
      { key: 'messages', label: 'Messages', icon: MessageSquare },
      { key: 'menus', label: 'Menus', icon: List },
    ]},
    { label: 'Media', items: [
      { key: 'media', label: 'Media Library', icon: Image },
      { key: 'slider', label: 'Hero Slider', icon: Layers },
    ]},
    { label: 'Commerce', items: [
      { key: 'coupons', label: 'Coupons', icon: Ticket },
    ]},
    ...(user?.role === 'super_admin' ? [
      { label: 'Super Admin', items: [
        { key: 'moderation', label: 'Moderation', icon: Clock },
        { key: 'commissions', label: 'Commissions', icon: DollarSign },
        { key: 'kyc', label: 'KYC Review', icon: Shield },
        { key: 'activities', label: 'Activity Log', icon: Activity },
      ]},
      { label: 'System', items: [
        { key: 'seo', label: 'SEO', icon: Globe },
        { key: 'page-seo', label: 'Page SEO', icon: FileText },
        { key: 'settings', label: 'Settings', icon: Settings },
      ]}
    ] : []),
  ] as const;

  const tabLabel = (t: Tab) => {
    const map: Partial<Record<Tab, string>> = { dashboard: 'Overview', slider: 'Hero Slider', media: 'Media Library', categories: 'Categories', messages: 'Messages', moderation: 'Moderation', activities: 'Activity Log' };
    return map[t] || t.charAt(0).toUpperCase() + t.slice(1);
  };

  return (
    <>
      <SeoHead
        title="Admin Dashboard"
        description="ToleMate administration panel. Manage users, vendors, services, and platform settings."
        noIndex={true}
      />
    <div className="min-h-screen md:h-[calc(100vh-4rem)] md:overflow-hidden flex">
      {/* Mobile overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 z-40 flex flex-col transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Admin Panel</p>
          <p className="font-semibold text-gray-900 text-sm truncate">{user?.name}</p>
        </div>
        <nav className="p-2 flex-1 overflow-y-auto space-y-4">
          {sidebarGroups.map(group => (
            <div key={group.label}>
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">{group.label}</p>
              {group.items.map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => { setActiveTab(key as Tab); setIsSidebarOpen(false); setSelectedVendor(null); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === key ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <Icon className="w-4 h-4 flex-shrink-0" /> {label}
                </button>
              ))}
            </div>
          ))}
          <div>
            <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Links</p>
            <button onClick={() => navigate('/marketplace')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
              <ShoppingBag className="w-4 h-4" /> Marketplace
            </button>
            <button onClick={() => navigate('/services')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
              <ExternalLink className="w-4 h-4" /> View Site
            </button>
          </div>
        </nav>
      </aside>

      {/* Main */}
      <main ref={mainRef} data-scroll-top className="flex-1 p-4 md:p-8 overflow-y-auto min-w-0">
        <div className="max-w-6xl mx-auto animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{tabLabel(activeTab)}</h1>
              <p className="text-sm text-gray-500">Platform administration</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchData} className="btn-secondary text-sm flex items-center gap-1.5"><RefreshCw className="w-4 h-4" /> Refresh</button>
              <button className="md:hidden btn-secondary text-sm" onClick={() => setIsSidebarOpen(true)}>☰</button>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center"><div className="spinner" /></div>
          ) : (<>

            {/* ═══ OVERVIEW ═══ */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Total Users', value: stats?.total_users, color: 'bg-primary-600 text-white' },
                    { label: 'Vendors', value: stats?.total_vendors, color: '' },
                    { label: 'Active Services', value: stats?.active_services, color: '' },
                    { label: 'Total Bookings', value: stats?.total_bookings, color: '' },
                    { label: 'Completed', value: stats?.completed_bookings, color: 'text-green-600' },
                    { label: 'Pending', value: stats?.pending_bookings, color: 'text-yellow-600' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className={`card p-5 ${color?.includes('bg-') ? color : ''}`}>
                      <p className={`text-xs mb-1 ${color?.includes('bg-') ? 'opacity-80' : 'text-gray-500'}`}>{label}</p>
                      <p className={`text-2xl font-bold ${color?.includes('bg-') ? '' : color || 'text-gray-900'}`}>{value ?? '—'}</p>
                    </div>
                  ))}
                </div>

                {/* Monthly Bookings + Revenue Chart */}
                {stats?.monthly && stats.monthly.length > 0 && (() => {
                  const monthly: { month: string; bookings: number; revenue: number }[] = stats.monthly;
                  const maxBookings = Math.max(...monthly.map((m: any) => m.bookings), 1);
                  const maxRevenue = Math.max(...monthly.map((m: any) => m.revenue), 1);
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Bookings chart */}
                      <div className="card p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Bookings (last 6 months)</h3>
                        <div className="flex items-end gap-2 h-32">
                          {monthly.map((m: any) => (
                            <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group">
                              <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                {m.bookings}
                              </span>
                              <div className="w-full bg-primary-100 rounded-t transition-all duration-500 hover:bg-primary-500"
                                style={{ height: `${Math.round((m.bookings / maxBookings) * 100)}%`, minHeight: m.bookings > 0 ? '4px' : '2px' }} />
                              <span className="text-[10px] text-gray-400">{m.month}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-400 text-center mt-2">Total: {monthly.reduce((a: number, m: any) => a + m.bookings, 0)} bookings</p>
                      </div>
                      {/* Revenue chart */}
                      <div className="card p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Revenue (Rs.)</h3>
                        <div className="flex items-end gap-2 h-32">
                          {monthly.map((m: any) => (
                            <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group">
                              <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {m.revenue > 0 ? `Rs.${Number(m.revenue).toLocaleString()}` : '0'}
                              </span>
                              <div className="w-full bg-green-100 rounded-t transition-all duration-500 hover:bg-green-500"
                                style={{ height: `${Math.round((m.revenue / maxRevenue) * 100)}%`, minHeight: m.revenue > 0 ? '4px' : '2px' }} />
                              <span className="text-[10px] text-gray-400">{m.month}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-400 text-center mt-2">Total: Rs. {monthly.reduce((a: number, m: any) => a + m.revenue, 0).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {([['users','Users','Manage all platform users'],['vendors','Vendors','View vendor profiles & activity'],['bookings','Bookings','Monitor all bookings'],['settings','Settings','Configure platform']] as const).map(([tab, title, desc]) => (
                    <div key={tab} className="card p-4 cursor-pointer hover:border-primary-300 transition-colors" onClick={() => setActiveTab(tab as Tab)}>
                      <div className="flex items-center justify-between mb-1"><span className="font-medium text-gray-900 text-sm">{title}</span><ChevronRight className="w-4 h-4 text-gray-400" /></div>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                  ))}
                </div>

                {/* Recent Activity Feed */}
                {stats?.recent_activity && stats.recent_activity.length > 0 && (
                  <div className="card p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                      {stats.recent_activity.map((item: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${item.type === 'booking' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                            {item.type === 'booking' ? '📅' : '👤'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-800 truncate">{item.text}</p>
                            {item.status && <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${item.status === 'completed' ? 'bg-green-100 text-green-600' : item.status === 'cancelled' ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-500'}`}>{item.status.replace('_',' ')}</span>}
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0">{item.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ USERS ═══ */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button onClick={() => { setShowCreateUser(true); setFormError(''); setFormSuccess(''); }} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add user</button>
                </div>

                {/* Create User Modal */}
                {showCreateUser && (
                  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
                      <div className="flex items-center justify-between p-5 border-b">
                        <h3 className="font-semibold text-gray-900">Create New User</h3>
                        <button onClick={() => setShowCreateUser(false)}><X className="w-5 h-5 text-gray-400" /></button>
                      </div>
                      <form onSubmit={handleCreateUser} className="p-5 space-y-4">
                        {formError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{formError}</p>}
                        {formSuccess && <p className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">{formSuccess}</p>}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2"><label className="text-xs font-medium text-gray-600 mb-1 block">Full name</label><input required className="input-field" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} /></div>
                          <div className="col-span-2"><label className="text-xs font-medium text-gray-600 mb-1 block">Email</label><input required type="email" className="input-field" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} /></div>
                          <div><label className="text-xs font-medium text-gray-600 mb-1 block">Password</label><input required type="password" className="input-field" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} /></div>
                          <div><label className="text-xs font-medium text-gray-600 mb-1 block">Phone</label><input className="input-field" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} /></div>
                          <div className="col-span-2"><label className="text-xs font-medium text-gray-600 mb-1 block">Role</label>
                            <select className="input-field" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                              <option value="customer">Customer</option>
                              <option value="vendor">Vendor</option>
                              {user?.role === 'super_admin' && <option value="admin">Admin</option>}
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button type="button" onClick={() => setShowCreateUser(false)} className="btn-secondary flex-1">Cancel</button>
                          <button type="submit" className="btn-primary flex-1">Create user</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead><tr className="bg-gray-50 text-xs text-gray-500 font-medium"><th className="p-4">User</th><th className="p-4">Role</th><th className="p-4">Joined</th><th className="p-4 text-right">Actions</th></tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {users.map(u => (
                          <tr key={u.id} className="hover:bg-gray-50">
                            <td className="p-4"><p className="text-sm font-medium text-gray-900">{u.name}</p><p className="text-xs text-gray-400">{u.email}</p></td>
                            <td className="p-4">{roleBadge(u.role)}</td>
                            <td className="p-4 text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString()}</td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2 flex-wrap">
                                <select value={u.role} onChange={e => handleChangeRole(u.id, e.target.value)} className="text-xs border border-gray-200 rounded px-2 py-1 bg-white cursor-pointer">
                                  <option value="customer">Customer</option>
                                  <option value="vendor">Vendor</option>
                                  {user?.role === 'super_admin' && <option value="admin">Admin</option>}
                                </select>
                                <Link to={`/admin/users/${u.id}/edit`} className="text-primary-600 text-xs font-medium hover:underline">Edit</Link>
                                <button onClick={() => { setResetTarget(u); setResetResult(null); setResetError(''); }} className="text-blue-600 text-xs font-medium hover:underline">Reset pwd</button>
                                <a href={`/messages?with=${u.id}`} className="text-green-700 text-xs font-medium hover:underline">Message</a>
                                <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 text-xs font-medium hover:underline">Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {users.length === 0 && <p className="text-sm text-gray-400 p-6 text-center">No users found.</p>}
                </div>
              </div>
            )}

            {/* ═══ VENDORS LIST ═══ */}
            {activeTab === 'vendors' && !selectedVendor && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button onClick={() => { setShowCreateVendor(true); setFormError(''); setFormSuccess(''); }} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add vendor</button>
                </div>

                {/* Create Vendor Modal */}
                {showCreateVendor && (
                  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
                      <div className="flex items-center justify-between p-5 border-b">
                        <h3 className="font-semibold text-gray-900">Add New Vendor</h3>
                        <button onClick={() => setShowCreateVendor(false)}><X className="w-5 h-5 text-gray-400" /></button>
                      </div>
                      <form onSubmit={handleCreateVendor} className="p-5 space-y-4">
                        {formError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{formError}</p>}
                        {formSuccess && <p className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">{formSuccess}</p>}
                        <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">A user account with the <strong>vendor</strong> role will be created along with a vendor profile.</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2"><label className="text-xs font-medium text-gray-600 mb-1 block">Full name</label><input required className="input-field" value={newVendor.name} onChange={e => setNewVendor({...newVendor, name: e.target.value})} /></div>
                          <div className="col-span-2"><label className="text-xs font-medium text-gray-600 mb-1 block">Email</label><input required type="email" className="input-field" value={newVendor.email} onChange={e => setNewVendor({...newVendor, email: e.target.value})} /></div>
                          <div><label className="text-xs font-medium text-gray-600 mb-1 block">Password</label><input required type="password" className="input-field" value={newVendor.password} onChange={e => setNewVendor({...newVendor, password: e.target.value})} /></div>
                          <div><label className="text-xs font-medium text-gray-600 mb-1 block">Phone</label><input className="input-field" value={newVendor.phone} onChange={e => setNewVendor({...newVendor, phone: e.target.value})} /></div>
                          <div className="col-span-2"><label className="text-xs font-medium text-gray-600 mb-1 block">Business name</label><input className="input-field" placeholder="e.g. Sparkling Clean Services" value={newVendor.business_name} onChange={e => setNewVendor({...newVendor, business_name: e.target.value})} /></div>
                          <div className="col-span-2"><label className="text-xs font-medium text-gray-600 mb-1 block">Description</label><textarea rows={2} className="input-field resize-none" placeholder="What services does this vendor offer?" value={newVendor.description} onChange={e => setNewVendor({...newVendor, description: e.target.value})} /></div>
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button type="button" onClick={() => setShowCreateVendor(false)} className="btn-secondary flex-1">Cancel</button>
                          <button type="submit" className="btn-primary flex-1">Create vendor</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                <div className="card overflow-hidden">
                  {/* Bulk action bar */}
                  {selectedVendorIds.size > 0 && user?.role === 'super_admin' && (
                    <div className="flex items-center gap-3 p-3 bg-primary-50 border-b border-primary-100">
                      <span className="text-sm font-medium text-primary-700">{selectedVendorIds.size} selected</span>
                      <button onClick={() => handleBulkVendorAction('verify')} disabled={bulkLoading} className="text-xs px-2.5 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 font-medium">✓ Verify</button>
                      <button onClick={() => handleBulkVendorAction('unverify')} disabled={bulkLoading} className="text-xs px-2.5 py-1 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 font-medium">✗ Unverify</button>
                      <button onClick={() => handleBulkVendorAction('feature')} disabled={bulkLoading} className="text-xs px-2.5 py-1 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 font-medium">★ Feature</button>
                      <button onClick={() => handleBulkVendorAction('unfeature')} disabled={bulkLoading} className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium">☆ Unfeature</button>
                      <button onClick={() => handleBulkVendorAction('delete')} disabled={bulkLoading} className="text-xs px-2.5 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium ml-auto">🗑 Delete</button>
                      <button onClick={() => setSelectedVendorIds(new Set())} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead><tr className="bg-gray-50 text-xs text-gray-500 font-medium">
                        <th className="p-4 w-10">
                          <input type="checkbox" className="rounded border-gray-300"
                            checked={vendors.length > 0 && selectedVendorIds.size === vendors.length}
                            onChange={e => setSelectedVendorIds(e.target.checked ? new Set(vendors.map(v => v.id)) : new Set())}
                          />
                        </th>
                        <th className="p-4">Vendor</th><th className="p-4">Business</th><th className="p-4">Rating</th><th className="p-4">Services</th><th className="p-4">Plan</th><th className="p-4 text-right">Actions</th></tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {vendors.map(v => (
                          <tr key={v.id} className={`hover:bg-gray-50 ${selectedVendorIds.has(v.id) ? 'bg-primary-50' : ''}`}>
                            <td className="p-4">
                              <input type="checkbox" className="rounded border-gray-300"
                                checked={selectedVendorIds.has(v.id)}
                                onChange={e => setSelectedVendorIds(prev => {
                                  const next = new Set(prev);
                                  e.target.checked ? next.add(v.id) : next.delete(v.id);
                                  return next;
                                })}
                              />
                            </td>
                            <td className="p-4"><p className="text-sm font-medium text-gray-900">{v.user?.name || '—'}</p><p className="text-xs text-gray-400">{v.user?.email}</p></td>
                            <td className="p-4 text-sm text-gray-700">{v.business_name || '—'}</td>
                            <td className="p-4 text-sm text-gray-700">⭐ {Number(v.rating || 0).toFixed(1)}</td>
                            <td className="p-4 text-sm text-gray-700">{v.services_count ?? 0}</td>
                            <td className="p-4 text-sm">
                              {user?.role === 'super_admin' ? (
                                <select
                                  value={v.subscription_plan || 'free'}
                                  onChange={async e => {
                                    const plan = e.target.value;
                                    try {
                                      await api.put(`/super-admin/vendors/${v.id}/plan`, { plan });
                                      setVendors(prev => prev.map(x => x.id === v.id ? { ...x, subscription_plan: plan } : x)); toast(`Plan updated to ${plan}`, 'success');
                                    } catch {}
                                  }}
                                  className={`text-xs font-semibold rounded-full px-2 py-0.5 border-0 cursor-pointer ${v.subscription_plan === 'pro' ? 'bg-purple-100 text-purple-700' : v.subscription_plan === 'basic' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
                                >
                                  <option value="free">Free</option>
                                  <option value="basic">Basic</option>
                                  <option value="pro">Pro</option>
                                </select>
                              ) : (
                                <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${v.subscription_plan === 'pro' ? 'bg-purple-100 text-purple-700' : v.subscription_plan === 'basic' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                  {v.subscription_plan || 'free'}
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => openVendorDetail(v)} className="text-primary-600 text-xs font-medium hover:underline flex items-center gap-1"><Eye className="w-3 h-3" /> View</button>
                                {user?.role === 'super_admin' && (
                                  <>
                                    <button onClick={() => handleVerifyVendor(v.id)} className={`text-xs font-medium hover:underline ${v.is_verified ? 'text-yellow-600' : 'text-green-600'}`}>{v.is_verified ? 'Unverify' : 'Verify'}</button>
                                    <button onClick={() => handleFeatureVendor(v.id)} className={`text-xs font-medium hover:underline ${v.is_featured ? 'text-orange-500' : 'text-gray-400'}`}>{v.is_featured ? '★ Unfeature' : '☆ Feature'}</button>
                                    <button onClick={() => handleDeleteVendor(v.id)} className="text-red-600 text-xs font-medium hover:underline">Delete</button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {vendors.length === 0 && <p className="text-sm text-gray-400 p-6 text-center">No vendors found.</p>}
                </div>
              </div>
            )}

            {/* ═══ VENDOR DETAIL ═══ */}
            {activeTab === 'vendors' && selectedVendor && (
              <div>
                <button onClick={() => setSelectedVendor(null)} className="text-sm text-primary-600 hover:underline mb-4 flex items-center gap-1">← Back to vendors</button>

                <div className="card p-5 mb-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center text-xl font-bold">
                        {(selectedVendor.business_name || selectedVendor.user?.name || 'V').charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-gray-900">{selectedVendor.business_name || selectedVendor.user?.name}</h2>
                          {selectedVendor.is_verified && <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">✓ Verified</span>}
                        </div>
                        <p className="text-sm text-gray-500">{selectedVendor.user?.email}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                          <span>⭐ {Number(selectedVendor.rating || 0).toFixed(1)}</span>
                          <span>📍 {selectedVendor.service_area_radius || '—'} km</span>
                          <span className="text-xs text-gray-400">ID: #{selectedVendor.id}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {user?.role === 'super_admin' && (
                        <>
                          <button onClick={() => handleVerifyVendor(selectedVendor.id)} className={`btn-secondary text-sm flex items-center gap-1.5 ${selectedVendor.is_verified ? 'text-yellow-600 border-yellow-200 hover:bg-yellow-50' : 'text-green-600 border-green-200 hover:bg-green-50'}`}>
                            {selectedVendor.is_verified ? '✗ Unverify' : '✓ Verify'}
                          </button>
                          <button onClick={() => handleFeatureVendor(selectedVendor.id)} className={`btn-secondary text-sm flex items-center gap-1.5 ${selectedVendor.is_featured ? 'text-orange-500 border-orange-200 hover:bg-orange-50' : 'text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                            {selectedVendor.is_featured ? '★ Unfeature' : '☆ Feature'}
                          </button>
                        </>
                      )}
                      <button onClick={() => { setVendorEditForm({ business_name: selectedVendor.business_name, description: selectedVendor.description, website: selectedVendor.website, instagram: selectedVendor.instagram, facebook: selectedVendor.facebook, whatsapp_number: selectedVendor.whatsapp_number }); setShowVendorEdit(!showVendorEdit); }} className={`btn-secondary text-sm flex items-center gap-1.5 ${showVendorEdit ? 'bg-primary-50 border-primary-200 text-primary-700' : ''}`}><Edit2 className="w-4 h-4" /> Edit</button>
                      <Link to={`/vendors/${selectedVendor.id}`} target="_blank" className="btn-secondary text-sm flex items-center gap-1.5"><ExternalLink className="w-4 h-4" /> View profile</Link>
                      <button onClick={() => handleDeleteVendor(selectedVendor.id)} className="btn-secondary text-sm text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1.5"><Trash2 className="w-4 h-4" /> Delete</button>
                    </div>
                  </div>
                  {selectedVendor.description && <p className="mt-3 text-sm text-gray-500 border-t border-gray-100 pt-3">{selectedVendor.description}</p>}

                  {showVendorEdit && (
                    <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
                      <h4 className="text-sm font-semibold text-gray-800">Edit Vendor Info</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Business Name</label>
                          <input value={vendorEditForm.business_name || ''} onChange={e => setVendorEditForm((prev: any) => ({...prev, business_name: e.target.value}))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">WhatsApp Number</label>
                          <input value={vendorEditForm.whatsapp_number || ''} onChange={e => setVendorEditForm((prev: any) => ({...prev, whatsapp_number: e.target.value}))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" placeholder="e.g. 97798XXXXXXXX" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs text-gray-500 mb-1 block">Description</label>
                          <textarea value={vendorEditForm.description || ''} onChange={e => setVendorEditForm((prev: any) => ({...prev, description: e.target.value}))} rows={2}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Website</label>
                          <input value={vendorEditForm.website || ''} onChange={e => setVendorEditForm((prev: any) => ({...prev, website: e.target.value}))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Instagram</label>
                          <input value={vendorEditForm.instagram || ''} onChange={e => setVendorEditForm((prev: any) => ({...prev, instagram: e.target.value}))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Facebook</label>
                          <input value={vendorEditForm.facebook || ''} onChange={e => setVendorEditForm((prev: any) => ({...prev, facebook: e.target.value}))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button onClick={handleSaveVendorEdit} disabled={savingVendorEdit}
                          className="btn-primary text-sm px-4 py-2">{savingVendorEdit ? 'Saving...' : 'Save'}</button>
                        <button onClick={() => setShowVendorEdit(false)} className="btn-secondary text-sm px-4 py-2">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Vendor sub-tabs */}
                <div className="flex gap-2 mb-4 flex-wrap">
                  {(['services', 'bookings', 'chats', 'features', 'availability'] as const).map(t => (
                    <button key={t} onClick={() => setVendorDetailTab(t)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${vendorDetailTab === t ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      {t === 'services' ? `Services (${vendorServices.length})` : t === 'bookings' ? `Bookings (${vendorBookings.length})` : t === 'chats' ? `Chats (${vendorChats.length})` : t === 'features' ? 'Features' : 'Availability'}
                    </button>
                  ))}
                </div>

                {vendorDetailTab === 'services' && (
                  <div className="card overflow-hidden">
                    <table className="w-full text-left">
                      <thead><tr className="bg-gray-50 text-xs text-gray-500 font-medium"><th className="p-4">Service</th><th className="p-4">Category</th><th className="p-4">Price</th><th className="p-4">Status</th><th className="p-4 text-right">Action</th></tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {vendorServices.map(s => (
                          <tr key={s.id} className="hover:bg-gray-50">
                            <td className="p-4 text-sm font-medium text-gray-900">{s.name}</td>
                            <td className="p-4 text-xs text-gray-500">{s.category?.name || '—'}</td>
                            <td className="p-4 text-sm font-semibold">Rs. {s.price}</td>
                            <td className="p-4">{s.is_active ? <span className="text-xs text-green-600 font-medium">Active</span> : <span className="text-xs text-gray-400">Inactive</span>}</td>
                            <td className="p-4 text-right"><Link to={`/services/${s.id}`} target="_blank" className="text-primary-600 text-xs hover:underline">View</Link></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {vendorServices.length === 0 && <p className="text-sm text-gray-400 p-6 text-center">No services yet.</p>}
                  </div>
                )}

                {vendorDetailTab === 'bookings' && (
                  <div className="card overflow-hidden">
                    <table className="w-full text-left">
                      <thead><tr className="bg-gray-50 text-xs text-gray-500 font-medium"><th className="p-4">Service</th><th className="p-4">Customer</th><th className="p-4">Status</th><th className="p-4">Date</th></tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {vendorBookings.map(b => (
                          <tr key={b.id} className="hover:bg-gray-50">
                            <td className="p-4 text-sm text-gray-900">{b.service?.name || '—'}</td>
                            <td className="p-4 text-sm text-gray-600">{b.customer?.name || '—'}</td>
                            <td className="p-4">{statusBadge(b.status)}</td>
                            <td className="p-4 text-xs text-gray-400">{b.scheduled_time ? new Date(b.scheduled_time).toLocaleDateString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {vendorBookings.length === 0 && <p className="text-sm text-gray-400 p-6 text-center">No bookings yet.</p>}
                  </div>
                )}

                {vendorDetailTab === 'chats' && (
                  <div className="card overflow-hidden">
                    <table className="w-full text-left">
                      <thead><tr className="bg-gray-50 text-xs text-gray-500 font-medium"><th className="p-4">From</th><th className="p-4">Message</th><th className="p-4">Date</th></tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {vendorChats.map(m => (
                          <tr key={m.id} className="hover:bg-gray-50">
                            <td className="p-4 text-sm text-gray-900">{m.sender?.name || '—'}</td>
                            <td className="p-4 text-sm text-gray-600 max-w-xs truncate">{m.message}</td>
                            <td className="p-4 text-xs text-gray-400">{new Date(m.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {vendorChats.length === 0 && <p className="text-sm text-gray-400 p-6 text-center">No messages yet.</p>}
                  </div>
                )}

                {/* ── Feature Flags Tab ── */}
                {vendorDetailTab === 'features' && (
                  <div className="card p-5">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="font-semibold text-gray-900">Vendor Feature Flags</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Toggle which platform features this vendor can access</p>
                      </div>
                      {user?.role === 'super_admin' && (
                        <button onClick={handleSaveFeatures} disabled={savingFeatures}
                          className="btn-primary text-sm px-4 py-2">{savingFeatures ? 'Saving...' : 'Save changes'}</button>
                      )}
                    </div>
                    <div className="space-y-3">
                      {[
                        { key: 'bookings',         label: 'Bookings',          desc: 'Vendor can receive and manage bookings from customers' },
                        { key: 'messaging',        label: 'Messaging / Chat',  desc: 'Vendor can send and receive chat messages' },
                        { key: 'services',         label: 'Service Listings',  desc: 'Vendor can create and edit their own services' },
                        { key: 'availability_edit',label: 'Availability Edit', desc: 'Vendor can edit their Mon–Fri working hours' },
                        { key: 'social_links',     label: 'Social Links',      desc: 'Vendor can set and display website/Instagram/Facebook links' },
                        { key: 'reviews',          label: 'Reviews',           desc: 'Customer reviews are shown on the vendor public profile' },
                        { key: 'whatsapp',         label: 'WhatsApp',          desc: 'WhatsApp chat button is shown on the vendor profile and service pages' },
                      ].map(({ key, label, desc }) => (
                        <div key={key} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{label}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => user?.role === 'super_admin' && setVendorFeatures(prev => ({ ...prev, [key]: !prev[key] }))}
                            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${user?.role !== 'super_admin' ? 'cursor-default' : 'cursor-pointer'} ${vendorFeatures[key] !== false ? 'bg-green-500' : 'bg-gray-300'}`}
                          >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${vendorFeatures[key] !== false ? 'translate-x-5' : ''}`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Availability Tab (Admin — all 7 days) ── */}
                {vendorDetailTab === 'availability' && (
                  <div className="card p-5">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="font-semibold text-gray-900">Working Hours</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Manage vendor working hours</p>
                      </div>
                      {user?.role === 'super_admin' && (
                        <button onClick={handleSaveAdminAvailability} disabled={savingAdminAvail || vendorAvailability.length === 0}
                          className="btn-primary text-sm px-4 py-2">{savingAdminAvail ? 'Saving...' : 'Save hours'}</button>
                      )}
                    </div>
                    {vendorAvailability.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">Loading...</p>
                    ) : (
                      <div className="space-y-2">
                        {vendorAvailability.map((slot: any) => (
                          <div key={slot.day_of_week}
                            className={`flex items-center gap-3 p-3 rounded-xl border ${slot.is_available ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                            <button
                              type="button"
                              onClick={() => updateAdminSlot(slot.day_of_week, 'is_available', !slot.is_available)}
                              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${slot.is_available ? 'bg-green-500' : 'bg-gray-300'}`}
                            >
                              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${slot.is_available ? 'translate-x-5' : ''}`} />
                            </button>
                            <span className="w-24 text-sm font-medium text-gray-700 flex-shrink-0">
                              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][slot.day_of_week]}
                              {[0, 6].includes(slot.day_of_week) && <span className="ml-1 text-[10px] text-orange-500 font-normal">(admin)</span>}
                            </span>
                            {slot.is_available ? (
                              <div className="flex items-center gap-2 flex-1">
                                <input type="time" value={slot.start_time}
                                  onChange={e => updateAdminSlot(slot.day_of_week, 'start_time', e.target.value)}
                                  className="input-field py-1.5 text-sm w-32" />
                                <span className="text-gray-400 text-xs">to</span>
                                <input type="time" value={slot.end_time}
                                  onChange={e => updateAdminSlot(slot.day_of_week, 'end_time', e.target.value)}
                                  className="input-field py-1.5 text-sm w-32" />
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 flex-1">Closed</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ═══ BOOKINGS ═══ */}
            {activeTab === 'bookings' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <select value={bookingFilter} onChange={e => setBookingFilter(e.target.value)} className="input-field w-auto text-sm">
                    <option value="">All statuses</option>
                    {['pending','accepted','in_progress','completed','cancelled'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                  </select>
                  <button onClick={fetchData} className="btn-secondary text-sm">Filter</button>
                </div>
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead><tr className="bg-gray-50 text-xs text-gray-500 font-medium"><th className="p-4">Service</th><th className="p-4">Customer</th><th className="p-4">Vendor</th><th className="p-4">Status</th><th className="p-4">Date</th><th className="p-4 text-right">Change status</th></tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {bookings.map(b => (
                          <tr key={b.id} className="hover:bg-gray-50">
                            <td className="p-4"><p className="text-sm font-medium text-gray-900">{b.service?.name || '—'}</p><p className="text-xs text-gray-400">{b.service?.category?.name}</p></td>
                            <td className="p-4 text-sm text-gray-600">{b.customer?.name || '—'}</td>
                            <td className="p-4"><p className="text-sm font-medium text-gray-900">{b.vendor?.business_name || b.vendor?.user?.name || '—'}</p>{b.vendor?.business_name && <p className="text-xs text-gray-400">{b.vendor?.user?.name}</p>}</td>
                            <td className="p-4">{statusBadge(b.status)}</td>
                            <td className="p-4 text-xs text-gray-400">{b.scheduled_time ? new Date(b.scheduled_time).toLocaleDateString() : new Date(b.created_at).toLocaleDateString()}</td>
                            <td className="p-4 text-right">
                              <select value={b.status} onChange={e => handleBookingStatus(b.id, e.target.value)} className="text-xs border border-gray-200 rounded px-2 py-1 bg-white cursor-pointer">
                                {['pending','accepted','in_progress','completed','cancelled'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {bookings.length === 0 && <p className="text-sm text-gray-400 p-6 text-center">No bookings found.</p>}
                </div>
              </div>
            )}

            {/* ═══ SERVICES ═══ */}
            {activeTab === 'services' && (
              <div className="space-y-4">
                <div className="flex justify-end"><Link to="/services/create" className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add service</Link></div>
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead><tr className="bg-gray-50 text-xs text-gray-500 font-medium"><th className="p-4">Service</th><th className="p-4">Provider</th><th className="p-4">Price</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {services.map(s => (
                          <tr key={s.id} className="hover:bg-gray-50">
                            <td className="p-4"><p className="text-sm font-medium text-gray-900">{s.name}</p><p className="text-xs text-gray-400">{s.category?.name}</p></td>
                            <td className="p-4 text-sm text-gray-600">{s.vendor?.business_name || '—'}</td>
                            <td className="p-4 text-sm font-semibold">Rs. {s.price}</td>
                            <td className="p-4">{s.is_active ? <span className="text-xs text-green-600 font-medium">Active</span> : <span className="text-xs text-gray-400">Inactive</span>}</td>
                            <td className="p-4 text-right space-x-2">
                              <Link to={`/services/${s.id}/edit`} className="text-primary-600 text-xs font-medium hover:underline">Edit</Link>
                              <button onClick={() => handleDeleteService(s.id)} className="text-red-600 text-xs font-medium hover:underline">Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {services.length === 0 && <p className="text-sm text-gray-400 p-6 text-center">No services.</p>}
                </div>
              </div>
            )}

            {/* ═══ CATEGORIES ═══ */}
            {activeTab === 'categories' && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button onClick={() => { setShowCreateCategory(true); setFormError(''); setFormSuccess(''); }} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add category</button>
                </div>

                {showCreateCategory && (
                  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-sm shadow-xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">New Category</h3>
                        <button onClick={() => setShowCreateCategory(false)}><X className="w-5 h-5 text-gray-400" /></button>
                      </div>
                      {formError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-3">{formError}</p>}
                      {formSuccess && <p className="text-sm text-green-600 bg-green-50 p-3 rounded-lg mb-3">{formSuccess}</p>}
                      <form onSubmit={handleCreateCategory} className="space-y-3">
                        <input required className="input-field" placeholder="Category name" value={newCategory} onChange={e => setNewCategory(e.target.value)} />
                        <div className="flex gap-3">
                          <button type="button" onClick={() => setShowCreateCategory(false)} className="btn-secondary flex-1">Cancel</button>
                          <button type="submit" className="btn-primary flex-1">Create</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                <div className="card overflow-hidden">
                  <table className="w-full text-left">
                    <thead><tr className="bg-gray-50 text-xs text-gray-500 font-medium"><th className="p-4">Category</th><th className="p-4">Services</th><th className="p-4 text-right">Actions</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {categories.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="p-4">
                            {editCategoryItem?.id === c.id ? (
                              <div className="flex items-center gap-2">
                                <input className="input-field text-sm py-1" value={editCategoryItem.name} onChange={e => setEditCategoryItem({ ...editCategoryItem, name: e.target.value })} />
                                <button onClick={() => handleUpdateCategory(c.id, editCategoryItem.name)} className="text-green-600"><Check className="w-4 h-4" /></button>
                                <button onClick={() => setEditCategoryItem(null)} className="text-gray-400"><X className="w-4 h-4" /></button>
                              </div>
                            ) : (
                              <p className="text-sm font-medium text-gray-900">{c.name}</p>
                            )}
                          </td>
                          <td className="p-4 text-sm text-gray-500">{c.services_count ?? 0} services</td>
                          <td className="p-4 text-right space-x-2">
                            <button onClick={() => setEditCategoryItem(c)} className="text-primary-600 text-xs font-medium hover:underline">Edit</button>
                            <button onClick={() => handleDeleteCategory(c.id)} className="text-red-600 text-xs font-medium hover:underline">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {categories.length === 0 && <p className="text-sm text-gray-400 p-6 text-center">No categories found.</p>}
                </div>
              </div>
            )}

            {/* ═══ MESSAGES ═══ */}
            {activeTab === 'messages' && (
              <div className="space-y-4">
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">Support Conversations</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Direct messages between admin and users</p>
                    </div>
                    <a
                      href="/messages"
                      className="text-xs bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Open Full Chat
                    </a>
                  </div>

                  {/* Support conversations (direct messages with admin) */}
                  <div className="divide-y divide-gray-100">
                    {directConvs.map((conv: any, idx: number) => {
                      const other = conv.other_user || {};
                      return (
                        <div key={idx} className="flex items-center gap-3 py-3">
                          <div className="w-9 h-9 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {other.name?.charAt(0)?.toUpperCase() ?? '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{other.name ?? '—'}</p>
                            <p className="text-xs text-gray-400 capitalize">{other.role ?? 'user'}</p>
                            {conv.last_message && (
                              <p className="text-xs text-gray-400 truncate">{conv.last_message}</p>
                            )}
                          </div>
                          {(conv.unread_count ?? 0) > 0 && (
                            <span className="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                              {conv.unread_count}
                            </span>
                          )}
                          <a
                            href={`/messages?with=${other.id}`}
                            className="text-xs border border-green-600 text-green-700 hover:bg-green-50 px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors"
                          >
                            Open Chat
                          </a>
                        </div>
                      );
                    })}
                    {directConvs.length === 0 && (
                      <div className="py-10 text-center text-sm text-gray-400">
                        <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        No support conversations yet.
                        <p className="text-xs mt-1">Customers can reach you via the "Contact Support" button.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Also show all platform messages overview */}
                <div className="card overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-700">All Platform Messages (Recent)</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead><tr className="bg-gray-50 text-xs text-gray-500 font-medium"><th className="p-4">From</th><th className="p-4">To</th><th className="p-4">Message</th><th className="p-4">Date</th><th className="p-4"></th></tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {(Array.isArray(conversations) ? conversations : [])
                          .slice(0, 30)
                          .map((m: any, idx: number) => {
                            // Determine the non-admin user to link to
                            const chatWith = m.sender?.role !== 'admin' ? m.sender?.id : m.receiver?.id;
                            return (
                              <tr key={m.id ?? idx} className="hover:bg-gray-50">
                                <td className="p-4 text-sm text-gray-900">{m.sender?.name || '—'}</td>
                                <td className="p-4 text-sm text-gray-600">{m.receiver?.name || '—'}</td>
                                <td className="p-4 text-sm text-gray-600 max-w-xs truncate">{m.message || '—'}</td>
                                <td className="p-4 text-xs text-gray-400">{m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}</td>
                                <td className="p-4">
                                  {chatWith && (
                                    <a href={`/messages?with=${chatWith}`} className="text-xs text-green-700 hover:underline whitespace-nowrap">Open Chat</a>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                  {conversations.length === 0 && (
                    <p className="text-sm text-gray-400 p-6 text-center">No messages yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* ═══ REVIEWS ═══ */}
            {activeTab === 'reviews' && (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead><tr className="bg-gray-50 text-xs text-gray-500 font-medium"><th className="p-4">Review</th><th className="p-4">Provider</th><th className="p-4">Rating</th><th className="p-4 text-right">Actions</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {reviews.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="p-4"><p className="text-sm text-gray-900">"{r.comment}"</p><p className="text-xs text-gray-400">By {r.customer?.name}</p></td>
                          <td className="p-4 text-sm text-gray-600">{r.vendor?.business_name || '—'}</td>
                          <td className="p-4 text-sm">{'⭐'.repeat(r.rating || 0)}</td>
                          <td className="p-4 text-right"><button onClick={() => handleDeleteReview(r.id)} className="text-red-600 text-xs font-medium hover:underline">Remove</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {reviews.length === 0 && <p className="text-sm text-gray-400 p-6 text-center">No reviews.</p>}
              </div>
            )}

            {/* ═══ MEDIA LIBRARY ═══ */}
            {activeTab === 'media' && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <label className="btn-primary text-sm cursor-pointer flex items-center gap-1.5">
                    {uploading ? 'Uploading...' : <><Plus className="w-4 h-4" /> Upload image</>}
                    <input type="file" className="hidden" accept="image/*" disabled={uploading} onChange={handleMediaUpload} />
                  </label>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {media.map(m => (
                    <div key={m.id} className="relative aspect-square group rounded-lg overflow-hidden border border-gray-200">
                      <img src={`${API_BASE}${m.file_path}`} className="w-full h-full object-cover" alt={m.file_name} onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity">
                        <p className="text-white text-xs px-2 text-center truncate w-full">{m.file_name}</p>
                        <button onClick={() => handleDeleteMedia(m.id)} className="p-1.5 bg-red-500 text-white rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
                {media.length === 0 && <div className="text-center py-16 text-gray-400 text-sm">No media uploaded yet.</div>}
              </div>
            )}

            {/* ═══ SLIDER ═══ */}
            {activeTab === 'slider' && (
              <div className="space-y-5">

                {/* Controls row */}
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="btn-primary text-sm cursor-pointer flex items-center gap-1.5">
                    {sliderUploading ? 'Uploading...' : <><Plus className="w-4 h-4" /> Upload new</>}
                    <input type="file" className="hidden" accept="image/*" disabled={sliderUploading} onChange={handleSliderUpload} />
                  </label>
                  <button onClick={() => setShowMediaPicker(true)} className="btn-secondary text-sm flex items-center gap-1.5"><Image className="w-4 h-4" /> Choose from library</button>
                  <button onClick={handleLoadDefaults} className="btn-secondary text-sm flex items-center gap-1.5">⚡ Load defaults</button>
                  {sliderImages.length > 0 && (
                    <button onClick={handleSaveSlider} disabled={savingSlider} className="btn-primary text-sm ml-auto">
                      {savingSlider ? 'Saving...' : <><Check className="w-4 h-4 inline mr-1" />Save slider</>}
                    </button>
                  )}
                </div>

                {/* Live preview strip */}
                {sliderImages.length > 0 && (
                  <div className="card p-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">Preview (enabled slides)</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {sliderImages.filter(s => s.enabled !== false).map((s, i) => (
                        <div key={i} className="flex-shrink-0 relative w-40 h-24 rounded-lg overflow-hidden border border-gray-200">
                          <img src={s.url} alt={s.title || `Slide ${i+1}`} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }} />
                          {s.title && <div className="absolute bottom-0 inset-x-0 bg-black/40 px-2 py-1"><p className="text-white text-xs truncate">{s.title}</p></div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Slide editor */}
                <div className="space-y-3">
                  {sliderImages.map((slide, idx) => (
                    <div key={idx} className={`card p-4 ${slide.enabled === false ? 'opacity-60' : ''}`}>
                      <div className="flex gap-4 items-start">
                        {/* Thumbnail */}
                        <img src={slide.url} alt={`Slide ${idx+1}`} className="w-24 h-16 object-cover rounded-lg border border-gray-200 flex-shrink-0" onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }} />

                        {/* Fields */}
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Title</label>
                            <input className="input-field text-sm" value={slide.title || ''} onChange={e => updateSlide(idx, 'title', e.target.value)} placeholder="Slide title (optional)" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-1 block">Link to (e.g. /services)</label>
                            <input className="input-field text-sm" value={slide.link || ''} onChange={e => updateSlide(idx, 'link', e.target.value)} placeholder="/services/1" />
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          <button onClick={() => moveSlide(idx, 'up')} disabled={idx === 0} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed" title="Move up"><ArrowUp className="w-4 h-4 text-gray-500" /></button>
                          <button onClick={() => moveSlide(idx, 'down')} disabled={idx === sliderImages.length - 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed" title="Move down"><ArrowDown className="w-4 h-4 text-gray-500" /></button>
                          <button onClick={() => updateSlide(idx, 'enabled', slide.enabled === false ? true : false)} className="p-1.5 rounded hover:bg-gray-100" title={slide.enabled === false ? 'Enable slide' : 'Disable slide'}>
                            {slide.enabled === false ? <ToggleLeft className="w-4 h-4 text-gray-400" /> : <ToggleRight className="w-4 h-4 text-primary-600" />}
                          </button>
                          <button onClick={() => removeSlide(idx)} className="p-1.5 rounded hover:bg-red-50" title="Remove"><X className="w-4 h-4 text-red-500" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {sliderImages.length === 0 && (
                  <div className="text-center py-16 text-gray-400">
                    <Layers className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No slides yet.</p>
                    <p className="text-xs mt-1">Upload an image, choose from library, or click "Load defaults" to get started.</p>
                  </div>
                )}
              </div>
            )}

            {/* ═══ COUPONS ═══ */}
            {activeTab === 'coupons' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''}</p>
                  <button onClick={() => setShowCouponForm(v => !v)} className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
                    <Plus className="w-4 h-4" /> {showCouponForm ? 'Cancel' : 'New Coupon'}
                  </button>
                </div>

                {showCouponForm && (
                  <div className="card p-5">
                    <h3 className="font-semibold text-gray-900 mb-4">Create Coupon</h3>
                    <form onSubmit={async e => {
                      e.preventDefault();
                      setCouponSaving(true);
                      try {
                        const { data } = await api.post('/admin/coupons', { ...couponForm, discount_value: Number(couponForm.discount_value), min_order: couponForm.min_order ? Number(couponForm.min_order) : 0, max_uses: couponForm.max_uses ? Number(couponForm.max_uses) : undefined });
                        setCoupons(prev => [data.coupon, ...prev]);
                        setCouponForm({ code: '', discount_type: 'flat', discount_value: '', min_order: '', max_uses: '', expires_at: '', description: '' });
                        setShowCouponForm(false);
                        toast('Coupon created', 'success');
                      } catch (err: any) { toast(err.response?.data?.message || 'Error', 'error'); } finally { setCouponSaving(false); }
                    }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Code *</label>
                        <input required className="input-field uppercase" placeholder="SAVE20" value={couponForm.code} onChange={e => setCouponForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} /></div>
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Discount Type *</label>
                        <select required className="input-field" value={couponForm.discount_type} onChange={e => setCouponForm(p => ({ ...p, discount_type: e.target.value }))}>
                          <option value="flat">Flat (Rs.)</option>
                          <option value="percent">Percent (%)</option>
                        </select></div>
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Discount Value *</label>
                        <input required type="number" min="0" className="input-field" placeholder={couponForm.discount_type === 'flat' ? '100' : '10'} value={couponForm.discount_value} onChange={e => setCouponForm(p => ({ ...p, discount_value: e.target.value }))} /></div>
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Min Order (Rs.)</label>
                        <input type="number" min="0" className="input-field" placeholder="0" value={couponForm.min_order} onChange={e => setCouponForm(p => ({ ...p, min_order: e.target.value }))} /></div>
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Max Uses</label>
                        <input type="number" min="1" className="input-field" placeholder="Unlimited" value={couponForm.max_uses} onChange={e => setCouponForm(p => ({ ...p, max_uses: e.target.value }))} /></div>
                      <div><label className="block text-xs font-medium text-gray-600 mb-1">Expires At</label>
                        <input type="date" className="input-field" value={couponForm.expires_at} onChange={e => setCouponForm(p => ({ ...p, expires_at: e.target.value }))} /></div>
                      <div className="sm:col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                        <input className="input-field" placeholder="Internal note" value={couponForm.description} onChange={e => setCouponForm(p => ({ ...p, description: e.target.value }))} /></div>
                      <div className="sm:col-span-2">
                        <button type="submit" disabled={couponSaving} className="btn-primary px-6 py-2 text-sm">{couponSaving ? 'Saving...' : 'Create Coupon'}</button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>{['Code','Type','Value','Min Order','Uses','Expires','Status',''].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {coupons.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">No coupons yet.</td></tr>}
                      {coupons.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono font-bold text-primary-700">{c.code}</td>
                          <td className="px-4 py-3 capitalize">{c.discount_type}</td>
                          <td className="px-4 py-3">{c.discount_type === 'flat' ? `Rs. ${c.discount_value}` : `${c.discount_value}%`}</td>
                          <td className="px-4 py-3">{c.min_order > 0 ? `Rs. ${c.min_order}` : '—'}</td>
                          <td className="px-4 py-3">{c.used_count}/{c.max_uses ?? '∞'}</td>
                          <td className="px-4 py-3">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '—'}</td>
                          <td className="px-4 py-3">
                            <button onClick={async () => {
                              try {
                                await api.put(`/admin/coupons/${c.id}`, { is_active: !c.is_active });
                                setCoupons(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !c.is_active } : x));
                              } catch {}
                            }} className={`badge cursor-pointer ${c.is_active ? 'badge-success' : 'badge-danger'}`}>{c.is_active ? 'Active' : 'Inactive'}</button>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={async () => {
                              if (!window.confirm(`Delete coupon ${c.code}?`)) return;
                              try {
                                await api.delete(`/admin/coupons/${c.id}`);
                                setCoupons(prev => prev.filter(x => x.id !== c.id)); toast('Deleted', 'success');
                              } catch {}
                            }} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══ MODERATION (Super Admin) ═══ */}
            {activeTab === 'moderation' && user?.role === 'super_admin' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Service Moderation</h2>
                <div className="flex gap-2 mb-4 flex-wrap">
                  {['pending', 'approved', 'rejected', 'draft'].map(s => (
                    <button key={s} onClick={() => setModerationFilter(s)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${moderationFilter === s ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                    >{s.charAt(0).toUpperCase() + s.slice(1)}</button>
                  ))}
                  <button onClick={fetchData} className="ml-auto p-2 text-gray-400 hover:text-gray-600"><RefreshCw className="w-4 h-4" /></button>
                </div>
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead><tr className="bg-gray-50 text-xs text-gray-500 font-medium">
                        <th className="p-4">Service</th><th className="p-4">Vendor</th><th className="p-4">Price</th><th className="p-4">Status</th><th className="p-4">Created</th><th className="p-4 text-right">Actions</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {pendingServices.map((s: any) => (
                          <tr key={s.id} className="hover:bg-gray-50">
                            <td className="p-4"><p className="text-sm font-medium text-gray-900">{s.name}</p><p className="text-xs text-gray-400">{s.category?.name}</p></td>
                            <td className="p-4 text-sm text-gray-700">{s.vendor?.business_name || s.vendor?.user?.name || '—'}</td>
                            <td className="p-4 text-sm text-gray-700">Rs. {s.price || '—'}</td>
                            <td className="p-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'approved' ? 'bg-green-100 text-green-700' : s.status === 'rejected' ? 'bg-red-100 text-red-700' : s.status === 'draft' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700'}`}>{s.status}</span></td>
                            <td className="p-4 text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString()}</td>
                            <td className="p-4 text-right">
                              {s.status === 'pending' && (
                                <div className="flex items-center justify-end gap-2">
                                  <button onClick={async () => { setActionLoading(`approve-${s.id}`); try { await api.post(`/super-admin/services/${s.id}/approve`); toast('Approved', 'success'); fetchData(); } catch { toast('Failed', 'error'); } setActionLoading(null); }}
                                    className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50" disabled={actionLoading === `approve-${s.id}`}>Approve</button>
                                  <button onClick={async () => { const reason = prompt('Rejection reason:'); if (!reason) return; setActionLoading(`reject-${s.id}`); try { await api.post(`/super-admin/services/${s.id}/reject`, { reason }); toast('Rejected', 'success'); fetchData(); } catch { toast('Failed', 'error'); } setActionLoading(null); }}
                                    className="px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50" disabled={actionLoading === `reject-${s.id}`}>Reject</button>
                                </div>
                              )}
                              {s.rejection_reason && <p className="text-xs text-red-500 mt-1" title={s.rejection_reason}>Reason: {s.rejection_reason.substring(0, 50)}...</p>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {pendingServices.length === 0 && <p className="text-sm text-gray-400 p-6 text-center">No {moderationFilter} services.</p>}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ COMMISSIONS (Super Admin) ═══ */}
            {activeTab === 'commissions' && user?.role === 'super_admin' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Commission Management</h2>
                  <button onClick={() => { setShowRateModal(true); }} className="btn-primary text-sm flex items-center gap-2"><DollarSign className="w-4 h-4" /> Set Rate</button>
                </div>
                {commissionStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="card p-4"><p className="text-2xl font-bold text-gray-900">Rs. {Number(commissionStats.total_commission).toLocaleString()}</p><p className="text-xs text-gray-400 mt-1">Total Commission</p></div>
                    <div className="card p-4"><p className="text-2xl font-bold text-yellow-600">Rs. {Number(commissionStats.pending_commission).toLocaleString()}</p><p className="text-xs text-gray-400 mt-1">Pending Payout</p></div>
                    <div className="card p-4"><p className="text-2xl font-bold text-green-600">Rs. {Number(commissionStats.paid_commission).toLocaleString()}</p><p className="text-xs text-gray-400 mt-1">Paid Out</p></div>
                    <div className="card p-4"><p className="text-2xl font-bold text-primary-600">{commissionStats.total_orders}</p><p className="text-xs text-gray-400 mt-1">Total Orders</p></div>
                  </div>
                )}
                <div className="flex gap-2 mb-4">
                  {['', 'pending', 'paid', 'refunded'].map(s => (
                    <button key={s} onClick={() => setCommissionFilter(s)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${commissionFilter === s ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                    >{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}</button>
                  ))}
                  <button onClick={fetchData} className="ml-auto p-2 text-gray-400 hover:text-gray-600"><RefreshCw className="w-4 h-4" /></button>
                </div>
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead><tr className="bg-gray-50 text-xs text-gray-500 font-medium">
                        <th className="p-4">Booking</th><th className="p-4">Service</th><th className="p-4">Amount</th><th className="p-4">Rate</th><th className="p-4">Commission</th><th className="p-4">Status</th><th className="p-4">Paid At</th><th className="p-4 text-right">Actions</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {commissions.map((c: any) => (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="p-4 text-xs text-gray-500">#{c.booking_id}</td>
                            <td className="p-4 text-sm text-gray-900">{c.service?.name || '—'}</td>
                            <td className="p-4 text-sm text-gray-700">Rs. {Number(c.amount).toLocaleString()}</td>
                            <td className="p-4 text-xs text-gray-500">{c.commission_rate}%</td>
                            <td className="p-4 text-sm font-medium text-gray-900">Rs. {Number(c.commission_amount).toLocaleString()}</td>
                            <td className="p-4"><span className={`text-xs font-medium rounded-full px-2 py-0.5 ${c.status === 'paid' ? 'bg-green-100 text-green-700' : c.status === 'refunded' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{c.status}</span></td>
                            <td className="p-4 text-xs text-gray-400">{c.paid_at ? new Date(c.paid_at).toLocaleDateString() : '—'}</td>
                            <td className="p-4 text-right">
                              {c.status === 'pending' && (
                                <button onClick={async () => { try { await api.put(`/super-admin/commissions/${c.id}/pay`); toast('Marked as paid', 'success'); fetchData(); } catch { toast('Failed', 'error'); } }}
                                  className="text-xs font-medium text-green-600 hover:underline">Mark Paid</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {commissions.length === 0 && <p className="text-sm text-gray-400 p-6 text-center">No commissions found.</p>}
                  </div>
                </div>
                {showRateModal && (
                  <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center" onClick={() => setShowRateModal(false)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Commission Rate</h3>
                      <p className="text-xs text-gray-500 mb-4">Default percentage deducted from each booking.</p>
                      <div className="flex items-center gap-2 mb-4">
                        <input type="number" step="0.1" min="0" max="100" className="input-field" value={newRate} onChange={e => setNewRate(e.target.value)} />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => setShowRateModal(false)} className="btn-secondary flex-1">Cancel</button>
                        <button onClick={async () => { try { await api.post('/super-admin/commissions/rate', { rate: parseFloat(newRate) }); toast('Rate updated', 'success'); setShowRateModal(false); fetchData(); } catch { toast('Failed', 'error'); } }} className="btn-primary flex-1">Save</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ KYC REVIEW (Super Admin) ═══ */}
            {activeTab === 'kyc' && user?.role === 'super_admin' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">KYC Document Review</h2>
                <div className="space-y-4">
                  {kycVendors.length === 0 && <div className="card p-8 text-center"><Shield className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="text-sm text-gray-400">No pending KYC submissions.</p></div>}
                  {kycVendors.map((v: any) => (
                    <div key={v.id} className="card p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">{v.business_name}</h3>
                          <p className="text-xs text-gray-400">{v.user?.name} ({v.user?.email})</p>
                        </div>
                        <span className="text-xs font-medium bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">{v.kyc_status}</span>
                      </div>
                      <div className="space-y-3">
                        {v.documents?.map((doc: any) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                            <div>
                              <p className="text-sm font-medium text-gray-800">{doc.type}</p>
                              <p className="text-xs text-gray-400">{doc.file_path}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={async () => { try { await api.post(`/super-admin/kyc/documents/${doc.id}/approve`); toast('Document approved', 'success'); fetchData(); } catch { toast('Failed', 'error'); } }}
                                className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200">Approve</button>
                              <button onClick={async () => { const reason = prompt('Rejection reason:'); if (!reason) return; try { await api.post(`/super-admin/kyc/documents/${doc.id}/reject`, { reason }); toast('Rejected', 'success'); fetchData(); } catch { toast('Failed', 'error'); } }}
                                className="px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200">Reject</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ ACTIVITY LOGS (Super Admin) ═══ */}
            {activeTab === 'activities' && user?.role === 'super_admin' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Activity Log</h2>
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead><tr className="bg-gray-50 text-xs text-gray-500 font-medium">
                        <th className="p-4">Admin</th><th className="p-4">Action</th><th className="p-4">Target</th><th className="p-4">Details</th><th className="p-4">Time</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {activities.map((log: any) => (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="p-4 text-sm text-gray-900">{log.user?.name || '—'}</td>
                            <td className="p-4"><span className="text-xs font-medium rounded-full px-2 py-0.5 bg-gray-100 text-gray-700">{log.action}</span></td>
                            <td className="p-4 text-xs text-gray-500">{log.subject_type ? log.subject_type.split('\\').pop() : '—'} #{log.subject_id || '—'}</td>
                            <td className="p-4 text-xs text-gray-500 max-w-xs truncate">{log.new_values ? JSON.stringify(log.new_values).substring(0, 60) : '—'}</td>
                            <td className="p-4 text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {activities.length === 0 && <p className="text-sm text-gray-400 p-6 text-center">No activity logs yet.</p>}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ MENUS ═══ */}
            {activeTab === 'menus' && <MenuManager />}

            {/* ═══ PAGE SEO ═══ */}
            {activeTab === 'page-seo' && <PageSeoManager />}

            {/* ═══ SEO ═══ */}
            {activeTab === 'seo' && (
              <div className="max-w-3xl space-y-5">
                <form onSubmit={handleSaveSeo} className="card p-6 md:p-8 space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Home Page SEO</h3>
                    <p className="text-xs text-gray-500 mb-4">Control how your site appears in Google search results.</p>
                    <div className="grid grid-cols-1 gap-4">
                      <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Meta Title</label><input type="text" className="input-field" value={seoHomeTitle} onChange={e => setSeoHomeTitle(e.target.value)} placeholder="ToleMate – Find Trusted Local Services in Nepal" /></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Meta Description</label><textarea rows={3} className="input-field resize-none" value={seoHomeDesc} onChange={e => setSeoHomeDesc(e.target.value)} placeholder="Book verified professionals for home repair, cleaning, plumbing, and more in Nepal." /></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Keywords (comma separated)</label><input type="text" className="input-field" value={seoHomeKeywords} onChange={e => setSeoHomeKeywords(e.target.value)} placeholder="local services, home repair, plumber, electrician, Nepal" /></div>
                    </div>
                  </div>

                  <hr className="border-gray-200" />

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Open Graph / Social Sharing</h3>
                    <p className="text-xs text-gray-500 mb-4">Image and content shown when your site is shared on Facebook, Twitter, etc.</p>
                    <div className="grid grid-cols-1 gap-4">
                      <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Default OG Image URL</label><input type="url" className="input-field" value={seoOgImage} onChange={e => setSeoOgImage(e.target.value)} placeholder="https://example.com/og-image.jpg" /></div>
                      {seoOgImage && (
                        <div className="w-full max-w-sm aspect-video rounded-lg overflow-hidden border border-gray-200">
                          <img src={seoOgImage} alt="OG preview" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                      )}
                    </div>
                  </div>

                  <hr className="border-gray-200" />

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Google Search Console</h3>
                    <p className="text-xs text-gray-500 mb-4">Verify your site ownership with Google.</p>
                    <div className="grid grid-cols-1 gap-4">
                      <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Site Verification Meta Tag Content</label><input type="text" className="input-field" value={seoSiteVerification} onChange={e => setSeoSiteVerification(e.target.value)} placeholder="e.g. google-site-verification=xyz..." /></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Google Tag Manager ID</label><input type="text" className="input-field" value={seoGtmId} onChange={e => setSeoGtmId(e.target.value)} placeholder="GTM-XXXXXXX" /></div>
                    </div>
                  </div>

                  <hr className="border-gray-200" />

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Schema.org JSON-LD</h3>
                    <p className="text-xs text-gray-500 mb-4">Custom structured data for rich search results.</p>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Custom JSON-LD (optional)</label><textarea rows={5} className="input-field resize-none font-mono text-xs" value={seoSchemaOrg} onChange={e => setSeoSchemaOrg(e.target.value)} placeholder='{"@context":"https://schema.org","@type":"Organization","name":"ToleMate"}' /></div>
                  </div>

                  <button type="submit" disabled={savingSeo} className="btn-primary w-full py-2.5">{savingSeo ? 'Saving...' : 'Save SEO Settings'}</button>
                </form>
              </div>
            )}

            {/* ═══ SETTINGS ═══ */}
            {activeTab === 'settings' && (
              <div className="card p-6 md:p-8 max-w-2xl">
                <form onSubmit={handleSaveSettings} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Site name</label><input type="text" className="input-field" value={siteName} onChange={e => setSiteName(e.target.value)} /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Contact email</label><input type="email" className="input-field" value={contactEmail} onChange={e => setContactEmail(e.target.value)} /></div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1.5">Hero title</label><input type="text" className="input-field" value={heroTitle} onChange={e => setHeroTitle(e.target.value)} /></div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1.5">Hero subtitle</label><textarea rows={3} className="input-field resize-none" value={heroSubtitle} onChange={e => setHeroSubtitle(e.target.value)} /></div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Slider auto-advance interval</label>
                      <select className="input-field" value={sliderInterval} onChange={e => setSliderInterval(e.target.value)}>
                        <option value="2000">2 seconds</option>
                        <option value="3000">3 seconds</option>
                        <option value="4000">4 seconds</option>
                        <option value="5000">5 seconds (default)</option>
                        <option value="6000">6 seconds</option>
                        <option value="8000">8 seconds</option>
                        <option value="10000">10 seconds</option>
                        <option value="15000">15 seconds</option>
                        <option value="20000">20 seconds</option>
                      </select>
                      <p className="text-xs text-gray-400 mt-1">How long each slide stays visible before auto-advancing</p>
                    </div>
                  </div>
                  <button type="submit" disabled={savingSettings} className="btn-primary w-full py-2.5">{savingSettings ? 'Saving...' : 'Save settings'}</button>
                </form>
              </div>
            )}

          </>)}
        </div>
      </main>

      {/* ═══ MEDIA PICKER MODAL ═══ */}
      {showMediaPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="font-semibold text-gray-900">Choose from Media Library</h3>
                <p className="text-xs text-gray-500 mt-0.5">Click an image to add it as a slide</p>
              </div>
              <button onClick={() => setShowMediaPicker(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-700" /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {media.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No images in library. Upload some first.</div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {media.map(m => (
                    <button key={m.id} onClick={() => addSlideFromLibrary(m)} className="relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-primary-500 transition-all group">
                      <img src={`${API_BASE}${m.file_path}`} alt={m.file_name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                      <div className="absolute inset-0 bg-primary-600/0 group-hover:bg-primary-600/20 flex items-center justify-center transition-all">
                        <Plus className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>

      {/* ═══ RESET PASSWORD MODAL ═══ */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) { setResetTarget(null); setResetResult(null); } }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Reset Password</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  For <strong>{resetTarget.name}</strong> ({resetTarget.email})
                </p>
              </div>
              <button onClick={() => { setResetTarget(null); setResetResult(null); }} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {resetError}
              </div>
            )}

            {resetResult ? (
              <div className="space-y-4">
                {resetResult.type === 'password' ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-3">New password generated. Share this securely with the user — it won't be shown again:</p>
                    <div className="flex items-center gap-2 bg-gray-900 text-green-400 font-mono text-base rounded-xl p-4">
                      <span className="flex-1 select-all tracking-widest">{resetResult.value}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(resetResult!.value)}
                        className="text-gray-400 hover:text-white text-xs border border-gray-600 px-2 py-1 rounded-md"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">⚠️ All existing sessions for this user have been revoked.</p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="text-sm text-gray-700">{resetResult.value}</p>
                  </div>
                )}
                <button onClick={() => { setResetTarget(null); setResetResult(null); }} className="btn-secondary w-full text-sm">
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-2">Choose how to reset this user's password:</p>

                {/* Option 1: Generate */}
                <button
                  onClick={() => handleAdminResetPassword('generate')}
                  disabled={resetLoading}
                  className="w-full flex items-start gap-3 p-4 border-2 border-gray-200 hover:border-primary-500 rounded-xl text-left transition-colors group"
                >
                  <div className="w-9 h-9 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-lg">🔑</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm group-hover:text-primary-700">Generate New Password</p>
                    <p className="text-xs text-gray-500 mt-0.5">Creates a random 12-character password and shows it to you. All existing sessions are revoked.</p>
                  </div>
                </button>

                {/* Option 2: Email */}
                <button
                  onClick={() => handleAdminResetPassword('email')}
                  disabled={resetLoading}
                  className="w-full flex items-start gap-3 p-4 border-2 border-gray-200 hover:border-blue-500 rounded-xl text-left transition-colors group"
                >
                  <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-lg">📧</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm group-hover:text-blue-700">Send Reset Email Link</p>
                    <p className="text-xs text-gray-500 mt-0.5">Sends a secure reset link to <strong>{resetTarget.email}</strong>. The user sets their own new password.</p>
                  </div>
                </button>

                {resetLoading && (
                  <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-500">
                    <span className="w-4 h-4 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin" />
                    Processing...
                  </div>
                )}

                <button onClick={() => setResetTarget(null)} className="btn-secondary w-full text-sm mt-1">Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default AdminDashboard;
