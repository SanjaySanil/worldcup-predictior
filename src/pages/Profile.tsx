import { useState } from 'react';
import { User, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Profile() {
  const { profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Change password states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passSaving, setPassSaving] = useState(false);
  const [passMessage, setPassMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage(null);

    if (newPassword !== confirmPassword) {
      setPassMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setPassMessage({ type: 'error', text: 'Password must be at least 8 characters long' });
      return;
    }

    setPassSaving(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPassMessage({ type: 'error', text: error.message });
    } else {
      setPassMessage({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword('');
      setConfirmPassword('');
    }
    setPassSaving(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', profile.id);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      await refreshProfile();
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-pitch-900">
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <User className="w-7 h-7 text-gold-500" />
          <h1 className="font-display text-3xl font-bold uppercase tracking-widest text-white">
            My Profile
          </h1>
        </div>

        {/* Avatar + Info */}
        <div className="card rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gold-gradient flex items-center justify-center shadow-gold">
              <span className="font-black text-2xl text-pitch-900">
                {profile?.username?.[0]?.toUpperCase()}
              </span>
            </div>
            <div>
              <div className="font-bold text-xl text-white">@{profile?.username}</div>
              <div className="text-pitch-300 text-sm capitalize mt-0.5">
                {profile?.role?.replace('_', ' ')} Account
              </div>
              <div className="text-pitch-400 text-xs mt-1">
                Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '-'}
              </div>
            </div>
          </div>

          {message && (
            <div className={`flex items-center gap-2.5 rounded-lg px-4 py-3 mb-5 ${
              message.type === 'success'
                ? 'bg-success-900 border border-success-700'
                : 'bg-danger-900 border border-danger-700'
            }`}>
              {message.type === 'success'
                ? <CheckCircle className="w-4 h-4 text-success-400 flex-shrink-0" />
                : <AlertCircle className="w-4 h-4 text-danger-400 flex-shrink-0" />
              }
              <span className={`text-sm ${message.type === 'success' ? 'text-success-300' : 'text-danger-300'}`}>
                {message.text}
              </span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="form-label">Username</label>
              <input
                type="text"
                value={profile?.username || ''}
                disabled
                className="form-input opacity-50 cursor-not-allowed"
              />
              <p className="text-xs text-pitch-400 mt-1">Username cannot be changed</p>
            </div>

            <div>
              <label className="form-label">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="form-input"
                placeholder="Your display name"
                maxLength={50}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn-gold rounded-lg py-3 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-pitch-900 border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="card rounded-2xl p-6">
          <h2 className="subsection-title mb-4">Change Password</h2>
          
          {passMessage && (
            <div className={`flex items-center gap-2.5 rounded-lg px-4 py-3 mb-5 ${
              passMessage.type === 'success'
                ? 'bg-success-900 border border-success-700'
                : 'bg-danger-900 border border-danger-700'
            }`}>
              {passMessage.type === 'success'
                ? <CheckCircle className="w-4 h-4 text-success-400 flex-shrink-0" />
                : <AlertCircle className="w-4 h-4 text-danger-400 flex-shrink-0" />
              }
              <span className={`text-sm ${passMessage.type === 'success' ? 'text-success-300' : 'text-danger-300'}`}>
                {passMessage.text}
              </span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="form-label">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="form-input"
                placeholder="Minimum 8 characters"
                minLength={8}
                required
              />
            </div>

            <div>
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="form-input"
                placeholder="Confirm new password"
                minLength={8}
                required
              />
            </div>

            <button
              type="submit"
              disabled={passSaving}
              className="btn-gold rounded-lg py-3 flex items-center gap-2"
            >
              {passSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-pitch-900 border-t-transparent rounded-full animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Update Password
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
