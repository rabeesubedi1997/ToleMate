import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SeoHead from '../components/SeoHead';
import { Search, SlidersHorizontal, MapPin, Star, X, ChevronDown, ArrowUpDown, LayoutGrid, List, Map, Heart, LocateFixed, Clock } from 'lucide-react';
import { getServiceImage } from '../utils/serviceImage';
import { API_BASE, FALLBACK_IMAGE } from '../utils/config';
import ServiceMapView from '../components/ServiceMapView';
import { ServicesGridSkeleton } from '../components/Skeleton';

interface Service {
  id: number;
  name: string;
  description: string;
  price: number | null;
  pricing_type: string;
  category: { id: number; name: string };
  vendor: { id: number; business_name: string; rating: number; is_verified?: boolean; available_today?: boolean; user?: { lat: number | null; lng: number | null } };
  images?: { image_path: string }[];
}

interface Category { id: number; name: string }

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest first' },
  { value: 'price_asc',  label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'rating_desc',label: 'Top Rated' },
  { value: 'most_booked',label: 'Most Booked' },
];

const RATING_OPTIONS = [
  { value: '',    label: 'Any rating' },
  { value: '3',   label: '3+ stars' },
  { value: '4',   label: '4+ stars' },
  { value: '4.5', label: '4.5+ stars' },
];

// Read a param from URLSearchParams, returning fallback if absent/empty
const qp = (params: URLSearchParams, key: string, fallback = '') =>
  params.get(key) || fallback;

const Services: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ── Derive initial state from URL ──────────────────────────────────────────
  const initParams = new URLSearchParams(location.search);
  const [search,    setSearch]    = useState(qp(initParams, 'search'));
  const [category,  setCategory]  = useState(qp(initParams, 'category'));
  const [sortBy,    setSortBy]    = useState(qp(initParams, 'sort', 'newest'));
  const [minPrice,  setMinPrice]  = useState(qp(initParams, 'min_price'));
  const [maxPrice,  setMaxPrice]  = useState(qp(initParams, 'max_price'));
  const [minRating, setMinRating] = useState(qp(initParams, 'min_rating'));
  const [radius,    setRadius]    = useState(Number(qp(initParams, 'radius', '50')));

  const [services,   setServices]   = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [coords,     setCoords]     = useState<{ lat: number; lng: number } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [favorites, setFavorites] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('tolemate_favorites') || '[]'); } catch { return []; }
  });
  const [nearMeActive, setNearMeActive] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [suggestions, setSuggestions] = useState<Service[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('tolemate_search_history') || '[]'); } catch { return []; }
  });
  const [showHistory, setShowHistory] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // ── Geolocation (once) ────────────────────────────────────────────────────
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
    // Categories with sessionStorage cache
    const cacheKey = 'tolemate_categories';
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try { setCategories(JSON.parse(cached)); return; } catch {}
    }
    fetch(`${API_BASE}/api/categories`)
      .then(r => r.ok ? r.json() : [])
      .then((data: Category[]) => {
        setCategories(data);
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
      })
      .catch(() => {});
  }, []);

  // ── Fetch whenever URL changes ─────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearch(qp(params, 'search'));
    setCategory(qp(params, 'category'));
    setSortBy(qp(params, 'sort', 'newest'));
    setMinPrice(qp(params, 'min_price'));
    setMaxPrice(qp(params, 'max_price'));
    setMinRating(qp(params, 'min_rating'));
    setRadius(Number(qp(params, 'radius', '50')));
    setPage(1);
    fetchServices(params, 1, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Re-fetch when geo coords arrive (they weren't available on first load)
  const coordsRef = useRef(coords);
  useEffect(() => {
    coordsRef.current = coords;
    if (coords) fetchServices(new URLSearchParams(location.search), 1, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords]);

  // Re-fetch when switching to/from map mode (pagination changes)
  useEffect(() => {
    fetchServices(new URLSearchParams(location.search), 1, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  const fetchServices = async (params: URLSearchParams, pg = 1, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const url = new URL(`${API_BASE}/api/services/search`);
      const q   = params.get('search') || '';
      const cat = params.get('category') || '';
      const srt = params.get('sort')     || 'newest';
      const mn  = params.get('min_price') || '';
      const mx  = params.get('max_price') || '';
      const mr  = params.get('min_rating') || '';
      const rad = params.get('radius') || '50';

      if (q)   url.searchParams.set('query',       q);
      if (cat) url.searchParams.set('category_id', cat);
      if (srt) url.searchParams.set('sort_by',     srt);
      if (mn)  url.searchParams.set('min_price',   mn);
      if (mx)  url.searchParams.set('max_price',   mx);
      if (mr)  url.searchParams.set('min_rating',  mr);

      const c = coordsRef.current;
      if (c) {
        url.searchParams.set('lat',    String(c.lat));
        url.searchParams.set('lng',    String(c.lng));
        url.searchParams.set('radius', rad);
      }

      // Map mode: fetch all without pagination to populate all pins
      if (viewMode === 'map') { url.searchParams.set('map', '1'); }
      else { url.searchParams.set('page', String(pg)); url.searchParams.set('per_page', '12'); }

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        const items = data.data || data;
        setServices(prev => append ? [...prev, ...items] : items);
        setTotal(data.total ?? items.length);
      }
    } catch {}
    finally { if (append) setLoadingMore(false); else setLoading(false); }
  };

  // ── Push all current filter state into URL ─────────────────────────────────
  const applyFilters = useCallback((overrides: Record<string, string> = {}) => {
    const params = new URLSearchParams();
    const merged = {
      search, category, sort: sortBy,
      min_price: minPrice, max_price: maxPrice,
      min_rating: minRating, radius: String(radius),
      ...overrides,
    };
    Object.entries(merged).forEach(([k, v]) => { if (v && v !== '50' || k === 'sort') params.set(k, v); });
    navigate(`/services?${params.toString()}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, sortBy, minPrice, maxPrice, minRating, radius]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    setShowHistory(false);
    if (search.trim().length >= 2) {
      setSearchHistory(prev => {
        const next = [search.trim(), ...prev.filter(h => h !== search.trim())].slice(0, 5);
        localStorage.setItem('tolemate_search_history', JSON.stringify(next));
        return next;
      });
    }
    applyFilters();
  };

  // ── Autocomplete suggestions ──────────────────────────────────────────────
  useEffect(() => {
    if (!search || search.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/services/search?query=${encodeURIComponent(search)}&per_page=5`);
        if (res.ok) {
          const data = await res.json();
          const results = (data.data || data).slice(0, 5);
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
        }
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Click outside closes autocomplete ────────────────────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Toggle favorite ───────────────────────────────────────────────────────
  const toggleFavorite = useCallback((e: React.MouseEvent, serviceId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId];
      localStorage.setItem('tolemate_favorites', JSON.stringify(next));
      return next;
    });
  }, []);

  // ── Near me handler ───────────────────────────────────────────────────────
  const handleNearMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCoords(c);
      setNearMeActive(true);
    }, () => {});
  };

  const removeFilter = (key: string) => {
    const params = new URLSearchParams(location.search);
    params.delete(key);
    navigate(`/services?${params.toString()}`);
  };

  const clearAll = () => navigate('/services');

  // ── Active filter chips ────────────────────────────────────────────────────
  const activeChips: { key: string; label: string }[] = [];
  const cp = new URLSearchParams(location.search);
  if (cp.get('search'))     activeChips.push({ key: 'search',     label: `"${cp.get('search')}"` });
  if (cp.get('category')) {
    const cat = categories.find(c => String(c.id) === cp.get('category'));
    activeChips.push({ key: 'category', label: cat?.name ?? cp.get('category')! });
  }
  if (cp.get('min_price'))  activeChips.push({ key: 'min_price',  label: `Min Rs.${cp.get('min_price')}` });
  if (cp.get('max_price'))  activeChips.push({ key: 'max_price',  label: `Max Rs.${cp.get('max_price')}` });
  if (cp.get('min_rating')) activeChips.push({ key: 'min_rating', label: `${cp.get('min_rating')}+ ★` });
  if (cp.get('sort') && cp.get('sort') !== 'newest') {
    const s = SORT_OPTIONS.find(o => o.value === cp.get('sort'));
    activeChips.push({ key: 'sort', label: s?.label ?? cp.get('sort')! });
  }

  const sortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Newest first';

  return (
    <>
      <SeoHead
        title={`Browse Services${search ? ` – "${search}"` : ''}`}
        description="Find and book trusted local professionals near you. Filter by category, price, rating, and distance."
        keywords="services, local professionals, booking, Nepal"
        canonicalUrl={window.location.href}
      />
    <div className="min-h-screen py-8">
      <div className="container-custom">

        {/* ── Page header ── */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Browse Services</h1>
          <p className="text-gray-500 text-sm">Find trusted professionals near you</p>
        </div>

        {/* ── Top search bar ── */}
        <div className="card p-4 mb-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="flex-1 relative" ref={autocompleteRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="What service do you need?"
                className="input-field pl-10 pr-4"
                value={search}
                onChange={e => { setSearch(e.target.value); }}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                  else if (searchHistory.length > 0 && !search) setShowHistory(true);
                }}
                autoComplete="off"
              />
              {/* Search history dropdown */}
              {showHistory && !showSuggestions && searchHistory.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Recent searches</span>
                    <button type="button" onMouseDown={() => { localStorage.removeItem('tolemate_search_history'); setSearchHistory([]); setShowHistory(false); }} className="text-xs text-red-400 hover:text-red-600 transition-colors">Clear</button>
                  </div>
                  {searchHistory.map((h, i) => (
                    <button key={i} type="button"
                      onMouseDown={() => { setSearch(h); setShowHistory(false); applyFilters({ search: h }); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors">
                      <Clock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{h}</span>
                    </button>
                  ))}
                </div>
              )}
              {/* Autocomplete dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  {suggestions.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={() => { navigate(`/services/${s.id}`); setShowSuggestions(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={getServiceImage(s)} alt={s.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                        <p className="text-xs text-gray-400 truncate">{s.category?.name} · {s.vendor?.business_name}</p>
                      </div>
                      <span className="text-sm font-semibold text-primary-600 flex-shrink-0">
                        {s.price ? `Rs. ${Number(s.price).toLocaleString()}` : 'Quote'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="submit" className="btn-primary px-5">Search</button>
            <button
              type="button"
              onClick={handleNearMe}
              title="Find services near me"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors flex-shrink-0 ${
                nearMeActive
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <LocateFixed className="w-4 h-4" />
              <span className="hidden sm:inline">{nearMeActive ? 'Near me ✓' : 'Near me'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                showFilters || activeChips.length > 0
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeChips.length > 0 && (
                <span className="w-5 h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center">
                  {activeChips.length}
                </span>
              )}
            </button>
          </form>

          {/* Active filter chips */}
          {activeChips.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-400">Active:</span>
              {activeChips.map(chip => (
                <button
                  key={chip.key}
                  onClick={() => removeFilter(chip.key)}
                  className="flex items-center gap-1 bg-primary-50 text-primary-700 border border-primary-200 text-xs px-2.5 py-1 rounded-full hover:bg-primary-100 transition-colors"
                >
                  {chip.label}
                  <X className="w-3 h-3" />
                </button>
              ))}
              <button onClick={clearAll} className="text-xs text-gray-400 hover:text-red-500 underline ml-1">
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* ── Expandable filter panel ── */}
        {showFilters && (
          <div className="card p-5 mb-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Category</label>
                <select
                  className="input-field text-sm"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  <option value="">All categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Price range */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Price Range (Rs.)</label>
                {/* Quick presets */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    { label: 'Under 500',   min: '',    max: '500' },
                    { label: '500–2k',      min: '500', max: '2000' },
                    { label: '2k–5k',       min: '2000',max: '5000' },
                    { label: '5k+',         min: '5000',max: '' },
                  ].map(p => {
                    const active = minPrice === p.min && maxPrice === p.max;
                    return (
                      <button key={p.label} type="button"
                        onClick={() => { setMinPrice(p.min); setMaxPrice(p.max); }}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-colors font-medium ${
                          active ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600'
                        }`}
                      >{p.label}</button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="0" placeholder="Min"
                    className="input-field text-sm w-full"
                    value={minPrice}
                    onChange={e => setMinPrice(e.target.value)}
                  />
                  <span className="text-gray-400 text-sm flex-shrink-0">–</span>
                  <input
                    type="number" min="0" placeholder="Max"
                    className="input-field text-sm w-full"
                    value={maxPrice}
                    onChange={e => setMaxPrice(e.target.value)}
                  />
                </div>
              </div>

              {/* Min rating */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Minimum Rating</label>
                <div className="flex gap-1.5 flex-wrap">
                  {RATING_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMinRating(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        minRating === opt.value
                          ? 'bg-yellow-400 border-yellow-400 text-white'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-yellow-300'
                      }`}
                    >
                      {opt.value ? `${opt.value} ★` : 'Any'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Radius */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                  <MapPin className="w-3.5 h-3.5 inline mr-1" />
                  Radius: <span className="text-primary-600 font-bold">{radius} km</span>
                </label>
                <input
                  type="range" min="5" max="100" step="5"
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                  value={radius}
                  onChange={e => setRadius(parseInt(e.target.value))}
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>5 km</span><span>100 km</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={clearAll}
                className="btn-secondary text-sm"
              >
                Reset all
              </button>
              <button
                type="button"
                onClick={() => { setShowFilters(false); applyFilters(); }}
                className="btn-primary text-sm px-6"
              >
                Apply filters
              </button>
            </div>
          </div>
        )}

        {/* ── Results bar ── */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-gray-500">
            {loading ? 'Searching…' : (
              <>
                <span className="font-semibold text-gray-800">{total}</span> service{total !== 1 ? 's' : ''} found
              </>
            )}
          </p>

          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              {([['grid', LayoutGrid], ['list', List], ['map', Map]] as const).map(([mode, Icon]) => (
                <button key={mode}
                  onClick={() => setViewMode(mode)}
                  title={mode.charAt(0).toUpperCase() + mode.slice(1) + ' view'}
                  className={`p-2 transition-colors ${viewMode === mode ? 'bg-primary-600 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>

            {/* Sort dropdown (hidden in map mode) */}
            {viewMode !== 'map' && (
            <div className="relative">
            <button
              onClick={() => document.getElementById('sort-menu')?.classList.toggle('hidden')}
              className="flex items-center gap-2 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white hover:bg-gray-50 transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-700">{sortLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
            <div
              id="sort-menu"
              className="hidden absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 w-48"
            >
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setSortBy(opt.value);
                    document.getElementById('sort-menu')?.classList.add('hidden');
                    applyFilters({ sort: opt.value });
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    sortBy === opt.value
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {opt.value === sortBy && <span className="mr-1.5">✓</span>}
                  {opt.label}
                </button>
              ))}
            </div>
            </div>
            )}
          </div>
        </div>

        {/* ── Results ── */}
        {loading ? (
          viewMode === 'map'
            ? <div className="py-20 flex justify-center"><div className="spinner" /></div>
            : <ServicesGridSkeleton count={6} viewMode={viewMode === 'list' ? 'list' : 'grid'} />
        ) : services.length === 0 ? (
          <div className="card p-12 text-center">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No services found</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
              Try adjusting your filters, search term, or increasing the radius.
            </p>
            <button onClick={clearAll} className="btn-primary">Clear all filters</button>
          </div>
        ) : viewMode === 'map' ? (
          <ServiceMapView services={services} userCoords={coords} radius={radius} />
        ) : viewMode === 'list' ? (
          <div className="space-y-3">
            {services.map(service => (
              <Link key={service.id} to={`/services/${service.id}`}
                className="card flex gap-4 p-4 hover:shadow-md transition-all duration-200 group">
                <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden">
                  <img src={getServiceImage(service)} alt={service.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs text-gray-400 font-medium">{service.category?.name}</span>
                      <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">{service.name}</h3>
                    </div>
                    <div className="flex items-start gap-2 flex-shrink-0">
                      <button onClick={e => toggleFavorite(e, service.id)} title={favorites.includes(service.id) ? 'Remove from favorites' : 'Add to favorites'}
                        className="p-1 rounded-full transition-colors hover:bg-red-50">
                        <Heart className={`w-4 h-4 transition-colors ${favorites.includes(service.id) ? 'fill-red-500 text-red-500' : 'text-gray-300'}`} />
                      </button>
                      <div className="text-right">
                        <p className="font-bold text-primary-600">{service.price ? `Rs. ${Number(service.price).toLocaleString()}` : 'Free quote'}</p>
                        <div className="flex items-center gap-1 justify-end text-xs text-gray-500">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          {service.vendor?.rating ? Number(service.vendor.rating).toFixed(1) : 'New'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-1 mt-1">{service.description}</p>
                  <div className="flex items-center gap-2 mt-2 cursor-pointer hover:opacity-75" onClick={e => { e.preventDefault(); e.stopPropagation(); if (service.vendor?.id) navigate(`/vendors/${service.vendor.id}`); }}>
                    <div className="w-5 h-5 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-[10px] font-bold">{service.vendor?.business_name?.charAt(0)}</div>
                    <span className="text-xs text-gray-500">{service.vendor?.business_name}</span>
                    {service.vendor?.is_verified && <span className="text-blue-500 text-xs">✓</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map(service => (
              <Link
                to={`/services/${service.id}`}
                key={service.id}
                className="card group overflow-hidden flex flex-col hover:shadow-lg transition-all duration-200"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={getServiceImage(service)}
                    alt={service.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <span className="absolute top-3 left-3 text-xs bg-white/90 text-gray-700 px-2.5 py-1 rounded-full font-medium shadow-sm">
                    {service.category?.name}
                  </span>
                  {service.vendor?.available_today && (
                    <span className="absolute bottom-3 left-3 text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full font-semibold shadow-sm">
                      ✓ Available today
                    </span>
                  )}
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    <button
                      onClick={e => toggleFavorite(e, service.id)}
                      title={favorites.includes(service.id) ? 'Remove from favorites' : 'Save'}
                      className="p-1.5 rounded-full bg-white/90 shadow-sm hover:bg-white transition-colors"
                    >
                      <Heart className={`w-3.5 h-3.5 transition-colors ${favorites.includes(service.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                    </button>
                    <div className="flex items-center gap-1 bg-white/90 text-gray-700 px-2 py-0.5 rounded-full text-xs shadow-sm">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span className="font-medium">{service.vendor?.rating ? Number(service.vendor.rating).toFixed(1) : 'New'}</span>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="bg-white text-gray-900 text-sm font-semibold px-5 py-2 rounded-xl shadow-lg transform -translate-y-1 group-hover:translate-y-0 transition-transform duration-200">Book Now →</span>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-semibold text-gray-900 mb-1.5 group-hover:text-primary-600 transition-colors line-clamp-1">{service.name}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1 leading-relaxed">{service.description}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 cursor-pointer hover:opacity-75 transition-opacity" onClick={e => { e.preventDefault(); e.stopPropagation(); if (service.vendor?.id) navigate(`/vendors/${service.vendor.id}`); }}>
                      <div className="w-7 h-7 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{service.vendor?.business_name?.charAt(0) || '?'}</div>
                      <div className="flex items-center gap-1 min-w-0">
                        <p className="text-xs text-gray-500 line-clamp-1 max-w-[90px]">{service.vendor?.business_name}</p>
                        {service.vendor?.is_verified && <span title="Verified" className="text-blue-500 flex-shrink-0">✓</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">From</p>
                      <p className="text-base font-bold text-primary-600">
                        {service.price ? `Rs. ${Number(service.price).toLocaleString()}` : 'Free quote'}
                        {service.pricing_type === 'hourly' && <span className="text-xs text-gray-400 font-normal">/hr</span>}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Load more */}
        {viewMode !== 'map' && services.length > 0 && services.length < total && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchServices(new URLSearchParams(location.search), nextPage, true);
              }}
              disabled={loadingMore}
              className="btn-outline px-8 py-2.5 flex items-center gap-2 disabled:opacity-50"
            >
              {loadingMore ? (
                <><div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />Loading...</>
              ) : (
                <>Load more <span className="text-gray-400 text-sm">({total - services.length} remaining)</span></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default Services;
