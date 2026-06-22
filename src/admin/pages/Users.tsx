import { useState, useEffect } from 'react';
import { Search, Shield, Ban, UserCheck, Users as UsersIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Profile } from '../../types';

export default function Users() {
  const { profile: currentProfile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleActive = async (user: Profile) => {
    if (user.role === 'super_admin') return;
    await supabase.from('profiles').update({ is_active: !user.is_active }).eq('id', user.id);
    fetchUsers();
  };

  const filtered = users.filter(u => {
    const matchesSearch = !search ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.display_name?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleColors: Record<string, string> = {
    super_admin: 'bg-gold-gradient text-pitch-900',
    admin: 'bg-blue-800 text-blue-300',
    user: 'bg-pitch-600 text-pitch-200',
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Users</h1>
          <p className="text-pitch-300 text-sm mt-1">{users.length} total users</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="stat-card py-2 px-4">
            <span className="text-pitch-300">Users: </span>
            <span className="font-bold text-white">{users.filter(u => u.role === 'user').length}</span>
          </div>
          <div className="stat-card py-2 px-4">
            <span className="text-pitch-300">Admins: </span>
            <span className="font-bold text-white">{users.filter(u => u.role !== 'user').length}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pitch-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="form-input pl-10" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="form-input sm:w-40">
          <option value="all">All Roles</option>
          <option value="user">Users</option>
          <option value="admin">Admins</option>
          <option value="super_admin">Super Admins</option>
        </select>
      </div>

      <div className="card rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pitch-600">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-pitch-400 uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-pitch-400 uppercase tracking-wider">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-pitch-400 uppercase tracking-wider hidden md:table-cell">Joined</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-pitch-400 uppercase tracking-wider">Status</th>
                  {currentProfile?.role === 'super_admin' && (
                    <th className="text-right px-4 py-3 text-xs font-semibold text-pitch-400 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-pitch-700">
                {filtered.map(u => (
                  <tr key={u.id} className={`hover:bg-pitch-700/50 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gold-gradient flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-black text-pitch-900">{u.username[0]?.toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="font-semibold text-white">@{u.username}</div>
                          {u.display_name && <div className="text-xs text-pitch-400">{u.display_name}</div>}
                          {u.reset_requested && u.reset_code && (
                            <div className="text-xs text-gold-400 font-mono mt-1 font-bold bg-gold-500/10 px-2 py-0.5 rounded border border-gold-500/20 inline-block">
                              Reset Code: {u.reset_code}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`tag capitalize ${roleColors[u.role]}`}>{u.role.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-4 text-pitch-300 hidden md:table-cell">
                      {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`tag ${u.is_active ? 'bg-success-800 text-success-300' : 'bg-danger-800 text-danger-300'}`}>
                        {u.is_active ? 'Active' : 'Banned'}
                      </span>
                    </td>
                    {currentProfile?.role === 'super_admin' && (
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {u.role !== 'super_admin' && u.id !== currentProfile?.id && (
                            <button
                              onClick={() => toggleActive(u)}
                              className={`p-1.5 rounded-lg transition-all ${
                                u.is_active
                                  ? 'text-danger-400 hover:text-danger-300 hover:bg-pitch-700'
                                  : 'text-success-400 hover:text-success-300 hover:bg-pitch-700'
                              }`}
                              title={u.is_active ? 'Ban user' : 'Unban user'}
                            >
                              {u.is_active ? <Ban className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
