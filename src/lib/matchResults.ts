/**
 * match_results table — stores admin-published scores for API-sourced matches.
 * Uses TEXT match_id (e.g. "wc2026-43") so it works with TheStatsAPI IDs.
 *
 * Required Supabase SQL (run once in SQL Editor):
 *
 * CREATE TABLE IF NOT EXISTS public.match_results (
 *   match_id TEXT PRIMARY KEY,
 *   home_score INTEGER NOT NULL,
 *   away_score INTEGER NOT NULL,
 *   status TEXT NOT NULL DEFAULT 'finished',
 *   result_published BOOLEAN NOT NULL DEFAULT true,
 *   result_published_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Public read match_results" ON public.match_results FOR SELECT USING (true);
 * CREATE POLICY "Auth write match_results" ON public.match_results FOR ALL TO authenticated USING (true) WITH CHECK (true);
 */

import { supabase } from './supabase';

export interface MatchResult {
  match_id: string;
  home_score: number;
  away_score: number;
  status: string;
  result_published: boolean;
  result_published_at: string | null;
}

/** Fetch all published results */
export async function fetchMatchResults(): Promise<Record<string, MatchResult>> {
  const { data, error } = await supabase
    .from('match_results')
    .select('*');

  if (error || !data) return {};

  const map: Record<string, MatchResult> = {};
  data.forEach((r: MatchResult) => { map[r.match_id] = r; });
  return map;
}

/** Upsert a single match result */
export async function upsertMatchResult(result: MatchResult): Promise<string | null> {
  const { error } = await supabase
    .from('match_results')
    .upsert(result, { onConflict: 'match_id' });

  return error ? error.message : null;
}
