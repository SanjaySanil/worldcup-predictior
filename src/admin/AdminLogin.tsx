import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function AdminLogin() {
  const { signIn, profile } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: err } = await signIn(email, password);
    if (err) {
      setError('Invalid credentials');
      setLoading(false);
      return;
    }

    // Wait for profile to load, then check role
    setTimeout(async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setError('Authentication failed');
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authUser.id)
        .single();

      if (data?.role === 'super_admin' || data?.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        setError('Access denied. Admin privileges required.');
        setLoading(false);
        await supabase.auth.signOut();
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-pitch-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-pitch-700 border border-pitch-500 flex items-center justify-center mb-4">
            <Shield className="w-9 h-9 text-gold-500" />
          </div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-widest text-white">
            Admin Portal
          </h1>
          <p className="text-pitch-400 text-sm mt-2">World Cup 2026 Predictor</p>
        </div>

        <div className="bg-pitch-800 border border-pitch-600 rounded-2xl p-8 shadow-card">
          <div className="flex items-center gap-2 bg-pitch-700 border border-pitch-500 rounded-lg px-4 py-3 mb-6">
            <Shield className="w-4 h-4 text-gold-500 flex-shrink-0" />
            <span className="text-xs text-pitch-200">Restricted access — authorized personnel only</span>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 bg-danger-900 border border-danger-700 rounded-lg px-4 py-3 mb-6">
              <AlertCircle className="w-4 h-4 text-danger-400 flex-shrink-0" />
              <span className="text-sm text-danger-300">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="form-label">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pitch-300" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="form-input pl-10"
                  placeholder="admin@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pitch-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="form-input pl-10 pr-11"
                  placeholder="Admin password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-pitch-300 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pitch-600 hover:bg-pitch-500 border border-pitch-400 text-white font-display font-bold uppercase tracking-widest text-sm py-3.5 rounded-lg transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : 'Access Dashboard'}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center space-y-2">
          <div>
            <a href="/setup" className="text-xs text-gold-600 hover:text-gold-400 transition-colors font-semibold">
              First time? Create super admin account →
            </a>
          </div>
          <div>
            <a href="/" className="text-xs text-pitch-500 hover:text-pitch-300 transition-colors">
              ← Return to main site
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
