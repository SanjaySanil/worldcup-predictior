import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Step = 'checking' | 'needed' | 'done' | 'already_exists';

export default function Setup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('checking');
  const [form, setForm] = useState({ email: '', username: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkIfSetupNeeded();
  }, []);

  const checkIfSetupNeeded = async () => {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'super_admin');

    if ((count ?? 0) > 0) {
      setStep('already_exists');
    } else {
      setStep('needed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(form.username)) {
      setError('Username: letters, numbers, underscores only');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    // Sign up the user
    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { username: form.username, display_name: form.username, role: 'super_admin' },
      },
    });

    if (signUpErr) {
      setError(signUpErr.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError('Account creation failed. Try again.');
      setLoading(false);
      return;
    }

    // Wait for trigger to run, then ensure profile exists with super_admin role
    await new Promise(r => setTimeout(r, 800));

    // Upsert profile with super_admin role
    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert(
        {
          id: data.user.id,
          username: form.username,
          display_name: form.username,
          role: 'super_admin',
        },
        { onConflict: 'id' }
      );

    if (profileErr) {
      // If we can't set super_admin from the client, it means RLS is blocking update
      // The user was created — they just need to confirm email first, then we can set role
      if (data.session) {
        // They're logged in — try updating role
        await supabase
          .from('profiles')
          .update({ role: 'super_admin' })
          .eq('id', data.user.id);
      }
    }

    setStep('done');
    setLoading(false);

    // If they have a session already (no email confirm needed), redirect after short delay
    if (data.session) {
      setTimeout(() => navigate('/admin/dashboard'), 2500);
    }
  };

  if (step === 'checking') {
    return (
      <div className="min-h-screen bg-pitch-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (step === 'already_exists') {
    return (
      <div className="min-h-screen bg-pitch-950 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-pitch-700 border border-pitch-500 flex items-center justify-center mx-auto mb-5">
            <Shield className="w-7 h-7 text-gold-500" />
          </div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wider text-white mb-3">
            Setup Complete
          </h1>
          <p className="text-pitch-300 text-sm mb-8">
            An admin account already exists. Sign in at the admin portal.
          </p>
          <a
            href="/admin/login"
            className="btn-gold rounded-lg py-3 px-8 text-sm inline-block"
          >
            Go to Admin Login
          </a>
          <div className="mt-4">
            <a href="/" className="text-xs text-pitch-500 hover:text-pitch-300">← Back to site</a>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-pitch-950 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-success-900 border border-success-600 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-7 h-7 text-success-400" />
          </div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wider text-white mb-3">
            Super Admin Created!
          </h1>
          <p className="text-pitch-300 text-sm mb-2">
            Account for <strong className="text-white">@{form.username}</strong> is ready.
          </p>
          <p className="text-pitch-400 text-xs mb-8">
            If your Supabase project requires email confirmation, check <strong className="text-white">{form.email}</strong> and confirm before signing in.
          </p>
          <a
            href="/admin/login"
            className="btn-gold rounded-lg py-3 px-8 text-sm inline-block"
          >
            Sign In to Admin
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pitch-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-pitch-700 border border-pitch-500 flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-gold-500" />
          </div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-widest text-white">
            First-Time Setup
          </h1>
          <p className="text-pitch-400 text-sm mt-2 text-center">
            No admin account found. Create your Super Admin account to manage the platform.
          </p>
        </div>

        <div className="bg-pitch-800 border border-pitch-600 rounded-2xl p-8 shadow-card">
          <div className="flex items-center gap-2 bg-gold-950 border border-gold-800 rounded-lg px-4 py-3 mb-6">
            <Shield className="w-4 h-4 text-gold-500 flex-shrink-0" />
            <span className="text-xs text-gold-300">This page is only accessible when no Super Admin exists.</span>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 bg-danger-900 border border-danger-700 rounded-lg px-4 py-3 mb-5">
              <AlertCircle className="w-4 h-4 text-danger-400 flex-shrink-0" />
              <span className="text-sm text-danger-300">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pitch-400" />
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                  className="form-input pl-10"
                  placeholder="superadmin"
                  required
                  minLength={3}
                  maxLength={30}
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pitch-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="form-input pl-10"
                  placeholder="admin@yourdomain.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pitch-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="form-input pl-10 pr-11"
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-pitch-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="form-label">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pitch-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                  className="form-input pl-10"
                  placeholder="Repeat password"
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pitch-600 hover:bg-pitch-500 border border-pitch-400 text-white font-display font-bold uppercase tracking-widest text-sm py-3.5 rounded-lg transition-all duration-150 active:scale-95 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : 'Create Super Admin Account'}
            </button>
          </form>
        </div>

        <div className="mt-5 text-center">
          <a href="/" className="text-xs text-pitch-500 hover:text-pitch-300 transition-colors">
            ← Back to site
          </a>
        </div>
      </div>
    </div>
  );
}
