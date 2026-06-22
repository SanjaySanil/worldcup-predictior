import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Trophy, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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

  return (
    <div className="min-h-screen bg-pitch-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gold-gradient flex items-center justify-center shadow-gold mb-4">
            <Trophy className="w-8 h-8 text-pitch-900" />
          </div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-widest text-white">
            Welcome Back
          </h1>
          <p className="text-pitch-300 text-sm mt-2">Sign in to your predictor account</p>
        </div>

        {/* Form Card */}
        <div className="card rounded-2xl p-8 shadow-card">
          {error && (
            <div className="flex items-center gap-2.5 bg-danger-900 border border-danger-700 rounded-lg px-4 py-3 mb-6">
              <AlertCircle className="w-4 h-4 text-danger-400 flex-shrink-0" />
              <span className="text-sm text-danger-300">{error}</span>
            </div>
          )}

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

          <div className="mt-6 text-center">
            <p className="text-pitch-300 text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-gold-400 hover:text-gold-300 font-semibold transition-colors">
                Join free
              </Link>
            </p>
          </div>
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
