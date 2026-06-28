import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Crown } from 'lucide-react';
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
        <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-widest text-white mb-2">
          DG Score Predictor
        </h1>
        <p className="text-pitch-200 text-sm sm:text-base max-w-xl mx-auto">
          Predict each day's scorelines before kickoff and climb the live leaderboard. Free to play.
        </p>


        {/* Top Scorer Card */}
        {topScorer && (
          <div className="mt-6 max-w-2xl mx-auto border border-gold-500/20 hover:border-gold-500/50 rounded-xl bg-pitch-800/60 backdrop-blur-md shadow-gold hover:shadow-gold-lg transition-all duration-300 transform hover:-translate-y-0.5 flex flex-col sm:flex-row items-center justify-between p-4 px-6 gap-4 animate-fade-in group">
            {/* Left: Laurel Wreath & User details */}
            <div className="flex items-center gap-4">
              <div className="relative flex items-center justify-center w-14 h-14 select-none">
                {/* Laurel Wreath SVG */}
                <svg 
                  className="absolute w-14 h-14 text-gold-500/80 group-hover:scale-110 transition-transform duration-500" 
                  viewBox="0 0 100 100" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="4.5"
                >
                  {/* Left branch */}
                  <path d="M 35 75 C 20 60, 20 40, 35 25" strokeLinecap="round" />
                  <path d="M 35 72 L 28 68 M 28 58 L 21 56 M 25 46 L 18 44 M 29 34 L 23 30" strokeLinecap="round" />
                  {/* Right branch */}
                  <path d="M 65 75 C 80 60, 80 40, 65 25" strokeLinecap="round" />
                  <path d="M 65 72 L 72 68 M 72 58 L 79 56 M 75 46 L 82 44 M 71 34 L 77 30" strokeLinecap="round" />
                </svg>
                {/* Crown Icon */}
                <Crown className="w-6 h-6 text-gold-400 absolute animate-pulse" />
              </div>
              <div className="text-left">
                <div className="text-white font-display font-bold text-lg uppercase tracking-wider group-hover:text-gold-300 transition-colors duration-300">
                  {topScorer.profiles?.username || '---'}
                </div>
                <div className="text-xs text-pitch-300 font-semibold mt-0.5">
                  <span className="text-gold-400 font-black font-display text-sm">{topScorer.total_points || 0}</span> POINTS
                </div>
              </div>
            </div>

            {/* Center: Badge */}
            <div className="flex items-center gap-2 bg-gold-500/10 px-4 py-1.5 rounded-full border border-gold-500/20 group-hover:bg-gold-500/20 transition-all duration-300 select-none">
              <Trophy className="w-4 h-4 text-gold-400 animate-bounce" />
              <span className="font-display font-bold uppercase tracking-widest text-xs text-gold-400">
                Today's Top Scorer
              </span>
            </div>

            {/* Right: Accuracy */}
            <div className="text-center sm:text-right">
              <div className="text-[10px] text-pitch-400 font-bold uppercase tracking-wider select-none">
                Accuracy
              </div>
              <div className="text-xl font-black text-success-400 font-display mt-0.5 group-hover:text-success-300 transition-colors duration-300 select-none">
                {topScorer.accuracy != null ? `${Math.round(topScorer.accuracy)}%` : '0%'}
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
