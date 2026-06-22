import { useState } from 'react';
import { Trophy, Medal, TrendingUp, Users, Target, Zap } from 'lucide-react';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useCompetitions } from '../hooks/useMatches';
import { useAuth } from '../contexts/AuthContext';
import LeaderboardRow from '../components/LeaderboardRow';

export default function Leaderboard() {
  const { user } = useAuth();
  const { competitions } = useCompetitions();
  const [selectedCompetition, setSelectedCompetition] = useState<string | undefined>();
  const activeCompetition = competitions[0];
  const compId = selectedCompetition || activeCompetition?.id;

  const { entries, loading, getRankChange } = useLeaderboard(compId, 100);
  const userEntry = entries.find(e => e.user_id === user?.id);

  const topThree = entries.slice(0, 3);

  return (
    <div className="min-h-screen bg-pitch-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Trophy className="w-8 h-8 text-gold-500" />
            <h1 className="font-display text-4xl font-bold uppercase tracking-widest text-white">
              Leaderboard
            </h1>
          </div>
          <p className="text-pitch-300">Real-time rankings updated after every match</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="live-dot" />
            <span className="text-success-400 text-xs font-bold uppercase tracking-wider">Live Updates</span>
          </div>
        </div>

        {/* Competition Filter */}
        {competitions.length > 1 && (
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            <button
              onClick={() => setSelectedCompetition(undefined)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                !selectedCompetition ? 'bg-gold-gradient text-pitch-900' : 'bg-pitch-700 text-pitch-200 hover:text-white'
              }`}
            >
              All
            </button>
            {competitions.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCompetition(c.id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  selectedCompetition === c.id ? 'bg-gold-gradient text-pitch-900' : 'bg-pitch-700 text-pitch-200 hover:text-white'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Top 3 Podium */}
        {!loading && topThree.length >= 3 && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {/* 2nd Place */}
            <div className="flex flex-col items-center pt-4">
              <div className="w-12 h-12 rounded-full bg-pitch-300 flex items-center justify-center mb-2">
                <span className="font-black text-pitch-900 text-sm">
                  {topThree[1].profiles?.username?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="w-full bg-pitch-700 border border-pitch-600 rounded-t-xl p-3 text-center min-h-[80px] flex flex-col justify-end">
                <Medal className="w-5 h-5 text-pitch-300 mx-auto mb-1" />
                <div className="text-sm font-bold text-white truncate">{topThree[1].profiles?.username}</div>
                <div className="text-gold-400 font-black font-display text-xl">{topThree[1].total_points}</div>
                <div className="text-xs text-pitch-400">2nd place</div>
              </div>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-yellow-500 flex items-center justify-center mb-2 shadow-gold">
                <span className="font-black text-pitch-900 text-lg">
                  {topThree[0].profiles?.username?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="w-full bg-pitch-700 border border-gold-subtle rounded-t-xl p-3 text-center min-h-[100px] flex flex-col justify-end" style={{ background: 'linear-gradient(180deg, #2a2400 0%, #1a1a1a 100%)' }}>
                <Trophy className="w-6 h-6 text-gold-500 mx-auto mb-1" />
                <div className="text-sm font-bold text-white truncate">{topThree[0].profiles?.username}</div>
                <div className="text-gold-400 font-black font-display text-2xl">{topThree[0].total_points}</div>
                <div className="text-xs text-gold-500">1st place</div>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center pt-6">
              <div className="w-11 h-11 rounded-full bg-amber-700 flex items-center justify-center mb-2">
                <span className="font-black text-white text-sm">
                  {topThree[2].profiles?.username?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="w-full bg-pitch-700 border border-pitch-600 rounded-t-xl p-3 text-center min-h-[70px] flex flex-col justify-end">
                <Medal className="w-4 h-4 text-amber-700 mx-auto mb-1" />
                <div className="text-sm font-bold text-white truncate">{topThree[2].profiles?.username}</div>
                <div className="text-gold-400 font-black font-display text-xl">{topThree[2].total_points}</div>
                <div className="text-xs text-pitch-400">3rd place</div>
              </div>
            </div>
          </div>
        )}

        {/* My Rank Card */}
        {user && userEntry && (
          <div className="card border-gold-subtle rounded-xl p-4 mb-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gold-gradient flex items-center justify-center">
              <span className="font-black text-pitch-900">
                {userEntry.profiles?.username?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className="text-xs text-pitch-300 uppercase tracking-wider">Your Ranking</div>
              <div className="font-bold text-white">{userEntry.profiles?.username}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black font-display text-gold-400">#{userEntry.rank}</div>
              <div className="text-xs text-pitch-400">Rank</div>
            </div>
            <div className="text-center hidden sm:block">
              <div className="text-xl font-black font-display text-gold-400">{userEntry.total_points}</div>
              <div className="text-xs text-pitch-400">Points</div>
            </div>
            <div className="text-center hidden sm:block">
              <div className="text-xl font-bold text-white">{userEntry.accuracy?.toFixed(0)}%</div>
              <div className="text-xs text-pitch-400">Accuracy</div>
            </div>
            <div className="text-center hidden sm:block">
              <div className="text-xl font-bold text-success-400">{userEntry.current_streak}</div>
              <div className="text-xs text-pitch-400">Streak</div>
            </div>
          </div>
        )}

        {/* Column Headers */}
        <div className="flex items-center gap-3 px-4 py-2 text-xs text-pitch-400 uppercase tracking-widest border-b border-pitch-700 mb-0">
          <div className="w-8 text-center">Rank</div>
          <div className="w-5" />
          <div className="flex-1">Player</div>
          <div className="hidden sm:flex gap-4 mr-2">
            <div className="w-16 text-center">Accuracy</div>
            <div className="w-14 text-center">Played</div>
            <div className="w-14 text-center">Streak</div>
          </div>
          <div className="w-16 text-right">Points</div>
        </div>

        {/* Leaderboard List */}
        <div className="card-dark rounded-b-xl overflow-hidden">
          {loading ? (
            <div className="py-12 flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-pitch-300 text-sm">Loading leaderboard...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="w-12 h-12 text-pitch-600 mx-auto mb-4" />
              <p className="text-pitch-300 font-semibold">No rankings yet</p>
              <p className="text-pitch-400 text-sm mt-1">Be the first to make predictions!</p>
            </div>
          ) : (
            entries.map((entry, index) => (
              <LeaderboardRow
                key={entry.id}
                entry={entry}
                rank={index + 1}
                rankChange={getRankChange(entry.user_id, index + 1)}
                isCurrentUser={entry.user_id === user?.id}
              />
            ))
          )}
        </div>

        {/* Stats Footer */}
        {entries.length > 0 && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="stat-card text-center">
              <Users className="w-5 h-5 text-gold-500 mx-auto mb-2" />
              <div className="font-display font-black text-2xl text-white">{entries.length}</div>
              <div className="text-xs text-pitch-400 uppercase tracking-wider">Players</div>
            </div>
            <div className="stat-card text-center">
              <Target className="w-5 h-5 text-success-400 mx-auto mb-2" />
              <div className="font-display font-black text-2xl text-white">
                {entries[0]?.total_points ?? 0}
              </div>
              <div className="text-xs text-pitch-400 uppercase tracking-wider">Top Score</div>
            </div>
            <div className="stat-card text-center">
              <TrendingUp className="w-5 h-5 text-blue-400 mx-auto mb-2" />
              <div className="font-display font-black text-2xl text-white">
                {entries[0]?.accuracy?.toFixed(0) ?? 0}%
              </div>
              <div className="text-xs text-pitch-400 uppercase tracking-wider">Best Accuracy</div>
            </div>
            <div className="stat-card text-center">
              <Zap className="w-5 h-5 text-warn-400 mx-auto mb-2" />
              <div className="font-display font-black text-2xl text-white">
                {Math.max(...entries.map(e => e.current_streak || 0))}
              </div>
              <div className="text-xs text-pitch-400 uppercase tracking-wider">Best Streak</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
