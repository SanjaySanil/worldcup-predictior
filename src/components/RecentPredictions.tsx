import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { History as HistoryIcon, CheckCircle, XCircle, Calendar, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { fetchWorldCupFixtures } from '../lib/fixturesApi';
import { fetchMatchResults } from '../lib/matchResults';
import { usePointSettings } from '../hooks/usePointSettings';
import type { Prediction, MatchWithTeams } from '../types';

interface PredictionWithMatch extends Prediction {
  matches: MatchWithTeams | null;
}

export default function RecentPredictions() {
  const { user } = useAuth();
  const { settings } = usePointSettings();
  const [predictions, setPredictions] = useState<PredictionWithMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadRecentPredictions = async () => {
      try {
        const { data: preds } = await supabase
          .from('predictions')
          .select('*')
          .eq('user_id', user.id)
          .order('submitted_at', { ascending: false })
          .limit(5);

        const [{ matches: fixtures }, resultsOverlay] = await Promise.all([
          fetchWorldCupFixtures(),
          fetchMatchResults(),
        ]);

        const mapped = (preds || []).map((p: any) => {
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

        setPredictions(mapped);
      } catch (err) {
        console.error('Error loading recent predictions:', err);
      } finally {
        setLoading(false);
      }
    };

    loadRecentPredictions();
  }, [user]);

  if (!user) return null;

  return (
    <div className="card-dark rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-pitch-700 bg-pitch-900/10">
        <HistoryIcon className="w-4 h-4 text-gold-400" />
        <span className="font-display font-bold uppercase tracking-wider text-sm text-white">
          Recent Predictions
        </span>
      </div>

      {/* List */}
      <div className="divide-y divide-pitch-700">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-4 py-3 space-y-2">
              <div className="h-4 bg-pitch-600 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-pitch-600 rounded animate-pulse w-1/2" />
            </div>
          ))
        ) : predictions.length === 0 ? (
          <div className="px-4 py-6 text-center text-pitch-400 text-xs">
            <Target className="w-8 h-8 text-pitch-600 mx-auto mb-2 opacity-50" />
            <p>No predictions yet.</p>
            <Link to="/" className="text-gold-500 hover:underline mt-1 inline-block">
              Start predicting now!
            </Link>
          </div>
        ) : (
          predictions.map(p => {
            const match = p.matches;
            const isExact = p.is_exact_score;
            const isCorrect = p.is_correct_result;
            const isPending = isCorrect === null;

            return (
              <div key={p.id} className="px-4 py-3 hover:bg-pitch-700/30 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  {/* Match Matchup */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs text-white font-semibold truncate">
                      {match?.home_team?.flag_emoji} {match?.home_team?.short_code || 'HOME'}
                    </span>
                    <span className="text-[10px] text-pitch-400 font-bold uppercase">vs</span>
                    <span className="text-xs text-white font-semibold truncate">
                      {match?.away_team?.short_code || 'AWAY'} {match?.away_team?.flag_emoji}
                    </span>
                  </div>

                  {/* Points tag */}
                  <div className="flex-shrink-0">
                    {isPending ? (
                      <span className="text-[10px] bg-pitch-600/50 text-pitch-300 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        Pending
                      </span>
                    ) : isExact ? (
                      <span className="text-[10px] bg-success-800 text-success-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle className="w-2.5 h-2.5" />
                        +{p.points_earned || settings.exact_score_points} PTS
                      </span>
                    ) : isCorrect ? (
                      <span className="text-[10px] bg-warn-800 text-warn-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle className="w-2.5 h-2.5" />
                        +{p.points_earned || settings.correct_result_points} PTS
                      </span>
                    ) : (
                      <span className="text-[10px] bg-danger-900/60 text-danger-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                        <XCircle className="w-2.5 h-2.5" />
                        +0 PTS
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-1 text-[11px] text-pitch-400">
                  {/* Predicted vs Actual */}
                  <div>
                    <span>Pred: </span>
                    <span className="font-mono font-bold text-pitch-200">
                      {p.predicted_home_score} - {p.predicted_away_score}
                    </span>
                    {match?.result_published && match?.home_score != null && (
                      <>
                        <span className="mx-1 text-pitch-500">•</span>
                        <span>Result: </span>
                        <span className="font-mono text-pitch-300">
                          {match.home_score} - {match.away_score}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Stage or Date */}
                  <span className="text-[10px] text-pitch-500">
                    {match?.group_name ? `${match.group_name}` : 'WC 2026'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer View All Link */}
      {!loading && predictions.length > 0 && (
        <div className="px-4 py-2.5 border-t border-pitch-700 bg-pitch-900/10">
          <Link
            to="/history"
            className="text-xs text-gold-500 hover:text-gold-400 font-semibold uppercase tracking-wider transition-colors inline-block"
          >
            View all predictions →
          </Link>
        </div>
      )}
    </div>
  );
}
