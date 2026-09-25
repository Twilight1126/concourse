// Heuristic parser: paste a job posting (LinkedIn / Naukri / careers page text) → form fields.
export interface ParsedJob { company?: string; role?: string; location?: string; salary_range?: string; job_url?: string }

const ROLE_RE = /(engineer|developer|sde|programmer|architect|analyst|designer|manager|lead|intern|scientist|consultant)/i;
const CITY_RE = /(Bengaluru|Bangalore|Hyderabad|Pune|Mumbai|Delhi|Gurugram|Gurgaon|Noida|Chennai|Kolkata|Remote|Hybrid)/i;

export function parseJob(text: string): ParsedJob {
  const out: ParsedJob = {};
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  out.job_url = text.match(/https?:\/\/[^\s)>"']+/)?.[0]?.replace(/[.,;]+$/, '');

  // "Role at Company", "Role - Company", "Role | Company"
  const head = lines.slice(0, 6);
  for (const l of head) {
    const m = l.match(/^(.{4,80}?)\s+(?:at|@|[-–|])\s+([A-Z][^|\-–·\n]{1,50})$/);
    if (m && ROLE_RE.test(m[1])) { out.role = m[1].trim(); out.company = m[2].trim(); break; }
  }
  out.role ??= head.find((l) => ROLE_RE.test(l) && l.length <= 90);
  // LinkedIn style "Company · Location"
  for (const l of head) {
    const m = l.match(/^([^·•|]{2,50})\s[·•|]\s(.{2,60})$/);
    if (m && !ROLE_RE.test(m[1])) { out.company ??= m[1].trim(); out.location ??= m[2].replace(/\(.*?\)/g, '').trim(); break; }
  }
  out.company ??= text.match(/Company\s*[:\-]\s*(.+)/i)?.[1]?.trim();
  out.location ??= text.match(/Location\s*[:\-]\s*(.+)/i)?.[1]?.trim() ?? text.match(CITY_RE)?.[0];
  out.salary_range =
    text.match(/(?:₹|INR|Rs\.?)\s?[\d.,]+\s?(?:[-–]|to)\s?(?:₹|INR|Rs\.?)?\s?[\d.,]+\s?(?:LPA|L|lakhs?|k)?/i)?.[0] ??
    text.match(/[\d.]+\s?(?:[-–]|to)\s?[\d.]+\s?(?:LPA|lakhs?)/i)?.[0] ??
    text.match(/\$\s?[\d,]+k?\s?(?:[-–]|to)\s?\$?\s?[\d,]+k?/i)?.[0];

  for (const k of Object.keys(out) as (keyof ParsedJob)[]) if (!out[k]) delete out[k];
  return out;
}
