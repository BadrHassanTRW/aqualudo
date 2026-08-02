# Task 06. Admin Dashboard (MVP metrics)

## Goal
Ship a single `/admin` page that shows the three numbers the owner checks daily: today's confirmed bookings, this month's confirmed bookings, and this month's revenue in EGP. No charts, no filters, no drilldowns — just three cards rendered server-side from Supabase.

## Steps
1. **Wire up a Supabase server client** — add a server-only Supabase client using `SUPABASE_SERVICE_ROLE_KEY` so the admin page can read aggregated data without per-user RLS. Files: `lib/supabase/server.ts`, `.env.local.example`. Notes: keep the service role key out of the client bundle; never import this file from a `"use client"` component.
2. **Add an `/admin` route with a minimal auth gate** — create the route and a simple password check (env-based `ADMIN_PASSWORD` set as a signed cookie via middleware) so the page is not public. Files: `app/admin/login/page.tsx`, `app/admin/page.tsx`, `middleware.ts`. Notes: redirect to `/admin/login` when the cookie is missing or invalid; this is MVP auth, not real user management.
3. **Write the three metric queries** — add SQL (and a typed wrapper) for: count of confirmed bookings with `start_at::date = current_date`, count of confirmed bookings in the current calendar month, and `sum(price_egp)` over confirmed bookings in the current calendar month. Files: `supabase/migrations/0001_admin_metrics.sql`, `lib/dashboard/queries.ts`. Notes: filter on `status = 'confirmed'`; use the database's `now()` so the month boundary is timezone-correct; prefer three small queries over one big one.
4. **Build the dashboard page with three metric cards** — server component that calls the queries in parallel and renders a Tailwind grid of three cards (Today / This Month / This Month Revenue) plus a "Last updated HH:MM" line. Files: `app/admin/page.tsx`, `components/dashboard/MetricCard.tsx`, `lib/format.ts` (EGP currency + date helpers). Notes: revenue card must format as `EGP 1,234.00`; show `EGP 0.00` (not "—") when empty; no charts, no icons required.
5. **Add a manual refresh action** — a small `Refresh` button that re-runs the same server queries via a Server Action and updates the "Last updated" timestamp, so the admin can pull fresh numbers without a full page reload. Files: `app/admin/actions.ts`, `components/dashboard/RefreshButton.tsx`. Notes: this replaces the deferred Supabase Realtime plan; keep the action a thin wrapper that calls the same `queries.ts` functions.

## Acceptance Criteria
- [ ] Visiting `/admin` while signed out redirects to `/admin/login`; submitting the correct `ADMIN_PASSWORD` sets a cookie and lands on the dashboard.
- [ ] The dashboard shows exactly three labelled cards: "Today's bookings", "This month's bookings", and "This month's revenue".
- [ ] "Today's bookings" equals the SQL count of rows in `bookings` where `status = 'confirmed'` and `start_at::date = current_date`; the value matches a hand-run `SELECT count(*)` against the seeded DB.
- [ ] "This month's bookings" and "This month's revenue" match the equivalent hand-run queries for the current calendar month; revenue is displayed as `EGP 1,234.00` with two decimals and a thousands separator.
- [ ] Numbers are in English with the `EGP` label; no Arabic/RTL text appears anywhere on the page.
- [ ] Clicking `Refresh` re-runs the queries and the "Last updated HH:MM" line updates to the current time; the metric values re-render.
- [ ] Page first paint completes in under 2 seconds on local dev with at least 1,000 seeded bookings.
- [ ] No chart, no filter, no year scrubber, no heatmap grid, and no export button is present anywhere on the page.
