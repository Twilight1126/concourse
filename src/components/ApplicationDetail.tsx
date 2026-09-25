import { useState, useEffect, useCallback } from 'react';
import {
  X,
  ExternalLink,
  MapPin,
  DollarSign,
  Mail,
  Linkedin,
  Plus,
  Trash2,
  Loader2,
  Pencil,
  Send,
  Clock,
  CheckCircle2,
  Reply,
  FileText,
  History,
  Target,
} from 'lucide-react';
import { db } from '@/lib/db';
import { isoDay } from '@/lib/utils';
import ChannelIcon, { CHANNELS } from '@/components/ChannelIcon';
import type { Application, Note, ColdEmail, StatusHistory, AppStatus, AppSource } from '@/types';
import { STATUS_CONFIG, STATUS_OPTIONS, SOURCE_CONFIG } from '@/lib/constants';
import { cn, formatDate, formatRelative, daysSince } from '@/lib/utils';

interface ApplicationDetailProps {
  application: Application;
  coldEmails: ColdEmail[];
  statusHistory: StatusHistory[];
  onClose: () => void;
  onEdit: () => void;
  onReach: () => void;
  onRefresh: () => Promise<void>;
  onApplicationUpdated: (app: Application) => void;
  onStatusHistoryAdded: (entry: StatusHistory) => void;
  onColdEmailAdded: (email: ColdEmail) => void;
  onColdEmailRemoved: (id: string) => void;
  onApplicationRemoved: (id: string) => void;
}

export default function ApplicationDetail({
  application,
  coldEmails,
  statusHistory,
  onClose,
  onEdit,
  onReach,
  onApplicationUpdated,
  onStatusHistoryAdded,
  onColdEmailAdded,
  onColdEmailRemoved,
  onApplicationRemoved,
}: ApplicationDetailProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [noteBody, setNoteBody] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const [ceForm, setCeForm] = useState({
    channel: 'email' as 'email' | 'linkedin' | 'portal',
    sent_on: isoDay(),
    contact_name: application.contact_name ?? '',
    contact_role: application.contact_role ?? '',
    follow_up_count: '0',
    replied: false,
    replied_on: '',
    converted_to_interview: false,
  });

  const fetchNotes = useCallback(async () => {
    setNotesLoading(true);
    const { data } = await db
      .from('notes')
      .select('*')
      .eq('application_id', application.id)
      .order('created_at', { ascending: false });
    setNotes(data ?? []);
    setNotesLoading(false);
  }, [application.id]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const appColdEmails = coldEmails.filter((e) => e.application_id === application.id);
  const appHistory = statusHistory
    .filter((h) => h.application_id === application.id)
    .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());

  const updateApplicationStatus = async (newStatus: AppStatus, oldStatus: AppStatus, trigger: 'manual' | 'auto_ghosted' = 'manual') => {
    const today = isoDay();
    const { data: updated } = await db
      .from('applications')
      .update({ status: newStatus, last_activity_on: today })
      .eq('id', application.id)
      .select()
      .single();

    const { data: histData } = await db.from('status_history').insert({
      application_id: application.id,
      from_status: oldStatus,
      to_status: newStatus,
      trigger,
    }).select().single();

    if (updated) onApplicationUpdated(updated as Application);
    if (histData) onStatusHistoryAdded(histData as unknown as StatusHistory);
  };

  const handleStatusChange = async (newStatus: AppStatus) => {
    if (newStatus === application.status) return;
    setStatusLoading(true);
    await updateApplicationStatus(newStatus, application.status);
    setStatusLoading(false);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteBody.trim()) return;
    setNoteSaving(true);
    const { data } = await db
      .from('notes')
      .insert({ application_id: application.id, body: noteBody.trim() })
      .select()
      .single();
    if (data) setNotes((prev) => [data as Note, ...prev]);
    setNoteBody('');
    setNoteSaving(false);
  };

  const handleDeleteNote = async (id: string) => {
    await db.from('notes').delete().eq('id', id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleAddColdEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSaving(true);
    const { data } = await db
      .from('cold_emails')
      .insert({
        application_id: application.id,
        channel: ceForm.channel,
        sent_on: ceForm.sent_on,
        contact_name: ceForm.contact_name || null,
        contact_role: ceForm.contact_role || null,
        follow_up_count: parseInt(ceForm.follow_up_count) || 0,
        replied: ceForm.replied,
        replied_on: ceForm.replied ? ceForm.replied_on || null : null,
        converted_to_interview: ceForm.converted_to_interview,
      })
      .select()
      .single();

    if (data) {
      onColdEmailAdded(data as ColdEmail);
      setShowEmailForm(false);
      // If converted to interview, update application status
      if (ceForm.converted_to_interview && application.status !== 'interview') {
        await updateApplicationStatus('interview' as AppStatus, application.status);
      }
    }
    setEmailSaving(false);
  };

  const handleToggleConverted = async (ce: ColdEmail) => {
    setConvertingId(ce.id);
    const newValue = !ce.converted_to_interview;
    const { data } = await db
      .from('cold_emails')
      .update({ converted_to_interview: newValue })
      .eq('id', ce.id)
      .select()
      .single();

    if (data) {
      // Update local cold emails via parent
      onColdEmailRemoved(ce.id);
      onColdEmailAdded(data as ColdEmail);

      // If marking as converted and app isn't already in interview, sync status
      if (newValue && application.status !== 'interview') {
        await updateApplicationStatus('interview' as AppStatus, application.status);
      }
    }
    setConvertingId(null);
  };

  const handleDeleteColdEmail = async (id: string) => {
    await db.from('cold_emails').delete().eq('id', id);
    onColdEmailRemoved(id);
  };

  const handleDeleteApp = async () => {
    if (!confirm(`Delete application for ${application.company}? This cannot be undone.`)) return;
    await db.from('applications').delete().eq('id', application.id);
    onApplicationRemoved(application.id);
    onClose();
  };

  const inputClass = 'w-full px-3 py-2 text-sm rounded-md bg-[#F1EFE8] border border-transparent focus:border-[#0F6E56] focus:bg-white focus:outline-none transition-colors text-slate-900';
  const labelClass = 'block text-xs font-medium text-slate-500 mb-1';

  const days = daysSince(application.last_activity_on);
  const needsFollowup =
    application.status !== 'ghosted' &&
    application.status !== 'rejected' &&
    application.status !== 'withdrawn' &&
    application.status !== 'offer' &&
    days !== null &&
    days >= 7;

  return (
    <div className="fixed inset-0 z-40 flex justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.25)' }} onClick={onClose}>
      <div
        className="bg-white w-full max-w-xl lg:max-w-2xl h-full overflow-y-auto pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-5 sm:px-6 py-4 border-b" style={{ borderColor: '#E8E5DC' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-slate-900 truncate">{application.company}</h2>
                {application.job_url && (
                  <a href={application.job_url} target="_blank" rel="noreferrer" className="shrink-0">
                    <ExternalLink className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                  </a>
                )}
              </div>
              <p className="text-sm text-slate-500 truncate">{application.role}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-3">
              <button onClick={onReach} title="Reach out" className="p-1.5 rounded-md hover:bg-slate-100 transition-colors">
                <Send className="w-4 h-4 text-[#0F6E56]" />
              </button>
              <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-slate-100 transition-colors">
                <Pencil className="w-4 h-4 text-slate-400" />
              </button>
              <button onClick={handleDeleteApp} className="p-1.5 rounded-md hover:bg-rose-50 transition-colors">
                <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-500" />
              </button>
              <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <select
                value={application.status}
                onChange={(e) => handleStatusChange(e.target.value as AppStatus)}
                disabled={statusLoading}
                className={cn(
                  'appearance-none pl-7 pr-8 py-1.5 text-xs font-medium rounded-md border-0 cursor-pointer focus:outline-none',
                  STATUS_CONFIG[application.status].color
                )}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <span className={cn('w-2 h-2 rounded-full absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none', STATUS_CONFIG[application.status].dot)} />
            </div>
            {needsFollowup && (
              <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Follow-up due ({days}d)
              </span>
            )}
            {statusLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
          </div>
        </div>

        {/* Body — three visually separated sections */}
        <div className="px-5 sm:px-6 py-5 space-y-8">
          {/* Section 1: Application Details */}
          <Section icon={Target} title="Application Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <DetailItem icon={MapPin} label="Location" value={application.location} />
              <DetailItem icon={DollarSign} label="Salary" value={application.salary_range} />
              <DetailItem label="Source" value={application.source ? SOURCE_CONFIG[application.source as AppSource]?.label : null} />
              <DetailItem label="Resume Version" value={application.resume_version} />
              <DetailItem label="Applied On" value={formatDate(application.applied_on)} />
              <DetailItem label="Follow Up On" value={formatDate(application.follow_up_on)} />
              <DetailItem label="Last Activity" value={formatRelative(application.last_activity_on)} />
              <DetailItem label="Created" value={formatDate(application.created_at)} />
            </div>

            {(application.contact_name || application.contact_email || application.contact_linkedin) && (
              <div className="mt-5 pt-4 border-t" style={{ borderColor: '#F4F2EC' }}>
                <p className="text-xs font-medium text-slate-400 mb-2">Contact</p>
                <div className="space-y-1.5 text-sm">
                  {application.contact_name && (
                    <p className="text-slate-700">{application.contact_name}
                      {application.contact_role && <span className="text-slate-400 ml-2">· {application.contact_role}</span>}
                    </p>
                  )}
                  {application.contact_email && (
                    <a href={`mailto:${application.contact_email}`} className="flex items-center gap-2 text-slate-600 hover:text-[#0F6E56] transition-colors">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {application.contact_email}
                    </a>
                  )}
                  {application.contact_linkedin && (
                    <a href={application.contact_linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-slate-600 hover:text-[#0F6E56] transition-colors">
                      <Linkedin className="w-3.5 h-3.5 text-slate-400" />
                      LinkedIn Profile
                    </a>
                  )}
                </div>
              </div>
            )}
          </Section>

          {/* Section 2: Notes */}
          <Section icon={FileText} title="Notes">
            <form onSubmit={handleAddNote} className="mb-3">
              <textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder="Add a note..."
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-md bg-[#F1EFE8] border border-transparent focus:border-[#0F6E56] focus:bg-white focus:outline-none transition-colors text-slate-900 resize-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={!noteBody.trim() || noteSaving}
                  className="px-3 py-1.5 text-xs font-medium text-white rounded-md disabled:opacity-50 flex items-center gap-1.5"
                  style={{ backgroundColor: '#0F6E56' }}
                >
                  {noteSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Add Note
                </button>
              </div>
            </form>
            <div className="space-y-2">
              {notesLoading ? (
                <>
                  <SkeletonBlock h="h-14" />
                  <SkeletonBlock h="h-14" />
                </>
              ) : notes.length === 0 ? (
                <p className="text-xs text-slate-400">No notes yet.</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="group p-3 bg-[#F8F7F2] rounded-md">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-slate-700 flex-1">{note.body}</p>
                      <button onClick={() => handleDeleteNote(note.id)} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Trash2 className="w-3.5 h-3.5 text-slate-300 hover:text-rose-400" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">{formatRelative(note.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </Section>

          {/* Section 3: Cold Email + Status History */}
          <Section icon={Send} title="Outreach">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-400">
                {appColdEmails.length} message{appColdEmails.length !== 1 ? 's' : ''} logged
              </p>
              <button
                onClick={() => setShowEmailForm(!showEmailForm)}
                className="text-xs font-medium text-[#0F6E56] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Log outreach
              </button>
            </div>

            {showEmailForm && (
              <form onSubmit={handleAddColdEmail} className="mb-3 p-4 bg-[#F1EFE8] rounded-md space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Sent On</label>
                    <input type="date" value={ceForm.sent_on} onChange={(e) => setCeForm({ ...ceForm, sent_on: e.target.value })} className={inputClass} required />
                  </div>
                  <div>
                    <label className={labelClass}>Channel</label>
                    <select value={ceForm.channel} onChange={(e) => setCeForm({ ...ceForm, channel: e.target.value as 'email' | 'linkedin' | 'portal' })} className={inputClass}>
                      {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Follow-ups Sent</label>
                    <input type="number" min="0" value={ceForm.follow_up_count} onChange={(e) => setCeForm({ ...ceForm, follow_up_count: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Contact Name</label>
                    <input value={ceForm.contact_name} onChange={(e) => setCeForm({ ...ceForm, contact_name: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Contact Role</label>
                    <input value={ceForm.contact_role} onChange={(e) => setCeForm({ ...ceForm, contact_role: e.target.value })} className={inputClass} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" checked={ceForm.replied} onChange={(e) => setCeForm({ ...ceForm, replied: e.target.checked })} className="accent-[#0F6E56]" />
                    Replied
                  </label>
                  {ceForm.replied && (
                    <input type="date" value={ceForm.replied_on} onChange={(e) => setCeForm({ ...ceForm, replied_on: e.target.value })} className="px-2 py-1 text-xs rounded-md bg-white border" style={{ borderColor: '#E8E5DC' }} />
                  )}
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" checked={ceForm.converted_to_interview} onChange={(e) => setCeForm({ ...ceForm, converted_to_interview: e.target.checked })} className="accent-[#0F6E56]" />
                    Converted to Interview
                  </label>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowEmailForm(false)} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-md">Cancel</button>
                  <button type="submit" disabled={emailSaving} className="px-3 py-1.5 text-xs font-medium text-white rounded-md disabled:opacity-50 flex items-center gap-1.5" style={{ backgroundColor: '#0F6E56' }}>
                    {emailSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save
                  </button>
                </div>
              </form>
            )}

            {appColdEmails.length === 0 ? (
              <p className="text-xs text-slate-400">No outreach logged yet — tap the send icon above to write one.</p>
            ) : (
              <div className="space-y-2">
                {appColdEmails.map((ce) => (
                  <div key={ce.id} className="p-3 bg-[#F8F7F2] rounded-md group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-slate-300 shrink-0"><ChannelIcon channel={ce.channel} className="w-4 h-4" /></span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">
                            {ce.contact_name ?? 'Unknown'} {ce.contact_role && <span className="text-slate-400 font-normal">· {ce.contact_role}</span>}
                          </p>
                          <p className="text-xs text-slate-400">Sent {formatDate(ce.sent_on)} · {ce.follow_up_count} follow-up{ce.follow_up_count !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteColdEmail(ce.id)} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Trash2 className="w-3.5 h-3.5 text-slate-300 hover:text-rose-400" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {ce.replied ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <Reply className="w-3.5 h-3.5" /> Replied {ce.replied_on ? formatDate(ce.replied_on) : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">No reply</span>
                      )}
                      <button
                        onClick={() => handleToggleConverted(ce)}
                        disabled={convertingId === ce.id}
                        className={cn(
                          'flex items-center gap-1 text-xs font-medium transition-opacity',
                          ce.converted_to_interview ? 'text-[#0F6E56]' : 'text-slate-400 hover:text-[#0F6E56]'
                        )}
                      >
                        {convertingId === ce.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        {ce.converted_to_interview ? 'Converted to Interview' : 'Mark as Converted'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Status History — nested under section 3 */}
            <div className="mt-6 pt-5 border-t" style={{ borderColor: '#F4F2EC' }}>
              <div className="flex items-center gap-2 mb-1">
                <History className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900">Status History</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4">Every status change is logged here, including auto-ghosting.</p>
              <div className="space-y-2">
                {appHistory.length === 0 ? (
                  <p className="text-xs text-slate-400">No status changes recorded yet.</p>
                ) : (
                  appHistory.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-2 text-xs flex-wrap">
                      <div className="flex items-center gap-1.5">
                        {entry.from_status && (
                          <>
                            <span className={cn('px-1.5 py-0.5 rounded font-medium', STATUS_CONFIG[entry.from_status].color)}>
                              {STATUS_CONFIG[entry.from_status].label}
                            </span>
                            <span className="text-slate-300">→</span>
                          </>
                        )}
                        <span className={cn('px-1.5 py-0.5 rounded font-medium', STATUS_CONFIG[entry.to_status].color)}>
                          {STATUS_CONFIG[entry.to_status].label}
                        </span>
                      </div>
                      {entry.trigger === 'auto_ghosted' && (
                        <span className="text-xs text-stone-400 italic">auto-ghosted</span>
                      )}
                      <span className="text-slate-300 ml-auto">{formatRelative(entry.changed_at)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Target; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-[#0F6E56]" />
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon?: typeof MapPin; label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </p>
      <p className="text-sm text-slate-700">{value ?? '—'}</p>
    </div>
  );
}

function SkeletonBlock({ h }: { h: string }) {
  return (
    <div className={`${h} bg-slate-100 rounded-md animate-pulse`} />
  );
}
