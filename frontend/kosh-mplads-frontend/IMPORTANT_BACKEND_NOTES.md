# Backend contract assumptions

The backend wasn't ready yet, so every field name below is taken directly from
`Project_Contexts.pdf`. Where the PDF didn't specify a wrapper shape (array vs
`{ key: [...] }`), the frontend defensively tries both — e.g.
`data?.constituencies || data`. When the real backend ships, check these
against the actual JSON and fix mismatches in `src/lib/api.js` / the relevant
page file.

## GET /api/national-stats → Overview
`national_total_allocated`, `national_total_expenditure`,
`national_fund_utilization`, `national_works_completed`,
`national_works_pending`, `national_total_mps`.
Bottom stats bar also expects an optional `national_total_works` for the
"Projects" count (falls back to 29,000 if absent).

## GET /api/summary → Overview
`flagged_anomalies`, `critical_constituencies`, `high_risk_vendors`,
`duplicate_works`, `bulk_spending_mps`, `weather_alibi_applied`.

## GET /api/integrity-index → Overview, Risk Map, Explore
Expected as an array (or `{ constituencies: [...] }`) of objects with:
`constituency`, `state`, `integrity_score` (0-100), `risk_band`
(CRITICAL/HIGH/MEDIUM/LOW — derived client-side from `integrity_score` if
absent), `n_projects`, `avg_financial_risk`, `avg_delay_risk`.

## GET /api/project-risks?limit=500 and /api/projects/{constituency} → Projects
Expected as an array (or `{ projects: [...] }`) of objects with:
`work_id`, `work_description`, `category`, `sanction_amount`,
`composite_risk_score`, `risk_band`, `financial_risk_score`,
`delay_risk_score`, `max_similarity`, `work_status`, `days_since_sanction`,
`state`, `constituency`, optional `weather_alibi_applied`,
`financial_flag` / `delay_flag` / `duplicate_flag` booleans (the UI also
falls back to score thresholds if these aren't sent).

The "Why this project is flagged" explanation is generated client-side from
`financial_risk_score`, `delay_risk_score`, `days_since_sanction`,
`work_status`, and `weather_alibi_applied`. The "cost is Nx the category
median" line is computed in the browser from the currently loaded dataset —
if the backend can supply a true `category_median_ratio` field instead, wire
it in directly for accuracy (see `median_by_category` in `Projects.jsx`).

## GET /api/vendor-graph → Vendors
`{ nodes: [{ id }], links: [{ source, target, weight, amount }] }` exactly as
given in the PDF. Node "type" (vendor vs MP) is inferred client-side: any node
that appears as a `source` is treated as a vendor, anything only appearing as
a `target` is treated as an MP. If the backend can send an explicit
`type: "vendor" | "mp"` per node, that's more robust — swap it into
`Vendors.jsx`.

## GET /api/vendor-risks?limit=200 → Vendors
Array (or `{ vendors: [...] }`) with: `vendor_name`, `constituencies_served`,
`total_disbursed`, `collusion_flags`, `risk_level`.

## GET /api/spending-patterns?limit=500 → MPs
Array (or `{ mps: [...] }`) with: `mp`, `constituency`, `state`,
`march_spending_ratio` (0-1), `bulk_spending_flag`, `spending_risk_score`,
`march_rush_flag`.

## GET /api/duplicates?limit=2000 → Duplicates
Array (or `{ duplicates: [...] }`) with: `work`, `constituency`, `state`,
`work_category`, `sanction_amount`, `max_similarity`, `most_similar_ida`,
`duplicate_flag`.

## GET /api/states → Projects, MPs, Duplicates, Explore
Array of state name strings (or `{ states: [...] }`).

## GET /api/constituencies?state=X → Explore
Array (or `{ constituencies: [...] }`) of `{ constituency, n_projects? }`.

## GET /api/mps?state=X → Explore
Array (or `{ mps: [...] }`) of `{ mp, constituency, house }`.
`house` expected as `"Lok Sabha"` or `"Rajya Sabha"`.

## GET /api/weather/{constituency} (optional)
Not yet wired into the UI — hook it into the Projects drill-down's weather
alibi line in `Projects.jsx` once available, if you want a live lookup instead
of relying on `weather_alibi_applied` from `/api/project-risks`.
