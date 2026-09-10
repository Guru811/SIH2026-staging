# kosh — MPLADS Risk Intelligence Platform (Frontend)

Full React + Vite rebuild against `Project_Contexts.pdf` (SIH26102). Replaces the
previous static-HTML prototype with all 7 required pages, wired to the FastAPI
backend, in the specified light/navy government design language, with animated
transitions throughout.

## Stack
React 18 · Vite · Tailwind CSS · Recharts · D3.js (map + force graph) ·
React Router v6 · GSAP (KPI count-up) · Framer Motion (page/UI transitions)

## Setup

```bash
npm install
cp .env.example .env      # set VITE_API_BASE if not http://localhost:8000
npm run dev
```

Requires the FastAPI backend running on `http://localhost:8000` (or whatever
you set `VITE_API_BASE` to).

## Pages

| Route | Page | Key endpoints |
|---|---|---|
| `/` | Overview | `/api/national-stats`, `/api/summary`, `/api/integrity-index` |
| `/risk-map` | Constituency Integrity Map | `/api/integrity-index` |
| `/projects` | Project Risk Register | `/api/project-risks`, `/api/projects/{constituency}`, `/api/states` |
| `/vendors` | Vendor Intelligence | `/api/vendor-graph`, `/api/vendor-risks` |
| `/mps` | MP Spending Patterns | `/api/spending-patterns` |
| `/duplicates` | Duplicate Works Review | `/api/duplicates` |
| `/explore` | Browse All Data | `/api/states`, `/api/constituencies`, `/api/mps` |
| `/alerts` | Unified alert feed (bell icon, top bar) | combines integrity-index, spending-patterns, duplicates, vendor-risks |
| `/settings` | Appearance & notification preferences (gear icon, top bar) | none — local UI state only |

`/projects?constituency=NAME` is used as the drill-down target from the map,
Explore cards, and MP table, per spec. The 7 required pages live in the left
sidebar (desktop) / bottom tab bar (mobile); Alerts and Settings are reached
via the bell and gear icons in the top bar, same as in the original prototype.

## Theme — restored from the original Kosh frontend

The visual language now matches the original prototype instead of the plain
light/navy government skin: warm parchment/gold/emerald/rust/violet palette,
serif headings, a shimmering gradient brand wordmark, a glass/blur top bar,
and soft radial background glows. It's fully theme-able:

- **Theme toggle** (sun/moon icon, top bar, or Settings → Appearance) — light/dark, persisted in `localStorage`.
- **Accent color** — pick violet/gold/emerald/rust/slate in Settings; drives the active-nav highlight, headings, buttons, and chart accents everywhere via the `--accent` CSS variable in `src/index.css`.
- **Density** — comfortable/compact spacing toggle.
- **Motion** — a global animations on/off switch (adds a `.motion-off` class that collapses all transition/animation durations).

All of this lives in `src/context/ThemeContext.jsx` and the CSS variables at
the top of `src/index.css`. Risk-severity colors (CRITICAL/HIGH/MEDIUM/LOW)
are intentionally **not** themed — they stay fixed red/orange/amber/green so
risk meaning never changes with the color scheme, per the brief's UX rules.

## Animation notes

- Route changes fade + slide via Framer Motion (`AnimatePresence` in `App.jsx`).
- KPI cards count up with GSAP on the Overview page only (spec rule #10).
- Cards lift on hover everywhere (`card-hover` utility in `index.css`, spec rule #6).
- Table rows and card grids stagger in on load (`staggerContainer`/`staggerItem`
  in `PageTransition.jsx`).
- The Risk Map's constituency circles and the Vendor force graph nodes animate
  in with a staggered D3 transition; hovering a node/circle scales it up and
  fades in a tooltip.
- The Projects table row expands with an animated height transition
  (Framer Motion `AnimatePresence`) instead of a hard show/hide.
- Nav tabs and the Explore page tabs use a shared animated underline/pill
  (`layoutId`) that slides between the active item.
- Alert banners (MPs march-rush, Duplicates summary) slide down on mount.

## Important — read before wiring up the real backend

**IMPORTANT_BACKEND_NOTES.md** documents every field name this frontend
expects from each endpoint, based on the field names given in the PDF brief.
Since the backend wasn't available while building this, some field names
(especially nested list keys like `data.constituencies` vs a bare array) are
best-effort guesses from the spec text. Once your team's FastAPI responses are
live, diff them against that file — most fixes will just be renaming a field
in `src/lib/api.js` call sites or adjusting `response?.someKey || response` in
a page file's first few lines.
