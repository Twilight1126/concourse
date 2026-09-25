// Concourse local API — Express + SQLite (file: data/concourse.db). Zero cloud, zero cost.
import express from 'express';
import { DatabaseSync } from 'node:sqlite'; // built into Node 22.13+ — no native build, no C++ tools needed
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedDemo } from './seed.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 4000);
const LAN = process.argv.includes('--lan') || process.env.HOST === '0.0.0.0';
const DB_FILE = process.env.DB_FILE || path.join(root, 'data', 'concourse.db');
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

const STATUSES = "'wishlist','applied','screening','interview','offer','rejected','withdrawn','ghosted'";
db.exec(`
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  user_id TEXT DEFAULT 'local',
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  job_url TEXT, location TEXT, salary_range TEXT,
  source TEXT CHECK (source IN ('linkedin','portal','referral','cold_email','other')),
  contact_name TEXT, contact_email TEXT, contact_role TEXT, contact_linkedin TEXT,
  status TEXT NOT NULL DEFAULT 'wishlist' CHECK (status IN (${STATUSES})),
  applied_on TEXT, follow_up_on TEXT,
  last_activity_on TEXT DEFAULT (date('now')),
  resume_version TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_apps_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_apps_url ON applications(job_url);

CREATE TABLE IF NOT EXISTS status_history (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_status TEXT, to_status TEXT NOT NULL,
  changed_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  "trigger" TEXT NOT NULL DEFAULT 'manual' CHECK ("trigger" IN ('manual','email_detected','auto_ghosted','extension'))
);
CREATE INDEX IF NOT EXISTS idx_hist_app ON status_history(application_id);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_notes_app ON notes(application_id);

CREATE TABLE IF NOT EXISTS cold_emails (
  id TEXT PRIMARY KEY,
  user_id TEXT DEFAULT 'local',
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email','linkedin','portal')),
  sent_on TEXT NOT NULL DEFAULT (date('now')),
  contact_name TEXT, contact_role TEXT,
  follow_up_count INTEGER NOT NULL DEFAULT 0,
  replied INTEGER NOT NULL DEFAULT 0,
  replied_on TEXT,
  converted_to_interview INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ce_app ON cold_emails(application_id);

CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
`);

// ---------- helpers ----------
const TABLES = {};
for (const t of ['applications', 'status_history', 'notes', 'cold_emails']) {
  TABLES[t] = new Set(db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name));
}
const BOOLS = ['replied', 'converted_to_interview'];
const fromDb = (r) => { for (const k of BOOLS) if (k in r) r[k] = !!r[k]; return r; };
const toDb = (v) => (typeof v === 'boolean' ? +v : v === undefined ? null : v);
const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return fmt(d); };
const today = () => addDays(0);
const q = (c) => `"${c}"`;

const DEFAULT_SETTINGS = {
  full_name: 'Chirag B Sanil',
  headline: 'Full Stack Developer',
  skills: 'Node.js, JavaScript, Angular, SQL',
  resume_link: '',
  followup_days: '7',
};
const getSettings = () => {
  const s = { ...DEFAULT_SETTINGS };
  for (const r of db.prepare('SELECT key, value FROM settings').all()) s[r.key] = r.value;
  return s;
};

// Generic query executor used by the frontend data layer (src/lib/db.ts)
function runQuery({ table, op, filters = [], order, values, }) {
  const cols = TABLES[table];
  if (!cols) throw new Error(`Unknown table: ${table}`);
  const where = [], params = [];
  for (const f of filters) {
    if (!cols.has(f.col)) throw new Error(`Unknown column: ${f.col}`);
    if (f.op === 'in') {
      if (!f.values.length) { where.push('0'); continue; }
      where.push(`${q(f.col)} IN (${f.values.map(() => '?').join(',')})`);
      params.push(...f.values.map(toDb));
    } else { where.push(`${q(f.col)} = ?`); params.push(toDb(f.value)); }
  }
  const W = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  const pick = (obj) => Object.entries(obj).filter(([k, v]) => cols.has(k) && k !== 'id' && v !== undefined);

  if (op === 'insert') {
    const out = [];
    for (const row of [].concat(values)) {
      const id = randomUUID();
      const entries = pick(row);
      const names = ['id', ...entries.map(([k]) => k)];
      db.prepare(`INSERT INTO ${q(table)} (${names.map(q).join(',')}) VALUES (${names.map(() => '?').join(',')})`)
        .run(id, ...entries.map(([, v]) => toDb(v)));
      out.push(fromDb(db.prepare(`SELECT * FROM ${q(table)} WHERE id = ?`).get(id)));
    }
    return out;
  }
  if (op === 'update') {
    const entries = pick(values);
    if (table === 'applications') entries.push(['updated_at', new Date().toISOString()]);
    if (entries.length) {
      db.prepare(`UPDATE ${q(table)} SET ${entries.map(([k]) => `${q(k)} = ?`).join(', ')}${W}`)
        .run(...entries.map(([, v]) => toDb(v)), ...params);
    }
  }
  if (op === 'delete') { db.prepare(`DELETE FROM ${q(table)}${W}`).run(...params); return []; }

  let sql = `SELECT * FROM ${q(table)}${W}`;
  if (order && cols.has(order.col)) sql += ` ORDER BY ${q(order.col)} ${order.asc ? 'ASC' : 'DESC'}`;
  return db.prepare(sql).all(...params).map(fromDb);
}

// ---------- app ----------
const app = express();
app.use(express.json({ limit: '1mb' }));
// CORS so the browser extension / other origins can reach the local API
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const wrap = (fn) => (req, res) => {
  try { res.json(fn(req)); } catch (e) { console.error(e.message); res.status(400).json({ error: e.message }); }
};

app.get('/api/ping', wrap(() => ({ ok: true, app: 'concourse' })));
app.post('/api/q', wrap((req) => ({ data: runQuery(req.body) })));
app.get('/api/settings', wrap(() => getSettings()));
app.put('/api/settings', wrap((req) => {
  const st = db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  for (const [k, v] of Object.entries(req.body || {})) if (k in DEFAULT_SETTINGS) st.run(k, String(v ?? ''));
  return getSettings();
}));

// Browser-extension endpoint: create (or de-duplicate) an application
app.post('/api/ingest', wrap((req) => {
  const b = req.body || {};
  const company = String(b.company || '').trim();
  const role = String(b.role || '').trim();
  if (!company || !role) throw new Error('company and role are required');
  const url = b.job_url ? String(b.job_url).split('#')[0] : null;
  const status = b.status === 'wishlist' ? 'wishlist' : 'applied';

  let existing = url ? db.prepare('SELECT * FROM applications WHERE job_url = ?').get(url) : null;
  existing ??= db.prepare('SELECT * FROM applications WHERE lower(company)=lower(?) AND lower(role)=lower(?)').get(company, role);

  const log = (id, from, to) => db.prepare(`INSERT INTO status_history (id, application_id, from_status, to_status, "trigger") VALUES (?,?,?,?, 'extension')`).run(randomUUID(), id, from, to);

  if (existing) {
    if (existing.status === 'wishlist' && status === 'applied') {
      db.prepare(`UPDATE applications SET status='applied', applied_on=?, follow_up_on=?, last_activity_on=?, updated_at=? WHERE id=?`)
        .run(today(), addDays(7), today(), new Date().toISOString(), existing.id);
      log(existing.id, 'wishlist', 'applied');
      return { ok: true, id: existing.id, duplicate: true, upgraded: true };
    }
    return { ok: true, id: existing.id, duplicate: true };
  }
  const host = url ? new URL(url).hostname : '';
  const source = b.source || (host.includes('linkedin.com') ? 'linkedin' : 'portal');
  const [row] = runQuery({
    table: 'applications', op: 'insert',
    values: {
      company, role, job_url: url, location: b.location || null, salary_range: b.salary_range || null,
      source, status, applied_on: status === 'applied' ? today() : null,
      follow_up_on: status === 'applied' ? addDays(7) : null, last_activity_on: today(),
    },
  });
  log(row.id, null, status);
  return { ok: true, id: row.id, duplicate: false };
}));

// Reminders feed (dashboard widget + extension badge)
app.get('/api/due', wrap(() => {
  const days = Number(getSettings().followup_days) || 7;
  const apps = db.prepare(`SELECT id, company, role, follow_up_on FROM applications
    WHERE status IN ('applied','screening','interview') AND follow_up_on IS NOT NULL AND follow_up_on <= ?`).all(today());
  const outreach = db.prepare(`SELECT c.id, a.company, a.role, c.sent_on FROM cold_emails c JOIN applications a ON a.id=c.application_id
    WHERE c.replied = 0 AND c.sent_on <= ?`).all(addDays(-days));
  return { count: apps.length + outreach.length, applications: apps, outreach };
}));

app.get('/api/export.csv', (_req, res) => {
  const rows = db.prepare('SELECT * FROM applications ORDER BY created_at DESC').all();
  const cols = rows.length ? Object.keys(rows[0]) : ['company', 'role'];
  const esc = (v) => (v == null ? '' : `"${String(v).replace(/"/g, '""')}"`);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="concourse-applications.csv"');
  res.send([cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n'));
});
app.get('/api/backup', (_req, res) => {
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  res.download(DB_FILE, 'concourse-backup.db');
});
app.post('/api/seed', wrap(() => { seedDemo(db, runQuery); return { ok: true }; }));
app.post('/api/reset', wrap(() => {
  db.exec('DELETE FROM notes; DELETE FROM cold_emails; DELETE FROM status_history; DELETE FROM applications;');
  db.prepare("INSERT INTO settings (key,value) VALUES ('seeded','1') ON CONFLICT(key) DO UPDATE SET value='1'").run();
  return { ok: true };
}));

// First run only: load demo data so the UI isn't empty
if (!db.prepare("SELECT 1 FROM settings WHERE key='seeded'").get()) {
  seedDemo(db, runQuery);
}

// Serve the built frontend
const dist = path.join(root, 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
} else {
  app.get('/', (_req, res) => res.send('API running. For the UI run <code>npm run dev</code> (http://localhost:5173) or <code>npm start</code>.'));
}

app.listen(PORT, LAN ? '0.0.0.0' : '127.0.0.1', () => {
  console.log(`\n  Concourse running → http://localhost:${PORT}`);
  console.log(`  Database          → ${DB_FILE}`);
  if (LAN) {
    const ip = Object.values(os.networkInterfaces()).flat().find((i) => i && i.family === 'IPv4' && !i.internal)?.address;
    if (ip) console.log(`  On your phone     → http://${ip}:${PORT}  (same Wi-Fi)`);
  }
  console.log('');
});
