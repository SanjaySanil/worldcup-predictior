import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { LeaderboardEntryWithProfile } from '../types';

interface LeaderboardRowProps {
  entry: LeaderboardEntryWithProfile;
  rank: number;
  rankChange: number;
  isCurrentUser?: boolean;
  compact?: boolean;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="rank-badge bg-yellow-500 text-pitch-900 text-xs font-black w-8 h-8">
      1st
    </div>
  );
  if (rank === 2) return (
    <div className="rank-badge bg-pitch-300 text-pitch-900 text-xs font-black w-8 h-8">
      2nd
    </div>
  );
  if (rank === 3) return (
    <div className="rank-badge bg-amber-700 text-white text-xs font-black w-8 h-8">
      3rd
    </div>
  );
  return (
    <div className="rank-badge bg-pitch-600 text-pitch-200 text-xs font-bold w-8 h-8">
      {rank}
    </div>
  );
}

export default function LeaderboardRow({
  entry,
  rank,
  rankChange,
  isCurrentUser,
  compact,
}: LeaderboardRowProps) {
  return (
    <div
      className={`leaderboard-row ${
        isCurrentUser ? 'bg-pitch-700 border-l-2 border-l-gold-500' : ''
      } ${rankChange > 0 ? 'animate-rank-up' : rankChange < 0 ? 'animate-rank-down' : ''}`}
    >
      {/* Rank */}
      <RankBadge rank={rank} />

      {/* Rank change */}
      <div className="w-5 flex-shrink-0">
        {rankChange > 0 ? (
          <TrendingUp className="w-3.5 h-3.5 text-success-400" />
        ) : rankChange < 0 ? (
          <TrendingDown className="w-3.5 h-3.5 text-danger-400" />
        ) : (
          <Minus className="w-3.5 h-3.5 text-pitch-500" />
        )}
      </div>

      {/* Avatar + Username */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="w-7 h-7 rounded-full bg-gold-gradient flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-black text-pitch-900">
            {entry.profiles?.username?.[0]?.toUpperCase() || 'U'}
          </span>
        </div>
        <span
          className={`text-sm font-semibold truncate ${
            isCurrentUser ? 'text-gold-400' : 'text-white'
          }`}
        >
          {entry.profiles?.username || 'Unknown'}
        </span>
        {isCurrentUser && (
          <span className="tag bg-gold-gradient text-pitch-900 text-[10px] flex-shrink-0">You</span>
        )}
      </div>

      {/* Stats */}
      {!compact && (
        <div className="hidden sm:flex items-center gap-4 text-xs text-pitch-300">
          <div className="text-center">
            <div className="text-white font-semibold">{entry.accuracy?.toFixed(0) || 0}%</div>
            <div className="text-[10px] uppercase tracking-wider">Accuracy</div>
          </div>
          <div className="text-center">
            <div className="text-white font-semibold">{entry.matches_predicted || 0}</div>
            <div className="text-[10px] uppercase tracking-wider">Played</div>
          </div>
          <div className="text-center">
            <div className="text-success-400 font-semibold">{entry.current_streak || 0}</div>
            <div className="text-[10px] uppercase tracking-wider">Streak</div>
          </div>
        </div>
      )}

      {/* Points */}
      <div className="text-right flex-shrink-0 ml-2">
        <span className="text-gold-400 font-black font-display text-lg">
          {entry.total_points || 0}
        </span>
      </div>
    </div>
  );
}
