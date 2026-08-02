# File 07 — Admin Booking Management User Stories

> **Project:** AquaLudo v2 (water sports academy on the Nile, Cairo, Egypt)
> **Stack:** Next.js 14 (App Router) + Supabase (Postgres + Auth + Storage) + Paymob
> **Domain covered by this file:** the operational core for the admin once a booking exists — the bookings table list view and filters, customer/phone search, the booking detail drawer, manual booking creation for walk-in/phone-in customers, manual cancel by admin, refund handling (full auto for 24h+; partial/discretionary), **the waitlist-offer reassignment centerpiece (US-AD-008)** which is the locus of the user's "admin manually picks the next person from waitlist" decision, the mark-no-show and mark-attended endpoints with their downstream coach-panel and WhatsApp triggers, payment-status override for cash-on-arrival collection, the payment transaction log per booking, the admin's view of the customer WhatsApp message thread (owned transport in File 09), bulk actions, CSV export, overbooking-override protection, and the calendar week/day view complementary to the heatmap in File 06.
> **Last updated:** 2026-07-28
> **Status:** Draft (awaiting technical + business review)
> **Owner:** Product team
> **Related files:**
> - `01-loading-and-public-discovery.md`
> - `02-activities-and-pricing-catalog.md`
> - `03-booking-flow.md`
> - `04-customer-account.md`
> - `05-admin-content-management.md`
> - `06-admin-heatmap-dashboard.md`
> - `08-coach-panel.md`
> - `09-communications-notifications.md`
> - `10-platform-infrastructure.md`

---

## How to read this document

Every user story in this file follows the same template introduced in File 01 so downstream consumers can rely on a stable shape. The 23 sections per story are:

1. **Story** · 2. **Priority / Status / Estimate / Sprint** · 3. **Actors** · 4. **Preconditions / Postconditions** · 5. **Main Flow (Happy Path)** · 6. **Alternate Flows** · 7. **Exception Flows** · 8. **Acceptance Criteria (Gherkin)** · 9. **Edge Cases** · 10. **UI/UX Specifications** · 11. **Data Model** · 12. **API Endpoints** · 13. **Security Considerations** · 14. **Performance Requirements** · 15. **Notifications** · 16. **Localization** · 17. **Error Handling** · 18. **Logging & Analytics** · 19. **Testing Notes** · 20. **Related User Stories** · 21. **Dependencies** · 22. **Tags** · 23. **Notes / Rationale**.

Acceptance criteria are written in **Gherkin** (Given/When/Then) so they can be reformulated directly into Playwright assertions.

The word **must** in this document means "non-negotiable for v1 ship". **Should** means strongly recommended. **Could** means deferred to v2.

---

## Architectural Context

The admin booking-management surface is the operations room where AquaLudo staff spend the bulk of the working day. It lives under `app/(admin)/admin/bookings/*` and is reachable from two places: the admin sidebar's "Bookings" item, and the heatmap's day-detail drawer deep link (File 06 US-HM-008 → US-HM-009). All routes here require the `admin` Supabase Auth role resolved by middleware (US-IN-004/US-IN-005 in File 10).

Pages owned by this file:

| Route                                               | Component path                                                       | Auth          | Rendering |
|-----------------------------------------------------|----------------------------------------------------------------------|---------------|-----------|
| `/admin/bookings`                                   | `app/(admin)/admin/bookings/page.tsx`                                | Admin         | SSR       |
| `/admin/bookings/[id]`                               | `app/(admin)/admin/bookings/[id]/page.tsx` (drawer)                  | Admin         | SSR       |
| `/admin/bookings/new`                               | `app/(admin)/admin/bookings/new/page.tsx`                            | Admin         | SSR       |
| `/admin/bookings/calendar`                           | `app/(admin)/admin/bookings/calendar/page.tsx`                       | Admin         | SSR       |
| `/api/admin/bookings`                                | `app/api/admin/bookings/route.ts`                                    | Admin         | Route     |
| `/api/admin/bookings/[id]`                           | `app/api/admin/bookings/[id]/route.ts`                              | Admin         | Route     |
| `/api/admin/bookings/[id]/cancel`                    | `app/api/admin/bookings/[id]/cancel/route.ts`                        | Admin         | Route     |
| `/api/admin/bookings/[id]/refund`                    | `app/api/admin/bookings/[id]/refund/route.ts`                        | Admin         | Route     |
| `/api/admin/bookings/[id]/mark-attended`             | `app/api/admin/bookings/[id]/mark-attended/route.ts`                 | Admin         | Route     |
| `/api/admin/bookings/[id]/mark-no-show`              | `app/api/admin/bookings/[id]/mark-no-show/route.ts`                  | Admin         | Route     |
| `/api/admin/bookings/[id]/reassign`                  | `app/api/admin/bookings/[id]/reassign/route.ts`                      | Admin         | Route     |
| `/api/admin/bookings/[id]/waitlist-offer/pick`       | `app/api/admin/bookings/[id]/waitlist-offer/pick/route.ts`           | Admin         | Route     |
| `/api/admin/bookings/[id]/override-payment`          | `app/api/admin/bookings/[id]/override-payment/route.ts`              | Admin         | Route     |
| `/api/admin/bookings/[id]/export-pdf`                | `app/api/admin/bookings/[id]/export-pdf/route.ts`                    | Admin         | Route     |
| `/api/admin/bookings/bulk`                           | `app/api/admin/bookings/bulk/route.ts`                               | Admin         | Route     |
| `/api/admin/bookings/export.csv`                     | `app/api/admin/bookings/export.csv/route.ts`                         | Admin         | Route     |

The operations surface composes four artefacts owned by this file:

- `booking_events` — an append-only log of everything that ever happened to a booking (created, confirmed, cancelled, partial/full refund, attended, no-show, reassigned, payment captured/failed/cash collected, status overridden). Every US-AD-* story that mutates a booking appends one row. The booking detail drawer's "Timeline" tab renders this verbatim.
- `waitlist_offers` — the offer flight when a cancelled slot is offered to a waitlist member. Pairs with `waitlist_entries` (File 03, slot-specific) and `waitlist_subscriptions` (File 04, activity-level). The admin's manual pick (US-AD-008) is the single source of creating these rows; their lifecycle (pending → claimed → expired → declined → fulfilled) is wholly owned here.
- `payment_transactions` — full Paymob intent + capture + refund log per booking (idempotency-keyed). RLS-restricted to admin/coach (coach sees their own teaching incomes as an aggregate per File 08 — coach sees only theBooking's outbound row, never the customer's identity in payment record.
- `admin_override_log` — wiki of admin override actions on bookings: overbook, override payment status, force-cancel-outside-window, etc. Append-only; surfaced in the drawer's timeline for transparency.

Tables referenced but defined in other files: `bookings`, `slots`, `booking_line_items`, `waitlist_entries` (File 03); `profiles`, `customer_packages`, `membership_subscriptions`, `waitlist_subscriptions`, `notification_preferences` (File 04); `customer_messages`, `whatsapp_dispatch_jobs`, `whatsapp_messages`, `whatsapp_conversations`, `magic_tokens` (File 09); `reviews` (File 02); `coach_session_assignments`, `attendance_records`, `coach_time_off` (File 08); `audit_logs` (File 05 — fired into, not redefined); `activities`, `activity_pricing_tiers`, `coaches`, `events`, `session_packages`, `membership_tiers` (File 02).

Currency is stored as integer piasters (1 EGP = 100 piasters). The admin surface displays amounts with the supervisor-defined currency locale string `en-EG`/`ar-EG` and two decimals; the admin acquisitions team can switch to integer display for forensics via a per-admin toggle persisted to `profiles.locale`.

---

## Domain Glossary

- **Booking** — a row in `bookings` (File 03). Identified both by the `id` UUID and by the `human_id` (e.g. `ROW-2026-0412`). Booking status transitions are recorded against `booking_events`.
- **Timeline** — the chronological history of a booking rendered in the detail drawer; backed 1-to-1 by `booking_events`.
- **Manual booking** — a booking created by an admin on behalf of a phone-in or walk-in customer, optionally linking to a future authenticated profile (US-AD-005). Supports cash-on-arrival, Paymob payment link, and card-on-file if the customer has one stored.
- **Refund intensity** — `full` (>= 24h before slot, customer-initiated), `partial` (admin-discretion inside or outside the 24h window or for pricing adjustments), or `none`. The strict 24h rule (per File 04 US-CA-012) is enforced on the customer surface; admin may override discretionary refunds inside the 24h window per US-AD-007.
- **Waitlist-offer flight** — a 15-minute clock that starts when an admin manually picks a waitlist member. The selected customer receives a WhatsApp with a magic-token pay-link (per US-CN-007 in File 09). If she claims within 15 minutes, a new booking is created against the freed slot. If she does not act, the offer expires; the admin may re-pick (per US-AD-008's "Win-back path") or return the slot to public availability.
- **No-show** — a `status='no_show'` booking whose slot has ended without attendance. Drives the strict policy: the customer may not self-cancel; admin may void against the package counter per US-CA-012 edge case "no_show_then_void".
- **Attended** — `status='attended'`. Triggers the post-session WhatsApp + review request dispatch per US-CN-006 within the 1h-after-slot cooldown.
- **Payment override** — collector-admin marks a cash-on-arrival booking as paid (`payment_transactions.method='cash_on_arrival'` `status='captured'`) after physically taking cash. The admin signed the override into `admin_override_log`.
- **Overbooking** — the situation where `slots.capacity_used >= slots.capacity`. Normally the booking funnel refuses; an admin may override with explicit reason logged (`admin_override_log`). Revenue impact surfaced to the dashboard.
- **Calendar view** — the week/day grid (US-AD-017) that complements the heatmap (File 06). Filterable by coach. Printable PDF agenda per coach.

---

## Table of Contents

1. US-AD-001 — Bookings table list view
2. US-AD-002 — Bookings filters (date range, status, activity, coach, payment method, payment status, booking id)
3. US-AD-003 — Bookings search by customer name or phone (case-insensitive ILIKE)
4. US-AD-004 — Booking detail drawer (customer summary, line items, transactions timeline, status timeline, message thread link, action buttons)
5. US-AD-005 — Manual booking creation (admin on behalf of customer)
6. US-AD-006 — Manual cancel by admin (records reason; notifies customer via WhatsApp)
7. US-AD-007 — Refund handling (full auto 24h+ at Paymob; partial override with reason)
8. US-AD-008 — **Reassign slot to waitlist member (CENTERPIECE)** — admin manual pick, 15-minute claim window, retry
9. US-AD-009 — Mark no-show (post-slot-end; no refund; flag history; consume package counter optional)
10. US-AD-010 — Mark attended (post-slot-end; triggers post-session WhatsApp + review request)
11. US-AD-011 — Override payment status (mark cash-on-arrival as paid; transaction record; signed)
12. US-AD-012 — Payment log viewer per booking (Paymob intent → 3DS → captured → refunded timeline)
13. US-AD-013 — Customer message thread (admin ↔ customer via WhatsApp; inbox with unread badges)
14. US-AD-014 — Bulk actions (bulk cancel/mark attended/export)
15. US-AD-015 — Export CSV of current filter scope (rate-limited 10/h; audit logged)
16. US-AD-016 — Overbooking protection + admin override
17. US-AD-017 — Calendar week/day view (complementary to heatmap; printable PDF agenda per coach)

---

## US-AD-001 — Bookings table list view

### Story
As an admin coming from the heatmap day-detail drawer or the sidebar,
I want a sortable, paginated bookings table with the essential columns (id, customer, activity, tier, date/time, party size, payment status, payment method, coach, status) and quick action links,
So that I have an at-a-glance operational view of every booking in the system.

### Priority: P0
### Status: Draft
### Estimate: 5
### Sprint: Sprint 4 — Admin Operations MVP

### Actors
- **Primary actor:** Admin (`profiles.role='admin'`).

### Preconditions
1. Admin authenticated.

### Postconditions
1. A paginated table renders the bookings matching the current filter scope (default: confirmed + no-show in the last 7 days).
2. Each row has a "View" link opening the detail drawer (US-AD-004).
3. URL params `?page=&status=&date_from=&date_to=&activity=&coach=` are persisted on every change so the view is shareable.

### Main Flow (Happy Path)
1. Admin navigates to `/admin/bookings`.
2. SSR queries `bookings` joined to `profiles`, `activities`, `activity_pricing_tiers`, `coaches` using the filter scope.
3. Renders the table header (sticky), the column-resize handles, and the rows.
4. Pagination 25 rows/page.
5. Clicking a row's "View" deep-links to `/admin/bookings/[id]`.

### Alternate Flows

#### A1 — Empty filter scope
1. Empty state with "No bookings in this filter. Adjust filters." CTA.

### Exception Flows

#### E1 — Supabase query error
1. Cached last render returns; error banner suggests retry.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Bookings table list view

  Scenario: Default list paginates 25 rows
    Given 30 confirmed bookings in the last 7 days
    When the admin opens /admin/bookings
    Then the first 25 render with pagination showing "Page 1 of 2"
      And each row shows id, customer name, activity, tier, date/time, party size, payment status, payment method, coach, status

  Scenario: Row deep link
    When the admin clicks "View" on row "ROW-2026-0412"
    Then the browser navigates to /admin/bookings/ROW-2026-0412

  Scenario: Empty state
    Given no bookings in the current filter scope
    When the page renders
    Then an empty state surfaces "No bookings in this filter"
```

### Edge Cases
1. Customer profile was soft-deleted after booking — row renders `customer_name` snapshot from `bookings` saved value, with "Account deleted" pill.
2. Booking has no coach assignment — coach column shows "Any".

### UI/UX Specifications
- Desktop: 12-column sticky-header table; row height 40px; row click expands inline action drawer OR follows the "View" link; latter preferred.
- Mobile: stack into cards; columns compress to id+date+status.
- Loading: skeleton rows.
- Empty: full-bleed centered empty state.

### Data Model
Reads `bookings` join table data; the central query:

```sql
create or replace view admin_bookings_list as
  select b.id, b.human_id, b.start_at, b.party_size, b.payment_method, b.status,
         p.full_name, p.phone,
         a.slug as activity_slug, a.name as activity_name,
         c.slug as coach_slug, c.full_name as coach_name,
         b.tier_code,
         b.found_at_checkin,
         pt.status as payment_status,
         sum(bli.amount_egp_int) as line_total_piasters
    from bookings b
    left join profiles p on p.user_id = b.user_id
    left join activities a on a.id = b.activity_id
    left join coaches c on c.id = b.coach_id
    left join payment_transactions pt on pt.booking_id = b.id
    left join booking_line_items bli on bli.booking_id = b.id
   group by 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13;
grant select on admin_bookings_list to admin;
```

### API Endpoints
- `GET /api/admin/bookings?page=&status=&date_from=&date_to=&activity=&coach=&payment_method=&payment_status=&q=&booking_id=`.

### Security Considerations
- Admin role gate + RLS policy on `admin_bookings_list` view.
- Per-admin rate-limit (60 calls/min).

### Performance Requirements
- First paint of 25 rows p95 < 400 ms.
- p99 < 1.5 s under 50k rows.

### Notifications
- A "pending waitlist offers" badge in the page header comes from File 06 US-HM-001's notification bell.

### Localization
- Tier names and date formats locale-aware.

### Error Handling
- `query_failed` surfaces the cached prior render.

### Logging & Analytics
- `admin.bookings.list.viewed` `{ filter_signature_hash }`.

### Testing Notes
- E2E: open page, click row.

### Related User Stories
- US-HM-008 (File 06) the drawer's parent. US-AD-002 filters.

### Dependencies
- `bookings`, `payment_transactions`, `booking_line_items`.

### Tags
`admin` · `bookings` · `list` · `filters`

### Notes / Rationale
The bookings table is the most-used surface in the admin panel; optimising first paint and pagination matters more than complex join columns.

---

## US-AD-002 — Bookings filters (date range, status, activity, coach, payment method, payment status, booking id)

### Story
As an admin,
I want to filter the bookings table by date range, status, activity, coach, payment method, payment status, and exact booking id,
So that I can narrow operations to today's confirmed cash-on-arrival bookings for the file drawer or look up a specific booking by id.

### Priority: P0
### Status: Draft
### Estimate: 5
### Sprint: Sprint 4 — Admin Operations MVP

### Actors
- **Primary actor:** Admin.

### Preconditions
1. Admin at `/admin/bookings`.

### Postconditions
1. Each filter persists to URL; URL is shareable.

### Main Flow (Happy Path)
1. Filter sidebar collapses on mobile.
2. Admin opens the Filter pane; applies date range `2026-07-28` to `2026-07-28`, status `confirmed`, payment method `vodafone_cash`.
3. The table refreshes with the filtered scope; URL becomes `/admin/bookings?date_from=2026-07-28&date_to=2026-07-28&status=confirmed&payment_method=vodafone_cash`.
4. "Clear filters" button resets to defaults.

### Alternate Flows

#### A1 — `booking_id` supplied exact-match takes precedence
1. URL adds `&booking_id=ROW-2026-0412`; table scoped to that exact row.

### Exception Flows

#### E1 — Bad date range (from > to)
1. UI bounces back; toast "Start date must precede end date".

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Bookings filters

  Scenario: Applying multiple filters
    Given the admin filters date range 2026-07-28 to 2026-07-28 status confirmed payment_method vodafone_cash
    Then the URL contains those params
      And the table shows only confirmed Vodafone Cash bookings for that day

  Scenario: Exact booking_id filter wins
    Given admin adds booking_id="ROW-2026-0412"
    Then the table contains only that booking id
```

### Edge Cases
1. Multi-select activity+coach — admin can select multiple activities and coaches; the URL encodes as comma-separated.

### UI/UX Specifications
- Filter sidebar 320px; toggle button on mobile.

### Data Model
Uses filters against the `admin_bookings_list` view.

### API Endpoints
- Same as US-AD-001 with the query params.

### Security Considerations
- zod validation per filter param; reject harmful SQL meta.

### Performance Requirements
- Filter apply p95 < 400 ms.

### Notifications
- None.

### Localization
- Date picker locale-aware.

### Error Handling
- `invalid_date_range` 400.

### Logging & Analytics
- `admin.bookings.filter.applied` `{ filters }`.

### Testing Notes
- Unit: filter map construction; E2E apply filter form.

### Related User Stories
- US-AD-001.

### Dependencies
- None.

### Tags
`admin` · `bookings` · `filters`

### Notes / Rationale
Filters share URL state with the heatmap deep-link so a click from the heatmap surfaces the same filtered table directly.

---

## US-AD-003 — Bookings search by customer name or phone (case-insensitive ILIKE)

### Story
As an admin,
I want a search box that finds bookings by customer name (Salma Akl) or phone (+201011329642) using case-insensitive ILIKE,
So that I can locate a customer's booking when they call the academy without their booking id.

### Priority: P0
### Status: Draft
### Estimate: 3
### Sprint: Sprint 4 — Admin Operations MVP

### Actors
- **Primary actor:** Admin.

### Preconditions
1. Admin at `/admin/bookings`.

### Postconditions
1. Search updates `q` query param; table filters accordingly.

### Main Flow (Happy Path)
1. Admin types "salma" in the search box.
2. URL becomes `/admin/bookings?q=salma` and the table filters by `profiles.full_name ILIKE '%salma%'` or `profiles.phone ILIKE '%salma%'`.
3. Admin types "+201011329642"; results filtered to that exact phone (or tail).

### Alternate Flows

#### A1 — No matches
1. Empty state "No bookings match this search".

### Exception Flows

#### E1 — Search times out
1. Inline toast.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Bookings search

  Scenario: Name search finds by full_name ILIKE
    When the admin searches "salma"
    Then the table lists bookings owned by customers whose full_name contains "salma" (case-insensitive)

  Scenario: Phone search finds by exact tail
    When the admin searches "9642"
    Then the table lists bookings whose customer profile.phone ends in "9642"
```

### Edge Cases
1. Customer phone is `+20 101 132 9642` (with spaces) — normalised at insert; search also normalises.
2. Customer phone contains spaces in the search query — normalised server-side before ILIKE.

### UI/UX Specifications
- Sticky search box above the table.

### Data Model
Reads same view. Adds a GIN index on `profiles`:

```sql
create extension if not exists pg_trgm;
create index profiles_full_name_trgm on profiles using gin (full_name gin_trgm_ops);
create index profiles_phone_trgm       on profiles using gin (phone gin_trgm_ops);
```

### API Endpoints
- Same as US-AD-001 with the `q` param.

### Security Considerations
- Sanitised by parameterising in ILIKE; no SQL injection vector.

### Performance Requirements
- ILIKE p95 < 300 ms with trigram index.

### Notifications
- None.

### Localization
- Search placeholder EN/AR.

### Error Handling
- `query_timeout` 504.

### Logging & Analytics
- `admin.bookings.search` `{ query_length_bucket }`.

### Testing Notes
- Performance test against 100k profiles.

### Related User Stories
- US-AD-001.

### Dependencies
- Trigram index.

### Tags
`admin` · `bookings` · `search` · `pg_trgm`

### Notes / Rationale
Phone searchtail-match is the most common admin use case ("Customer calls with phone numbers ending in..."); the trigram index keeps it instant.

---

## US-AD-004 — Booking detail drawer

### Story
As an admin,
I want a booking detail drawer that summarises the customer, the line items, the payment transaction history, the booking-event timeline, and a link to the customer message thread, with action buttons (cancel, refund, mark attended, mark no-show, reassign, override) — all in one screen,
So that I can act on a single booking without bouncing between six pages.

### Priority: P0
### Status: Draft
### Estimate: 8
### Sprint: Sprint 4 — Admin Operations MVP

### Actors
- **Primary actor:** Admin.

### Preconditions
1. Booking id resolves (or human_id resolves).

### Postconditions
1. Drawer surfaces full context (customer summary, line items, payments, timeline, messages link, actions).

### Main Flow (Happy Path)
1. Admin clicks "View" on a bookings-table row, or deep-links to `/admin/bookings/[id]`.
2. SSR fetches the booking with all nested joins: profiles, slots, activity, coach, line_items, payment_transactions, booking_events, customer_messages_count.
3. Renders four tabs: Summary · Timeline · Payments · Messages.
4. Summary tab: customer card (name, phone, email, dob, locale, emergency contact), slot card (date/time/duration/location), party summary, line items with totals.
5. Timeline tab: chronological `booking_events` list (created, confirmed, cancelled, refunded, attended, no_show, reassigned, cash_collected, payment_failed).
6. Payments tab: `payment_transactions` rows per booking with intent id, method, status, captured_at, refunded_at.
7. Messages tab: compact thread summary linking to `/admin/messages/<customer_id>`.
8. Action buttons in the header rail: Cancel · Refund · Mark attended · Mark no-show · Reassign · Override payment · Export PDF.

### Alternate Flows

#### A1 — Booking has no payment_transactions (package redemption)
1. Payments tab shows "Paid via 8-pack + 1 free (no Paymob transaction)".

### Exception Flows

#### E1 — Booking not found
1. 404 themed page.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Booking detail drawer

  Scenario: Drawer renders all four tabs
    Given a confirmed booking "ROW-2026-0412"
    When the admin opens the drawer
    Then the Summary, Timeline, Payments, Messages tabs render
      And the action rail contains Cancel, Refund, Mark attended, Mark no-show, Reassign, Override payment, Export PDF

  Scenario: Timeline shows chronological events
    Given the booking was created, confirmed, then attended
    Then the Timeline tab shows three events in chronological order with actor names and timestamps
```

### Edge Cases
1. Customer on the booking was deleted post-hoc; drawer renders the snapshot `emergency_contact_snapshot` from `bookings` even when the profile is gone.

### UI/UX Specifications
- Desktop: right-side drawer 720px; full-height sticky action rail.
- Mobile: full-screen modal; sticky action rail collapses into a hamburger menu.

### Data Model
Reads `bookings` + `profiles` + `slots` + `booking_line_items` + `payment_transactions` + `booking_events` + `customer_messages`.

```sql
booking_events
  id           uuid pk default gen_random_uuid()
  booking_id   uuid not null references bookings(id) on delete cascade
  event_type   text not null check (event_type in
                ('created','confirmed','cancelled','refunded_partial','refunded_full',
                 'marked_attended','marked_no_show','reassigned','payment_captured',
                 'payment_failed','cash_collected','status_overridden','waitlist_fulfilled'))
  actor_id     uuid references auth.users(id) on delete set null
  actor_role   text check (actor_role in ('admin','coach','customer','system'))
  meta         jsonb not null default '{}'::jsonb
  created_at   timestamptz not null default now()
  index on (booking_id, created_at desc)
  -- RLS: admin SELECT all; coach SELECT for assigned bookings; customer SELECT own;

payment_transactions
  id                    uuid pk default gen_random_uuid()
  booking_id            uuid not null references bookings(id) on delete cascade
  paymob_intent_id      text                                       -- Paymob intent id
  amount_piasters       bigint not null check (amount_piasters >= 0)
  currency              text not null default 'EGP'
  method                text not null check (method in
                          ('card','vodafone_cash','instapay','fawry','cash_on_arrival'))
  status                text not null check (status in
                          ('intent_created','challenged','captured','refunded_partial',
                           'refunded_full','failed','voided')) default 'intent_created'
  captured_at           timestamptz
  refunded_at           timestamptz
  paymob_signature_ok   boolean not null default false
  raw_payload           jsonb                                       -- last Meta webhook payload
  created_at            timestamptz not null default now()
  index on (booking_id, created_at desc)
  index on (paymob_intent_id) where paymob_intent_id is not null
  -- RLS: admin SELECT all; coach SELECT only rows of bookings coach assigned to
```

### API Endpoints
- `GET /api/admin/bookings/[id]`.

### Security Considerations
- Admin role gate + RLS.

### Performance Requirements
- Drawer SSR p95 < 500 ms (parallel queries).

### Notifications
- The action rail surfaces pending waitlist offers count if applicable.

### Localization
- All tab labels EN/AR; date formats locale-aware.

### Error Handling
- `booking_not_found` 404.

### Logging & Analytics
- `admin.bookings.drawer.viewed` `{ booking_id }`.

### Testing Notes
- E2E: open drawer from list; assert all tabs populate.

### Related User Stories
- US-AD-005..017 action targets.

### Dependencies
- All booking-related tables.

### Tags
`admin` · `bookings` · `drawer` · `timeline`

### Notes / Rationale
The drawer is the cockpit of operations; consolidating prevents the "twenty tabs open at once" pattern observed in the Wix era.

---

## US-AD-005 — Manual booking creation (admin on behalf of customer)

### Story
As an admin taking a phone call from a customer who wants to book a Rowing session for tomorrow,
I want to create the booking on their behalf through a manual flow that supports walk-in cash, a Paymob payment link, or a card on file,
So that we never lose a conversion to a customer who is unwilling to navigate the website.

### Priority: P1
### Status: Draft
### Estimate: 8
### Sprint: Sprint 4 — Admin Operations MVP

### Actors
- **Primary actor:** Admin.
- **Secondary actor:** Customer (phone-in).

### Preconditions
1. Admin has the customer's phone and ideally name.
2. There is an open slot for the requested date/time.

### Postconditions
1. A `bookings` row exists with the appropriate `payment_method` (cash_on_arrival, card, payment_link).
2. If `cash_on_arrival`, the booking `status='pending'` until admin later marks paid per US-AD-011.
3. If pay-by-link, a Paymob payment link is WhatsApped to the customer per US-CN-007 (variant) and the booking waits for capture webhook.
4. If card-on-file exists, the booking `status='confirmed'` immediately, captured on file.

### Main Flow (Happy Path)
1. Admin opens `/admin/bookings/new`.
2. Searches for the customer by phone; if found, prefills profile; if not, creates a new `profiles` placeholder row marked "admin imported".
3. Admin selects the activity, tier, slot, party_size, addons (mirrors the customer funnel in US-BF-001..010).
4. Admin selects the payment method (cash_on_arrival / card_on_file / payment_link).
5. On submit, server creates the booking transactionally:
   - Cash: status='pending' payment_method='cash_on_arrival'; WhatsApp dispatched "Reservation at the academy; pay on arrival" via US-CN-003 variant.
   - Card on file: stored card's saved token is captured; booking 'confirmed'.
   - Payment link: Paymob generates a payment URL; WhatsApp dispatched via US-CN-007 analog with the link.
6. Booking appears in the customer's Upcoming tab.

### Alternate Flows

#### A1 — Customer wants to pay later with Paymob payment link
1. The system creates the link with 24h expiry; if not captured, booking auto-cancels.

### Exception Flows

#### E1 — Slot was taken by another customer mid-form
1. Server rejects `slot_full`; the form surfaces the conflict and offers next available.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Manual booking creation

  Scenario: Cash-on-arrival manual booking
    Given admin creates a booking for Salma Akl on Rowing with cash-on-arrival
    When she submits
    Then a pending booking exists with payment_method="cash_on_arrival"
      And Salma receives a WhatsApp confirming her reservation with a pay-at-academy reminder
      And booking_events records event_type="created" actor_role="admin"

  Scenario: Payment link manual booking
    Given admin selects payment_link
    When she submits
    Then a pending booking exists and Salma receives a WhatsApp with the Paymob link valid for 24h
      And if Salma pays within 24h, the booking transitions to confirmed via Paymob webhook

  Scenario: Card on file
    Given an existing customer with a stored token
    When admin selects card_on_file
    Then the booking is immediately confirmed
```

### Edge Cases
1. Admin creates booking for slot in the next 30 minutes — still allowed; cash collection is implied.

### UI/UX Specifications
- Form mimics the customer funnel for muscle-memory parity.

### Data Model
Reads `profiles`, `slots`, `activity_add_ons`. Writes `bookings` + `booking_events`. No new tables.

### API Endpoints
- `POST /api/admin/bookings/new` (admin role) supports the three payment paths.
- `POST /api/admin/bookings/new/payment-link` returns the Paymob URL.
- `POST /api/admin/bookings/new/card-on-file` charges the stored token.

### Security Considerations
- Admin signed in.
- Card-on-file operations require the customer to have previously authorised card storage (paymob tokenisation scope); admin can use but not see the PAN.
- Rate-limited per admin to prevent fat-finger damage: 20 creations per hour.

### Performance Requirements
- Create p95 < 600 ms (transaction).

### Notifications
- US-CN-003 fired at confirm (cash, card-on-file) or queud awaiting capture (payment link).

### Localization
- Customer receives WhatsApp in their `profiles.locale`.

### Error Handling
- `slot_full` 409; `customer_blocked` 409 if customer.deletion_request.active.

### Logging & Analytics
- `admin.bookings.manual.created` `{ payment_method }`.

### Testing Notes
- E2E: admin flows with mocked Paymob.

### Related User Stories
- US-BF-001..013 customer-side funnel mirror.

### Dependencies
- Paymob card-on-file service.

### Tags
`admin` · `manual_booking` · `cash` · `payment_link`

### Notes / Rationale
The academy works on phone-ins daily; without a manual booking path, the website rebuild would shift admin burden rather than reduce it.

---

## US-AD-006 — Manual cancel by admin (records reason; notifies customer)

### Story
As an admin,
I want to cancel a customer's confirmed booking with an explicit reason recorded, regardless of the 24h rule, and notify the customer via WhatsApp,
So that operational cancellations (bad weather, coach illness) are explicit and the customer is informed without forcing them through the customer-side cancellation UI.

### Priority: P0
### Status: Draft
### Estimate: 3
### Sprint: Sprint 4 — Admin Operations MVP

### Actors
- **Primary actor:** Admin.
- **Secondary actor:** Customer.

### Preconditions
1. Booking `status='confirmed'` or `'pending'`.

### Postconditions
1. Booking `status='cancelled'`, `cancel_reason` set (e.g. "weather", "coach_illness", "venue_incident", "admin_discretion").
2. `booking_events` row `event_type='cancelled'` actor_role='admin' meta.reason.
3. If the booking was paid by Paymob: a refund transaction is initiated per US-AD-007 (admin discretion applies inside the 24h window — admin cancel always refunds regardless of the 24h rule, the customer-doesn't-pay-for-our-cancellation principle).
4. Customer WhatsApp dispatched via US-CN-010.
5. Slot capacity restored.

### Main Flow (Happy Path)
1. Admin opens drawer; taps "Cancel".
2. Modal "Cancel booking ROW-2026-0412. Reason: [select: weather | coach_illness | venue_incident | admin_discretion | other_specify]". Optional note.
3. Submits; server transactionally cancels the booking and records booking_events + refund.
4. WhatsApp "Booking cancelled by AquaLudo" is dispatched.

### Alternate Flows

#### A1 — Package-redemption booking cancelled by admin
1. The customer_packages counter is restored; no Paymob refund.

### Exception Flows

#### E1 — Paymob refund fails
1. Booking stays `status='cancelled'`; refund retried per US-CN-016; admin alerted.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Manual cancel by admin

  Scenario: Admin cancels with weather reason
    Given admin cancels booking "ROW-2026-0412" with reason "weather"
    Then the booking status becomes "cancelled"
      And booking_events.actor_role= "admin" reason="weather"
      And a refund transaction is initiated if the booking was paid via Paymob
      And a cancellation WhatsApp is dispatched to the customer
```

### Edge Cases
1. Admin cancels inside the 24h window — refund still applies (admin-caused cancellations are always refundable).

### UI/UX Specifications
- Modal 480px; reason dropdown; notes text area; warning note "Refund of <amount> will be initiated".

### Data Model
Writes `bookings`, `booking_events`, `payment_transactions`, `whatsapp_dispatch_jobs` (File 09).

### API Endpoints
- `POST /api/admin/bookings/[id]/cancel { reason, note }`.

### Security Considerations
- Admin role gate; reason required.

### Performance Requirements
- Cancel p95 < 1.5 s (transaction + Paymob refund + dispatch enqueue).

### Notifications
- US-CN-010 cancellation received trigger to admin (loop); customer gets the cancellation WhatsApp.

### Localization
- Reason copy keys EN/AR.

### Error Handling
- `paymob_refund_failed` retry per US-CN-016.

### Logging & Analytics
- `admin.bookings.cancelled` `{ reason }`.

### Testing Notes
- Integration with Paymob refund.

### Related User Stories
- US-CA-012 customer self-cancel; US-AD-007 refund.

### Dependencies
- Paymob refund endpoint.

### Tags
`admin` · `cancel` · `refund` · `whatsapp`

### Notes / Rationale
Admin cancellations are always refundable regardless of the 24h rule; the rule is asymmetric — it protects the customer from arbitrary academy cancellations.

---

## US-AD-007 — Refund handling (full auto 24h+ at Paymob; partial override with reason)

### Story
As an admin,
I want to issue full refunds automatically (when customer self-cancels outside 24h) and partial refunds with a reason (when adjusting for a service downgrade or a missed add-on),
So that the customer's payment state is always reconciled with what was delivered.

### Priority: P0
### Status: Draft
### Estimate: 5
### Sprint: Sprint 4 — Admin Operations MVP

### Actors
- **Primary actor:** Admin (for partial); System/customer (for full).

### Preconditions
1. Booking has a captured Paymob transaction (`payment_transactions.status='captured'`).
2. For full refund initiated by customer (US-CA-012): `slot.start_at - now() >= 24h`.
3. For partial refund: an admin records a reason.

### Postconditions
1. A `payment_transactions` row with `status='refunded_full'` or `refunded_partial'` and `refunded_at` set.
2. The booking status reflects `refunded_full` (fully cancelled) or `refunded_partial` (kept attended) as appropriate.
3. `booking_events` row appended `event_type='refunded_full'` or `refunded_partial'`.

### Main Flow (Happy Path)
1. Customer self-cancels outside 24h → US-CA-012 → fast path.
2. Partial refund: admin opens drawer → Refund button → modal "Amount to refund (max <captured_amount>)" + reason text.
3. Server calls Paymob Refund API with the amount and booking_id.
4. On success: insert `payment_transactions.status='refunded_partial'` to record the refund transaction.
5. WhatsApp dispatched via US-CN-010 if applicable.

### Alternate Flows

#### A1 — Full admin refund at customer request inside the 24h window
1. Admin manually cancels first (US-AD-006) then triggers full refund.

### Exception Flows

#### E1 — Paymob refund API returns "amount exceeds captured"
1. Modal surfaces error; admin must adjust value.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Refund handling

  Scenario: Full refund on customer self-cancel outside 24h
    Given a customer cancels 30h before slot with 20000 piasters captured
    When the cancel transaction runs
    Then a payment_transactions row with status="refunded_full" amount_piasters=20000 is inserted
      And booking_events records event_type="refunded_full"

  Scenario: Partial refund with reason
    Given admin enters refund amount 5000 with reason "downgraded tier"
    Then a payment_transactions row with status="refunded_partial" amount_piasters=5000 is inserted
      And booking_events reasons meta.reason="downgraded tier"

  Scenario: Refund exceeds captured
    Given admin enters 21000 piasters when captured was 20000
    Then Paymob returns error and no refund row is inserted
```

### Edge Cases
1. Customer was a no-show and admin discretion refunds half — partial refund on captured.
2. Refund during Paymob outage — retry queue per US-CN-016.

### UI/UX Specifications
- Refund modal 480px; amount input bound by captured; reason required.

### Data Model
Writes `payment_transactions`, `booking_events`.

### API Endpoints
- `POST /api/admin/bookings/[id]/refund { amount_piasters, reason, intensity }`.
- Paymob `POST /v2/payments/refund` server-side.

### Security Considerations
- Admin role gate; service role key for Paymob.
- Amount bounds checked server-side.

### Performance Requirements
- Refund p95 < 2 s including Paymob round-trip.

### Notifications
- US-CN-010 dispatch customer cancellation WhatsApp with refund_amount param.

### Localization
- Reason options EN/AR.

### Error Handling
- `refund_amount_exceeds_captured` 422.
- `paymob_refund_failed` retry.

### Logging & Analytics
- `admin.refund.issued` `{ amount_piasters, reason, intensity }`.

### Testing Notes
- Unit: amount bounds.

### Related User Stories
- US-CA-012 customer self-cancel; US-AD-006 admin cancel.

### Dependencies
- Paymob refund API.

### Tags
`admin` · `refund` · `paymob` · `partial_refund`

### Notes / Rationale
Admin has discretion on partial refunds the 24h customer-policy strictly forbids; this is intentional asymmetry.

---

## US-AD-008 — Reassign slot to waitlist member (CENTERPIECE)

### Story
As an admin,
I want to manually pick the next waitlist member (ordered by join timestamp) when a confirmed slot frees up due to a cancellation, send the chosen member a WhatsApp with a 15-minute claim window and pay-link, and either complete their new booking on claim or fall through to re-picking or returning the slot — entirely manual, no auto-offer, no broadcast,
So that the slot stays filled without an overly-aggressive automated reassignment the user explicitly rejected in the discovery interview.

### Priority: P0
### Status: Draft
### Estimate: 13
### Sprint: Sprint 4 — Admin Operations MVP

### Actors
- **Primary actor:** Admin.
- **Secondary actor:** Customer chosen from waitlist.
- **System actor:** `waitlist_offers` table owned here; `whatsapp_dispatch_jobs` + `magic_tokens` (File 09).
- **Cross-cutting actors:** Customer (claimant); coach (assigned to new booking if specific coach picks again).

### Preconditions
1. A booking's seat capacity has been freed by a customer self-cancel (US-CA-012 inside or outside the 24h window) OR by an admin cancel (US-AD-006) OR by a no-show processing where the admin decides to backfill.
2. The freed slot still has remaining capacity that the waitlist could absorb.
3. There exists ≥1 `waitlist_entries` row for the slot with `status='pending'` OR a matching `waitlist_subscriptions` row for the activity (per File 04) with `status='active'`.

### Postconditions
1. A `waitlist_offers` row is created with `status='pending'`, `claimed_until = now() + 15 minutes`, `actor_id = admin`, `waitlist_subscription_id` linked.
2. A WhatsApp `waitlist_slot_opened` trigger (US-CN-007 File 09) is enqueued with `params={activity, slot, pay_link, expires_in_minutes=15}`.
3. A `magic_tokens` row is created for `purpose='waitlist_claim'` bound to the offer id and `expires_at = claimed_until`.
4. `waitlist_subscriptions.status` is NOT mutated; the subscription stays `active` until the offer is `fulfilled` (the customer accepted and booked) or `declined` (explicit).
5. `waitlist_entries.status` for the offered slot transitions from `pending` to `offered` for the duration of the offer; on `fulfilled` it goes to `fulfilled`; on `expired` or `declined` it reverts to `pending` so the customer remains on the slot's queue.
6. The selected customer has 15 minutes to claim via the magic token. If she claims, a new booking is constructed (the booking funnel's claim path per US-BF-013's `/booking/claim/<token>` Route Handler completes Paymob payment / package / cash redemption), the offer flips to `fulfilled`, and the slot's `capacity_used` increments.
7. If she declines (explicit "I can't make it" link in the WhatsApp), the offer flips to `declined`; the admin is notified; the slot remains free; admin may re-pick.
8. If 15 minutes elapse without claim or decline, a cron sweep sets the offer `status='expired'`; the admin receives an admin-notification; the slot remains free; admin may re-pick.
9. Every offer transition (`pending` → `claimed`/`declined`/`expired` → `fulfilled`/`expired`) is audited into `booking_events` for the original cancelled booking with `event_type='reassigned'` meta carrying the offer id and new booking id (post-claim).
10. No automatic offering to the next waitlist member happens. The next pick is always an admin action.

### Main Flow (Happy Path)
1. A customer cancels booking `ROW-2026-0412` (a Rowing foundation slot for Sat 2026-08-15 at 09:00 with capacity 2).
2. The cancel transaction (per US-CA-012) restores `slots.capacity_used` from 2 to 1 and inserts `booking_events` for the original booking.
3. US-CN-010 fires the "admin_new_cancellation" WhatsApp to admins, with `waitlist_count` reflecting how many `waitlist_subscriptions` rows are `active` for that activity and slot.
4. An admin taps the cancellation WhatsApp link → opens `/admin/bookings/<cancelled_booking_id>` drawer.
5. The drawer action rail surfaces a "Pick from waitlist" button (visible whenever the slot's `capacity_used < capacity` and there is ≥1 `waitlist_subscriptions` or slot-level `waitlist_entries` member `pending`).
6. Admin taps "Pick from waitlist". The list modal opens listing every eligible member sorted by `joined_at ASC` (oldest first). Each member row shows: customer name, phone (last 4 digits), joined timestamp, preferred_times (if provided), tenure (days on waitlist), and number of prior fulfilled offers.
7. Admin taps the topmost member (`Salma Akl`, joined 2026-07-12, 16 days tenure). The modal confirms by listing activity, slot, and reminding admin of the "15-minute claim window" rule.
8. Admin taps "Send offer". Server-side transaction:
   a. Insert `waitlist_offers(waitlist_subscription_id, slot_id, offered_at=now(), claimed_until=now()+15m, status='pending', actor_id=admin_id)`. Uniqueness enforced on `(waitlist_subscription_id, slot_id, status='pending')` so a second concurrent offer to the same member-slot is rejected 409.
   b. Insert `magic_tokens(user_id=member, purpose='waitlist_claim', ref_id=offer.id, expires_at=claimed_until)`.
   c. Transition `waitlist_entries.status='offered'` for the (member, slot) row (if it exists). Slot-level entries may be sparse when the member joined globally per US-CA-017; in that case no row is updated; the activity-level subscription alone carries the eligibility.
   d. Call `enqueueTrigger('waitlist_slot_opened', offer.id, customer_id)` to enqueue the US-CN-007 dispatch with params `{customer_name, activity, slot_start, pay_link}`.
9. Within ≤60 seconds, the customer receives the WhatsApp. The deep link URL is `/booking/claim/<token>`.
10. The admin's drawer surfaces an "Offer sent to Salma Akl — claim window expires 14:53" pill counting down.
11. The customer taps the link; the claim page (File 03 SSR) verifies the magic token (single-use, within `expires_at`), validates that the offer `status='pending'`, and primes the booking funnel with the offered slot and activity preselected.
12. Customer completes payment (Paymob or package or cash per US-BF-009/010/012/013). The booking intent is created with `event_id=null`, the slot, party_size=1 (default; editable if capacity allows — the offer does NOT preserve the original cancelled booking's party size).
13. On Paymob capture (or package/membership redeem/cash reservation), the server transaction:
    a. Insert `bookings` row with `user_id=member`, the chosen `payment_method`, the slot reference, `status='confirmed'`.
    b. Increment `slots.capacity_used` by the new booking's party_size atomically (RLS-row-locked SELECT FOR UPDATE on `slots`).
    c. Update `waitlist_offers.status='fulfilled'`.
    d. Insert `booking_events` row against the original cancelled booking with `event_type='reassigned'` `meta={offer_id, new_booking_id}` so the audit trail ties together.
    e. Optionally update `waitlist_subscriptions.status='fulfilled'` if the customer has now been fulfilled and the admin configured a "fulfillment closes subscription" policy (off by default per the user's "stay on waitlist" intent).
    f. Enqueue `booking_confirmed` dispatch (US-CN-003) for the new booking.
14. The admin drawer's countdown pill flips to "Offer redeemed — new booking ROW-2026-0413".

### Alternate Flows

#### A1 — Customer declines explicitly
1. The WhatsApp body contains a "I can't make it" magic-token-signed link (purpose=`waitlist_decline`).
2. On tap, the server exchanges the token, sets `waitlist_offers.status='declined'`, optionally notifies the customer ("You'll stay on the waitlist — admin will keep picking from the queue") and the admin ("Salma declined").
3. The slot remains free; admin may re-pick.

#### A2 — The customer does not act within 15 minutes (no declined, no claimed)
1. A Vercel Cron (`*/5 * * * *`) sweeps `waitlist_offers WHERE claimed_until < now() AND status='pending'` and transitions them to `status='expired'`.
2. The admin receives an admin-notification trigger (`admin_waitlist_offer_expired`).
3. The slot remains free; admin may re-pick per the same flow.

#### A3 — Admin picks a different waitlist member than the topmost
1. Admin manually selects a non-topmost row. The modal warns "Salma Akl joined earlier than Ahmed M. — confirm?" The admin can confirm or back out. The admin choice is final and audited into `audit_logs` (File 05) `action="waitlist_offer_skipped_member"` with `meta.skipped_member_id`.

#### A4 — Two admins pick the same waitlist member simultaneously
1. The unique constraint `(waitlist_subscription_id, slot_id, status='pending')` rejects the second insert with 409; the duplicate offer is silently discarded; the admin who lost sees toast "Offer already submitted by another admin".

#### A5 — The waitlist member has an active package they may want to use
1. The claim page surfaces "Use package session" option per US-BF-009 if the activity is covered by their active package. The WhatsApp message in US-CN-007 mentions "Got a package session? You can use it."

### Exception Flows

#### E1 — Slot was filled by another booking mid-offer
1. Between `waitlist_offers.offered_at=now()` and the customer's claim, the slot may have been filled by a Cash-on-arrival manual booking (US-AD-005) creating an over-capacity race. The server validate-and-flip transaction at claim rejects with `slot_full` 409; the customer sees toast "Sorry, the slot just filled — please choose another or stay on the waitlist"; the offer transitions to `expired` if the slot's `capacity_used >= capacity`.

#### E2 — Magic token validation fails (expired / replayed / tampered)
1. The claim page surfaces "Offer expired. Ask admin to re-pick from the waitlist." The `waitlist_offers.status` is unaffected; admin sees the stale offer on the dashboard list and can re-pick.

#### E3 — Customer tried to claim but Paymob payment fails (3DS challenge cancelled, etc.)
1. The booking intent is recorded as a stale `pending` booking; the original `waitlist_offers.status='pending'` remains; the 15-minute clock may tick past while the customer retries. Once the customer's Paymob webhook posts success, it confirms (per US-BF-013). If the 15 minutes elapse without success, the cron sweep expires the offer; the slot remains free; the `pending` booking moves to a cancellation by the pending-booking-expiry sweep owned by File 10.

#### E4 — Customer's attempt to claim times out the entire Fincl flow
1. The 15-minute claim countdown reduces the customer's trial. If the customer is mid-Paymob-redirect at minute 14, the Paymob capture webhook may land at minute 15:01 — server logic treats `captured_at <= claimed_until + 60s grace` as still redeemable: the offer auto-promotes to `fulfilled`, the booking `confirmed`, and the dispatch fires. Past the 60s grace, the cron sweep expires and the slot frees; the captured payment is auto-refunded by the server per US-AD-007 partial-refund variant "waitlist_offer_grace_overflow" with reason recorded.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Reassign slot to waitlist member (manual pick, 15-minute claim)

  Scenario: Admin opens the waitlist pick modal
    Given a confirmed booking "ROW-2026-0412" was just cancelled and 3 active waitlist_subscriptions exist for the same activity
    When the admin opens the drawer
    Then the action rail surfaces a "Pick from waitlist" button with a count badge "3"

  Scenario: Pick lists members ordered by joined_at ASC
    Given the modal is open
    Then members are listed in joined_at ascending order with name, phone tail, preferred_times, joined timestamp, tenure days

  Scenario: Admin sends offer; member receives WhatsApp with 15-minute claim window
    When the admin taps "Send offer" on the topmost member
    Then a waitlist_offers row exists with claimed_until = now + 15 minutes
      And waitlist_entries.status for (member, slot) becomes "offered"
      And a magic_tokens row exists with purpose="waitlist_claim" expires_at=claimed_until
      And a waitlist_slot_opened WhatsApp is dispatched to the member within 60 seconds

  Scenario: Member claims and pays within 15 minutes
    When the member taps the link and completes Paymob payment
    Then a new booking is confirmed, slots.capacity_used increments, waitlist_offers.status="fulfilled"
      And booking_events on the original cancelled booking records event_type="reassigned" meta.offer_id meta.new_booking_id

  Scenario: Member declines
    When the member taps "I can't make it" in the WhatsApp
    Then waitlist_offers.status="declined"
      And the admin receives an admin notification
      And the slot remains free for admin to re-pick

  Scenario: 15-minute silence auto-expires
    Given an offer was sent 16 minutes ago with no action
    When the cron sweeps
    Then waitlist_offers.status="expired"
      And the admin notification fires "admin_waitlist_offer_expired"

  Scenario: No auto-offer or broadcast ever happens
    Given a slot freed up
    Then queued waitlist members do not receive any WhatsApp automatically
      And only the admin's pick creates an offer

  Scenario: No-API-dup: same member+slot offer rejected
    Given two admins simultaneously send offer for the same (member, slot)
    Then only the first succeeds; the second is rejected 409
```

### Edge Cases
1. Admin picks the same customer they previously expired for this slot — admin can override the modal warning "Salma had an expired offer for this slot last week. Proceed?"; procedurally the admin choice still wins.
2. Customer has a double-booked window (a confirmed booking overlapping the offered slot) — the claim page validates `profiles.id` against existing bookings in the window and surfaces a conflict; customer can choose to cancel the old booking from within the claim page (per US-CA-012).
3. Customer's waitlist subscription was paused but slot-level `waitlist_entries` still pending — admin's modal lists both. On `fulfilled`, the activity-level subscription remains in whatever state it was; the slot-level entry transitions `fulfilled`.
4. The original cancelled booking was a Cash-on-arrival booking — the slot capacity_used was already decremented at cancel; the reassignment flow is identical.
5. The slot had partial capacity remaining before the cancellation; the waitlist offer is still issued because the admin repeatably picks until `capacity_used = capacity` (e.g. capacity 4, freed 1 → offer; claimed; admin re-opens list to pick next if remained < expected fill).
6. Customer's WhatsApp "opted_out" status changed after the offer was sent — the dispatcher already attempted the send; if undelivered, the offer status eventually flips to `expired` regardless (claim window from the dispatcher's perspective runs from `offered_at`).
7. The admin's phone-in notice was that a customer called about the slot; admin reassigns to a waitlist member who is not the caller — the caller may book through the regular funnel only if the slot capacity allows.

### UI/UX Specifications
- Desktop: list modal 720px max-height 60vh with scroll; each row 80px tall.
- Mobile: full-screen sheet; each row 56px; tap to select; long-press for member detail.
- Countdown pill in the drawer header rail; reaches red at 5 minutes.
- "Send offer" button disabled when the member has an existing `pending` offer for the slot (rare).
- After offer creation, the drawer replaces the button with "View active offer" linking to `/admin/waitlist-offers/<offer_id>`.
- On fulfilment, the drawer's "Original booking" action button shows the new `bookings.human_id` linked.
- RTL: list ordered right-to-left; countdown renders Arabic-Indic digits in AR locale.

### Data Model

```sql
waitlist_offers
  id                       uuid pk default gen_random_uuid()
  waitlist_subscription_id uuid references waitlist_subscriptions(id) on delete cascade
  slot_id                  uuid not null references slots(id) on delete cascade
  activity_id              uuid not null references activities(id) on delete cascade
  offered_at               timestamptz not null default now()
  claimed_until            timestamptz not null                  -- offered_at + 15 minutes
  status                   text not null check (status in
                             ('pending','claimed','expired','declined','fulfilled')) default 'pending'
  actor_id                 uuid references auth.users(id) on delete set null
  claimed_at               timestamptz
  new_booking_id           uuid references bookings(id) on delete set null
  decline_token            uuid                                  -- optional, fills waitlist_decline magic_tokens row
  created_at               timestamptz not null default now()
  unique (waitlist_subscription_id, slot_id, status) where status = 'pending'
  index on (slot_id, status, offered_at)
  index on (claimed_until, status) where status = 'pending'      -- cron sweep index
  -- RLS: admin SELECT all; customer SELECT own; service role UPDATE; coach SELECT none
```

The cron sweep is a Vercel Cron at `*/5 * * * *` calling `POST /api/admin/waitlist-offers/sweep-expired`:

```sql
create or replace function sweep_expired_waitlist_offers() returns int
language sql security definer set search_path = public as $$
  with expired as (
    update waitlist_offers
       set status = 'expired'
     where status = 'pending'
       and claimed_until < now()
     returning id
  )
  select count(*)::int from expired;
$$;
grant execute on function sweep_expired_waitlist_offers() to service_role;
```

The booking-events append for the original cancelled booking on reassignment:

```sql
-- Trigger inside /api/admin/bookings/[id]/reassign (admin role):
insert into booking_events (booking_id, event_type, actor_id, actor_role, meta)
  values (:original_booking_id, 'reassigned', :admin_user_id, 'admin',
          jsonb_build_object('offer_id', :offer_id, 'new_booking_id', :new_booking_id));
```

The admin pick Route Handler:

```sql
create or replace function create_waitlist_offer(
  p_waitlist_subscription_id uuid,
  p_slot_id                  uuid,
  p_actor_id                 uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_offer_id  uuid;
  v_slot       slots%rowtype;
  v_member_id  uuid;
  v_activity_id uuid;
  v_token      uuid;
begin
  select * into v_slot from slots where id = p_slot_id for update;
  if not found then raise exception 'slot_not_found'; end if;
  if v_slot.capacity_used >= v_slot.capacity then raise exception 'slot_full'; end if;
  select user_id, activity_id into v_member_id, v_activity_id
    from waitlist_subscriptions
   where id = p_waitlist_subscription_id
     and status = 'active'
   for update;
  if not found then raise exception 'subscription_not_active'; end if;

  insert into waitlist_offers (waitlist_subscription_id, slot_id, activity_id, actor_id)
  values (p_waitlist_subscription_id, v_slot.id, v_activity_id, p_actor_id)
  on conflict (waitlist_subscription_id, slot_id, status) where status = 'pending'
    do nothing
  returning id into v_offer_id;
  if v_offer_id is null then
    raise exception 'offer_already_pending';
  end if;

  -- update slot-level waitlist_entries to offered if any:
  update waitlist_entries
     set status = 'offered'
   where user_id = v_member_id
     and slot_id = p_slot_id
     and status = 'pending';

  -- magic token issue is outside the DB (handled by the Route Handler call to File 09 service).
  return v_offer_id;
end;
$$;
grant execute on function create_waitlist_offer(uuid, uuid, uuid) to admin;
```

### API Endpoints
- `GET /api/admin/bookings/[id]/reassign` — opens the pick modal listing eligible waitlist_subscriptions + slot-level entries sorted by joined_at ASC.
- `POST /api/admin/bookings/[id]/reassign` — accepts `{waitlist_subscription_id, slot_id}` and calls `create_waitlist_offer` RPC, then issues a magic token via File 09 service and calls `enqueueTrigger('waitlist_slot_opened', offer_id, customer_id)` via the dispatcher.
- `GET /api/admin/waitlist-offers` — list active pending offers with countdown.
- `POST /api/admin/waitlist-offers/sweep-expired` — Vercel-Cron-protected.
- `POST /booking/claim/<token>` (File 03 executes the booking creation; File 07's offer redemption path is server-side here as part of the Paymob capture update).

### Security Considerations
- Admin role gate enforced on every pick Route Handler (RLS `waitlist_offers` admin-bypass for read; service role for INSERT).
- The unique partial index on `(waitlist_subscription_id, slot_id, status) WHERE status='pending'` is the technical foundation preventing accidental double-offers from concurrent admins.
- Magic tokens are single-use, hashed, and explicitly `purpose='waitlist_claim'`; reuse after expiry or fulfilment is impossible.
- The 60-second grace window for late Paymob capture is non-negotiable — over-refusing customers who completed payment at `15:01` is hostile UX. The auto-refund on grace-overflow is silent to the customer (no payment captured stays as ignored contradictory state).
- No automatic broadcasts: the dispatcher refuses to enqueue offers from anywhere but the admin pick Route Handler. Triggers that redux through database events cannot proxy here.

### Performance Requirements
- Pick RPC p95 < 300 ms (DB transaction).
- Offer send → WhatsApp received by customer < 60 seconds end-to-end.
- Cron sweep iteration p95 < 2 seconds even at 1000 stale offers.
- Cron frequency allows the 15-minute deadline a tolerance band of ±5 minutes (deadline is 15 minutes from `offered_at`, not 15 cron cycles).

### Notifications
- US-CN-007 `waitlist_slot_opened` is the customer-facing offer WhatsApp.
- US-AD-013 admin notification when an offer is expired with no action ("admin_waitlist_offer_expired").
- US-CN-003 `booking_confirmed` fires for the new booking after claim/capture.
- US-CN-010 fires origin cancellation WhatsApp to the original cancelling customer (handled separately by US-CA-012).

### Localization
- Offer WhatsApp template `aqualudo_waitlist_offer_v1` (File 09) ships EN/AR with the 15-minute countdown and pay-link.
- Pick modal labels EN/AR.
- Admin notifications templated.

### Error Handling
- `subscription_not_active` 409 (the chosen member's subscription was paused/fulfilled between list render and pick).
- `offer_already_pending` 409 (concurrent duplicate).
- `slot_full` 409 (filled by a manual booking mid-pick).
- `claim_slot_filled` 409 on the customer's claim path (File 03 handles but logged here).

### Logging & Analytics
- `admin.waitlist_offer.pick_initiated` `{ subscription_id, slot_id }`.
- `admin.waitlist_offer.offer_sent` `{ offer_id, member_id }`.
- `admin.waitlist_offer.fulfilled` `{ offer_id, new_booking_id }`.
- `admin.waitlist_offer.declined` `{ offer_id }`.
- `admin.waitlist_offer.expired` `{ offer_id }`.
- `admin.waitlist_offer.skipped_member` `{ picked_at_rank }` — fired when admin picks non-topmost.

### Testing Notes
- Unit: create_waitlist_offer RPC with the unique-constraint duplication case; sweep math; grace-window math.
- Integration: end-to-end pick → magic token → booking claim → Paymob capture → fulfilment.
- E2E pair test: two admins picking same member simultaneously; assert 409 on the second.
- Forensic: simulate a 15:01 Paymob capture; confirm 60s-grace auto-fulfilment.
- Forensic: simulate 15:02 Paymob capture; confirm auto-refund.

### Related User Stories
- US-CA-012 (File 04) customer self-cancel triggers this flow when waitlist is non-empty.
- US-AD-006 admin cancel also triggers.
- US-BF-015 (File 03) the waitlist join that produces `waitlist_entries` consumed here.
- US-CA-017 (File 04) `waitlist_subscriptions` produced independently.
- US-CN-007 (File 09) outbound WhatsApp transport for the offer.
- US-CN-014 (File 09) preferences consulted before sending.

### Dependencies
- File 09 dispatcher and magic-token service.
- File 04 customer waitlist_subscriptions table.
- File 03 booking funnel claim path.

### Tags
`admin` · `waitlist_offer` · `manual_pick` · `15min` · `centerpiece`

### Notes / Rationale
The user's locked decision was: "Waitlist replacement: ADMIN manually picks the next person from waitlist — NOT auto-offer, NOT broadcast." This story honours that explicit choice by requiring an admin touch on every offer and by forbidding any code path that could create an offer without admin intent. The 15-minute claim window balances customer urgency against slot inventory hold cost; the manual re-pick path keeps operational control in the academy's hands. The single-most-tested flow in v1 because of the coupling and the user's emphasis.

---

## US-AD-009 — Mark no-show (post-slot-end; no refund; flag history; consume package counter optional)

### Story
As an admin,
I want to mark a booking as no-show after the slot end without auto-refunding, optionally consuming a package counter if the customer prepaid,
So that the absence is recorded and feeds the dashboard cancellation/no-show rate metric without rewarding skips.

### Priority: P0
### Status: Draft
### Estimate: 3
### Sprint: Sprint 4 — Admin Operations MVP

### Actors
- **Primary actor:** Admin.
- **Secondary actor:** Coach attendance flags surface this too in US-CO-005 (File 08).

### Preconditions
1. Booking `status='confirmed'`, `slot.end_at < now()`.

### Postconditions
1. Booking `status='no_show'`.
2. `booking_events` row `event_type='marked_no_show'`.
3. No refund issued (the strict rule's flip-side).
4. If the booking was paid by package redemption: the consumed session does NOT revert. If the booking was paid by Paymob: no refund row written.

### Main Flow (Happy Path)
1. Admin opens drawer after slot end.
2. Tap "Mark no-show".
3. Modal "Booking ROW-2026-0412 is past its end time. Confirm no-show? No refund will be issued."+optional "consume package counter" checkbox if package redemption.
4. Confirm; server inserts the booking_events row and updates status.

### Alternate Flows

#### A1 — Coach marked no-show via attendance (US-CO-005)
1. The booking_events actor is `coach`; same final state.

### Exception Flows

#### E1 — Customer was actually marked attended by coach earlier (race)
1. Server refuses `booking_already_attended` 409.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Mark no-show

  Scenario: Admin marks no-show with no refund
    Given booking "ROW-2026-0412" slot ended 30 minutes ago, paid 20000 piasters by card
    When the admin confirms no-show
    Then status becomes "no_show"
      And no payment_transactions refund row is created
      And booking_events records event_type="marked_no_show"
```

### Edge Cases
1. No-show on a package redemption — counter not restored.
2. No-show as part of a group booking — party_size are all marked no_show together unless admin updates each attendee (out of scope for v1; one-click party-wide).

### UI/UX Specifications
- Modal 480px; warning bold.

### Data Model
Writes `bookings`, `booking_events`.

### API Endpoints
- `POST /api/admin/bookings/[id]/mark-no-show`.

### Security Considerations
- Admin role gate; coach with RLS-scoped assignment also permitted (File 08).

### Performance Requirements
- p95 < 300 ms.

### Notifications
- US-CN-019 admin notification optional.

### Localization
- Copy keys EN/AR.

### Error Handling
- `booking_already_attended` 409.

### Logging & Analytics
- `admin.bookings.no_show` `{ booking_id }`.

### Testing Notes
- Unit: status transition guards.

### Related User Stories
- US-CO-005 (File 08) coach attendance counterpart.

### Dependencies
- None new.

### Tags
`admin` · `no_show` · `attendance`

### Notes / Rationale
No-show rate feeds File 06's cancellation rate; honest capture and no refund protect academy revenue.

---

## US-AD-010 — Mark attended (post-slot-end; triggers post-session WhatsApp + review request)

### Story
As an admin,
I want to mark a booking as attended after the slot end, triggering the post-session WhatsApp and the 14-day review request to the customer,
So that the customer is prompted to leave a review while their memory is fresh.

### Priority: P0
### Status: Draft
### Estimate: 3
### Sprint: Sprint 4 — Admin Operations MVP

### Actors
- **Primary actor:** Admin.
- **Secondary actor:** Coach (per US-CO-005 File 08 the primary marker).

### Preconditions
1. Booking `status='confirmed'`, `slot.end_at + <now>` (post-slot).

### Postconditions
1. Booking `status='attended'`.
2. `booking_events` row `event_type='marked_attended'`.
3. The post-session review dispatch (`post_session_review`) is scheduled via cron to fire 30 minutes after slot.end_at (per US-CN-006); attending early does not fire immediately — it ensures that scheduled dispatch will fire if not already cancelled.

### Main Flow (Happy Path)
1. Admin/coach opens drawer.
2. Tap "Mark attended".
3. Confirm; server updates status and booking_events row.
4. The 30-min-after-slot review dispatch fires per US-CN-006.

### Alternate Flows

#### A1 — Coach attendance submits multiple attendees
1. US-CO-005 marks all "showed up" attendees; the cron queries `status='attended'` bookings per US-CN-006.

### Exception Flows

#### E1 — Booking already marked no-show (race) → 409.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Mark attended

  Scenario: Admin marks attended
    Given a confirmed booking whose slot ended
    When the admin marks attended
    Then status becomes "attended"
      And the post_session_review WhatsApp will fire per US-CN-006 30 min after slot.end_at
```

### Edge Cases
1. Admin marks attended then realises the customer was a no-show — admin can override back via US-AD-011 override-payment paths with reason.

### UI/UX Specifications
- Tap button in action rail.

### Data Model
No new tables.

### API Endpoints
- `POST /api/admin/bookings/[id]/mark-attended`.

### Security Considerations
- Coach allowed only if RLS-scoped assignment matches.

### Performance Requirements
- p95 < 300 ms.

### Notifications
- File 09 US-CN-006 fires at 30m-after-slot.end_at via cron (already scheduled; this row's status now matches the query filter).

### Localization
- Copy keys EN/AR.

### Error Handling
- `booking_already_no_show` 409.

### Logging & Analytics
- `admin.bookings.attended` `{ booking_id }`.

### Testing Notes
- Integration with US-CN-006.

### Related User Stories
- US-CO-005 (File 08) coach attendance path.
- US-CN-006 (File 09) review request.

### Dependencies
- File 09 cron.

### Tags
`admin` · `attendance` · `reviews`

### Notes / Rationale
This is the canonical status transition that triggers the review-request funnel; both admins and coaches can flip it, with coach's attendance submission doing so in bulk.

---

## US-AD-011 — Override payment status (mark cash-on-arrival as paid; transaction record; signed)

### Story
As an admin at the boathouse collecting cash,
I want to mark a cash-on-arrival booking as "paid" and have that signed into a transaction record and the booking confirmed,
So that the booking is recognised as paid and the coach takes attendance without ambiguity.

### Priority: P0
### Status: Draft
### Estimate: 3
### Sprint: Sprint 4 — Admin Operations MVP

### Actors
- **Primary actor:** Admin at the boathouse.

### Preconditions
1. Booking `status='pending'` and `payment_method='cash_on_arrival'`.

### Postconditions
1. `payment_transactions.status='captured'` `method='cash_on_arrival'` `captured_at=now()`.
2. Booking `status='confirmed'`.
3. `booking_events` rows `cash_collected` and `confirmed`.
4. `admin_override_log` row recorded.

### Main Flow
1. Admin taps "Override payment → Mark paid".
2. Modal "Mark cash-on-arrival paid? This action signs the cash collection." Confirm.
3. Server inserts the three records transactionally.

### Exception Flows

#### E1 — Booking was already cancelled
1. 409 `booking_cancelled` — admin must create a new booking for the customer.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Override cash-on-arrival payment

  Scenario: Admin marks cash collected
    Given a pending cash-on-arrival booking
    When the admin marks paid
    Then payment_transactions.captured_at is set
      And booking status becomes confirmed
      And admin_override_log records the action and reason "_cash_collected"
```

### Edge Cases
1. Admin marks paid then realises the customer did not actually pay — admin voids via US-AD-006 admin cancel with reason "cash_collection_error".

### UI/UX Specifications
- Modal with the audible confirmation sound on success.

### Data Model

```sql
admin_override_log
  id              uuid pk default gen_random_uuid()
  booking_id      uuid not null references bookings(id) on delete cascade
  override_type   text not null check (override_type in
                    ('payment_status','overbooking','cancel_outside_window',
                     'attendance_override','cash_collection_error'))
  reason          text not null
  admin_id        uuid not null references auth.users(id) on delete cascade
  created_at      timestamptz not null default now()
  index on (booking_id, created_at desc)
  -- RLS: admin SELECT; service role INSERT
```

### API Endpoints
- `POST /api/admin/bookings/[id]/override-payment { method, status }`.

### Security Considerations
- Admin role gate; signatures required.
- The override is audit-logged forever.

### Performance Requirements
- p95 < 400 ms.

### Notifications
- US-CN-003 dispatches on confirm (cash).

### Localization
- Modal copy EN/AR.

### Error Handling
- `booking_cancelled` 409; `unknown_override_type` 422.

### Logging & Analytics
- `admin.bookings.override.payment` `{ booking_id }`.

### Testing Notes
- Unit: override types validation.

### Related User Stories
- US-AD-016 overbooking override share this table.

### Dependencies
- audit_logs (File 05) fired alongside the override_log.

### Tags
`admin` · `override` · `cash` · `audit`

### Notes / Rationale
Cash overrides are the boathouse reality; signed overrides keep the audit honest even if web3 bros sometimes object.

---

## US-AD-012 — Payment log viewer per booking

### Story
As an admin reconciling a discrepancy,
I want a per-booking payment log showing the Paymob intent → 3DS challenge → captured → refunded timeline,
So that I can answer the customer's "where is my refund" question with evidence.

### Priority: P1
### Status: Draft
### Estimate: 3
### Sprint: Sprint 4 — Admin Operations MVP

### Actors
- **Primary actor:** Admin.

### Preconditions
1. Booking has at least one `payment_transactions` row.

### Postconditions
1. The Payments tab in the booking drawer shows every transaction and the timeline.

### Main Flow
1. Drawer → Payments tab.
2. SSR lists `payment_transactions` rows for `booking_id` created_at asc with status badges.

### Exception Flows

#### E1 — No transactions
1. Tab shows "No payment records (package / membership redemption)".

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Payment log viewer

  Scenario: Paymob intent → captured → refunded_full timeline renders
    Given a booking with 3 payment_transactions rows intent_created captured refunded_full
    Then the Payments tab displays them in chronological order with status badges
```

### Edge Cases
1. The booking had multiple intent rows due to abandonment retries — all rows visible.

### UI/UX Specifications
- Timeline component identical to Status tab's `booking_events`.

### Data Model
Reads `payment_transactions` (defined in US-AD-004).

### API Endpoints
- `GET /api/admin/bookings/[id]/payment-log`.

### Security Considerations
- Admin role gate.

### Performance Requirements
- < 200 ms.

### Notifications
- None.

### Localization
- Status labels EN/AR.

### Error Handling
- None.

### Logging & Analytics
- `admin.payments.viewed`.

### Testing Notes
- E2E: render multiple transactions.

### Related User Stories
- US-AD-004 drawer.

### Dependencies
- `payment_transactions`.

### Tags
`admin` · `payments` · `log`

### Notes / Rationale
The forensic log ends arguments with the customer's bank.

---

## US-AD-013 — Customer message thread (admin ↔ customer via WhatsApp; inbox with unread badges)

### Story
As an admin replying to a customer's WhatsApp,
I want to see the full thread on `/admin/messages` with unread badges and the ability to reply inside the app,
So that I can manage all customer WhatsApp conversations in one inbox without bouncing to the WhatsApp client.

### Priority: P0
### Status: Draft
### Estimate: 5
### Sprint: Sprint 4 — Admin Operations MVP

### Actors
- **Primary actor:** Admin.
- **Secondary actor:** Customer.

### Preconditions
1. Inbound WhatsApp conversation exists per US-CN-015 (File 09).

### Postconditions
1. Admin inbox lists threads; clicking opens the conversation; sending a reply enqueues an outbound WhatsApp via the dispatcher.

### Main Flow (Happy Path)
1. Admin opens `/admin/messages`.
2. List shows most recent threads first; unread badges per thread.
3. Admin clicks a thread → conversation panel on the right.
4. Admin types a reply → `POST /api/admin/messages` `{ customer_id, body }`.
5. Dispatcher enqueues an outbound WhatsApp using free-text if the customer's 24h conversation window is open; otherwise a template message with the body param.

### Alternate Flows

#### A1 — Outbound is a template
1. Admin selects "Reply with template" and picks an approved template; dispatcher binds params from the conversation context.

### Exception Flows

#### E1 — Customer opted out
1. Reply attempt surfaces "Customer is opted out; cannot message" toast.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Admin customer-message thread

  Scenario: Inbox opens with unread badges
    Given two unread threads
    When the admin opens /admin/messages
    Then threads listed with unread badges 2

  Scenario: Admin sends free-text within 24h window
    Given the customer's last inbound was 1 hour ago
    When the admin sends a free-text reply
    Then an outbound whatsapp_messages row is enqueued
      And it sends via Meta Cloud text endpoint
```

### Edge Cases
1. Customer sent media; admin reply cannot include media in v1 — append-only admin adds the body.

### UI/UX Specifications
- Two-pane layout (thread list left, conversation right).

### Data Model
Reads/writes `customer_messages` (owned by File 09).

### API Endpoints
- `GET /api/admin/messages`, `POST /api/admin/messages`.

### Security Considerations
- Admin RLS for reading.
- Outbounds routed only through the dispatcher (no direct Meta API call from this surface).

### Performance Requirements
- List p95 < 400 ms.

### Notifications
- US-CN-012 surfacing coach-side reply is independent.

### Localization
- Admin UI in their preferred locale.

### Error Handling
- `customer_opted_out` 403.

### Logging & Analytics
- `admin.message.reply_sent`.

### Testing Notes
- E2E: send reply.

### Related User Stories
- US-CN-015 (File 09), US-CO-007 (File 08 coach inbox).

### Dependencies
- File 09 dispatcher.

### Tags
`admin` · `messages` · `inbox` · `whatsapp`

### Notes / Rationale
One inbox, one place to reply; the admin user does not need to know whether the conversation is happening on WhatsApp or on the website.

---

## US-AD-014 — Bulk actions (bulk cancel / mark attended / export)

### Story
As an admin,
I want to select multiple bookings at once and apply a bulk action (cancel, mark attended, export),
So that managing a season-end batch or a daily closure is fast.

### Priority: P2
###Status: Draft
### Estimate: 5
### Sprint: Sprint 5 — Admin Polish

### Actors
- **Primary actor:** Admin.

### Preconditions
1. ≥2 rows selected on the table.

### Postconditions
1. Selected rows receive the chosen action; the action is appended into `booking_events` per row.

### Main Flow
1. Admin selects 12 rows via the table's check column.
2. Bulk action bar surfaces "Cancel · Mark attended · Export CSV".
3. Admin selects "Mark attended" → confirm modal.
4. Server applies per row; partial failures reported.

### Alternate Flows

#### A1 — Bulk cancel with reason
1. Modal collects one shared reason; one booking_events per row.

### Exception Flows

#### E1 — Some rows already in the chosen state
1. Row updated skipped silently; toast shows "3 already attended".

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Bulk actions

  Scenario: Bulk mark attended
    Given 12 confirmed bookings selected
    When the admin bulk-marks attended
    Then all 12 status become "attended"
      And 12 booking_events rows appended

  Scenario: Partial failure reported
    Given one of the selected bookings had already been attended
    Then the toast surfaces "1 already attended; 11 updated"
```

### Edge Cases
1. Over 100 rows selected — pagination loop or admin re-runs the bulk; capped at 100 per call.

### UI/UX Specifications
- Sticky bulk action bar slides in from the bottom when ≥1 row selected.

### Data Model
No new tables; writes through US-AD-009/010 Route Handlers.

### API Endpoints
- `POST /api/admin/bookings/bulk { ids[], action, params }`.

### Security Considerations
- Admin role gate; per-row server validation always.

### Performance Requirements
- 100 rows bulk p95 < 3 s.

### Notifications
- US-CN-003/010 dispatched per row as applicable.

### Localization
- Action labels EN/AR.

### Error Handling
- `partial_failure` 200 with `{ success_count, skipped_count, errors[] }`.

### Logging & Analytics
- `admin.bookings.bulk.{ action }` `{ count }`.

### Testing Notes
- Integration: bulk-insert against 100 seeded bookings.

### Related User Stories
- US-AD-009/010.

### Dependencies
- None new.

### Tags
`admin` · `bulk` · `actions`

### Notes / Rationale
Bulk actions save admin time at end-of-day operations.

---

## US-AD-015 — Export CSV of bookings (current filter scope; rate-limited to 10/hour; audit logged)

### Story
As an admin,
I want to export the current filter scope's bookings as CSV (max 50,000 rows) for accounting,
So that the academy's bookkeeping system has a clean monthly feed.

### Priority: P1
### Status: Draft
### Estimate: 5
### Sprint: Sprint 4 — Admin Operations MVP

### Actors
- **Primary actor:** Admin.

### Preconditions
1. Admin at `/admin/bookings` with filters applied.

### Postconditions
1. A CSV file downloads containing the rows in scope.
2. Audit log records the export with row count.

### Main Flow (Happy Path)
1. Admin taps "Export CSV".
2. Server validates ≤10 exports/admin/hour rate limit.
3. Server triggers a background job to stream the rows as CSV.
4. Browser downloads the CSV; admin audit logged.

### Alternate Flows

#### A1 — Scope > 50k rows
1. Server refuses with `export_scope_too_large`; admin narrows the date range.

### Exception Flows

#### E1 — Rate limit exceeded
1. Returns 429 with `Retry-After`.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Export CSV of bookings

  Scenario: Successful export
    Given a 1,200-row filter scope
    When the admin taps Export CSV
    Then a CSV downloads with 1,200 data rows
      And audit_logs records action="admin.export.bookings" rows=1200

  Scenario: Rate limit
    Given the admin already exported 10 times this hour
    When they attempt another
    Then 429 with code "export_rate_limited"
```

### Edge Cases
1. Arabic customer names — CSV uses UTF-8 BOM so Excel renders Arabic correctly.

### UI/UX Specifications
- "Export CSV" button at the top of the table; spinner while the stream serves.

### Data Model
Reads `admin_bookings_list` view. Audit logs to `audit_logs` (File 05).

### API Endpoints
- `GET /api/admin/bookings/export.csv` (admin).

### Security Considerations
- Per-admin rate limit via Supabase row in `export_rate_counters` table (`admin_id, hour_start, count`).
- Audit trail.

### Performance Requirements
- Stream 50k rows p95 < 10 s.

### Notifications
- None.

### Localization
- CSV column headers EN.

### Error Handling
- `export_scope_too_large` 413.
- `export_rate_limited` 429.

### Logging & Analytics
- `admin.bookings.exported` `{ row_count, filter_signature }`.

### Testing Notes
- Performance test against 50k seeded rows.

### Related User Stories
- US-AB-018 (File 05) audit log viewer consumes the audit row.

### Dependencies
- `audit_logs` (File 05).

### Tags
`admin` · `export` · `csv` · `rate_limit`

### Notes / Rationale
Accounting export keeps the academy's accountant happy; the rate limit protects the platform from accidental table dumps.

---

## US-AD-016 — Overbooking protection + admin override

### Story
As an admin,
I want the booking funnel to refuse slots at capacity, but have an override path with a logged reason when exceptional operational needs require it,
So that normal operations are protected from accidental overbooking but exceptional cases can still be served.

### Priority: P1
### Status: Draft
### Estimate: 3
### Sprint: Sprint 4 — Admin Operations MVP

### Actors
- **Primary actor:** Admin.

### Preconditions
1. `slots.capacity_used >= slots.capacity`.

### Postconditions
1. Admin inserts an `admin_override_log` row with `override_type='overbooking'`, reason text, and the admin's id.
2. The booking is created with `capacity_used` exceeding nominal `capacity` (DB constraint allows it for the service role only).
3. Audit entry updated.

### Main Flow (Happy Path)
1. Admin attempts US-AD-005 manual booking creation on a full slot.
2. Modal "This slot is at capacity. Override booking? You must record a reason."
3. Admin enters reason "VIP guest of the head coach".
4. Server inserts booking + admin_override_log row.

### Exception Flows

#### E1 — Attempt without reason
1. Refuses 422 `reason_required`.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Overbooking protection + admin override

  Scenario: Customer funnel blocked at capacity
    Given a slot at capacity 2 capacity_used 2
    When a customer tries to select party_size 1
    Then the funnel shows "Slot full"
      And no booking is created

  Scenario: Admin overbooks with reason
    Given the same full slot
    When the admin manually books with reason "VIP guest"
    Then a booking is created and capacity_used becomes 3
      And admin_override_log records override_type="overbooking"
```

### Edge Cases
1. Coach-described "showed up unannounced" — admin can overbook for the slot's exact date in the past (after-fact attendance only).

### UI/UX Specifications
- Inline warning chip on the booking form.

### Data Model
Inserts an `admin_override_log` row (defined US-AD-011).

### API Endpoints
- `POST /api/admin/bookings/new` accepts `override.reason` payload; server validates slot capacity and refuses without override.

### Security Considerations
- Reason text audit-logged; service role used; RLS confirms admin.

### Performance Requirements
- p95 < 600 ms.

### Notifications
- US-CN-003 fires normally.

### Localization
- Warning copy EN/AR.

### Error Handling
- `reason_required` 422.
- `overbooking_limit_exceeded` 422 if admin tries to exceed `slots.capacity * 1.5`.

### Logging & Analytics
- `admin.overbook.granted` `{ reason }`.

### Testing Notes
- Unit: overbook math.

### Related User Stories
- US-AD-005 manual booking.

### Dependencies
- admin_override_log.

### Tags
`admin` · `overbooking` · `override` · `capacity`

### Notes / Rationale
A hard ceiling of 1.5× capacity prevents insane overbookings from frantic clicks.

---

## US-AD-017 — Calendar week/day view (complementary to heatmap; printable PDF agenda per coach)

### Story
As an admin (or coach),
I want a calendar week/day view of bookings that is complementary to the year-round heatmap (File 06), with filter-by-coach and a printable PDF agenda per coach,
So that daily operations have a time-of-day view and the coach printable schedule lives on paper at the boathouse.

### Priority: P1
### Status: Draft
### Estimate: 8
### Sprint: Sprint 5 — Admin Polish

### Actors
- **Primary actor:** Admin or coach (coach sees their own only).
- **System actor:** PDF generator (e.g. `react-to-pdf` or `puppeteer` via Edge Function).

### Preconditions
1. Live slots published.

### Postconditions
1. `/admin/bookings/calendar` shows a 7-day calendar (default) with cell-per-slot, party size, coach, and status.
2. Per-coach filter prefills the agenda.
3. PDF export downloads a per-coach paper agenda.

### Main Flow (Happy Path)
1. Admin opens `/admin/bookings/calendar`.
2. Defaults to current week (Sunday–Saturday); week scrubber.
3. Calendar grid renders each day with its bookings as cards.
4. Admin selects coach filter = "ahmed-z"; grid filters.
5. Tap "Print PDF" → server generates the PDF.

### Alternate Flows

#### A1 — Day view toggle
1. Single-day column view.

### Exception Flows

#### E1 — PDF generator offline
1. Toast with retry.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Calendar week/day view with PDF export

  Scenario: Week view renders bookings
    Given 8 confirmed bookings next week
    When the admin opens /admin/bookings/calendar
    Then 8 cards render across 7 day columns

  Scenario: Per-coach PDF download
    Given coach filter "ahmed-z" with 5 bookings today
    When the admin taps Print PDF
    Then a PDF downloads with the coach's printed agenda
```

### Edge Cases
1. Coach on time-off booked slot not removed → admin sees anomaly marker.

### UI/UX Specifications
- Grid 7 cols × hourly rows; PDF 1-page-landscape agenda with each slot and the party list.

### Data Model
Reads `bookings` joined to `coach_session_assignments`.

### API Endpoints
- `GET /api/admin/bookings/calendar?week=&coach_id=`.
- `POST /api/admin/bookings/[id]/export-pdf`.

### Security Considerations
- Admin role gate for global view; coach role gate scoped.

### Performance Requirements
- SSR p95 < 500 ms; PDF generation p95 < 5 s.

### Notifications
- None.

### Localization
- Calendar date formats Africa/Cairo.

### Error Handling
- `pdf_generation_failed` retry.

### Logging & Analytics
- `admin.calendar.viewed` `{ week, has_coach_filter }`.
- `admin.calendar.pdf_exported`.

### Testing Notes
- E2E: view week; PDF render.

### Related User Stories
- US-HM-001 (File 06) heatmap; US-CO-002 (File 08) coach today schedule.

### Dependencies
- PDF generator.

### Tags
`admin` · `calendar` · `pdf` · `coach_agenda`

### Notes / Rationale
The PDF per-coach agenda replaces the WhatsApp printed schedule they pin on the boathouse wall.

---

## End of File 07

This file documents the admin booking-management surface for AquaLudo v2, including the waitlist-offer reassignment centerpiece (US-AD-008) that operationalises the user's locked decision that admins manually pick the next person from the waitlist. Adjacent files:

- `03-booking-flow.md` — the funnel whose Paymob capture transitions bookings to 'confirmed'; `/booking/claim/<token>` consumes the waitlist magic tokens produced in US-AD-008.
- `04-customer-account.md` — customer self-cancel (US-CA-012) triggers the cancel flow into US-AD-008; `waitlist_subscriptions` is the queue admin picks from.
- `05-admin-content-management.md` — `audit_logs` rows fired into from this file's overrides and exports.
- `06-admin-heatmap-dashboard.md` — the dashboard aggregates the booking events written here; day-detail drawer deep-links into this file's booking drawer.
- `08-coach-panel.md` — coach attendance (US-CO-005) flips booking status to 'attended' which triggers the post-session WhatsApp via File 09.
- `09-communications-notifications.md` — owns `customer_messages` consumed by US-AD-013; owns the offer WhatsApp trigger (US-CN-007) consumed by US-AD-008; owns the magic token service consumed by US-AD-008's claim path.
- `10-platform-infrastructure.md` — Vercel Cron for expired-offer sweep and pending-booking-expiry sweep; Paymob vaulted secrets.