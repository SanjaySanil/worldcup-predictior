import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { MatchWithTeams, Competition, MatchDay } from '../types';

export function useMatches(date?: string, competitionId?: string) {
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('matches')
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(*),
          away_team:teams!matches_away_team_id_fkey(*)
        `)
        .order('kickoff_time', { ascending: true });

      if (date) {
        const start = `${date}T00:00:00`;
        const end = `${date}T23:59:59`;
        query = query.gte('kickoff_time', start).lte('kickoff_time', end);
      }

      if (competitionId) {
        query = query.eq('competition_id', competitionId);
      }

      const { data, error: err } = await query;
      if (err) throw err;
      setMatches((data as MatchWithTeams[]) || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  }, [date, competitionId]);

  useEffect(() => {
    fetchMatches();

    const channel = supabase
      .channel('matches-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetchMatches();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchMatches]);

  return { matches, loading, error, refetch: fetchMatches };
}

export function useAvailableDates(competitionId?: string) {
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      let query = supabase
        .from('matches')
        .select('kickoff_time')
        .order('kickoff_time', { ascending: true });

      if (competitionId) query = query.eq('competition_id', competitionId);

      const { data } = await query;
      if (data) {
        const uniqueDates = [...new Set(
          data.map(m => m.kickoff_time.split('T')[0])
        )];
        setDates(uniqueDates);
      }
      setLoading(false);
    };
    fetch();
  }, [competitionId]);

  return { dates, loading };
}

export function useCompetitions() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('competitions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCompetitions(data || []);
        setLoading(false);
      });
  }, []);

  return { competitions, loading };
}

export function useMatchDays(competitionId?: string) {
  const [matchDays, setMatchDays] = useState<MatchDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!competitionId) { setLoading(false); return; }
    supabase
      .from('match_days')
      .select('*')
      .eq('competition_id', competitionId)
      .order('date', { ascending: true })
      .then(({ data }) => {
        setMatchDays(data || []);
        setLoading(false);
      });
  }, [competitionId]);

  return { matchDays, loading };
}
