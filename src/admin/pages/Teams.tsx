import { useState, useEffect } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { fetchWorldCupFixtures } from '../../lib/fixturesApi';
import type { MatchWithTeams } from '../../types';

type Team = NonNullable<MatchWithTeams['home_team']>;

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');

  const loadTeams = async () => {
    setLoading(true);
    try {
      const { matches } = await fetchWorldCupFixtures();
      // Collect unique teams from all fixtures
      const teamMap = new Map<string, Team & { groups: Set<string> }>();

      matches.forEach(m => {
        const group = m.group_name ?? '';
        if (m.home_team) {
          const existing = teamMap.get(m.home_team.id);
          if (existing) {
            if (group) existing.groups.add(group);
          } else {
            teamMap.set(m.home_team.id, { ...m.home_team, groups: new Set(group ? [group] : []) });
          }
        }
        if (m.away_team) {
          const existing = teamMap.get(m.away_team.id);
          if (existing) {
            if (group) existing.groups.add(group);
          } else {
            teamMap.set(m.away_team.id, { ...m.away_team, groups: new Set(group ? [group] : []) });
          }
        }
      });

      setTeams([...teamMap.values()].sort((a, b) => a.name.localeCompare(b.name)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTeams(); }, []);

  // All unique groups
  const allGroups = [...new Set(
    teams.flatMap(t => [...((t as any).groups as Set<string>)])
  )].sort();

  const filtered = teams.filter(t => {
    const q = search.toLowerCase();
    const matchesSearch = !search || t.name.toLowerCase().includes(q) || t.short_code?.toLowerCase().includes(q);
    const matchesGroup = !groupFilter || (t as any).groups.has(groupFilter);
    return matchesSearch && matchesGroup;
  });

  // Group teams by their group letter
  const byGroup = allGroups.reduce<Record<string, (Team & { groups: Set<string> })[]>>((acc, g) => {
    acc[g] = (teams as (Team & { groups: Set<string> })[]).filter(t => t.groups.has(g));
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Teams</h1>
          <p className="text-pitch-300 text-sm mt-1">
            {teams.length} teams from FIFA World Cup 2026 API
          </p>
        </div>
        <button
          onClick={loadTeams}
          className="btn-ghost rounded-lg py-2.5 px-5 flex items-center gap-2 self-start"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-pitch-800 border border-gold-subtle rounded-lg px-4 py-3 text-sm text-pitch-300">
        <strong className="text-gold-400">Teams sourced from TheStatsAPI.</strong>
        {' '}All 48 World Cup 2026 teams are listed here automatically.
      </div>

      {/* Group pills summary */}
      {allGroups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setGroupFilter('')}
            className={`tag cursor-pointer ${!groupFilter ? 'bg-gold-600 text-pitch-900' : 'bg-pitch-700 text-pitch-200 hover:bg-pitch-600'}`}
          >
            All Groups
          </button>
          {allGroups.map(g => (
            <button
              key={g}
              onClick={() => setGroupFilter(groupFilter === g ? '' : g)}
              className={`tag cursor-pointer ${groupFilter === g ? 'bg-gold-600 text-pitch-900' : 'bg-pitch-700 text-pitch-200 hover:bg-pitch-600'}`}
            >
              Group {g}: {byGroup[g]?.length ?? 0} teams
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pitch-400" />
        <input
          type="text" value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search teams..."
          className="form-input pl-10"
        />
      </div>

      {/* Teams Grid */}
      <div className="card rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-pitch-300">No teams found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((team, i) => {
              const groups = [...((team as any).groups as Set<string>)].sort().join(', ');
              return (
                <div
                  key={team.id}
                  className="flex items-center gap-3 p-4 border-b border-r border-pitch-700 hover:bg-pitch-700/50 transition-colors"
                >
                  <span className="text-3xl">{team.flag_emoji || '🏳️'}</span>
                  <div>
                    <div className="font-semibold text-white">{team.name}</div>
                    <div className="text-xs text-pitch-400 flex items-center gap-2 mt-0.5">
                      {team.short_code && <span className="font-mono">{team.short_code}</span>}
                      {groups && <span>Group {groups}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
