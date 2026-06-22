import { useState, useEffect } from 'react';
import { Users, Calendar, BarChart3, Target, TrendingUp, Activity, Trophy, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Stats {
  totalUsers: number;
  totalMatches: number;
  totalPredictions: number;
  activeCompetitions: number;
  todayPredictions: number;
  liveMatches: number;
}

export default function Overview() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalMatches: 0,
    totalPredictions: 0,
    activeCompetitions: 0,
    todayPredictions: 0,
    liveMatches: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const [
        { count: users },
        { count: matches },
        { count: predictions },
        { count: competitions },
        { count: todayPredictions },
        { count: liveMatches },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
        supabase.from('matches').select('*', { count: 'exact', head: true }),
        supabase.from('predictions').select('*', { count: 'exact', head: true }),
        supabase.from('competitions').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('predictions').select('*', { count: 'exact', head: true })
          .gte('submitted_at', new Date().toISOString().split('T')[0]),
        supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'live'),
      ]);

      setStats({
        totalUsers: users || 0,
        totalMatches: matches || 0,
        totalPredictions: predictions || 0,
        activeCompetitions: competitions || 0,
        todayPredictions: todayPredictions || 0,
        liveMatches: liveMatches || 0,
      });

      // Recent activity from audit logs
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      setRecentActivity(logs || []);
      setLoading(false);
    };

    fetchStats();
  }, []);

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-400', bg: 'bg-blue-900/20' },
    { label: 'Total Matches', value: stats.totalMatches, icon: Calendar, color: 'text-gold-400', bg: 'bg-gold-900/20' },
    { label: 'Predictions Made', value: stats.totalPredictions, icon: Target, color: 'text-success-400', bg: 'bg-success-900/20' },
    { label: 'Active Competitions', value: stats.activeCompetitions, icon: Trophy, color: 'text-warn-400', bg: 'bg-warn-900/20' },
    { label: "Today's Predictions", value: stats.todayPredictions, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-900/20' },
    { label: 'Live Matches', value: stats.liveMatches, icon: Activity, color: 'text-danger-400', bg: 'bg-danger-900/20' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Dashboard Overview</h1>
        <p className="text-pitch-300 text-sm mt-1">
          Welcome back, {profile?.username}. Here's what's happening.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              {loading && <div className="h-7 w-16 bg-pitch-600 rounded animate-pulse" />}
            </div>
            {loading ? (
              <div className="h-8 w-24 bg-pitch-600 rounded animate-pulse mb-1" />
            ) : (
              <div className="font-display font-black text-3xl text-white">
                {card.value.toLocaleString()}
              </div>
            )}
            <div className="text-xs text-pitch-400 uppercase tracking-wider mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="card rounded-xl p-5">
          <h2 className="subsection-title mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Add Match', href: '/admin/matches', icon: Calendar },
              { label: 'Manage Teams', href: '/admin/teams', icon: Users },
              { label: 'View Leaderboard', href: '/admin/leaderboard', icon: BarChart3 },
              { label: 'Send Notification', href: '/admin/notifications', icon: Zap },
            ].map(a => (
              <a
                key={a.label}
                href={a.href}
                className="flex flex-col items-center gap-2 p-4 bg-pitch-700 rounded-xl border border-pitch-600 hover:border-gold-subtle hover:bg-pitch-600 transition-all group"
              >
                <a.icon className="w-5 h-5 text-pitch-300 group-hover:text-gold-400 transition-colors" />
                <span className="text-xs font-semibold text-pitch-200 group-hover:text-white transition-colors text-center">{a.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card rounded-xl p-5">
          <h2 className="subsection-title mb-4">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="text-pitch-400 text-sm text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.slice(0, 6).map(log => (
                <div key={log.id} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-gold-500 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-white font-medium capitalize">{log.action.replace(/_/g, ' ')}</span>
                    {log.entity_type && (
                      <span className="text-pitch-400"> on {log.entity_type}</span>
                    )}
                    <div className="text-pitch-500 text-xs mt-0.5">
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
