import { useMemo } from 'react';
import { BellRing, CheckCircle2, Send } from 'lucide-react';
import type { Application, ColdEmail } from '@/types';
import { getFollowUps } from '@/lib/followups';
import ChannelIcon from '@/components/ChannelIcon';

interface Props {
  applications: Application[];
  coldEmails: ColdEmail[];
  waitDays: number;
  onSelect: (a: Application) => void;
  onReach: (a: Application) => void;
}

export default function FollowUps({ applications, coldEmails, waitDays, onSelect, onReach }: Props) {
  const items = useMemo(() => getFollowUps(applications, coldEmails, waitDays).slice(0, 6), [applications, coldEmails, waitDays]);

  return (
    <div className="bg-white rounded-lg p-5 mb-6" style={{ border: '1px solid #E8E5DC' }}>
      <div className="flex items-center gap-2 mb-3">
        <BellRing className="w-4 h-4 text-amber-600" />
        <h3 className="text-sm font-semibold text-slate-900">Follow up today</h3>
        {items.length > 0 && <span className="text-xs text-slate-400 tabular-nums">{items.length}</span>}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> All caught up — nothing needs a nudge.</p>
      ) : (
        <ul className="divide-y" style={{ borderColor: '#F4F2EC' }}>
          {items.map((it) => (
            <li key={it.key} className="flex items-center gap-3 py-2.5">
              <button onClick={() => onSelect(it.app)} className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-slate-900 truncate">{it.app.company} <span className="text-slate-400 font-normal">· {it.app.role}</span></p>
                <p className="text-xs text-amber-600 flex items-center gap-1">{it.channel && <ChannelIcon channel={it.channel} className="w-3 h-3" />} {it.why}</p>
              </button>
              <button onClick={() => onReach(it.app)} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0F6E56] rounded-md border border-[#0F6E56]/30 hover:bg-[#0F6E56]/5">
                <Send className="w-3.5 h-3.5" /> Nudge
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
