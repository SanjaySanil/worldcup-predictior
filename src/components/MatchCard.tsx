import { Lock } from 'lucide-react';
import ScoreInput from './ScoreInput';
import type { MatchWithTeams } from '../types';

interface MatchCardProps {
  match: MatchWithTeams;
  homeScore: number;
  awayScore: number;
  penaltyWinner: 'home' | 'away' | null;
  onHomeChange: (score: number) => void;
  onAwayChange: (score: number) => void;
  onPenaltyWinnerChange: (winner: 'home' | 'away' | null) => void;
  isAuthenticated: boolean;
  onLoginPrompt?: () => void;
}

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

function isLocked(lockTime: string) {
  return new Date() >= new Date(lockTime);
}

function getResultBadge(match: MatchWithTeams, homeScore: number, awayScore: number, penaltyWinner: 'home' | 'away' | null) {
  if (!match.result_published || match.home_score == null || match.away_score == null) return null;

  const actual_draw = match.home_score === match.away_score;
  const isExact = homeScore === match.home_score && awayScore === match.away_score;
  const predicted_draw = homeScore === awayScore;
  const penaltyApplies = match.is_knockout && actual_draw && match.penalty_winner != null;
  const penaltyCorrect = penaltyApplies && penaltyWinner === match.penalty_winner;

  let points = 0;
  let type: 'exact' | 'correct' | 'wrong' = 'wrong';

  if (penaltyApplies) {
    // ── Knockout match that went to penalty shootout ──
    if (isExact) {
      // Predicted exact draw score (e.g. 1-1 = 1-1)
      // +3 for exact, +6 bonus if correct penalty winner → max 9
      type = 'exact';
      points = 3 + (penaltyCorrect ? 6 : 0);
    } else if (predicted_draw) {
      // Predicted a draw (but not exact, e.g. 2-2 vs actual 1-1)
      // +6 if correct penalty winner, +1 if wrong
      type = 'correct';
      points = penaltyCorrect ? 6 : 1;
    }
    // else: non-draw prediction in a penalty match → 0, type stays 'wrong'
  } else {
    // ── Normal match (group stage or knockout without penalties) ──
    const homeWon = match.home_score > match.away_score;
    const awayWon = match.away_score > match.home_score;
    const predicted_home_won = homeScore > awayScore;
    const predicted_away_won = awayScore > homeScore;
    const correctResult =
      (homeWon && predicted_home_won) ||
      (awayWon && predicted_away_won) ||
      (actual_draw && predicted_draw);

    if (isExact) { type = 'exact'; points = 3; }
    else if (correctResult) { type = 'correct'; points = 1; }
  }

  return { label: points > 0 ? `+${points}` : '0', type };
}

export default function MatchCard({
  match,
  homeScore,
  awayScore,
  penaltyWinner,
  onHomeChange,
  onAwayChange,
  onPenaltyWinnerChange,
  isAuthenticated,
  onLoginPrompt,
}: MatchCardProps) {
  const locked = isLocked(match.prediction_lock_time);
  const resultBadge = match.result_published ? getResultBadge(match, homeScore, awayScore, penaltyWinner) : null;

  // Show penalty picker for knockout matches when predicted score is a draw,
  // OR when result is published and was a draw (to show what user picked).
  const isPredictedDraw = homeScore === awayScore;
  const showPenaltyPicker = match.is_knockout && (
    isPredictedDraw || (match.result_published && match.home_score === match.away_score)
  );
  // Show a subtle "knockout" hint on the match row so users know they can pick a penalty winner
  const showKnockoutHint = match.is_knockout && !isPredictedDraw && !match.result_published;

  const handleScoreAction = (fn: () => void) => {
    if (!isAuthenticated && onLoginPrompt) {
      onLoginPrompt();
      return;
    }
    fn();
  };

  const handlePenaltyPick = (winner: 'home' | 'away') => {
    if (locked) return;
    if (!isAuthenticated && onLoginPrompt) { onLoginPrompt(); return; }
    // Toggle off if same winner clicked again
    onPenaltyWinnerChange(penaltyWinner === winner ? null : winner);
  };

  return (
    <div className="match-row px-4 py-4 sm:py-5">
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Time & Status */}
        <div className="w-16 sm:w-20 flex-shrink-0">
          <div className="text-white font-mono text-sm font-medium">
            {formatTime(match.kickoff_time)}
          </div>
          {locked && (
            <div className="flex items-center gap-1 mt-0.5">
              <Lock className="w-3 h-3 text-gold-500" />
              <span className="text-gold-500 text-xs font-bold uppercase tracking-wider">Lock</span>
            </div>
          )}
          {match.status === 'live' && (
            <div className="flex items-center gap-1 mt-0.5">
              <span className="live-dot" />
              <span className="text-success-400 text-xs font-bold uppercase tracking-wider">Live</span>
            </div>
          )}
          {match.status === 'finished' && (
            <div className="text-pitch-300 text-xs uppercase tracking-wider mt-0.5">FT</div>
          )}
        </div>

        {/* Home Team */}
        <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3">
          <span className="text-white font-semibold text-sm sm:text-base text-right leading-tight">
            {match.home_team?.name || 'TBD'}
          </span>
          <span className="text-xl sm:text-2xl" title={match.home_team?.name || ''}>
            {match.home_team?.flag_emoji || '🏳️'}
          </span>
        </div>

        {/* Score Inputs */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <div onClick={() => handleScoreAction(() => {})}>
            <ScoreInput
              value={homeScore}
              onChange={v => handleScoreAction(() => onHomeChange(v))}
              locked={locked}
            />
          </div>
          <span className="text-pitch-300 font-bold text-sm">v</span>
          <div onClick={() => handleScoreAction(() => {})}>
            <ScoreInput
              value={awayScore}
              onChange={v => handleScoreAction(() => onAwayChange(v))}
              locked={locked}
            />
          </div>
        </div>

        {/* Away Team */}
        <div className="flex-1 flex items-center gap-2 sm:gap-3">
          <span className="text-xl sm:text-2xl" title={match.away_team?.name || ''}>
            {match.away_team?.flag_emoji || '🏳️'}
          </span>
          <span className="text-white font-semibold text-sm sm:text-base leading-tight">
            {match.away_team?.name || 'TBD'}
          </span>
        </div>

        {/* Result indicator */}
        <div className="w-10 flex-shrink-0 flex items-center justify-center">
          {resultBadge ? (
            <span
              className={`tag ${
                resultBadge.type === 'exact'
                  ? 'bg-success-700 text-success-300'
                  : resultBadge.type === 'correct'
                  ? 'bg-warn-800 text-warn-300'
                  : 'bg-pitch-600 text-pitch-300'
              }`}
            >
              {resultBadge.label}
            </span>
          ) : match.result_published && match.home_score != null ? (
            <span className="text-pitch-300 text-xs font-mono font-medium">
              {match.home_score}-{match.away_score}
            </span>
          ) : null}
        </div>
      </div>

      {/* Venue & Group */}
      {(match.venue || match.group_name) && (
        <div className="pl-[76px] sm:pl-[92px] mt-1 flex items-center gap-3 text-xs text-pitch-300">
          {match.group_name && <span className="uppercase tracking-wider">Group {match.group_name}</span>}
          {match.venue && <span>· {match.venue}</span>}
        </div>
      )}

      {/* Knockout hint — shown when it's a knockout match but score isn't a draw yet */}
      {showKnockoutHint && (
        <div className="pl-[76px] sm:pl-[92px] mt-1.5 flex items-center gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-gold-500/80">
            ⚡ Knockout
          </span>
          <span className="text-[10px] text-pitch-400">
            · Predict a draw score to pick the penalty winner
            <span className="text-gold-500/80 font-semibold"> (+6 pts)</span>
          </span>
        </div>
      )}

      {/* ── Penalty Shootout Picker ── */}
      {showPenaltyPicker && (
        <div className="mt-3 ml-[76px] sm:ml-[92px] mr-10">
          <div className="rounded-xl border border-gold-500/30 bg-pitch-800/70 px-4 py-3">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-gold-400">
                🏆 Penalty Shootout
              </span>
              <span className="text-[10px] text-pitch-400 font-semibold">
                · Who wins? (+6 pts)
              </span>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              {/* Home win button */}
              <button
                disabled={locked}
                onClick={() => handlePenaltyPick('home')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-bold transition-all duration-200 ${
                  penaltyWinner === 'home'
                    ? 'bg-gold-500 border-gold-400 text-pitch-900 shadow-gold scale-[1.02]'
                    : locked
                    ? 'border-pitch-600 text-pitch-500 cursor-not-allowed bg-pitch-700/30'
                    : 'border-pitch-600 text-pitch-200 hover:border-gold-500/60 hover:text-white hover:bg-pitch-700/50 cursor-pointer'
                }`}
              >
                <span className="text-base">{match.home_team?.flag_emoji || '🏳️'}</span>
                <span className="truncate">{match.home_team?.name || 'Home'}</span>
              </button>

              {/* Away win button */}
              <button
                disabled={locked}
                onClick={() => handlePenaltyPick('away')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-bold transition-all duration-200 ${
                  penaltyWinner === 'away'
                    ? 'bg-gold-500 border-gold-400 text-pitch-900 shadow-gold scale-[1.02]'
                    : locked
                    ? 'border-pitch-600 text-pitch-500 cursor-not-allowed bg-pitch-700/30'
                    : 'border-pitch-600 text-pitch-200 hover:border-gold-500/60 hover:text-white hover:bg-pitch-700/50 cursor-pointer'
                }`}
              >
                <span className="text-base">{match.away_team?.flag_emoji || '🏳️'}</span>
                <span className="truncate">{match.away_team?.name || 'Away'}</span>
              </button>
            </div>

            {/* Result feedback when published */}
            {match.result_published && match.penalty_winner && (
              <div className="mt-2 text-[11px] text-center">
                {penaltyWinner === match.penalty_winner ? (
                  <span className="text-success-400 font-bold">✓ Correct penalty pick!</span>
                ) : penaltyWinner ? (
                  <span className="text-danger-400 font-semibold">✗ Wrong pick</span>
                ) : (
                  <span className="text-pitch-400">No penalty pick made</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
