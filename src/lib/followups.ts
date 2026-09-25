import type { Application, ColdEmail } from '@/types';
import { daysSince, isoDay } from '@/lib/utils';

export interface FollowUpItem { key: string; app: Application; why: string; channel?: ColdEmail['channel'] }

/** Single source of truth for "who should I nudge today" (dashboard stat + widget). */
export function getFollowUps(applications: Application[], coldEmails: ColdEmail[], waitDays: number): FollowUpItem[] {
  const today = isoDay();
  const byId = new Map(applications.map((a) => [a.id, a]));
  const out: FollowUpItem[] = [];
  const seen = new Set<string>();
  for (const ce of coldEmails) {
    const app = byId.get(ce.application_id);
    const d = daysSince(ce.sent_on);
    if (!app || seen.has(app.id) || ce.replied || d === null || d < waitDays) continue;
    if (['rejected', 'withdrawn', 'ghosted', 'offer'].includes(app.status)) continue;
    seen.add(app.id);
    out.push({ key: ce.id, app, why: `No reply for ${d}d`, channel: ce.channel });
  }
  for (const app of applications) {
    if (seen.has(app.id) || !['applied', 'screening', 'interview'].includes(app.status)) continue;
    if (app.follow_up_on && app.follow_up_on <= today) {
      out.push({ key: app.id, app, why: `Follow-up was due ${app.follow_up_on === today ? 'today' : `${daysSince(app.follow_up_on)}d ago`}` });
    }
  }
  return out;
}
