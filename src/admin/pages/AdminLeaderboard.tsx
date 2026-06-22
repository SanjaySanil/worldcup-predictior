import { useState, useEffect } from 'react';
import { Trophy, BarChart3, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { LeaderboardEntryWithProfile } from '../../types';

export default function AdminLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntryWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('leaderboard')
      .select('*, profiles(*)')
      .order('total_points', { ascending: false })
      .order('exact_scores', { ascending: false })
      .limit(200);
    setEntries((data as LeaderboardEntryWithProfile[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchLeaderboard(); }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Leaderboard Management</h1>
          <p className="text-pitch-300 text-sm mt-1">{entries.length} ranked players</p>
        </div>
        <button onClick={fetchLeaderboard} className="btn-ghost rounded-lg flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-3 gap-4">
        {entries.slice(0, 3).map((entry, i) => (
          <div key={entry.id} className="stat-card text-center">
            <div className="text-2xl mb-1">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
            <div className="font-bold text-white truncate">{entry.profiles?.username}</div>
            <div className="font-display font-black text-2xl text-gold-400 mt-1">{entry.total_points}</div>
            <div className="text-xs text-pitch-400 mt-0.5">pts</div>
          </div>
        ))}
      </div>

      <div className="card rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pitch-600">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-pitch-400 uppercase tracking-wider">Rank</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-pitch-400 uppercase tracking-wider">Player</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-pitch-400 uppercase tracking-wider">Points</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-pitch-400 uppercase tracking-wider hidden md:table-cell">Exact</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-pitch-400 uppercase tracking-wider hidden md:table-cell">Correct</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-pitch-400 uppercase tracking-wider hidden lg:table-cell">Accuracy</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-pitch-400 uppercase tracking-wider hidden lg:table-cell">Streak</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-pitch-400 uppercase tracking-wider">Played</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pitch-700">
                {entries.map((entry, index) => (
                  <tr key={entry.id} className="hover:bg-pitch-700/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`font-bold ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-pitch-200' : index === 2 ? 'text-amber-600' : 'text-pitch-400'}`}>
                        #{index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gold-gradient flex items-center justify-center">
                          <span className="text-xs font-black text-pitch-900">{entry.profiles?.username?.[0]?.toUpperCase()}</span>
                        </div>
                        <span className="font-semibold text-white">{entry.profiles?.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-black font-display text-gold-400 text-lg">{entry.total_points}</td>
                    <td className="px-4 py-3 text-right text-success-400 font-semibold hidden md:table-cell">{entry.exact_scores}</td>
                    <td className="px-4 py-3 text-right text-white hidden md:table-cell">{entry.correct_results}</td>
                    <td className="px-4 py-3 text-right text-white hidden lg:table-cell">{entry.accuracy?.toFixed(0)}%</td>
                    <td className="px-4 py-3 text-right text-white hidden lg:table-cell">{entry.current_streak}</td>
                    <td className="px-4 py-3 text-right text-pitch-300">{entry.matches_predicted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
