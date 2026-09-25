import { useState, useEffect } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';
import { db } from '@/lib/db';
import { parseJob } from '@/lib/parseJob';
import { isoDay } from '@/lib/utils';
import type { Application, AppStatus, AppSource, ApplicationInsert, StatusHistory } from '@/types';
import { STATUS_OPTIONS, SOURCE_OPTIONS } from '@/lib/constants';

interface ApplicationFormProps {
  application: Application | null;
  onClose: () => void;
  onSaved: (application: Application, history?: StatusHistory) => void;
}

export default function ApplicationForm({ application, onClose, onSaved }: ApplicationFormProps) {
  const isEdit = !!application;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paste, setPaste] = useState('');

  const [form, setForm] = useState<ApplicationInsert>({
    company: '',
    role: '',
    job_url: '',
    location: '',
    salary_range: '',
    source: 'linkedin' as AppSource,
    contact_name: '',
    contact_email: '',
    contact_role: '',
    contact_linkedin: '',
    status: 'wishlist' as AppStatus,
    applied_on: '',
    follow_up_on: '',
    resume_version: '',
  });

  useEffect(() => {
    if (application) {
      setForm({
        company: application.company,
        role: application.role,
        job_url: application.job_url ?? '',
        location: application.location ?? '',
        salary_range: application.salary_range ?? '',
        source: application.source ?? ('linkedin' as AppSource),
        contact_name: application.contact_name ?? '',
        contact_email: application.contact_email ?? '',
        contact_role: application.contact_role ?? '',
        contact_linkedin: application.contact_linkedin ?? '',
        status: application.status,
        applied_on: application.applied_on ?? '',
        follow_up_on: application.follow_up_on ?? '',
        resume_version: application.resume_version ?? '',
      });
    }
  }, [application]);

  const update = (field: keyof ApplicationInsert, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const autofill = () => {
    const p = parseJob(paste);
    setForm((f) => ({ ...f, ...p, source: p.job_url?.includes('linkedin.com') ? ('linkedin' as AppSource) : f.source }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const data: ApplicationInsert = {
      ...form,
      applied_on: form.applied_on || null,
      follow_up_on: form.follow_up_on || null,
      job_url: form.job_url || null,
      location: form.location || null,
      salary_range: form.salary_range || null,
      contact_name: form.contact_name || null,
      contact_email: form.contact_email || null,
      contact_role: form.contact_role || null,
      contact_linkedin: form.contact_linkedin || null,
      resume_version: form.resume_version || null,
      last_activity_on: form.applied_on || isoDay(),
    };

    if (isEdit && application) {
      const oldStatus = application.status;
      const newStatus = data.status as AppStatus;

      const { data: updated, error: updateErr } = await db
        .from('applications')
        .update(data)
        .eq('id', application.id)
        .select()
        .single();

      if (updateErr) {
        setError(updateErr.message);
        setSaving(false);
        return;
      }

      let history: StatusHistory | undefined;
      if (oldStatus !== newStatus) {
        const { data: histData } = await db.from('status_history').insert({
          application_id: application.id,
          from_status: oldStatus,
          to_status: newStatus,
          trigger: 'manual',
        }).select().single();
        if (histData) history = histData as StatusHistory;
      }

      setSaving(false);
      onSaved(updated as Application, history);
    } else {
      const insertData = { ...data };
      const { data: inserted, error: insertErr } = await db
        .from('applications')
        .insert(insertData)
        .select()
        .single();

      if (insertErr) {
        setError(insertErr.message);
        setSaving(false);
        return;
      }

      setSaving(false);
      onSaved(inserted as Application);
    }
  };

  const inputClass = 'w-full px-3 py-2 text-sm rounded-md bg-[#F1EFE8] border border-transparent focus:border-[#0F6E56] focus:bg-white focus:outline-none transition-colors text-slate-900';
  const labelClass = 'block text-xs font-medium text-slate-500 mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-start justify-center sm:pt-8 sm:px-4" style={{ backgroundColor: 'rgba(0,0,0,0.25)' }} onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-lg w-full sm:max-w-lg max-h-[92vh] sm:max-h-[85vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10" style={{ borderColor: '#E8E5DC' }}>
          <h2 className="text-base font-semibold text-slate-900">
            {isEdit ? 'Edit Application' : 'New Application'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {!isEdit && (
            <details className="rounded-md bg-[#F1EFE8] p-3">
              <summary className="text-xs font-medium text-slate-600 cursor-pointer flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#0F6E56]" /> Paste a job posting to auto-fill
              </summary>
              <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={4} placeholder="Paste the job title, company, location and link here…" className="mt-2 w-full px-3 py-2 text-sm rounded-md bg-white border border-transparent focus:border-[#0F6E56] focus:outline-none" />
              <button type="button" onClick={autofill} disabled={!paste.trim()} className="mt-2 px-3 py-1.5 text-xs font-medium text-white rounded-md disabled:opacity-40" style={{ backgroundColor: '#0F6E56' }}>Auto-fill fields</button>
            </details>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Company *</label>
              <input required value={form.company} onChange={(e) => update('company', e.target.value)} className={inputClass} placeholder="Acme Inc." />
            </div>
            <div>
              <label className={labelClass}>Role *</label>
              <input required value={form.role} onChange={(e) => update('role', e.target.value)} className={inputClass} placeholder="Software Engineer" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Status</label>
              <select value={form.status} onChange={(e) => update('status', e.target.value)} className={inputClass}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Source</label>
              <select value={form.source ?? ''} onChange={(e) => update('source', e.target.value)} className={inputClass}>
                {SOURCE_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Job URL</label>
            <input value={form.job_url ?? ''} onChange={(e) => update('job_url', e.target.value)} className={inputClass} placeholder="https://..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Location</label>
              <input value={form.location ?? ''} onChange={(e) => update('location', e.target.value)} className={inputClass} placeholder="Remote / SF" />
            </div>
            <div>
              <label className={labelClass}>Salary Range</label>
              <input value={form.salary_range ?? ''} onChange={(e) => update('salary_range', e.target.value)} className={inputClass} placeholder="$120k–$160k" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Applied On</label>
              <input type="date" value={form.applied_on ?? ''} onChange={(e) => update('applied_on', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Follow Up On</label>
              <input type="date" value={form.follow_up_on ?? ''} onChange={(e) => update('follow_up_on', e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="pt-2 border-t" style={{ borderColor: '#F4F2EC' }}>
            <p className="text-xs font-medium text-slate-400 mb-3">Contact</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Name</label>
                <input value={form.contact_name ?? ''} onChange={(e) => update('contact_name', e.target.value)} className={inputClass} placeholder="Jane Doe" />
              </div>
              <div>
                <label className={labelClass}>Role</label>
                <input value={form.contact_role ?? ''} onChange={(e) => update('contact_role', e.target.value)} className={inputClass} placeholder="Engineering Manager" />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input value={form.contact_email ?? ''} onChange={(e) => update('contact_email', e.target.value)} className={inputClass} placeholder="jane@acme.com" />
              </div>
              <div>
                <label className={labelClass}>LinkedIn</label>
                <input value={form.contact_linkedin ?? ''} onChange={(e) => update('contact_linkedin', e.target.value)} className={inputClass} placeholder="https://linkedin.com/in/..." />
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>Resume Version</label>
            <input value={form.resume_version ?? ''} onChange={(e) => update('resume_version', e.target.value)} className={inputClass} placeholder="v3-frontend-2024" />
          </div>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-md">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white rounded-md transition-colors hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              style={{ backgroundColor: '#0F6E56' }}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
