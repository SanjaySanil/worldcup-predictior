import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute, { AdminRoute } from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AdminLayout from './admin/AdminLayout';

// User Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Leaderboard from './pages/Leaderboard';
import History from './pages/History';
import Profile from './pages/Profile';
import Setup from './pages/Setup';
import NotFound from './pages/NotFound';

// Admin Pages
import AdminLogin from './admin/AdminLogin';
import Overview from './admin/pages/Overview';
import Matches from './admin/pages/Matches';
import Teams from './admin/pages/Teams';
import Tournaments from './admin/pages/Tournaments';
import Users from './admin/pages/Users';
import AdminLeaderboard from './admin/pages/AdminLeaderboard';
import Rewards from './admin/pages/Rewards';
import Notifications from './admin/pages/Notifications';
import Analytics from './admin/pages/Analytics';
import Settings from './admin/pages/Settings';
import Admins from './admin/pages/Admins';

function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-pitch-900 flex flex-col">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public User Routes */}
          <Route
            path="/"
            element={
              <UserLayout>
                <Home />
              </UserLayout>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <UserLayout>
                <Leaderboard />
              </UserLayout>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected User Routes */}
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <UserLayout>
                  <History />
                </UserLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <UserLayout>
                  <Profile />
                </UserLayout>
              </ProtectedRoute>
            }
          />

          {/* First-time setup */}
          <Route path="/setup" element={<Setup />} />

          {/* Admin Login - Separate from user routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

          {/* Admin Protected Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminLayout>
                  <Overview />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/matches"
            element={
              <AdminRoute>
                <AdminLayout>
                  <Matches />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/teams"
            element={
              <AdminRoute>
                <AdminLayout>
                  <Teams />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/tournaments"
            element={
              <AdminRoute>
                <AdminLayout>
                  <Tournaments />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <AdminLayout>
                  <Users />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/leaderboard"
            element={
              <AdminRoute>
                <AdminLayout>
                  <AdminLeaderboard />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/rewards"
            element={
              <AdminRoute>
                <AdminLayout>
                  <Rewards />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/notifications"
            element={
              <AdminRoute>
                <AdminLayout>
                  <Notifications />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <AdminRoute>
                <AdminLayout>
                  <Analytics />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <AdminRoute>
                <AdminLayout>
                  <Settings />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/admins"
            element={
              <AdminRoute>
                <AdminLayout>
                  <Admins />
                </AdminLayout>
              </AdminRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
