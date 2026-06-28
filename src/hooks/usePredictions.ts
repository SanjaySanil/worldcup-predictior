import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Prediction, PredictionInput } from '../types';

export function useUserPredictions(userId?: string, matchIds?: string[]) {
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [loading, setLoading] = useState(true);

  const fetchPredictions = useCallback(async () => {
    if (!userId || !matchIds?.length) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', userId)
      .in('match_id', matchIds);

    if (data) {
      const map: Record<string, Prediction> = {};
      data.forEach(p => { map[p.match_id] = p; });
      setPredictions(map);
    }
    setLoading(false);
  }, [userId, matchIds?.join(',')]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  return { predictions, loading, refetch: fetchPredictions };
}

export function useSavePredictions() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const savePredictions = async (
    userId: string,
    inputs: PredictionInput[]
  ): Promise<boolean> => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const now = new Date().toISOString();
      const rows = inputs.map(p => ({
        user_id: userId,
        match_id: p.matchId,
        predicted_home_score: p.homeScore,
        predicted_away_score: p.awayScore,
        predicted_penalty_winner: p.predictedPenaltyWinner ?? null,
        submitted_at: now,
      }));

      const { error: err } = await supabase
        .from('predictions')
        .upsert(rows, { onConflict: 'user_id,match_id' });

      if (err) throw err;
      setSuccess(true);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save predictions');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { savePredictions, saving, error, success };
}
