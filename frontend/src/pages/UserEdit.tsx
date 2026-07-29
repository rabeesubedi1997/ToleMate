import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { API_BASE } from '../utils/config';
import SeoHead from '../components/SeoHead';

const UserEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', role: 'customer' });

  useEffect(() => { fetchUser(); }, [id]);

  const fetchUser = async () => {
    const res = await fetch(`${API_BASE}/api/admin/users/${id}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) {
      const data = await res.json();
      setFormData({ name: data.name, email: data.email, role: data.role });
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(formData)
      });
      if (res.ok) navigate('/admin-dashboard');
      else { const data = await res.json(); setError(data.message || 'Update failed'); }
    } catch (err) { setError('Connection error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="spinner"></div></div>;

  return (
    <>
      <SeoHead
        title="Edit User"
        description="Admin: Edit user details on ToleMate."
        noIndex={true}
      />
    <div className="min-h-screen py-8 animate-fade-in">
      <div className="container-custom max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit user</h1>
            <p className="text-sm text-gray-500">Manage permissions and account details</p>
          </div>
          <button onClick={() => navigate(-1)} className="btn-secondary text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>

        <div className="card p-6 md:p-8">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
              <input type="text" required className="input-field" value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input type="email" required className="input-field" value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
              <div className="grid grid-cols-3 gap-2">
                {['customer', 'vendor', 'admin'].map(role => (
                  <button key={role} type="button" onClick={() => setFormData({...formData, role})}
                    className={`py-2.5 rounded-lg border text-sm font-medium transition-all capitalize ${
                      formData.role === role
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}>{role}</button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex gap-3">
              <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </>
  );
};

export default UserEdit;
