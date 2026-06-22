import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Trophy, User, Bell, Menu, X, LogOut, ChevronDown, BarChart3, History, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setMenuOpen(false);
    setDropdownOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-pitch-glass border-b border-pitch-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-gold-gradient flex items-center justify-center shadow-gold">
              <Trophy className="w-5 h-5 text-pitch-900" />
            </div>
            <span className="font-display font-bold text-lg tracking-wider text-white hidden sm:block">
              DG WORLD CUP <span className="text-gold-400">2026</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-colors duration-150 ${
                  isActive ? 'text-gold-400' : 'text-pitch-200 hover:text-white'
                }`
              }
            >
              Predict
            </NavLink>
            <NavLink
              to="/leaderboard"
              className={({ isActive }) =>
                `px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-colors duration-150 ${
                  isActive ? 'text-gold-400' : 'text-pitch-200 hover:text-white'
                }`
              }
            >
              Leaderboard
            </NavLink>
            {user && (
              <NavLink
                to="/history"
                className={({ isActive }) =>
                  `px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-colors duration-150 ${
                    isActive ? 'text-gold-400' : 'text-pitch-200 hover:text-white'
                  }`
                }
              >
                History
              </NavLink>
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <button className="relative p-2 text-pitch-200 hover:text-white transition-colors">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-gold-500 rounded-full"></span>
                </button>

                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pitch-700 border border-pitch-600 hover:border-pitch-500 transition-all"
                  >
                    <div className="w-7 h-7 rounded-full bg-gold-gradient flex items-center justify-center">
                      <span className="text-xs font-bold text-pitch-900">
                        {profile?.username?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-white hidden sm:block max-w-24 truncate">
                      {profile?.username || 'User'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-pitch-300" />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-pitch-700 border border-pitch-600 rounded-xl shadow-card py-1 animate-slide-in">
                      <Link
                        to="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-pitch-100 hover:text-white hover:bg-pitch-600 transition-colors"
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                      <Link
                        to="/history"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-pitch-100 hover:text-white hover:bg-pitch-600 transition-colors"
                      >
                        <History className="w-4 h-4" />
                        My History
                      </Link>
                      <Link
                        to="/leaderboard"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-pitch-100 hover:text-white hover:bg-pitch-600 transition-colors"
                      >
                        <BarChart3 className="w-4 h-4" />
                        Leaderboard
                      </Link>
                      <hr className="border-pitch-600 my-1" />
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-danger-400 hover:text-danger-300 hover:bg-pitch-600 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-sm font-semibold text-pitch-200 hover:text-white transition-colors px-3 py-2 uppercase tracking-wider"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="btn-gold text-xs px-5 py-2.5 rounded-sm"
                >
                  Join Free
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 text-pitch-200 hover:text-white"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-pitch-600 bg-pitch-800 animate-slide-in">
          <div className="px-4 py-3 space-y-1">
            <NavLink
              to="/"
              end
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider ${
                  isActive ? 'bg-pitch-700 text-gold-400' : 'text-pitch-200 hover:text-white hover:bg-pitch-700'
                }`
              }
            >
              Predict
            </NavLink>
            <NavLink
              to="/leaderboard"
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider ${
                  isActive ? 'bg-pitch-700 text-gold-400' : 'text-pitch-200 hover:text-white hover:bg-pitch-700'
                }`
              }
            >
              Leaderboard
            </NavLink>
            {user && (
              <>
                <NavLink
                  to="/history"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `block px-3 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider ${
                      isActive ? 'bg-pitch-700 text-gold-400' : 'text-pitch-200 hover:text-white hover:bg-pitch-700'
                    }`
                  }
                >
                  History
                </NavLink>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-danger-400 hover:bg-pitch-700 uppercase tracking-wider"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
