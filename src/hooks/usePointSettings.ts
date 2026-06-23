import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { PointSettings } from '../types';

export function usePointSettings() {
  const [settings, setSettings] = useState<PointSettings>({
    id: '',
    competition_id: 'wc2026',
    exact_score_points: 3,
    correct_result_points: 1,
    wrong_prediction_points: 0,
    streak_bonus_points: 5,
    streak_threshold: 3,
    daily_winner_points: 10,
    weekly_winner_points: 25,
    monthly_winner_points: 100,
    updated_at: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('point_settings')
          .select('*')
          .eq('competition_id', 'wc2026')
          .maybeSingle();

        if (data && !error) {
          setSettings(data as any);
        }
      } catch (err) {
        console.error('Error fetching point settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, loading };
}
