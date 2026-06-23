import { X, Trophy, Zap, Lock, BookOpen } from 'lucide-react';
import { usePointSettings } from '../hooks/usePointSettings';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  const { settings, loading } = usePointSettings();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop blur overlay */}
      <div 
        className="absolute inset-0 bg-pitch-950/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-pitch-800 border border-gold-subtle rounded-2xl shadow-card overflow-hidden z-10 max-h-[90vh] flex flex-col animate-slide-in">
        {/* Header */}
        <div className="p-5 border-b border-pitch-700 flex items-center justify-between bg-pitch-900/50">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-gold-400" />
            <h2 className="font-display font-bold text-lg uppercase tracking-wider text-white">
              How to Play & Scoring Rules
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-pitch-300 hover:text-white hover:bg-pitch-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-pitch-200">
          {/* Section 1: The Basics */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded bg-gold-400/10 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-gold-400" />
              </div>
              <h3 className="font-display font-bold uppercase tracking-wider text-white">
                1. The Basics
              </h3>
            </div>
            <ul className="list-disc pl-5 space-y-1.5 text-pitch-300">
              <li>Enter your score predictions for each match on the **Predict** page.</li>
              <li>Save your predictions by clicking **Save & Join Leaderboard**.</li>
              <li className="flex items-center gap-1.5 text-warn-400">
                <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Predictions lock automatically at the kickoff time of each match. No changes are allowed after lock.</span>
              </li>
            </ul>
          </div>

          {/* Section 2: Points Scoring */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded bg-success-400/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-success-400" />
              </div>
              <h3 className="font-display font-bold uppercase tracking-wider text-white">
                2. Points System
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-pitch-900/50 rounded-xl border border-pitch-700">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-white">Exact Scoreline</span>
                  <span className="tag bg-success-800 text-success-300">
                    {loading ? '3' : settings.exact_score_points} {settings.exact_score_points === 1 ? 'pt' : 'pts'}
                  </span>
                </div>
                <p className="text-xs text-pitch-400">
                  You predict the correct scoreline for both teams (e.g., predicted 2-1 and match ended 2-1).
                </p>
              </div>

              <div className="p-4 bg-pitch-900/50 rounded-xl border border-pitch-700">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-white">Correct Result</span>
                  <span className="tag bg-warn-800 text-warn-300">
                    {loading ? '1' : settings.correct_result_points} {settings.correct_result_points === 1 ? 'pt' : 'pts'}
                  </span>
                </div>
                <p className="text-xs text-pitch-400">
                  You predict the correct outcome (W/D/L) but incorrect scoreline (e.g., predicted 3-1, match ended 2-0).
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Bonuses */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded bg-gold-400/10 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-gold-400" />
              </div>
              <h3 className="font-display font-bold uppercase tracking-wider text-white">
                3. Bonuses & Streaks
              </h3>
            </div>
            <div className="space-y-3 bg-pitch-900/30 p-4 rounded-xl border border-pitch-700">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="font-bold text-white text-xs uppercase tracking-wider">Streak Bonus</div>
                  <p className="text-xs text-pitch-400 mt-0.5">
                    Triggered after {loading ? '3' : settings.streak_threshold} consecutive correct result predictions.
                  </p>
                </div>
                <span className="tag bg-gold-900 text-gold-300 font-bold whitespace-nowrap">
                  +{loading ? '5' : settings.streak_bonus_points} pts
                </span>
              </div>
              <hr className="border-pitch-700/50" />
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="font-bold text-white text-xs uppercase tracking-wider">Daily Winner Bonus</div>
                  <p className="text-xs text-pitch-400 mt-0.5">Extra points awarded to the top score(s) of any calendar day.</p>
                </div>
                <span className="tag bg-pitch-600 text-pitch-200 font-bold whitespace-nowrap">
                  +{loading ? '10' : settings.daily_winner_points} pts
                </span>
              </div>
              <hr className="border-pitch-700/50" />
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="font-bold text-white text-xs uppercase tracking-wider">Weekly / Monthly Winner</div>
                  <p className="text-xs text-pitch-400 mt-0.5">Extra points awarded to the top score(s) of the week or month.</p>
                </div>
                <span className="tag bg-pitch-600 text-pitch-200 font-bold whitespace-nowrap">
                  +{loading ? '25' : settings.weekly_winner_points} / +{loading ? '100' : settings.monthly_winner_points} pts
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-pitch-700 bg-pitch-900/50 flex justify-end">
          <button 
            onClick={onClose}
            className="btn-gold rounded-lg px-6 py-2 text-sm font-semibold"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
