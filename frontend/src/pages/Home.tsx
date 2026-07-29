import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SeoHead, { organizationJsonLd, websiteJsonLd } from '../components/SeoHead';
import { useSettings } from '../context/SettingsContext';
import { useTranslation } from 'react-i18next';
import {
  Search, Star, Users, Shield, Clock, CheckCircle2,
  ChevronDown, ChevronUp, Smartphone, ArrowRight,
  Wrench, Zap, Droplets, Monitor, Sparkles, Heart,
  PartyPopper, Scissors, Car, Package
} from 'lucide-react';
import { getServiceImage } from '../utils/serviceImage';
import { API_BASE, FALLBACK_IMAGE, assetUrl } from '../utils/config';

const HERO_BG = 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1600&q=80';

const CATEGORIES = [
  { name: 'Home Repair',      icon: Wrench,      img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80' },
  { name: 'Plumbing',         icon: Droplets,    img: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=300&q=80' },
  { name: 'Electrical',       icon: Zap,         img: 'https://images.unsplash.com/photo-1621905251189-08b45249a300?w=300&q=80' },
  { name: 'Cleaning',         icon: Sparkles,    img: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=300&q=80' },
  { name: 'Tech Support',     icon: Monitor,     img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&q=80' },
  { name: 'Health & Wellness',icon: Heart,       img: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&q=80' },
  { name: 'Events',           icon: PartyPopper, img: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=300&q=80' },
  { name: 'Beauty',           icon: Scissors,    img: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&q=80' },
  { name: 'Automobile',       icon: Car,         img: 'https://images.unsplash.com/photo-1486754735734-325b5831c3ad?w=300&q=80' },
  { name: 'Pest Control',     icon: Package,     img: 'https://images.unsplash.com/photo-1595424651896-d57ab2e15a37?w=300&q=80' },
];

const POPULAR_TAGS = ['Electrician', 'Plumber', 'Cleaning', 'AC Repair', 'Carpenter'];

const TESTIMONIALS = [
  { name: 'Priya Sharma',   role: 'Homeowner',        text: 'ToleMate made it so easy to find a reliable plumber. Booked in 2 minutes, problem solved the same day!', stars: 5 },
  { name: 'Rajesh Thapa',   role: 'Office Manager',   text: 'We use ToleMate for all our office maintenance. The electricians are professional and prices are fully transparent.', stars: 5 },
  { name: 'Anita Gurung',   role: 'Restaurant Owner', text: 'Excellent service! The cleaning team was thorough and on time. Will definitely book again.', stars: 5 },
  { name: 'Suresh Karki',   role: 'IT Professional',  text: 'Found a great laptop technician through ToleMate. Fast service, great communication throughout.', stars: 4 },
];

const FAQS = [
  { q: 'How do I book a service?',             a: "Browse services, select one you like, choose your preferred date & time, then click \"Book Now\". You'll receive a confirmation once the provider accepts." },
  { q: 'Are all service providers verified?',  a: 'Yes! Every provider on ToleMate is background-checked and reviewed by our team before being listed on the platform.' },
  { q: 'Can I cancel or reschedule?',          a: 'Yes, you can cancel or reschedule from your dashboard before the provider confirms. Once confirmed, contact the provider directly.' },
  { q: 'What payment methods are accepted?',   a: 'We accept cash on delivery, digital wallets (eSewa, Khalti), and bank transfers. Payment is made after the service is completed.' },
  { q: "What if I'm not satisfied?",           a: "Your satisfaction is our priority. Contact us within 24 hours of service completion and we'll work to resolve the issue or arrange a re-service." },
];

const STATS = [
  { value: '5,000+',  label: 'Verified Professionals', icon: Users },
  { value: '10,000+', label: 'Bookings Completed',     icon: CheckCircle2 },
  { value: '4.8★',    label: 'Average Rating',         icon: Star },
  { value: '100%',    label: 'Satisfaction Guarantee', icon: Shield },
];

const Home: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getSetting } = useSettings();

  const [search, setSearch] = useState('');
  const [heroBgIdx, setHeroBgIdx] = useState(0);
  const [sliderImages, setSliderImages] = useState<any[]>([]);
  const [sliderInterval, setSliderInterval] = useState(5000);
  const [featuredServices, setFeaturedServices] = useState<any[]>([]);
  const [popularServices, setPopularServices] = useState<any[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  const [featuredVendors, setFeaturedVendors] = useState<any[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const [apiCategories, setApiCategories] = useState<Record<string, number>>({});

  const siteName = getSetting('site_name', 'ToleMate');
  const heroTitle = getSetting('hero_title', 'Book Home Service Providers\nat Your Fingertips');
  const heroSubtitle = getSetting('hero_subtitle', 'Search, compare and match with verified professionals of your choice in 60 seconds.');
  const vendorTitle = getSetting('vendor_cta_title', 'Grow your service business');
  const vendorText = getSetting('vendor_cta_text', 'Join thousands of professionals earning more by listing their services on ToleMate. Free to join, no hidden fees.');

  /* ── Load recently viewed from localStorage ── */
  useEffect(() => {
    try {
      const viewed = JSON.parse(localStorage.getItem('tolemate_recently_viewed') || '[]');
      setRecentlyViewed(viewed.slice(0, 6));
    } catch {}
  }, []);

  /* ── Fetch settings + services ── */
  useEffect(() => {
    fetch(`${API_BASE}/api/settings`)
      .then(r => r.ok ? r.json() : {})
      .then((data: any) => {
        const raw = data?.slider_images;
        try { setSliderImages(JSON.parse(raw || '[]').filter((s: any) => s.enabled !== false)); } catch { setSliderImages([]); }
        const iv = parseInt(data?.slider_interval || '5000', 10);
        if (!isNaN(iv) && iv >= 1000) setSliderInterval(iv);
      })
      .catch(() => {});

    fetch(`${API_BASE}/api/services?per_page=12`)
      .then(r => r.ok ? r.json() : { data: [] })
      .then(data => {
        const all: any[] = data.data || data || [];
        setFeaturedServices(all.slice(0, 8));
        setPopularServices(all.slice(0, 6));
      })
      .catch(() => {});

    fetch(`${API_BASE}/api/featured-vendors`)
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => setFeaturedVendors(data))
      .catch(() => {});

    fetch(`${API_BASE}/api/categories`)
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        const map: Record<string, number> = {};
        data.forEach((c: any) => { map[c.name] = c.services_count ?? 0; });
        setApiCategories(map);
      })
      .catch(() => {});
  }, []);

  /* ── Cycle hero background through slider images ── */
  useEffect(() => {
    if (sliderImages.length <= 1) return;
    const t = setInterval(() => setHeroBgIdx(i => (i + 1) % sliderImages.length), sliderInterval);
    return () => clearInterval(t);
  }, [sliderImages, sliderInterval]);

  /* ── Stats intersection observer ── */
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setStatsVisible(true);
    }, { threshold: 0.3 });
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const heroBg = sliderImages.length > 0 ? sliderImages[heroBgIdx]?.url : HERO_BG;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/services?search=${encodeURIComponent(search)}`);
  };

  return (
    <>
      <SeoHead
        title={siteName}
        description={`${siteName} connects you with verified professionals for home repair, cleaning, plumbing, electrical work, and more. Book instantly, pay securely.`}
        keywords="local services, home repair, plumber, electrician, cleaning, Nepal, ToleMate"
        ogTitle={`${siteName} – Trusted Local Services`}
        ogDescription="Book verified local professionals near you – from plumbing to cleaning, IT to beauty."
        canonicalUrl={window.location.href}
        jsonLd={{ ...organizationJsonLd(siteName), ...websiteJsonLd(siteName) }}
      />
    <div className="flex flex-col">

      {/* ═══════════════════════════════════════════
          1. FULL-WIDTH HERO WITH CYCLING BACKGROUND
      ═══════════════════════════════════════════ */}
      <section className="relative w-full overflow-hidden" style={{ minHeight: 'clamp(360px, 56vw, 620px)' }}>
        {/* Background image */}
        <img
          key={heroBg}
          src={heroBg}
          alt="hero"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          onError={e => { (e.target as HTMLImageElement).src = HERO_BG; }}
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/50 to-black/70" />

        {/* Slide dots */}
        {sliderImages.length > 1 && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
            {sliderImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setHeroBgIdx(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${idx === heroBgIdx ? 'bg-white w-6' : 'bg-white/40 w-2'}`}
              />
            ))}
          </div>
        )}

        {/* Overlay content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4 py-16 sm:py-24">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-4 drop-shadow-xl max-w-4xl whitespace-pre-line">
            {heroTitle}
          </h1>
          <p className="text-base sm:text-lg text-white/80 mb-8 max-w-2xl drop-shadow">
            {heroSubtitle}
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden p-1.5 gap-1.5">
            <div className="flex flex-1 items-center gap-2 px-4">
              <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="What service do you need?"
                className="flex-1 text-sm text-gray-800 outline-none bg-transparent py-2"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary px-6 py-2.5 text-sm flex-shrink-0 rounded-xl">
              Search
            </button>
          </form>

          {/* Popular tags */}
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            <span className="text-white/60 text-xs self-center">Popular:</span>
            {POPULAR_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => navigate(`/services?search=${encodeURIComponent(tag)}`)}
                className="text-xs bg-white/15 hover:bg-white/25 text-white px-3.5 py-1.5 rounded-full transition-colors backdrop-blur-sm border border-white/20"
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-6 mt-8">
            {[
              { icon: Shield, text: 'Verified Professionals' },
              { icon: CheckCircle2, text: '30-Day Guarantee' },
              { icon: Clock, text: 'Same-Day Service' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-white/80 text-xs">
                <Icon className="w-4 h-4 text-green-400" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          2. BROWSE BY CATEGORY
      ═══════════════════════════════════════════ */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="container-custom">
          <div className="flex items-center justify-between mb-7">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Browse by Category</h2>
              <p className="text-sm text-gray-500 mt-0.5">Find the right professional for any job</p>
            </div>
            <Link to="/services" className="hidden sm:flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Horizontal scroll on mobile, grid on desktop */}
          <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-5 lg:grid-cols-10 sm:overflow-visible snap-x">
            {CATEGORIES.map(cat => (
              <Link
                to={`/services?search=${encodeURIComponent(cat.name)}`}
                key={cat.name}
                className="flex-shrink-0 snap-start flex flex-col items-center gap-2.5 p-3 w-24 sm:w-auto rounded-2xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-all group cursor-pointer"
              >
                <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
                  <img src={cat.img} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                </div>
                <span className="text-xs font-medium text-gray-700 group-hover:text-primary-700 text-center leading-tight">{cat.name}</span>
                {apiCategories[cat.name] != null && apiCategories[cat.name] > 0 && (
                  <span className="text-[10px] text-gray-400">{apiCategories[cat.name]} service{apiCategories[cat.name] !== 1 ? 's' : ''}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          3. FEATURED SERVICES (horizontal scroll → grid)
      ═══════════════════════════════════════════ */}
      {featuredServices.length > 0 && (
        <section className="py-12 bg-gray-50">
          <div className="container-custom">
            <div className="flex items-center justify-between mb-7">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">Featured Services</h2>
                <p className="text-sm text-gray-500 mt-0.5">Top-rated services by our verified professionals</p>
              </div>
              <Link to="/services" className="hidden sm:flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
                See more <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
              {featuredServices.map(service => (
                <Link
                  to={`/services/${service.id}`}
                  key={service.id}
                  className="flex-shrink-0 w-56 sm:w-64 lg:w-auto card overflow-hidden hover:shadow-lg transition-all group"
                >
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={getServiceImage(service)}
                      alt={service.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    <span className="absolute top-2 left-2 text-xs bg-white/90 text-gray-700 px-2 py-0.5 rounded-full font-medium shadow-sm">
                      {service.category?.name}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1 group-hover:text-primary-600 transition-colors">
                      {service.name}
                    </h3>
                    <p className="text-xs text-gray-500 mb-3 line-clamp-1">{service.vendor?.business_name}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-medium text-gray-700">{Number(service.vendor?.rating || 0).toFixed(1)}</span>
                      </div>
                      <p className="text-sm font-bold text-primary-600">
                        {service.price ? `Rs. ${Number(service.price).toLocaleString()}` : 'Free quote'}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          4. POPULAR SERVICES GRID
      ═══════════════════════════════════════════ */}
      {popularServices.length > 0 && (
        <section className="py-12 bg-white border-y border-gray-100">
          <div className="container-custom">
            <div className="flex items-center justify-between mb-7">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">Popular Services</h2>
                <p className="text-sm text-gray-500 mt-0.5">Most booked by customers near you</p>
              </div>
              <Link to="/services" className="hidden sm:flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
                Browse all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {popularServices.map(service => (
                <Link
                  to={`/services/${service.id}`}
                  key={`pop-${service.id}`}
                  className="card group overflow-hidden hover:shadow-lg transition-all"
                >
                  <div className="relative h-28 overflow-hidden">
                    <img
                      src={getServiceImage(service)}
                      alt={service.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold text-gray-900 line-clamp-1 mb-1 group-hover:text-primary-600 transition-colors">
                      {service.name}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs text-gray-500">{Number(service.vendor?.rating || 0).toFixed(1)}</span>
                      </div>
                      <span className="text-xs font-bold text-primary-600">
                        {service.price ? `Rs.${Number(service.price).toLocaleString()}` : 'Quote'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          5.5 FEATURED VENDORS
      ═══════════════════════════════════════════ */}
      {featuredVendors.length > 0 && (
        <section className="py-12 bg-gradient-to-br from-primary-50 to-white border-y border-primary-100">
          <div className="container-custom">
            <div className="flex items-center justify-between mb-7">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">Featured Professionals</h2>
                <p className="text-sm text-gray-500 mt-1">Handpicked top-rated service providers</p>
              </div>
              <Link to="/services" className="text-sm text-primary-600 font-medium hover:underline">View all →</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredVendors.map((v: any) => (
                <Link key={v.id} to={`/vendors/${v.id}`}
                  className="card p-5 flex items-start gap-4 hover:shadow-lg transition-all group">
                  <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {v.avatar ? (
                      <img src={assetUrl(v.avatar)} alt={v.business_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-primary-600">{v.business_name?.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <h3 className="font-semibold text-gray-900 text-sm group-hover:text-primary-600 transition-colors truncate">{v.business_name}</h3>
                      {v.is_verified && <span title="Verified" className="text-blue-500 text-xs flex-shrink-0">✓</span>}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">{v.description || 'Professional service provider'}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-semibold text-gray-700">{v.rating ? Number(v.rating).toFixed(1) : 'New'}</span>
                      </div>
                      <span className="text-xs text-gray-400">{v.services?.length ?? 0} service{v.services?.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          6. RECENTLY VIEWED (localStorage)
      ═══════════════════════════════════════════ */}
      {recentlyViewed.length > 0 && (
        <section className="py-10 bg-white border-b border-gray-100">
          <div className="container-custom">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Recently Viewed</h2>
              <button onClick={() => { localStorage.removeItem('tolemate_recently_viewed'); setRecentlyViewed([]); }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors">Clear</button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 snap-x">
              {recentlyViewed.map((s: any) => (
                <Link key={s.id} to={`/services/${s.id}`}
                  className="flex-shrink-0 snap-start w-44 card p-3 hover:shadow-md transition-all group">
                  <p className="text-xs font-semibold text-gray-900 line-clamp-2 group-hover:text-primary-600 transition-colors mb-1">{s.name}</p>
                  <p className="text-xs text-gray-400 line-clamp-1">{s.vendor}</p>
                  {s.category && <span className="inline-block mt-2 text-[10px] bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full font-medium">{s.category}</span>}
                  {s.price && <p className="text-xs font-bold text-primary-600 mt-1.5">Rs. {Number(s.price).toLocaleString()}</p>}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          6. STATS COUNTER STRIP
      ═══════════════════════════════════════════ */}
      <section ref={statsRef} className="py-14 bg-primary-600">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map(({ value, label, icon: Icon }) => (
              <div key={label} className="text-white">
                <div className="flex justify-center mb-2.5">
                  <Icon className="w-7 h-7 opacity-80" />
                </div>
                <p className={`text-2xl sm:text-3xl font-extrabold transition-all duration-1000 ${statsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  {value}
                </p>
                <p className="text-sm text-white/70 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          6. HOW IT WORKS
      ═══════════════════════════════════════════ */}
      <section className="py-14 bg-white">
        <div className="container-custom">
          <div className="text-center mb-10">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">How It Works</h2>
            <p className="text-gray-500 text-sm">Get the help you need in three simple steps</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {[
              { step: '01', title: 'Search & Browse',   desc: 'Describe what you need or browse our categories to find the right service.',              icon: Search },
              { step: '02', title: 'Book Instantly',    desc: 'Select your provider, pick a date & time, and confirm your booking in seconds.',         icon: Clock },
              { step: '03', title: 'Get It Done',       desc: "A verified professional arrives at your door. Pay only after you're satisfied.",         icon: CheckCircle2 },
            ].map(item => (
              <div key={item.step} className="relative text-center p-6 rounded-2xl border border-gray-100 bg-gray-50">
                <span className="absolute top-4 right-5 text-5xl font-black text-gray-100 leading-none select-none">{item.step}</span>
                <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          7. TESTIMONIALS
      ═══════════════════════════════════════════ */}
      <section className="py-14 bg-gray-50 border-y border-gray-100">
        <div className="container-custom">
          <div className="text-center mb-10">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">What Our Clients Say</h2>
            <p className="text-gray-500 text-sm">Real reviews from real customers across Nepal</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TESTIMONIALS.map((item, i) => (
              <div key={i} className="card p-5 flex flex-col">
                <div className="flex text-yellow-400 text-base mb-3">
                  {'★'.repeat(item.stars)}{'☆'.repeat(5 - item.stars)}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed flex-1 mb-4">"{item.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className="w-9 h-9 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 leading-tight">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          8. FAQ ACCORDION
      ═══════════════════════════════════════════ */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h2>
            <p className="text-gray-500 text-sm">Everything you need to know about {siteName}</p>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-900 text-sm pr-4">{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="w-4 h-4 text-primary-500 flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          9. VENDOR CTA + APP DOWNLOAD
      ═══════════════════════════════════════════ */}
      <section className="py-14 bg-gray-900">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">

            {/* Vendor CTA */}
            <div className="text-center md:text-left">
              <span className="inline-block text-xs font-semibold text-primary-400 uppercase tracking-wider mb-3">For Professionals</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">{vendorTitle}</h2>
              <p className="text-gray-400 mb-6 text-sm leading-relaxed">{vendorText}</p>
              <Link to="/register?role=vendor" className="btn-primary px-7 py-3 text-sm">
                Get Started Free →
              </Link>
              <div className="flex flex-wrap gap-4 mt-6 justify-center md:justify-start">
                {['No signup fee', 'Set your own price', 'Flexible schedule'].map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs text-gray-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* App download */}
            <div className="text-center">
              <div className="inline-flex w-16 h-16 bg-primary-600 rounded-2xl items-center justify-center mb-4 shadow-lg">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Download Our App</h3>
              <p className="text-gray-400 text-sm mb-6">Book services on the go, anytime anywhere.</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <a href="#" className="flex items-center gap-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-5 py-3 rounded-xl transition-colors">
                  <span className="text-2xl leading-none">🍎</span>
                  <div className="text-left">
                    <p className="text-xs text-white/50 leading-none mb-0.5">Download on</p>
                    <p className="text-sm font-semibold leading-none">App Store</p>
                  </div>
                </a>
                <a href="#" className="flex items-center gap-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-5 py-3 rounded-xl transition-colors">
                  <span className="text-2xl leading-none">▶</span>
                  <div className="text-left">
                    <p className="text-xs text-white/50 leading-none mb-0.5">Get it on</p>
                    <p className="text-sm font-semibold leading-none">Google Play</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
    </>
  );
};

export default Home;
