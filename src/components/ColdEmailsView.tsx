import { useMemo, useState } from 'react';
import { Send, Reply, CheckCircle2, Clock, Search, ChevronRight, Plus } from 'lucide-react';
import ChannelIcon from '@/components/ChannelIcon';
import type { Application, ColdEmail } from '@/types';
import { cn, formatDate, daysSince } from '@/lib/utils';

interface ColdEmailsViewProps {
  coldEmails: ColdEmail[];
  applications: Application[];
  onSelect: (app: Application) => void;
  onCompose: () => void;
}

export default function ColdEmailsView({ coldEmails, applications, onSelect, onCompose }: ColdEmailsViewProps) {
  const [filter, setFilter] = useState<'all' | 'replied' | 'unreplied' | 'converted'>('all');
  const [search, setSearch] = useState('');

  const appById = useMemo(() => {
    const map: Record<string, Application> = {};
    for (const app of applications) map[app.id] = app;
    return map;
  }, [applications]);

  const filtered = useMemo(() => {
    return coldEmails.filter((ce) => {
      if (filter === 'replied' && !ce.replied) return false;
      if (filter === 'unreplied' && ce.replied) return false;
      if (filter === 'converted' && !ce.converted_to_interview) return false;
      if (search) {
        const q = search.toLowerCase();
        const app = appById[ce.application_id];
        return (
          ce.contact_name?.toLowerCase().includes(q) ||
          ce.contact_role?.toLowerCase().includes(q) ||
          app?.company.toLowerCase().includes(q) ||
          app?.role.toLowerCase().includes(q) ||
          false
        );
      }
      return true;
    });
  }, [coldEmails, filter, search, appById]);

  const stats = useMemo(() => {
    const total = coldEmails.length;
    const replied = coldEmails.filter((e) => e.replied).length;
    const converted = coldEmails.filter((e) => e.converted_to_interview).length;
    const unreplied = coldEmails.filter((e) => !e.replied);
    const overdue = unreplied.filter((e) => {
      const days = daysSince(e.sent_on);
      return days !== null && days >= 14;
    });
    return { total, replied, converted, overdue: overdue.length };
  }, [coldEmails]);

  const filterTabs = [
    { key: 'all' as const, label: 'All', count: stats.total },
    { key: 'unreplied' as const, label: 'Unreplied', count: coldEmails.filter((e) => !e.replied).length },
    { key: 'replied' as const, label: 'Replied', count: stats.replied },
    { key: 'converted' as const, label: 'Converted', count: stats.converted },
  ];

  return (
    <div className="p-5 sm:p-8 w-full">
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Outreach</h1>
          <p className="text-sm text-slate-500 mt-0.5">Cold emails, LinkedIn notes and portal messages</p>
        </div>
        <button onClick={onCompose} className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white rounded-md hover:opacity-90" style={{ backgroundColor: '#0F6E56' }}>
          <Plus className="w-4 h-4" /> New outreach
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard label="Total Sent" value={stats.total} icon={Send} color="#0F6E56" />
        <StatCard label="Replied" value={stats.replied} icon={Reply} color="#0891B2" />
        <StatCard label="Converted" value={stats.converted} icon={CheckCircle2} color="#059669" />
        <StatCard label="Overdue (14d+)" value={stats.overdue} icon={Clock} color="#D97706" />
      </div>

      {/* Filter tabs + search */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1 bg-white rounded-md p-1 overflow-x-auto max-w-full" style={{ border: '1px solid #E8E5DC' }}>
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded transition-colors',
                filter === tab.key ? 'bg-[#F1EFE8] text-slate-900' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {tab.label} <span className="text-slate-400 ml-1">{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-white border focus:outline-none text-slate-900"
            style={{ borderColor: '#E8E5DC' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #E8E5DC' }}>
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-400">
              {coldEmails.length === 0
                ? 'No outreach yet. Tap “New outreach” to write and log your first message.'
                : 'No results match your filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full min-w-[520px]">
            <thead>
              <tr className="border-b" style={{ borderColor: '#E8E5DC' }}>
                <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">Company</th>
                <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">Contact</th>
                <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">Sent</th>
                <th className="text-left text-xs font-medium text-slate-400 px-4 py-3 hidden md:table-cell">Follow-ups</th>
                <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">Status</th>
                <th className="w-8 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ce) => {
                const app = appById[ce.application_id];
                const days = daysSince(ce.sent_on);
                const isOverdue = !ce.replied && days !== null && days >= 14;

                return (
                  <tr
                    key={ce.id}
                    onClick={() => app && onSelect(app)}
                    className="border-b last:border-0 cursor-pointer hover:bg-slate-50 transition-colors group"
                    style={{ borderColor: '#F4F2EC' }}
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-slate-900">{app?.company ?? 'Unknown'}</span>
                      <span className="text-xs text-slate-400 ml-2">{app?.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-sm text-slate-700"><span className="text-slate-400"><ChannelIcon channel={ce.channel} /></span>{ce.contact_name ?? '—'}</span>
                      {ce.contact_role && <span className="text-xs text-slate-400 ml-1.5">· {ce.contact_role}</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(ce.sent_on)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 tabular-nums hidden md:table-cell">{ce.follow_up_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {ce.replied ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                            <Reply className="w-3.5 h-3.5" /> Replied
                          </span>
                        ) : isOverdue ? (
                          <span className="flex items-center gap-1 text-xs text-rose-600 font-medium">
                            <Clock className="w-3.5 h-3.5" /> {days}d no reply
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {days !== null ? `${days}d waiting` : '—'}
                          </span>
                        )}
                        {ce.converted_to_interview && (
                          <span className="flex items-center gap-1 text-xs text-[#0F6E56] font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Interview
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof Send; color: string }) {
  return (
    <div className="bg-white rounded-lg p-5" style={{ border: '1px solid #E8E5DC' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
    </div>
  );
}
