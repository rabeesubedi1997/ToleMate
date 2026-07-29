import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { API_BASE } from '../utils/config';
import { useToast } from '../context/ToastContext';

interface PageSeo {
  id: number; page: string; title: string; description: string;
  keywords: string; og_image: string; no_index: boolean;
}

const PageSeoManager: React.FC = () => {
  const { toast } = useToast();
  const [pages, setPages] = useState<PageSeo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PageSeo | null>(null);
  const [form, setForm] = useState({ page: '', title: '', description: '', keywords: '', og_image: '', no_index: false });

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' };

  const fetchPages = async () => {
    const r = await fetch(`${API_BASE}/api/admin/page-seo`, { headers });
    if (r.ok) setPages(await r.json());
    setLoading(false);
  };

  useEffect(() => { fetchPages(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editing ? `${API_BASE}/api/admin/page-seo/${editing.id}` : `${API_BASE}/api/admin/page-seo`;
    const method = editing ? 'PUT' : 'POST';
    const r = await fetch(url, { method, headers, body: JSON.stringify(form) });
    if (r.ok) {
      toast(editing ? 'Page SEO updated' : 'Page SEO created', 'success');
      resetForm(); fetchPages();
    } else {
      const d = await r.json(); toast(d.message || 'Failed to save', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this page SEO?')) return;
    const r = await fetch(`${API_BASE}/api/admin/page-seo/${id}`, { method: 'DELETE', headers });
    if (r.ok) { toast('Page SEO deleted', 'success'); fetchPages(); }
  };

  const resetForm = () => {
    setForm({ page: '', title: '', description: '', keywords: '', og_image: '', no_index: false });
    setEditing(null);
  };

  const editItem = (item: PageSeo) => {
    setForm({ page: item.page, title: item.title, description: item.description, keywords: item.keywords, og_image: item.og_image, no_index: item.no_index });
    setEditing(item);
  };

  const suggestedPages = ['/', '/services', '/marketplace', '/about', '/contact', '/faq', '/blog'];

  if (loading) return <div className="card p-8 animate-pulse"><div className="h-6 bg-gray-200 rounded w-40 mb-4" /><div className="space-y-3"><div className="h-10 bg-gray-100 rounded" /><div className="h-10 bg-gray-100 rounded" /></div></div>;

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Per-Page SEO</h3>
        <div className="flex items-center gap-2">
          <button onClick={fetchPages} className="p-2 text-gray-400 hover:text-gray-600"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => { resetForm(); }} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add Page</button>
        </div>
      </div>

      <form onSubmit={handleSave} className="card p-5 space-y-4">
        <h4 className="font-semibold text-gray-900">{editing ? 'Edit' : 'Add'} Page SEO</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600">Page route</label>
            <div className="flex gap-2">
              <input className="input-field flex-1" value={form.page} onChange={e => setForm({...form, page: e.target.value})} required placeholder="/services" />
              {!editing && (
                <select className="input-field w-40" value={form.page} onChange={e => setForm({...form, page: e.target.value})}>
                  <option value="">Quick add</option>
                  {suggestedPages.filter(s => !pages.find(p => p.page === s)).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div><label className="text-xs font-medium text-gray-600">OG Image URL</label>
            <input className="input-field" value={form.og_image} onChange={e => setForm({...form, og_image: e.target.value})} placeholder="https://..." /></div>
        </div>
        <div><label className="text-xs font-medium text-gray-600">Meta Title</label>
          <input className="input-field" value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
        <div><label className="text-xs font-medium text-gray-600">Meta Description</label>
          <textarea className="input-field resize-none" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
        <div><label className="text-xs font-medium text-gray-600">Keywords (comma-separated)</label>
          <input className="input-field" value={form.keywords} onChange={e => setForm({...form, keywords: e.target.value})} /></div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.no_index} onChange={e => setForm({...form, no_index: e.target.checked})} />
          <span className="text-xs text-gray-600">No index (hide from search engines)</span>
        </label>
        <div className="flex gap-3">
          <button type="submit" className="btn-primary flex-1">{editing ? 'Update' : 'Create'}</button>
          {editing && <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>}
        </div>
      </form>

      <div className="card overflow-hidden">
        {pages.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No page SEO entries yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {pages.map(p => (
              <div key={p.id} className="flex items-start justify-between p-4 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">{p.page}</span>
                    {p.no_index && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">noindex</span>}
                  </div>
                  {p.title && <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>}
                  {p.description && <p className="text-xs text-gray-500 truncate">{p.description}</p>}
                </div>
                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                  <button onClick={() => editItem(p)} className="text-xs text-primary-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(p.id)} className="text-xs text-red-600 hover:underline"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageSeoManager;
