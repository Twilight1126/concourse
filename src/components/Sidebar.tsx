import { LayoutDashboard, Briefcase, Send, Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export type View = 'dashboard' | 'applications' | 'cold_emails' | 'settings';

interface SidebarProps {
  view: View;
  onView: (v: View) => void;
  onNew: () => void;
  counts: { applications: number; coldEmails: number };
}

const NAV: { key: View; label: string; icon: typeof Send }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'applications', label: 'Applications', icon: Briefcase },
  { key: 'cold_emails', label: 'Outreach', icon: Send },
  { key: 'settings', label: 'Settings', icon: Settings },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: '#0F6E56' }}>
        <Briefcase className="w-4 h-4 text-white" strokeWidth={2.5} />
      </div>
      <span className="font-bold text-slate-900 text-[15px] tracking-tight">Concourse</span>
    </div>
  );
}

export default function Sidebar({ view, onView, onNew, counts }: SidebarProps) {
  const badge = (k: View) => (k === 'applications' ? counts.applications : k === 'cold_emails' ? counts.coldEmails : 0);

  return (
    <>
      {/* Desktop / tablet-landscape: side rail */}
      <aside className="hidden lg:flex w-60 shrink-0 h-screen bg-white flex-col" style={{ borderRight: '1px solid #E8E5DC' }}>
        <div className="px-5 py-5"><Logo /></div>
        <div className="px-3 pb-3">
          <button onClick={onNew} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-white rounded-md hover:opacity-90" style={{ backgroundColor: '#0F6E56' }}>
            <Plus className="w-4 h-4" /> New application
          </button>
        </div>
        <nav className="flex-1 px-3 py-1 space-y-0.5">
          {NAV.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => onView(key)}
              className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                view === key ? 'bg-[#F1EFE8] text-slate-900' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50')}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {badge(key) > 0 && <span className="text-xs text-slate-400 font-normal tabular-nums">{badge(key)}</span>}
            </button>
          ))}
        </nav>
        <p className="px-6 py-4 text-xs text-slate-400">Local · private · free</p>
      </aside>

      {/* Mobile / tablet-portrait: top bar + bottom tabs */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 px-4 flex items-center justify-between bg-white/95 backdrop-blur pt-[env(safe-area-inset-top)] box-content" style={{ borderBottom: '1px solid #E8E5DC' }}>
        <Logo />
        <button onClick={onNew} aria-label="New application" className="w-9 h-9 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: '#0F6E56' }}>
          <Plus className="w-5 h-5" />
        </button>
      </header>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur grid grid-cols-4 pb-[env(safe-area-inset-bottom)]" style={{ borderTop: '1px solid #E8E5DC' }}>
        {NAV.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => onView(key)} className={cn('flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium', view === key ? 'text-[#0F6E56]' : 'text-slate-400')}>
            <Icon className="w-5 h-5" strokeWidth={view === key ? 2.4 : 1.8} />
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}
