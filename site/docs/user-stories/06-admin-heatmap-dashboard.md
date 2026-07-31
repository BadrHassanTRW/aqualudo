# File 06 — Admin Heatmap Dashboard User Stories

> **Project:** AquaLudo v2 (water sports academy on the Nile, Cairo, Egypt)
> **Stack:** Next.js 14 (App Router) + Supabase (Postgres + Auth + Storage) + Paymob
> **Domain covered by this file:** The admin heatmap dashboard — the admin's homepage — including the GitHub-style heatmap grid, color legend, year & month scrubbers, activity & coach filters, hover tooltip, day-detail drawer, booking-row inline action surface, "currently-in-session" pulse, empty state, aggregate statistics sidebar, export to PNG/CSV, URL-persisted filter state, and Supabase Realtime-driven cell refresh.
> **Last updated:** 2026-07-28
> **Status:** Draft (awaiting technical + business review)
> **Owner:** Product team
> **Related files:**
> - `01-loading-and-public-discovery.md`
> - `02-activities-and-pricing-catalog.md`
> - `03-booking-flow.md`
> - `04-customer-account.md`
> - `05-admin-content-management.md`
> - `07-admin-booking-management.md`
> - `08-coach-panel.md`
> - `09-communications-notifications.md`
> - `10-platform-infrastructure.md`

---

## How to read this document

Every user story in this file follows the same template introduced in File 01 so downstream consumers (specs, plans, QA, contract review) can rely on a stable shape:

1. **Story** — the BDD-style intent (As a... I want to... So that...).
2. **Priority / Status / Estimate / Sprint** — MoSCoW priority (P0/P1/P2), workflow status, story-point estimate, owning sprint.
3. **Actors** — who triggers the flow and who else participates.
4. **Preconditions / Postconditions** — state before and after.
5. **Main Flow (Happy Path)** — numbered sequence of system + user steps.
6. **Alternate Flows** — branches the story must support.
7. **Exception Flows** — error paths.
8. **Acceptance Criteria (Gherkin)** — Given/When/Then scenarios; each is independently testable.
9. **Edge Cases** — obscure-but-real situations.
10. **UI/UX Specifications** — desktop, tablet, mobile, RTL, loading/empty/error/success states.
11. **Data Model** — Supabase tables, views, materialised views, RPCs, indexes.
12. **API Endpoints** — Next.js Route Handlers (App Router) and Supabase calls.
13. **Security Considerations** — RLS rules, input validation, abuse vectors.
14. **Performance Requirements** — p95 budgets, payloads, caches, prefetch.
15. **Notifications** — admin notifications surfaced in the dashboard header.
16. **Localization** — EN/AR copy keys and RTL switch.
17. **Error Handling** — codes, copy, fallback behavior.
18. **Logging & Analytics** — admin dashboard interactions to capture.
19. **Testing Notes** — unit / integration / E2E.
20. **Related User Stories** — dependencies and dependents.
21. **Dependencies** — external services, prior stories.
22. **Tags** — for cross-cutting search.
23. **Notes / Rationale** — design decisions worth recording.

Acceptance criteria are written in **Gherkin** (Given/When/Then) so they can be reformulated directly into Playwright or Cypress assertions.

The word **must** in this document means "non-negotiable for v1 ship". **Should** means strongly recommended. **Could** means deferred to v2.

---

## Architectural Context

The heatmap is the admin's homepage; not a buried Reports tab. When a member of the AquaLudo operations team signs in to `/admin`, the first thing they see is a GitHub-style yearly activity heatmap: one rectangle per day, coloured by the number of confirmed bookings that day. The dashboard answers two questions at a glance — "how is the business doing this year?" and "what happened today?" — without requiring the admin to drill anywhere.

The dashboard is a Next.js 14 App Router route group (`app/(admin)/admin/dashboard/page.tsx`) guarded by the `admin` Supabase Auth role (US-IN-005 in File 10). The page is **server-rendered on first paint** and hydrates a single client island — `<HeatmapDashboard/>` — which subscribes to Supabase Realtime channel `public:bookings` so newly created or cancelled bookings flip the affected calendar cell within ~1 second without a manual refresh.

The dashboard is composed of four regions that share URL state (`?year=…&activity=…&coach=…&month=…`):

1. **Top bar** — year scrubber (current + previous), month nav, export buttons, admin notification bell with "pending waitlist offers" badge (File 07 owns the offer-resolution flow).
2. **Filter sidebar** (left, 280 px) — activity multi-select, coach multi-select, "Clear filters" button.
3. **Heatmap grid** (centre) — 53-column × 7-row CSS grid of 12×12 px cells (16×16 on tablet/mobile). Decorated with month labels at the top and weekday labels on the left. Today outlined in teal. Empty state surfaces an onboarding graphic when the year has zero bookings.
4. **Aggregate statistics sidebar** (right, 320 px) — YTD revenue, YTD bookings, avg bookings/day, busiest-hour mini heatmap, top activity this year, cancellation rate, no-show rate, and a "Currently in session" pulse card polling every 30 s.

Data flows through three Postgres artefacts defined in this file (and re-examined in File 10):

- A view `booking_heatmap_cells(year int)` returning per-day aggregates: `(day, activity_id, coach_id, confirmed_count, pending_count, cancelled_count, revenue_egp_int)`. Backed by the pre-computed materialised view below.
- A materialised view `booking_heatmap_mv` refreshed every 5 min by a `pg_cron` job **and** on every Supabase Realtime `INSERT`/`UPDATE`/`DELETE` event on `public.bookings` (the webhook handler invokes `REFRESH MATERIALIZED VIEW CONCURRENTLY`).
- Two RPCs:
  - `heatmap_for(year int, activity_id uuid, coach_id uuid)` returns 365×7 grid rows (one per calendar day with a 0..5 `level` integer) for fast client rendering.
  - `day_bookings_summary(day date, activity_id uuid, coach_id uuid)` returns the per-booking list rendered in the day-detail drawer (File US-HM-008) plus a pending-waitlist-offers badge count.

A Next.js Route Handler `GET /api/admin/heatmap?year=…&activity=…&coach=…` exposes the `heatmap_for` RPC result with a 60 s server-side cache (`@vercel/kv` or in-memory `Map` on vanilly Vercel), tagged by query signature so a Realtime webhook can surgically invalidate the affected `(year, …)` cache entry. The cell payload is intentionally tiny (~370 rows × ~40 bytes) so the round trip to the client is well under 100 KB even with filters enabled.

The rendering choice is **pure SVG** (`<svg><rect>…</rect></svg>` with `will-change: transform`) — not a JS grid library, not Three.js, not D3. SVG keeps the 53×7 = 371 cells lightweight, GPU-composited, trivially exportable to a `<canvas>` → PNG (US-HM-013), and screen-reader-announcable via `<title>` per cell. Arabic RTL is supported by flipping the SVG `transform` origin and reading the weekday labels right-to-left.

Pages owned by this file:

| Route                                       | Component path                                              | Auth        | Rendering                  |
|---------------------------------------------|-------------------------------------------------------------|-------------|----------------------------|
| `/admin/dashboard`                          | `app/(admin)/admin/dashboard/page.tsx`                      | Admin role  | SSR + Realtime client hook |
| `/admin/dashboard/day/[date]` (deep-link)   | `app/(admin)/admin/dashboard/page.tsx` (drawer url-state)   | Admin role  | SSR with `date` param      |

The aggregate statistics sidebar and the "currently in session" card both read from cached query results produced by Supabase RPCs listed in US-HM-012.

---

## Domain Glossary

- **Heatmap** — the GitHub-style yearly grid on the admin dashboard: 53 columns (weeks) × 7 rows (days of the week). Each cell maps to a single calendar day in the active year.
- **Cell** — one rectangle inside the heatmap grid. It encodes exactly one day and its fill colour encodes the number of confirmed bookings on that day. Cell default size is 12×12 px on desktop and 16×16 px on tablet/mobile, with a 2 px gap.
- **Level** — an integer 0..5 mapping a confirmed-booking count to a colour bucket. Level 0 = empty (#e8eef2); 1 = #c7e0e8; 2 = #7fb7c9; 3 = #3a8aa3; 4 = #0d4f73; 5 = #062031. The level cut points are: 0 → level 0; 1–2 → level 1; 3–5 → level 2; 6–10 → level 3; 11+ → level 4. Level 5 is reserved for "today's column" pulsing highlight only and does not represent a count ceiling.
- **Intensity** — the visual darkness of a cell's fill; intensity rises monotonically with the booking count.
- **Drill-down** — the act of clicking a cell to open the day-detail drawer/modal listing that day's bookings. From a booking row in the drawer the admin may further expand to inline action deep links (US-HM-009) that resolve in File 07's booking management surface.
- **Year scrub** — the tabbed control at the top of the dashboard that toggles between the current year and the previous year (and, if v2 introduces older years, additional tabs). The active year is persisted to `?year=2026`.
- **Month nav** — the dropdown selector that jumps the heatmap viewport to a specific month, causing the grid to auto-scroll so the first Sunday of that month is anchored at the left edge of the SVG viewport (right edge in RTL).
- **Today outline** — a 2 px teal outline (`#062031`) drawn around the current date's cell so the admin immediately sees where "today" sits on the grid.
- **Currently-in-session pulse** — a side card showing bookings whose `start_at <= now() < end_at`; refreshed by client polling every 30 s.
- **Pending waitlist offers badge** — a numbered pill in the admin notification bell showing how many cancelled slots have an unaddressed waitlist; resolving these offers is owned by File 07.
- **Level-5 teal** — `#062031`, the darkest Nile tone; reserved for the today's-cell pulsing outline and the intensity-4 fill. Intensity 5 (the count "11+") actually uses the same hex because the visual delta between "very busy day" and "today" is intentionally subtle to avoid competing for attention.

---

## Table of Contents

1. US-HM-001 — Heatmap render: 1 cell = 1 day, color = # of confirmed bookings; 7-row × 53-column grid; current year centred
2. US-HM-002 — Color legend: 5 intensity levels (0, 1–2, 3–5, 6–10, 11+) plus "today" outline; labels under the grid
3. US-HM-003 — Year scrubber: tab switch between current and previous years; URL persists `?year=2026`
4. US-HM-004 — Activity filter: dropdown multi-select; default "all activities"; heatmap recomputes counts after filter
5. US-HM-005 — Coach filter: dropdown multi-select; counts only bookings whose coach is in the set
6. US-HM-006 — Month nav: jump-to-month selector; auto-scrolls the heatmap grid to that month
7. US-HM-007 — Hover tooltip on a cell: date (locale-aware), # bookings confirmed, # pending, # cancelled, revenue preview
8. US-HM-008 — Click cell opens day-detail drawer/modal: list of that day's bookings with payment status, party size, coach assigned
9. US-HM-009 — Drill-down booking row → expand to inline action deep links (open booking, message customer, cancel, refund, reassign) — actions live in File 07
10. US-HM-010 — Today highlight & live "currently-in-session" pulse; currently-running sessions shown in a side card
11. US-HM-011 — Heatmap empty state: 0 bookings in the year scope (fresh install) shows onboarding graphic + "Add your first activity"
12. US-HM-012 — Aggregate statistics sidebar: YTD revenue, YTD bookings, avg bookings/day, busiest-hour heatmap, top activity, cancellation rate, no-show rate
13. US-HM-013 — Heatmap export: download PNG of the current heatmap state, and CSV of underlying per-day data
14. US-HM-014 — Filter persistence: filters survive pagination/refresh via URL searchParams; share-friendly
15. US-HM-015 — Realtime update: a newly created or cancelled booking triggers a cell-refresh via Supabase Realtime channel `public:bookings`

---

## US-HM-001 — Heatmap render: 1 cell = 1 day, color = # of confirmed bookings

### Story
As an Admin,
I want a GitHub-style yearly heatmap on my dashboard where one cell equals one day and the cell colour encodes the number of confirmed bookings that day,
So that I can see a year of operating data at a single glance and immediately spot busy / dead days.

### Priority: P0
### Status: Draft
### Estimate: 13 (story points)
### Sprint: Sprint 4 — Admin Heatmap MVP

### Actors
- **Primary actor:** Admin (Supabase Auth role `admin`) on `/admin/dashboard`.
- **Secondary actor:** Coach with admin-lite access at coaching-stat reporting (covered by File 08; not this file).
- **System actor:** `<HeatmapDashboard/>` client island + `GET /api/admin/heatmap` Route Handler + Supabase RPC `heatmap_for(year, activity_id, coach_id)`.

### Preconditions
1. Admin is signed in with `auth.users.id` mapped to a `profiles.role = 'admin'` row.
2. The dashboard route `/admin/dashboard` is reachable (middleware enforces role gate per US-IN-005).
3. A `bookings` table exists with at least the columns `id, activity_id, coach_id, start_at, status, total_egp` (full schema is owned by File 03).
4. The `heatmap_for` RPC and the `booking_heatmap_mv` materialised view are deployed (DDL in §Data Model).
5. The admin's browser is online (offline state handled in US-HM-014/E).

### Postconditions
1. A 53-column × 7-row SVG heatmap is rendered on `/admin/dashboard`.
2. Each `<rect>` corresponds to one calendar day in the active year (Jan 1 → Dec 31).
3. A cell's fill colour equals the intensity level matching `confirmed_count` for that day, decoded by the level mapping in §Domain Glossary.
4. Cells outside the active year (e.g. the trailing Sundays in the last column that belong to January of the next year) are rendered hollow (`fill: transparent; stroke: #f1f4f6`).
5. The grid is anchored so that the first cell of column 0 is the Sunday on or before Jan 1 of the active year.
6. Today's cell is outlined in teal (`#062031`, 2 px) and is always within the viewport on first paint.

### Main Flow (Happy Path)
1. Admin navigates to `/admin/dashboard` (default landing after sign-in redirect from `/admin`).
2. Server component `app/(admin)/admin/dashboard/page.tsx` reads `searchParams` for `year`, `activity`, `coach`.
3. If `year` is missing it defaults to the current year (`new Date().getFullYear()`).
4. Server calls the Route Handler `GET /api/admin/heatmap?year=2026&activity=&coach=` (co-located via internal fetch with `next: { revalidate: 60 }`).
5. The Route Handler invokes the Supabase RPC `heatmap_for(year := 2026, activity_id := null, coach_id := null)` over the PostgREST endpoint using the admin's session JWT.
6. PostgREST executes the function, which `SELECT`s from the materialised view and pivots the per-day rows into the 371-cell payload (one row per calendar day with a `level` column and a `confirmed_count` column).
7. The Route Handler returns `{ year, cells: [{ date, level, confirmed_count, week_index, day_of_week }], generated_at }` as JSON.
8. Server component passes the payload to `<HeatmapDashboard/>` as initial props.
9. The client island mounts an SVG of width `53 × (12 + 2) = 742 px` and height `7 × (12 + 2) = 98 px`.
10. For each cell in `cells` the island appends a `<rect>` with:
    - `x = week_index * 14`
    - `y = day_of_week * 14`
    - `width = 12` `height = 12` `rx = 2`
    - `fill = LEVEL_COLORS[level]`
    - `data-date = date` `data-count = confirmed_count` for downstream tooltip + click handling.
11. The grid is wrapped in a horizontally scrollable container so the admin can pan across the year.
12. The viewport auto-scrolls so the today's-column is centred on first paint.
13. Telemetry event `heatmap.view` fires with `{ year, has_activity_filter, has_coach_filter }`.

### Alternate Flows

#### A1 — Admin arrives with a partial year (e.g. mid-July)
1. Year defaults to 2026; today is 2026-07-28.
2. The grid renders the full 53-column scaffold for the year; days after 2026-07-28 in the trailing columns exist but their cells are filled at level 0 (since they have zero confirmed bookings yet).
3. The viewport auto-scrolls to column `week_index(today's_date)` so today's column is centred.

#### A2 — Admin arrives via a shared filtered URL (`?year=2026&activity=rowing`)
1. Server parses the `activity` slug, resolves it to an `activity_id`, and forwards it to the RPC.
2. The RPC applies `WHERE activity_id = $selected` before aggregation.
3. All cells, legend, and statistics sidebar reflect only the filtered subset.

#### A3 — Admin locale is Arabic
1. `<html dir="rtl">` is applied at the route level by the i18n middleware (US-IN-002/US-IN-003).
2. The heatmap SVG is flipped horizontally — column 0 sits on the right; today's column still centres the viewport.
3. Month labels read right-to-left; weekday labels use AR abbreviations (see §Localization).

### Exception Flows

#### E1 — `heatmap_for` RPC returns an error
1. The Route Handler logs the error and returns HTTP 502.
2. The client island catches the error and renders an inline error state: "Heatmap data unavailable. Retry in 10s." with a manual "Retry now" button.
3. Telemetry event `heatmap.fetch_failed` with `{ error_code }`.

#### E2 — Admin session expired during the dashboard request
1. Internal fetch returns 401.
2. The middleware catches the redirect chain and returns the user to `/admin/login?next=/admin/dashboard`.

#### E3 — Browser is offline at first paint
1. Service worker (US-IN-010) returns the last cached `/api/admin/heatmap` payload if present.
2. If no cached payload, an empty-state is rendered with a "You are offline — reconnect to view current data" banner (US-HM-014).

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Heatmap render — one cell per day, colored by confirmed bookings

  Scenario: Default dashboard renders the current-year heatmap
    Given an admin signs in and lands on /admin/dashboard
      And the current year is 2026
    When the page loads
    Then a 53-column by 7-row SVG heatmap is rendered
      And each rect corresponds to one calendar day in 2026
      And the rect fill matches the intensity level for that day's confirmed booking count
      And today's rect is outlined in a 2px teal stroke
      And the viewport is auto-scrolled so today's column is centred

  Scenario: A day with zero confirmed bookings renders an empty cell
    Given 2026-01-15 has zero confirmed bookings
    When the dashboard renders the cell for 2026-01-15
    Then the rect fill equals the level-0 colour #e8eef2

  Scenario: A day with 7 confirmed bookings renders as level-3
    Given 2026-07-04 has 7 confirmed bookings
    When the dashboard renders the cell for 2026-07-04
    Then the rect fill equals the level-3 colour #3a8aa3

  Scenario: Cells beyond the active year are hollow
    Given the active year is 2026
      And the last column of the 53-week grid intersects 2027-01-03
    When the dashboard renders the cell at the intersection
    Then the rect is rendered transparent with a 1px #f1f4f6 stroke

  Scenario: Admin arrives via a filtered URL
    Given the admin navigates to /admin/dashboard?year=2026&activity=rowing
    When the dashboard loads
    Then the heatmap reflects counts only for the Rowing activity
      And the activity filter shows "Rowing" selected

  Scenario: Arabic locale flips the grid right-to-left
    Given the admin's locale is Arabic
    When the dashboard renders
    Then the grid's column order is reversed
      And month labels read right-to-left
      And today's column remains centred in the viewport
```

### Edge Cases
1. **Leap year (2028, 366 days)** — the RPC produces 366 rows; the scaffold still fits in 53 columns (371 cells) with the last column containing the two extra days.
2. **Daylight Saving transitions** — all day boundaries are computed in `Africa/Cairo` (UTC+2 / +3 during DST); a cell always corresponds to the Egypt-local midnight-to-midnight window.
3. **Bookings with `start_at` exactly at midnight** — counted under the day whose `start_at::date` matches.
4. **Bookings spanning midnight** — counted once on the `start_at::date`.
5. **Future-dated bookings in the trailing months** — already counted in `confirmed_count` (status = 'confirmed'); empty days simply render at level 0 but are not flagged "future".

### UI/UX Specifications

#### Desktop (≥ 1024 px)
- SVG grid 742 px × 98 px, scaled to fit a 920 px content width with horizontal scroll on overflow.
- Cell 12 × 12 px, radius 2 px, gap 2 px (effective 14 px pitch).
- Above the grid: month labels (Jan, Feb, … Dec) positioned at the first column of each month's first Sunday.
- Left of the grid: weekday labels (Sun, Mon, Tue, Wed, Thu, Fri, Sat) at row height 14 px, font 10 px Inter 500, `#66748a`.
- Container background `#ffffff` with a subtle 1 px border `#e3e8ec`.

#### Tablet (768–1023 px)
- Cell scales to 16 × 16 px (pitch 18 px); SVG width `53 × 18 = 954 px`.
- Grid scrollable horizontally with momentum scrolling.

#### Mobile (≤ 640 px)
- Cell scales to 16 × 16 px; grid scrolls horizontally inside a 100 vw container.
- Month labels rendered as a sticky strip above the grid; weekday labels collapse to a 2-character code.

#### RTL (Arabic)
- The SVG `transform-origin` flips to right; column 0 visually sits on the right edge.
- Weekday labels read Sat→Fri top-to-bottom on the right of the SVG (Egypt week starts Saturday in Arabic locale by convention).
- Month labels rendered above the SVG in right-to-left order.

#### Loading state
- While the initial payload fetches, a 53-column skeleton of shimmer rectangles is rendered at the grid dimensions.

#### Empty state
- See US-HM-011.

#### Error state
- Inline banner above the grid: "Heatmap data unavailable. Retry in 10s." plus a "Retry now" button (per E1).

#### Success state
- The grid is fully painted within 600 ms of first paint on a stable 4 G connection; no further spinner.

### Data Model

This story reads from the `bookings` table defined in File 03 (referenced, not redefined) and introduces a view + materialised view + two RPCs:

```sql
-- Pre-aggregate per-day, per-activity, per-coach booking counts.
-- Backed by the materialised view below; safe to expose via RLS only to admin role.
create or replace view booking_heatmap_cells(year int) as
  select
    extract(year from b.start_at at time zone 'Africa/Cairo')::int as year,
    (b.start_at at time zone 'Africa/Cairo')::date               as day,
    b.activity_id,
    b.coach_id,
    count(*) filter (where b.status = 'confirmed')::int          as confirmed_count,
    count(*) filter (where b.status = 'pending')::int            as pending_count,
    count(*) filter (where b.status = 'cancelled')::int          as cancelled_count,
    coalesce(sum(b.total_egp) filter (where b.status = 'confirmed'), 0)::bigint as revenue_egp_int
  from bookings b
  group by 1, 2, 3, 4;

-- Materialised view refreshed every 5 min by pg_cron + on-demand by the Realtime webhook.
create materialized view booking_heatmap_mv as
  select * from booking_heatmap_cells;

create unique index on booking_heatmap_mv (year, day, activity_id, coach_id);

-- RPCs
create or replace function heatmap_for(
  year int,
  activity_id uuid default null,
  coach_id    uuid default null
) returns table (
  day          date,
  week_index   int,
  day_of_week  int,
  confirmed_count int,
  pending_count   int,
  cancelled_count int,
  revenue_egp_int bigint,
  level        int
)
language sql security definer set search_path = public as $$
  with filtered as (
    select *
      from booking_heatmap_mv
     where heatmap_for.year = booking_heatmap_mv.year
       and (heatmap_for.activity_id is null or booking_heatmap_mv.activity_id = heatmap_for.activity_id)
       and (heatmap_for.coach_id    is null or booking_heatmap_mv.coach_id    = heatmap_for.coach_id)
  ),
  days as (
    select generate_series(
             make_date(heatmap_for.year, 1, 1),
             make_date(heatmap_for.year, 12, 31),
             interval '1 day'
           )::date as d
  ),
  padded as (
    select d.d as day,
           ed.week_index,
           ed.day_of_week,
           coalesce(f.confirmed_count, 0) as confirmed_count,
           coalesce(f.pending_count,   0) as pending_count,
           coalesce(f.cancelled_count, 0) as cancelled_count,
           coalesce(f.revenue_egp_int, 0) as revenue_egp_int
      from days d
      left join filtered f on f.day = d.d
      cross join lateral (
        select
          floor((extract(doy from d.d) - 1 + extract(dow from make_date(heatmap_for.year, 1, 1))::int) / 7)::int as week_index,
          extract(dow from d.d)::int as day_of_week
      ) ed
  )
  select day, week_index, day_of_week, confirmed_count, pending_count, cancelled_count, revenue_egp_int,
         case
           when confirmed_count = 0   then 0
           when confirmed_count <= 2  then 1
           when confirmed_count <= 5  then 2
           when confirmed_count <= 10 then 3
           else 4
         end as level
    from padded;
$$;

grant execute on function heatmap_for(int, uuid, uuid) to authenticated;
```

Index strategy:
- Unique index on `booking_heatmap_mv (year, day, activity_id, coach_id)` for fast `WHERE` filtering.
- A `pg_cron` job `SELECT refresh_booking_heatmap_mv()` runs every 5 minutes; the function body uses `REFRESH MATERIALIZED VIEW CONCURRENTLY booking_heatmap_mv`.
- A Supabase Database Webhook on `public.bookings` (INSERT/UPDATE/DELETE) calls an Edge Function that increments a `heatmap_invalidation_log(year, day)` row, which the Route Handler polls to decide whether to re-fetch from PostgREST or serve the 60 s Vercel KV cached payload.

### API Endpoints

#### Next.js Route Handlers
- `GET /api/admin/heatmap?year=2026&activity=<slug>&coach=<slug>` — admin-authenticated JSON endpoint. Caches the response in `@vercel/kv` under `heatmap:v1:{year}:{activity}:{coach}` for 60 s (`tags=['heatmap']`). On Realtime invalidation webhook, the Route Handler's `revalidateTag('heatmap', cacheKey)` is invoked so subsequent reads refetch.

#### Supabase queries
- `supabase.rpc('heatmap_for', { year, activity_id, coach_id })` invoked server-side with the admin's session JWT.

### Security Considerations
1. **RLS**: `booking_heatmap_mv` is owned by the `admin` role. A `coach` role may call `heatmap_for` only when the `coach_id` parameter equals their own `profiles.coach_id` (enforced by a `WITH CHECK` policy on the RPC), matching the coach-panel scoping in File 08. Anonymous and customer roles are denied.
2. **Input validation**: `year` must be `>= 2020 and <= current_year + 1`; otherwise the RPC returns an empty result set (no error).
3. **PII**: The heatmap payload contains only aggregate counts and revenue; no customer name or phone is included.
4. **Cache poisoning**: The Vercel KV cache key is built from the canonicalised query string after slug resolution; a stale `activity=<invalid>` slug resolves to `null` and is cached as such for 60 s only.

### Performance Requirements
- The `heatmap_for` RPC must return in `< 500 ms p95` against a `bookings` table of up to 100,000 rows (target Egyptian academy totals through year 3).
- The Route Handler p95 round-trip is `< 600 ms` (RPC + KV read).
- Client first paint of the SVG grid must occur `< 800 ms` after `app/(admin)/admin/dashboard/page.tsx` finishes streaming.
- The payload JSON is bounded to `~365 rows × 60 bytes ≈ 22 KB`; gzip reduces it to `< 8 KB` on the wire.
- The SVG grid itself trivially paints within a single frame; no paint metric regression is acceptable.

### Notifications
- The admin notification bell (US-HM-01012 in File 07 owns the waitlist-offer resolution flow) is rendered in the dashboard top bar. This file surfaces the count only; clicking the bell opens File 07's waitlist-offer resolution surface in a new route.
- The "pending waitlist offers" badge is updated by the same Supabase Realtime channel as the heatmap (see US-HM-015).

### Localization
- Month labels: EN `Jan, Feb, … Dec`; AR `يناير, فبراير, … ديسمبر`.
- Weekday labels: EN `Sun, Mon, Tue, Wed, Thu, Fri, Sat`; AR `أحد, إثنين, ثلاثاء, أربعاء, خميس, جمعة, سبت` (Egypt convention begins the week with Saturday).
- Currency: revenue shown in EGP, locale-aware formatted via `Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' })` for EN and `'ar-EG'` for AR.

### Error Handling
- 401 from Route Handler → middleware redirect to `/admin/login`.
- 5xx from Route Handler → inline banner with auto-retry countdown (10 s).
- Malformed `year` query param → server logs `admin.dashboard.invalid_year` and silently defaults to the current year.

### Logging & Analytics
- `heatmap.view` — `{ year, has_activity_filter, has_coach_filter, locale }`.
- `heatmap.fetch_duration_ms`.
- `heatmap.fetch_failed` — `{ error_code }`.

### Testing Notes

#### Unit
- `levelForCount(count)` returns the right 0..4 mapping across the cut points (0, 1, 2, 3, 5, 6, 10, 11).
- `<HeatmapGridCells/>` rendering deterministically given a fixture of 371 cells.
- RTL flip: assert the SVG `transform` matrix flips the x-axis when `dir="rtl"`.

#### Integration
- Supabase local dev: seed 200 bookings across 30 days; assert the RPC returns the correct per-day counts and `level` bucket.
- Concurrent refresh: invoke `REFRESH MATERIALIZED VIEW CONCURRENTLY` while another connection calls `heatmap_for`; assert the latter returns a consistent snapshot.

#### E2E (Playwright)
- Sign in as admin; assert the SVG grid paints with 371 descendant `<rect>` elements.
- Simulate a future year via `?year=2027`; assert the empty scaffold renders.
- Toggle locale to AR; assert the SVG is flipped horizontally (compare `x` of cell at week 0 with EN mode).

### Related User Stories
- US-HM-002 (legend)
- US-HM-003 (year scrubber)
- US-HM-010 (today highlight + currently-in-session)
- US-HM-011 (empty state)
- US-HM-015 (realtime)
- US-IN-005 (admin auth gate)
- US-IN-010 (offline service worker)

### Dependencies
- `bookings` table (File 03).
- `pg_cron` extension enabled (File 10).
- Supabase Realtime channel `public:bookings`.
- `@vercel/kv` or an equivalent edge cache store.

### Tags
`heatmap` · `admin` · `dashboard` · `svg` · `rpc` · `materialized-view` · `i18n` · `realtime`

### Notes / Rationale
The heatmap is the admin's homepage because the business question an ops team asks first thing in the morning is "how busy was yesterday?" — and a calendar-shaped grid is the fastest way to answer that for an entire year. The choice of pure SVG (versus D3 or a grid library) keeps the bundle under 5 KB extra, trivially serialises to PNG for export (US-HM-013), and stays screen-reader-announcable via `<title>` per cell. The 5-intensity palette is Nile-toned so the dashboard harmonises with the customer-facing brand while remaining accessible to colour-blind admins (level deltas are encode-able by lightness alone).

---

## US-HM-002 — Color legend: 5 intensity levels plus "today" outline

### Story
As an Admin,
I want a legend strip below the heatmap explaining the colour-to-count mapping and the today outline,
So that I can decode the chart without remembering the intensity palette.

### Priority: P0
### Status: Draft
### Estimate: 2 (story points)
### Sprint: Sprint 4 — Admin Heatmap MVP

### Actors
- **Primary actor:** Admin viewing the dashboard.
- **System actor:** `<HeatmapLegend/>` (rendered inline beneath the SVG grid).

### Preconditions
1. The heatmap from US-HM-001 has rendered.

### Postconditions
1. A horizontal legend strip renders immediately beneath the grid.
2. The legend shows five colour swatches labelled "Less" → "11+ bookings" plus a "Today" outline swatch.
3. Hovering a swatch shows the level cut point range as a tooltip.

### Main Flow (Happy Path)
1. `<HeatmapLegend/>` renders after `<HeatmapGridCells/>`.
2. The strip contains five small rectangles (12 × 12 px each) coloured `#e8eef2, #c7e0e8, #7fb7c9, #3a8aa3, #0d4f73`.
3. The left edge of the strip carries the label "Less" (EN) / "أقل" (AR); the right edge carries "11+ bookings" (EN) / "11+ حجز" (AR).
4. A horizontal gap separates the five-swatch ramp from a "Today" pill: a 12 × 12 px rectangle filled `#e8eef2` outlined with a 2 px teal stroke (#062031), labelled "Today" / "اليوم".
5. Each swatch has `aria-label` matching its level range (e.g. "3 to 5 confirmed bookings").

### Alternate Flows

#### A1 — Reduce-motion admin
- The today swatch does not pulse; it shows a static outline.

#### A2 — RTL
- The strip is mirrored: "Less" appears on the right end.

### Exception Flows

#### E1 — Legend colour list misaligned with palette
- Detected at build time by a Jest snapshot test; fails the CI build.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Heatmap color legend

  Scenario: Legend renders five swatches plus a today marker
    Given the dashboard heatmap has rendered
    Then a horizontal legend appears directly below the grid
      And the legend contains five color swatches ordered from empty to darkest
      And the "Less" label appears on the low-count side and "11+ bookings" on the high-count side
      And a "Today" swatch is rendered with a 2px teal outline

  Scenario: Hovering a swatch reveals the cut-point range
    Given the legend is rendered
    When the admin hovers over the third swatch
    Then a tooltip appears reading "3 to 5 confirmed bookings"

  Scenario: RTL legend mirrors the strip
    Given the admin locale is Arabic
    Then the legend reads "أقل" on the right and "11+ حجز" on the left
```

### Edge Cases
1. **Admin customises levels in v2** — the legend must re-derive from the same `LEVEL_COLORS` and `LEVEL_RANGES` module the SVG uses; both read from one source of truth in `lib/heatmap-levels.ts`.
2. **TODAY outline reused in the empty state** — the empty state (US-HM-011) does not render today since today is actionable; legend still renders.

### UI/UX Specifications
- Strip height 28 px (incl. label baseline).
- Swatch gap 4 px; pill `border-radius: 2px`.
- Tooltip font 12 px, padding 8 px, 200 ms fade-in.

### Data Model
- None beyond the constant table in `lib/heatmap-levels.ts`:

```ts
export const LEVEL_COLORS = ['#e8eef2', '#c7e0e8', '#7fb7c9', '#3a8aa3', '#0d4f73'];
export const LEVEL_RANGES = ['0', '1-2', '3-5', '6-10', '11+'];
export const TODAY_OUTLINE = '#062031';
```

### API Endpoints
- None.

### Security Considerations
- None.

### Performance Requirements
- Legend render `< 16 ms`; no impact on grid paint.

### Notifications
- None.

### Localization
- Legend labels EN / AR per §Localization in US-HM-001's main block, surfaced here.

### Error Handling
- None.

### Logging & Analytics
- `heatmap.legend.hover` — `{ level }`.

### Testing Notes
- Visual snapshot under EN + AR.

### Related User Stories
- US-HM-001.

### Dependencies
- `lib/heatmap-levels.ts` shared module.

### Tags
`heatmap` · `legend` · `color` · `i18n`

### Notes / Rationale
The legend is below the grid (not above) so the chart owns the upper visual weight; the legend reinforces reading order rather than competing for it.

---

## US-HM-003 — Year scrubber: tab switch between current and previous years

### Story
As an Admin,
I want a tabbed control above the heatmap so I can switch between the current year and the previous year,
So that I can compare year-over-year patterns without leaving the dashboard.

### Priority: P1
### Status: Draft
### Estimate: 3 (story points)
### Sprint: Sprint 4 — Admin Heatmap MVP

### Actors
- **Primary actor:** Admin.
- **System actor:** `<YearScrubber/>` client component + URL state.

### Preconditions
1. Dashboard is mounted with an active `year` (current year by default).

### Postconditions
1. A row of year tabs renders above the heatmap.
2. Toggling a tab updates the URL to `?year=<year>` and refetches the heatmap payload.
3. The URL is shareable.

### Main Flow (Happy Path)
1. Dashboard mounts; `year = searchParams.year ?? current_year`.
2. The year scrubber renders two tabs: "2026" (current) labelled "This year" and "2025" labelled "Last year". (A "2024" tab appears in v2 if historical data exists.)
3. The active tab is highlighted with an underline in teal (#062031).
4. Admin clicks "2025". The URL becomes `/admin/dashboard?year=2025` via `router.replace`.
5. Server refetches; the heatmap repaints for 2025.
6. Telemetry `heatmap.year_change` with `{ from, to }`.

### Alternate Flows

#### A1 — Year bookmark shared
- Admin opens `/admin/dashboard?year=2025`; the 2025 tab auto-activates.

#### A2 — Year outside allowed window (`?year=2018`)
- Server rejects and defaults to the current year; a console warning is logged.

### Exception Flows

#### E1 — No bookings for the selected year
- Empty state (US-HM-011) surfaces; year tab remains active.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Year scrubber

  Scenario: Default tab is "This year"
    Given the current year is 2026
    When the admin opens /admin/dashboard
    Then the year scrubber shows the 2026 tab as active

  Scenario: Admin switches to the previous year
    Given the admin is on /admin/dashboard with year=2026
    When the admin clicks the "Last year" tab
    Then the URL becomes /admin/dashboard?year=2025
      And the heatmap refetches for 2025

  Scenario: Year outside the allowed window is rejected
    Given the admin navigates to /admin/dashboard?year=2018
    Then the server defaults to the current year (2026)
      And the dashboard renders with that year

  Scenario: Year param persisted after refresh
    Given the URL is /admin/dashboard?year=2025
    When the admin refreshes the browser
    Then the dashboard reloads with 2025 still active
```

### Edge Cases
1. **Year boundary on Jan 1** — "This year" updates automatically at midnight Cairo time; the "Last year" tab also updates.
2. **Multiple admins pinned to different years concurrently** — each session honours its own URL state.

### UI/UX Specifications
- Tabs: 96 px wide × 36 px tall; underline 2 px.
- Active tab text teal `#062031`; inactive `#66748a`.

### Data Model
- None new.

### API Endpoints
- Reuse `GET /api/admin/heatmap?year=…`.

### Security Considerations
- Year validation server-side only.

### Performance Requirements
- Tab switch repaints the grid in `< 300 ms` (Route Handler cache hit on common years).

### Notifications
- None.

### Localization
- Tab labels EN "This year" / "Last year"; AR "هذا العام" / "العام الماضي".

### Error Handling
- Invalid year → silent default.

### Logging & Analytics
- `heatmap.year_change` — `{ from, to }`.

### Testing Notes
- E2E: tab click → assert URL + grid repaint.

### Related User Stories
- US-HM-001 · US-HM-014.

### Dependencies
- `useRouter().replace` from `next/navigation`.

### Tags
`heatmap` · `year` · `tabs` · `url-state`

### Notes / Rationale
Two years are enough for v1 — the dominant operating question is YoY; deeper history is a v2 concern.

---

## US-HM-004 — Activity filter: dropdown multi-select

### Story
As an Admin,
I want a multi-select dropdown in the filter sidebar listing every published activity (Rowing, Kayaking, SUP, Wakeboarding, Fitness) so I can narrow the heatmap to one or more activities,
So that I can see whether a specific activity is driving the year's booking pattern.

### Priority: P1
### Status: Draft
### Estimate: 4 (story points)
### Sprint: Sprint 4 — Admin Heatmap MVP

### Actors
- **Primary actor:** Admin.
- **System actor:** `<ActivityFilter/>` + URL state.

### Preconditions
1. Dashboard is mounted.
2. The `activities` table has at least one published row.

### Postconditions
1. The filter sidebar shows a multi-select populated with all published activities, sorted by `display_order`.
2. Default state: "All activities" (zero selections).
3. Selecting N activities updates the URL `activity` query param as a comma-separated slugs list and refetches the heatmap.

### Main Flow (Happy Path)
1. Sidebar opens with multi-select empty (label "All activities").
2. Admin opens the dropdown, checks "Rowing" and "Kayaking".
3. The URL becomes `/admin/dashboard?year=2026&activity=rowing,kayaking`.
4. Server resolves the slugs to UUIDs and forwards to `heatmap_for` as an array `activity_id[]`.
5. RPC variant `heatmap_for_multiselect(year, activity_ids uuid[], coach_ids uuid[])` aggregates `WHERE activity_id = ANY($activity_ids)`.
6. Heatmap repaints; statistics sidebar updates.

### Alternate Flows

#### A1 — Admin selects all activities
- Equivalent to "All activities" (no filter); the URL keeps the param explicit for share-friendliness but the server treats an exhaustive list as no filter to keep the RPC fast.

#### A2 — Reset filters
- A "Clear" pill removes the activity filter; URL loses the `activity` param.

### Exception Flows

#### E1 — Stale slug (activity archived)
- Server silently ignores the unknown slug and logs `admin.dashboard.unknown_activity_slug`.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Activity filter

  Scenario: Default state is "All activities"
    Given the dashboard is freshly mounted
    Then the activity filter shows the label "All activities"
      And the heatmap reflects every activity

  Scenario: Selecting two activities filters the heatmap
    Given the admin selects "Rowing" and "Kayaking"
    Then the URL becomes ?activity=rowing,kayaking
      And the heatmap cell for a day with 3 confirmed rowing and 2 confirmed kayak bookings shows a level-1 color (5 total)

  Scenario: Clearing the activity filter restores all activities
    Given two activities are selected
    When the admin clicks "Clear"
    Then the activity filter returns to "All activities"
      And the URL loses the activity param
      And the heatmap shows the unfiltered counts
```

### Edge Cases
1. **New activity published mid-session** — dropdown refreshes when the admin reopens it (polling the activities list every 60 s on dropdown open).
2. **Comma in slug** — not allowed by slug regex validation; safe to split on `,`.

### UI/UX Specifications
- Dropdown 256 px wide; max-height 320 px with internal scroll.
- Checkboxes 16 × 16 px; selected item has a teal `#3a8aa3` check.

### Data Model
- Reuses `activities` table.

### API Endpoints
- A new variant RPC `heatmap_for_multiselect(year int, activity_ids uuid[], coach_ids uuid[])` mirrors `heatmap_for` but takes arrays. The simpler `heatmap_for` is kept for single-select shares.

### Security Considerations
- Slugs validated server-side; only `published` activities resolved.

### Performance Requirements
- Dropdown open `< 100 ms`.
- RPC p95 still `< 500 ms` with `ANY(...)` filter on up to 5 UUIDs.

### Notifications
- None.

### Localization
- "All activities" / "جميع الأنشطة"; "Clear" / "مسح".

### Error Handling
- Unknown slug ignored silently.

### Logging & Analytics
- `heatmap.activity_filter_apply` — `{ slugs }`.

### Testing Notes
- E2E: open filter; select two; assert URL + counts.

### Related User Stories
- US-HM-001 · US-HM-005 · US-HM-014.

### Dependencies
- `activities` seeded.

### Tags
`heatmap` · `filter` · `activity` · `multiselect`

### Notes / Rationale
Multi-select beats a single-select because admins frequently compare two related activities (Rowing + Fitness, the academy's two-volume pillars).

---

## US-HM-005 — Coach filter: dropdown multi-select

### Story
As an Admin,
I want a multi-select dropdown in the filter sidebar listing every published coach so I can narrow the heatmap to bookings led by one or more coaches,
So that I can spot which coaches are driving load and which are under-utilised.

### Priority: P1
### Status: Draft
### Estimate: 3 (story points)
### Sprint: Sprint 4 — Admin Heatmap MVP

### Actors
- **Primary actor:** Admin.
- **Secondary actor:** Coaches whose `status='published'`.
- **System actor:** `<CoachFilter/>` + URL state.

### Preconditions
1. Dashboard is mounted.
2. `coaches` table has at least one published row.

### Postconditions
1. Multi-select populated with published coaches sorted by `display_order` then `full_name`.
2. Default state: "All coaches".
3. Selecting N coaches updates the URL `coach` param and refetches with `coach_id = ANY($uuids)`.

### Main Flow (Happy Path)
1. Dropdown opens below activity multi-select.
2. Admin checks "Salma Akl" and "Ahmed Zaki".
3. URL becomes `?coach=salma-akl,ahmed-zaki`.
4. Server resolves slugs to UUIDs and RPC filters.
5. Heatmap repaints; statistics sidebar re-runs.

### Alternate Flows

#### A1 — Coach archived mid-session
- The cell counts remain valid for the historical window; the dropdown refreshes on next open.

### Exception Flows

#### E1 — Unrecognised coach slug
- Silently ignored; logged.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Coach filter

  Scenario: Default state is "All coaches"
    Given the dashboard freshly mounts
    Then the coach filter shows "All coaches"

  Scenario: Two coaches selected filters counts
    Given the admin selects coaches "Salma Akl" and "Ahmed Zaki"
    Then the URL becomes ?coach=salma-akl,ahmed-zaki
      And only confirmed bookings whose coach is in that set are counted in cells and statistics
```

### Edge Cases
1. **A booking's coach_id is null** (legacy data) — excluded when any coach filter is active, included only in the "All coaches" default.
2. **A coach has zero bookings in the year** — still appears in the dropdown; selecting them renders the empty state at the heatmap level.

### UI/UX Specifications
- Mirrors US-HM-004.

### Data Model
- Reuses `coaches` table.

### API Endpoints
- Shares the multiselect RPC variant introduced in US-HM-004.

### Security Considerations
- Only `status='published'` coaches resolved; archived slugs ignored.

### Performance Requirements
- Same as US-HM-004.

### Notifications
- None.

### Localization
- "All coaches" / "جميع المدربين".

### Error Handling
- Silent ignore.

### Logging & Analytics
- `heatmap.coach_filter_apply` — `{ slugs }`.

### Testing Notes
- E2E: select two coaches; assert URL and counts.

### Related User Stories
- US-HM-001 · US-HM-004 · US-HM-014.

### Dependencies
- `coaches` seeded.

### Tags
`heatmap` · `filter` · `coach` · `multiselect`

### Notes / Rationale
Nile academies run on a small handful of coaches; surfacing coach-driven load patterns lets the admin plan coverage and time off.

---

## US-HM-006 — Month nav: jump-to-month selector

### Story
As an Admin,
I want a month selector above the heatmap so that picking a month auto-scrolls the grid to that month's first column,
So that I can jump to "March" without manually panning across 12 months of cells.

### Priority: P1
### Status: Draft
### Estimate: 3 (story points)
### Sprint: Sprint 4 — Admin Heatmap MVP

### Actors
- **Primary actor:** Admin.
- **System actor:** `<MonthNav/>` + scroll-to-column behaviour.

### Preconditions
1. Dashboard is mounted; heatmap visible.

### Postconditions
1. A 12-item month selector renders above the grid.
2. Selecting a month updates `?month=3` (March) in the URL and scrolls the grid container horizontally so the column containing the first Sunday of that month aligns with the left edge (right edge RTL).

### Main Flow (Happy Path)
1. Admin opens the month selector (a `<select>` on tablet/mobile, a row of pill buttons on desktop).
2. Admin clicks "March".
3. The URL becomes `?month=3`.
4. The grid container scrolls smoothly (`scroll-behavior: smooth`) so column `week_index(March 1 of year)` is left-aligned in the viewport.

### Alternate Flows

#### A1 — Day-of-month not Sunday
- The scroll target is the column whose Sunday falls on or just before March 1; the day-of-week for March 1 itself might still be visible inside that column.

### Exception Flows

#### E1 — Invalid month (e.g. `?month=13`)
- Server rejects and clears the param; no scroll.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Month nav

  Scenario: Selecting a month scrolls the grid horizontally
    Given the dashboard is on year 2026
    When the admin selects month "March"
    Then the URL becomes ?month=3
      And the grid container scrolls horizontally so March's first Sunday column is left-aligned

  Scenario: RTL month nav scrolls to the right edge
    Given the admin locale is Arabic
    When the admin selects "مارس"
    Then the grid scrolls so the March column is right-aligned

  Scenario: Invalid month is rejected
    Given the URL is ?month=13
    When the dashboard loads
    Then the month param is cleared and no scroll occurs
```

### Edge Cases
1. **March 1 falls on a Saturday** — its column is the one with the Sunday on March 2 or the prior Sunday Feb 23; the scroll target is whichever column contains March 1.
2. **Month nav + activity filter combined** — both URL params coexist; the heatmap reflects both.

### UI/UX Specifications
- Desktop: 12 pill buttons inline.
- Mobile: a `<select>` element with full AR labels.
- Active month pill highlighted in teal.

### Data Model
- None new.

### API Endpoints
- None.

### Security Considerations
- Month bounded 1..12.

### Performance Requirements
- Scroll animation 300 ms.

### Notifications
- None.

### Localization
- Month labels EN/AR per US-HM-001 §Localization.

### Error Handling
- Invalid month logged + dropped.

### Logging & Analytics
- `heatmap.month_jump` — `{ month }`.

### Testing Notes
- E2E: open dashboard; click "March"; assert scroll position and URL.

### Related User Stories
- US-HM-001 · US-HM-014.

### Dependencies
- `scrollIntoView` (or `scrollTo` with computed left offset).

### Tags
`heatmap` · `month` · `nav` · `scroll`

### Notes / Rationale
Month nav saves the admin's sanity when investigating a particular month ("how did Ramadan impact our rowing numbers?") without dragging across the full year.

---

## US-HM-007 — Hover tooltip on a cell

### Story
As an Admin,
I want a tooltip to appear when I hover a heatmap cell showing the date (locale-aware), # bookings confirmed, # pending, # cancelled, and a revenue preview for that day,
So that I can get the day's headline numbers without leaving the dashboard.

### Priority: P0
### Status: Draft
### Estimate: 5 (story points)
### Sprint: Sprint 4 — Admin Heatmap MVP

### Actors
- **Primary actor:** Admin hovering a cell.
- **System actor:** `<HeatmapCell/>` (per-cell `mouseenter`/`mouseleave`) + `<HeatmapTooltip/>` floating element.

### Preconditions
1. The heatmap has rendered.
2. The per-cell data attributes (`data-date`, `data-confirmed`, `data-pending`, `data-cancelled`, `data-revenue`) are set.

### Postconditions
1. Hovering a cell for ≥ 120 ms shows a floating tooltip within the viewport (repositioned to avoid clipping).
2. Tooltip shows date formatted via `Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })`, then four labelled rows: confirmed / pending / cancelled / revenue (EGP, locale-aware).
3. Moving the hover to another cell transitions the tooltip in 120 ms (no flicker).
4. On tablet/mobile, `mouseenter` is replaced with a `tap` that opens the same content in a bottom sheet.

### Main Flow (Happy Path)
1. Admin moves the cursor over the cell for 2026-07-04.
2. After 120 ms hover debouncing, the tooltip renders 12 px from the cursor with a 12 px gap (`offsetX + 12, offsetY + 12`).
3. Tooltip content: "Sat, 4 Jul 2026" header, "Confirmed: 7" row, "Pending: 1" row, "Cancelled: 0" row, "Revenue: 3,150 EGP" row.
4. Admin moves the cursor away; tooltip hides after 60 ms.

### Alternate Flows

#### A1 — Tooltip would clip the viewport right edge
- The tooltip flips to the left side of the cell (popper-style logic).

#### A2 — Cell is in the empty state (level 0)
- Tooltip still appears with all metrics shown as 0 + "0 EGP" revenue.

#### A3 — Tablet/mobile tap
- Tapping the cell opens a bottom sheet (height 240 px) with the same content and a "View bookings" button that triggers US-HM-008's drawer.

### Exception Flows

#### E1 — Cell without `data-*` attributes (should never happen)
- Tooltip does not render; tooltip component logs `heatmap.tooltip.cell_data_missing`.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Heatmap cell hover tooltip

  Scenario: Hovering a cell shows the tooltip after 120 ms
    Given the admin hovers over the cell for 2026-07-04
    Then within 120 ms a tooltip appears showing "Sat, 4 Jul 2026"
      And it shows "Confirmed: 7", "Pending: 1", "Cancelled: 0", "Revenue: 3,150 EGP"

  Scenario: Tooltip flips when clipping the right viewport edge
    Given the cell is in the last column of the heatmap
    When the admin hovers it
    Then the tooltip renders on the left side of the cell instead of the right

  Scenario: Tablet tap opens a bottom sheet
    Given the admin is on a tablet viewport
    When the admin taps the cell for 2026-07-04
    Then a bottom sheet opens showing the same content
      And a "View bookings" button invites the admin to drill in
```

### Edge Cases
1. **Admin hover-leaves inside the 120 ms debounce** — tooltip never appears.
2. **Admin quickly hovers across 50 cells** — only the last hovered cell shows a tooltip after the debounce.
3. **Reduce-motion** — tooltip appears without fade, immediately.

### UI/UX Specifications
- Tooltip size 200 × 140 px; white background, 1 px border `#e3e8ec`, shadow 4 px, border-radius 8 px.
- Header date 14 px Inter 600; rows 12 px Inter 500.
- Bottom sheet height 240 px; grabs centre screen.

### Data Model
- The tooltip reads from `data-*` attributes set on each `<rect>` by US-HM-001's render step; no new queries.

### API Endpoints
- None.

### Security Considerations
- Tooltip content is server-trusted aggregate data; no user input.

### Performance Requirements
- Tooltip transition `< 120 ms` open, `< 60 ms` hide.
- No layout thrash; the tooltip uses `position: fixed` so repositioning is GPU-composited.

### Notifications
- None.

### Localization
- Date format per locale; currency per `ar-EG` / `en-EG`.
- Row labels EN "Confirmed / Pending / Cancelled / Revenue" · AR "مؤكد / قيد الانتظار / ملغي / الإيرادات".

### Error Handling
- Missing data attributes swallowed.

### Logging & Analytics
- `heatmap.cell_hover` — `{ date, level }` (rate-limited 1/sec to avoid spam).

### Testing Notes
- Visual diff snapshot of the tooltip for fixture cells.

### Related User Stories
- US-HM-001 · US-HM-008 (deeper drill).

### Dependencies
- Popper-like reposition logic (lightweight inline implementation).

### Tags
`heatmap` · `tooltip` · `hover` · `i18n`

### Notes / Rationale
The tooltip is the lowest-friction way to answer "what happened this day?" without a click. Putting the revenue preview in the tooltip lets the admin mentally triage days worth of further drill-down.

---

## US-HM-008 — Click cell opens day-detail drawer/modal

### Story
As an Admin,
I want clicking a heatmap cell to open a drawer/modal listing that day's bookings with time, customer name, activity, tier, party size, payment status, payment method, and coach assigned,
So that I can investigate what filled (or didn't fill) a particular day.

### Priority: P0
### Status: Draft
### Estimate: 8 (story points)
### Sprint: Sprint 4 — Admin Heatmap MVP

### Actors
- **Primary actor:** Admin clicking a cell.
- **System actor:** `<DayDetailDrawer/>` + Supabase RPC `day_bookings_summary(day date, activity_id uuid, coach_id uuid)`.

### Preconditions
1. The dashboard heatmap is mounted.
2. Admin has clicked any heatmap cell.

### Postconditions
1. A right-side drawer (or full-screen modal on mobile) opens showing the day's bookings.
2. Bookings list is sorted by `start_at` ascending.
3. Each row shows: `start_at`, customer first name + last initial, activity name, tier label, party size, payment status badge, payment method badge, coach full name.
4. A header shows aggregate counts: total confirmed / pending / cancelled + revenue for the day, mirroring the tooltip.
5. The URL updates to `?day=2026-07-04` (deep-linkable).
6. The drawer's overflow handles up to 100 bookings via internal scroll; pagination surfaces for 100+.

### Main Flow (Happy Path)
1. Admin clicks cell for 2026-07-04.
2. URL becomes `?year=2026&day=2026-07-04` (preserving any activity/coach filter).
3. Client fetches `day_bookings_summary(day := '2026-07-04', activity_id, coach_id)` via PostgREST (or from the Route Handler `GET /api/admin/heatmap/day/[date]`).
4. Drawer renders on the right; 480 px wide on desktop, full-width on mobile.
5. Drawer header shows date (locale-aware) and aggregate chits.
6. Bookings list renders 7 rows (one per booking) sorted by `start_at`.
7. Admin scrolls list; if > 100 rows exist, a "Load more" button fetches the next 100 via cursor pagination.

### Alternate Flows

#### A1 — Quick "Open in tab"
- Each row has an external-link icon that opens the booking detail page (`/admin/bookings/[id]`, owned by File 07) in a new tab.

### Exception Flows

#### E1 — RPC returns error
- Drawer shows "Couldn't load this day's bookings. Retry." with a Retry button.

#### E2 — Day has zero bookings
- Drawer shows an empty state "No bookings on 2026-07-04." with a "Close" button.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Day detail drawer

  Scenario: Clicking a cell opens the drawer
    Given the admin clicks the cell for 2026-07-04
    Then a right-side drawer opens
      And the URL becomes ?day=2026-07-04
      And the drawer header shows "Sat, 4 Jul 2026"
      And the bookings list shows 7 rows sorted by start_at ascending

  Scenario: Row shows all required columns
    Given a confirmed booking on 2026-07-04 at 09:00 for "Rowing / Performance / 4 guests / Visa / Coach Salma"
    Then the row displays "09:00 · A. Hassan · Rowing · Performance · party of 4 · Visa · Paid · Salma Akl"

  Scenario: Deep-linking by URL opens the drawer on load
    Given the URL /admin/dashboard?year=2026&day=2026-07-04
    When the dashboard loads
    Then the drawer is opened automatically with that day's bookings

  Scenario: Day with zero bookings shows an empty state
    Given the admin clicks a future Sunday with zero bookings
    Then the drawer opens with "No bookings on <date>."
```

### Edge Cases
1. **Booking status changes via realtime while drawer is open** — the list re-orders / re-badges via Supabase Realtime (US-HM-015) without losing scroll position.
2. **Cancelled bookings are shown greyed** at the bottom of the list under a "Cancelled (N)" subhead, not deleted.

### UI/UX Specifications
- Drawer width 480 px on desktop; 100 vw on mobile.
- Sticky header 64 px; sticky footer used for paginate button.
- Row height 56 px; per-row payment status pill colour-coded: confirmed green, pending amber, cancelled grey, no-show red.

### Data Model

```sql
create or replace function day_bookings_summary(
  day date,
  activity_id uuid default null,
  coach_id    uuid default null
) returns table (
  booking_id       uuid,
  start_at         timestamptz,
  customer_first   text,
  customer_last_initial text,
  activity_name    jsonb,
  tier_name        jsonb,
  party_size       int,
  payment_status   text,
  payment_method   text,
  coach_full_name  text
)
language sql security definer set search_path = public as $$
  select b.id,
         b.start_at,
         split_part(p.full_name, ' ', 1)                                                          as customer_first,
         left(coalesce(split_part(p.full_name, ' ', 2), ''), 1)                                   as customer_last_initial,
         a.name                                                                                  as activity_name,
         t.name                                                                                  as tier_name,
         b.party_size,
         b.status                                                                                as payment_status,
         coalesce(b.payment_method, '')                                                           as payment_method,
         coalesce(c.full_name, 'Unassigned')                                                     as coach_full_name
    from bookings b
    join profiles p     on p.user_id   = b.user_id
    join activities a   on a.id        = b.activity_id
    left join activity_pricing_tiers t on t.id = b.tier_id
    left join coaches   c on c.id       = b.coach_id
   where (b.start_at at time zone 'Africa/Cairo')::date = day_bookings_summary.day
     and (day_bookings_summary.activity_id is null or b.activity_id = day_bookings_summary.activity_id)
     and (day_bookings_summary.coach_id    is null or b.coach_id    = day_bookings_summary.coach_id)
   order by b.start_at asc;
$$;

grant execute on function day_bookings_summary(date, uuid, uuid) to authenticated;
```

### API Endpoints
- `GET /api/admin/heatmap/day/[date]?activity=…&coach=…` returns list JSON; 60 s KV cache tagged `heatmap:day:{date}`.
- `supabase.rpc('day_bookings_summary', { day, activity_id, coach_id })`.

### Security Considerations
- `day_bookings_summary` exposed to `authenticated`; RLS on the underlying join restricts the admin to see all rows and coaches to see only `coach_id = auth.uid()`-mapped rows.
- Customer last name truncated to initial to limit PII in the dashboard drawer.
- The drawer also surfaces a pending-waitlist-offers badge count from `waitlist_offers` (managed in File 07) — the count is read-only here.

### Performance Requirements
- Drawer open `< 300 ms` p75; RPC p95 `< 250 ms` for a day with up to 200 bookings.
- Cursor pagination column `(start_at, id)` is covered by a composite index `bookings(start_at_at_tz_cairo_date, start_at, id)`.

### Notifications
- The pending-waitlist-offers badge is rendered next to the "Waitlist offers" button at the drawer footer (its resolution flow lives in File 07).

### Localization
- Day header via `Intl.DateTimeFormat`.
- Empty-state copy EN "No bookings on {date}." · AR "لا توجد حجوزات بتاريخ {date}.".

### Error Handling
- 4xx/5xx → inline Retry button.

### Logging & Analytics
- `heatmap.cell_click` — `{ date }`.
- `heatmap.drawer_open`.
- `heatmap.drawer_load_more` — `{ from_count, to_count }`.

### Testing Notes
- E2E: click a fixture cell; assert drawer contents + URL.

### Related User Stories
- US-HM-007 (tooltip) · US-HM-009 (inline actions) · US-HM-015 (realtime).

### Dependencies
- `bookings`, `activity_pricing_tiers`, `coaches`, `profiles` tables.

### Tags
`heatmap` · `drawer` · `day-detail` · `rpc` · `i18n`

### Notes / Rationale
Drawer placement is right-aligned so the heatmap remains visible on the left for context while investigating. Customer PII in the dashboard is limited to first-name + last-initial to keep the surface light.

---

## US-HM-009 — Drill-down booking row inline action deep links

### Story
As an Admin looking at a booking row in the day-detail drawer,
I want an inline expand control on each row that reveals deep-link actions: open booking detail, message customer, cancel booking, refund, reassign coach,
So that I can act on a booking without leaving the dashboard context — even though the actual action surfaces live in File 07.

### Priority: P1
### Status: Draft
### Estimate: 5 (story points)
### Sprint: Sprint 4 — Admin Heatmap MVP

### Actors
- **Primary actor:** Admin.
- **System actor:** `<BookingRow/>` expanded actions surface; the actual handlers live in File 07 (`US-AB-*` booking management).

### Preconditions
1. Day-detail drawer is open (US-HM-008).
2. At least one booking row visible.

### Postconditions
1. Each row has a chevron icon (caret). Clicking it expands a 56 px extra height revealing five icon-buttons.
2. Each icon-button is a deep link to a File 07 surface:
   - `Open` → `/admin/bookings/[id]` (new tab).
   - `Message` → `/admin/bookings/[id]?action=message` (File 07's WhatsApp templated message composer).
   - `Cancel` → `/admin/bookings/[id]?action=cancel` (File 07's cancellation modal; guards refund eligibility).
   - `Refund` → `/admin/bookings/[id]?action=refund` (File 07's Paymob refund flow).
   - `Reassign` → `/admin/bookings/[id]?action=reassign` (File 07's coach reassignment modal).
3. Disabled state for actions that the booking status disallows (e.g. `Cancel` disabled for already-cancelled rows).

### Main Flow (Happy Path)
1. Admin clicks the chevron on a confirmed booking row.
2. Row expands; five action icons become visible.
3. Admin clicks "Message"; the WhatsApp composer of File 07 opens in a modal (or new tab on mobile).
4. The dashboard drawer remains mounted in the background; on return the heatmap may have new realtime pulses.

### Alternate Flows

#### A1 — Coach reassignment from here
- Clicking "Reassign" opens File 07's reassignment modal; on return the drawer's coach column updates.

### Exception Flows

#### E1 — Action handler URL is missing (File 07 not deployed yet)
- The action renders disabled with tooltip "Not yet available".

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Booking row inline actions

  Scenario: Chevron expands the row
    Given the day-detail drawer shows a confirmed booking row
    When the admin clicks the chevron
    Then the row expands by 56 px and five action icons are visible

  Scenario: Clicking "Open" deep-links to the booking detail page
    Given the admin clicks the "Open" icon on booking X
    Then a new tab opens /admin/bookings/[X.id]

  Scenario: Cancel disabled for already-cancelled bookings
    Given a row whose payment_status is "cancelled"
    Then the "Cancel" action icon is rendered disabled
      And the tooltip reads "Booking already cancelled"
```

### Edge Cases
1. **Admin mid-action then realtime update on the row** — the row preserves the admin's focus; only the affected column badges refresh.

### UI/UX Specifications
- Chevron 16 px Lucide `ChevronRight` rotates 90° on expand.
- Action icons 32 × 32 px circle Lucide icons; hover bg `#eef2f5`.

### Data Model
- None new; actions are deep links to File 07 routes.

### API Endpoints
- None.

### Security Considerations
- Action URLs are admin-role guarded by File 07's middleware; the dashboard does not bypass any guard.

### Performance Requirements
- Row expansion `< 16 ms` (CSS height transition).

### Notifications
- None direct; File 07 surfaces action confirmations.

### Localization
- Action tooltips EN: Open / Message / Cancel / Refund / Reassign · AR: فتح / مراسلة / إلغاء / استرداد / إعادة تعيين.

### Error Handling
- None; deep links handle their own errors.

### Logging & Analytics
- `heatmap.row_expand` · `heatmap.row_action_click` — `{ action }`.

### Testing Notes
- E2E: expand row; assert five icons visible.

### Related User Stories
- US-HM-008 · US-AB-* (File 07).

### Dependencies
- File 07 action surfaces deployed.

### Tags
`heatmap` · `drawer` · `actions` · `deep-link`

### Notes / Rationale
The dashboard deliberately does not own the cancel/refund/reassign logic; it surfaces the deep links so the booking-management safety guards live in one place (File 07) — the dashboard simply offers the jumping-off point.

---

## US-HM-010 — Today highlight & live "currently-in-session" pulse

### Story
As an Admin,
I want today's cell on the heatmap to be visibly outlined (teal) and a separate side card to show me which sessions are currently running on the water right now,
So that I can keep an eye on live operations while still browsing historical patterns.

### Priority: P0
### Status: Draft
### Estimate: 5 (story points)
### Sprint: Sprint 4 — Admin Heatmap MVP

### Actors
- **Primary actor:** Admin.
- **System actor:** `<TodayOutline/>` (sub-component of heatmap grid) + `<CurrentlyInSessionCard/>` polling RPC `currently_in_session()`.

### Preconditions
1. Dashboard mounted.
2. Server clock aligned to `Africa/Cairo`.

### Postconditions
1. Today's cell `<rect>` has `stroke="#062031"` 2 px and a subtle 5s pulsing opacity animation (unless reduce-motion).
2. A right-rail card titled "Currently in session" shows up to 5 cards for bookings whose `start_at <= now() < end_at`, listed with customer first name + initial, activity, coach, and elapsed/remaining time.
3. The card polls `currently_in_session()` every 30 s.

### Main Flow (Happy Path)
1. Dashboard mounts; heatmap renders today's cell with outline.
2. Right sidebar renders a sticky "Currently in Session" card.
3. First fetch returns currently-running bookings (if any).
4. A 30 s `setInterval` re-fetches; expired bookings are removed in order.
5. Reduce-motion admin: the pulse is replaced with a static outline.

### Alternate Flows

#### A1 — Zero sessions running
- Card shows "No sessions running right now."

#### A2 — More than 5 sessions running
- Card lists 5 + "View all (N) →" link to a `/admin/dashboard/in-session` deep-link (v2 — out of scope at v1; the count is purely informational here).

### Exception Flows

#### E1 — Polling endpoint returns 5xx
- Card displays last successful data with a "Last updated Xs ago" line.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Today highlight & currently-in-session pulse

  Scenario: Today's cell is outlined
    Given the dashboard is mounted on 2026-07-28
    Then the cell for 2026-07-28 has a 2 px teal outline
      And the outline pulses 1.0 → 0.6 → 1.0 every 5s

  Scenario: Currently-in-session card borders with zero sessions
    Given no bookings are running right now
    When the dashboard loads
    Then the "Currently in Session" card shows "No sessions running right now."

  Scenario: Card polls every 30 seconds
    Given the dashboard has been open for 60 seconds
    Then the card has fetched currently_in_session at least twice

  Scenario: Reduce-motion disables the pulse
    Given the admin prefers reduced motion
    Then the outline is static (no opacity animation)
```

### Edge Cases
1. **Daylight saving transition** — the polling interval is wall-clock 30 s, unaffected.
2. **Admin travels timezones** — `now()` is `Africa/Cairo` regardless of the admin's device.

### UI/UX Specifications
- Outline 2 px; pulse via CSS keyframes `opacity: 0 → 0.6 → 1.0` over 5 s.
- Card width 320 px; sticky; refresh badge "Updated Xs ago".

### Data Model

```sql
create or replace function currently_in_session()
returns table (
  booking_id       uuid,
  start_at         timestamptz,
  end_at           timestamptz,
  customer_first   text,
  activity_name    jsonb,
  coach_full_name  text
)
language sql security definer set search_path = public as $$
  select b.id, b.start_at, b.end_at,
         split_part(p.full_name, ' ', 1),
         a.name,
         coalesce(c.full_name, 'Unassigned')
    from bookings b
    join profiles p   on p.user_id   = b.user_id
    join activities a on a.id        = b.activity_id
    left join coaches c on c.id       = b.coach_id
   where b.status = 'confirmed'
     and (now() at time zone 'Africa/Cairo') between
         (b.start_at at time zone 'Africa/Cairo') and
         (b.end_at   at time zone 'Africa/Cairo')
   order by b.end_at asc
   limit 5;
$$;
```

### API Endpoints
- `GET /api/admin/heatmap/in-session` JSON; not cached (always fresh).

### Security Considerations
- `authenticated` only; coach role scoped to `coach_id = auth.uid()` via RLS.

### Performance Requirements
- RPC `< 100 ms` p95.
- Card repaint `< 50 ms`.

### Notifications
- The admin notification bell is also part of the top bar (US-HM-001 main block, end of section).

### Localization
- "Currently in session" / "قيد الجلسة الآن".
- "No sessions running right now." / "لا توجد جلسات الآن.".
- "Updated Xs ago" / "آخر تحديث منذ X ثانية".

### Error Handling
- 5xx → last-successful data + "Last updated Xs ago".

### Logging & Analytics
- `heatmap.today_outline_visible`.
- `heatmap.in_session_card_refresh` (throttled).

### Testing Notes
- Mock the clock; seed a booking that started 2 minutes ago and ends in 5.

### Related User Stories
- US-HM-001 · US-HM-015.

### Dependencies
- Stable server clock.

### Tags
`heatmap` · `today` · `pulse` · `realtime` · `polling`

### Notes / Rationale
The pulse is a soft attention grab; the "currently in session" card turns the dashboard from a passive report into a live operational console.

---

## US-HM-011 — Heatmap empty state

### Story
As an Admin on a fresh install (no bookings yet for the year),
I want the heatmap to show an onboarding graphic and a "Add your first activity" CTA instead of an all-grey grid,
So that I'm not presented with an empty wall of cells.

### Priority: P1
### Status: Draft
### Estimate: 2 (story points)
### Sprint: Sprint 4 — Admin Heatmap MVP

### Actors
- **Primary actor:** Admin.
- **System actor:** `<HeatmapEmptyState/>` replaces the grid when `confirmed_count` totals 0 for the active year.

### Preconditions
1. `heatmap_for` has returned and every cell is level 0.

### Postconditions
1. Grid replaced with a centred illustration (a Nilotic mini-scene: a rower climbing into a boat).
2. Headline: "No bookings for {year} yet."
3. Subline: "When customers book activities, this heatmap will fill with Nile tones day by day."
4. CTA: "Add your first activity" deep-links to `/admin/activities/new` (File 05).
5. The legend is hidden (no useful colour mapping to show).

### Main Flow (Happy Path)
1. Server component computes `confirm_total = sum(confirmed_count)` from the payload.
2. If `confirm_total === 0`, server passes `empty=true` to the client island.
3. The island branches to the empty state; grid not rendered.

### Alternate Flows

#### A1 — Year has bookings but filter zeroes them out
- Empty state surfaces with subline "No bookings for {activity_filter} in {year} yet."

### Exception Flows

#### E1 — Empty state asset fails to load
- Empty state still renders with a placeholder gradient + the CTA.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Heatmap empty state

  Scenario: Fresh install year shows empty state
    Given no bookings exist for the current year
    When the admin opens /admin/dashboard
    Then the heatmap area shows an onboarding illustration
      And the headline "No bookings for 2026 yet."
      And a CTA "Add your first activity" linking to /admin/activities/new

  Scenario: Filter zeroes out confirms shows tailored subline
    Given the admin applies an activity filter with zero confirms in that year
    Then the empty state subline names the activity filter
```

### Edge Cases
1. **Year has only pending bookings** — confirms are 0, but pending are not; the empty state surfaces "N pending approvals" subline linking to File 07.

### UI/UX Specifications
- Illustrated SVG 320 × 240 px.
- CTA button 160 × 40 px teal.

### Data Model
- None new.

### API Endpoints
- None.

### Security Considerations
- None.

### Performance Requirements
- Empty state is the cheapest possible render; SVG `< 4 KB`.

### Notifications
- None.

### Localization
- Headlines + sublines EN/AR.

### Error Handling
- Illustration fail → gradient fallback.

### Logging & Analytics
- `heatmap.empty_state_render` — `{ reason ∈ {fresh_year, filter_zeroed} }`.

### Testing Notes
- Visual snapshot of empty state.

### Related User Stories
- US-HM-001 · File 05 (admin activity creation).

### Dependencies
- Onboarding illustration asset.

### Tags
`heatmap` · `empty-state` · `onboarding`

### Notes / Rationale
Saving the admin from the "wall of grey" on day one wide-loads a gentle nudge toward completing the activity setup.

---

## US-HM-012 — Aggregate statistics sidebar

### Story
As an Admin,
I want a right-rail statistics sidebar showing YTD revenue, YTD bookings, avg bookings/day, busiest hour heatmap, top activity this year, cancellation rate, and no-show rate,
So that I get the headline numbers alongside the visual grid.

### Priority: P1
### Status: Draft
### Estimate: 6 (story points)
### Sprint: Sprint 4 — Admin Heatmap MVP

### Actors
- **Primary actor:** Admin.
- **System actor:** `<AggregateStatsSidebar/>` + RPC `aggregate_stats(year, activity_id, coach_id)`.

### Preconditions
1. Dashboard mounted; heatmap payload has resolved.

### Postconditions
1. Sidebar shows seven stat cards:
   - YTD revenue (EGP).
   - YTD confirmed bookings count.
   - Avg bookings/day (with weekends vs weekdays breakdown).
   - Busiest hour mini-heatmap (24-cell row coloured by booking count per hour of day).
   - Top activity this year (with its share %).
   - Cancellation rate (`cancelled / total`).
   - No-show rate (`no_show / confirmed`).
2. Each card respects the same activity+coach filter as the heatmap.
3. Sidebar updates within 1 s of filter change.

### Main Flow (Happy Path)
1. Server computes agfyie from the same materialised view payload (or a separate `aggregate_stats` RPC).
2. Sidebar renders seven cards in a vertical stack.
3. Busiest hour mini-heatmap is a 24-cell row with the same Nile palette mapping.
4. Admin changes activity filter → sidebar refetches.

### Alternate Flows

#### A1 — No confirms yet
- All cards show "—" or zero; cancellation rate "0/0 = n/a".

### Exception Flows

#### E1 — RPC error
- Sidebar shows last successful values; toast "Statistics unavailable — retry in 10s.".

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Aggregate statistics sidebar

  Scenario: Sidebar renders seven stat cards
    Given the dashboard loads with confirmed bookings for the year
    Then seven stat cards render with non-empty values
      And the cards respect the activity+coach filter

  Scenario: Busiest hour mini-heatmap matches UTC+2 hours
    Given the busiest hour is 18:00 Cairo time
    Then cell 18 of the mini-heatmap is the darkest
      And it carries tooltip "18:00 — 6 bookings"

  Scenario: Top activity card shows share
    Given Rowing accounts for 60% of confirmed bookings
    Then the Top Activity card shows "Rowing · 60%"
```

### Edge Cases
1. **Tie for top activity** — first by `display_order` wins, second shown subtly.
2. **All hours empty except 1** — mini-heatmap shows one non-empty cell.

### UI/UX Specifications
- Card 156 px tall, white bg, shadow 2 px.
- Big number 32 px Inter 700; descriptor 12 px Inter 400.

### Data Model

```sql
create or replace function aggregate_stats(year int, activity_id uuid, coach_id uuid)
returns table (
  ytd_revenue_egp       bigint,
  ytd_bookings_confirmed int,
  avg_bookings_per_day   numeric(6,2),
  avg_weekday_per_day    numeric(6,2),
  avg_weekend_per_day    numeric(6,2),
  hour_counts            int[],
  top_activity_slug      text,
  top_activity_share     numeric(4,3),
  cancellation_rate      numeric(4,3),
  no_show_rate           numeric(4,3)
)
language sql security definer set search_path = public as $$
  with filtered as (
    select b.*
      from bookings b
     where extract(year from b.start_at at time zone 'Africa/Cairo') = year
       and (activity_id is null or b.activity_id = activity_id)
       and (coach_id    is null or b.coach_id    = coach_id)
  ),
  total as (
    select count(*)::int                                                as total_count,
           count(*) filter (where status='confirmed')::int               as confirmed_count,
           count(*) filter (where status='cancelled')::int               as cancelled_count,
           count(*) filter (where status='no_show')::int                  as no_show_count,
           coalesce(sum(total_egp) filter (where status='confirmed'),0)::bigint as revenue
      from filtered
  ),
  per_hour as (
    select extract(hour from b.start_at at time zone 'Africa/Cairo')::int as hr,
           count(*)::int as c
      from filtered b
     where b.status='confirmed'
     group by 1
  ),
  hours as (
    select coalesce(array_agg(c order by hr), array_fill(0, array[24])) as hour_counts
      from (select generate_series(0,23) as hr) h
      left join per_hour p on p.hr = h.hr
  ),
  top as (
    select a.slug,
           count(*)::numeric / nullif((select confirmed_count from total), 0) as share
      from filtered b join activities a on a.id = b.activity_id
     where b.status='confirmed'
     group by a.slug
     order by share desc
     limit 1
  )
  select
    total.revenue,
    total.confirmed_count,
    case
      when extract(doy from now()) > 1
      then total.confirmed_count::numeric / extract(doy from now())
      else 0
    end,
    0, 0, -- weekday/weekend split populated by a follow-up CTE; placeholders for brevity
    hours.hour_counts,
    top.slug,
    coalesce(top.share, 0),
    case
      when total.total_count = 0 then 0
      else total.cancelled_count::numeric / total.total_count
    end,
    case
      when total.confirmed_count = 0 then 0
      else total.no_show_count::numeric / total.confirmed_count
    end
  from total, hours, top;
$$;
```

### API Endpoints
- `GET /api/admin/heatmap/stats?year=…&activity=…&coach=…` — 60 s cache tagged like the heatmap.

### Security Considerations
- `authenticated`; coach scoped (File 08).

### Performance Requirements
- RPC `< 250 ms` p95.

### Notifications
- None.

### Localization
- Currency via `Intl.NumberFormat`.
- Card labels EN `YTD Revenue · YTD Bookings · Avg/Day · Busiest Hour · Top Activity · Cancellation Rate · No-show Rate` · AR translations.

### Error Handling
- 5xx → toast.

### Logging & Analytics
- `heatmap.stats_view`.

### Testing Notes
- Seed bookings, assert numbers.

### Related User Stories
- US-HM-001 · US-HM-004 · US-HM-005.

### Dependencies
- Materialised view, `activities`.

### Tags
`heatmap` · `statistics` · `sidebar` · `i18n`

### Notes / Rationale
Aggregates that mirror the heatmap let the admin derive conclusions at two scales — pattern (year) and metric (single number).

---

## US-HM-013 — Heatmap export: PNG + CSV

### Story
As an Admin,
I want a button above the heatmap that exports a PNG image of the current heatmap state and a CSV of the underlying per-day data,
So that I can paste a snapshot into a WhatsApp thread with the team or hand a CSV to accounting.

### Priority: P2
### Status: Draft
### Estimate: 4 (story points)
### Sprint: Sprint 5 — Admin Tooling Polish

### Actors
- **Primary actor:** Admin.
- **System actor:** `<ExportButtons/>` client component + canvas serializer + `papaparse`.

### Preconditions
1. Heatmap rendered.

### Postconditions
1. Clicking "Export PNG" downloads `aqualudo-heatmap-2026-<activity-or-all>-<coach-or-all>.png` containing exactly the SVG grid + the legend + the active year title + a watermark ("AquaLudo v2").
2. Clicking "Export CSV" downloads `aqualudo-heatmap-2026-<activity-or-all>-<coach-or-all>.csv` with columns `date, week_index, day_of_week, confirmed_count, pending_count, cancelled_count, revenue_egp_int, level`.

### Main Flow (Happy Path)
1. Admin clicks "Export PNG".
2. Client serialises the SVG to a `Blob` and rasterises via `<canvas>`.
3. Canvas → PNG; the Browser triggers download with the generated filename.
4. CSV: client passes the same array of cells through `papaparse.unparse`.

### Alternate Flows

#### A1 — RTL PNG
- PNG mirrors the SVG; watermark right-aligned.

### Exception Flows

#### E1 — Browser blocks download
- Render an inline `<a target="_blank">` preview link.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Heatmap export

  Scenario: Export PNG downloads the heatmap
    Given the admin clicks "Export PNG"
    Then a file named aqualudo-heatmap-2026-all-all.png is downloaded
      And the file is a valid PNG containing the heatmap grid plus legend

  Scenario: Export CSV downloads per-day data
    Given the admin clicks "Export CSV"
    Then a CSV is downloaded
      And the first row contains the header date, week_index, day_of_week, confirmed_count, pending_count, cancelled_count, revenue_egp_int, level
      And 365 (or 366) data rows follow
```

### Edge Cases
1. **PNG exceeds 4 MB** — not expected since SVG is ~10 KB; canvas dump still tiny.
2. **CSV injected with newlines** — column data is numeric only; no risk.

### UI/UX Specifications
- Two buttons labelled "Export PNG" / "Export CSV"; both 120 × 32 px.

### Data Model
- Reuses the heatmap payload.

### API Endpoints
- Client-side only.

### Security Considerations
- Filename white-listed `[\w-]`.

### Performance Requirements
- Rasterise `< 200 ms`.

### Notifications
- Toast "PNG copied to downloads" / "CSV copied".

### Localization
- Labels EN/AR.

### Error Handling
- Browser block → preview link fallback.

### Logging & Analytics
- `heatmap.export_png` · `heatmap.export_csv`.

### Testing Notes
- File download assertions via Playwright.

### Related User Stories
- US-HM-001.

### Dependencies
- `papaparse`.

### Tags
`heatmap` · `export` · `png` · `csv`

### Notes / Rationale
WhatsApp-friendly PNG export matches the Egyptian admin reality of clipboarding results into a team group.

---

## US-HM-014 — Filter persistence via URL searchParams

### Story
As an Admin,
I want all my filter selections (year, activity, coach, month, day drawer) to survive refresh and be shareable as a URL,
So that I can send a colleague a deep link to a specific view ("Look at Rowing in March") and have it load identically.

### Priority: P1
### Status: Draft
### Estimate: 4 (story points)
### Sprint: Sprint 4 — Admin Heatmap MVP

### Actors
- **Primary actor:** Admin.
- **System actor:** `useSearchParams()` (Next.js App Router) + a single source of truth in URL.

### Preconditions
1. Dashboard mounted.

### Postconditions
1. URL state holds every active filter: `?year=2026&activity=rowing,kayaking&coach=salma-akl&month=3&day=2026-03-08`.
2. Refreshing restores every state.
3. Any control change rewrites URL via `router.replace` (not push) to avoid clobbering back history.

### Main Flow (Happy Path)
1. Admin sets filters one by one; each transition updates the URL via `replace`.
2. Admin shares URL with colleague.
3. Colleague pastes URL; the dashboard mounts with the same filter state.

### Alternate Flows

#### A1 — "Clear filters" button resets the URL
- All params removed (`/admin/dashboard` bare).

### Exception Flows

#### E1 — Offline at reload
- Service worker (US-IN-010) returns last cached dashboard HTML; the URL params are honoured deserially from the cached request.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Filter persistence

  Scenario: Filters persist across refresh
    Given the admin applies filters year=2026&activity=rowing&coach=salma-akl
    When the admin refreshes the browser
    Then the dashboard reloads with the same filters active

  Scenario: Colleague opening a shared URL lands on the same view
    Given a URL /admin/dashboard?year=2026&activity=rowing&month=3&day=2026-03-08
    When a second admin opens the link
    Then the year, activity filter, and day drawer state all match the first admin's environment

  Scenario: Clear filters empties the URL params
    Given filters are applied
    When the admin clicks "Clear filters"
    Then the URL becomes /admin/dashboard with no search params
```

### Edge Cases
1. **Param order changes between two URLs** — Canonicalised server-side to a stable hash key for caching.
2. **Stale slugs (archived activities)** — ignored silently (per US-HM-004).

### UI/UX Specifications
- "Clear filters" button visible only when at least one filter active.

### Data Model
- None new.

### API Endpoints
- Reuse all heatmap endpoints; they already accept URL params.

### Security Considerations
- URL params validated server-side; lengths capped.

### Performance Requirements
- `router.replace` is `< 16 ms` client-side.

### Notifications
- None.

### Localization
- Filter chips EN/AR.

### Error Handling
- Malformed params ignored silently.

### Logging & Analytics
- `heatmap.filter_share_open` when a URL with filters opens in a new session.

### Testing Notes
- E2E: apply filters, refresh, assert preserved.

### Related User Stories
- US-HM-003 · US-HM-004 · US-HM-005 · US-HM-006 · US-HM-008.

### Dependencies
- `next/navigation`.

### Tags
`heatmap` · `filter` · `url-state` · `share`

### Notes / Rationale
URL-as-source-of-truth keeps filter state out of fragile React state and makes the dashboard natively shareable.

---

## US-HM-015 — Realtime update via Supabase Realtime channel `public:bookings`

### Story
As an Admin sitting with the dashboard open,
I want a newly created or cancelled booking to refresh the affected cell in near-realtime without requiring me to refresh the page,
So that the dashboard stays a live operational surface rather than a static report.

### Priority: P1
### Status: Draft
### Estimate: 5 (story points)
### Sprint: Sprint 4 — Admin Heatmap MVP

### Actors
- **Primary actor:** Admin viewing the dashboard.
- **System actor:** Supabase Realtime channel subscription on the client + server Route Handler invalidation hook.

### Preconditions
1. Dashboard mounted.
2. Supabase Realtime channel `public:bookings` is enabled for the project (File 10 ensures publication `supabase_realtime` includes `bookings`).
3. Admin browser keeps an open WebSocket to Supabase Realtime.

### Postconditions
1. On `INSERT` or `DELETE` or `UPDATE(status)` of a bookings row, the affected calendar day's cell repopulates with the new counts within ~1 second.
2. The aggregate statistics sidebar enqueues a refetch debounced by 3 s to avoid stuttering on rapid bursts.
3. The day-detail drawer (if open for that day) re-queries eagerly.
4. The "currently in session" card refreshes (it polls 30 s anyway, but on a Realtime-triggered update of any running booking it snaps immediately).
5. URL state remains untouched.

### Main Flow (Happy Path)
1. Dashboard mounts; client subscribes to channel `public:bookings` via `supabase.channel('public:bookings').
     .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, payload => dispatch(payload))
     .subscribe()`.
2. The dispatcher inspects `payload.new.start_at` (or `payload.old.start_at`); resolves to `(year, day)`.
3. Client issues a `GET /api/admin/heatmap/cell?year=…&date=…` parametrised request to refresh the single cell (cheap).
4. Cell `<rect>` updates its `fill` and `data-*` attributes.
5. If the cell's day drawer is open, the drawer refetches `day_bookings_summary(day)`.
6. Telemetry `heatmap.realtime_cell_update`.

### Alternate Flows

#### A1 — Offline or socket dropped
- Client falls back to a 60 s polling of the heatmap Route Handler; toast "Live updates paused — reconnecting…".

#### A2 — Burst of inserts (e.g. admin mass-import of historical bookings)
- Cell refreshes are debounced at 1 per cell per 250 ms to avoid paint thrash.

### Exception Flows

#### E1 — Realtime payload references a day outside the active year
- Silently ignored.

#### E2 — Cell refetch errors
- Cell retains its last value for 60 s; the dispatcher retries once.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Realtime heatmap updates

  Scenario: New confirmed booking repaints its day cell
    Given the admin has the dashboard open for year 2026
      And a customer creates a confirmed booking for 2026-07-29
    Then within 1 second the cell for 2026-07-29 darkens to the next level
      And its tooltip reflects the new confirmed_count

  Scenario: Cancelled booking lightens the cell
    Given a confirmed booking on 2026-07-29 is cancelled by its customer
    Then within 1 second the cell's color shifts to a lower level

  Scenario: Open day drawer refreshes on realtime
    Given the day drawer is open for 2026-07-29
    When a new booking for that day arrives
    Then the drawer's list appends the new booking row without a manual reload

  Scenario: Offline the dashboard degrades to polling
    Given the realtime socket is closed
    Then a toast "Live updates paused — reconnecting…" is shown
      And polling every 60s keeps the dashboard approximately current
```

### Edge Cases
1. **Two admins create bookings on the same day within 100 ms** — dispatcher applies each sequentially but the repaint coalesces into a single frame.
2. **A confirmed booking becomes `no_show`** — its `confirmed_count` drops; the no_show rate sidebar card updates.
3. **Realtime event arrives before server cache invalidation** — the cell refetch endpoint reads directly from Postgres RPC (skips KV cache) so the freshest counts are returned.

### UI/UX Specifications
- Updated cells briefly flash with a 200 ms teal halo (via SVG filter) to acknowledge the change to the admin.
- Drawer refresh fade-in 120 ms.

### Data Model
- Reuses `heatmap_for` (cell endpoint scope) and the materialised view.
- A trivial RPC `heatmap_cell(year, day, activity_id, coach_id)` returns just the single-day row.

```sql
create or replace function heatmap_cell(year int, day date, activity_id uuid, coach_id uuid)
returns table (
  day date, confirmed_count int, pending_count int, cancelled_count int,
  revenue_egp_int bigint, level int
)
language sql security definer set search_path = public as $$
  select day, confirmed_count, pending_count, cancelled_count, revenue_egp_int,
         case
           when confirmed_count = 0 then 0
           when confirmed_count <= 2 then 1
           when confirmed_count <= 5 then 2
           when confirmed_count <= 10 then 3
           else 4
         end
    from heatmap_for(year, activity_id, coach_id)
   where heatmap_for.day = day;
$$;
```

### API Endpoints
- `GET /api/admin/heatmap/cell?year=…&date=…&activity=…&coach=…` — bypasses KV cache (always fresh); p95 `< 150 ms`.

### Security Considerations
- Realtime subscription requires the admin's JWT (RLS-enforced on `public:bookings`). Coaches (File 08) are scoped to their own rows by the RLS policy applied to the publication.

### Performance Requirements
- Cell refetch `< 150 ms` p95.
- Repaint `< 16 ms` (one rect update).
- Sidebar debounce 3 s.

### Notifications
- The "pending waitlist offers" badge increments if a cancelled slot has a waiting waitlist; resolution is owned by File 07.

### Localization
- Toast message EN/AR.

### Error Handling
- 3 retries with backoff; final fallback to 60 s polling.

### Logging & Analytics
- `heatmap.realtime_cell_update` — `{ date, level_from, level_to }`.
- `heatmap.realtime_disconnected` — `{ reason }`.

### Testing Notes
- E2E: open dashboard, POST a booking via API, assert the cell repaints within 1 s.

### Related User Stories
- US-HM-001 · US-HM-008 · US-HM-010 · File 07 waitlist offers.

### Dependencies
- Supabase Realtime publication including `bookings`.
- `pg_cron` and Database Webhook.

### Tags
`heatmap` · `realtime` · `supabase` · `websockets` · `i18n`

### Notes / Rationale
A minute of stale data is acceptable on most dashboards; for an ops surface sitting open for hours, near-realtime keeps the admin's decisions credible. Bypassing the KV cache only on the single-cell refresh endpoint keeps the heatmap-`for` p95 budget intact.

---

## End of File 06

This file documents the admin heatmap dashboard user stories for AquaLudo v2. The next files cover:

- `05-admin-content-management.md` — admin-curated content (activities, reviews, gallery, events), the moderation queue that feeds the waitlist-offer badge rendered in this dashboard's notification bell.
- `07-admin-booking-management.md` — the booking-detail surfaces this dashboard's drawer deep-links to: cancel, refund, reassign, waitlist-offer resolution, message customer.
- `10-platform-infrastructure.md` — pg_cron, Realtime publication, RLS policies for the admin dashboard, KV cache, deployment of materialised views.