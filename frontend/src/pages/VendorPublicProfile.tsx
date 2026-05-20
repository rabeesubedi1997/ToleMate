import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Star, MapPin, MessageCircle, ArrowLeft, Calendar, CheckCircle, Share2, Globe, AtSign, Link2, ExternalLink, Phone, Heart } from 'lucide-react';
import { API_BASE } from '../utils/config';

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);
const fmtWA = (p: string) => p.replace(/\D/g, '');

interface VendorService {
  id: number;
  name: string;
  description: string;
  pricing_type: 'fixed' | 'hourly' | 'quote';
  price: number | null;
  sale_price: number | null;
  sale_ends_at: string | null;
  effective_price: number | null;
  on_sale: boolean;
  category: { name: string };
}

interface PortfolioItem {
  id: number;
  image_url: string;
  before_image_url: string | null;
  caption: string | null;
}

interface ServiceBundle {
  id: number;
  name: string;
  description: string | null;
  bundle_price: string;
  discount_percent: number;
  services: { id: number; name: string; price: string | null }[];
}

interface Vendor {
  id: number;
  business_name: string;
  description: string;
  rating: number | null;
  service_area_radius: number;
  service_radius_km: number | null;
  subscription_plan?: 'free' | 'basic' | 'pro';
  is_verified: boolean;
  created_at: string;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  avatar: string | null;
  user: { id: number; name: string; created_at: string; phone?: string | null };
  services: VendorService[];
}

interface Review {
  id: number;
  rating: number;
  comment: string | null;
  vendor_reply: string | null;
  created_at: string;
  customer: { name: string };
}

const Stars: React.FC<{ rating: number; size?: 'sm' | 'md' }> = ({ rating, size = 'sm' }) => {
  const sz = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} className={`${sz} ${i <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-200'} fill-current`} viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
};

const VendorPublicProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [completedJobs, setCompletedJobs] = useState(0);
  const [avgResponseHours, setAvgResponseHours] = useState<number | null>(null);
  const [availability, setAvailability] = useState<{ day_of_week: number; start_time: string; end_time: string; is_available: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavVendor, setIsFavVendor] = useState(false);
  const [badges, setBadges] = useState<string[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [bundles, setBundles] = useState<ServiceBundle[]>([]);
  const [portfolioLightbox, setPortfolioLightbox] = useState<PortfolioItem | null>(null);

  // Load fav state from localStorage
  useEffect(() => {
    if (!id) return;
    try {
      const favs: number[] = JSON.parse(localStorage.getItem('tolemate_fav_vendors') || '[]');
      setIsFavVendor(favs.includes(Number(id)));
    } catch { /* ignore */ }
  }, [id]);

  const toggleFavVendor = () => {
    const key = 'tolemate_fav_vendors';
    try {
      const favs: number[] = JSON.parse(localStorage.getItem(key) || '[]');
      const vid = Number(id);
      const next = isFavVendor ? favs.filter(x => x !== vid) : [...favs, vid];
      localStorage.setItem(key, JSON.stringify(next));
      setIsFavVendor(!isFavVendor);
    } catch { /* ignore */ }
  };
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsMeta, setReviewsMeta] = useState<{ last_page: number } | null>(null);

  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/vendors/${id}`);
        if (!res.ok) { navigate('/services', { replace: true }); return; }
        const data = await res.json();
        setVendor(data.vendor);
        setReviewCount(data.review_count);
        setCompletedJobs(data.completed_jobs ?? 0);
        setAvgResponseHours(data.avg_response_hours ?? null);
        if (data.badges) setBadges(data.badges);
        // Fetch availability
        try {
          const ar = await fetch(`${API_BASE}/api/vendors/${id}/availability`);
          if (ar.ok) { const ad = await ar.json(); setAvailability(ad.availability || []); }
        } catch { /* ignore */ }
        // Fetch portfolio
        try {
          const pr = await fetch(`${API_BASE}/api/vendors/${id}/portfolio`);
          if (pr.ok) { const pd = await pr.json(); setPortfolio(pd.portfolio || []); }
        } catch { /* ignore */ }
        // Fetch bundles
        try {
          const br = await fetch(`${API_BASE}/api/vendors/${id}/bundles`);
          if (br.ok) { const bd = await br.json(); setBundles(bd.bundles || []); }
        } catch { /* ignore */ }
      } catch { navigate('/services', { replace: true }); }
      finally { setLoading(false); }
    };
    fetchVendor();
  }, [id, navigate]);

  useEffect(() => {
    if (!id) return;
    const fetchReviews = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/vendors/${id}/reviews?page=${reviewsPage}`);
        if (res.ok) {
          const data = await res.json();
          setReviews(data.data || data);
          setReviewsMeta(data.last_page ? { last_page: data.last_page } : null);
        }
      } catch { /* ignore */ }
    };
    fetchReviews();
  }, [id, reviewsPage]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

  const priceLabel = (s: VendorService) => {
    if (s.pricing_type === 'quote') return 'Get quote';
    const p = s.on_sale ? s.effective_price : s.price;
    if (!p) return '—';
    return s.pricing_type === 'hourly' ? `Rs. ${p}/hr` : `Rs. ${p}`;
  };

  if (loading) return (
    <div className="min-h-screen py-8 animate-pulse">
      <div className="container-custom max-w-5xl">
        <div className="h-4 w-16 bg-gray-200 rounded mb-6" />
        <div className="card p-6 md:p-8 mb-6">
          <div className="flex gap-6">
            <div className="w-20 h-20 bg-gray-200 rounded-2xl" />
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-gray-200 rounded w-48" />
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-4 bg-gray-200 rounded w-64" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {[1,2,3].map(i => <div key={i} className="card p-5 h-24" />)}
          </div>
          <div className="space-y-4">
            {[1,2].map(i => <div key={i} className="card p-4 h-20" />)}
          </div>
        </div>
      </div>
    </div>
  );
  if (!vendor) return null;

  const token = localStorage.getItem('token');
  const rating = vendor.rating ? Number(vendor.rating) : null;

  return (
    <div className="min-h-screen py-8 animate-fade-in">
      <Helmet>
        <title>{vendor.business_name} – ToleMate</title>
        <meta name="description" content={`Book services from ${vendor.business_name}. ${vendor.description?.slice(0, 120) || 'Verified professional on ToleMate.'}`} />
        <meta property="og:title" content={`${vendor.business_name} on ToleMate`} />
        <meta property="og:description" content={vendor.description?.slice(0, 160) || 'Verified professional on ToleMate.'} />
        <link rel="canonical" href={window.location.href} />
      </Helmet>
      <div className="container-custom max-w-5xl">

        {/* Back */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button onClick={toggleFavVendor}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${isFavVendor ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500'}`}>
            <Heart className={`w-4 h-4 ${isFavVendor ? 'fill-red-500' : ''}`} />
            {isFavVendor ? 'Saved' : 'Save vendor'}
          </button>
        </div>

        {/* Hero card */}
        <div className="card p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-primary-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {vendor.avatar ? (
                <img src={`http://localhost:8001${vendor.avatar}`} alt={vendor.business_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-primary-600">
                  {vendor.business_name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{vendor.business_name}</h1>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                {rating ? (
                  <div className="flex items-center gap-1.5">
                    <Stars rating={rating} size="md" />
                    <span className="font-semibold text-gray-900">{rating.toFixed(1)}</span>
                    <span className="text-sm text-gray-400">({reviewCount} review{reviewCount !== 1 ? 's' : ''})</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">No reviews yet</span>
                )}
                {vendor.is_verified && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" /> Verified
                  </span>
                )}
                {badges.map(b => (
                  <span key={b} className="text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">{b}</span>
                ))}
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="w-3.5 h-3.5" /> Serves up to {vendor.service_radius_km ?? vendor.service_area_radius ?? 10} km
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Member since {formatDate(vendor.user.created_at)}</span>
                <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> {vendor.services.length} active service{vendor.services.length !== 1 ? 's' : ''}</span>
                {completedJobs > 0 && <span className="flex items-center gap-1">🎯 {completedJobs} job{completedJobs !== 1 ? 's' : ''} done</span>}
                {avgResponseHours !== null && (
                  <span className="flex items-center gap-1">⚡ Responds in ~{avgResponseHours < 1 ? '<1' : Math.round(avgResponseHours)}h</span>
                )}
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col gap-2 flex-shrink-0 w-full md:w-auto">
              {token ? (
                <Link
                  to={`/messages?vendor=${vendor.user.id}`}
                  className="btn-primary text-sm justify-center"
                >
                  <MessageCircle className="w-4 h-4" /> Message
                </Link>
              ) : (
                <Link to={`/login?redirect=/vendors/${id}`} className="btn-primary text-sm justify-center">
                  <MessageCircle className="w-4 h-4" /> Message
                </Link>
              )}
              {vendor.user.phone && (
                <>
                  <a
                    href={`https://wa.me/${fmtWA(vendor.user.phone)}?text=${encodeURIComponent(`Hi ${vendor.business_name}, I found you on ToleMate and would like to enquire about your services.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2 px-4 bg-[#25D366] hover:bg-[#1ebe5c] text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <WhatsAppIcon /> WhatsApp
                  </a>
                  <a
                    href={`tel:${vendor.user.phone}`}
                    className="btn-secondary text-sm justify-center flex items-center gap-1.5"
                  >
                    <Phone className="w-4 h-4" /> Call
                  </a>
                </>
              )}
            </div>
          </div>

          {vendor.description && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">About</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{vendor.description}</p>
            </div>
          )}
          {(vendor.website || vendor.instagram || vendor.facebook) && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Links</h2>
              <div className="flex flex-wrap gap-3">
                {vendor.website && (
                  <a href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-primary-600 hover:underline">
                    <Globe className="w-3.5 h-3.5" /> Website <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {vendor.instagram && (
                  <a href={`https://instagram.com/${vendor.instagram.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '')}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-pink-600 hover:underline">
                    <AtSign className="w-3.5 h-3.5" /> Instagram <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {vendor.facebook && (
                  <a href={vendor.facebook.startsWith('http') ? vendor.facebook : `https://facebook.com/${vendor.facebook.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                    <Link2 className="w-3.5 h-3.5" /> Facebook <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Services */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-semibold text-gray-900 text-lg">Services ({vendor.services.length})</h2>
            {vendor.services.length === 0 ? (
              <div className="card p-8 text-center text-sm text-gray-400">No active services listed</div>
            ) : (
              vendor.services.map(s => (
                <Link key={s.id} to={`/services/${s.id}`} className="card p-5 flex justify-between items-start hover:shadow-md transition-shadow gap-4 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="badge badge-neutral">{s.category.name}</span>
                    </div>
                    <h3 className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors">{s.name}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{s.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {s.on_sale && (
                      <span className="inline-block bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full mb-1">SALE</span>
                    )}
                    <p className="font-bold text-gray-900 text-lg">{priceLabel(s)}</p>
                    {s.on_sale && s.price && (
                      <p className="text-xs text-gray-400 line-through">Rs. {s.price}</p>
                    )}
                    <span className="btn-primary text-xs py-1.5 px-3 mt-2 inline-block">Book</span>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Portfolio Gallery */}
          {portfolio.length > 0 && (
            <div>
              <h2 className="font-semibold text-gray-900 text-lg mb-3">Portfolio ({portfolio.length})</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {portfolio.map(item => (
                  <div key={item.id} className="relative cursor-pointer group" onClick={() => setPortfolioLightbox(item)}>
                    <img
                      src={item.image_url}
                      alt={item.caption || 'Portfolio'}
                      className="w-full h-40 object-cover rounded-xl group-hover:opacity-90 transition-opacity"
                      onError={e => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
                    />
                    {item.before_image_url && (
                      <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">Before/After</span>
                    )}
                    {item.caption && (
                      <p className="text-xs text-gray-500 mt-1 truncate">{item.caption}</p>
                    )}
                  </div>
                ))}
              </div>
              {/* Lightbox */}
              {portfolioLightbox && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPortfolioLightbox(null)}>
                  <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
                    <button className="absolute top-2 right-2 text-white bg-black/50 rounded-full p-1 hover:bg-black/80 z-10"
                      onClick={() => setPortfolioLightbox(null)}>✕</button>
                    {portfolioLightbox.before_image_url ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-white text-xs text-center mb-1">Before</p>
                          <img src={portfolioLightbox.before_image_url} alt="Before" className="w-full rounded-xl object-cover" />
                        </div>
                        <div>
                          <p className="text-white text-xs text-center mb-1">After</p>
                          <img src={portfolioLightbox.image_url} alt="After" className="w-full rounded-xl object-cover" />
                        </div>
                      </div>
                    ) : (
                      <img src={portfolioLightbox.image_url} alt={portfolioLightbox.caption || ''} className="w-full rounded-xl object-cover" />
                    )}
                    {portfolioLightbox.caption && (
                      <p className="text-white text-center mt-3 text-sm">{portfolioLightbox.caption}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Service Bundles */}
          {bundles.length > 0 && (
            <div>
              <h2 className="font-semibold text-gray-900 text-lg mb-3">Service Bundles</h2>
              <div className="space-y-3">
                {bundles.map(b => (
                  <div key={b.id} className="card p-5">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{b.name}</h3>
                        {b.description && <p className="text-sm text-gray-500 mt-0.5">{b.description}</p>}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {b.services.map(s => (
                            <span key={s.id} className="badge badge-neutral text-xs">{s.name}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-primary-600 text-lg">Rs. {b.bundle_price}</p>
                        {b.discount_percent > 0 && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{b.discount_percent}% off</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews + Availability */}
          <div className="space-y-4">
            {/* Availability widget */}
            {availability.length > 0 && (() => {
              const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
              const todayDow = new Date().getDay();
              return (
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Weekly Availability</h3>
                  <div className="grid grid-cols-7 gap-1 mb-3">
                    {DAY_SHORT.map((d, i) => {
                      const slot = availability.find(s => s.day_of_week === i);
                      const avail = slot?.is_available ?? false;
                      const isToday = i === todayDow;
                      return (
                        <div key={i} title={slot && avail ? `${slot.start_time.slice(0,5)}–${slot.end_time.slice(0,5)}` : 'Unavailable'}
                          className={`flex flex-col items-center py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                            avail
                              ? isToday
                                ? 'bg-green-500 text-white'
                                : 'bg-green-50 text-green-700'
                              : 'bg-gray-50 text-gray-300'
                          }`}>
                          <span>{d}</span>
                          <span className="mt-0.5">{avail ? '●' : '○'}</span>
                        </div>
                      );
                    })}
                  </div>
                  {(() => {
                    const today = new Date();
                    for (let i = 0; i < 7; i++) {
                      const d = new Date(today); d.setDate(today.getDate() + i);
                      const slot = availability.find(s => s.day_of_week === d.getDay() && s.is_available);
                      if (slot) {
                        const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : DAY_SHORT[d.getDay()];
                        return <p className="text-xs text-green-600 font-medium">✓ Next available: {label} {slot.start_time.slice(0,5)}–{slot.end_time.slice(0,5)}</p>;
                      }
                    }
                    return <p className="text-xs text-gray-400">No availability in next 7 days</p>;
                  })()}
                </div>
              );
            })()}

            <h2 className="font-semibold text-gray-900 text-lg">Reviews ({reviewCount})</h2>
            {reviews.length === 0 ? (
              <div className="card p-6 text-center text-sm text-gray-400">No reviews yet</div>
            ) : (
              <>
                {/* Star breakdown */}
                {(() => {
                  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
                  const counts = [5,4,3,2,1].map(n => ({ star: n, count: reviews.filter(r => r.rating === n).length }));
                  return (
                    <div className="card p-4">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="text-center">
                          <p className="text-3xl font-extrabold text-gray-900">{avg.toFixed(1)}</p>
                          <Stars rating={avg} size="md" />
                          <p className="text-xs text-gray-400 mt-0.5">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="flex-1 space-y-1">
                          {counts.map(({ star, count }) => (
                            <div key={star} className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 w-3">{star}</span>
                              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                                  style={{ width: `${reviews.length ? (count / reviews.length) * 100 : 0}%` }} />
                              </div>
                              <span className="text-xs text-gray-400 w-4 text-right">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
                {reviews.map(r => (
                  <div key={r.id} className="card p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{r.customer.name}</p>
                        <p className="text-xs text-gray-400">{formatDate(r.created_at)}</p>
                      </div>
                      <Stars rating={r.rating} />
                    </div>
                    {r.comment && <p className="text-sm text-gray-600 leading-relaxed">"{r.comment}"</p>}
                    {r.vendor_reply && (
                      <div className="mt-3 pl-3 border-l-2 border-primary-200 bg-primary-50/50 rounded-r-lg p-2.5">
                        <p className="text-xs font-semibold text-primary-700 mb-1">Vendor replied:</p>
                        <p className="text-sm text-gray-600">{r.vendor_reply}</p>
                      </div>
                    )}
                  </div>
                ))}
                {reviewsMeta && reviewsMeta.last_page > 1 && (
                  <div className="flex justify-center gap-2">
                    {reviewsPage > 1 && (
                      <button onClick={() => setReviewsPage(p => p - 1)} className="btn-secondary text-xs py-1.5 px-3">Prev</button>
                    )}
                    {reviewsPage < reviewsMeta.last_page && (
                      <button onClick={() => setReviewsPage(p => p + 1)} className="btn-secondary text-xs py-1.5 px-3">Next</button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorPublicProfile;
