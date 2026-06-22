import { Lock, CheckCircle, XCircle, Minus } from 'lucide-react';
import ScoreInput from './ScoreInput';
import type { MatchWithTeams } from '../types';

interface MatchCardProps {
  match: MatchWithTeams;
  homeScore: number;
  awayScore: number;
  onHomeChange: (score: number) => void;
  onAwayChange: (score: number) => void;
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

function getResultBadge(match: MatchWithTeams, homeScore: number, awayScore: number) {
  if (!match.result_published || match.home_score == null || match.away_score == null) return null;

  const isExact = homeScore === match.home_score && awayScore === match.away_score;
  const homeWon = match.home_score > match.away_score;
  const awayWon = match.away_score > match.home_score;
  const predicted_home_won = homeScore > awayScore;
  const predicted_away_won = awayScore > homeScore;
  const predicted_draw = homeScore === awayScore;
  const actual_draw = match.home_score === match.away_score;

  const correctResult = (homeWon && predicted_home_won) || (awayWon && predicted_away_won) || (actual_draw && predicted_draw);

  if (isExact) return { label: '+3', type: 'exact' };
  if (correctResult) return { label: '+1', type: 'correct' };
  return { label: '0', type: 'wrong' };
}

export default function MatchCard({
  match,
  homeScore,
  awayScore,
  onHomeChange,
  onAwayChange,
  isAuthenticated,
  onLoginPrompt,
}: MatchCardProps) {
  const locked = isLocked(match.prediction_lock_time);
  const resultBadge = match.result_published ? getResultBadge(match, homeScore, awayScore) : null;

  const handleScoreAction = (fn: () => void) => {
    if (!isAuthenticated && onLoginPrompt) {
      onLoginPrompt();
      return;
    }
    fn();
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
    </div>
  );
}
