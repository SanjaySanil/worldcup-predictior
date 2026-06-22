import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, AlertCircle, Save, Trophy, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Tournament, Competition } from '../../types';

export default function Tournaments() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [showCompetitionModal, setShowCompetitionModal] = useState(false);
  const [editTournament, setEditTournament] = useState<Tournament | null | undefined>(null);
  const [editCompetition, setEditCompetition] = useState<{ comp?: Competition; tournamentId?: string } | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);

  const fetchData = async () => {
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase.from('tournaments').select('*').order('created_at', { ascending: false }),
      supabase.from('competitions').select('*').order('created_at', { ascending: false }),
    ]);
    setTournaments(t || []);
    setCompetitions(c || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleExpand = (id: string) => {
    setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Tournaments</h1>
          <p className="text-pitch-300 text-sm mt-1">{tournaments.length} tournaments</p>
        </div>
        <button
          onClick={() => { setEditTournament(undefined); setShowTournamentModal(true); }}
          className="btn-gold rounded-lg py-2.5 px-5 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Tournament
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tournaments.length === 0 ? (
        <div className="card rounded-xl py-16 text-center">
          <Trophy className="w-12 h-12 text-pitch-600 mx-auto mb-4" />
          <p className="text-pitch-300 font-semibold">No tournaments yet</p>
          <p className="text-pitch-400 text-sm mt-1">Create your first tournament to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tournaments.map(t => {
            const comps = competitions.filter(c => c.tournament_id === t.id);
            const isExpanded = expanded.includes(t.id);

            return (
              <div key={t.id} className="card rounded-xl overflow-hidden">
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-pitch-700/50"
                  onClick={() => toggleExpand(t.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-pitch-400" /> : <ChevronRight className="w-4 h-4 text-pitch-400" />}
                    <div>
                      <div className="font-bold text-white">{t.name}</div>
                      <div className="text-xs text-pitch-400 mt-0.5">
                        {t.start_date && t.end_date ? `${t.start_date} — ${t.end_date}` : 'No dates set'}
                        {' · '}{comps.length} competitions
                        <span className={`ml-2 tag ${t.is_active ? 'bg-success-800 text-success-300' : 'bg-pitch-600 text-pitch-400'}`}>
                          {t.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { setEditTournament(t); setShowTournamentModal(true); }}
                      className="p-2 text-pitch-400 hover:text-white hover:bg-pitch-600 rounded-lg transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-pitch-700 px-5 pb-5 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-pitch-200 uppercase tracking-wider">Competitions</h3>
                      <button
                        onClick={() => { setEditCompetition({ tournamentId: t.id }); setShowCompetitionModal(true); }}
                        className="btn-outline-gold text-xs py-1.5 px-3"
                      >
                        <Plus className="w-3.5 h-3.5 inline mr-1" />
                        Add Competition
                      </button>
                    </div>
                    {comps.length === 0 ? (
                      <p className="text-pitch-400 text-sm">No competitions yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {comps.map(c => (
                          <div key={c.id} className="flex items-center justify-between bg-pitch-800 rounded-lg px-4 py-3">
                            <div>
                              <div className="font-medium text-white">{c.name}</div>
                              <div className="text-xs text-pitch-400">
                                {c.start_date && c.end_date ? `${c.start_date} — ${c.end_date}` : 'No dates set'}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`tag ${c.is_active ? 'bg-success-800 text-success-300' : 'bg-pitch-600 text-pitch-400'}`}>
                                {c.is_active ? 'Active' : 'Inactive'}
                              </span>
                              <button
                                onClick={() => { setEditCompetition({ comp: c }); setShowCompetitionModal(true); }}
                                className="p-1.5 text-pitch-400 hover:text-white hover:bg-pitch-700 rounded transition-all"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tournament Modal */}
      {showTournamentModal && (
        <TournamentModal
          tournament={editTournament}
          userId={user?.id}
          onClose={() => { setShowTournamentModal(false); setEditTournament(null); }}
          onSave={fetchData}
        />
      )}

      {/* Competition Modal */}
      {showCompetitionModal && editCompetition && (
        <CompetitionModal
          competition={editCompetition.comp}
          tournamentId={editCompetition.tournamentId}
          onClose={() => { setShowCompetitionModal(false); setEditCompetition(null); }}
          onSave={fetchData}
        />
      )}
    </div>
  );
}

function TournamentModal({ tournament, userId, onClose, onSave }: any) {
  const [form, setForm] = useState({
    name: tournament?.name || '',
    slug: tournament?.slug || '',
    description: tournament?.description || '',
    start_date: tournament?.start_date || '',
    end_date: tournament?.end_date || '',
    is_active: tournament?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, created_by: userId };
    if (tournament) {
      await supabase.from('tournaments').update(payload).eq('id', tournament.id);
    } else {
      await supabase.from('tournaments').insert(payload);
    }
    setSaving(false);
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-pitch-800 border border-pitch-600 rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-pitch-700">
          <h2 className="font-display font-bold text-lg uppercase tracking-wider text-white">
            {tournament ? 'Edit Tournament' : 'New Tournament'}
          </h2>
          <button onClick={onClose}><X className="w-5 h-5 text-pitch-400 hover:text-white" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="form-label">Name</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} className="form-input" required />
          </div>
          <div>
            <label className="form-label">Slug</label>
            <input type="text" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="form-input" required />
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="form-input h-20 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Start Date</label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="form-input" />
            </div>
            <div>
              <label className="form-label">End Date</label>
              <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="form-input" />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 accent-gold-500" />
            <span className="text-sm text-pitch-200">Active</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="btn-gold rounded-lg py-2.5 px-6">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CompetitionModal({ competition, tournamentId, onClose, onSave }: any) {
  const [form, setForm] = useState({
    name: competition?.name || '',
    description: competition?.description || '',
    start_date: competition?.start_date || '',
    end_date: competition?.end_date || '',
    is_active: competition?.is_active ?? true,
    tournament_id: competition?.tournament_id || tournamentId || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (competition) {
      await supabase.from('competitions').update(form).eq('id', competition.id);
    } else {
      await supabase.from('competitions').insert(form);
    }
    setSaving(false);
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-pitch-800 border border-pitch-600 rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-pitch-700">
          <h2 className="font-display font-bold text-lg uppercase tracking-wider text-white">
            {competition ? 'Edit Competition' : 'New Competition'}
          </h2>
          <button onClick={onClose}><X className="w-5 h-5 text-pitch-400 hover:text-white" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="form-label">Name</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="form-input" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Start Date</label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="form-input" />
            </div>
            <div>
              <label className="form-label">End Date</label>
              <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="form-input" />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 accent-gold-500" />
            <span className="text-sm text-pitch-200">Active</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="btn-gold rounded-lg py-2.5 px-6">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
