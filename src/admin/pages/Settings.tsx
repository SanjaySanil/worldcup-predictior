import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { PointSettings, Competition } from '../../types';

export default function Settings() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedComp, setSelectedComp] = useState('');
  const [settings, setSettings] = useState<PointSettings | null>(null);
  const [form, setForm] = useState({
    exact_score_points: 3,
    correct_result_points: 1,
    wrong_prediction_points: 0,
    streak_bonus_points: 5,
    streak_threshold: 3,
    daily_winner_points: 10,
    weekly_winner_points: 25,
    monthly_winner_points: 100,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    supabase.from('competitions').select('*').then(({ data }) => {
      setCompetitions(data || []);
      if (data?.[0]) setSelectedComp(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedComp) return;
    supabase
      .from('point_settings')
      .select('*')
      .eq('competition_id', selectedComp)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSettings(data);
          setForm({
            exact_score_points: data.exact_score_points,
            correct_result_points: data.correct_result_points,
            wrong_prediction_points: data.wrong_prediction_points,
            streak_bonus_points: data.streak_bonus_points,
            streak_threshold: data.streak_threshold,
            daily_winner_points: data.daily_winner_points,
            weekly_winner_points: data.weekly_winner_points,
            monthly_winner_points: data.monthly_winner_points,
          });
        } else {
          setSettings(null);
        }
      });
  }, [selectedComp]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload = { ...form, competition_id: selectedComp };

    if (settings) {
      const { error } = await supabase.from('point_settings').update(payload).eq('id', settings.id);
      if (error) { setMessage({ type: 'error', text: error.message }); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('point_settings').insert(payload);
      if (error) { setMessage({ type: 'error', text: error.message }); setSaving(false); return; }
    }

    setMessage({ type: 'success', text: 'Settings saved successfully!' });
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="section-title">Settings</h1>
        <p className="text-pitch-300 text-sm mt-1">Configure point systems and competition settings</p>
      </div>

      {competitions.length > 0 && (
        <div>
          <label className="form-label">Competition</label>
          <select
            value={selectedComp}
            onChange={e => setSelectedComp(e.target.value)}
            className="form-input max-w-sm"
          >
            {competitions.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {message && (
        <div className={`flex items-center gap-2.5 rounded-lg px-4 py-3 ${
          message.type === 'success' ? 'bg-success-900 border border-success-700' : 'bg-danger-900 border border-danger-700'
        }`}>
          {message.type === 'success'
            ? <CheckCircle className="w-4 h-4 text-success-400" />
            : <AlertCircle className="w-4 h-4 text-danger-400" />
          }
          <span className={`text-sm ${message.type === 'success' ? 'text-success-300' : 'text-danger-300'}`}>
            {message.text}
          </span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="card rounded-xl p-6">
          <h2 className="subsection-title mb-4">Point System</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'exact_score_points', label: 'Exact Score', desc: 'Points for predicting exact score' },
              { key: 'correct_result_points', label: 'Correct Result', desc: 'Points for correct W/D/L' },
              { key: 'wrong_prediction_points', label: 'Wrong Prediction', desc: 'Points for wrong prediction' },
            ].map(({ key, label, desc }) => (
              <div key={key}>
                <label className="form-label">{label}</label>
                <input
                  type="number"
                  min={0}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: parseInt(e.target.value) || 0 }))}
                  className="form-input"
                />
                <p className="text-xs text-pitch-400 mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card rounded-xl p-6">
          <h2 className="subsection-title mb-4">Bonus Points</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'streak_bonus_points', label: 'Streak Bonus', desc: 'Bonus per consecutive correct' },
              { key: 'streak_threshold', label: 'Streak Threshold', desc: 'Min correct predictions to trigger bonus' },
              { key: 'daily_winner_points', label: 'Daily Winner Bonus', desc: 'Extra points for top daily score' },
              { key: 'weekly_winner_points', label: 'Weekly Winner Bonus', desc: 'Extra points for top weekly score' },
              { key: 'monthly_winner_points', label: 'Monthly Winner Bonus', desc: 'Extra points for top monthly score' },
            ].map(({ key, label, desc }) => (
              <div key={key}>
                <label className="form-label">{label}</label>
                <input
                  type="number"
                  min={0}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: parseInt(e.target.value) || 0 }))}
                  className="form-input"
                />
                <p className="text-xs text-pitch-400 mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="card-dark rounded-xl p-5 border border-gold-subtle">
          <h2 className="subsection-title mb-3">Point Preview</h2>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="tag bg-success-800 text-success-300">{form.exact_score_points} pts</span>
              <span className="text-sm text-pitch-300">Exact score</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="tag bg-warn-800 text-warn-300">{form.correct_result_points} pts</span>
              <span className="text-sm text-pitch-300">Correct result</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="tag bg-gold-900 text-gold-300">+{form.streak_bonus_points} pts</span>
              <span className="text-sm text-pitch-300">Streak ({form.streak_threshold}+)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="tag bg-pitch-600 text-pitch-200">+{form.daily_winner_points} pts</span>
              <span className="text-sm text-pitch-300">Daily win</span>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-gold rounded-lg py-3 px-8 flex items-center gap-2">
          {saving ? (
            <>
              <span className="w-4 h-4 border-2 border-pitch-900 border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Settings
            </>
          )}
        </button>
      </form>
    </div>
  );
}
