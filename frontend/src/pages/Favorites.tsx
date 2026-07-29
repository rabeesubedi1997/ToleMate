import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star, Trash2, Search, MapPin, CheckCircle } from 'lucide-react';
import { getServiceImage } from '../utils/serviceImage';
import { API_BASE, FALLBACK_IMAGE } from '../utils/config';
import SeoHead from '../components/SeoHead';
import { ServiceCardSkeleton } from '../components/Skeleton';

const Favorites: React.FC = () => {
  const [tab, setTab] = useState<'services' | 'vendors'>('services');
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Vendor favorites
  const [favVendorIds, setFavVendorIds] = useState<number[]>([]);
  const [favVendors, setFavVendors] = useState<any[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);

  // Load IDs from localStorage
  useEffect(() => {
    try {
      const ids: number[] = JSON.parse(localStorage.getItem('tolemate_favorites') || '[]');
      setFavoriteIds(ids);
    } catch { setFavoriteIds([]); }
    try {
      const vids: number[] = JSON.parse(localStorage.getItem('tolemate_fav_vendors') || '[]');
      setFavVendorIds(vids);
    } catch { setFavVendorIds([]); }
  }, []);

  // Fetch service details for each favorite ID
  useEffect(() => {
    if (!favoriteIds.length) { setLoading(false); setServices([]); return; }
    setLoading(true);
    Promise.all(
      favoriteIds.map(id =>
        fetch(`${API_BASE}/api/services/${id}`)
          .then(r => r.ok ? r.json() : null)
          .then(d => d?.service || null)
          .catch(() => null)
      )
    ).then(results => { setServices(results.filter(Boolean)); }).finally(() => setLoading(false));
  }, [favoriteIds]);

  // Fetch vendor details for each fav vendor ID
  useEffect(() => {
    if (!favVendorIds.length) { setFavVendors([]); return; }
    setVendorsLoading(true);
    Promise.all(
      favVendorIds.map(id =>
        fetch(`${API_BASE}/api/vendors/${id}`)
          .then(r => r.ok ? r.json() : null)
          .then(d => d?.vendor ? { ...d.vendor, review_count: d.review_count, completed_jobs: d.completed_jobs } : null)
          .catch(() => null)
      )
    ).then(results => { setFavVendors(results.filter(Boolean)); }).finally(() => setVendorsLoading(false));
  }, [favVendorIds]);

  const removeFavorite = (serviceId: number) => {
    const next = favoriteIds.filter(id => id !== serviceId);
    setFavoriteIds(next);
    setServices(prev => prev.filter(s => s.id !== serviceId));
    localStorage.setItem('tolemate_favorites', JSON.stringify(next));
  };

  const removeFavVendor = (vendorId: number) => {
    const next = favVendorIds.filter(id => id !== vendorId);
    setFavVendorIds(next);
    setFavVendors(prev => prev.filter(v => v.id !== vendorId));
    localStorage.setItem('tolemate_fav_vendors', JSON.stringify(next));
  };

  const clearAll = () => {
    if (tab === 'vendors') {
      setFavVendorIds([]); setFavVendors([]);
      localStorage.setItem('tolemate_fav_vendors', '[]');
    } else {
      setFavoriteIds([]); setServices([]);
      localStorage.setItem('tolemate_favorites', '[]');
    }
  };

  return (
    <>
      <SeoHead
        title="Favorites"
        description="Your saved services and vendors on ToleMate."
        noIndex={true}
      />
    <div className="min-h-screen py-8">
      <div className="container-custom max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Heart className="w-6 h-6 text-red-500 fill-red-500" />
              Saved
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {tab === 'services' ? `${services.length} service${services.length !== 1 ? 's' : ''}` : `${favVendors.length} vendor${favVendors.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          {(tab === 'services' ? services.length : favVendors.length) > 0 && (
            <button onClick={clearAll} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors">
              <Trash2 className="w-4 h-4" /> Clear all
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('services')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'services' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            Services {services.length > 0 && <span className="ml-1 text-xs opacity-70">({services.length})</span>}
          </button>
          <button onClick={() => setTab('vendors')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'vendors' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            Vendors {favVendors.length > 0 && <span className="ml-1 text-xs opacity-70">({favVendors.length})</span>}
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => <ServiceCardSkeleton key={i} />)}
          </div>
        ) : tab === 'services' ? (
          services.length === 0 ? (
          <div className="card p-16 text-center">
            <Heart className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No saved services yet</h3>
            <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
              Tap the heart icon on any service to save it here for quick access later.
            </p>
            <Link to="/services" className="btn-primary inline-flex items-center gap-2">
              <Search className="w-4 h-4" />
              Browse services
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map(service => (
              <div key={service.id} className="card group overflow-hidden flex flex-col hover:shadow-lg transition-all duration-200 relative">
                {/* Remove button */}
                <button
                  onClick={() => removeFavorite(service.id)}
                  title="Remove from favorites"
                  className="absolute top-3 right-3 z-10 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-red-50 transition-colors"
                >
                  <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                </button>

                <Link to={`/services/${service.id}`} className="flex flex-col flex-1">
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={getServiceImage(service)}
                      alt={service.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
                    />
                    <span className="absolute top-3 left-3 text-xs bg-white/90 text-gray-700 px-2.5 py-1 rounded-full font-medium shadow-sm">
                      {service.category?.name}
                    </span>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-gray-900 mb-1.5 group-hover:text-primary-600 transition-colors line-clamp-1">
                      {service.name}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3 flex-1 leading-relaxed">
                      {service.description}
                    </p>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-medium text-gray-600">
                          {service.vendor?.rating ? Number(service.vendor.rating).toFixed(1) : 'New'}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">{service.vendor?.business_name}</span>
                      </div>
                      <p className="text-sm font-bold text-primary-600">
                        {service.price ? `Rs. ${Number(service.price).toLocaleString()}` : 'Free quote'}
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )
        ) : (
          /* Vendor tab */
          vendorsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map(i => <ServiceCardSkeleton key={i} />)}
            </div>
          ) : favVendors.length === 0 ? (
            <div className="card p-16 text-center">
              <Heart className="w-14 h-14 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No saved vendors yet</h3>
              <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
                Visit a vendor's profile and tap "Save vendor" to bookmark them here.
              </p>
              <Link to="/services" className="btn-primary inline-flex items-center gap-2">
                <Search className="w-4 h-4" /> Browse vendors
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {favVendors.map(vendor => (
                <div key={vendor.id} className="card group p-5 hover:shadow-lg transition-all duration-200 relative">
                  <button onClick={() => removeFavVendor(vendor.id)} title="Remove" className="absolute top-3 right-3 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-red-50 transition-colors border border-gray-100">
                    <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                  </button>
                  <Link to={`/vendors/${vendor.id}`} className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {vendor.avatar ? <img src={vendor.avatar} alt={vendor.business_name} className="w-full h-full object-cover" /> : <span className="text-xl font-bold text-primary-600">{(vendor.business_name || 'V')[0]}</span>}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors truncate">{vendor.business_name}</h3>
                        <p className="text-xs text-gray-500 truncate">{vendor.user?.name}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">{vendor.description || 'No description.'}</p>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="font-medium text-gray-700">{vendor.rating ? Number(vendor.rating).toFixed(1) : 'New'}</span>
                        <span>({vendor.review_count ?? 0} reviews)</span>
                      </div>
                      {vendor.is_verified && <div className="flex items-center gap-1 text-green-600"><CheckCircle className="w-3.5 h-3.5" /> Verified</div>}
                    </div>
                    {vendor.location && <div className="flex items-center gap-1 text-xs text-gray-400"><MapPin className="w-3 h-3" />{vendor.location}</div>}
                  </Link>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
    </>
  );
};

export default Favorites;
