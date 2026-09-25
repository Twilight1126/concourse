import { useCallback, useEffect, useState } from 'react';
import { db } from '@/lib/db';
import type { Application, ColdEmail, StatusHistory, AppStatus } from '@/types';

export interface AppData {
  applications: Application[];
  coldEmails: ColdEmail[];
  statusHistory: StatusHistory[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  upsertApplication: (application: Application) => void;
  removeApplication: (id: string) => void;
  addColdEmail: (email: ColdEmail) => void;
  removeColdEmail: (id: string) => void;
  addStatusHistory: (entry: StatusHistory) => void;
}

export function useAppData(): AppData {
  const [applications, setApplications] = useState<Application[]>([]);
  const [coldEmails, setColdEmails] = useState<ColdEmail[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    // Auto-ghost: still "applied" with no activity for 14+ days
    const { data: applied } = await db.from('applications').select().eq('status', 'applied' as AppStatus);
    for (const row of (applied ?? []) as Application[]) {
      if (!row.last_activity_on) continue;
      const days = Math.floor((Date.now() - new Date(row.last_activity_on).getTime()) / 864e5);
      if (days < 14) continue;
      await db.from('applications').update({ status: 'ghosted' }).eq('id', row.id);
      await db.from('status_history').insert({ application_id: row.id, from_status: 'applied', to_status: 'ghosted', trigger: 'auto_ghosted' });
    }

    const [a, c, h] = await Promise.all([
      db.from('applications').select().order('created_at', { ascending: false }),
      db.from('cold_emails').select().order('sent_on', { ascending: false }),
      db.from('status_history').select().order('changed_at', { ascending: false }),
    ]);
    setError(a.error?.message ?? null);
    setApplications(a.data ?? []);
    setColdEmails(c.data ?? []);
    setStatusHistory(h.data ?? []);
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => { setLoading(true); await fetchAll(); }, [fetchAll]);

  const upsertApplication = useCallback((application: Application) => {
    setApplications((cur) =>
      cur.some((i) => i.id === application.id)
        ? cur.map((i) => (i.id === application.id ? application : i))
        : [application, ...cur]
    );
  }, []);
  const removeApplication = useCallback((id: string) => {
    setApplications((c) => c.filter((i) => i.id !== id));
    setColdEmails((c) => c.filter((i) => i.application_id !== id));
    setStatusHistory((c) => c.filter((i) => i.application_id !== id));
  }, []);
  const addColdEmail = useCallback((e: ColdEmail) => setColdEmails((c) => [e, ...c.filter((x) => x.id !== e.id)]), []);
  const removeColdEmail = useCallback((id: string) => setColdEmails((c) => c.filter((i) => i.id !== id)), []);
  const addStatusHistory = useCallback((e: StatusHistory) => setStatusHistory((c) => [e, ...c]), []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  // Pick up rows the browser extension added while this tab was open
  useEffect(() => {
    const onFocus = () => fetchAll();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchAll]);

  return { applications, coldEmails, statusHistory, loading, error, refresh, upsertApplication, removeApplication, addColdEmail, removeColdEmail, addStatusHistory };
}
