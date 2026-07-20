import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Crown, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWorldCupMatches, useWorldCupDates, useWorldCupCompetition } from '../hooks/useWorldCupMatches';
import { useUserPredictions, useSavePredictions } from '../hooks/usePredictions';

import { supabase } from '../lib/supabase';
import MatchCard from '../components/MatchCard';
import DateNav from '../components/DateNav';
import LiveLeaderboard from '../components/LiveLeaderboard';
import RecentPredictions from '../components/RecentPredictions';
import { ToastContainer } from '../components/Toast';
import type { ToastType } from '../components/Toast';
import type { PredictionInput } from '../types';

function getTodayString() {
  // Manual IST offset (UTC+5:30) — matches fixturesApi.ts date bucketing exactly
  const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
  const istMs = Date.now() + IST_OFFSET_MS;
  const d = new Date(istMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isMatchLocked(lockTime: string) {
  return new Date() >= new Date(lockTime);
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { competitions } = useWorldCupCompetition();
  const activeCompetition = competitions[0];

  const { dates } = useWorldCupDates();
  const [selectedDate, setSelectedDate] = useState(getTodayString());

  useEffect(() => {
    if (dates.length > 0 && !dates.includes(selectedDate)) {
      const today = getTodayString();
      setSelectedDate(dates.includes(today) ? today : dates[0]);
    }
  }, [dates]);

  const { matches, loading: matchesLoading } = useWorldCupMatches(selectedDate);
  const matchIds = matches.map(m => m.id);

  const { predictions: savedPredictions, refetch: refetchPredictions } = useUserPredictions(
    user?.id,
    matchIds
  );

  const [localPredictions, setLocalPredictions] = useState<Record<string, { home: number; away: number; penaltyWinner: 'home' | 'away' | null }>>({});
  const { savePredictions, saving } = useSavePredictions();

  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([]);
  const [topScorer, setTopScorer] = useState<any>(null);
  const [todaysPredictions, setTodaysPredictions] = useState<any[]>([]);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);

  const finishedMatches = matches.filter(m => m.status === 'finished' || m.result_published);
  const finishedMatchIdsStr = finishedMatches.map(m => m.id).sort().join(',');

  const fetchTodaysPredictions = useCallback(async () => {
    if (!finishedMatchIdsStr) {
      setTodaysPredictions([]);
      return;
    }
    setPredictionsLoading(true);
    try {
      const matchIds = finishedMatchIdsStr.split(',');
      const { data, error } = await supabase
        .from('predictions')
        .select('*, profiles(username, display_name)')
        .in('match_id', matchIds)
        .order('points_earned', { ascending: false });

      if (data && !error) {
        setTodaysPredictions(data);
      }
    } catch (err) {
      console.error("Error fetching today's predictions:", err);
    } finally {
      setPredictionsLoading(false);
    }
  }, [finishedMatchIdsStr]);

  useEffect(() => {
    fetchTodaysPredictions();

    if (!finishedMatchIdsStr) return;

    const channel = supabase
      .channel('todays-predictions-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'predictions' },
        () => {
          fetchTodaysPredictions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTodaysPredictions, finishedMatchIdsStr]);


  useEffect(() => {
    const fetchTopScorer = async () => {
      try {
        const { data, error } = await supabase
          .from('leaderboard')
          .select('*, profiles(*)')
          .order('total_points', { ascending: false })
          .order('exact_scores', { ascending: false })
          .order('accuracy', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data && !error) {
          setTopScorer(data);
        }
      } catch (err) {
        console.error('Error fetching top scorer:', err);
      }
    };

    fetchTopScorer();

    // Subscribe to realtime changes in leaderboard to keep top scorer updated
    const channel = supabase
      .channel('top-scorer-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard' }, () => {
        fetchTopScorer();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  useEffect(() => {
    const initial: Record<string, { home: number; away: number; penaltyWinner: 'home' | 'away' | null }> = {};
    matches.forEach(m => {
      const saved = savedPredictions[m.id];
      initial[m.id] = {
        home: saved?.predicted_home_score ?? 0,
        away: saved?.predicted_away_score ?? 0,
        penaltyWinner: (saved?.predicted_penalty_winner as 'home' | 'away' | null) ?? null,
      };
    });
    setLocalPredictions(initial);
  }, [matches, savedPredictions]);

  const handleSave = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Only save predictions for matches that are NOT locked
    const unlockedMatchIds = new Set(
      matches
        .filter(m => !isMatchLocked(m.prediction_lock_time))
        .map(m => m.id)
    );

    const inputs: PredictionInput[] = Object.entries(localPredictions)
      .filter(([matchId]) => unlockedMatchIds.has(matchId))
      .map(([matchId, scores]) => ({
        matchId,
        homeScore: scores.home,
        awayScore: scores.away,
        predictedPenaltyWinner: scores.penaltyWinner,
      }));

    if (!inputs.length) {
      addToast('No predictions to save', 'warning');
      return;
    }

    const ok = await savePredictions(user.id, inputs);
    if (ok) {
      addToast('Predictions saved successfully!', 'success');
      refetchPredictions();
    } else {
      addToast('Failed to save predictions. Try again.', 'error');
    }
  };

  const formatDateLabel = (date: string) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).toUpperCase();
  };
  return (
    <div className="min-h-screen bg-pitch-900">
      {/* Hero / Title */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6 text-center">
        <div className="mb-8 animate-fade-in">
          <h1 className="font-display text-4xl sm:text-6xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-gold-500 to-gold-300 mb-4 drop-shadow-lg">
            Tournament Concluded!
          </h1>
          <p className="text-pitch-100 text-lg sm:text-xl max-w-2xl mx-auto font-medium">
            Thank you to everyone who participated in the DG Score Predictor. It was an incredible journey, and the final results are in!
          </p>
        </div>

        {/* Tournament Winner Card */}
        {topScorer && (
          <div className="mt-6 max-w-3xl mx-auto border-2 border-gold-400 rounded-2xl bg-gradient-to-b from-gold-900/40 to-pitch-900/80 backdrop-blur-md shadow-[0_0_50px_rgba(250,204,21,0.3)] flex flex-col items-center justify-center p-8 gap-6 animate-fade-in group relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold-500/20 via-transparent to-transparent opacity-60"></div>
             
             <div className="flex flex-col items-center z-10">
               <div className="flex items-center gap-3 bg-gold-500/20 px-6 py-2 rounded-full border border-gold-400/50 mb-6">
                 <Trophy className="w-6 h-6 text-gold-400 animate-bounce" />
                 <span className="font-display font-black uppercase tracking-widest text-sm text-gold-300">
                   Grand Champion
                 </span>
                 <Trophy className="w-6 h-6 text-gold-400 animate-bounce" />
               </div>

               <div className="relative flex items-center justify-center w-32 h-32 select-none mb-4">
                 {/* Laurel Wreath SVG */}
                 <svg 
                   className="absolute w-32 h-32 text-gold-500 group-hover:scale-110 transition-transform duration-700" 
                   viewBox="0 0 100 100" 
                   fill="none" 
                   stroke="currentColor" 
                   strokeWidth="3"
                 >
                   <path d="M 35 75 C 20 60, 20 40, 35 25" strokeLinecap="round" />
                   <path d="M 35 72 L 28 68 M 28 58 L 21 56 M 25 46 L 18 44 M 29 34 L 23 30" strokeLinecap="round" />
                   <path d="M 65 75 C 80 60, 80 40, 65 25" strokeLinecap="round" />
                   <path d="M 65 72 L 72 68 M 72 58 L 79 56 M 75 46 L 82 44 M 71 34 L 77 30" strokeLinecap="round" />
                 </svg>
                 <Crown className="w-16 h-16 text-gold-400 absolute animate-pulse" />
               </div>

               <div className="text-center">
                 <div className="text-white font-display font-black text-4xl sm:text-5xl uppercase tracking-widest drop-shadow-md mb-2 group-hover:text-gold-300 transition-colors duration-300">
                   {topScorer.profiles?.username || '---'}
                 </div>
                 <div className="text-gold-200 text-lg sm:text-xl font-medium mb-6">
                   All hail the Prediction King! 👑
                 </div>
                 
                 <div className="flex items-center justify-center gap-8 mt-2 bg-pitch-900/50 px-8 py-4 rounded-xl border border-gold-500/20">
                   <div className="text-center">
                     <div className="text-xs text-pitch-300 font-bold uppercase tracking-wider mb-1">Total Points</div>
                     <div className="text-3xl font-black text-gold-400 font-display">{topScorer.total_points || 0}</div>
                   </div>
                   <div className="w-px h-12 bg-gold-500/30"></div>
                   <div className="text-center">
                     <div className="text-xs text-pitch-300 font-bold uppercase tracking-wider mb-1">Accuracy</div>
                     <div className="text-3xl font-black text-success-400 font-display">{topScorer.accuracy != null ? `${Math.round(topScorer.accuracy)}%` : '0%'}</div>
                   </div>
                 </div>
               </div>
             </div>
          </div>
        )}

        {/* Today's Prediction Top Scores Card */}
        {todaysPredictions.length > 0 && (
          <div className="mt-6 max-w-2xl mx-auto border border-pitch-700/80 rounded-xl bg-pitch-800/40 backdrop-blur-md p-5 text-left shadow-lg animate-fade-in flex flex-col">
            {/* Card Header */}
            <div className="flex items-center justify-between mb-4 border-b border-pitch-700/40 pb-2">
              <div className="flex items-center gap-2 select-none">
                <Trophy className="w-4 h-4 text-gold-400" />
                <h3 className="font-display font-bold uppercase tracking-wider text-xs text-pitch-200">
                  Today's Prediction Scores
                </h3>
              </div>
              <button
                onClick={() => setShowAllModal(true)}
                className="text-[11px] font-display font-bold uppercase tracking-widest text-gold-400 hover:text-gold-300 transition-colors select-none"
              >
                View All
              </button>
            </div>

            {/* Scrollable Container */}
            <div className="max-h-56 overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-pitch-700">
              {todaysPredictions.slice(0, 10).map((pred, index) => {
                const match = matches.find(m => m.id === pred.match_id);
                const homeFlag = match?.home_team?.flag_emoji || '🏳️';
                const awayFlag = match?.away_team?.flag_emoji || '🏳️';
                const points = pred.points_earned ?? 0;

                let badgeColor = "bg-pitch-700 text-pitch-300";
                if (pred.is_exact_score) badgeColor = "bg-success-900/60 text-success-300 border border-success-700/30";
                else if (pred.is_correct_result) badgeColor = "bg-warn-900/60 text-warn-300 border border-warn-700/30";

                return (
                  <div key={pred.id} className="flex items-center justify-between p-2.5 rounded-lg bg-pitch-900/40 hover:bg-pitch-900/80 transition-colors text-xs gap-3">
                    {/* Rank & Username */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-mono font-bold text-pitch-400 w-5">#{index + 1}</span>
                      <span className="font-semibold text-white truncate">
                        {pred.profiles?.username || '---'}
                      </span>
                    </div>

                    {/* Match & Prediction Info */}
                    <div className="flex items-center gap-2 flex-shrink-0 text-pitch-300">
                      <div className="flex items-center gap-1 select-none">
                        <span>{homeFlag}</span>
                        <span className="font-mono text-pitch-400 font-bold px-1">{pred.predicted_home_score}-{pred.predicted_away_score}</span>
                        <span>{awayFlag}</span>
                      </div>
                      <span className="text-pitch-500 select-none">|</span>
                      <div className="text-[10px] bg-pitch-850 px-1.5 py-0.5 rounded text-pitch-400 font-mono select-none">
                        FT: {match?.home_score ?? 0}-{match?.away_score ?? 0}
                      </div>
                    </div>

                    {/* Points Badge */}
                    <div className="flex-shrink-0 select-none">
                      <span className={`px-2 py-0.5 rounded-full font-bold font-display text-[10px] uppercase tracking-wider ${badgeColor}`}>
                        +{points} pts
                      </span>
                    </div>
                  </div>
                );
              })}
              {todaysPredictions.length > 10 && (
                <div className="text-center py-2 border-t border-pitch-800/30 mt-2">
                  <button
                    onClick={() => setShowAllModal(true)}
                    className="text-xs text-pitch-400 hover:text-gold-400 transition-colors font-medium select-none"
                  >
                    And {todaysPredictions.length - 10} more... Click View All
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* View All Modal */}
        {showAllModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pitch-950/85 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-2xl bg-pitch-900 border border-pitch-700/80 rounded-xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-pitch-800 select-none">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-gold-400" />
                  <h2 className="font-display font-bold uppercase tracking-wider text-sm text-white">
                    Today's Prediction Leaderboard
                  </h2>
                </div>
                <button
                  onClick={() => setShowAllModal(false)}
                  className="p-1 rounded-lg hover:bg-pitch-850 text-pitch-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body / Scrollable Table */}
              <div className="flex-1 overflow-y-auto p-4">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-pitch-800 text-pitch-400 uppercase font-display text-[10px] tracking-wider select-none">
                      <th className="py-2.5 px-3">Rank</th>
                      <th className="py-2.5 px-3">User</th>
                      <th className="py-2.5 px-3 text-center">Prediction</th>
                      <th className="py-2.5 px-3 text-center">Actual Score</th>
                      <th className="py-2.5 px-3 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pitch-800/40 text-pitch-300">
                    {todaysPredictions.map((pred, index) => {
                      const match = matches.find(m => m.id === pred.match_id);
                      const homeFlag = match?.home_team?.flag_emoji || '🏳️';
                      const awayFlag = match?.away_team?.flag_emoji || '🏳️';
                      const points = pred.points_earned ?? 0;

                      let badgeColor = "bg-pitch-700 text-pitch-300";
                      if (pred.is_exact_score) badgeColor = "bg-success-900/60 text-success-300 border border-success-700/30";
                      else if (pred.is_correct_result) badgeColor = "bg-warn-900/60 text-warn-300 border border-warn-700/30";

                      return (
                        <tr key={pred.id} className="hover:bg-pitch-800/20 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-pitch-400">#{index + 1}</td>
                          <td className="py-3 px-3 font-semibold text-white">
                            {pred.profiles?.username || '---'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex items-center gap-1 select-none">
                              <span>{homeFlag}</span>
                              <span className="font-mono text-pitch-200 font-bold px-1">{pred.predicted_home_score} - {pred.predicted_away_score}</span>
                              <span>{awayFlag}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-pitch-400 select-none">
                            {match?.home_score ?? 0} - {match?.away_score ?? 0}
                          </td>
                          <td className="py-3 px-3 text-right select-none">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold font-display text-[10px] uppercase tracking-wider ${badgeColor}`}>
                              +{points} pts
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}


        {/* Auth prompt */}
        {!user && (
          <p className="mt-4 text-sm text-pitch-300">
            Your picks save automatically on this device.{' '}
            <Link to="/login" className="text-gold-400 hover:text-gold-300 font-semibold underline">
              Sign in
            </Link>{' '}
            to use them on another phone or browser.
          </p>
        )}
      </div>

      {/* Date Navigation */}
      {dates.length > 0 && (
        <DateNav dates={dates} selectedDate={selectedDate} onSelect={setSelectedDate} />
      )}

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Matches Column */}
          <div className="lg:col-span-2">
            {/* Date Header */}
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-display font-bold uppercase tracking-wider text-white">
                {formatDateLabel(selectedDate)}
              </h2>
              <span className="text-pitch-400 text-sm">IST</span>
            </div>

            {/* Match List */}
            <div className="card-dark rounded-xl overflow-hidden">
              {matchesLoading ? (
                <div className="py-12 flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-pitch-300 text-sm">Loading matches...</span>
                </div>
              ) : matches.length === 0 ? (
                <div className="py-16 text-center">
                  <Trophy className="w-12 h-12 text-pitch-600 mx-auto mb-4" />
                  <p className="text-pitch-300 font-semibold">No matches scheduled</p>
                  <p className="text-pitch-400 text-sm mt-1">
                    {dates.length === 0
                      ? 'Check back when the tournament schedule is published.'
                      : 'Select another date to view matches.'}
                  </p>
                </div>
              ) : (
                <div>
                  {matches.map(match => {
                    const locked = isMatchLocked(match.prediction_lock_time);
                    return (
                      <MatchCard
                        key={match.id}
                        match={match}
                        homeScore={localPredictions[match.id]?.home ?? 0}
                        awayScore={localPredictions[match.id]?.away ?? 0}
                        penaltyWinner={localPredictions[match.id]?.penaltyWinner ?? null}
                        onHomeChange={v => {
                          if (locked) return;
                          setLocalPredictions(prev => ({
                            ...prev,
                            [match.id]: { ...prev[match.id], home: v },
                          }));
                        }}
                        onAwayChange={v => {
                          if (locked) return;
                          setLocalPredictions(prev => ({
                            ...prev,
                            [match.id]: { ...prev[match.id], away: v },
                          }));
                        }}
                        onPenaltyWinnerChange={winner => {
                          setLocalPredictions(prev => ({
                            ...prev,
                            [match.id]: { ...prev[match.id], penaltyWinner: winner },
                          }));
                        }}
                        isAuthenticated={!!user}
                        onLoginPrompt={() => navigate('/login')}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Save Button — only show if there are unlocked matches */}
            {matches.some(m => !isMatchLocked(m.prediction_lock_time)) && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-gold rounded-sm text-sm px-10 py-4 shadow-gold"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-pitch-900 border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </span>
                  ) : user ? (
                    'Save & Join Leaderboard'
                  ) : (
                    'Sign In to Save & Join Leaderboard'
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Leaderboard Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {user && <RecentPredictions />}
            <LiveLeaderboard competitionId={activeCompetition?.id} />
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
