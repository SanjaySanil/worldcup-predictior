-- ============================================================
-- COMBINED MIGRATION: Full Penalty Shootout Support
-- Run this once in Supabase SQL Editor.
-- Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE).
-- ============================================================

-- 1. Add new columns to match_results
ALTER TABLE public.match_results
  ADD COLUMN IF NOT EXISTS is_knockout BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS penalty_winner TEXT CHECK (penalty_winner IN ('home', 'away', NULL));

-- 2. Add predicted_penalty_winner to predictions
ALTER TABLE public.predictions
  ADD COLUMN IF NOT EXISTS predicted_penalty_winner TEXT CHECK (predicted_penalty_winner IN ('home', 'away', NULL));

-- 3. Add penalty_correct_picks to leaderboard
ALTER TABLE public.leaderboard
  ADD COLUMN IF NOT EXISTS penalty_correct_picks INTEGER NOT NULL DEFAULT 0;

-- 4. Final scoring function
-- Scoring rules:
--   Normal matches (group stage / knockout without penalties):
--     Exact score       → +3 pts
--     Correct result    → +1 pt
--     Wrong             →  0 pts
--
--   Knockout match that went to penalty shootout:
--     Exact draw score  + correct penalty winner  → +3 + 6 = 9 pts
--     Exact draw score  + wrong penalty winner    → +3 pts
--     Any draw          + correct penalty winner  → +6 pts
--     Any draw          + wrong penalty winner    → +1 pt
--     Non-draw predicted                         →  0 pts

CREATE OR REPLACE FUNCTION public.calculate_match_points(
  p_match_id TEXT,
  p_home_score INT,
  p_away_score INT,
  p_is_knockout BOOLEAN DEFAULT false,
  p_penalty_winner TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_settings point_settings%ROWTYPE;
  v_pred predictions%ROWTYPE;
  v_points INTEGER;
  v_is_exact BOOLEAN;
  v_is_correct BOOLEAN;
  v_is_penalty_correct BOOLEAN;
  v_is_draw BOOLEAN;
  v_competition_id TEXT := 'wc2026';
BEGIN
  SELECT * INTO v_settings
  FROM public.point_settings
  WHERE competition_id = v_competition_id
  LIMIT 1;

  IF NOT FOUND THEN
    v_settings.exact_score_points := 3;
    v_settings.correct_result_points := 1;
    v_settings.wrong_prediction_points := 0;
  END IF;

  v_is_draw := (p_home_score = p_away_score);

  FOR v_pred IN SELECT * FROM public.predictions WHERE match_id = p_match_id LOOP

    v_is_exact := (
      v_pred.predicted_home_score = p_home_score AND
      v_pred.predicted_away_score = p_away_score
    );

    v_is_penalty_correct := false;
    IF p_is_knockout AND v_is_draw AND p_penalty_winner IS NOT NULL
       AND v_pred.predicted_penalty_winner IS NOT NULL THEN
      v_is_penalty_correct := (v_pred.predicted_penalty_winner = p_penalty_winner);
    END IF;

    IF p_is_knockout AND v_is_draw AND p_penalty_winner IS NOT NULL THEN
      -- Knockout match that went to penalty shootout
      IF v_is_exact THEN
        v_is_correct := true;
        v_points := v_settings.exact_score_points + CASE WHEN v_is_penalty_correct THEN 6 ELSE 0 END;
      ELSIF v_pred.predicted_home_score = v_pred.predicted_away_score THEN
        v_is_correct := true;
        v_points := CASE WHEN v_is_penalty_correct THEN 6 ELSE v_settings.correct_result_points END;
      ELSE
        v_is_correct := false;
        v_points := v_settings.wrong_prediction_points;
      END IF;
    ELSE
      -- Normal match
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
    END IF;

    UPDATE public.predictions
    SET
      points_earned = v_points,
      is_exact_score = v_is_exact,
      is_correct_result = v_is_correct
    WHERE id = v_pred.id;

    INSERT INTO public.leaderboard (
      user_id, competition_id, total_points, exact_scores,
      correct_results, penalty_correct_picks, matches_predicted, accuracy
    )
    VALUES (
      v_pred.user_id,
      v_competition_id,
      v_points,
      CASE WHEN v_is_exact THEN 1 ELSE 0 END,
      CASE WHEN v_is_correct THEN 1 ELSE 0 END,
      CASE WHEN v_is_penalty_correct THEN 1 ELSE 0 END,
      1,
      CASE WHEN v_is_correct THEN 100.00 ELSE 0.00 END
    )
    ON CONFLICT (user_id, competition_id) DO UPDATE SET
      total_points = leaderboard.total_points + EXCLUDED.total_points,
      exact_scores = leaderboard.exact_scores + EXCLUDED.exact_scores,
      correct_results = leaderboard.correct_results + EXCLUDED.correct_results,
      penalty_correct_picks = leaderboard.penalty_correct_picks + EXCLUDED.penalty_correct_picks,
      matches_predicted = leaderboard.matches_predicted + 1,
      accuracy = CASE WHEN (leaderboard.matches_predicted + 1) > 0
        THEN ROUND(((leaderboard.correct_results + EXCLUDED.correct_results)::DECIMAL / (leaderboard.matches_predicted + 1)) * 100, 2)
        ELSE 0 END,
      updated_at = NOW();
  END LOOP;

  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY competition_id ORDER BY total_points DESC, exact_scores DESC, accuracy DESC
    ) AS new_rank
    FROM public.leaderboard
    WHERE competition_id = v_competition_id
  )
  UPDATE public.leaderboard SET rank = ranked.new_rank
  FROM ranked WHERE leaderboard.id = ranked.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update trigger function to pass new columns
CREATE OR REPLACE FUNCTION public.trigger_calculate_match_points()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.calculate_match_points(
    NEW.match_id,
    NEW.home_score,
    NEW.away_score,
    COALESCE(NEW.is_knockout, false),
    NEW.penalty_winner
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Re-attach trigger (drop first so it's idempotent)
DROP TRIGGER IF EXISTS on_match_result_published ON public.match_results;
CREATE TRIGGER on_match_result_published
  AFTER INSERT OR UPDATE ON public.match_results
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_calculate_match_points();
