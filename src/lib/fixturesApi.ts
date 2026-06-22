/**
 * Fetches the official FIFA World Cup 2026 fixtures from TheStatsAPI
 * (free, no API key required, CORS enabled).
 * Maps them into the app's MatchWithTeams shape so the rest of the app
 * (predictions, leaderboard, lock logic) works unchanged.
 *
 * All dates are derived from IST (Asia/Kolkata, UTC+5:30) kickoff times
 * so the date navigation matches what Indian users see.
 */

import type { MatchWithTeams } from '../types';

const FIXTURES_URL =
  'https://www.thestatsapi.com/world-cup/data/fixtures.json';

// IST = UTC + 5 hours 30 minutes
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/**
 * Converts a UTC ISO string to an IST date string 'YYYY-MM-DD'.
 * Uses manual arithmetic to avoid locale/browser inconsistencies.
 */
export function toISTDateString(utcIso: string): string {
  const istMs = new Date(utcIso).getTime() + IST_OFFSET_MS;
  const d = new Date(istMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Country name → flag emoji (all 48 WC2026 teams)
const FLAG_MAP: Record<string, string> = {
  'Mexico': '🇲🇽',
  'South Africa': '🇿🇦',
  'Korea Republic': '🇰🇷',
  'Czechia': '🇨🇿',
  'Canada': '🇨🇦',
  'Bosnia and Herzegovina': '🇧🇦',
  'United States': '🇺🇸',
  'Paraguay': '🇵🇾',
  'Haiti': '🇭🇹',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Australia': '🇦🇺',
  'Turkiye': '🇹🇷',
  'Brazil': '🇧🇷',
  'Morocco': '🇲🇦',
  'Qatar': '🇶🇦',
  'Switzerland': '🇨🇭',
  "Cote d'Ivoire": '🇨🇮',
  'Ecuador': '🇪🇨',
  'Germany': '🇩🇪',
  'Curacao': '🇨🇼',
  'Netherlands': '🇳🇱',
  'Japan': '🇯🇵',
  'Sweden': '🇸🇪',
  'Tunisia': '🇹🇳',
  'Saudi Arabia': '🇸🇦',
  'Uruguay': '🇺🇾',
  'Spain': '🇪🇸',
  'Cabo Verde': '🇨🇻',
  'IR Iran': '🇮🇷',
  'New Zealand': '🇳🇿',
  'Belgium': '🇧🇪',
  'Egypt': '🇪🇬',
  'France': '🇫🇷',
  'Senegal': '🇸🇳',
  'Iraq': '🇮🇶',
  'Norway': '🇳🇴',
  'Argentina': '🇦🇷',
  'Algeria': '🇩🇿',
  'Austria': '🇦🇹',
  'Jordan': '🇯🇴',
  'Ghana': '🇬🇭',
  'Panama': '🇵🇦',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Croatia': '🇭🇷',
  'Portugal': '🇵🇹',
  'Congo DR': '🇨🇩',
  'Uzbekistan': '🇺🇿',
  'Colombia': '🇨🇴',
  'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'Poland': '🇵🇱',
};

export interface ApiFixture {
  matchNumber: number;
  date: string;        // local match date (host city TZ) — NOT used for display
  kickoffUtc: string;  // full UTC ISO string — source of truth
  stage: string;
  group?: string;
  homeTeam: string;
  awayTeam: string;
  stadium: string;
  hostCity: string;
}

// Simple in-memory cache (cleared on module reload / hot-update)
let _cache: { matches: MatchWithTeams[]; dates: string[] } | null = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function teamId(name: string): string {
  return `api-team-${name.toLowerCase().replace(/[^a-z0-9]/gi, '-')}`;
}

function makeTeam(name: string): NonNullable<MatchWithTeams['home_team']> {
  return {
    id: teamId(name),
    name,
    short_code: name.slice(0, 3).toUpperCase(),
    flag_emoji: FLAG_MAP[name] ?? '🏳️',
    flag_url: null,
    group_name: null,
    is_active: true,
    created_at: new Date().toISOString(),
  };
}

function fixtureToMatch(f: ApiFixture): MatchWithTeams {
  const kickoff = f.kickoffUtc;

  // Lock predictions 5 minutes before kickoff
  const lockTime = new Date(
    new Date(kickoff).getTime() - 5 * 60 * 1000
  ).toISOString();

  const now = new Date();
  const kickoffDate = new Date(kickoff);
  const diffMs = now.getTime() - kickoffDate.getTime();

  let status: MatchWithTeams['status'] = 'scheduled';
  if (diffMs > 0 && diffMs < 110 * 60 * 1000) status = 'live';
  else if (diffMs >= 110 * 60 * 1000) status = 'finished';

  return {
    id: `wc2026-${f.matchNumber}`,
    match_day_id: null,
    competition_id: 'wc2026',
    home_team_id: teamId(f.homeTeam),
    away_team_id: teamId(f.awayTeam),
    venue: `${f.stadium}, ${f.hostCity
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())}`,
    group_name: f.group ?? null,
    kickoff_time: kickoff,
    prediction_lock_time: lockTime,
    status,
    home_score: null,
    away_score: null,
    result_published: false,
    result_published_at: null,
    created_by: null,
    created_at: kickoff,
    updated_at: kickoff,
    home_team: makeTeam(f.homeTeam),
    away_team: makeTeam(f.awayTeam),
    user_prediction: null,
  };
}

export async function fetchWorldCupFixtures(): Promise<{
  matches: MatchWithTeams[];
  dates: string[];
}> {
  const now = Date.now();
  if (_cache && now - _cacheTime < CACHE_TTL) return _cache;

  const res = await fetch(FIXTURES_URL);
  if (!res.ok) throw new Error(`Fixtures API returned ${res.status}`);

  const json = await res.json();
  const fixtures: ApiFixture[] = json.fixtures ?? [];

  const matches = fixtures.map(fixtureToMatch);

  // Derive dates from IST kickoff times — this is the single source of truth
  const dateSet = new Set(matches.map(m => toISTDateString(m.kickoff_time)));
  const dates = [...dateSet].sort();

  _cache = { matches, dates };
  _cacheTime = now;
  return _cache;
}

/**
 * Filter matches by IST date string 'YYYY-MM-DD'.
 * Always computes from kickoff_time — no fallback, no ambiguity.
 */
export function filterByDate(matches: MatchWithTeams[], date: string): MatchWithTeams[] {
  return matches.filter(m => toISTDateString(m.kickoff_time) === date);
}
