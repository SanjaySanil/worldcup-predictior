import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Trophy, User, Bell, Menu, X, LogOut, ChevronDown, BarChart3, History, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import HowToPlayModal from './HowToPlayModal';

interface NavbarAnnouncement {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'success' | 'error';
  target_role: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);

  // Notification states
  const [notifOpen, setNotifOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<NavbarAnnouncement[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      let query = supabase
        .from('announcements')
        .select('*')
        .eq('is_published', true);
      
      if (profile) {
        query = query.or(`target_role.eq.all,target_role.eq.${profile.role}`);
      } else {
        query = query.eq('target_role', 'all');
      }

      const { data } = await query.order('published_at', { ascending: false }).limit(5);
      if (data) {
        const announcementsData = data as any[];
        setAnnouncements(announcementsData);
        
        // Calculate unread count
        const lastRead = localStorage.getItem('last_read_announcements');
        if (lastRead) {
          const count = announcementsData.filter(a => new Date(a.published_at || a.created_at) > new Date(lastRead)).length;
          setUnreadCount(count);
        } else {
          setUnreadCount(announcementsData.length);
        }
      }
    };

    fetchAnnouncements();

    // Subscribe to new published announcements
    const channel = supabase
      .channel('announcements-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        fetchAnnouncements();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const handleToggleNotifications = () => {
    setNotifOpen(!notifOpen);
    setDropdownOpen(false);
    if (!notifOpen) {
      setUnreadCount(0);
      localStorage.setItem('last_read_announcements', new Date().toISOString());
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setMenuOpen(false);
    setDropdownOpen(false);
    setNotifOpen(false);
  };

  return (
    <>
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
            <button
              onClick={() => setHowToPlayOpen(true)}
              className="px-4 py-2 text-sm font-semibold uppercase tracking-wider text-pitch-200 hover:text-white transition-colors duration-150"
            >
              How to Play
            </button>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="relative">
                  <button 
                    onClick={handleToggleNotifications}
                    className="relative p-2 text-pitch-200 hover:text-white transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-gold-500 rounded-full border border-pitch-900 animate-pulse"></span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-pitch-700 border border-pitch-600 rounded-xl shadow-card py-2 px-1 z-50 max-h-96 overflow-y-auto animate-slide-in">
                      <div className="px-4 py-2 border-b border-pitch-600 flex justify-between items-center mb-1">
                        <span className="font-display font-bold uppercase tracking-wider text-xs text-pitch-200">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="bg-gold-500/10 text-gold-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-gold-500/20">New</span>
                        )}
                      </div>
                      
                      {announcements.length === 0 ? (
                        <div className="py-8 text-center text-pitch-400 text-sm">
                          No notifications yet
                        </div>
                      ) : (
                        <div className="divide-y divide-pitch-600/50">
                          {announcements.map(a => (
                            <div key={a.id} className="p-3 hover:bg-pitch-600/40 rounded-lg transition-colors flex gap-2.5">
                              <div className="flex-shrink-0 mt-0.5">
                                <span className={`w-2 h-2 rounded-full inline-block ${
                                  a.type === 'warning' ? 'bg-warn-400' :
                                  a.type === 'success' ? 'bg-success-400' :
                                  a.type === 'error' ? 'bg-danger-400' :
                                  'bg-blue-400'
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-white text-xs leading-snug">{a.title}</div>
                                <p className="text-pitch-300 text-[11px] mt-0.5 leading-normal">{a.body}</p>
                                <div className="text-[9px] text-pitch-400 mt-1">
                                  {new Date(a.published_at || a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

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
            )}
            <button
              onClick={() => {
                setHowToPlayOpen(true);
                setMenuOpen(false);
              }}
              className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-pitch-200 hover:text-white hover:bg-pitch-700 uppercase tracking-wider"
            >
              How to Play
            </button>
            {user && (
              <button
                onClick={handleSignOut}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-danger-400 hover:bg-pitch-700 uppercase tracking-wider"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      )}

      </nav>

      {/* How To Play Modal */}
      <HowToPlayModal isOpen={howToPlayOpen} onClose={() => setHowToPlayOpen(false)} />
    </>
  );
}
