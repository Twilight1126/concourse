import { useMemo } from 'react';
import {
  TrendingUp,
  Clock,
  Ghost,
  Activity,
  ArrowRight,
  Target,
  Send,
  Reply,
  CheckCircle2,
} from 'lucide-react';
import type { Application, ColdEmail, StatusHistory, AppStatus, AppSource } from '@/types';
import { STATUS_CONFIG, STATUS_ORDER, SOURCE_CONFIG } from '@/lib/constants';
import { daysSince, formatRelative, cn } from '@/lib/utils';
import FollowUps from '@/components/FollowUps';
import { getFollowUps } from '@/lib/followups';

interface DashboardProps {
  applications: Application[];
  coldEmails: ColdEmail[];
  statusHistory: StatusHistory[];
  waitDays: number;
  onSelect: (a: Application) => void;
  onReach: (a: Application) => void;
}

export default function Dashboard({ applications, coldEmails, statusHistory, waitDays, onSelect, onReach }: DashboardProps) {
  const metrics = useMemo(() => {
    const total = applications.length;
    const byStatus: Record<string, number> = {};
    for (const app of applications) {
      byStatus[app.status] = (byStatus[app.status] ?? 0) + 1;
    }

    const activeStatuses: AppStatus[] = ['applied', 'screening', 'interview', 'offer'];
    const active = activeStatuses.reduce((sum, s) => sum + (byStatus[s] ?? 0), 0);

    const ceTotal = coldEmails.length;
    const ceReplied = coldEmails.filter((e) => e.replied).length;
    const ceConverted = coldEmails.filter((e) => e.converted_to_interview).length;
    const responseRate = ceTotal > 0 ? Math.round((ceReplied / ceTotal) * 100) : 0;
    const conversionRate = ceTotal > 0 ? Math.round((ceConverted / ceTotal) * 100) : 0;

    const bySource: Record<string, { total: number; replied: number }> = {};
    for (const app of applications) {
      const src = app.source ?? 'other';
      if (!bySource[src]) bySource[src] = { total: 0, replied: 0 };
      bySource[src].total++;
      const appEmails = coldEmails.filter((e) => e.application_id === app.id);
      if (appEmails.some((e) => e.replied)) bySource[src].replied++;
    }

    const followUpsDue = applications.filter((app) => {
      if (['ghosted', 'rejected', 'withdrawn', 'offer'].includes(app.status)) return false;
      const days = daysSince(app.last_activity_on);
      return days !== null && days >= 7;
    });

    const ghosted = applications.filter((a) => a.status === 'ghosted');

    const roleFunnel: Record<string, { sent: number; replied: number; interview: number }> = {};
    for (const ce of coldEmails) {
      const role = ce.contact_role || 'Unknown';
      if (!roleFunnel[role]) roleFunnel[role] = { sent: 0, replied: 0, interview: 0 };
      roleFunnel[role].sent++;
      if (ce.replied) roleFunnel[role].replied++;
      if (ce.converted_to_interview) roleFunnel[role].interview++;
    }

    const recent = statusHistory.slice(0, 8);

    return {
      total,
      active,
      byStatus,
      responseRate,
      conversionRate,
      ceTotal,
      ceReplied,
      ceConverted,
      bySource,
      followUpsDue,
      ghosted,
      roleFunnel,
      recent,
    };
  }, [applications, coldEmails, statusHistory]);

  const dueCount = useMemo(() => getFollowUps(applications, coldEmails, waitDays).length, [applications, coldEmails, waitDays]);

  const secondaryStats = [
    { label: 'Cold Email Response', value: `${metrics.responseRate}%`, sub: `${metrics.ceReplied}/${metrics.ceTotal} replied`, color: '#0891B2' },
    { label: 'Follow-ups Due', value: dueCount, sub: dueCount > 0 ? 'Needs attention' : 'All caught up', color: '#D97706' },
    { label: 'Ghosted', value: metrics.ghosted.length, sub: metrics.ghosted.length > 0 ? 'Auto-detected' : 'None', color: '#78716C' },
    { label: 'Interview Conversion', value: `${metrics.conversionRate}%`, sub: `${metrics.ceConverted}/${metrics.ceTotal} converted`, color: '#059669' },
  ];

  return (
    <div className="p-5 sm:p-8 w-full">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Your job search command center</p>
      </div>

      {/* Hero number + secondary stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {/* Dominant metric */}
        <div className="lg:col-span-1 bg-white rounded-lg p-6 flex flex-col justify-between" style={{ border: '1px solid #E8E5DC' }}>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-[#0F6E56]" />
            <span className="text-xs font-medium text-slate-500">Active Applications</span>
          </div>
          <div>
            <p className="text-5xl font-bold text-slate-900 tabular-nums tracking-tight">{metrics.active}</p>
            <p className="text-sm text-slate-400 mt-2">
              {metrics.total} total tracked · across {Object.keys(metrics.byStatus).length} stages
            </p>
          </div>
        </div>

        {/* Secondary stats — 2x2 grid */}
        <div className="lg:col-span-2 grid grid-cols-2 xl:grid-cols-4 gap-4">
          {secondaryStats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-lg p-4 flex flex-col justify-between" style={{ border: '1px solid #E8E5DC' }}>
              <span className="text-xs font-medium text-slate-500">{stat.label}</span>
              <div className="mt-2">
                <p className="text-2xl font-bold text-slate-900 tabular-nums" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <FollowUps applications={applications} coldEmails={coldEmails} waitDays={waitDays} onSelect={onSelect} onReach={onReach} />

      {/* Pipeline + Channel breakdown — distinct sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pipeline */}
        <div className="bg-white rounded-lg p-5" style={{ border: '1px solid #E8E5DC' }}>
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Pipeline by Stage</h2>
          <div className="space-y-2.5">
            {STATUS_ORDER.map((status: AppStatus) => {
              const count = metrics.byStatus[status] ?? 0;
              const max = Math.max(...Object.values(metrics.byStatus), 1);
              const pct = (count / max) * 100;
              const config = STATUS_CONFIG[status];
              return (
                <div key={status} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-24 sm:w-28 shrink-0">
                    <span className={cn('w-2 h-2 rounded-full', config.dot)} />
                    <span className="text-xs font-medium text-slate-600">{config.label}</span>
                  </div>
                  <div className="flex-1 h-5 bg-[#F1EFE8] rounded overflow-hidden">
                    <div
                      className={cn('h-full rounded transition-all', config.dot)}
                      style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%`, opacity: 0.85 }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 tabular-nums w-5 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Channel breakdown */}
        <div className="bg-white rounded-lg p-5" style={{ border: '1px solid #E8E5DC' }}>
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Response Rate by Source</h2>
          <div className="space-y-3">
            {Object.entries(metrics.bySource).length === 0 && (
              <p className="text-xs text-slate-400">No data yet</p>
            )}
            {Object.entries(metrics.bySource).map(([src, data]) => {
              const rate = data.total > 0 ? Math.round((data.replied / data.total) * 100) : 0;
              const label = SOURCE_CONFIG[src as AppSource]?.label ?? src;
              return (
                <div key={src} className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-600 shrink-0">{label}</span>
                  <div className="flex items-center gap-3 flex-1 justify-end">
                    <div className="w-20 sm:w-28 h-1.5 bg-[#F1EFE8] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${rate}%`, backgroundColor: '#0F6E56' }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 tabular-nums w-14 text-right shrink-0">
                      {data.replied}/{data.total}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Outreach funnel — full width distinct section */}
      <div className="bg-white rounded-lg p-5 mb-6" style={{ border: '1px solid #E8E5DC' }}>
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Cold Outreach Funnel</h2>
        {Object.keys(metrics.roleFunnel).length === 0 ? (
          <p className="text-xs text-slate-400">No cold emails logged yet</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(metrics.roleFunnel).map(([role, data]) => {
              const replyPct = data.sent > 0 ? (data.replied / data.sent) * 100 : 0;
              const convPct = data.sent > 0 ? (data.interview / data.sent) * 100 : 0;
              return (
                <div key={role}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-700">{role}</span>
                    <span className="text-xs text-slate-400 tabular-nums">{data.sent} sent</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white px-2.5 py-1.5 rounded tabular-nums shrink-0" style={{ backgroundColor: '#0F6E56', minWidth: '2.5rem', textAlign: 'center' }}>
                      {data.sent}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />
                    <span className="text-xs font-semibold px-2.5 py-1.5 rounded tabular-nums shrink-0" style={{ backgroundColor: '#E0F2FE', color: '#0369A1', minWidth: '2.5rem', textAlign: 'center' }}>
                      {data.replied}
                    </span>
                    <span className="text-xs text-slate-400 tabular-nums shrink-0">{Math.round(replyPct)}%</span>
                    <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />
                    <span className="text-xs font-semibold px-2.5 py-1.5 rounded tabular-nums shrink-0" style={{ backgroundColor: '#FEF3C7', color: '#92400E', minWidth: '2.5rem', textAlign: 'center' }}>
                      {data.interview}
                    </span>
                    <span className="text-xs text-slate-400 tabular-nums shrink-0">{Math.round(convPct)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent activity + Follow-ups + Ghosted */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg p-5" style={{ border: '1px solid #E8E5DC' }}>
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Recent Activity</h2>
          <div className="space-y-2.5">
            {metrics.recent.length === 0 && (
              <p className="text-xs text-slate-400">No activity yet</p>
            )}
            {metrics.recent.slice(0, 6).map((entry) => {
              const app = applications.find((a) => a.id === entry.application_id);
              if (!app) return null;
              const fromLabel = entry.from_status ? STATUS_CONFIG[entry.from_status].label : 'New';
              const toLabel = STATUS_CONFIG[entry.to_status].label;
              return (
                <div key={entry.id} className="flex items-center gap-1.5 text-xs flex-wrap">
                  <Activity className="w-3 h-3 text-slate-300 shrink-0" />
                  <span className="font-medium text-slate-700 truncate">{app.company}</span>
                  <span className="text-slate-400 hidden sm:inline">{fromLabel}</span>
                  <span className="text-slate-300 hidden sm:inline">→</span>
                  <span className={cn('px-1.5 py-0.5 rounded font-medium', STATUS_CONFIG[entry.to_status].color)}>
                    {toLabel}
                  </span>
                  <span className="text-slate-300 ml-auto shrink-0">{formatRelative(entry.changed_at)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg p-5" style={{ border: '1px solid #E8E5DC' }}>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-slate-900">Follow-ups Due</h2>
          </div>
          <div className="space-y-2">
            {metrics.followUpsDue.length === 0 && (
              <p className="text-xs text-slate-400">No follow-ups due. You're on top of it.</p>
            )}
            {metrics.followUpsDue.slice(0, 6).map((app) => {
              const d = daysSince(app.last_activity_on);
              return (
                <div key={app.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-slate-800">{app.company}</span>
                    <span className="text-xs text-slate-400 ml-1.5 hidden sm:inline">{app.role}</span>
                  </div>
                  <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded shrink-0', d !== null && d >= 14 ? 'text-rose-600 bg-rose-50' : 'text-amber-600 bg-amber-50')}>
                    {d}d
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg p-5" style={{ border: '1px solid #E8E5DC' }}>
          <div className="flex items-center gap-2 mb-4">
            <Ghost className="w-4 h-4 text-stone-500" />
            <h2 className="text-sm font-semibold text-slate-900">Ghosted</h2>
          </div>
          <div className="space-y-2">
            {metrics.ghosted.length === 0 && (
              <p className="text-xs text-slate-400">Nothing ghosted. Keep it up.</p>
            )}
            {metrics.ghosted.slice(0, 6).map((app) => (
              <div key={app.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-slate-50 transition-colors">
                <div className="min-w-0">
                  <span className="text-xs font-medium text-slate-800">{app.company}</span>
                </div>
                <span className="text-xs text-stone-500 shrink-0">{formatRelative(app.last_activity_on)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
