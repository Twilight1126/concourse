// Concourse "Smart-Assist" content script.
// 1) remembers the job posting you were looking at, 2) notices "application submitted" signals,
// 3) asks you to confirm in one click. It never saves anything silently.
(() => {
  if (window.top !== window) return;

  const JOB_CONTEXT = /(job|career|apply|application|greenhouse|lever|workday|ashby|smartrecruiters|naukri|indeed|linkedin|workable|icims|taleo|instahyre|wellfound|cutshort|hirist|foundit)/i;
  const URL_SIGNAL = /(thank-?you|application-?(submitted|complete|completed|received|sent)|\/confirmation|\/applied\b)/i;
  const TEXT_SIGNALS = [
    /your application (was|has been) (sent|submitted|received)/i,
    /thank(s| you) for (applying|your application|your interest in)/i,
    /application (submitted|received|complete|completed|sent)\b/i,
    /we(?:'|’)?ve received your application/i,
    /successfully (applied|submitted)/i,
    /application (was )?successfully/i,
  ];

  const clean = (t) => (t || '').replace(/\s+/g, ' ').trim();
  const titleCase = (s) => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  function extractJob() {
    const out = { company: '', role: '', location: '', job_url: location.href.split('#')[0] };

    // 1) structured data (schema.org JobPosting) — used by Google Jobs, most ATSs
    for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const j = JSON.parse(s.textContent);
        const list = Array.isArray(j) ? j : j['@graph'] ? j['@graph'] : [j];
        for (const n of list) {
          if ([].concat(n['@type'] || []).includes('JobPosting')) {
            out.role ||= clean(n.title);
            out.company ||= clean(n.hiringOrganization && n.hiringOrganization.name);
            const a = [].concat(n.jobLocation || [])[0];
            const addr = a && a.address;
            if (addr) out.location ||= clean([addr.addressLocality, addr.addressRegion].filter(Boolean).join(', '));
          }
        }
      } catch { /* ignore bad JSON-LD */ }
    }

    // 2) LinkedIn job pages
    if (location.hostname.includes('linkedin.com')) {
      const pick = (sels) => { for (const s of sels) { const t = clean(document.querySelector(s)?.textContent); if (t) return t; } return ''; };
      out.role ||= pick(['.job-details-jobs-unified-top-card__job-title', '.jobs-unified-top-card__job-title', '.top-card-layout__title', 'h1']);
      out.company ||= pick(['.job-details-jobs-unified-top-card__company-name', '.jobs-unified-top-card__company-name', '.topcard__org-name-link']);
      const id = new URL(location.href).searchParams.get('currentJobId') || (location.pathname.match(/\/jobs\/view\/(\d+)/) || [])[1];
      if (id) out.job_url = `https://www.linkedin.com/jobs/view/${id}/`;
    }

    // 3) og:title / document.title  ("Role at Company | Site")
    let title = clean((document.querySelector('meta[property="og:title"]') || {}).content || document.title);
    title = title.replace(/^\(\d+\)\s*/, '');
    const parts = title.split(/\s+[|\-–—]\s+/).filter((p) => !/^(linkedin|indeed|naukri|careers?|jobs?|apply)$/i.test(p));
    const at = (parts[0] || '').match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
    if (at) { out.role ||= clean(at[1]); out.company ||= clean(at[2]); }
    else if (parts.length >= 2) { out.role ||= clean(parts[0]); out.company ||= clean(parts[1]); }

    // 4) ATS slug: jobs.lever.co/<company>/…, boards.greenhouse.io/<company>/…
    const seg = location.pathname.split('/').filter(Boolean)[0];
    if (seg && /(boards|job-boards)\.greenhouse\.io|jobs\.lever\.co|jobs\.ashbyhq\.com|apply\.workable\.com/.test(location.hostname)) out.company ||= titleCase(seg);

    out.company = out.company.slice(0, 80); out.role = out.role.slice(0, 120);
    return out;
  }

  async function remember() {
    const j = extractJob();
    if (j.role && j.company && !URL_SIGNAL.test(location.href)) {
      try { await chrome.storage.local.set({ lastJob: { ...j, ts: Date.now() } }); } catch { /* extension reloaded */ }
    }
  }

  async function withRemembered(j) {
    try {
      const { lastJob } = await chrome.storage.local.get('lastJob');
      if (lastJob && Date.now() - lastJob.ts < 3 * 3600e3) {
        j.company ||= lastJob.company; j.role ||= lastJob.role; j.location ||= lastJob.location;
        if (!j.role || !j.company || URL_SIGNAL.test(location.href)) j.job_url = lastJob.job_url || j.job_url;
      }
    } catch { /* ignore */ }
    return j;
  }

  function submittedSignal() {
    const ctx = JOB_CONTEXT.test(location.hostname + location.pathname);
    if (!ctx) return null;
    const text = (document.body && document.body.innerText || '').slice(0, 30000);
    for (const re of TEXT_SIGNALS) { const m = text.match(re); if (m) return { text, m }; }
    if (/(thank-?you|application-?(submitted|complete|completed|received|sent))|\/confirmation/i.test(location.pathname)) return { text, m: null };
    return null;
  }

  // ---------- confirm toast (Shadow DOM so site CSS can't break it) ----------
  function toast(job, onSave) {
    const host = document.createElement('div');
    host.style.cssText = 'all:initial;position:fixed;z-index:2147483647;right:16px;bottom:16px;';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        *{box-sizing:border-box;font-family:Inter,system-ui,-apple-system,sans-serif}
        .card{width:320px;background:#fff;border:1px solid #E8E5DC;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.18);padding:14px;color:#0f172a;font-size:13px}
        .hd{display:flex;align-items:center;gap:8px;font-weight:600;margin-bottom:10px}
        .dot{width:22px;height:22px;border-radius:6px;background:#0F6E56;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px}
        label{display:block;font-size:11px;color:#64748b;margin:8px 0 3px}
        input{width:100%;padding:7px 9px;border-radius:6px;border:1px solid transparent;background:#F1EFE8;font-size:13px;color:#0f172a}
        input:focus{outline:none;border-color:#0F6E56;background:#fff}
        .row{display:flex;gap:8px;margin-top:12px}
        button{flex:1;padding:8px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid #E8E5DC;background:#fff;color:#334155}
        button.p{background:#0F6E56;border-color:#0F6E56;color:#fff}
        .msg{margin-top:10px;font-size:12px;color:#334155}
        .err{color:#be123c}
      </style>
      <div class="card">
        <div class="hd"><span class="dot">✓</span> Did you just apply?</div>
        <label>Company</label><input id="c" />
        <label>Role</label><input id="r" />
        <div class="row"><button id="x">Dismiss</button><button class="p" id="s">Save to Concourse</button></div>
        <div class="msg" id="m" hidden></div>
      </div>`;
    root.getElementById('c').value = job.company;
    root.getElementById('r').value = job.role;
    const msg = root.getElementById('m');
    root.getElementById('x').onclick = () => host.remove();
    root.getElementById('s').onclick = async () => {
      const company = root.getElementById('c').value.trim(), role = root.getElementById('r').value.trim();
      msg.hidden = false; msg.className = 'msg';
      if (!company || !role) { msg.textContent = 'Please fill company and role.'; msg.className = 'msg err'; return; }
      msg.textContent = 'Saving…';
      const res = await onSave({ ...job, company, role });
      if (res && res.ok) { msg.textContent = res.duplicate ? (res.upgraded ? 'Moved from wishlist to Applied ✓' : 'Already in your tracker ✓') : 'Saved ✓'; setTimeout(() => host.remove(), 1800); }
      else { msg.textContent = (res && res.error) || 'Could not reach Concourse.'; msg.className = 'msg err'; }
    };
    document.documentElement.appendChild(host);
  }

  const send = (msg) => new Promise((resolve) => { try { chrome.runtime.sendMessage(msg, resolve); } catch { resolve({ ok: false, error: 'Extension was reloaded — refresh this page.' }); } });

  // popup asks for the current page's details (manual "Save this job")
  try {
    chrome.runtime.onMessage.addListener((msg, _s, reply) => {
      if (msg && msg.type === 'extract') { withRemembered(extractJob()).then(reply); return true; }
    });
  } catch { /* ignore */ }

  let shownFor = '';
  let busy = false;
  async function tick() {
    if (busy) return; busy = true;
    try {
      const key = location.href.split('#')[0];
      await remember();
      if (shownFor === key || sessionStorage.getItem('concourse:done:' + key)) return;
      const sig = submittedSignal();
      if (!sig) return;
      shownFor = key;
      sessionStorage.setItem('concourse:done:' + key, '1');
      const job = await withRemembered(extractJob());
      const sentTo = sig.m && /sent to/i.test(sig.m[0]) ? (sig.text.match(/application was sent to\s+([^\n.]+)/i) || [])[1] : '';
      if (sentTo && !job.company) job.company = clean(sentTo);
      toast(job, (j) => send({ type: 'ingest', payload: { ...j, status: 'applied' } }));
    } finally { busy = false; }
  }

  tick();
  setInterval(tick, 1500);
})();
