import { useEffect, useState } from 'react';
import { X, Copy, Check, ExternalLink, Send, Loader2, Mail, RotateCcw } from 'lucide-react';
import { db } from '@/lib/db';
import type { Application, Channel, ColdEmail, Profile } from '@/types';
import { buildMessage, copyText, linkedinSearchUrl } from '@/lib/templates';
import { cn, isoDay } from '@/lib/utils';
import { CHANNELS } from '@/components/ChannelIcon';

interface Props {
  applications: Application[];
  initialApp?: Application | null;
  profile: Profile;
  onClose: () => void;
  onLogged: (ce: ColdEmail, app: Application | null) => void;
}

const input = 'w-full px-3 py-2 text-sm rounded-md bg-[#F1EFE8] border border-transparent focus:border-[#0F6E56] focus:bg-white focus:outline-none transition-colors text-slate-900';
const label = 'block text-xs font-medium text-slate-500 mb-1';

export default function OutreachComposer({ applications, initialApp, profile, onClose, onLogged }: Props) {
  const [appId, setAppId] = useState(initialApp?.id ?? applications[0]?.id ?? '');
  const app = applications.find((a) => a.id === appId) ?? null;
  const [channel, setChannel] = useState<Channel>(initialApp?.contact_email ? 'email' : initialApp?.contact_linkedin ? 'linkedin' : 'email');
  const [name, setName] = useState(initialApp?.contact_name ?? '');
  const [email, setEmail] = useState(initialApp?.contact_email ?? '');
  const [linkedin, setLinkedin] = useState(initialApp?.contact_linkedin ?? '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [dirty, setDirty] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const regenerate = () => {
    if (!app) return;
    const m = buildMessage(channel, app, profile, name);
    setSubject(m.subject); setBody(m.body); setDirty(false);
  };
  useEffect(() => { if (!dirty) regenerate(); /* eslint-disable-next-line */ }, [appId, channel, name, profile]);

  const pickApp = (id: string) => {
    const a = applications.find((x) => x.id === id);
    setAppId(id); setDirty(false);
    setName(a?.contact_name ?? ''); setEmail(a?.contact_email ?? ''); setLinkedin(a?.contact_linkedin ?? '');
  };

  const doCopy = async () => { await copyText(subject ? `Subject: ${subject}\n\n${body}` : body); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  const primary = (() => {
    if (!app) return null;
    if (channel === 'email')
      return { href: `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, text: 'Open in mail app', newTab: false, copyFirst: false };
    if (channel === 'linkedin')
      return { href: linkedin || linkedinSearchUrl(app.company), text: linkedin ? 'Open profile & copy note' : 'Find people on LinkedIn', newTab: true, copyFirst: true };
    return app.job_url ? { href: app.job_url, text: 'Open portal & copy note', newTab: true, copyFirst: true } : null;
  })();

  const markSent = async () => {
    if (!app) return;
    setSaving(true);
    const { data: ce } = await db.from('cold_emails').insert({
      application_id: app.id, channel, sent_on: isoDay(), contact_name: name || null, contact_role: app.contact_role,
    }).select().single();
    const { data: updated } = await db.from('applications').update({
      contact_name: name || null, contact_email: email || null, contact_linkedin: linkedin || null,
      last_activity_on: isoDay(), follow_up_on: isoDay(Number(profile.followup_days) || 7),
    }).eq('id', app.id).select().single();
    setSaving(false);
    if (ce) { onLogged(ce as ColdEmail, updated as Application | null); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} onClick={onClose}>
      <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-xl max-h-[94vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#E8E5DC' }}>
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-[#0F6E56]" />
            <h2 className="text-base font-semibold text-slate-900">New outreach</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        {applications.length === 0 ? (
          <p className="p-8 text-sm text-slate-500 text-center">Add an application first, then reach out to someone there.</p>
        ) : (
          <div className="px-5 py-5 space-y-4">
            <div>
              <label className={label}>Application</label>
              <select value={appId} onChange={(e) => pickApp(e.target.value)} className={input}>
                {applications.map((a) => <option key={a.id} value={a.id}>{a.company} — {a.role}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#F1EFE8]">
              {CHANNELS.map((c) => {
                const Icon = c.icon;
                return (
                  <button key={c.value} onClick={() => { setChannel(c.value); setDirty(false); }}
                    className={cn('flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md transition-colors',
                      channel === c.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                    <Icon className="w-4 h-4" /> {c.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={label}>Contact name</label><input value={name} onChange={(e) => setName(e.target.value)} className={input} placeholder="e.g. Ananya Rao" /></div>
              {channel === 'email' && <div><label className={label}>Contact email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} placeholder="name@company.com" /></div>}
              {channel === 'linkedin' && <div><label className={label}>LinkedIn profile URL</label><input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} className={input} placeholder="https://linkedin.com/in/…" /></div>}
            </div>

            {channel === 'email' && <div><label className={label}>Subject</label><input value={subject} onChange={(e) => { setSubject(e.target.value); setDirty(true); }} className={input} /></div>}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={label + ' mb-0'}>Message {channel === 'linkedin' && <span className="text-slate-400">· {body.length}/300</span>}</label>
                <button onClick={regenerate} className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Reset</button>
              </div>
              <textarea value={body} onChange={(e) => { setBody(e.target.value); setDirty(true); }} rows={channel === 'linkedin' ? 5 : 9} className={input + ' resize-y leading-relaxed'} />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              {primary && (
                <a href={primary.href} target={primary.newTab ? '_blank' : undefined} rel="noreferrer"
                  onClick={() => primary.copyFirst && copyText(body)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-md hover:opacity-90" style={{ backgroundColor: '#0F6E56' }}>
                  {channel === 'email' ? <Mail className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />} {primary.text}
                </a>
              )}
              <button onClick={doCopy} className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 rounded-md border hover:bg-slate-50" style={{ borderColor: '#E8E5DC' }}>
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy'}
              </button>
              <button onClick={markSent} disabled={saving} className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[#0F6E56] rounded-md border border-[#0F6E56] hover:bg-[#0F6E56]/5 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Mark as sent
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Send it from your mail app / LinkedIn / the portal, then tap “Mark as sent” — Concourse logs it and schedules your follow-up in {profile.followup_days || 7} days.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
