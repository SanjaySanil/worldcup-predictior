-- =========================================================================
-- Allow Select Finished Predictions Migration
-- Allows public read access (for both anon and authenticated users) to predictions
-- for matches that have finished or whose results are published.
-- =========================================================================

CREATE POLICY "select_finished_predictions" ON public.predictions
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.match_results mr
      WHERE mr.match_id = predictions.match_id
        AND (mr.status = 'finished' OR mr.result_published = true)
    )
  );
