import { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, Send, X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Announcement } from '../../types';

export default function Notifications() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    body: '',
    type: 'info' as 'info' | 'warning' | 'success' | 'error',
    target_role: 'all' as 'all' | 'user' | 'admin' | 'super_admin',
    is_published: false,
    expires_at: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    setAnnouncements(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('announcements').insert({
      ...form,
      expires_at: form.expires_at || null,
      created_by: user?.id,
      published_at: form.is_published ? new Date().toISOString() : null,
    });
    setForm({ title: '', body: '', type: 'info', target_role: 'all', is_published: false, expires_at: '' });
    setSaving(false);
    setShowModal(false);
    fetchData();
  };

  const togglePublish = async (a: Announcement) => {
    await supabase.from('announcements').update({
      is_published: !a.is_published,
      published_at: !a.is_published ? new Date().toISOString() : null,
    }).eq('id', a.id);
    fetchData();
  };

  const deleteAnnouncement = async (id: string) => {
    await supabase.from('announcements').delete().eq('id', id);
    fetchData();
  };

  const typeIcons = {
    info: <Info className="w-4 h-4 text-blue-400" />,
    warning: <AlertCircle className="w-4 h-4 text-warn-400" />,
    success: <CheckCircle className="w-4 h-4 text-success-400" />,
    error: <AlertCircle className="w-4 h-4 text-danger-400" />,
  };

  const typeColors = {
    info: 'border-l-blue-600',
    warning: 'border-l-warn-500',
    success: 'border-l-success-500',
    error: 'border-l-danger-500',
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Notifications & Announcements</h1>
          <p className="text-pitch-300 text-sm mt-1">{announcements.length} total announcements</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-gold rounded-lg py-2.5 px-5 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Announcement
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="card rounded-xl py-16 text-center">
          <Bell className="w-12 h-12 text-pitch-600 mx-auto mb-4" />
          <p className="text-pitch-300 font-semibold">No announcements yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => (
            <div key={a.id} className={`card rounded-xl p-5 border-l-4 ${typeColors[a.type]}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {typeIcons[a.type]}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white">{a.title}</span>
                      <span className={`tag ${a.is_published ? 'bg-success-800 text-success-300' : 'bg-pitch-600 text-pitch-400'}`}>
                        {a.is_published ? 'Published' : 'Draft'}
                      </span>
                      <span className="tag bg-pitch-600 text-pitch-200 capitalize">{a.target_role}</span>
                    </div>
                    <p className="text-sm text-pitch-300 mt-1 line-clamp-2">{a.body}</p>
                    <div className="text-xs text-pitch-500 mt-2">
                      {new Date(a.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => togglePublish(a)}
                    className={`p-2 rounded-lg transition-all ${
                      a.is_published
                        ? 'text-warn-400 hover:text-warn-300 hover:bg-pitch-700'
                        : 'text-success-400 hover:text-success-300 hover:bg-pitch-700'
                    }`}
                    title={a.is_published ? 'Unpublish' : 'Publish'}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteAnnouncement(a.id)}
                    className="p-2 text-danger-400 hover:text-danger-300 hover:bg-pitch-700 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-pitch-800 border border-pitch-600 rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-pitch-700">
              <h2 className="font-display font-bold text-lg uppercase tracking-wider text-white">New Announcement</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-pitch-400 hover:text-white" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="form-label">Title</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="form-input" required />
              </div>
              <div>
                <label className="form-label">Message</label>
                <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} className="form-input h-24 resize-none" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))} className="form-input">
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Target</label>
                  <select value={form.target_role} onChange={e => setForm(f => ({ ...f, target_role: e.target.value as any }))} className="form-input">
                    <option value="all">All Users</option>
                    <option value="user">Users Only</option>
                    <option value="admin">Admins Only</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Expires At (optional)</label>
                <input type="datetime-local" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} className="form-input" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_published} onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} className="w-4 h-4 accent-gold-500" />
                <span className="text-sm text-pitch-200">Publish immediately</span>
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className="btn-gold rounded-lg py-2.5 px-6">
                  {saving ? 'Saving...' : 'Send Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
