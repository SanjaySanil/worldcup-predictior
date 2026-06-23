import { Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePointSettings } from '../hooks/usePointSettings';

export default function Footer() {
  const { settings } = usePointSettings();

  return (
    <footer className="bg-pitch-950 border-t border-pitch-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-lg bg-gold-gradient flex items-center justify-center">
                <Trophy className="w-5 h-5 text-pitch-900" />
              </div>
              <span className="font-display font-bold text-lg tracking-wider text-white">
                DG WORLD CUP <span className="text-gold-400">2026</span>
              </span>
            </div>
            <p className="text-pitch-300 text-sm leading-relaxed">
              The ultimate World Cup 2026 score prediction game. Predict, compete, and win.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold uppercase tracking-wider text-sm text-pitch-200 mb-3">
              Quick Links
            </h4>
            <ul className="space-y-2">
              {[
                { to: '/', label: 'Predict Scores' },
                { to: '/leaderboard', label: 'Leaderboard' },
                { to: '/register', label: 'Join Free' },
                { to: '/login', label: 'Sign In' },
              ].map(l => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-pitch-300 text-sm hover:text-gold-400 transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* How It Works */}
          <div>
            <h4 className="font-display font-semibold uppercase tracking-wider text-sm text-pitch-200 mb-3">
              How Points Work
            </h4>
            <ul className="space-y-1.5 text-sm text-pitch-300">
              <li className="flex items-center gap-2">
                <span className="tag bg-success-800 text-success-300">
                  {settings.exact_score_points} {settings.exact_score_points === 1 ? 'pt' : 'pts'}
                </span>
                Exact scoreline
              </li>
              <li className="flex items-center gap-2">
                <span className="tag bg-warn-800 text-warn-300">
                  {settings.correct_result_points} {settings.correct_result_points === 1 ? 'pt' : 'pts'}
                </span>
                Correct result
              </li>
              <li className="flex items-center gap-2">
                <span className="tag bg-gold-900 text-gold-300">
                  +{settings.streak_bonus_points} {settings.streak_bonus_points === 1 ? 'pt' : 'pts'}
                </span>
                Streak bonus
              </li>
              <li className="flex items-center gap-2">
                <span className="tag bg-pitch-600 text-pitch-200">
                  +{settings.daily_winner_points} {settings.daily_winner_points === 1 ? 'pt' : 'pts'}
                </span>
                Daily winner
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-pitch-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-pitch-400">
          <span>© 2026 World Cup Predictor. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <span>Free to play</span>
            <span>·</span>
            <span>Real-time leaderboard</span>
            <span>·</span>
            <span>No downloads required</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
