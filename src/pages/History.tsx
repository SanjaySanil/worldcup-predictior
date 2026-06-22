import { useState, useEffect } from 'react';
import { History as HistoryIcon, CheckCircle, XCircle, Target, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { fetchWorldCupFixtures } from '../lib/fixturesApi';
import { fetchMatchResults } from '../lib/matchResults';
import type { Prediction, MatchWithTeams } from '../types';

interface PredictionWithMatch extends Prediction {
  matches: MatchWithTeams | null;
}

export default function History() {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<PredictionWithMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong' | 'pending'>('all');

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const loadData = async () => {
      try {
        const { data: preds } = await supabase
          .from('predictions')
          .select('*')
          .eq('user_id', user.id)
          .order('submitted_at', { ascending: false })
          .limit(100);

        const [{ matches: fixtures }, resultsOverlay] = await Promise.all([
          fetchWorldCupFixtures(),
          fetchMatchResults(),
        ]);

        const predictionsWithMatch = (preds || []).map((p: any) => {
          const apiMatch = fixtures.find(f => f.id === p.match_id);
          let matchObj: MatchWithTeams | null = null;
          if (apiMatch) {
            const published = resultsOverlay[apiMatch.id];
            matchObj = {
              ...apiMatch,
              ...(published ? {
                home_score: published.home_score,
                away_score: published.away_score,
                status: published.status as MatchWithTeams['status'],
                result_published: published.result_published,
                result_published_at: published.result_published_at,
              } : {}),
            };
          }
          return {
            ...p,
            matches: matchObj,
          };
        });

        setPredictions(predictionsWithMatch);
      } catch (err) {
        console.error('Error loading history:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const filtered = predictions.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'correct') return p.is_correct_result === true;
    if (filter === 'wrong') return p.is_correct_result === false;
    if (filter === 'pending') return p.is_correct_result === null;
    return true;
  });

  const totalPoints = predictions.reduce((sum, p) => sum + (p.points_earned || 0), 0);
  const exactCount = predictions.filter(p => p.is_exact_score).length;
  const correctCount = predictions.filter(p => p.is_correct_result).length;
  const accuracy = predictions.filter(p => p.is_correct_result !== null).length > 0
    ? Math.round((correctCount / predictions.filter(p => p.is_correct_result !== null).length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-pitch-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <HistoryIcon className="w-7 h-7 text-gold-500" />
          <h1 className="font-display text-3xl font-bold uppercase tracking-widest text-white">
            My History
          </h1>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="stat-card text-center">
            <div className="font-display font-black text-3xl text-gold-400">{totalPoints}</div>
            <div className="text-xs text-pitch-400 uppercase tracking-wider mt-1">Total Points</div>
          </div>
          <div className="stat-card text-center">
            <div className="font-display font-black text-3xl text-white">{predictions.length}</div>
            <div className="text-xs text-pitch-400 uppercase tracking-wider mt-1">Predictions</div>
          </div>
          <div className="stat-card text-center">
            <div className="font-display font-black text-3xl text-success-400">{exactCount}</div>
            <div className="text-xs text-pitch-400 uppercase tracking-wider mt-1">Exact Scores</div>
          </div>
          <div className="stat-card text-center">
            <div className="font-display font-black text-3xl text-white">{accuracy}%</div>
            <div className="text-xs text-pitch-400 uppercase tracking-wider mt-1">Accuracy</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['all', 'correct', 'wrong', 'pending'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-semibold capitalize transition-all ${
                filter === f
                  ? 'bg-gold-gradient text-pitch-900'
                  : 'bg-pitch-700 text-pitch-200 hover:text-white'
              }`}
            >
              {f}
              {f !== 'all' && (
                <span className="ml-1.5 text-xs opacity-70">
                  ({f === 'correct' ? correctCount : f === 'wrong' ? predictions.filter(p => p.is_correct_result === false).length : predictions.filter(p => p.is_correct_result === null).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Predictions List */}
        {loading ? (
          <div className="py-12 flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-pitch-300 text-sm">Loading your predictions...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center card-dark rounded-xl">
            <Target className="w-12 h-12 text-pitch-600 mx-auto mb-4" />
            <p className="text-pitch-300 font-semibold">No predictions found</p>
            <p className="text-pitch-400 text-sm mt-1">
              {filter === 'all' ? 'Start predicting matches to build your history.' : 'No predictions match this filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(p => {
              const match = p.matches;
              const isExact = p.is_exact_score;
              const isCorrect = p.is_correct_result;
              const isPending = isCorrect === null;

              return (
                <div
                  key={p.id}
                  className={`card-dark rounded-xl px-5 py-4 flex items-center gap-4 border-l-4 ${
                    isExact ? 'border-l-success-500' :
                    isCorrect ? 'border-l-warn-500' :
                    isPending ? 'border-l-pitch-600' :
                    'border-l-danger-600'
                  }`}
                >
                  {/* Status icon */}
                  <div className="flex-shrink-0">
                    {isPending ? (
                      <Calendar className="w-5 h-5 text-pitch-400" />
                    ) : isExact ? (
                      <CheckCircle className="w-5 h-5 text-success-400" />
                    ) : isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-warn-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-danger-400" />
                    )}
                  </div>

                  {/* Match info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold text-sm">
                        {match?.home_team?.flag_emoji} {match?.home_team?.name || 'Home'}
                      </span>
                      <span className="text-pitch-400 text-sm font-mono font-bold">
                        {p.predicted_home_score} - {p.predicted_away_score}
                      </span>
                      <span className="text-white font-semibold text-sm">
                        {match?.away_team?.name || 'Away'} {match?.away_team?.flag_emoji}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-pitch-400">
                      <span>{match ? new Date(match.kickoff_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</span>
                      {match?.result_published && match?.home_score != null && (
                        <span className="text-pitch-300">
                          Result: {match.home_score}-{match.away_score}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-right flex-shrink-0">
                    {isPending ? (
                      <span className="text-pitch-400 text-sm">Pending</span>
                    ) : (
                      <div>
                        <span className={`font-black font-display text-lg ${
                          isExact ? 'text-success-400' :
                          isCorrect ? 'text-warn-400' :
                          'text-pitch-400'
                        }`}>
                          +{p.points_earned}
                        </span>
                        <div className="text-xs text-pitch-500">pts</div>
                      </div>
                    )}
                    {isExact && (
                      <div className="tag bg-success-800 text-success-300 text-[10px] mt-1">Exact!</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
