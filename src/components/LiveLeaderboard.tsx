import { Link } from 'react-router-dom';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useAuth } from '../contexts/AuthContext';

interface LiveLeaderboardProps {
  competitionId?: string;
}

export default function LiveLeaderboard({ competitionId }: LiveLeaderboardProps) {
  const { entries, loading, getRankChange } = useLeaderboard(competitionId, 20);
  const { user } = useAuth();

  return (
    <div className="card-dark rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-pitch-700">
        <span className="font-display font-bold uppercase tracking-wider text-sm text-white">
          Live Leaderboard
        </span>
        <div className="flex items-center gap-1.5">
          <span className="live-dot" />
          <span className="text-success-400 text-xs font-bold uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* Entries */}
      <div className="divide-y divide-pitch-700">
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-7 h-7 rounded-full bg-pitch-600 animate-pulse" />
              <div className="h-4 bg-pitch-600 rounded animate-pulse flex-1" />
              <div className="h-4 w-6 bg-pitch-600 rounded animate-pulse" />
            </div>
          ))
        ) : entries.length === 0 ? (
          <div className="px-4 py-8 text-center text-pitch-300 text-sm">
            <p>No predictions yet.</p>
            <p className="mt-1 text-xs">Be the first to predict!</p>
          </div>
        ) : (
          entries.map((entry, index) => {
            const rank = index + 1;
            const rankChange = getRankChange(entry.user_id, rank);
            const isCurrentUser = entry.user_id === user?.id;

            return (
              <div
                key={entry.id}
                className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                  isCurrentUser ? 'bg-pitch-700' : 'hover:bg-pitch-700'
                } ${rankChange > 0 ? 'animate-rank-up' : rankChange < 0 ? 'animate-rank-down' : ''}`}
              >
                <span className={`text-xs font-bold w-6 text-center ${
                  rank === 1 ? 'text-yellow-400' :
                  rank === 2 ? 'text-pitch-200' :
                  rank === 3 ? 'text-amber-600' :
                  'text-pitch-400'
                }`}>
                  {rank}
                </span>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-semibold truncate block ${
                    isCurrentUser ? 'text-gold-400' : 'text-white'
                  }`}>
                    {entry.profiles?.username || 'Unknown'}
                  </span>
                </div>
                <span className="text-gold-400 font-black font-display text-base">
                  {entry.total_points || 0}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* View All Link */}
      {entries.length > 0 && (
        <div className="px-4 py-3 border-t border-pitch-700">
          <Link
            to="/leaderboard"
            className="text-xs text-gold-500 hover:text-gold-400 font-semibold uppercase tracking-wider transition-colors"
          >
            View full leaderboard →
          </Link>
        </div>
      )}
    </div>
  );
}
