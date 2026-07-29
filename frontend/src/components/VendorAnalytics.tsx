import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Clock, CheckCircle, XCircle, Star, BarChart3 } from 'lucide-react';
import { API_BASE } from '../utils/config';

interface Analytics {
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  active_bookings: number;
  total_revenue: number;
  total_commission: number;
  net_earnings: number;
  avg_response_hours: number;
  completion_rate: number;
  avg_rating: number;
  review_count: number;
  monthly: Record<string, { bookings: number; revenue: number }>;
  top_services: { id: number; name: string; price: number; bookings_count: number }[];
}

const VendorAnalytics: React.FC<{ vendorId?: number; allBookings: any[] }> = ({ vendorId, allBookings }) => {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/vendor/analytics`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) setData(await res.json());
      } catch { } finally { setLoading(false); }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <div className="card p-8 animate-pulse space-y-4"><div className="h-6 bg-gray-200 rounded w-40" /><div className="grid grid-cols-4 gap-4"><div className="h-20 bg-gray-100 rounded" /><div className="h-20 bg-gray-100 rounded" /><div className="h-20 bg-gray-100 rounded" /><div className="h-20 bg-gray-100 rounded" /></div></div>;
  if (!data) return <div className="card p-8 text-center text-sm text-gray-400">Could not load analytics.</div>;

  const stats = [
    { label: 'Total Revenue', value: `Rs. ${data.net_earnings.toLocaleString()}`, icon: DollarSign, color: 'text-green-600' },
    { label: 'Bookings', value: String(data.total_bookings), icon: BarChart3, color: 'text-blue-600' },
    { label: 'Completion Rate', value: `${data.completion_rate}%`, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Avg Response', value: `${data.avg_response_hours}h`, icon: Clock, color: 'text-purple-600' },
    { label: 'Avg Rating', value: `${data.avg_rating} ⭐`, icon: Star, color: 'text-yellow-600' },
    { label: 'Cancelled', value: String(data.cancelled_bookings), icon: XCircle, color: 'text-red-600' },
  ];

  const monthlyEntries = Object.entries(data.monthly || {}).slice(-6);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Analytics</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${s.color}`} />
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            </div>
          );
        })}
      </div>

      {monthlyEntries.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Monthly Revenue</h3>
          <div className="space-y-2">
            {monthlyEntries.map(([month, d]: [string, any]) => (
              <div key={month} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-16">{month}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                  <div className="bg-primary-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, (d.revenue / Math.max(...monthlyEntries.map(([, m]: any) => m.revenue), 1)) * 100)}%` }} />
                </div>
                <span className="text-xs font-medium text-gray-700 w-20 text-right">Rs. {Number(d.revenue).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.top_services.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Top Services</h3>
          <div className="space-y-2">
            {data.top_services.map((s, i) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="text-sm font-medium text-gray-900">{s.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{s.bookings_count} bookings</p>
                  <p className="text-xs font-medium text-green-600">Rs. {Number(s.price || 0).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Earnings Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Gross Revenue</p>
            <p className="text-lg font-bold text-gray-900">Rs. {data.total_revenue.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Platform Commission</p>
            <p className="text-lg font-bold text-red-600">- Rs. {data.total_commission.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg col-span-2">
            <p className="text-green-600 font-medium">Net Earnings</p>
            <p className="text-2xl font-bold text-green-700">Rs. {data.net_earnings.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorAnalytics;
