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

/**
 * Confirmed Round of 32 team overrides.
 * The TheStatsAPI fixtures.json still uses placeholder names (e.g. "Group A runners-up")
 * for the knockout stage. This map patches them with the real qualified teams.
 * Keys are matchNumber values from the API. Update this as later rounds get confirmed.
 *
 * Round of 32 confirmed (group stage concluded ~June 28 2026):
 */
const KNOCKOUT_TEAM_OVERRIDES: Record<number, { homeTeam: string; awayTeam: string }> = {
  // Match 73 – Jun 28 19:00 UTC → Jun 29 00:30 IST
  73: { homeTeam: 'South Africa', awayTeam: 'Canada' },
  // Match 76 – Jun 29 17:00 UTC → Jun 29 22:30 IST  ← Brazil vs Japan (Tomorrow 10:30 PM IST)
  76: { homeTeam: 'Brazil',       awayTeam: 'Japan' },
  // Match 74 – Jun 29 20:30 UTC → Jun 30 02:00 IST  ← Germany vs Paraguay (Tue 2:00 AM IST)
  74: { homeTeam: 'Germany',      awayTeam: 'Paraguay' },
  // Match 75 – Jun 30 01:00 UTC → Jun 30 06:30 IST  ← Netherlands vs Morocco (Tue 6:30 AM IST)
  75: { homeTeam: 'Netherlands',  awayTeam: 'Morocco' },
  // Match 78 – Jun 30 17:00 UTC → Jun 30 22:30 IST  ← Côte d'Ivoire vs Norway (Tue 10:30 PM IST)
  78: { homeTeam: "Cote d'Ivoire", awayTeam: 'Norway' },
  // Match 77 – Jun 30 21:00 UTC → Jul 01 02:30 IST  ← France vs Sweden (Wed 2:30 AM IST)
  77: { homeTeam: 'France',       awayTeam: 'Sweden' },
  // Match 79 – Jul 01 01:00 UTC → Jul 01 06:30 IST  ← Mexico vs Ecuador (Wed 6:30 AM IST)
  79: { homeTeam: 'Mexico',       awayTeam: 'Ecuador' },
  // Match 80 – Jul 01 16:00 UTC → Jul 01 21:30 IST  ← England vs Congo DR (Wed 9:30 PM IST)
  80: { homeTeam: 'England',      awayTeam: 'Congo DR' },
  // Match 82 – Jul 01 20:00 UTC → Jul 02 01:30 IST  ← Belgium vs Senegal (Thu 1:30 AM IST)
  82: { homeTeam: 'Belgium',      awayTeam: 'Senegal' },
  // Match 81 – Jul 02 00:00 UTC → Jul 02 05:30 IST  ← USA vs Bosnia (Thu 5:30 AM IST)
  81: { homeTeam: 'United States', awayTeam: 'Bosnia and Herzegovina' },
  // Match 84 – Jul 02 19:00 UTC → Jul 03 00:30 IST  ← Spain vs Austria (Fri 12:30 AM IST)
  84: { homeTeam: 'Spain',        awayTeam: 'Austria' },
  // Match 83 – Jul 02 23:00 UTC → Jul 03 04:30 IST  ← Portugal vs Croatia (Fri 4:30 AM IST)
  83: { homeTeam: 'Portugal',     awayTeam: 'Croatia' },
  // Match 85 – Jul 03 03:00 UTC → Jul 03 08:30 IST  ← Switzerland vs Algeria (Fri 8:30 AM IST)
  85: { homeTeam: 'Switzerland',  awayTeam: 'Algeria' },
  // Match 88 – Jul 03 18:00 UTC → Jul 03 23:30 IST  ← Australia vs Egypt (Fri 11:30 PM IST)
  88: { homeTeam: 'Australia',    awayTeam: 'Egypt' },
  // Match 86 – Jul 03 22:00 UTC → Jul 04 03:30 IST  ← Argentina vs Cabo Verde (Sat 3:30 AM IST)
  86: { homeTeam: 'Argentina',    awayTeam: 'Cabo Verde' },
  // Match 87 – Jul 04 01:30 UTC → Jul 04 07:00 IST  ← Colombia vs Ghana (Sat 7:00 AM IST)
  87: { homeTeam: 'Colombia',     awayTeam: 'Ghana' },

  // Round of 16 Overrides
  // Match 89 – Jul 04 21:00 UTC → Jul 05 02:30 IST  ← Paraguay vs France (Sun 2:30 AM IST)
  89: { homeTeam: 'Paraguay',      awayTeam: 'France' },
  // Match 90 – Jul 04 17:00 UTC → Jul 04 22:30 IST  ← Canada vs Morocco (Sat 10:30 PM IST)
  90: { homeTeam: 'Canada',        awayTeam: 'Morocco' },
  // Match 91 – Jul 05 20:00 UTC → Jul 06 01:30 IST  ← Brazil vs Norway (Mon 1:30 AM IST)
  91: { homeTeam: 'Brazil',        awayTeam: 'Norway' },
  // Match 92 – Jul 06 00:00 UTC → Jul 06 05:30 IST  ← Mexico vs England (Mon 5:30 AM IST)
  92: { homeTeam: 'Mexico',        awayTeam: 'England' },
  // Match 93 – Jul 06 19:00 UTC → Jul 07 00:30 IST  ← Portugal vs Spain (Tue 12:30 AM IST)
  93: { homeTeam: 'Portugal',      awayTeam: 'Spain' },
  // Match 94 – Jul 07 00:00 UTC → Jul 07 05:30 IST  ← USA vs Belgium (Tue 5:30 AM IST)
  94: { homeTeam: 'United States', awayTeam: 'Belgium' },
  // Match 95 – Jul 07 16:00 UTC → Jul 07 21:30 IST  ← Argentina vs Egypt (Tue 9:30 PM IST)
  95: { homeTeam: 'Argentina',     awayTeam: 'Egypt' },
  // Match 96 – Jul 07 20:00 UTC → Jul 08 01:30 IST  ← Switzerland vs Colombia (Wed 1:30 AM IST)
  96: { homeTeam: 'Switzerland',   awayTeam: 'Colombia' },

  // Quarter-finals Overrides
  // Match 97 – Jul 09 20:00 UTC → Jul 10 01:30 IST  ← France vs Morocco (Fri 1:30 AM IST)
  97: { homeTeam: 'France',        awayTeam: 'Morocco' },
  // Match 99 – Jul 11 21:00 UTC → Jul 12 02:30 IST  ← Norway vs England (Sun 2:30 AM IST)
  99: { homeTeam: 'Norway',        awayTeam: 'England' },
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
    // Knockout matches have no group letter in the API data (group is undefined).
    // All Round of 32, QF, SF and Final matches are automatically flagged so
    // the penalty-winner picker appears on the user side.
    is_knockout: !f.group,
    penalty_winner: null,
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
  const rawFixtures: ApiFixture[] = json.fixtures ?? [];

  // Apply confirmed knockout team overrides — the upstream API still uses
  // placeholder names (e.g. "Group A runners-up") for knockout matches.
  // KNOCKOUT_TEAM_OVERRIDES patches them with the real qualified teams.
  const fixtures = rawFixtures.map(f => {
    const override = KNOCKOUT_TEAM_OVERRIDES[f.matchNumber];
    if (override) {
      return { ...f, homeTeam: override.homeTeam, awayTeam: override.awayTeam };
    }
    return f;
  });

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
