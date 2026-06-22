import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Contains uppercase', ok: /[A-Z]/.test(password) },
    { label: 'Contains number', ok: /[0-9]/.test(password) },
  ];
  const strength = checks.filter(c => c.ok).length;
  const color = strength === 0 ? 'bg-pitch-600' : strength === 1 ? 'bg-danger-500' : strength === 2 ? 'bg-warn-500' : 'bg-success-500';

  return (
    <div className="mt-2">
      <div className="h-1 bg-pitch-600 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${(strength / 3) * 100}%` }} />
      </div>
      {password && (
        <div className="mt-2 space-y-1">
          {checks.map(c => (
            <div key={c.label} className={`flex items-center gap-1.5 text-xs ${c.ok ? 'text-success-400' : 'text-pitch-400'}`}>
              <CheckCircle className={`w-3 h-3 ${c.ok ? 'text-success-400' : 'text-pitch-600'}`} />
              {c.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    // Check if username is already taken in profiles table
    try {
      const { data: existing, error: checkErr } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.toLowerCase())
        .maybeSingle();

      if (checkErr) throw checkErr;

      if (existing) {
        setError('Username is already taken. Please choose another.');
        setLoading(false);
        return;
      }
    } catch (e) {
      console.error('Username verification failed:', e);
    }

    const { error: err, needsConfirmation } = await signUp(email, password, username);
    if (err) {
      setError(err.message || 'Registration failed. Please try again.');
      setLoading(false);
    } else if (needsConfirmation) {
      setLoading(false);
      setConfirmed(true);
    } else {
      navigate('/', { replace: true });
    }
  };

  if (confirmed) {
    return (
      <div className="min-h-screen bg-pitch-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-success-900 border border-success-600 flex items-center justify-center mx-auto mb-6">
            <Send className="w-8 h-8 text-success-400" />
          </div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-widest text-white mb-3">
            Check Your Email
          </h1>
          <p className="text-pitch-300 mb-2">
            We sent a confirmation link to <strong className="text-white">{email}</strong>
          </p>
          <p className="text-pitch-400 text-sm mb-8">
            Click the link in your email to activate your account and start predicting.
          </p>
          <Link to="/login" className="btn-gold rounded-sm px-8 py-3.5 text-sm inline-block">
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pitch-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gold-gradient flex items-center justify-center shadow-gold mb-4">
            <Trophy className="w-8 h-8 text-pitch-900" />
          </div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-widest text-white">
            Join Free
          </h1>
          <p className="text-pitch-300 text-sm mt-2">Create your account and start predicting</p>
        </div>

        <div className="card rounded-2xl p-8 shadow-card">
          {error && (
            <div className="flex items-center gap-2.5 bg-danger-900 border border-danger-700 rounded-lg px-4 py-3 mb-6">
              <AlertCircle className="w-4 h-4 text-danger-400 flex-shrink-0" />
              <span className="text-sm text-danger-300">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="form-label">Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pitch-300" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, '_'))}
                  className="form-input pl-10"
                  placeholder="yourname"
                  required
                  minLength={3}
                  maxLength={30}
                  autoComplete="username"
                />
              </div>
              <p className="text-xs text-pitch-400 mt-1">Letters, numbers, underscores only</p>
            </div>

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
                  placeholder="Create a password"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-pitch-300 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && <PasswordStrength password={password} />}
            </div>

            <div>
              <label className="form-label">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pitch-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="form-input pl-10"
                  placeholder="Confirm your password"
                  required
                  autoComplete="new-password"
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-danger-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Passwords don't match
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full rounded-lg text-sm py-4 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-pitch-900 border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : 'Create Account — It\'s Free'}
            </button>
          </form>

          <p className="text-center text-xs text-pitch-400 mt-4">
            By joining, you agree to our terms of service and privacy policy.
          </p>

          <div className="mt-5 text-center">
            <p className="text-pitch-300 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-gold-400 hover:text-gold-300 font-semibold transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
