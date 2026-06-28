import { useState, useEffect } from 'react';
import {
  CheckCircle, Search, X, AlertCircle, RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { fetchWorldCupFixtures, toISTDateString } from '../../lib/fixturesApi';
import { fetchMatchResults, upsertMatchResult } from '../../lib/matchResults';
import type { MatchWithTeams } from '../../types';

// ---------------------------------------------------------------------------
// Publish Result Modal
// ---------------------------------------------------------------------------
function PublishResultModal({
  match,
  onClose,
  onPublish,
}: {
  match: MatchWithTeams;
  onClose: () => void;
  onPublish: () => void;
}) {
  const { user } = useAuth();
  const [homeScore, setHomeScore] = useState(match.home_score?.toString() ?? '');
  const [awayScore, setAwayScore] = useState(match.away_score?.toString() ?? '');
  const [isKnockout, setIsKnockout] = useState<boolean>(match.is_knockout ?? false);
  const [penaltyWinner, setPenaltyWinner] = useState<'home' | 'away' | null>(match.penalty_winner ?? null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  const homeScoreNum = parseInt(homeScore);
  const awayScoreNum = parseInt(awayScore);
  const scoresAreEqual = !isNaN(homeScoreNum) && !isNaN(awayScoreNum) && homeScoreNum === awayScoreNum;

  const handlePublish = async () => {
    if (homeScore === '' || awayScore === '') {
      setError('Please enter both scores');
      return;
    }
    if (isKnockout && scoresAreEqual && !penaltyWinner) {
      setError('Scores are equal — please select the penalty shootout winner');
      return;
    }
    setPublishing(true);
    setError('');

    // Save to match_results table (TEXT primary key — no UUID conflicts)
    const err = await upsertMatchResult({
      match_id: match.id,
      home_score: parseInt(homeScore),
      away_score: parseInt(awayScore),
      is_knockout: isKnockout,
      penalty_winner: isKnockout && scoresAreEqual ? penaltyWinner : null,
      status: 'finished',
      result_published: true,
      result_published_at: new Date().toISOString(),
    });

    if (err) { setError(err); setPublishing(false); return; }

    // Audit log (best-effort)
    supabase.from('audit_logs').insert({
      user_id: user?.id,
      action: 'publish_result',
      entity_type: 'match',
      entity_id: match.id,
      new_data: {
        home_score: parseInt(homeScore),
        away_score: parseInt(awayScore),
        is_knockout: isKnockout,
        penalty_winner: penaltyWinner,
      },
    }).then(() => {});

    setPublishing(false);
    onPublish();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-pitch-800 border border-pitch-600 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-pitch-700">
          <h2 className="font-display font-bold text-lg uppercase tracking-wider text-white">
            Publish Result
          </h2>
          <button onClick={onClose} className="text-pitch-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="text-center text-pitch-200 text-sm">
            <span className="font-bold text-white">{match.home_team?.flag_emoji} {match.home_team?.name}</span>
            {' vs '}
            <span className="font-bold text-white">{match.away_team?.name} {match.away_team?.flag_emoji}</span>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-danger-900 border border-danger-700 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 text-danger-400" />
              <span className="text-sm text-danger-300">{error}</span>
            </div>
          )}

          {/* Score inputs */}
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <label className="form-label text-center">{match.home_team?.name}</label>
              <input
                type="number" min={0} max={99}
                value={homeScore}
                onChange={e => setHomeScore(e.target.value)}
                className="score-input w-16 h-16 text-2xl"
              />
            </div>
            <span className="text-pitch-400 font-bold text-2xl mt-5">-</span>
            <div className="text-center">
              <label className="form-label text-center">{match.away_team?.name}</label>
              <input
                type="number" min={0} max={99}
                value={awayScore}
                onChange={e => setAwayScore(e.target.value)}
                className="score-input w-16 h-16 text-2xl"
              />
            </div>
          </div>

          {/* Knockout toggle */}
          <div className="flex items-center justify-between bg-pitch-700 border border-pitch-600 rounded-lg px-4 py-3">
            <div>
              <div className="text-white text-sm font-semibold">Knockout Match</div>
              <div className="text-pitch-400 text-xs mt-0.5">Enable if this match can go to penalty shootout</div>
            </div>
            <button
              onClick={() => { setIsKnockout(v => !v); setPenaltyWinner(null); }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isKnockout ? 'bg-gold-500' : 'bg-pitch-500'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isKnockout ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Penalty winner selector — shown whenever knockout is enabled */}
          {isKnockout && (
            <div className="rounded-xl border border-gold-500/40 bg-pitch-700/60 px-4 py-3 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black uppercase tracking-widest text-gold-400">🏆 Penalty Shootout Winner</span>
              </div>
              <p className="text-[11px] text-pitch-400 mb-2">
                Who wins on penalties? Only applied if final score is a draw · <span className="text-gold-400 font-semibold">+6 pts</span> for correct picks
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPenaltyWinner(penaltyWinner === 'home' ? null : 'home')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-bold transition-all ${
                    penaltyWinner === 'home'
                      ? 'bg-gold-500 border-gold-400 text-pitch-900'
                      : 'border-pitch-500 text-pitch-200 hover:border-gold-500/60 hover:text-white'
                  }`}
                >
                  <span>{match.home_team?.flag_emoji}</span>
                  <span>{match.home_team?.name || 'Home'}</span>
                </button>
                <button
                  onClick={() => setPenaltyWinner(penaltyWinner === 'away' ? null : 'away')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-bold transition-all ${
                    penaltyWinner === 'away'
                      ? 'bg-gold-500 border-gold-400 text-pitch-900'
                      : 'border-pitch-500 text-pitch-200 hover:border-gold-500/60 hover:text-white'
                  }`}
                >
                  <span>{match.away_team?.flag_emoji}</span>
                  <span>{match.away_team?.name || 'Away'}</span>
                </button>
              </div>
              {penaltyWinner && (
                <p className="text-xs text-success-400 text-center font-semibold">
                  ✓ {penaltyWinner === 'home' ? match.home_team?.name : match.away_team?.name} wins on penalties
                </p>
              )}
            </div>
          )}

          <div className="bg-pitch-700 border border-pitch-600 rounded-lg p-4 text-sm text-pitch-300">
            <strong className="text-white">This will:</strong>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Set the final score</li>
              <li>Calculate points for all predictions</li>
              {isKnockout && penaltyWinner && (
                <li className="text-gold-400">Award +6 pts for correct penalty winner picks (if score is a draw)</li>
              )}
              <li>Update the leaderboard</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-ghost rounded-lg">Cancel</button>
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="btn-gold rounded-lg py-2.5 px-6"
            >
              {publishing ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-pitch-900 border-t-transparent rounded-full animate-spin" />
                  Publishing...
                </span>
              ) : 'Publish & Calculate Points'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Matches Admin Page
// ---------------------------------------------------------------------------
export default function Matches() {
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [dbOverlay, setDbOverlay] = useState<Record<string, Partial<MatchWithTeams>>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [publishMatch, setPublishMatch] = useState<MatchWithTeams | null>(null);

  const loadFixtures = async () => {
    setLoading(true);
    try {
      const { matches: fixtures } = await fetchWorldCupFixtures();
      setMatches(fixtures);
    } finally {
      setLoading(false);
    }
  };

  const loadDbOverlay = async () => {
    const results = await fetchMatchResults();
    const overlay: Record<string, Partial<MatchWithTeams>> = {};
    Object.entries(results).forEach(([id, r]) => {
      overlay[id] = {
        home_score: r.home_score,
        away_score: r.away_score,
        is_knockout: r.is_knockout,
        penalty_winner: r.penalty_winner as 'home' | 'away' | null,
        status: r.status as MatchWithTeams['status'],
        result_published: r.result_published,
        result_published_at: r.result_published_at,
      };
    });
    setDbOverlay(overlay);
  };

  useEffect(() => {
    loadFixtures();
    loadDbOverlay();
  }, []);

  // Merge API matches with Supabase result overlay
  const mergedMatches = matches.map(m => ({ ...m, ...(dbOverlay[m.id] ?? {}) }));

  // Available dates for date filter
  const availableDates = [...new Set(mergedMatches.map(m => toISTDateString(m.kickoff_time)))].sort();

  const filtered = mergedMatches.filter(m => {
    const q = search.toLowerCase();
    const matchesSearch = !search ||
      m.home_team?.name?.toLowerCase().includes(q) ||
      m.away_team?.name?.toLowerCase().includes(q) ||
      m.venue?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    const matchesDate = !dateFilter || toISTDateString(m.kickoff_time) === dateFilter;
    return matchesSearch && matchesStatus && matchesDate;
  });

  const statusColors: Record<string, string> = {
    scheduled: 'bg-pitch-600 text-pitch-200',
    live: 'bg-success-800 text-success-300',
    finished: 'bg-pitch-700 text-pitch-300',
    postponed: 'bg-warn-800 text-warn-300',
    cancelled: 'bg-danger-800 text-danger-300',
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Match Management</h1>
          <p className="text-pitch-300 text-sm mt-1">
            {mergedMatches.length} matches from FIFA World Cup 2026 API
          </p>
        </div>
        <button
          onClick={() => { loadFixtures(); loadDbOverlay(); }}
          className="btn-ghost rounded-lg py-2.5 px-5 flex items-center gap-2 self-start"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-pitch-800 border border-gold-subtle rounded-lg px-4 py-3 text-sm text-pitch-300">
        <strong className="text-gold-400">Matches sourced from TheStatsAPI.</strong>
        {' '}Use the ✓ button to publish final scores — this updates the leaderboard and calculates points.
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pitch-400" />
          <input
            type="text" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search team or venue..."
            className="form-input pl-10"
          />
        </div>
        <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="form-input sm:w-44">
          <option value="">All Dates</option>
          {availableDates.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-input sm:w-44">
          <option value="all">All Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="live">Live</option>
          <option value="finished">Finished</option>
          <option value="postponed">Postponed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Matches Table */}
      <div className="card rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-pitch-300">No matches found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pitch-600">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-pitch-400 uppercase tracking-wider">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-pitch-400 uppercase tracking-wider">Match</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-pitch-400 uppercase tracking-wider">Date (IST)</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-pitch-400 uppercase tracking-wider hidden md:table-cell">Venue</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-pitch-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-pitch-400 uppercase tracking-wider hidden lg:table-cell">Score</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-pitch-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pitch-700">
                {filtered.map(match => {
                  const num = match.id.replace('wc2026-', '');
                  return (
                    <tr key={match.id} className="hover:bg-pitch-700/50 transition-colors">
                      <td className="px-4 py-4 text-pitch-500 text-xs font-mono">{num}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-white">
                            {match.home_team?.flag_emoji} {match.home_team?.name || 'TBD'}
                          </span>
                          <span className="text-pitch-500">vs</span>
                          <span className="font-medium text-white">
                            {match.away_team?.name || 'TBD'} {match.away_team?.flag_emoji}
                          </span>
                        </div>
                        {match.group_name && (
                          <span className="text-xs text-pitch-400 mt-0.5 block">Group {match.group_name}</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-pitch-200 whitespace-nowrap">
                        {new Date(match.kickoff_time).toLocaleString('en-US', {
                          day: 'numeric', month: 'short',
                          hour: 'numeric', minute: '2-digit',
                          hour12: true, timeZone: 'Asia/Kolkata',
                        })} IST
                      </td>
                      <td className="px-4 py-4 text-pitch-300 hidden md:table-cell max-w-[180px] truncate">
                        {match.venue || '-'}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`tag ${statusColors[match.status] || 'bg-pitch-600 text-pitch-200'} capitalize`}>
                          {match.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        {match.home_score != null && match.away_score != null ? (
                          <span className="font-mono font-bold text-white">
                            {match.home_score} - {match.away_score}
                            {match.result_published && (
                              <CheckCircle className="w-3.5 h-3.5 text-success-400 inline ml-1.5" />
                            )}
                          </span>
                        ) : (
                          <span className="text-pitch-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {match.status !== 'cancelled' && !match.result_published && (
                            <button
                              onClick={() => setPublishMatch(match)}
                              className="p-2 text-success-400 hover:text-success-300 hover:bg-pitch-700 rounded-lg transition-all"
                              title="Publish Result"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Publish Result Modal */}
      {publishMatch && (
        <PublishResultModal
          match={publishMatch}
          onClose={() => setPublishMatch(null)}
          onPublish={() => { loadDbOverlay(); setPublishMatch(null); }}
        />
      )}
    </div>
  );
}
