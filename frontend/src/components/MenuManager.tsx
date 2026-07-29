import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { API_BASE } from '../utils/config';
import { useToast } from '../context/ToastContext';

interface MenuItem {
  id: number; label: string; path: string; icon?: string; order: number;
  parent_id?: number | null; is_active: boolean; role?: string | null;
  children?: MenuItem[];
}

const MenuManager: React.FC = () => {
  const { toast } = useToast();
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState({ label: '', path: '', icon: '', parent_id: '', is_active: true, role: '' });

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' };

  const fetchMenus = async () => {
    const r = await fetch(`${API_BASE}/api/admin/menus`, { headers });
    if (r.ok) {
      const d = await r.json();
      setMenus(d.filter((m: MenuItem) => !m.parent_id).sort((a: MenuItem, b: MenuItem) => a.order - b.order));
    }
    setLoading(false);
  };

  useEffect(() => { fetchMenus(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      ...form,
      order: 0,
      parent_id: form.parent_id ? Number(form.parent_id) : null,
      role: form.role || null,
    };

    const url = editing
      ? `${API_BASE}/api/admin/menus/${editing.id}`
      : `${API_BASE}/api/admin/menus`;
    const method = editing ? 'PUT' : 'POST';

    const r = await fetch(url, { method, headers, body: JSON.stringify(body) });
    if (r.ok) {
      toast(editing ? 'Menu updated' : 'Menu created', 'success');
      resetForm();
      fetchMenus();
    } else {
      const d = await r.json();
      toast(d.message || 'Failed to save', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this menu item? Children will be orphaned.')) return;
    const r = await fetch(`${API_BASE}/api/admin/menus/${id}`, { method: 'DELETE', headers });
    if (r.ok) { toast('Menu deleted', 'success'); fetchMenus(); }
  };

  const resetForm = () => {
    setForm({ label: '', path: '', icon: '', parent_id: '', is_active: true, role: '' });
    setEditing(null);
    setShowForm(false);
  };

  const editItem = (item: MenuItem) => {
    setForm({ label: item.label, path: item.path, icon: item.icon || '', parent_id: item.parent_id ? String(item.parent_id) : '', is_active: item.is_active, role: item.role || '' });
    setEditing(item);
    setShowForm(true);
  };

  const allMenusFlat = menus.flatMap(m => [m, ...(m.children || [])]);

  if (loading) return <div className="card p-8 animate-pulse"><div className="h-6 bg-gray-200 rounded w-40 mb-4" /><div className="space-y-3"><div className="h-10 bg-gray-100 rounded" /><div className="h-10 bg-gray-100 rounded" /><div className="h-10 bg-gray-100 rounded" /></div></div>;

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Navigation Menus</h3>
        <div className="flex items-center gap-2">
          <button onClick={fetchMenus} className="p-2 text-gray-400 hover:text-gray-600"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add Menu Item</button>
        </div>
      </div>

      {showForm && (
        <div className="card p-5 border border-primary-200">
          <h4 className="font-semibold text-gray-900 mb-4">{editing ? 'Edit' : 'Add'} Menu Item</h4>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs font-medium text-gray-600">Label</label>
              <input className="input-field" value={form.label} onChange={e => setForm({...form, label: e.target.value})} required /></div>
            <div><label className="text-xs font-medium text-gray-600">Path</label>
              <input className="input-field" value={form.path} onChange={e => setForm({...form, path: e.target.value})} required placeholder="/services" /></div>
            <div><label className="text-xs font-medium text-gray-600">Icon (optional)</label>
              <input className="input-field" value={form.icon} onChange={e => setForm({...form, icon: e.target.value})} placeholder="Home" /></div>
            <div><label className="text-xs font-medium text-gray-600">Parent (optional)</label>
              <select className="input-field" value={form.parent_id} onChange={e => setForm({...form, parent_id: e.target.value})}>
                <option value="">— Top level —</option>
                {menus.filter(m => !m.parent_id && m.id !== editing?.id).map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
            <div><label className="text-xs font-medium text-gray-600">Role visibility</label>
              <select className="input-field" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                <option value="">All roles</option>
                <option value="customer">Customer</option>
                <option value="vendor">Vendor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} />
                <span className="text-xs text-gray-600">Active</span>
              </label>
            </div>
            <div className="md:col-span-2 flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1">{editing ? 'Update' : 'Create'}</button>
              <button type="button" onClick={resetForm} className="btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        {menus.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No menu items yet. Add your first navigation link.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {menus.map(item => (
              <div key={item.id}>
                <div className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-gray-300" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-400">{item.path}{item.role ? ` (${item.role})` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${item.is_active ? 'text-green-600' : 'text-red-600'}`}>{item.is_active ? 'Active' : 'Inactive'}</span>
                    <button onClick={() => editItem(item)} className="text-xs text-primary-600 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(item.id)} className="text-xs text-red-600 hover:underline"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                {item.children && item.children.map(child => (
                  <div key={child.id} className="flex items-center justify-between p-3 pl-12 hover:bg-gray-50 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">└</span>
                      <p className="text-sm text-gray-700">{child.label}</p>
                      <span className="text-xs text-gray-400">{child.path}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium ${child.is_active ? 'text-green-600' : 'text-red-600'}`}>{child.is_active ? 'Active' : 'Inactive'}</span>
                      <button onClick={() => editItem(child)} className="text-xs text-primary-600 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(child.id)} className="text-xs text-red-600 hover:underline"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuManager;
