const $ = (id) => document.getElementById(id);
let job = { company: '', role: '', job_url: '', location: '' };

const msg = (t, err) => { $('msg').hidden = false; $('msg').textContent = t; $('msg').className = 'msg' + (err ? ' err' : ''); };

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try { job = (await chrome.tabs.sendMessage(tab.id, { type: 'extract' })) || job; }
  catch { job.job_url = tab && tab.url || ''; }
  $('company').value = job.company || ''; $('role').value = job.role || '';

  const { server } = await chrome.runtime.sendMessage({ type: 'server' });
  $('srv').textContent = server.replace('http://', '');
  $('open').onclick = () => chrome.tabs.create({ url: server });

  const due = await chrome.runtime.sendMessage({ type: 'due' });
  if (due && due.count > 0) { $('due').hidden = false; $('due').textContent = `${due.count} follow-up${due.count === 1 ? '' : 's'} due today`; }
  else if (due && due.ok === false) msg(due.error, true);
})();

async function save(status) {
  const company = $('company').value.trim(), role = $('role').value.trim();
  if (!company || !role) return msg('Fill company and role first.', true);
  const res = await chrome.runtime.sendMessage({ type: 'ingest', payload: { ...job, company, role, status } });
  if (res && res.ok) msg(res.duplicate ? (res.upgraded ? 'Moved to Applied ✓' : 'Already tracked ✓') : 'Saved ✓');
  else msg((res && res.error) || 'Could not reach Concourse.', true);
}
$('wish').onclick = () => save('wishlist');
$('applied').onclick = () => save('applied');
