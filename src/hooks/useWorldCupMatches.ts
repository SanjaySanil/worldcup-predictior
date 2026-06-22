/**
 * Drop-in replacement for useMatches / useAvailableDates / useCompetitions
 * that sources data from TheStatsAPI World Cup 2026 fixtures endpoint.
 *
 * Scores & statuses are still synced from Supabase when available
 * (so the admin result-publishing flow keeps working).
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { fetchWorldCupFixtures, filterByDate } from '../lib/fixturesApi';
import { fetchMatchResults } from '../lib/matchResults';
import type { MatchWithTeams, Competition } from '../types';

// ---------------------------------------------------------------------------
// Main hook: all WC2026 matches for a given date
// ---------------------------------------------------------------------------
export function useWorldCupMatches(date?: string) {
  const [allMatches, setAllMatches] = useState<MatchWithTeams[]>([]);
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Supabase result overlay: scores/status published by admin
  const [dbOverlay, setDbOverlay] = useState<Record<string, Partial<MatchWithTeams>>>({});

  // Load all fixtures from the API once
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { matches: fixtures } = await fetchWorldCupFixtures();
      setAllMatches(fixtures);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load World Cup fixtures');
    } finally {
      setLoading(false);
    }
  }, []);

  // Pull score/status from match_results table (TEXT PK — no UUID conflict)
  const loadDbOverlay = useCallback(async () => {
    try {
      const results = await fetchMatchResults();
      const overlay: Record<string, Partial<MatchWithTeams>> = {};
      Object.entries(results).forEach(([id, r]) => {
        overlay[id] = {
          home_score: r.home_score,
          away_score: r.away_score,
          status: r.status as MatchWithTeams['status'],
          result_published: r.result_published,
          result_published_at: r.result_published_at,
        };
      });
      setDbOverlay(overlay);
    } catch {
      // overlay is optional — silently ignore
    }
  }, []);

  useEffect(() => {
    fetchAll();
    loadDbOverlay();

    // Live updates from Supabase when admin publishes results
    const channel = supabase
      .channel('wc-matches-overlay')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () =>
        loadDbOverlay()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAll, loadDbOverlay]);

  // Merge API fixtures with Supabase overlays, then filter by date
  useEffect(() => {
    if (allMatches.length === 0) return;

    const merged = allMatches.map(m => ({
      ...m,
      ...(dbOverlay[m.id] ?? {}),
    }));

    const filtered = date ? filterByDate(merged, date) : merged;
    // Sort by kickoff time
    filtered.sort(
      (a, b) => new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime()
    );
    setMatches(filtered);
  }, [allMatches, dbOverlay, date]);

  return { matches, loading, error, refetch: fetchAll };
}

// ---------------------------------------------------------------------------
// Available dates hook — pulls from the same API call
// ---------------------------------------------------------------------------
export function useWorldCupDates() {
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorldCupFixtures()
      .then(({ dates }) => setDates(dates))
      .catch(() => setDates([]))
      .finally(() => setLoading(false));
  }, []);

  return { dates, loading };
}

// ---------------------------------------------------------------------------
// Competition stub — returns the WC2026 competition object so leaderboard
// and prediction saving keep working unchanged.
// ---------------------------------------------------------------------------
export function useWorldCupCompetition() {
  const competitions: Competition[] = [
    {
      id: 'wc2026',
      tournament_id: null,
      name: 'FIFA World Cup 2026',
      description: 'United States, Canada & Mexico',
      start_date: '2026-06-11',
      end_date: '2026-07-19',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  return { competitions, loading: false };
}
