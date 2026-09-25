# Concourse — local job-application & outreach tracker

React + Express + **SQLite** (one file: `data/concourse.db`, uses Node's built-in SQLite — nothing to compile). No accounts, no cloud, no cost.

## Run it (2 commands)
```bash
npm install
npm start            # builds the UI and serves everything on http://localhost:4000
```
Needs Node 22.13 or newer (Node 24/25 work too). First run loads demo data — clear it in **Settings → Clear all data**, then add your real applications.

| Command | What it does |
|---|---|
| `npm start` | build + run at http://localhost:4000 |
| `npm run dev` | hot-reload dev (UI on :5173, API on :4000) |
| `npm run lan` | same as start, but reachable from your phone on the same Wi-Fi (URL is printed) |

## Chrome extension ("Smart-Assist")
1. Chrome → `chrome://extensions` → turn on **Developer mode** → **Load unpacked** → choose the `extension/` folder.
2. Keep Concourse running. Apply to a job on LinkedIn / Naukri / a company portal.
3. When the "application submitted" page appears, a small card asks *Did you just apply?* → **Save to Concourse**.
4. Extension icon → save any job page to your wishlist, see the follow-ups-due badge.

## Cold outreach
Outreach → **New outreach** (or the ✈ icon inside an application): pick Email / LinkedIn / Portal → edit the generated message →
**Open in mail app** / **Open LinkedIn** (note is copied) / **Open portal** → send it yourself → **Mark as sent**.
Concourse logs it and schedules the follow-up (default 7 days, change in Settings).

## Data
Stored only in `data/concourse.db`. Settings → Export CSV / Download DB backup. Back it up by copying the file.
