import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Trophy, Mail, Lock, Eye, EyeOff, AlertCircle, User, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Password reset state
  const [view, setView] = useState<'login' | 'forgot' | 'reset'>('login');
  const [resetUsername, setResetUsername] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    const { error: err } = await signIn(email, password);
    if (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('email not confirmed') || msg.toLowerCase().includes('not confirmed')) {
        setError('Please check your email and click the confirmation link before signing in.');
      } else if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('invalid credentials')) {
        setError('Incorrect email or password. Please try again.');
      } else {
        setError(msg || 'Sign in failed. Please try again.');
      }
      setLoading(false);
    } else {
      navigate(from, { replace: true });
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const { error: rpcErr } = await (supabase as any).rpc('request_password_reset', {
        p_username: resetUsername.toLowerCase().trim(),
      });

      if (rpcErr) throw rpcErr;

      setSuccessMessage('Reset requested! Ask your Admin for the 6-digit code.');
      setView('reset');
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handlePerformReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      const { error: rpcErr } = await (supabase as any).rpc('reset_user_password_by_code', {
        p_username: resetUsername.toLowerCase().trim(),
        p_code: resetCode.trim(),
        p_new_password: newPassword,
      });

      if (rpcErr) throw rpcErr;

      setSuccessMessage('Password reset successfully! You can now log in.');
      setView('login');
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Incorrect username or reset code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pitch-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gold-gradient flex items-center justify-center shadow-gold mb-4">
            <Trophy className="w-8 h-8 text-pitch-900" />
          </div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-widest text-white">
            {view === 'login' ? 'Welcome Back' : view === 'forgot' ? 'Reset Password' : 'Enter Code'}
          </h1>
          <p className="text-pitch-300 text-sm mt-2">
            {view === 'login'
              ? 'Sign in to your predictor account'
              : view === 'forgot'
              ? 'Request a reset code from the admin'
              : 'Enter the code and set your new password'}
          </p>
        </div>

        {/* Form Card */}
        <div className="card rounded-2xl p-8 shadow-card">
          {error && (
            <div className="flex items-center gap-2.5 bg-danger-900 border border-danger-700 rounded-lg px-4 py-3 mb-6">
              <AlertCircle className="w-4 h-4 text-danger-400 flex-shrink-0" />
              <span className="text-sm text-danger-300">{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2.5 bg-success-900 border border-success-700 rounded-lg px-4 py-3 mb-6">
              <CheckCircle className="w-4 h-4 text-success-400 flex-shrink-0" />
              <span className="text-sm text-success-300">{successMessage}</span>
            </div>
          )}

          {view === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="form-label">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pitch-300" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="form-input pl-10"
                    placeholder="you@example.com"
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
                    placeholder="Enter your password"
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
                <div className="flex justify-end mt-1.5">
                  <button
                    type="button"
                    onClick={() => { setView('forgot'); setError(''); setSuccessMessage(''); }}
                    className="text-xs text-gold-400 hover:text-gold-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-gold w-full rounded-lg text-sm py-4"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-pitch-900 border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>
          )}

          {view === 'forgot' && (
            <form onSubmit={handleRequestReset} className="space-y-5">
              <div>
                <label className="form-label">Username</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pitch-300" />
                  <input
                    type="text"
                    value={resetUsername}
                    onChange={e => setResetUsername(e.target.value)}
                    className="form-input pl-10"
                    placeholder="Enter your username"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-gold w-full rounded-lg text-sm py-4"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-pitch-900 border-t-transparent rounded-full animate-spin" />
                    Requesting...
                  </span>
                ) : 'Request Reset Code'}
              </button>

              <div className="flex justify-between items-center mt-4">
                <button
                  type="button"
                  onClick={() => { setView('login'); setError(''); setSuccessMessage(''); }}
                  className="text-xs text-pitch-300 hover:text-white transition-colors"
                >
                  ← Back to Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setView('reset'); setError(''); setSuccessMessage(''); }}
                  className="text-xs text-gold-400 hover:text-gold-300 transition-colors font-semibold"
                >
                  Already have a code?
                </button>
              </div>
            </form>
          )}

          {view === 'reset' && (
            <form onSubmit={handlePerformReset} className="space-y-5">
              <div>
                <label className="form-label">Username</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pitch-300" />
                  <input
                    type="text"
                    value={resetUsername}
                    onChange={e => setResetUsername(e.target.value)}
                    className="form-input pl-10"
                    placeholder="Enter your username"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label">6-Digit Reset Code</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pitch-300" />
                  <input
                    type="text"
                    value={resetCode}
                    onChange={e => setResetCode(e.target.value)}
                    className="form-input pl-10 font-mono tracking-widest text-center text-lg"
                    placeholder="123456"
                    maxLength={6}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pitch-300" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="form-input pl-10"
                    placeholder="Minimum 8 characters"
                    minLength={8}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-gold w-full rounded-lg text-sm py-4"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-pitch-900 border-t-transparent rounded-full animate-spin" />
                    Resetting...
                  </span>
                ) : 'Reset Password'}
              </button>

              <div className="flex justify-start mt-4">
                <button
                  type="button"
                  onClick={() => { setView('login'); setError(''); setSuccessMessage(''); }}
                  className="text-xs text-pitch-300 hover:text-white transition-colors"
                >
                  ← Back to Sign In
                </button>
              </div>
            </form>
          )}

          {view === 'login' && (
            <div className="mt-6 text-center">
              <p className="text-pitch-300 text-sm">
                Don\'t have an account?{' '}
                <Link to="/register" className="text-gold-400 hover:text-gold-300 font-semibold transition-colors">
                  Join free
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Admin link */}
        <div className="mt-6 text-center">
          <Link
            to="/admin/login"
            className="text-xs text-pitch-500 hover:text-pitch-300 transition-colors"
          >
            Admin access →
          </Link>
        </div>
      </div>
    </div>
  );
}
