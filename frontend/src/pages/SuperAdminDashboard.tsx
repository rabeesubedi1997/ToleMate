import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../utils/config';
import { useToast } from '../context/ToastContext';
import SeoHead from '../components/SeoHead';
import {
  LayoutDashboard, Users, Store, Briefcase, Shield, Activity, CheckCircle, XCircle, Clock,
  Plus, Trash2, Search, ChevronDown, ExternalLink, RefreshCw, DollarSign
} from 'lucide-react';

const API = `${API_BASE}/api`;

type OverviewTab = 'overview' | 'moderation' | 'admins' | 'logs' | 'commissions';

const SuperAdminDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<OverviewTab>('overview');
  const [overview, setOverview] = useState<any>(null);
  const [pendingServices, setPendingServices] = useState<any[]>([]);
  const [allServices, setAllServices] = useState<any[]>([]);
  const [moderationFilter, setModerationFilter] = useState('pending');
  const [admins, setAdmins] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Commission state
  const [commissions, setCommissions] = useState<any[]>([]);
  const [commissionStats, setCommissionStats] = useState<any>(null);
  const [commissionFilter, setCommissionFilter] = useState('');
  const [newRate, setNewRate] = useState('10');
  const [showRateModal, setShowRateModal] = useState(false);

  // Create admin modal
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '', role: 'admin' });

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' };

  const fetchOverview = useCallback(async () => {
    const r = await fetch(`${API}/super-admin/overview`, { headers });
    if (r.ok) setOverview(await r.json());
  }, [token]);

  const fetchPendingServices = useCallback(async () => {
    const r = await fetch(`${API}/super-admin/services/moderation?status=${moderationFilter}`, { headers });
    if (r.ok) {
      const d = await r.json();
      setAllServices(d.data || d);
    }
  }, [token, moderationFilter]);

  const fetchAdmins = useCallback(async () => {
    const r = await fetch(`${API}/super-admin/admins`, { headers });
    if (r.ok) setAdmins(await r.json());
  }, [token]);

  const fetchLogs = useCallback(async () => {
    const r = await fetch(`${API}/super-admin/activity-logs`, { headers });
    if (r.ok) {
      const d = await r.json();
      setLogs(d.data || d);
    }
  }, [token]);

  const fetchCommissions = useCallback(async () => {
    const params = commissionFilter ? `?status=${commissionFilter}` : '';
    const r = await fetch(`${API}/super-admin/commissions${params}`, { headers });
    if (r.ok) {
      const d = await r.json();
      setCommissions(d.data || d);
    }
  }, [token, commissionFilter]);

  const fetchCommissionStats = useCallback(async () => {
    const r = await fetch(`${API}/super-admin/commissions/stats`, { headers });
    if (r.ok) {
      const d = await r.json();
      setCommissionStats(d);
      setNewRate(String(d.default_rate ?? 10));
    }
  }, [token]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchOverview(),
      fetchPendingServices(),
      fetchAdmins(),
      fetchLogs(),
      fetchCommissions(),
      fetchCommissionStats(),
    ]).finally(() => setLoading(false));
  }, [fetchOverview, fetchPendingServices, fetchAdmins, fetchLogs, fetchCommissions, fetchCommissionStats]);

  useEffect(() => {
    if (activeTab === 'moderation') fetchPendingServices();
    if (activeTab === 'admins') fetchAdmins();
    if (activeTab === 'logs') fetchLogs();
    if (activeTab === 'commissions') { fetchCommissions(); fetchCommissionStats(); }
  }, [activeTab, fetchPendingServices, fetchAdmins, fetchLogs, fetchCommissions, fetchCommissionStats]);

  const handleApprove = async (id: number) => {
    setActionLoading(`approve-${id}`);
    const r = await fetch(`${API}/super-admin/services/${id}/approve`, { method: 'POST', headers });
    if (r.ok) { toast('Service approved', 'success'); fetchPendingServices(); fetchOverview(); }
    else { const d = await r.json(); toast(d.message || 'Failed to approve', 'error'); }
    setActionLoading(null);
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    setActionLoading(`reject-${id}`);
    const r = await fetch(`${API}/super-admin/services/${id}/reject`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
    if (r.ok) { toast('Service rejected', 'success'); fetchPendingServices(); fetchOverview(); }
    else { const d = await r.json(); toast(d.message || 'Failed to reject', 'error'); }
    setActionLoading(null);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch(`${API}/super-admin/admins`, { method: 'POST', headers, body: JSON.stringify(newAdmin) });
    if (r.ok) { toast('Admin created', 'success'); setShowCreateAdmin(false); setNewAdmin({ name: '', email: '', password: '', role: 'admin' }); fetchAdmins(); }
    else { const d = await r.json(); toast(d.message || 'Failed to create admin', 'error'); }
  };

  const handleDeleteAdmin = async (id: number) => {
    if (!window.confirm('Delete this admin? This cannot be undone.')) return;
    const r = await fetch(`${API}/super-admin/admins/${id}`, { method: 'DELETE', headers });
    if (r.ok) { toast('Admin deleted', 'success'); fetchAdmins(); }
    else { const d = await r.json(); toast(d.message || 'Failed to delete', 'error'); }
  };

  const handleSuspendAdmin = async (id: number) => {
    const r = await fetch(`${API}/super-admin/admins/${id}/suspend`, { method: 'PUT', headers });
    if (r.ok) { toast('Admin status toggled', 'success'); fetchAdmins(); }
    else { const d = await r.json(); toast(d.message || 'Failed to suspend', 'error'); }
  };

  const sidebarTabs = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'moderation', label: 'Moderation', icon: Clock },
    { key: 'commissions', label: 'Commissions', icon: DollarSign },
    { key: 'admins', label: 'Admins', icon: Shield },
    { key: 'logs', label: 'Activity Log', icon: Activity },
  ] as const;

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      draft: 'bg-gray-100 text-gray-500',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[s] || 'bg-gray-100 text-gray-600'}`}>{s}</span>;
  };

  return (
    <>
      <SeoHead title="Super Admin Panel" description="ToleMate super administration panel" noIndex={true} />
      <div className="min-h-screen flex bg-gray-50">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-gray-200 flex-shrink-0 hidden md:block">
          <div className="p-4 border-b border-gray-100">
            <h1 className="text-lg font-bold text-gray-900">Super Admin</h1>
            <p className="text-xs text-gray-400 mt-0.5">Platform oversight</p>
          </div>
          <nav className="p-3 space-y-1">
            {sidebarTabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-100 mt-auto">
            <p className="text-xs text-gray-400">{user?.name}</p>
            <p className="text-xs font-medium text-primary-600">super_admin</p>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 p-6 overflow-auto">
          {/* ═══ OVERVIEW ═══ */}
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Platform Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="card p-4"><p className="text-2xl font-bold text-gray-900">{overview?.total_users ?? '—'}</p><p className="text-xs text-gray-400 mt-1">Total Users</p></div>
                <div className="card p-4"><p className="text-2xl font-bold text-gray-900">{overview?.total_vendors ?? '—'}</p><p className="text-xs text-gray-400 mt-1">Total Vendors</p></div>
                <div className="card p-4"><p className="text-2xl font-bold text-gray-900">{overview?.total_admins ?? '—'}</p><p className="text-xs text-gray-400 mt-1">Admins</p></div>
                <div className="card p-4"><p className="text-2xl font-bold text-gray-900">{overview?.total_services ?? '—'}</p><p className="text-xs text-gray-400 mt-1">Total Services</p></div>
                <div className="card p-4"><p className="text-2xl font-bold text-green-600">{overview?.active_services ?? '—'}</p><p className="text-xs text-gray-400 mt-1">Active</p></div>
                <div className="card p-4"><p className="text-2xl font-bold text-yellow-600">{overview?.pending_services ?? '—'}</p><p className="text-xs text-gray-400 mt-1">Pending Approval</p></div>
                <div className="card p-4"><p className="text-2xl font-bold text-red-600">{overview?.rejected_services ?? '—'}</p><p className="text-xs text-gray-400 mt-1">Rejected</p></div>
                <div className="card p-4"><p className="text-2xl font-bold text-blue-600">{overview?.total_bookings ?? '—'}</p><p className="text-xs text-gray-400 mt-1">Bookings</p></div>
              </div>
              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Quick Links</h3>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => setActiveTab('moderation')} className="btn-primary text-sm flex items-center gap-2"><Clock className="w-4 h-4" /> Service Moderation</button>
                  <button onClick={() => setActiveTab('admins')} className="btn-secondary text-sm flex items-center gap-2"><Shield className="w-4 h-4" /> Manage Admins</button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ MODERATION ═══ */}
          {activeTab === 'moderation' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Service Moderation</h2>
              <div className="flex gap-2 mb-4">
                {['pending', 'approved', 'rejected', 'draft'].map(s => (
                  <button key={s} onClick={() => setModerationFilter(s)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${moderationFilter === s ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                  >{s.charAt(0).toUpperCase() + s.slice(1)}</button>
                ))}
                <button onClick={fetchPendingServices} className="ml-auto p-2 text-gray-400 hover:text-gray-600"><RefreshCw className="w-4 h-4" /></button>
              </div>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead><tr className="bg-gray-50 text-xs text-gray-500 font-medium">
                      <th className="p-4">Service</th><th className="p-4">Vendor</th><th className="p-4">Price</th><th className="p-4">Status</th><th className="p-4">Created</th><th className="p-4 text-right">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {allServices.map((s: any) => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="p-4"><p className="text-sm font-medium text-gray-900">{s.name}</p><p className="text-xs text-gray-400">{s.category?.name}</p></td>
                          <td className="p-4 text-sm text-gray-700">{s.vendor?.business_name || s.vendor?.user?.name || '—'}</td>
                          <td className="p-4 text-sm text-gray-700">Rs. {s.price || '—'}</td>
                          <td className="p-4">{statusBadge(s.status)}</td>
                          <td className="p-4 text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString()}</td>
                          <td className="p-4 text-right">
                            {s.status === 'pending' && (
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => handleApprove(s.id)} disabled={actionLoading === `approve-${s.id}`}
                                  className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50">Approve</button>
                                <button onClick={() => handleReject(s.id)} disabled={actionLoading === `reject-${s.id}`}
                                  className="px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50">Reject</button>
                              </div>
                            )}
                            {s.rejection_reason && (
                              <p className="text-xs text-red-500 mt-1" title={s.rejection_reason}>Reason: {s.rejection_reason.substring(0, 50)}...</p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {allServices.length === 0 && <p className="text-sm text-gray-400 p-6 text-center">No {moderationFilter} services found.</p>}
                </div>
              </div>
            </div>
          )}

          {/* ═══ ADMINS ═══ */}
          {activeTab === 'admins' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Admin Management</h2>
                <button onClick={() => setShowCreateAdmin(true)} className="btn-primary text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Create Admin</button>
              </div>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead><tr className="bg-gray-50 text-xs text-gray-500 font-medium">
                      <th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Role</th><th className="p-4">Status</th><th className="p-4">Since</th><th className="p-4 text-right">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {admins.map((a: any) => (
                        <tr key={a.id} className="hover:bg-gray-50">
                          <td className="p-4 text-sm font-medium text-gray-900">{a.name}</td>
                          <td className="p-4 text-sm text-gray-600">{a.email}</td>
                          <td className="p-4 text-sm">
                            <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${a.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{a.role}</span>
                          </td>
                          <td className="p-4"><span className={`text-xs font-medium ${a.is_active !== false ? 'text-green-600' : 'text-red-600'}`}>{a.is_active !== false ? 'Active' : 'Suspended'}</span></td>
                          <td className="p-4 text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString()}</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {a.id !== user?.id && (
                                <>
                                  <button onClick={() => handleSuspendAdmin(a.id)} className={`text-xs font-medium hover:underline ${a.is_active !== false ? 'text-yellow-600' : 'text-green-600'}`}>{a.is_active !== false ? 'Suspend' : 'Activate'}</button>
                                  <button onClick={() => handleDeleteAdmin(a.id)} className="text-red-600 text-xs font-medium hover:underline">Delete</button>
                                </>
                              )}
                              {a.id === user?.id && <span className="text-xs text-gray-400">(you)</span>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {showCreateAdmin && (
                <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center" onClick={() => setShowCreateAdmin(false)}>
                  <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Create Admin</h3>
                    <form onSubmit={handleCreateAdmin} className="space-y-4">
                      <div><label className="text-xs font-medium text-gray-600 mb-1 block">Name</label><input className="input-field" value={newAdmin.name} onChange={e => setNewAdmin({...newAdmin, name: e.target.value})} required /></div>
                      <div><label className="text-xs font-medium text-gray-600 mb-1 block">Email</label><input type="email" className="input-field" value={newAdmin.email} onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} required /></div>
                      <div><label className="text-xs font-medium text-gray-600 mb-1 block">Password</label><input type="password" className="input-field" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} required minLength={8} /></div>
                      <div><label className="text-xs font-medium text-gray-600 mb-1 block">Role</label>
                        <select className="input-field" value={newAdmin.role} onChange={e => setNewAdmin({...newAdmin, role: e.target.value})}>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setShowCreateAdmin(false)} className="btn-secondary flex-1">Cancel</button>
                        <button type="submit" className="btn-primary flex-1">Create</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ COMMISSIONS ═══ */}
          {activeTab === 'commissions' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Commission Management</h2>
                <button onClick={() => { setShowRateModal(true); fetchCommissionStats(); }} className="btn-primary text-sm flex items-center gap-2">Set Rate</button>
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
                <button onClick={fetchCommissions} className="ml-auto p-2 text-gray-400 hover:text-gray-600"><RefreshCw className="w-4 h-4" /></button>
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
                          <td className="p-4">
                            <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${c.status === 'paid' ? 'bg-green-100 text-green-700' : c.status === 'refunded' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{c.status}</span>
                          </td>
                          <td className="p-4 text-xs text-gray-400">{c.paid_at ? new Date(c.paid_at).toLocaleDateString() : '—'}</td>
                          <td className="p-4 text-right">
                            {c.status === 'pending' && (
                              <button onClick={async () => {
                                const r = await fetch(`${API}/super-admin/commissions/${c.id}/pay`, { method: 'PUT', headers });
                                if (r.ok) { toast('Commission marked as paid', 'success'); fetchCommissions(); fetchCommissionStats(); }
                                else toast('Failed to update', 'error');
                              }} className="text-xs font-medium text-green-600 hover:underline">Mark Paid</button>
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
                      <input type="number" step="0.1" min="0" max="100" className="input-field" value={newRate}
                        onChange={e => setNewRate(e.target.value)} />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setShowRateModal(false)} className="btn-secondary flex-1">Cancel</button>
                      <button onClick={async () => {
                        const r = await fetch(`${API}/super-admin/commissions/rate`, { method: 'POST', headers, body: JSON.stringify({ rate: parseFloat(newRate) }) });
                        if (r.ok) { toast('Rate updated', 'success'); setShowRateModal(false); fetchCommissionStats(); }
                        else toast('Failed to update rate', 'error');
                      }} className="btn-primary flex-1">Save</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ ACTIVITY LOGS ═══ */}
          {activeTab === 'logs' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Activity Log</h2>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead><tr className="bg-gray-50 text-xs text-gray-500 font-medium">
                      <th className="p-4">Admin</th><th className="p-4">Action</th><th className="p-4">Target</th><th className="p-4">Details</th><th className="p-4">Time</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {logs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="p-4 text-sm text-gray-900">{log.user?.name || '—'}</td>
                          <td className="p-4"><span className="text-xs font-medium rounded-full px-2 py-0.5 bg-gray-100 text-gray-700">{log.action}</span></td>
                          <td className="p-4 text-xs text-gray-500">{log.subject_type ? log.subject_type.split('\\').pop() : '—'} #{log.subject_id || '—'}</td>
                          <td className="p-4 text-xs text-gray-500 max-w-xs truncate">
                            {log.new_values ? JSON.stringify(log.new_values).substring(0, 60) : '—'}
                          </td>
                          <td className="p-4 text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {logs.length === 0 && <p className="text-sm text-gray-400 p-6 text-center">No activity logs yet.</p>}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default SuperAdminDashboard;