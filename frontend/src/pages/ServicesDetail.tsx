import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import SeoHead, { breadcrumbJsonLd } from '../components/SeoHead';
import { Star, Shield, MessageCircle, CheckCircle, ChevronRight, Clock, Heart, ChevronLeft, ChevronRight as ChevronRightIcon, Share2 } from 'lucide-react';
import { getServiceImage } from '../utils/serviceImage';
import { useSettings } from '../context/SettingsContext';
import { API_BASE, FALLBACK_IMAGE } from '../utils/config';
import { ServiceDetailSkeleton } from '../components/Skeleton';

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const formatWhatsApp = (phone: string) => phone.replace(/\D/g, '');

const ServicesDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [service, setService] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [similarServices, setSimilarServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { getSetting } = useSettings();
  const siteName = getSetting('site_name', 'ToleMate');

  // Favorites
  const [isFavorite, setIsFavorite] = useState(false);
  // Carousel
  const [carouselIdx, setCarouselIdx] = useState(0);

  useEffect(() => {
    if (id) {
      try {
        const favs: number[] = JSON.parse(localStorage.getItem('tolemate_favorites') || '[]');
        setIsFavorite(favs.includes(Number(id)));
      } catch {}
    }
  }, [id]);

  const toggleFavorite = useCallback(() => {
    const serviceId = Number(id);
    setIsFavorite(prev => {
      try {
        const favs: number[] = JSON.parse(localStorage.getItem('tolemate_favorites') || '[]');
        const next = prev ? favs.filter(f => f !== serviceId) : [...favs, serviceId];
        localStorage.setItem('tolemate_favorites', JSON.stringify(next));
      } catch {}
      return !prev;
    });
  }, [id]);

  useEffect(() => {
    const fetchServiceData = async () => {
      try {
        const serviceRes = await fetch(`${API_BASE}/api/services/${id}`);
        if (!serviceRes.ok) throw new Error('Service not found');
        const serviceData = await serviceRes.json();
        const serviceObj = serviceData.service;
        setService(serviceObj);

        // Track recently viewed (max 10, most recent first)
        try {
          const viewed: any[] = JSON.parse(localStorage.getItem('tolemate_recently_viewed') || '[]');
          const filtered = viewed.filter((s: any) => s.id !== serviceObj.id);
          const entry = { id: serviceObj.id, name: serviceObj.name, price: serviceObj.price, vendor: serviceObj.vendor?.business_name, category: serviceObj.category?.name, viewed_at: Date.now() };
          localStorage.setItem('tolemate_recently_viewed', JSON.stringify([entry, ...filtered].slice(0, 10)));
        } catch {}

        const [reviewsRes, availRes] = await Promise.all([
          fetch(`${API_BASE}/api/vendors/${serviceObj.vendor_id}/reviews`),
          fetch(`${API_BASE}/api/vendors/${serviceObj.vendor_id}/availability`),
        ]);
        if (reviewsRes.ok) { const d = await reviewsRes.json(); setReviews(d.data || d); }
        if (availRes.ok) { const d = await availRes.json(); setAvailability(d.availability || []); }

        // Similar services: same category, exclude this service
        if (serviceObj.category_id) {
          const simRes = await fetch(`${API_BASE}/api/services/search?category_id=${serviceObj.category_id}&per_page=4`);
          if (simRes.ok) {
            const simData = await simRes.json();
            setSimilarServices((simData.data || simData).filter((s: any) => s.id !== serviceObj.id).slice(0, 3));
          }
        }
      } catch (error) { console.error(error); }
      finally { setLoading(false); }
    };
    fetchServiceData();
  }, [id]);

  /** Get next available day (within next 7 days) */
  const nextAvailable = useMemo(() => {
    if (!availability.length) return null;
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i);
      const dow = d.getDay();
      const slot = availability.find(s => s.day_of_week === dow && s.is_available);
      if (slot) return { date: d, slot, daysFromNow: i };
    }
    return null;
  }, [availability]);

  if (loading) return <ServiceDetailSkeleton />;
  if (!service) return <div className="min-h-screen pt-32 text-center text-gray-500">Service not found</div>;

  return (
    <>
      <SeoHead
        title={`${service.name} – ${service.vendor?.business_name || ''}`}
        description={`${service.description?.slice(0, 155)}...`}
        keywords={`${service.name}, ${service.category?.name || 'services'}, ${service.vendor?.business_name || ''}`}
        ogTitle={service.name}
        ogDescription={service.description?.slice(0, 200)}
        ogImage={getServiceImage(service)}
        ogType="product"
        canonicalUrl={window.location.href}
        jsonLd={breadcrumbJsonLd([
          { name: 'Services', url: window.location.origin + '/services' },
          { name: service.name, url: window.location.href },
        ])}
      />
    <div className="min-h-screen py-8 animate-fade-in">
      <div className="container-custom max-w-5xl">
        {/* Breadcrumb + favorite */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link to="/services" className="hover:text-primary-600 transition-colors">Services</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-400">{service.category?.name}</span>
          </div>
          <button
            onClick={toggleFavorite}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
              isFavorite ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500' : ''}`} />
            {isFavorite ? 'Saved' : 'Save'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card overflow-hidden">
              {/* Image carousel */}
              {(() => {
                const images: string[] = [
                  ...(service.images?.map((img: any) => img.image_url || img.image_path) || []),
                ];
                if (!images.length) images.push(getServiceImage(service));
                const clampedIdx = Math.min(carouselIdx, images.length - 1);
                return (
                  <div className="relative h-56 md:h-72 overflow-hidden bg-gray-100">
                    <img
                      key={clampedIdx}
                      src={images[clampedIdx]}
                      alt={`${service.name} ${clampedIdx + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover transition-opacity duration-300"
                      onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
                    />
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={() => setCarouselIdx(i => (i - 1 + images.length) % images.length)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCarouselIdx(i => (i + 1) % images.length)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                        >
                          <ChevronRightIcon className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {images.map((_, i) => (
                            <button key={i} onClick={() => setCarouselIdx(i)}
                              className={`h-1.5 rounded-full transition-all duration-200 ${
                                i === clampedIdx ? 'bg-white w-4' : 'bg-white/60 w-1.5'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="absolute top-3 right-3 text-xs bg-black/50 text-white px-2 py-1 rounded-full">
                          {clampedIdx + 1} / {images.length}
                        </span>
                      </>
                    )}
                  </div>
                );
              })()}
              <div className="p-6 md:p-8">
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="badge badge-info">{service.category?.name}</span>
                <button
                  onClick={() => {
                    const shareData = { title: service.name, text: `Check out "${service.name}" on ToleMate`, url: window.location.href };
                    if (navigator.share) { navigator.share(shareData).catch(() => {}); }
                    else { navigator.clipboard.writeText(window.location.href); }
                  }}
                  className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors rounded-lg hover:bg-gray-100" title="Share this service">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-5">{service.name}</h1>
              
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                <Link to={`/vendors/${service.vendor_id}`} className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-semibold text-gray-600 text-sm hover:opacity-75 transition-opacity">
                  {service.vendor?.business_name?.charAt(0) || 'V'}
                </Link>
                <div>
                  <Link to={`/vendors/${service.vendor_id}`} className="font-medium text-gray-900 text-sm hover:text-primary-600 transition-colors">{service.vendor?.business_name}</Link>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      {service.vendor?.rating || 'New provider'}
                    </div>
                    {service.vendor?.is_verified && (
                      <span className="flex items-center gap-0.5 text-blue-600 font-medium"><CheckCircle className="w-3 h-3" /> Verified</span>
                    )}
                    {(() => {
                      const jobs = service.vendor?.completed_jobs ?? 0;
                      if (jobs >= 20) return <span className="flex items-center gap-0.5 text-green-600"><Clock className="w-3 h-3" /> Responds within 1 hr</span>;
                      if (jobs >= 5)  return <span className="flex items-center gap-0.5 text-green-600"><Clock className="w-3 h-3" /> Responds within 2 hrs</span>;
                      return null;
                    })()}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">About this service</h3>
                <div className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                  {service.description}
                </div>
              </div>

              {/* Cancellation policy */}
              {service.cancellation_policy && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1.5 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Cancellation Policy
                  </h4>
                  <p className="text-sm text-gray-600">{service.cancellation_policy}</p>
                </div>
              )}

              {/* Availability strip */}
              {availability.length > 0 && (
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Availability
                  </h4>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {availability.map(slot => (
                      <span key={slot.day_of_week}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${slot.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400 line-through'}`}>
                        {DAY_SHORT[slot.day_of_week]}
                        {slot.is_available && <span className="ml-1 text-[10px] opacity-70">{slot.start_time.slice(0,5)}–{slot.end_time.slice(0,5)}</span>}
                      </span>
                    ))}
                  </div>
                  {nextAvailable && (
                    <p className="text-xs text-green-700 font-medium">
                      {nextAvailable.daysFromNow === 0 ? '✓ Available today' : nextAvailable.daysFromNow === 1 ? '✓ Available tomorrow' : `✓ Next available: ${DAY_SHORT[nextAvailable.date.getDay()]}`}
                      {' '}{nextAvailable.slot.start_time.slice(0,5)}–{nextAvailable.slot.end_time.slice(0,5)}
                    </p>
                  )}
                </div>
              )}
              </div>{/* end card inner padding */}
            </div>

            {/* Packages / Tiers */}
            {service.packages && service.packages.length > 0 && (
              <div className="card p-6 md:p-8">
                <h3 className="font-semibold text-gray-900 mb-1">Choose a package</h3>
                <p className="text-sm text-gray-500 mb-5">Select the tier that fits your needs and budget</p>
                <div className={`grid gap-4 ${service.packages.length === 1 ? 'grid-cols-1 max-w-xs' : service.packages.length === 2 ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
                  {service.packages.map((pkg: any, idx: number) => {
                    const tierStyles = [
                      { border: 'border-gray-200', badge: 'bg-gray-100 text-gray-600', btn: 'btn-secondary' },
                      { border: 'border-blue-300 ring-1 ring-blue-200', badge: 'bg-blue-100 text-blue-700', btn: 'btn-primary' },
                      { border: 'border-purple-300 ring-1 ring-purple-200', badge: 'bg-purple-100 text-purple-700', btn: 'btn-primary' },
                    ];
                    const style = tierStyles[Math.min(idx, 2)];
                    return (
                      <div key={pkg.id} className={`rounded-xl border-2 p-5 flex flex-col ${style.border} ${idx === 1 ? 'relative' : ''}`}>
                        {idx === 1 && service.packages.length === 3 && (
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-0.5 bg-blue-600 text-white rounded-full">Popular</span>
                        )}
                        <div className="mb-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>{pkg.name}</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 mb-1">Rs. {Number(pkg.price).toLocaleString()}</p>
                        {pkg.delivery_days && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                            <Clock className="w-3 h-3" /> {pkg.delivery_days} day{pkg.delivery_days !== 1 ? 's' : ''} delivery
                          </p>
                        )}
                        {pkg.description && <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>}
                        {pkg.features && pkg.features.length > 0 && (
                          <ul className="space-y-1.5 mb-4 flex-1">
                            {pkg.features.map((f: string, fi: number) => (
                              <li key={fi} className="flex items-start gap-2 text-sm text-gray-700">
                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        )}
                        <Link to={`/book/${service.id}?package=${pkg.id}&price=${pkg.price}&pkg_name=${encodeURIComponent(pkg.name)}`}
                          className={`${style.btn} w-full text-center text-sm py-2 mt-auto`}>
                          Book {pkg.name}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="card p-6 md:p-8">
              {/* Rating summary */}
              {reviews.length > 0 && (() => {
                const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
                const counts = [5, 4, 3, 2, 1].map(star => ({
                  star,
                  count: reviews.filter(r => r.rating === star).length,
                  pct: (reviews.filter(r => r.rating === star).length / reviews.length) * 100,
                }));
                return (
                  <div className="flex items-start gap-8 mb-6 pb-6 border-b border-gray-100">
                    <div className="text-center flex-shrink-0">
                      <p className="text-4xl font-extrabold text-gray-900">{avg.toFixed(1)}</p>
                      <div className="flex text-yellow-400 text-sm my-1">{'★'.repeat(Math.round(avg))}{'☆'.repeat(5 - Math.round(avg))}</div>
                      <p className="text-xs text-gray-400">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {counts.map(({ star, count, pct }) => (
                        <div key={star} className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="w-4 text-right">{star}</span>
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-5 text-right">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <h3 className="font-semibold text-gray-900 mb-4">
                Reviews <span className="text-gray-400 font-normal">({reviews.length})</span>
              </h3>
              <div className="space-y-5">
                {reviews.slice(0, 5).map((review: any) => (
                  <div key={review.id} className="pb-5 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {review.customer?.name?.charAt(0) || 'U'}
                      </div>
                      <span className="font-medium text-sm text-gray-900">{review.customer?.name}</span>
                      <div className="flex text-yellow-400 text-xs">
                        {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                      </div>
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    {review.comment && <p className="text-sm text-gray-600 mb-2">{review.comment}</p>}
                    {/* Vendor reply */}
                    {review.vendor_reply && (
                      <div className="ml-4 mt-2 bg-gray-50 rounded-lg p-3 border-l-2 border-primary-200">
                        <p className="text-xs font-semibold text-primary-700 mb-1">Response from {service.vendor?.business_name}</p>
                        <p className="text-sm text-gray-600">{review.vendor_reply}</p>
                      </div>
                    )}
                  </div>
                ))}
                {reviews.length === 0 && (
                  <p className="text-sm text-gray-400">No reviews yet.</p>
                )}
              </div>
            </div>

            {/* Similar services */}
            {similarServices.length > 0 && (
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-4 text-sm">You may also like</h3>
                <div className="space-y-3">
                  {similarServices.map(s => (
                    <Link key={s.id} to={`/services/${s.id}`} className="flex gap-3 group hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors">
                      <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={getServiceImage(s)} alt={s.name} loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 line-clamp-1 group-hover:text-primary-600 transition-colors">{s.name}</p>
                        <p className="text-xs text-gray-400 line-clamp-1">{s.vendor?.business_name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          <span className="text-xs text-gray-500">{s.vendor?.rating ? Number(s.vendor.rating).toFixed(1) : 'New'}</span>
                          <span className="text-xs font-semibold text-primary-600 ml-auto">
                            {s.price ? `Rs. ${Number(s.price).toLocaleString()}` : 'Quote'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <div className="mb-4">
                {service.packages && service.packages.length > 0 ? (
                  <>
                    <p className="text-sm text-gray-500 mb-1">Starting from</p>
                    <p className="text-2xl font-bold text-gray-900">Rs. {Math.min(...service.packages.map((p: any) => Number(p.price))).toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{service.packages.length} package{service.packages.length !== 1 ? 's' : ''} available</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-gray-900">
                      {service.price ? `Rs. ${Number(service.price).toLocaleString()}` : 'Get a quote'}
                      {service.pricing_type === 'hourly' && <span className="text-sm text-gray-400 font-normal">/hour</span>}
                    </p>
                    <p className="text-sm text-gray-500">{service.pricing_type === 'fixed' ? 'Fixed price' : 'Price may vary'}</p>
                  </>
                )}
              </div>

              {service.packages && service.packages.length > 0 ? (
                <a href="#packages" onClick={e => { e.preventDefault(); document.querySelector('.packages-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="btn-primary w-full py-3 mb-3 text-center">
                  View packages ↓
                </a>
              ) : (
                <Link to={`/book/${service.id}`} className="btn-primary w-full py-3 mb-3">
                  Book now
                </Link>
              )}

              {service.vendor?.user?.phone && (
                <a
                  href={`https://wa.me/${formatWhatsApp(service.vendor.user.phone)}?text=${encodeURIComponent(`Hi! I'm interested in your service: ${service.name}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 mb-4 bg-[#25D366] hover:bg-[#1ebe5c] text-white rounded-lg font-medium text-sm transition-colors"
                >
                  <WhatsAppIcon />
                  Chat on WhatsApp
                </a>
              )}
              
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Verified professional</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <span>{siteName} guarantee</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <MessageCircle className="w-4 h-4 text-purple-500" />
                  <span>Direct messaging</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default ServicesDetail;
