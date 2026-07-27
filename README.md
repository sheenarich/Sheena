# Goal Tracker by Accessible Academics

A simple, private web app for special education teachers to track IEP goals,
progress data, student behavior, and accommodations. It runs entirely in your
browser — **no install, no login, no internet required, and no data ever leaves
your device.**

## What it does

- **Dashboard** — caseload overview with counts, upcoming compliance dates
  (annual review / re-evaluation alerts), and recent behavior logs.
- **Students** — a roster with each student's grade, disability category,
  case manager, and key IEP dates.
- **IEP Goals + Progress Data** — write measurable goals (percent-correct,
  frequency, duration, prompt level, or rating), log data points, and see an
  automatic progress-over-time chart with the target line drawn in.
- **Behavior Tracking (ABC)** — Antecedent → Behavior → Consequence logs with
  intensity and duration, plus frequency-by-student and by-intensity summaries.
- **Accommodations** — record accommodations per student, organized by category.
- **Reports** — per-student progress reports (with charts) or a caseload summary,
  ready to **print or save as PDF**.
- **Backup** — export all your data to a file and import it back (merge or replace).

## How to use it

Just open **`index.html`** in any modern web browser (Chrome, Edge, Safari,
Firefox) on a laptop or tablet. That's it — no setup.

1. On first launch, click **"Load sample data to explore"** to see how it works,
   or **"Add your first student"** to start real.
2. Open a student to add IEP goals, then use **"+ Data"** on a goal (or the
   **Collect Data** tab) to log progress. Charts update automatically.
3. Use the **Behavior (ABC)** tab to log incidents.
4. Use **Reports** to print or save a PDF for meetings.

## ⚠️ Important: back up your data

Because everything is stored **only in this browser on this device**
(using `localStorage`), your data will be lost if you:

- clear your browser history/cache/site data,
- use private/incognito browsing,
- switch to a different device or browser.

**Go to the Backup tab and download a backup file regularly** — ideally after
every data session. You can restore it any time, or move it to another device.

## Privacy

No accounts, no servers, no analytics, no network requests. Student data stays
on the device. This makes it a good fit for FERPA-conscious classroom use, but
you are responsible for securing the device and your backup files.

## Project structure

```
index.html              App shell and tab navigation
assets/css/styles.css   Styling
assets/js/store.js      Data model + localStorage persistence + sample data
assets/js/charts.js     Dependency-free SVG progress/bar charts
assets/js/app.js        UI, views, forms, and interactions
goal-tracker.html       Portable single-file build (all of the above inlined)
```

No build step and no dependencies — plain HTML, CSS, and JavaScript.
`goal-tracker.html` is a self-contained copy you can open offline from one file.
