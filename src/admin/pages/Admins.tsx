import { useState, useEffect } from 'react';
import { Shield, UserPlus, X, AlertCircle, Mail, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Profile } from '../../types';

export default function Admins() {
  const { profile: currentProfile } = useAuth();
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchAdmins = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['admin', 'super_admin'])
      .order('created_at', { ascending: false });
    setAdmins(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    const { error: signUpError } = await supabase.auth.admin
      ? // Try admin API
      { error: new Error('Admin API not available in client') }
      : { error: null };

    // Since admin API requires service role key (not available client-side),
    // we create a regular user and then update their role
    // This is a simplified flow - in production you'd use an Edge Function
    const { data, error: err } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { username: form.username, display_name: form.username, role: 'admin' },
      },
    });

    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }

    if (data.user) {
      // Update role to admin
      await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', data.user.id);

      setSuccess(`Admin account created for ${form.username}`);
      setForm({ email: '', username: '', password: '' });
      fetchAdmins();
    }

    setSaving(false);
    setShowModal(false);
  };

  const revokeAdmin = async (admin: Profile) => {
    if (admin.role === 'super_admin') return;
    if (admin.id === currentProfile?.id) return;
    await supabase.from('profiles').update({ role: 'user' }).eq('id', admin.id);
    fetchAdmins();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Admin Management</h1>
          <p className="text-pitch-300 text-sm mt-1">Super Admin only — {admins.length} admins</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-gold rounded-lg py-2.5 px-5 flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Add Admin
        </button>
      </div>

      {success && (
        <div className="bg-success-900 border border-success-700 rounded-lg px-4 py-3 text-success-300 text-sm">
          {success}
        </div>
      )}

      <div className="bg-warn-900 border border-warn-700 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-warn-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-warn-300">
          Admins can manage matches, teams, users, and results. They cannot create other admins or modify Super Admin accounts.
        </p>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pitch-600">
                <th className="text-left px-4 py-3 text-xs font-semibold text-pitch-400 uppercase tracking-wider">Admin</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-pitch-400 uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-pitch-400 uppercase tracking-wider hidden md:table-cell">Added</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-pitch-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pitch-700">
              {admins.map(admin => (
                <tr key={admin.id} className="hover:bg-pitch-700/50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gold-gradient flex items-center justify-center">
                        <span className="text-sm font-black text-pitch-900">{admin.username[0]?.toUpperCase()}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-white">@{admin.username}</div>
                        {admin.id === currentProfile?.id && (
                          <span className="text-xs text-gold-400">(You)</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`tag capitalize ${admin.role === 'super_admin' ? 'bg-gold-gradient text-pitch-900' : 'bg-blue-800 text-blue-300'}`}>
                      {admin.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-pitch-300 hidden md:table-cell">
                    {new Date(admin.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {admin.role !== 'super_admin' && admin.id !== currentProfile?.id && (
                      <button
                        onClick={() => revokeAdmin(admin)}
                        className="text-xs text-danger-400 hover:text-danger-300 font-semibold transition-colors"
                      >
                        Revoke Access
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-pitch-800 border border-pitch-600 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-pitch-700">
              <h2 className="font-display font-bold text-lg uppercase tracking-wider text-white">Create Admin</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-pitch-400 hover:text-white" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-danger-900 border border-danger-700 rounded-lg px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-danger-400" />
                  <span className="text-sm text-danger-300">{error}</span>
                </div>
              )}
              <div>
                <label className="form-label">Username</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pitch-400" />
                  <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className="form-input pl-10" required />
                </div>
              </div>
              <div>
                <label className="form-label">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pitch-400" />
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="form-input pl-10" required />
                </div>
              </div>
              <div>
                <label className="form-label">Temporary Password</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="form-input" required minLength={8} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className="btn-gold rounded-lg py-2.5 px-6">
                  {saving ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
