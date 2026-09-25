import { useState, useEffect } from 'react';
import { Loader2, WifiOff } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { useProfile } from '@/hooks/useProfile';
import Sidebar, { type View } from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import ApplicationsList from '@/components/ApplicationsList';
import ApplicationForm from '@/components/ApplicationForm';
import ApplicationDetail from '@/components/ApplicationDetail';
import ColdEmailsView from '@/components/ColdEmailsView';
import OutreachComposer from '@/components/OutreachComposer';
import SettingsView from '@/components/SettingsView';
import type { Application, StatusHistory } from '@/types';

export default function App() {
  const data = useAppData();
  const { profile, save } = useProfile();
  const { applications, coldEmails, statusHistory, loading, error, refresh, upsertApplication, removeApplication, addColdEmail, removeColdEmail, addStatusHistory } = data;

  const [view, setView] = useState<View>('dashboard');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [composer, setComposer] = useState<{ app: Application | null } | null>(null);

  useEffect(() => {
    if (!selectedApp) return;
    const updated = applications.find((a) => a.id === selectedApp.id);
    if (!updated) setSelectedApp(null);
    else if (updated !== selectedApp) setSelectedApp(updated);
  }, [applications, selectedApp]);

  const openForm = (app: Application | null) => { setEditingApp(app); setShowForm(true); };
  const handleFormSaved = (application: Application, history?: StatusHistory) => {
    upsertApplication(application);
    if (history) addStatusHistory(history);
    setShowForm(false); setEditingApp(null); setSelectedApp(application);
  };
  const reach = (app: Application | null) => setComposer({ app });

  return (
    <div className="min-h-screen lg:flex bg-[#F1EFE8]">
      <Sidebar view={view} onView={setView} onNew={() => openForm(null)} counts={{ applications: applications.length, coldEmails: coldEmails.length }} />

      <main className="flex-1 min-w-0 lg:h-screen lg:overflow-y-auto pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pt-0 lg:pb-0">
        {error && (
          <div className="m-5 sm:m-8 mb-0 p-3 rounded-md bg-rose-50 text-rose-700 text-sm flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : (
          <>
            {view === 'dashboard' && (
              <Dashboard applications={applications} coldEmails={coldEmails} statusHistory={statusHistory}
                waitDays={Number(profile.followup_days) || 7} onSelect={setSelectedApp} onReach={reach} />
            )}
            {view === 'applications' && <ApplicationsList applications={applications} onSelect={setSelectedApp} onNew={() => openForm(null)} />}
            {view === 'cold_emails' && <ColdEmailsView coldEmails={coldEmails} applications={applications} onSelect={setSelectedApp} onCompose={() => reach(null)} />}
            {view === 'settings' && <SettingsView profile={profile} onSave={save} onDataChanged={refresh} />}
          </>
        )}
      </main>

      {selectedApp && !showForm && !composer && (
        <ApplicationDetail
          application={selectedApp} coldEmails={coldEmails} statusHistory={statusHistory}
          onClose={() => setSelectedApp(null)}
          onEdit={() => { setEditingApp(selectedApp); setSelectedApp(null); setShowForm(true); }}
          onReach={() => reach(selectedApp)}
          onRefresh={refresh}
          onApplicationUpdated={upsertApplication} onStatusHistoryAdded={addStatusHistory}
          onColdEmailAdded={addColdEmail} onColdEmailRemoved={removeColdEmail} onApplicationRemoved={removeApplication}
        />
      )}
      {showForm && <ApplicationForm application={editingApp} onClose={() => { setShowForm(false); setEditingApp(null); }} onSaved={handleFormSaved} />}
      {composer && (
        <OutreachComposer applications={applications} initialApp={composer.app} profile={profile}
          onClose={() => setComposer(null)}
          onLogged={(ce, app) => { addColdEmail(ce); if (app) upsertApplication(app); }} />
      )}
    </div>
  );
}
