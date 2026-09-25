import { useMemo, useState } from 'react';
import { Plus, Search, ExternalLink, ChevronRight, ChevronLeft } from 'lucide-react';
import type { Application, AppStatus, AppSource } from '@/types';
import { STATUS_CONFIG, STATUS_OPTIONS, SOURCE_OPTIONS, SOURCE_CONFIG } from '@/lib/constants';
import { cn, formatRelative, daysSince } from '@/lib/utils';

const PAGE_SIZE = 20;

interface ApplicationsListProps {
  applications: Application[];
  onSelect: (app: Application) => void;
  onNew: () => void;
}

export default function ApplicationsList({ applications, onSelect, onNew }: ApplicationsListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppStatus | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<AppSource | 'all'>('all');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      if (statusFilter !== 'all' && app.status !== statusFilter) return false;
      if (sourceFilter !== 'all' && app.source !== sourceFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          app.company.toLowerCase().includes(q) ||
          app.role.toLowerCase().includes(q) ||
          (app.contact_name?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [applications, search, statusFilter, sourceFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  const resetPage = () => setPage(0);

  return (
    <div className="p-5 sm:p-8 w-full">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Applications</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length} of {applications.length} shown
          </p>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white rounded-md transition-colors hover:opacity-90"
          style={{ backgroundColor: '#0F6E56' }}
        >
          <Plus className="w-4 h-4" />
          New Application
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            placeholder="Search company, role, contact..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-white border focus:outline-none transition-colors text-slate-900"
            style={{ borderColor: '#E8E5DC' }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as AppStatus | 'all'); resetPage(); }}
          className="px-3 py-2 text-sm rounded-md bg-white border focus:outline-none text-slate-600"
          style={{ borderColor: '#E8E5DC' }}
        >
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => { setSourceFilter(e.target.value as AppSource | 'all'); resetPage(); }}
          className="px-3 py-2 text-sm rounded-md bg-white border focus:outline-none text-slate-600"
          style={{ borderColor: '#E8E5DC' }}
        >
          <option value="all">All sources</option>
          {SOURCE_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #E8E5DC' }}>
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-slate-400 mb-4">
              {applications.length === 0
                ? 'No applications yet. Create your first one.'
                : 'No results match your filters.'}
            </p>
            {applications.length === 0 && (
              <button
                onClick={onNew}
                className="text-sm font-medium text-[#0F6E56] hover:underline"
              >
                + New Application
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: '#E8E5DC' }}>
                    <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">Company</th>
                    <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">Role</th>
                    <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-slate-400 px-4 py-3 hidden sm:table-cell">Source</th>
                    <th className="text-left text-xs font-medium text-slate-400 px-4 py-3 hidden md:table-cell">Activity</th>
                    <th className="text-left text-xs font-medium text-slate-400 px-4 py-3 hidden lg:table-cell">Contact</th>
                    <th className="w-8 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((app) => {
                    const days = daysSince(app.last_activity_on);
                    const needsFollowup =
                      app.status !== 'ghosted' &&
                      app.status !== 'rejected' &&
                      app.status !== 'withdrawn' &&
                      app.status !== 'offer' &&
                      days !== null &&
                      days >= 7;

                    return (
                      <tr
                        key={app.id}
                        onClick={() => onSelect(app)}
                        className="border-b last:border-0 cursor-pointer hover:bg-slate-50 transition-colors group"
                        style={{ borderColor: '#F4F2EC' }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900">{app.company}</span>
                            {app.job_url && (
                              <a
                                href={app.job_url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{app.role}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium',
                              STATUS_CONFIG[app.status].color
                            )}
                          >
                            <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_CONFIG[app.status].dot)} />
                            {STATUS_CONFIG[app.status].label}
                          </span>
                          {needsFollowup && (
                            <span className="ml-2 text-xs text-amber-600 font-medium hidden sm:inline">
                              · follow-up due
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 hidden sm:table-cell">
                          {app.source ? SOURCE_CONFIG[app.source as AppSource]?.label : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">
                          {formatRelative(app.last_activity_on)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell">
                          {app.contact_name ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: '#E8E5DC' }}>
                <p className="text-xs text-slate-400">
                  Page {currentPage + 1} of {totalPages} · {filtered.length} total
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-500" />
                  </button>
                  <span className="text-xs font-medium text-slate-600 tabular-nums px-2">
                    {currentPage + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage === totalPages - 1}
                    className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
