import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Lock, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWorldCupMatches, useWorldCupDates, useWorldCupCompetition } from '../hooks/useWorldCupMatches';
import { useUserPredictions, useSavePredictions } from '../hooks/usePredictions';
import { usePointSettings } from '../hooks/usePointSettings';
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
  const { user, profile } = useAuth();
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

  const [localPredictions, setLocalPredictions] = useState<Record<string, { home: number; away: number }>>({});
  const { savePredictions, saving } = useSavePredictions();
  const { settings } = usePointSettings();
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  useEffect(() => {
    const initial: Record<string, { home: number; away: number }> = {};
    matches.forEach(m => {
      const saved = savedPredictions[m.id];
      initial[m.id] = {
        home: saved?.predicted_home_score ?? 0,
        away: saved?.predicted_away_score ?? 0,
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

  const activePredictionCount = Object.keys(localPredictions).length;

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

        {/* Points Info Banner */}
        <div className="mt-6 max-w-2xl mx-auto border border-gold-subtle rounded-lg px-5 py-4 bg-pitch-800">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Info className="w-4 h-4 text-gold-400" />
            <span className="font-display font-bold uppercase tracking-widest text-sm text-gold-400">
              How Points Work
            </span>
          </div>
          <p className="text-sm text-pitch-100">
            <strong className="text-white">Exact scoreline = {settings.exact_score_points} pts</strong>
            {' · '}
            <strong className="text-white">Correct result = {settings.correct_result_points} {settings.correct_result_points === 1 ? 'pt' : 'pts'}</strong>
            {' · '}
            <span className="text-pitch-300">Most points by the final wins the amazing prize.</span>
          </p>
        </div>

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
                        onHomeChange={v => {
                          if (locked) return; // block locked matches
                          setLocalPredictions(prev => ({
                            ...prev,
                            [match.id]: { ...prev[match.id], home: v },
                          }));
                        }}
                        onAwayChange={v => {
                          if (locked) return; // block locked matches
                          setLocalPredictions(prev => ({
                            ...prev,
                            [match.id]: { ...prev[match.id], away: v },
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
