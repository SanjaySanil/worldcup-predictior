import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Trophy, LayoutDashboard, Calendar, Users, BarChart3,
  Gift, Bell, Settings, LogOut, Shield, ChevronLeft,
  Menu, X, Globe, FileText, Star
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { to: '/admin/matches', icon: Calendar, label: 'Matches' },
  { to: '/admin/teams', icon: Globe, label: 'Teams' },
  { to: '/admin/tournaments', icon: Trophy, label: 'Tournaments' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/leaderboard', icon: BarChart3, label: 'Leaderboard' },
  { to: '/admin/rewards', icon: Gift, label: 'Rewards' },
  { to: '/admin/notifications', icon: Bell, label: 'Notifications' },
  { to: '/admin/analytics', icon: FileText, label: 'Analytics' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
  { to: '/admin/admins', icon: Shield, label: 'Admins', superAdminOnly: true },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isSuperAdmin = profile?.role === 'super_admin';

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const filteredNav = navItems.filter(item => !item.superAdminOnly || isSuperAdmin);

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-pitch-950 border-r border-pitch-700 w-64">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-pitch-700">
        <div className="w-9 h-9 rounded-lg bg-gold-gradient flex items-center justify-center">
          <Shield className="w-5 h-5 text-pitch-900" />
        </div>
        <div>
          <div className="font-display font-bold text-sm tracking-wider text-white">ADMIN PORTAL</div>
          <div className="text-xs text-pitch-400">World Cup 2026</div>
        </div>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b border-pitch-700">
        <div className="flex items-center gap-3 px-3 py-3 bg-pitch-800 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-gold-gradient flex items-center justify-center">
            <span className="text-sm font-black text-pitch-900">
              {profile?.username?.[0]?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">{profile?.username}</div>
            <div className="text-xs text-gold-500 capitalize">{profile?.role?.replace('_', ' ')}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              isActive ? 'admin-sidebar-item-active' : 'admin-sidebar-item-inactive'
            }
          >
            <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-pitch-700 pt-4">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="admin-sidebar-item-inactive"
        >
          <Globe className="w-[18px] h-[18px]" />
          View Site
        </a>
        <button onClick={handleSignOut} className="admin-sidebar-item-inactive w-full text-left text-danger-400 hover:text-danger-300">
          <LogOut className="w-[18px] h-[18px]" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-pitch-900 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="flex-shrink-0">
            <Sidebar />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-4 bg-pitch-900 border-b border-pitch-700">
          <button
            className="lg:hidden p-2 text-pitch-300 hover:text-white"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-pitch-700 border border-pitch-600 rounded-full px-3 py-1">
              <span className="live-dot" />
              <span className="text-xs text-success-400 font-semibold">Live</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
