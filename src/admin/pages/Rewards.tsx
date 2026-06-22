import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Gift, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Prize, Competition } from '../../types';

export default function Rewards() {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPrize, setEditPrize] = useState<Prize | null | undefined>(null);

  const fetchData = async () => {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('prizes').select('*').order('created_at', { ascending: false }),
      supabase.from('competitions').select('*'),
    ]);
    setPrizes(p || []);
    setCompetitions(c || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const deletePrize = async (id: string) => {
    await supabase.from('prizes').delete().eq('id', id);
    fetchData();
  };

  const typeColors: Record<string, string> = {
    daily: 'bg-gold-900 text-gold-300',
    weekly: 'bg-purple-900 text-purple-300',
    monthly: 'bg-blue-900 text-blue-300',
    overall: 'bg-success-900 text-success-300',
    special: 'bg-danger-900 text-danger-300',
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Rewards & Prizes</h1>
          <p className="text-pitch-300 text-sm mt-1">{prizes.length} prizes configured</p>
        </div>
        <button
          onClick={() => { setEditPrize(undefined); setShowModal(true); }}
          className="btn-gold rounded-lg py-2.5 px-5 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Prize
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : prizes.length === 0 ? (
        <div className="card rounded-xl py-16 text-center">
          <Gift className="w-12 h-12 text-pitch-600 mx-auto mb-4" />
          <p className="text-pitch-300 font-semibold">No prizes configured</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {prizes.map(prize => (
            <div key={prize.id} className="card rounded-xl p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className={`tag capitalize ${typeColors[prize.prize_type || 'special']}`}>
                    {prize.prize_type}
                  </span>
                  {prize.rank && (
                    <span className="tag bg-pitch-600 text-pitch-200 ml-2">Rank #{prize.rank}</span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditPrize(prize); setShowModal(true); }} className="p-1.5 text-pitch-400 hover:text-white hover:bg-pitch-600 rounded-lg transition-all">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deletePrize(prize.id)} className="p-1.5 text-danger-400 hover:text-danger-300 hover:bg-pitch-600 rounded-lg transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div>
                <div className="font-bold text-white">{prize.title}</div>
                {prize.description && <div className="text-sm text-pitch-300 mt-1">{prize.description}</div>}
              </div>
              <div className="flex items-center justify-between text-xs text-pitch-400">
                <span className={`tag ${prize.is_active ? 'bg-success-800 text-success-300' : 'bg-pitch-600 text-pitch-400'}`}>
                  {prize.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <PrizeModal
          prize={editPrize}
          competitions={competitions}
          onClose={() => { setShowModal(false); setEditPrize(null); }}
          onSave={fetchData}
        />
      )}
    </div>
  );
}

function PrizeModal({ prize, competitions, onClose, onSave }: any) {
  const [form, setForm] = useState({
    title: prize?.title || '',
    description: prize?.description || '',
    prize_type: prize?.prize_type || 'daily',
    competition_id: prize?.competition_id || '',
    rank: prize?.rank?.toString() || '',
    is_active: prize?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      rank: form.rank ? parseInt(form.rank) : null,
      competition_id: form.competition_id || null,
    };
    if (prize) {
      await supabase.from('prizes').update(payload).eq('id', prize.id);
    } else {
      await supabase.from('prizes').insert(payload);
    }
    setSaving(false);
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-pitch-800 border border-pitch-600 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-pitch-700">
          <h2 className="font-display font-bold text-lg uppercase tracking-wider text-white">
            {prize ? 'Edit Prize' : 'Add Prize'}
          </h2>
          <button onClick={onClose}><X className="w-5 h-5 text-pitch-400 hover:text-white" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="form-label">Title</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="form-input" required />
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="form-input h-20 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Type</label>
              <select value={form.prize_type} onChange={e => setForm(f => ({ ...f, prize_type: e.target.value }))} className="form-input">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="overall">Overall</option>
                <option value="special">Special</option>
              </select>
            </div>
            <div>
              <label className="form-label">Rank</label>
              <input type="number" min={1} value={form.rank} onChange={e => setForm(f => ({ ...f, rank: e.target.value }))} className="form-input" placeholder="e.g. 1" />
            </div>
          </div>
          <div>
            <label className="form-label">Competition</label>
            <select value={form.competition_id} onChange={e => setForm(f => ({ ...f, competition_id: e.target.value }))} className="form-input">
              <option value="">All competitions</option>
              {competitions.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 accent-gold-500" />
            <span className="text-sm text-pitch-200">Active</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="btn-gold rounded-lg py-2.5 px-6">
              {saving ? 'Saving...' : <span className="flex items-center gap-2"><Save className="w-4 h-4" />Save</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
