import { useEffect, useState } from 'react';
import { Download, DatabaseBackup, Sparkles, Trash2, Puzzle, User, Check } from 'lucide-react';
import type { Profile } from '@/types';
import { api, apiUrl } from '@/lib/db';

interface Props { profile: Profile; onSave: (p: Profile) => Promise<void>; onDataChanged: () => void }

const input = 'w-full px-3 py-2 text-sm rounded-md bg-[#F1EFE8] border border-transparent focus:border-[#0F6E56] focus:bg-white focus:outline-none text-slate-900';
const label = 'block text-xs font-medium text-slate-500 mb-1';
const card = { border: '1px solid #E8E5DC' };

export default function SettingsView({ profile, onSave, onDataChanged }: Props) {
  const [form, setForm] = useState(profile);
  const [saved, setSaved] = useState(false);
  useEffect(() => setForm(profile), [profile]);
  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const save = async (e: React.FormEvent) => { e.preventDefault(); await onSave(form); setSaved(true); setTimeout(() => setSaved(false), 1500); };
  const act = async (path: string, ask?: string) => {
    if (ask && !confirm(ask)) return;
    await api(path, { method: 'POST' }); onDataChanged();
  };
  const btn = 'flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-md border hover:bg-slate-50 text-slate-700';

  return (
    <div className="p-5 sm:p-8 w-full">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Everything is stored on this computer — nothing leaves it.</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <form onSubmit={save} className="bg-white rounded-lg p-5 space-y-4" style={card}>
          <div className="flex items-center gap-2"><User className="w-4 h-4 text-[#0F6E56]" /><h2 className="text-sm font-semibold text-slate-900">Your profile · used in outreach templates</h2></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={label}>Full name</label><input value={form.full_name} onChange={set('full_name')} className={input} /></div>
            <div><label className={label}>Headline</label><input value={form.headline} onChange={set('headline')} className={input} placeholder="Full Stack Developer" /></div>
            <div className="sm:col-span-2"><label className={label}>Key skills</label><input value={form.skills} onChange={set('skills')} className={input} /></div>
            <div className="sm:col-span-2"><label className={label}>Resume / portfolio link</label><input value={form.resume_link} onChange={set('resume_link')} className={input} placeholder="https://…" /></div>
            <div><label className={label}>Follow up after (days)</label><input type="number" min={1} value={form.followup_days} onChange={set('followup_days')} className={input} /></div>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-white rounded-md flex items-center gap-2" style={{ backgroundColor: '#0F6E56' }}>
            {saved && <Check className="w-4 h-4" />} {saved ? 'Saved' : 'Save profile'}
          </button>
        </form>

        <div className="space-y-6">
          <div className="bg-white rounded-lg p-5" style={card}>
            <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2"><DatabaseBackup className="w-4 h-4 text-[#0F6E56]" /> Your data</h2>
            <div className="flex flex-wrap gap-2">
              <a href={apiUrl('/api/export.csv')} className={btn} style={card}><Download className="w-4 h-4" /> Export CSV</a>
              <a href={apiUrl('/api/backup')} className={btn} style={card}><DatabaseBackup className="w-4 h-4" /> Download DB backup</a>
              <button onClick={() => act('/api/seed')} className={btn} style={card}><Sparkles className="w-4 h-4" /> Add demo data</button>
              <button onClick={() => act('/api/reset', 'Delete ALL applications, outreach and notes? This cannot be undone.')} className={btn + ' text-rose-600'} style={card}><Trash2 className="w-4 h-4" /> Clear all data</button>
            </div>
            <p className="text-xs text-slate-400 mt-3">File: <code>data/concourse.db</code> (SQLite). Use “Clear all data” before you start tracking real applications.</p>
          </div>
          <div className="bg-white rounded-lg p-5" style={card}>
            <h2 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2"><Puzzle className="w-4 h-4 text-[#0F6E56]" /> Browser extension</h2>
            <p className="text-sm text-slate-500 leading-relaxed">Chrome → <code>chrome://extensions</code> → Developer mode → Load unpacked → pick the <code>extension/</code> folder. It detects “application submitted” pages and asks you to confirm in one click.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
