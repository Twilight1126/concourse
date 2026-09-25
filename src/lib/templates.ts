import type { Application, Channel, Profile } from '@/types';

export const linkedinSearchUrl = (company: string) =>
  `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(company + ' recruiter OR engineering manager')}`;

export function buildMessage(channel: Channel, app: Application, p: Profile, contact: string) {
  const first = contact.trim().split(/\s+/)[0] || 'there';
  const name = p.full_name || 'Your Name';
  const headline = p.headline || 'software developer';
  const skills = p.skills ? ` (${p.skills})` : '';
  const resume = p.resume_link ? `\nResume: ${p.resume_link}\n` : '\n';

  if (channel === 'linkedin') {
    const note = `Hi ${first}, I'm ${name}, a ${headline}${skills}. I saw the ${app.role} role at ${app.company} and would love to connect and learn more about the team. Thanks!`;
    return { subject: '', body: note.length > 295 ? note.slice(0, 292) + '…' : note };
  }
  if (channel === 'portal') {
    return {
      subject: '',
      body: `Hello ${app.company} team,\n\nI'm a ${headline}${skills} and I'm excited about the ${app.role} position. I enjoy building reliable, well-tested features end to end and picking up new tools quickly. I'd welcome the chance to discuss how I can contribute.\n${resume}\nThank you for your time,\n${name}`,
    };
  }
  return {
    subject: `${app.role} at ${app.company} — ${name}`,
    body: `Hi ${first},\n\nI came across the ${app.role} opening at ${app.company} and wanted to reach out directly. I'm a ${headline}${skills}, and the role looks like a strong match for the work I've been doing.\n\nI'd be glad to share more about my projects. Would you be open to a quick chat this week?\n${resume}\nThanks,\n${name}`,
  };
}

export async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const t = document.createElement('textarea');
    t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
  }
}
