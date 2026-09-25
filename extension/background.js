// Concourse extension — service worker: talks to the local API, shows the due-follow-ups badge.
const DEFAULT_SERVER = 'http://localhost:4000';
const getServer = async () => (await chrome.storage.local.get('server')).server || DEFAULT_SERVER;

async function call(path, options) {
  const base = await getServer();
  try {
    const res = await fetch(base + path, { headers: { 'Content-Type': 'application/json' }, ...options });
    const json = await res.json();
    return res.ok ? json : { ok: false, error: json.error || 'Request failed' };
  } catch {
    return { ok: false, error: 'Concourse is not running. Start it with "npm start".' };
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg.type === 'ingest') sendResponse(await call('/api/ingest', { method: 'POST', body: JSON.stringify(msg.payload) }));
    else if (msg.type === 'due') sendResponse(await call('/api/due'));
    else if (msg.type === 'server') sendResponse({ server: await getServer() });
    else sendResponse({ ok: false });
  })();
  return true; // async response
});

async function checkDue() {
  const due = await call('/api/due');
  const n = due && typeof due.count === 'number' ? due.count : 0;
  chrome.action.setBadgeBackgroundColor({ color: '#0F6E56' });
  chrome.action.setBadgeText({ text: n > 0 ? String(n) : '' });
  const day = new Date().toDateString();
  const { notifiedOn } = await chrome.storage.local.get('notifiedOn');
  if (n > 0 && notifiedOn !== day) {
    await chrome.storage.local.set({ notifiedOn: day });
    chrome.notifications.create({
      type: 'basic', iconUrl: 'icon128.png',
      title: 'Concourse · follow-ups due',
      message: `${n} application${n === 1 ? '' : 's'} need a nudge today.`,
    });
  }
}

chrome.runtime.onInstalled.addListener(() => { chrome.alarms.create('due', { periodInMinutes: 60 }); checkDue(); });
chrome.runtime.onStartup.addListener(() => { chrome.alarms.create('due', { periodInMinutes: 60 }); checkDue(); });
chrome.alarms.onAlarm.addListener((a) => a.name === 'due' && checkDue());
chrome.notifications.onClicked.addListener(async () => chrome.tabs.create({ url: await getServer() }));
