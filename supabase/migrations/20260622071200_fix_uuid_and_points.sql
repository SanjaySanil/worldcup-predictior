-- =========================================================================
-- Fix UUID & Points Calculation Migration
-- Converts match_id and competition_id columns from UUID to TEXT to prevent
-- invalid input syntax errors with API-sourced match and competition IDs.
-- Also sets up automatic point and leaderboard updates on result publish.
-- =========================================================================

-- 1. Drop foreign keys referencing matches(id)
ALTER TABLE public.predictions DROP CONSTRAINT IF EXISTS predictions_match_id_fkey;
ALTER TABLE public.predictions DROP CONSTRAINT IF EXISTS predictions_user_id_match_id_key;

-- 2. Drop foreign keys referencing competitions(id)
ALTER TABLE public.leaderboard DROP CONSTRAINT IF EXISTS leaderboard_competition_id_fkey;
ALTER TABLE public.leaderboard DROP CONSTRAINT IF EXISTS leaderboard_user_id_competition_id_key;
ALTER TABLE public.point_settings DROP CONSTRAINT IF EXISTS point_settings_competition_id_fkey;
ALTER TABLE public.prizes DROP CONSTRAINT IF EXISTS prizes_competition_id_fkey;
ALTER TABLE public.match_days DROP CONSTRAINT IF EXISTS match_days_competition_id_fkey;
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_competition_id_fkey;
ALTER TABLE public.prediction_rounds DROP CONSTRAINT IF EXISTS prediction_rounds_competition_id_fkey;

-- 3. Alter target table primary keys and column types to TEXT
ALTER TABLE public.competitions ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.predictions ALTER COLUMN match_id TYPE TEXT;
ALTER TABLE public.leaderboard ALTER COLUMN competition_id TYPE TEXT;
ALTER TABLE public.point_settings ALTER COLUMN competition_id TYPE TEXT;
ALTER TABLE public.prizes ALTER COLUMN competition_id TYPE TEXT;
ALTER TABLE public.match_days ALTER COLUMN competition_id TYPE TEXT;
ALTER TABLE public.matches ALTER COLUMN competition_id TYPE TEXT;
ALTER TABLE public.prediction_rounds ALTER COLUMN competition_id TYPE TEXT;

-- 4. Re-add unique constraints
ALTER TABLE public.predictions ADD CONSTRAINT predictions_user_id_match_id_key UNIQUE(user_id, match_id);
ALTER TABLE public.leaderboard ADD CONSTRAINT leaderboard_user_id_competition_id_key UNIQUE(user_id, competition_id);
ALTER TABLE public.point_settings DROP CONSTRAINT IF EXISTS point_settings_competition_id_key;
ALTER TABLE public.point_settings ADD CONSTRAINT point_settings_competition_id_key UNIQUE(competition_id);

-- 5. Insert the stub 'wc2026' competition row
INSERT INTO public.competitions (id, name, description, start_date, end_date, is_active)
VALUES ('wc2026', 'FIFA World Cup 2026', 'United States, Canada & Mexico', '2026-06-11', '2026-07-19', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Insert initial point settings for 'wc2026'
INSERT INTO public.point_settings (competition_id, exact_score_points, correct_result_points, wrong_prediction_points, streak_bonus_points, streak_threshold, daily_winner_points, weekly_winner_points, monthly_winner_points)
VALUES ('wc2026', 3, 1, 0, 5, 3, 10, 25, 100)
ON CONFLICT (competition_id) DO NOTHING;

-- 7. Recreate the calculate_match_points function to support TEXT IDs
CREATE OR REPLACE FUNCTION public.calculate_match_points(p_match_id TEXT, p_home_score INT, p_away_score INT)
RETURNS VOID AS $$
DECLARE
  v_settings point_settings%ROWTYPE;
  v_pred predictions%ROWTYPE;
  v_points INTEGER;
  v_is_exact BOOLEAN;
  v_is_correct BOOLEAN;
  v_competition_id TEXT := 'wc2026';
BEGIN
  -- Get point settings for the competition
  SELECT * INTO v_settings 
  FROM public.point_settings 
  WHERE competition_id = v_competition_id
  LIMIT 1;
  
  -- Fallback settings if none found
  IF NOT FOUND THEN
    v_settings.exact_score_points := 3;
    v_settings.correct_result_points := 1;
    v_settings.wrong_prediction_points := 0;
  END IF;
  
  -- Loop through all predictions made for this match
  FOR v_pred IN SELECT * FROM public.predictions WHERE match_id = p_match_id LOOP
    v_is_exact := (v_pred.predicted_home_score = p_home_score AND v_pred.predicted_away_score = p_away_score);
    v_is_correct := (
      SIGN(v_pred.predicted_home_score - v_pred.predicted_away_score) = 
      SIGN(p_home_score - p_away_score)
    );
    
    IF v_is_exact THEN
      v_points := v_settings.exact_score_points;
    ELSIF v_is_correct THEN
      v_points := v_settings.correct_result_points;
    ELSE
      v_points := v_settings.wrong_prediction_points;
    END IF;
    
    UPDATE public.predictions 
    SET points_earned = v_points, is_exact_score = v_is_exact, is_correct_result = v_is_correct
    WHERE id = v_pred.id;
    
    -- Insert/Update leaderboard record
    INSERT INTO public.leaderboard (user_id, competition_id, total_points, exact_scores, correct_results, matches_predicted, accuracy)
    VALUES (
      v_pred.user_id,
      v_competition_id,
      v_points,
      CASE WHEN v_is_exact THEN 1 ELSE 0 END,
      CASE WHEN v_is_correct THEN 1 ELSE 0 END,
      1,
      CASE WHEN v_is_correct THEN 100.00 ELSE 0.00 END
    )
    ON CONFLICT (user_id, competition_id) DO UPDATE SET
      total_points = leaderboard.total_points + EXCLUDED.total_points,
      exact_scores = leaderboard.exact_scores + EXCLUDED.exact_scores,
      correct_results = leaderboard.correct_results + EXCLUDED.correct_results,
      matches_predicted = leaderboard.matches_predicted + 1,
      accuracy = CASE WHEN (leaderboard.matches_predicted + 1) > 0 
        THEN ROUND(((leaderboard.correct_results + EXCLUDED.correct_results)::DECIMAL / (leaderboard.matches_predicted + 1)) * 100, 2)
        ELSE 0 END,
      updated_at = NOW();
  END LOOP;
  
  -- Recalculate ranks across the leaderboard
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY competition_id ORDER BY total_points DESC, exact_scores DESC, accuracy DESC
    ) as new_rank
    FROM public.leaderboard
    WHERE competition_id = v_competition_id
  )
  UPDATE public.leaderboard SET rank = ranked.new_rank
  FROM ranked WHERE leaderboard.id = ranked.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Recreate trigger function for match_results table
CREATE OR REPLACE FUNCTION public.trigger_calculate_match_points()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.calculate_match_points(NEW.match_id, NEW.home_score, NEW.away_score);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Add trigger on match_results table
DROP TRIGGER IF EXISTS on_match_result_published ON public.match_results;
CREATE TRIGGER on_match_result_published
  AFTER INSERT OR UPDATE ON public.match_results
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_calculate_match_points();
