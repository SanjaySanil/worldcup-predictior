import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { LeaderboardEntryWithProfile } from '../types';

export function useLeaderboard(competitionId?: string, limit = 50) {
  const [entries, setEntries] = useState<LeaderboardEntryWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [prevEntries, setPrevEntries] = useState<LeaderboardEntryWithProfile[]>([]);

  const fetchLeaderboard = useCallback(async () => {
    let query = supabase
      .from('leaderboard')
      .select(`*, profiles(*)`)
      .order('total_points', { ascending: false })
      .order('exact_scores', { ascending: false })
      .order('accuracy', { ascending: false })
      .limit(limit);

    if (competitionId) {
      query = query.eq('competition_id', competitionId);
    }

    const { data } = await query;
    if (data) {
      setPrevEntries(prev => prev.length ? prev : (data as LeaderboardEntryWithProfile[]));
      setEntries(data as LeaderboardEntryWithProfile[]);
    }
    setLoading(false);
  }, [competitionId, limit]);

  useEffect(() => {
    fetchLeaderboard();

    const channel = supabase
      .channel('leaderboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard' }, () => {
        setPrevEntries(entries);
        fetchLeaderboard();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchLeaderboard]);

  const getRankChange = (userId: string, currentRank: number | null) => {
    const prev = prevEntries.find(e => e.user_id === userId);
    if (!prev?.rank || !currentRank) return 0;
    return prev.rank - currentRank;
  };

  return { entries, loading, getRankChange };
}

export function useUserLeaderboard(userId?: string, competitionId?: string) {
  const [entry, setEntry] = useState<LeaderboardEntryWithProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    let query = supabase
      .from('leaderboard')
      .select(`*, profiles(*)`)
      .eq('user_id', userId);

    if (competitionId) query = query.eq('competition_id', competitionId);

    query.maybeSingle().then(({ data }) => {
      setEntry(data as LeaderboardEntryWithProfile | null);
      setLoading(false);
    });
  }, [userId, competitionId]);

  return { entry, loading };
}
