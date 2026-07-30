import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Search, Star, ChevronRight } from 'lucide-react';
import api from '../utils/api';
import { FALLBACK_IMAGE, assetUrl } from '../utils/config';
import SeoHead from '../components/SeoHead';
import { serviceUrl } from '../utils/slug';

const CategoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [category, setCategory] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'price_asc' | 'price_desc' | 'rating'>('rating');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    setPage(1);
    setServices([]);
    fetchCategory();
    fetchServices(1, true);
  }, [id, search, sort]);

  const fetchCategory = async () => {
    try {
      const r = await api.get('/categories');
      const cats = r.data;
      const cat = (Array.isArray(cats) ? cats : cats.data || []).find((c: any) => String(c.id) === String(id));
      if (cat) setCategory(cat);
    } catch (e) { console.error(e); }
  };

  const fetchServices = async (pageNum: number, reset = false) => {
    setLoading(true);
    try {
      const params: any = { category_id: id || '', page: String(pageNum) };
      if (search) params.query = search;
      const r = await api.get('/services/search', { params });
      const d = r.data;
      const list = d.data || d;
      setServices(reset ? list : prev => [...prev, ...list]);
      setHasMore(d.next_page_url ? true : false);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const sorted = [...services].sort((a, b) => {
    if (sort === 'price_asc') return (a.price || 0) - (b.price || 0);
    if (sort === 'price_desc') return (b.price || 0) - (a.price || 0);
    return (b.vendor?.rating || 0) - (a.vendor?.rating || 0);
  });

  return (
    <>
      <SeoHead
        title={`${category?.name || 'Category'} Services`}
        description={`Browse and book ${category?.name || 'local'} services on ToleMate. Find verified professionals near you.`}
        canonicalUrl={window.location.href}
      />
    <div className="min-h-screen py-8 bg-gray-50">
      <div className="container-custom">

        <div className="flex items-center gap-2 text-sm text-gray-400 mb-5">
          <Link to="/services" className="hover:text-primary-600 flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> All services</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-700 font-medium">{category?.name || 'Category'}</span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{category?.name || 'Services'}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{services.length} service{services.length !== 1 ? 's' : ''} available</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search in category..." className="input-field pl-9 text-sm py-2 w-full"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="input-field text-sm py-2 w-auto" value={sort} onChange={e => setSort(e.target.value as any)}>
              <option value="rating">Top rated</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </div>
        </div>

        {loading && services.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="card overflow-hidden animate-pulse">
                <div className="h-44 bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Search className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="font-medium">No services found</p>
            <p className="text-sm mt-1">Try a different search</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {sorted.map(service => {
                const img = service.images?.[0]?.image_url;
                return (
                  <Link key={service.id} to={serviceUrl(service)}
                    className="card overflow-hidden hover:shadow-lg transition-shadow group block">
                    <div className="relative h-44 bg-gradient-to-br from-primary-100 to-primary-200 overflow-hidden">
                      {img ? (
                        <img src={assetUrl(img)} alt={service.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-4xl font-bold text-primary-300">{service.name.charAt(0)}</span>
                        </div>
                      )}
                      {service.vendor?.available_today && (
                        <span className="absolute bottom-3 left-3 text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full font-semibold shadow-sm">
                          ✓ Available today
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-1">{service.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 mb-2 line-clamp-2">{service.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {service.vendor?.rating > 0 && (
                            <span className="flex items-center gap-0.5 text-xs font-medium text-gray-600">
                              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                              {Number(service.vendor.rating).toFixed(1)}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">{service.vendor?.business_name}</span>
                        </div>
                        <p className="font-bold text-primary-700 text-sm">
                          {service.price ? `Rs. ${Number(service.price).toLocaleString()}` : 'Quote'}
                          {service.pricing_type === 'hourly' ? '/hr' : ''}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {hasMore && (
              <div className="text-center mt-8">
                <button onClick={() => { const next = page + 1; setPage(next); fetchServices(next); }}
                  disabled={loading} className="btn-secondary px-8">
                  {loading ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
    </>
  );
};

export default CategoryPage;
