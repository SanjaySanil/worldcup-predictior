import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Target, Calendar, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AnalyticsData {
  usersPerDay: { date: string; count: number }[];
  predictionsPerDay: { date: string; count: number }[];
  topPredictors: { username: string; count: number }[];
  accuracyDistribution: { range: string; count: number }[];
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData>({
    usersPerDay: [],
    predictionsPerDay: [],
    topPredictors: [],
    accuracyDistribution: [],
  });
  const [stats, setStats] = useState({
    avgPredictionsPerUser: 0,
    avgAccuracy: 0,
    totalPredictions: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [
        { count: totalPredictions },
        { count: totalUsers },
        { data: leaderboardData },
        { data: auditData },
      ] = await Promise.all([
        supabase.from('predictions').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
        supabase.from('leaderboard').select('accuracy, matches_predicted, profiles(username)').order('matches_predicted', { ascending: false }).limit(10),
        supabase.from('audit_logs').select('created_at, action').order('created_at', { ascending: false }).limit(100),
      ]);

      const avgAcc = leaderboardData?.length
        ? leaderboardData.reduce((s: number, e: any) => s + (e.accuracy || 0), 0) / leaderboardData.length
        : 0;

      setStats({
        totalPredictions: totalPredictions || 0,
        totalUsers: totalUsers || 0,
        avgPredictionsPerUser: totalUsers ? Math.round((totalPredictions || 0) / (totalUsers || 1)) : 0,
        avgAccuracy: Math.round(avgAcc),
      });

      setData({
        usersPerDay: [],
        predictionsPerDay: [],
        topPredictors: leaderboardData?.map((e: any) => ({
          username: e.profiles?.username || 'Unknown',
          count: e.matches_predicted || 0,
        })) || [],
        accuracyDistribution: [
          { range: '0-20%', count: leaderboardData?.filter((e: any) => e.accuracy < 20).length || 0 },
          { range: '20-40%', count: leaderboardData?.filter((e: any) => e.accuracy >= 20 && e.accuracy < 40).length || 0 },
          { range: '40-60%', count: leaderboardData?.filter((e: any) => e.accuracy >= 40 && e.accuracy < 60).length || 0 },
          { range: '60-80%', count: leaderboardData?.filter((e: any) => e.accuracy >= 60 && e.accuracy < 80).length || 0 },
          { range: '80-100%', count: leaderboardData?.filter((e: any) => e.accuracy >= 80).length || 0 },
        ],
      });

      setLoading(false);
    };
    fetch();
  }, []);

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-400' },
    { label: 'Total Predictions', value: stats.totalPredictions, icon: Target, color: 'text-gold-400' },
    { label: 'Avg Predictions / User', value: stats.avgPredictionsPerUser, icon: BarChart3, color: 'text-success-400' },
    { label: 'Avg Accuracy', value: `${stats.avgAccuracy}%`, icon: TrendingUp, color: 'text-warn-400' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Analytics</h1>
        <p className="text-pitch-300 text-sm mt-1">Platform performance and engagement metrics</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="stat-card">
            <card.icon className={`w-5 h-5 ${card.color} mb-3`} />
            {loading ? (
              <div className="h-8 w-16 bg-pitch-600 rounded animate-pulse mb-1" />
            ) : (
              <div className="font-display font-black text-3xl text-white">{card.value}</div>
            )}
            <div className="text-xs text-pitch-400 uppercase tracking-wider mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Predictors */}
        <div className="card rounded-xl p-5">
          <h2 className="subsection-title mb-4">Top Most Active Predictors</h2>
          {data.topPredictors.length === 0 ? (
            <p className="text-pitch-400 text-sm text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-3">
              {data.topPredictors.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-pitch-400 text-xs w-5 text-center">#{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white">{p.username}</span>
                      <span className="text-xs text-pitch-400">{p.count} predictions</span>
                    </div>
                    <div className="h-1.5 bg-pitch-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gold-gradient rounded-full"
                        style={{ width: `${data.topPredictors[0]?.count ? (p.count / data.topPredictors[0].count) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accuracy Distribution */}
        <div className="card rounded-xl p-5">
          <h2 className="subsection-title mb-4">Accuracy Distribution</h2>
          <div className="space-y-3">
            {data.accuracyDistribution.map(d => (
              <div key={d.range} className="flex items-center gap-3">
                <span className="text-xs text-pitch-400 w-16">{d.range}</span>
                <div className="flex-1">
                  <div className="h-5 bg-pitch-700 rounded-full overflow-hidden flex items-center">
                    <div
                      className="h-full bg-pitch-500 rounded-full transition-all"
                      style={{ width: `${Math.max(d.count * 10, d.count > 0 ? 5 : 0)}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-pitch-300 w-6 text-right">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
