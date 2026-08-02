# File 08 — Coach Panel User Stories

> **Project:** AquaLudo v2 (water sports academy on the Nile, Cairo, Egypt)
> **Stack:** Next.js 14 (App Router) + Supabase (Postgres + Auth + Storage) + Paymob + Meta Cloud WhatsApp API
> **Domain covered by this file:** the coach's own authenticated surface under `/coach/*` — today schedule, session detail, attendance, customer messaging, profile editing, slot template change requests, time-off requests, basic earnings, reviews about the coach, daily 7am digest, and settings. Mobile-first by design.
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
> - `07-admin-booking-management.md`
> - `09-communications-notifications.md`
> - `10-platform-infrastructure.md`

---

## How to read this document

Every user story in this file follows the same template introduced in File 01 so downstream consumers can rely on a stable shape. The 24 sections per story are:

1. **Story** — the BDD-style intent (As a... I want to... So that...).
2. **Priority / Status / Estimate / Sprint** — MoSCoW priority (P0/P1/P2), workflow status, story-point estimate, owning sprint.
3. **Actors** — who triggers the flow and who else participates.
4. **Preconditions / Postconditions** — state before and after.
5. **Main Flow (Happy Path)** — numbered sequence of system + user steps.
6. **Alternate Flows** — branches the story must support.
7. **Exception Flows** — error paths.
8. **Acceptance Criteria (Gherkin)** — Given/When/Then scenarios; each is independently testable.
9. **Edge Cases** — obscure-but-real situations.
10. **UI/UX Specifications** — mobile-first; tablet second; desktop optional.
11. **Data Model** — Supabase tables, fields, indexes, constraints. Tables owned by other files are referenced by name only.
12. **API Endpoints** — Next.js Route Handlers (App Router) and Supabase calls.
13. **Security Considerations** — RLS rules, input validation, abuse vectors.
14. **Performance Requirements** — LCP, TTI, payloads, caches, prefetch.
15. **Notifications** — WhatsApp/visual/in-app cues.
16. **Localization** — EN/AR copy keys and RTL switch.
17. **Error Handling** — codes, copy, fallback behavior.
18. **Logging & Analytics** — events to capture.
19. **Testing Notes** — unit / integration / E2E.
20. **Related User Stories** — dependencies and dependents.
21. **Dependencies** — external services, prior stories.
22. **Tags** — for cross-cutting search.
23. **Notes / Rationale** — design decisions worth recording.
24. **(Section count note)** the template's "Notes / Rationale" is the closing section.

Acceptance criteria are written in **Gherkin** (Given/When/Then) so they can be reformulated directly into Playwright assertions.

The word **must** in this document means "non-negotiable for v1 ship". **Should** means strongly recommended. **Could** means deferred to v2.

---

## Architectural Context

The coach panel is the **field tool** for AquaLudo's coaching staff. It is designed mobile-first because coaches are usually on the dock, the boat, or near the locker rooms — not at a desk. Tablet is a secondary form factor; desktop is supported but not optimised. The panel lives under `app/(coach)/coach/*` with its own layout (`app/coach/layout.tsx`) and a bottom-tab navigation: Today · Schedule · Inbox · Profile. The bottom tabs are sticky on mobile and become a side rail on tablet/desktop.

Pages owned by this file:

| Route                                       | Component path                                              | Auth           | Rendering |
|---------------------------------------------|-------------------------------------------------------------|----------------|-----------|
| `/coach`                                    | `app/(coach)/coach/page.tsx`                                | Coach          | SSR       |
| `/coach/schedule`                           | `app/(coach)/coach/schedule/page.tsx`                       | Coach          | SSR       |
| `/coach/sessions/[booking_id]`              | `app/(coach)/coach/sessions/[booking_id]/page.tsx`          | Coach          | SSR       |
| `/coach/inbox`                              | `app/(coach)/coach/inbox/page.tsx`                          | Coach          | SSR       |
| `/coach/inbox/[customer_id]`                | `app/(coach)/coach/inbox/[customer_id]/page.tsx`            | Coach          | SSR       |
| `/coach/profile`                            | `app/(coach)/coach/profile/page.tsx`                        | Coach          | SSR       |
| `/coach/profile/edit`                       | `app/(coach)/coach/profile/edit/page.tsx`                   | Coach          | SSR       |
| `/coach/slot-templates/requests`            | `app/(coach)/coach/slot-templates/requests/page.tsx`        | Coach          | SSR       |
| `/coach/time-off`                           | `app/(coach)/coach/time-off/page.tsx`                       | Coach          | SSR       |
| `/coach/earnings`                           | `app/(coach)/coach/earnings/page.tsx`                       | Coach          | SSR       |
| `/coach/ratings`                            | `app/(coach)/coach/ratings/page.tsx`                        | Coach          | SSR       |
| `/coach/settings`                           | `app/(coach)/coach/settings/page.tsx`                       | Coach          | SSR       |
| `/api/coach/sessions/[booking_id]/attendance` | `app/api/coach/sessions/[booking_id]/attendance/route.ts` | Coach          | Route     |
| `/api/coach/profile`                        | `app/api/coach/profile/route.ts`                            | Coach          | Route     |
| `/api/coach/slot-template-requests`         | `app/api/coach/slot-template-requests/route.ts`             | Coach          | Route     |
| `/api/coach/time-off`                       | `app/api/coach/time-off/route.ts`                           | Coach          | Route     |
| `/api/coach/messages`                       | `app/api/coach/messages/route.ts`                           | Coach          | Route     |
| `/api/coach/settings`                       | `app/api/coach/settings/route.ts`                           | Coach          | Route     |

The file owns the DDL for four Supabase tables:

- `coach_session_assignments` — supersedes the simple `bookings.coach_id` nullable column with a many-coach-per-booking model (lead + assistant). All booking-rendering paths read this to determine who is on the boat.
- `coach_time_off` — a coach's request for time off, awaiting admin approval.
- `coach_slot_template_requests` — a coach's request to add/modify/delete a slot template, awaiting admin approval (admin action is in File 05 US-AB-011).
- `attendance_records` — the per-attendee outcome (`showed`, `no_show`, `cancelled_late`) recorded at the slot by the coach.

Tables referenced but defined elsewhere: `bookings`, `slots`, `booking_line_items`, `booking_events` (File 03, File 07); `profiles`, `customer_packages`, `membership_subscriptions`, `notification_preferences` (File 04); `coaches`, `coach_slot_templates`, `activities`, `activity_pricing_tiers`, `reviews` (File 02); `customer_messages`, `whatsapp_dispatch_jobs`, `whatsapp_conversations`, `whatsapp_templates` (File 09); `audit_logs` (File 05). The coach-side `bookings.coach_id` column is retained for legacy join paths and indexed views, but the source of truth for who teaches a session is `coach_session_assignments`.

The coach is **not** a system administrator. They cannot see pricing, payments, or other coaches' sessions. Their RLS profile is `role='coach'`, distinct from `role='admin'`. A coach can message any customer who has booked at least once (US-CO-006) but cannot see the customer's full booking history across other activities — only the sessions they themselves are assigned to, plus reviews left about them.

Currency: integer piasters in the database, `Intl.NumberFormat('en-EG'|'ar-EG', { style: 'currency', currency: 'EGP' })` on display. Coach earnings are derived from `payment_transactions` and `booking_line_items` with a server-side aggregation; no floats anywhere.

The brand tone is unchanged: **"AquaLudo by Oar & Sail"** appears in copy, mail, the bottom-of-the-coach-panel foot strip, and the demo seed data. The Arabic mirror string is `أكوالودو من أوار آند سايل`.

---

## Domain Glossary

- **Coach** — a user with `profiles.role='coach'` and a corresponding `coaches` row (File 02). The `coach_session_assignments` table binds a coach to one or more bookings in a `lead` or `assistant` role.
- **Today** — defined by `Africa/Cairo` time zone; "today" at 23:55 and "today" at 00:05 must both produce sensible lists.
- **Session** — a coach's view of a single booking, enriched with attendees, add-ons, location, and the coach's own attendance controls.
- **Attendance** — a per-attendee state captured in `attendance_records`: `showed`, `no_show`, or `cancelled_late`. Submitted once, immutable.
- **Slot template** — a recurring weekly availability row in `coach_slot_templates` (File 02). A coach can request changes but not commit them; the admin (File 05 US-AB-011) approves.
- **Time off** — a date range during which the coach is unavailable. Affects the slot preview but does not by itself cancel existing bookings; the admin is notified and decides whether to manually offer freed slots to waitlist members (per the locked "admin manually picks" decision in the interview).
- **Lead coach** — the primary instructor for a booking. There is exactly one lead coach per booking. Assistants are additional.
- **Assistant coach** — secondary instructor; used for group activities with high capacity or special-needs customers.
- **Daily 7am digest** — a WhatsApp template `aqualudo_coach_daily_digest_v1` sent at 07:00 `Africa/Cairo` summarising today's sessions, lead-coach assignments, and any schedule changes.
- **Notification preferences** — per-coach toggles for the three coach-facing triggers (assignment, customer reply, daily digest). Stored in `notification_preferences` (File 04 DDL).
- **Coach self-messaging** — a coach's ability to initiate a thread with any customer who has booked at least once. Threads are owned by File 09 (`customer_messages`); the coach panel is a UI surface.
- **Coach profile moderation** — every edit to a coach's public profile (bio, languages, specialties, Instagram, certifications, avatar) is gated to `pending_publish` until a content admin publishes it. This is to keep the public face of the academy curated.
- **Review about a coach** — a `reviews` row (File 02) where `coach_id=<me>`. The coach sees only the approved ones; the public detail page (File 02 US-AC-006) surfaces them in the activity's reviews.

---

## Table of Contents

1. US-CO-001 — Coach login & dashboard home
2. US-CO-002 — Today schedule view
3. US-CO-003 — Session detail (coach view)
4. US-CO-004 — Take attendance
5. US-CO-005 — Attendance submission effects (booking_events + post-session WhatsApp)
6. US-CO-006 — Message any customer (search + open thread)
7. US-CO-007 — Customer-messages inbox
8. US-CO-008 — Edit own profile / bio (admin-moderated)
9. US-CO-009 — Request slot template change
10. US-CO-010 — Request time off (NOT auto-offer; admin picks)
11. US-CO-011 — Earnings overview
12. US-CO-012 — Coach view-only ratings
13. US-CO-013 — Daily 7am session digest WhatsApp
14. US-CO-014 — Coach settings (notification triggers, language, phone change request)

---

## US-CO-001 — Coach login & dashboard home

### Story
As a coach returning from the dock or arriving in the morning,
I want to sign in (email+password, Google, Facebook, or WhatsApp OTP) and land on `/coach` with a focused home that shows today's session count, attendance-taken count, unread message count, and the next session preview,
So that the dock-side reality is captured in one glance, with no admin clutter.

### Priority: P0
### Status: Draft
### Estimate: 5
### Sprint: Sprint 5 — Coach MVP

### Actors
- **Primary actor:** Coach (`profiles.role='coach'`).
- **System actor:** Supabase Auth; coach layout (`app/coach/layout.tsx`); `get_coach_today_summary` RPC.

### Preconditions
1. The coach has a verified `auth.users` row, a `profiles` row with `role='coach'`, and a `coaches` row with `status='published'` (File 02 US-AC-008).
2. The coach's phone is verified for WhatsApp OTP.

### Postconditions
1. The coach is signed in with `role='coach'` scope.
2. A session cookie (httpOnly, secure, sameSite=lax) is set with the coach's session.
3. The coach is redirected to `/coach` and sees the dashboard home.

### Main Flow (Happy Path)
1. Coach opens `https://aqualudo.net/coach` (or `/login?next=/coach`).
2. Sign-in methods shown: Email + Password, Google, Facebook, WhatsApp OTP.
3. Coach picks "Email + Password", enters credentials.
4. Supabase Auth returns a session; the Next.js middleware reads `profiles.role` and, finding it `coach`, redirects to `/coach`.
5. The dashboard home renders:
   - Top bar: greeting EN=`Good morning, Salma` / AR=`صباح الخير، سلمى` + a "Sign out" link.
   - Cards: "Today's sessions: 4" (count of bookings assigned to me today), "Attendance taken: 1" (count of bookings today for which I've already submitted attendance), "Unread messages: 2" (count of unread `customer_messages` threads).
   - Next session preview: "Next: 09:00 — Rowing Foundation with Salma Akl + 1 other — 4 attendees. Tap to view."
   - Quick action: "Take attendance" (if the next session is in the past 30 minutes or already in progress).

### Alternate Flows

#### A1 — Google sign-in
1. OAuth flow completes; same role-based redirect to `/coach`.

#### A2 — WhatsApp OTP sign-in
1. Coach enters phone; an OTP is sent via dispatcher (File 09).
2. Coach enters the 6-digit code; the session is created.

#### A3 — No sessions today
1. The "Today's sessions" card shows 0 with a "No sessions scheduled for today" line.
2. The next session preview reads "Next session: tomorrow 09:00" with a deep link to `/coach/schedule`.

#### A4 — Coach has no published coach row
1. The middleware redirects to `/coach/setup` (a one-time wizard to complete the coach record).

### Exception Flows

#### E1 — Profile.role is not 'coach'
1. The middleware redirects to `/` (customer home); the user is shown a "This area is for coaches only" toast.

#### E2 — Session expired
1. Re-authenticate flow; the coach is returned to `/coach` after sign-in.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Coach login & dashboard home

  Scenario: Email + password login lands on /coach
    Given coach "ahmed-z" has email "ahmed@aqualudo.net" and role="coach"
    When they sign in with valid credentials
    Then the session is created
      And the browser lands on /coach
      And the dashboard home shows today's session count

  Scenario: WhatsApp OTP login
    When coach requests an OTP to +201011329642
    Then a 6-digit code is sent via WhatsApp
      And entering the correct code creates the session
      And the redirect to /coach happens

  Scenario: Today's session count is accurate
    Given Ahmed is assigned as lead to 3 bookings today
    When he lands on /coach
    Then the "Today's sessions" card shows "3"

  Scenario: No sessions today
    When Ahmed has no bookings assigned today
    Then the card shows "No sessions scheduled for today"
      And the next session preview shows tomorrow's first session

  Scenario: Customer role
    Given a customer with role="customer" tries to sign in
    When they navigate to /coach
    Then they are redirected to /
      And a toast says "This area is for coaches only"
```

### Edge Cases
1. The coach signed in on a phone with no network — the dashboard renders the last cached view; a "you are offline" pill appears.
2. The coach's role was downgraded between visits — middleware re-evaluates on each request.
3. The first sign-in ever — the dashboard shows a one-time "Welcome" tour overlay.

### UI/UX Specifications

#### Mobile (portrait phone, primary)
- Top bar 56 px, sticky.
- Cards stack 1 column, 16 px gap, 16 px padding.
- Bottom tabs 64 px high, sticky.
- "Next session" card is a tappable full-bleed band with primary teal background.

#### Tablet (landscape, secondary)
- Cards in 2 columns; bottom tabs become a side rail.

#### Desktop (optional)
- Cards in 3 columns; side rail left.

#### RTL (Arabic)
- Top bar title right-aligned; greeting and Arabic-first.
- Bottom tabs reverse order (Today on the right).

#### Loading state
- Skeleton cards 16 px tall.

#### Empty state
- "No sessions today" with an illustration.

#### Error state
- Sign-in failure shows inline form error.
- Dashboard load failure shows a "retry" CTA.

#### Success state
- Cards animate in on first paint.

### Data Model
- Reads `coaches` (File 02), `bookings` (File 03), `customer_messages` (File 09).
- No new tables for this story.

### API Endpoints
- `GET /api/coach/dashboard` — returns the four cards' counts and the next session preview.
- `POST /api/auth/login` — Supabase Auth wrapper.
- `POST /api/auth/otp/request` and `/api/auth/otp/verify` — Supabase OTP wrappers.

### Security Considerations
1. The `/coach/*` routes are gated by middleware reading `profiles.role='coach'`.
2. RLS on `coach_session_assignments` ensures a coach sees only their own assignments.
3. The 2FA requirement is NOT applied to coaches (admin-only per File 05 US-AB-001).
4. Sign-out invalidates the session server-side.

### Performance Requirements
- Dashboard SSR p95 < 500 ms.
- LCP of the top bar p95 < 1.0 s on 4G.

### Notifications
- None for this story; the daily digest is US-CO-013.

### Localization
- Greeting EN/AR by `profiles.locale`.
- All card labels EN/AR.

### Error Handling
- `unauthorized` 401 redirects to `/login?next=/coach`.
- `forbidden` 403 redirects to `/`.

### Logging & Analytics
- `coach.dashboard.view` per load.
- `coach.sign_in` per sign-in.

### Testing Notes
- Unit: `get_coach_today_summary` RPC.
- E2E: sign in via each of the four methods; assert redirect.

### Related User Stories
- US-LD-013 (File 01) language toggle.
- US-CA-001..005 (File 04) sign-in methods.
- US-CO-002 (today schedule).

### Dependencies
- `auth.users`, `profiles`, `coaches` (File 02), `bookings` (File 03), `customer_messages` (File 09), Supabase Auth.

### Tags
`coach` · `auth` · `dashboard` · `mobile-first`

### Notes / Rationale
The dashboard's primary value is "what do I do next?" — not "what is the academy's revenue?" Coaches don't need the admin's metric sprawl; a focused 4-card home reduces cognitive load on a phone in bright sun.

---

## US-CO-002 — Today schedule view

### Story
As a coach on the dock between sessions,
I want a chronological list of today's sessions, each showing start time, activity, tier, lead vs assistant role, attendee count, and a tap target that opens the session detail,
So that I can plan the next hour without pulling out a clipboard or calling the front desk.

### Priority: P0
### Status: Draft
### Estimate: 3
### Sprint: Sprint 5 — Coach MVP

### Actors
- **Primary actor:** Coach.

### Preconditions
1. Coach signed in.

### Postconditions
1. The list renders today's sessions sorted by `start_at` ascending.
2. Tapping a session deep-links to `/coach/sessions/[booking_id]`.

### Main Flow (Happy Path)
1. Coach taps the "Today" bottom tab (or `https://aqualudo.net/coach/schedule?date=today`).
2. The page renders a list of today's `coach_session_assignments` joined to `bookings`, `activities`, `activity_pricing_tiers`, `slots`, and the count of attendees.
3. Each row shows: start time (`09:00`), duration (`60 min`), activity name (locale), tier name (locale), role (Lead or Assistant), attendee count (e.g. "4 attendees"), and a status pill (Confirmed, Pending payment, Cancelled).
4. Tapping a row navigates to `/coach/sessions/[booking_id]`.

### Alternate Flows

#### A1 — Date picker
1. The header has a date picker (default today). Picking a different date loads that day's sessions.

#### A2 — Empty day
1. "No sessions today. See schedule" deep link to `/coach/schedule`.

#### A3 — Multiple sessions at the same time (assistant)
1. The row indicates "Assistant to [lead coach's name]" with a smaller role pill.

### Exception Flows

#### E1 — Booking assigned to multiple coaches
1. Each coach sees their own row; the lead sees "Lead" and the assistant sees "Assistant" with the lead's name.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Today schedule view

  Scenario: Renders today's sessions in chronological order
    Given Ahmed is lead to 3 sessions and assistant to 1 today
    When he opens /coach/schedule?date=today
    Then 4 sessions are listed, sorted by start_at ascending
      And the lead role pill is on the lead sessions
      And the assistant role pill shows the lead coach's name

  Scenario: Tap session deep-links to detail
    When Ahmed taps the 09:00 Rowing Foundation session
    Then the browser navigates to /coach/sessions/ROW-2026-0412

  Scenario: Empty day
    Given Ahmed has no sessions today
    When he opens /coach/schedule?date=today
    Then the page shows "No sessions today"
```

### Edge Cases
1. A session is `pending_payment` — the row shows a "Pending payment" pill and is tappable; the session detail (US-CO-003) shows the payment status.
2. A session is cancelled — the row is greyed out and shows "Cancelled" pill; tapping shows the cancellation reason.
3. The day boundary is `Africa/Cairo`; a session at 23:55 belongs to today.

### UI/UX Specifications
- Mobile: list view with sticky date header.
- Tablet: 2-column grid; each card 50% width.
- RTL: row icons mirror.
- Loading: 4 skeleton rows.
- Empty: illustration + "No sessions today".
- Error: retry CTA.

### Data Model
- Reads `coach_session_assignments` (this file), `bookings` (File 03), `activities` (File 02), `activity_pricing_tiers` (File 02), `slots` (File 03).
- Writes a `coach.today_schedule.view` telemetry event.

### API Endpoints
- `GET /api/coach/schedule?date=YYYY-MM-DD` returns the day's list.

### Security Considerations
- RLS on `coach_session_assignments` ensures a coach sees only their own.

### Performance Requirements
- List load p95 < 400 ms.

### Notifications
- None.

### Localization
- Activity, tier names EN/AR.
- Time formatted in `Africa/Cairo` locale.

### Error Handling
- `forbidden` 403 if the coach queries a date outside their allowed range (deferred to v2).

### Logging & Analytics
- `coach.schedule.view` `{ date }`.

### Testing Notes
- E2E: navigate to today, see sessions, tap, see detail.

### Related User Stories
- US-CO-001 (dashboard home deep links here), US-CO-003 (session detail).

### Dependencies
- `coach_session_assignments`, `bookings`, `activities`, `slots`.

### Tags
`coach` · `schedule` · `mobile-first`

### Notes / Rationale
The today list is the dock-side truth. Performance over polish: even a 4G hiccup must not block the coach from seeing what's next.

---

## US-CO-003 — Session detail (coach view)

### Story
As a coach about to start a session,
I want a session detail screen showing each attendee (name, avatar, party size, customer notes), the booked add-ons, the location, the expected arrival, and a "Take attendance" section ready to be filled,
So that I can start the session knowing exactly who's on the boat and what they need.

### Priority: P0
### Status: Draft
### Estimate: 5
### Sprint: Sprint 5 — Coach MVP

### Actors
- **Primary actor:** Coach.

### Preconditions
1. The coach is assigned to the booking (lead or assistant).

### Postconditions
1. The detail page renders attendees, add-ons, location, and the attendance section.
2. The coach can tap "Take attendance" to begin the attendance flow (US-CO-004).

### Main Flow (Happy Path)
1. Coach taps a session from the today list (US-CO-002).
2. The page renders:
   - Header: activity name (locale), tier name, date, start–end time, role pill.
   - Location: address (locale), map deep link, sticky WhatsApp button to the venue.
   - Attendees list: each row with avatar, full name, party size, customer notes (truncated to 120 chars with "show more").
   - Add-ons list: name (locale) + price (formatted).
   - Attendance section: "Take attendance" CTA (disabled until within the slot's window or after).
3. Telemetry `coach.session.view` fires.

### Alternate Flows

#### A1 — Customer's profile was soft-deleted
1. The attendee row shows "Account deleted" with a fallback "Customer" label; no PII is exposed.

#### A2 — Booking has a customer note
1. The note is rendered in a callout box above the attendees.

#### A3 — Session is in the future
1. The "Take attendance" CTA is disabled with "Available from [start_at - 30 min]".

#### A4 — Assistant coach
1. The header shows "Assistant to [lead coach's name]"; the assistant can take attendance but cannot cancel the booking.

### Exception Flows

#### E1 — Coach is not assigned to this booking
1. The page is forbidden (403) with a "You are not assigned to this session" message.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Session detail (coach view)

  Scenario: Renders full session context
    Given booking ROW-2026-0412 has 4 attendees and a wetsuit add-on
    When the coach opens /coach/sessions/ROW-2026-0412
    Then the page shows the activity, tier, time, role, address, map, attendees, add-ons, and "Take attendance" CTA

  Scenario: Customer notes are surfaced
    Given a customer note "First time rower, nervous about water" exists
    When the coach opens the session
    Then the note is visible above the attendees

  Scenario: Coach not assigned
    Given Ahmed is not in coach_session_assignments for this booking
    When he opens the session
    Then the page returns 403 "You are not assigned to this session"

  Scenario: Take attendance disabled before slot window
    Given the slot starts in 2 hours
    When the coach views the session
    Then the "Take attendance" CTA is disabled with "Available from [start_at - 30 min]"
```

### Edge Cases
1. Booking was paid via a package — the page shows "Paid via [package name]" in the header.
2. Booking has add-ons that the customer can only use once (e.g. wetsuit) — the add-on is marked "Consumed" after attendance.
3. The coach needs to message a specific attendee — the attendee row has a "Message" icon that opens a thread (US-CO-006).

### UI/UX Specifications
- Mobile: scrollable list; sticky "Take attendance" CTA at the bottom.
- Tablet: 2-column layout (attendees left, add-ons + map right).
- RTL: full RTL.
- Loading: skeleton rows.
- Empty attendees: "No attendees" (defensive).
- Error: retry CTA.

### Data Model
- Reads `bookings` (File 03), `booking_line_items` (File 03), `profiles` (File 04), `customer_messages_count` (File 09).
- No new tables.

### API Endpoints
- `GET /api/coach/sessions/[booking_id]`

### Security Considerations
- RLS on `coach_session_assignments` ensures the coach sees only their own sessions.
- The customer's `phone` is partially masked (`+201•••••9642`) for privacy.

### Performance Requirements
- Detail load p95 < 500 ms.

### Notifications
- None.

### Localization
- All copy EN/AR; time in `Africa/Cairo`.

### Error Handling
- `not_assigned` 403.
- `booking_not_found` 404.

### Logging & Analytics
- `coach.session.view` `{ booking_id, role }`.

### Testing Notes
- E2E: navigate from list, see detail.

### Related User Stories
- US-CO-002 (today list), US-CO-004 (attendance).

### Dependencies
- `coach_session_assignments` (this file), `bookings` (File 03), `profiles` (File 04).

### Tags
`coach` · `session` · `detail` · `mobile-first`

### Notes / Rationale
The session detail is the coach's pre-flight checklist; one scroll, zero hunting.

---

## US-CO-004 — Take attendance

### Story
As a coach at the end of a session,
I want to mark each attendee as Showed Up, No-show, or Cancelled-late, and submit the batch,
So that the academy's records reflect reality and downstream systems (WhatsApp post-session + review request, no-show flag) trigger correctly.

### Priority: P0
### Status: Draft
### Estimate: 5
### Sprint: Sprint 5 — Coach MVP

### Actors
- **Primary actor:** Coach.

### Preconditions
1. The coach is the lead coach of the booking (assistants can take attendance if delegated by lead in v2; v1 enforces lead-only).
2. The current time is within the slot's start–end window OR up to 24 hours after the slot end (the "grace period" for marking late attendees).

### Postconditions
1. `attendance_records` rows are written per attendee with the coach's choice.
2. The booking's `status` is updated to `attended` if all attendees showed, or `partial` if some did not, or `no_show` if none did.
3. A `booking_events` row is appended (File 07 DDL).

### Main Flow (Happy Path)
1. Coach taps "Take attendance" on the session detail (US-CO-003).
2. A sheet slides up with one row per attendee: avatar, name, three buttons (Showed Up, No-show, Cancelled-late). Default selection: Showed Up.
3. Coach adjusts any row.
4. Coach taps "Submit attendance". The server validates the window, writes `attendance_records`, updates `bookings.status`, and appends `booking_events`.
5. The sheet closes; the session detail shows "Attendance taken" with a check mark and a "Re-open" link (within 24 h only).
6. Telemetry `coach.attendance.submit`.

### Alternate Flows

#### A1 — Re-open within grace period
1. Within 24 h, the coach can tap "Re-open attendance" and submit again; the previous `attendance_records` are updated atomically.

#### A2 — Partial submission
1. The coach taps "Submit" with two attendees unmarked — the form refuses with a "Mark all attendees" hint.

#### A3 — Customer self-cancelled after the slot end (auto-marker)
1. If a customer self-cancelled after the slot start (rare; admin can override), the row's default state is "Cancelled-late".

### Exception Flows

#### E1 — Submission outside the window
1. The form is disabled with a "Outside attendance window" message; the coach cannot submit.

#### E2 — Coach is not the lead
1. The form is hidden; an assistants-only view is deferred to v2.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Take attendance

  Scenario: Submit attendance for a confirmed session
    Given 4 attendees on booking ROW-2026-0412 and the slot ended 5 minutes ago
    When the coach marks 3 as Showed Up and 1 as No-show
      And submits
    Then 4 attendance_records rows are written
      And bookings.status is "attended" (3 showed + 1 no-show qualifies as "attended" with a no-show flag)
      And a booking_events row is appended with event_type="marked_attended"

  Scenario: All no-show
    When the coach marks all 4 attendees as No-show
    Then bookings.status becomes "no_show"
      And the customer's package counter may be decremented per the cancellation policy

  Scenario: Submit outside window
    Given the slot ended 25 hours ago
    When the coach opens attendance
    Then the form is disabled with "Outside attendance window"
      And the admin must intervene via the booking drawer (File 07 US-AD-009)

  Scenario: Re-open within grace period
    Given attendance was submitted 1 hour ago
    When the coach taps "Re-open attendance"
    Then the form is editable
      And re-submission atomically updates the previous records
```

### Edge Cases
1. The coach's phone dies mid-submission — the form is offline-tolerant; submission is retried on reconnect.
2. The coach accidentally marks someone as no-show — the re-open path is the rescue within 24 h.
3. A customer added a same-day add-on (e.g. photo package) — the add-on is consumed only on `showed` state.

### UI/UX Specifications
- Mobile: bottom sheet full-screen; three pill buttons per row.
- Tablet: side panel 360 px.
- RTL: pill order mirrors.
- Loading: spinner on submit.
- Empty: defensive.
- Error: toast with retry.

### Data Model

```sql
attendance_records
  id              uuid pk default gen_random_uuid()
  booking_id      uuid not null references bookings(id) on delete cascade
  attendee_index  int not null                                -- 0..party_size-1
  status          text not null check (status in ('showed','no_show','cancelled_late'))
  taken_by        uuid not null references auth.users(id)     -- the coach
  taken_at        timestamptz not null default now()
  unique (booking_id, attendee_index)
  -- RLS: lead coach SELECT/INSERT/UPDATE; admin SELECT all
```

The `bookings.status` field's transition is recorded in `booking_events` (File 07 DDL) with `event_type='marked_attended'` or `'marked_no_show'`.

### API Endpoints
- `POST /api/coach/sessions/[booking_id]/attendance` — body `[{ attendee_index, status }]`.

### Security Considerations
1. RLS check: the coach must be the lead coach (`coach_session_assignments.role='lead' AND coach_id=<me>`).
2. Window check: server-side; `now() between slot.start_at - 30min and slot.end_at + 24h`.
3. Atomic write: a single transaction updates `attendance_records`, `bookings.status`, and `booking_events`.

### Performance Requirements
- Submit p95 < 600 ms.

### Notifications
- The post-session WhatsApp (US-CO-005) is fired by the dispatcher after this submission.

### Localization
- Status labels EN/AR (`Showed Up` / `حضر`, `No-show` / `لم يحضر`, `Cancelled-late` / `إلغاء متأخر`).

### Error Handling
- `outside_window` 422.
- `not_lead_coach` 403.
- `partial_submission` 422.

### Logging & Analytics
- `coach.attendance.submit` `{ booking_id, showed, no_show, cancelled_late }`.
- `booking_events` row with `event_type='marked_attended'` and `meta={counts}`.

### Testing Notes
- E2E: submit, verify rows.

### Related User Stories
- US-CO-003 (session detail), US-CO-005 (effects), US-AD-009 (File 07 admin mark no-show), US-CN-006 (File 09 post-session WhatsApp).

### Dependencies
- `coach_session_assignments` (this file), `bookings` (File 03), `booking_events` (File 07), dispatcher (File 09).

### Tags
`coach` · `attendance` · `mobile-first`

### Notes / Rationale
The coach's truth-telling at the dock is the data input the rest of the system depends on. The form must be one-handed, fast, and recoverable within 24 hours.

---

## US-CO-005 — Attendance submission effects (booking_events + post-session WhatsApp)

### Story
As a system (downstream of US-CO-004),
I want the attendance submission to atomically update the booking's `status`, append a `booking_events` row, and enqueue a post-session WhatsApp + review request for showed-up attendees within the 1-hour-after-slot cooldown,
So that the customer gets a timely thank-you and the academy captures a review within the freshness window.

### Priority: P0
### Status: Draft
### Estimate: 5
### Sprint: Sprint 5 — Coach MVP

### Actors
- **Primary actor:** Coach (the trigger).
- **Secondary actor:** Customer (recipient of the WhatsApp).
- **System actor:** Booking-events writer; the dispatcher (File 09).

### Preconditions
1. US-CO-004 has just completed successfully.

### Postconditions
1. `bookings.status` is `attended`, `partial`, or `no_show`.
2. `booking_events` has a new row with `event_type='marked_attended' | 'marked_no_show'`.
3. A `whatsapp_dispatch_jobs` row is enqueued for each `showed` attendee with the post-session template, scheduled 1 hour after the slot end (or immediately if past that).

### Main Flow (Happy Path)
1. The attendance submit handler (US-CO-004) runs in a single transaction:
   - `insert into attendance_records (...)` per attendee.
   - `update bookings set status=... where id=...`.
   - `insert into booking_events (event_type, actor_id, actor_role, meta) values ('marked_attended', <coach>, 'coach', {counts})`.
2. After commit, the dispatcher enqueues:
   - For each `showed` attendee, a `whatsapp_dispatch_jobs` row with `trigger='post_session_review'`, `scheduled_for=max(now(), slot.end_at + interval '1 hour')`.
3. The dispatcher's cron (File 09) sends the template `aqualudo_post_session_v1` in the customer's `profiles.locale`; the body includes the activity name and a magic link to leave a review (File 04 US-CA-014).
4. Telemetry `whatsapp.dispatch.post_session.scheduled`.

### Alternate Flows

#### A1 — Customer has notification opt-out for `post_session_review`
1. The dispatcher skips the job (records `last_error='opted_out'`) but the booking_events row is still written.

#### A2 — Customer's WhatsApp is invalid
1. The job is recorded `failed`; the next review-request trigger (e.g. 7-day follow-up) is deferred to v2.

#### A3 — Coach re-opens attendance within 24 h
1. The previous dispatch jobs are cancelled; new ones are enqueued with the corrected attendee list.

### Exception Flows

#### E1 — Slot is in the future
1. The submission is rejected at US-CO-004 (E1) and this story does not run.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Attendance submission effects

  Scenario: Submission fires post-session WhatsApp for showed attendees
    Given 3 attendees are marked Showed Up
    When the coach submits
    Then 3 whatsapp_dispatch_jobs rows are enqueued for post_session_review
      And each is scheduled for slot.end_at + 1 hour
      And the customer's locale determines the template language

  Scenario: Customer opted out
    Given the customer has notification_preferences.post_session_review = false
    When the dispatch job runs
    Then the job is recorded as "failed" with last_error="opted_out"
      And no WhatsApp is sent

  Scenario: Re-open cancels previous jobs
    Given attendance was submitted 1 hour ago with 3 Showed Up
    When the coach re-opens and marks 1 as No-show
    Then the previous 3 dispatch jobs are cancelled
      And 2 new jobs are enqueued for the 2 remaining Showed Up attendees
```

### Edge Cases
1. Slot end is in the past and the coach submits 25 hours later — the dispatcher enqueues with `scheduled_for=now()`.
2. Customer has no phone — the job is `failed` with `last_error='no_phone'`.
3. Multiple coaches (lead + assistant) submit — only the lead's submission writes the booking_events row; the assistant's submission is rejected.

### UI/UX Specifications
- No direct UI surface; the coach sees the session detail's "Attendance taken" pill and a "Re-open" link.

### Data Model
- Updates `bookings.status` (File 03).
- Inserts `attendance_records` (this file).
- Inserts `booking_events` (File 07).
- Inserts `whatsapp_dispatch_jobs` (File 09).

### API Endpoints
- Internal: `enqueueTrigger('post_session_review', booking_id, customer_id, scheduled_for)`.

### Security Considerations
- The dispatcher (File 09) handles template and language; this story just enqueues.
- Idempotency: each `(booking_id, customer_id, trigger)` is unique in `whatsapp_dispatch_jobs` (File 09 DDL).

### Performance Requirements
- Transaction p95 < 800 ms.

### Notifications
- The customer receives `aqualudo_post_session_v1` EN+AR.

### Localization
- Template language by `profiles.locale`.

### Error Handling
- Dispatch failures are absorbed by the dispatcher retry queue (File 09 US-CN-016).

### Logging & Analytics
- `booking_events` row.
- `whatsapp.dispatch.post_session.scheduled` per job.

### Testing Notes
- E2E: submit attendance; assert the WhatsApp job is created and scheduled.

### Related User Stories
- US-CO-004, US-CN-006 (File 09).

### Dependencies
- `bookings`, `booking_events`, `whatsapp_dispatch_jobs`, dispatcher.

### Tags
`coach` · `attendance` · `notifications` · `whatsapp`

### Notes / Rationale
The 1-hour-after-slot cooldown respects the customer's "I just finished a workout, I want to shower" window; the request still arrives within the freshness window for review.

---

## US-CO-006 — Message any customer (search + open thread)

### Story
As a coach who needs to clarify something with a customer (e.g. "I have a wrist injury, can we swap to kayaking tomorrow?"),
I want to search for any customer who has booked at least once, open a thread, and send a WhatsApp message using a template (the conversation is opened on first send),
So that I can coordinate outside the booking flow's narrow chat affordances.

### Priority: P1
### Status: Draft
### Estimate: 5
### Sprint: Sprint 5 — Coach MVP

### Actors
- **Primary actor:** Coach.
- **Secondary actor:** Customer (recipient).

### Preconditions
1. The customer has at least one `bookings` row in history.
2. The customer has a verified phone.

### Postconditions
1. A `whatsapp_conversations` row exists between the coach's business line and the customer.
2. A `whatsapp_dispatch_jobs` row is enqueued with the appropriate template.

### Main Flow (Happy Path)
1. Coach opens the Inbox tab (US-CO-007) and taps the search icon.
2. The search input is typeahead on `profiles.full_name` and `profiles.phone`.
3. Coach selects "Salma Akl (+201011329642)".
4. The thread opens; coach picks a template (e.g. `aqualudo_coach_message_v1`) and types free-text optional content.
5. Coach taps "Send". The dispatcher opens a conversation and sends the template.
6. The customer receives a WhatsApp; the conversation is now open and the customer can reply.

### Alternate Flows

#### A1 — Customer has not opted in
1. The thread opens with a "First-time message — using template" notice; the coach must use an approved template.

#### A2 — Coach sends a free-text message within the 24h window
1. If the customer replied within the last 24 h, the coach can send free text without a template.
2. Outside the window, the coach is forced to use a template.

#### A3 — No matching customer
1. "No customer with that name/phone found." with a "Search bookings instead" link.

### Exception Flows

#### E1 — Customer opted out
1. The "Send" button is disabled with "Customer has opted out of WhatsApp".

#### E2 — Template is unapproved
1. The template list only shows approved templates (per File 09 US-CN-002).

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Coach messages a customer

  Scenario: Search and open a thread
    Given Salma Akl has at least one booking in history
    When the coach searches "salma" and selects the result
    Then a thread opens
      And the coach can pick a template and send

  Scenario: First-time message uses a template
    Given there is no existing whatsapp_conversations row for Salma
    When the coach taps "Send"
    Then the template "aqualudo_coach_message_v1" is used
      And a new whatsapp_conversations row is created with status="open"

  Scenario: Customer opted out
    Given Salma's whatsapp_conversations.status="opted_out"
    When the coach opens the thread
    Then the "Send" button is disabled with "Customer has opted out of WhatsApp"

  Scenario: Search by phone tail
    When the coach types "9642"
    Then Salma appears in the results
```

### Edge Cases
1. Customer has two profiles (rare) — search shows both; coach picks one.
2. The customer's phone is on a different country code — the search normalises to E.164.
3. The coach is also an admin — they can still use this surface, but the admin panel is the primary path.

### UI/UX Specifications
- Mobile: search modal full-screen; thread is a chat view.
- RTL: chat bubbles mirror.
- Loading: spinner on search.
- Empty: "No customers found".
- Error: toast on send failure.

### Data Model
- Reads `profiles` (File 04), `bookings` (File 03).
- Inserts `whatsapp_conversations` (File 09), `whatsapp_dispatch_jobs` (File 09), `customer_messages` (File 09).

### API Endpoints
- `GET /api/coach/customers/search?q=`
- `POST /api/coach/messages` — body `{ customer_id, template_name, params }`.

### Security Considerations
1. The coach can only message customers who have booked at least once (RLS on the search query).
2. RLS on `whatsapp_dispatch_jobs` ensures the coach's sends are audited.
3. Rate-limit: 30 outbound messages per coach per hour.

### Performance Requirements
- Search p95 < 300 ms.
- Send p95 < 1.5 s (Meta round-trip).

### Notifications
- The customer receives a WhatsApp from the academy's business number.

### Localization
- Template language by customer's `profiles.locale`.

### Error Handling
- `opted_out` 422.
- `template_not_approved` 422.
- `rate_limited` 429.

### Logging & Analytics
- `coach.message.send` `{ customer_id, template_name }`.
- Audit row per send (the dispatcher records the outbound).

### Testing Notes
- E2E: search, send, assert WhatsApp job created.

### Related User Stories
- US-CO-007 (inbox), US-CN-015 (File 09 inbound handling), US-CN-020 (File 09 keywords).

### Dependencies
- `profiles`, `bookings`, `whatsapp_templates` (File 09), `whatsapp_dispatch_jobs` (File 09).

### Tags
`coach` · `messaging` · `whatsapp` · `mobile-first`

### Notes / Rationale
Coaches need to coordinate with customers; the alternative is calling the front desk, which is friction. Direct messaging via WhatsApp templates is the in-context channel.

---

## US-CO-007 — Customer-messages inbox

### Story
As a coach,
I want an inbox of customer message threads, most-recent-first, with unread badges, previews, and a quick reply,
So that I can keep up with replies without scanning notifications.

### Priority: P1
### Status: Draft
### Estimate: 3
### Sprint: Sprint 5 — Coach MVP

### Actors
- **Primary actor:** Coach.

### Preconditions
1. The coach has at least one `customer_messages` thread.

### Postconditions
1. The inbox lists threads sorted by `last_message_at desc`.
2. Unread threads are marked with a blue dot.

### Main Flow (Happy Path)
1. Coach opens the Inbox tab.
2. Threads render in a list: customer name, last message preview (truncated 80 chars), timestamp, unread dot.
3. Tapping a thread opens the chat view (US-CO-006).
4. Marking the thread as read updates `customer_messages.unread_count`.

### Alternate Flows

#### A1 — Filter unread only
1. A toggle "Unread only" filters the list.

#### A2 — Search across threads
1. The search input queries message bodies for the coach's threads.

### Exception Flows

#### E1 — Inbound message from a customer the coach has never messaged
1. The thread is created automatically; the coach sees it in the inbox.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Customer-messages inbox

  Scenario: Inbox lists threads most-recent-first
    Given the coach has 5 threads
    When he opens /coach/inbox
    Then 5 rows render, sorted by last_message_at desc

  Scenario: Unread badge
    Given a thread has unread_count=3
    When the coach opens the inbox
    Then a blue dot is shown next to the row

  Scenario: Open a thread
    When the coach taps a thread
    Then the chat view opens
      And unread_count is reset to 0
```

### Edge Cases
1. A thread has 1000+ messages — the chat view paginates 50 at a time.
2. A customer opted out — the thread remains visible but is read-only.
3. The coach has been removed from a booking — the thread is preserved for the audit log but moved to an "Archived" tab.

### UI/UX Specifications
- Mobile: list view; sticky "Unread only" toggle.
- Tablet: 2-column (list + chat).
- RTL: list mirrored.
- Loading: skeleton rows.
- Empty: "No messages yet".
- Error: retry CTA.

### Data Model
- Reads `customer_messages` (File 09), `whatsapp_conversations` (File 09).
- Updates `customer_messages.unread_count`.

### API Endpoints
- `GET /api/coach/inbox?unread_only=&q=&page=`
- `POST /api/coach/inbox/[thread_id]/mark-read`

### Security Considerations
- RLS: the coach sees only threads they participate in.

### Performance Requirements
- Inbox p95 < 400 ms.

### Notifications
- Inbound message from a customer triggers the `coach_customer_reply` WhatsApp template (per File 09 US-CN-012).

### Localization
- Thread labels EN/AR by customer's locale.

### Error Handling
- `forbidden` 403.

### Logging & Analytics
- `coach.inbox.view` per load.

### Testing Notes
- E2E: receive a message; assert in inbox; open; assert mark-read.

### Related User Stories
- US-CO-006, US-CN-012, US-CN-015.

### Dependencies
- `customer_messages`, `whatsapp_conversations`, dispatcher.

### Tags
`coach` · `messaging` · `inbox` · `mobile-first`

### Notes / Rationale
A focused inbox for the dock — the coach can scan and reply in 30 seconds between sessions.

---

## US-CO-008 — Edit own profile / bio (admin-moderated)

### Story
As a coach,
I want to edit my public profile (full_name with admin approval, bio EN+AR, languages, specialties, Instagram handle, certifications jsonb, avatar), submit it for moderation, and see the pending state until an admin publishes,
So that my public face stays current while preserving the academy's editorial control.

### Priority: P1
### Status: Draft
### Estimate: 5
### Sprint: Sprint 5 — Coach MVP

### Actors
- **Primary actor:** Coach.
- **Secondary actor:** Content admin (per File 05 US-AB-010).

### Preconditions
1. The coach has a `coaches` row (File 02) with `status='published'`.

### Postconditions
1. A `coach_profile_drafts` row (or staging columns on `coaches`) holds the proposed changes.
2. An admin notification is dispatched.
3. On admin approval, the `coaches` row is updated; the public profile reflects the change.

### Main Flow (Happy Path)
1. Coach opens `/coach/profile/edit`.
2. The form prefills with the current `coaches` row.
3. Coach edits bio EN, bio AR, languages, specialties, Instagram, certifications, avatar.
4. Coach taps "Submit for review".
5. The draft is saved to a staging area; the `coaches` row remains unchanged.
6. A WhatsApp template `aqualudo_coach_profile_pending_v1` is sent to the content admin team.

### Alternate Flows

#### A1 — Admin approves
1. Per File 05 US-AB-010, the admin publishes; the `coaches` row updates; the public profile reflects the new bio.
2. A WhatsApp `aqualudo_coach_profile_approved_v1` is sent to the coach.

#### A2 — Admin rejects with reason
1. A WhatsApp `aqualudo_coach_profile_rejected_v1` is sent to the coach with the reason.

#### A3 — Coach cancels the draft
1. The staging row is deleted; the public profile is unchanged.

### Exception Flows

#### E1 — Coach edits while a draft is pending
1. The form shows a "Pending review" banner; further edits are blocked until the existing draft is resolved.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Edit own profile (admin-moderated)

  Scenario: Submit a draft
    When the coach edits bio EN+AR and submits
    Then a draft is saved
      And the public profile still shows the prior bio
      And a WhatsApp is sent to the content admin

  Scenario: Admin approves
    Given a draft is pending
    When the admin publishes it
    Then coaches row is updated
      And the public /coaches/<slug> page reflects the new bio on next ISR
      And a WhatsApp is sent to the coach

  Scenario: Edit while draft pending
    Given a draft is pending
    When the coach opens the edit form
    Then a "Pending review" banner is shown
      And the form is disabled
```

### Edge Cases
1. The coach's full_name change is admin-approved — handled in the same draft.
2. Avatar upload fails — server keeps the prior avatar.
3. Specialties list is limited to the activities the academy offers; the picker is constrained.

### UI/UX Specifications
- Mobile: full-screen form; sticky submit bar.
- Tablet: 2-column (form left, preview right).
- RTL: full RTL.
- Loading: spinner.
- Empty: N/A.
- Error: toast.

### Data Model
- Mutates `coaches` (File 02) via a staging row:

```sql
coach_profile_drafts
  id              uuid pk default gen_random_uuid()
  coach_id        uuid not null references coaches(id) on delete cascade
  proposed_payload jsonb not null                        -- { full_name, bio_en, bio_ar, languages, specialties, instagram_handle, certifications, avatar_url }
  status          text not null check (status in ('pending','approved','rejected')) default 'pending'
  submitted_at    timestamptz not null default now()
  decided_at      timestamptz
  decided_by      uuid references auth.users(id)
  rejection_reason text
  -- RLS: coach SELECT own; admin SELECT/INSERT/UPDATE all
```

On approval, the `proposed_payload` is applied to `coaches` and a `content_blocks`-style history is recorded.

### API Endpoints
- `GET /api/coach/profile/edit`
- `POST /api/coach/profile/draft` — body `{ proposed_payload }`.
- `POST /api/coach/profile/draft/[id]/cancel`.

### Security Considerations
1. The draft payload is JSON-Schema validated.
2. RLS: the coach sees only their own draft.
3. The full_name change is separately flagged for admin approval (the admin can edit the full_name without re-moderating the rest).

### Performance Requirements
- Submit p95 < 500 ms.

### Notifications
- `aqualudo_coach_profile_pending_v1` to the content admin team.
- `aqualudo_coach_profile_approved_v1` to the coach.
- `aqualudo_coach_profile_rejected_v1` to the coach with reason.

### Localization
- Bio EN/AR.

### Error Handling
- `payload_invalid` 422.
- `pending_draft_exists` 409.

### Logging & Analytics
- `coach.profile.draft.submit` / `cancel`.

### Testing Notes
- E2E: submit draft, admin approves, assert public profile.

### Related User Stories
- US-AB-010 (File 05 admin publishes).

### Dependencies
- `coaches` (File 02), `coach_profile_drafts` (this file), dispatcher (File 09).

### Tags
`coach` · `profile` · `moderation` · `i18n`

### Notes / Rationale
A coach's bio is a public surface; an admin-moderation gate prevents a coach from publishing unvetted content.

---

## US-CO-009 — Request slot template change

### Story
As a coach,
I want to request a slot template change (add a new time, modify an existing one's time/capacity, or remove a time I no longer teach), submit it for admin approval, and see the pending request status until approved,
So that my weekly schedule stays in sync with my life while the admin retains scheduling authority.

### Priority: P1
### Status: Draft
### Estimate: 5
### Sprint: Sprint 5 — Coach MVP

### Actors
- **Primary actor:** Coach.
- **Secondary actor:** Content admin (per File 05 US-AB-011).

### Preconditions
1. The coach is signed in.

### Postconditions
1. A `coach_slot_template_requests` row exists with `status='pending'`.
2. The admin sees the request in their queue (File 05 US-AB-011 alternate flow A1).
3. On approval, the `coach_slot_templates` row is created/updated/deleted; the coach is notified.

### Main Flow (Happy Path)
1. Coach opens `/coach/slot-templates/requests`.
2. The form shows the current 7-day grid of `coach_slot_templates` rows.
3. Coach taps "+ Add", picks activity (e.g. Rowing), day_of_week (Saturday), start time (09:00), end time (12:00), capacity (4).
4. Taps "Submit request".
5. The `coach_slot_template_requests` row is created with `request_type='create'`, `status='pending'`.
6. The coach sees the request in a "Pending requests" list.

### Alternate Flows

#### A1 — Modify an existing template
1. Coach picks an existing template, changes the time, submits; `request_type='modify'`, `target_template_id=<existing>`.

#### A2 — Delete a template
1. Coach picks "Delete"; `request_type='delete'`.

#### A3 — Admin approves
1. Per File 05 US-AB-011 A1, the admin approves; the `coach_slot_templates` row is created/updated/deleted; the coach is notified via `aqualudo_slot_template_approved_v1`.

#### A4 — Admin rejects
1. The coach is notified via `aqualudo_slot_template_rejected_v1` with admin notes.

### Exception Flows

#### E1 — Time conflict with an existing template
1. The form surfaces the conflict; the coach adjusts.

#### E2 — Pending request already exists
1. The coach is shown "You have a pending request for this template; cancel it before submitting a new one."

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Request slot template change

  Scenario: Submit a create request
    When the coach submits activity=rowing, day_of_week=6, start=09:00, end=12:00, capacity=4
    Then a coach_slot_template_requests row exists with request_type="create" status="pending"
      And the admin queue surfaces it

  Scenario: Admin approves
    Given a pending create request
    When the admin approves
    Then three coach_slot_templates rows are inserted (09:00, 10:00, 11:00)
      And a WhatsApp is sent to the coach

  Scenario: Coach cancels a pending request
    When the coach cancels
    Then the row's status becomes "cancelled" (allowed for the requestor)
```

### Edge Cases
1. Coach submits a request that overlaps a future booking — admin is shown the overlap and must decide.
2. Coach submits a request for an activity they don't specialise in — admin is shown a warning.
3. The request expires after 14 days without admin action — admin gets a reminder; the request is auto-cancelled after 30 days.

### UI/UX Specifications
- Mobile: 7-day scrollable weekly grid.
- RTL: grid mirrors.
- Loading: spinner.
- Empty: "No template requests yet".

### Data Model

```sql
coach_slot_template_requests
  id                      uuid pk default gen_random_uuid()
  coach_id                uuid not null references coaches(id) on delete cascade
  activity_id             uuid not null references activities(id) on delete cascade
  proposed_start_time     time not null
  proposed_end_time       time not null
  proposed_day_of_week    int not null check (proposed_day_of_week between 0 and 6)
  request_type            text not null check (request_type in ('create','modify','delete'))
  target_template_id      uuid references coach_slot_templates(id)
  status                  text not null check (status in ('pending','approved','rejected','cancelled')) default 'pending'
  admin_notes             text
  created_at              timestamptz not null default now()
  decided_at              timestamptz
  decided_by              uuid references auth.users(id)
  -- RLS: coach SELECT own; admin SELECT/INSERT/UPDATE all
```

### API Endpoints
- `GET /api/coach/slot-template-requests?status=`
- `POST /api/coach/slot-template-requests` — body fields.
- `POST /api/coach/slot-template-requests/[id]/cancel`.

### Security Considerations
- RLS: the coach sees only their own.
- `proposed_start_time < proposed_end_time` validated server-side.

### Performance Requirements
- Submit p95 < 400 ms.

### Notifications
- `aqualudo_slot_template_approved_v1` / `_rejected_v1` to the coach (File 09).

### Localization
- Day labels EN/AR.

### Error Handling
- `time_conflict` 422.
- `pending_exists` 409.

### Logging & Analytics
- `coach.slot_template_request.submit` / `cancel`.

### Testing Notes
- E2E: submit, admin approves, assert templates created.

### Related User Stories
- US-AB-011 (File 05 admin approval).

### Dependencies
- `coach_slot_template_requests` (this file), `coach_slot_templates` (File 02), dispatcher.

### Tags
`coach` · `slot-template` · `request` · `mobile-first`

### Notes / Rationale
Coaches know their lives; admins know the academy's capacity. This handoff keeps both informed.

---

## US-CO-010 — Request time off (NOT auto-offer; admin picks)

### Story
As a coach who needs time off (vacation, illness, family event),
I want to submit a date range and a reason, and have the system notify the admin so the admin can manually decide whether to reassign my upcoming sessions to other coaches or offer the freed slots to waitlist members (one at a time, per the locked interview decision),
So that my customers are not left without a coach while I am out, and the academy retains control over the rebooking process.

### Priority: P1
### Status: Draft
### Estimate: 5
### Sprint: Sprint 5 — Coach MVP

### Actors
- **Primary actor:** Coach.
- **Secondary actor:** Content admin (per File 07 US-AD-008 and File 05 US-AB-011); affected customers (notified); waitlist members (NOT auto-offered in v1 — see below).

### Preconditions
1. The coach has at least one upcoming `coach_session_assignments` row in the requested date range.

### Postconditions
1. A `coach_time_off` row exists with `status='pending'`.
2. The admin is notified with a list of affected upcoming sessions.
3. The affected customers are NOT auto-notified; the admin is the gate.
4. The freed slots are NOT auto-offered to the waitlist; the admin manually picks from the waitlist per File 07 US-AD-008.

### Main Flow (Happy Path)
1. Coach opens `/coach/time-off`.
2. Picks start_at, end_at, reason.
3. Submits; the `coach_time_off` row is created with `status='pending'`.
4. The admin receives a WhatsApp template `aqualudo_coach_time_off_pending_v1` and an in-panel notification listing the affected upcoming sessions (booking id, customer, date/time).
5. The admin reviews and either approves or rejects.

### Alternate Flows

#### A1 — Admin approves
1. The `coach_time_off.status='approved'`, `approved_by=<admin>`.
2. The admin then opens each affected session and either:
   a. Reassigns it to another coach (File 07 US-AD-008).
   b. Cancels it and offers the slot to a waitlist member manually (File 07 US-AD-008 — the locked "admin manually picks" decision).
3. The customers affected by cancellation or reassignment are notified via the standard `booking_cancelled` or `booking_reassigned` WhatsApp templates (File 09).
4. The coach receives `aqualudo_coach_time_off_approved_v1`.

#### A2 — Admin rejects
1. The coach receives `aqualudo_coach_time_off_rejected_v1` with the reason.

#### A3 — No affected sessions
1. The admin is notified with "No affected sessions — you can approve immediately."

### Exception Flows

#### E1 — Time off in the past
1. Validation rejects; only future time off is allowed.

#### E2 — Overlaps an existing pending time off
1. Validation rejects; the coach must cancel or wait.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Request time off

  Scenario: Submit a time-off request
    Given Ahmed has 3 upcoming sessions in the requested date range
    When he submits start=2026-08-01, end=2026-08-07, reason="Family vacation"
    Then a coach_time_off row exists with status="pending"
      And the admin is notified with the 3 affected sessions

  Scenario: Admin approves and reassigns
    Given the request is pending
    When the admin approves and reassigns the 3 sessions
    Then coach_time_off.status is "approved"
      And the 3 sessions have new coach assignments
      And each customer is notified of the reassignment
      And Ahmed is notified of the approval

  Scenario: Admin offers the freed slot to a waitlist member manually
    Given a session is cancelled
    When the admin picks a waitlist member (per File 07 US-AD-008)
    Then the system does NOT auto-offer to other waitlist members
      And the selected member receives a 15-minute claim WhatsApp (per File 07)
      And unselected members are not notified

  Scenario: Time off in the past
    When the coach submits start=2026-06-01
    Then the form rejects with "Time off must be in the future"
```

### Edge Cases
1. Coach submits time off for a single day — supported.
2. Coach submits time off that spans multiple weeks — supported.
3. A new booking is created during the time off window after approval — the admin is notified to reassign.
4. The waitlist is empty for a freed slot — the admin must decide whether to refund or leave the slot empty.

### UI/UX Specifications
- Mobile: date range picker, reason text area, "Submit" CTA.
- Tablet: same with 2-column layout.
- RTL: full RTL.
- Loading: spinner.
- Empty: list of past time-off entries with status.

### Data Model

```sql
coach_time_off
  id              uuid pk default gen_random_uuid()
  coach_id        uuid not null references coaches(id) on delete cascade
  start_at        timestamptz not null
  end_at          timestamptz not null
  reason          text
  status          text not null check (status in ('pending','approved','rejected','cancelled')) default 'pending'
  approved_by     uuid references auth.users(id)
  approved_at     timestamptz
  rejection_reason text
  created_at      timestamptz not null default now()
  index on (coach_id, status, start_at)
  -- RLS: coach SELECT own; admin SELECT/INSERT/UPDATE all
```

### API Endpoints
- `GET /api/coach/time-off?status=`
- `POST /api/coach/time-off` — body `{ start_at, end_at, reason }`.
- `POST /api/coach/time-off/[id]/cancel`.

### Security Considerations
- `start_at < end_at` and `start_at > now()` validated server-side.
- RLS: the coach sees only their own.

### Performance Requirements
- Submit p95 < 400 ms.

### Notifications
- `aqualudo_coach_time_off_pending_v1` to the content admin team.
- `aqualudo_coach_time_off_approved_v1` / `_rejected_v1` to the coach.
- The customer notifications fire only after admin action (reassignment or cancellation).

### Localization
- Reason text EN/AR by coach's `profiles.locale`.

### Error Handling
- `time_off_in_past` 422.
- `overlaps_existing` 409.

### Logging & Analytics
- `coach.time_off.submit` / `cancel`.

### Testing Notes
- E2E: submit, admin approves, assert notifications.

### Related User Stories
- US-AD-008 (File 07) waitlist-offer reassignment centerpiece.
- US-CN-007 (File 09) waitlist slot opened template.

### Dependencies
- `coach_time_off` (this file), `coach_session_assignments` (this file), dispatcher (File 09), File 07 reassignment flows.

### Tags
`coach` · `time-off` · `admin-touch` · `mobile-first`

### Notes / Rationale
The locked interview decision is "admin manually picks from waitlist". Auto-offering to all waitlist members would erode that control and create an unfair first-come-first-served race. We hold the admin as the gate.

---

## US-CO-011 — Earnings overview

### Story
As a coach,
I want a basic earnings overview — sessions led this month, attendance count, no-show count, average rating, and (if enabled by the admin) a commission split,
So that I have a transparent view of my performance and pay without asking the front desk.

### Priority: P2
### Status: Draft
### Estimate: 3
### Sprint: Sprint 5 — Coach MVP

### Actors
- **Primary actor:** Coach.

### Preconditions
1. The coach has at least one past session.

### Postconditions
1. The page renders five numbers: sessions led, attendance, no-shows, average rating, commission (if enabled).

### Main Flow (Happy Path)
1. Coach opens `/coach/earnings`.
2. The page renders:
   - Sessions led this month: e.g. 24 (count of `attendance_records` with `status='showed'` where the coach was the lead).
   - Attendance count: 24 (same).
   - No-show count: 2 (count of `attendance_records` with `status='no_show'`).
   - Average rating: 4.7 (average of approved `reviews` where `coach_id=<me>`).
   - Commission split: e.g. "60% / 40% (you / academy)" — only if admin enabled it in the coach's record; otherwise the row is hidden.

### Alternate Flows

#### A1 — Month picker
1. The header has a month picker; default is current month.

#### A2 — Commission disabled
1. The commission row is hidden.

### Exception Flows

#### E1 — No data
1. The page shows zeros with a "Your first session will appear here" hint.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Earnings overview

  Scenario: Renders monthly metrics
    Given Ahmed led 24 sessions with 2 no-shows and an average rating of 4.7
    When he opens /coach/earnings
    Then the page shows "24", "24", "2", "4.7"

  Scenario: Commission enabled
    Given admin set commission_split=0.6 for Ahmed
    When he opens /coach/earnings
    Then a row "Commission split: 60% / 40%" is shown

  Scenario: Commission disabled
    Given commission_split is null
    When he opens /coach/earnings
    Then the commission row is hidden
```

### Edge Cases
1. The coach has no past sessions — all zeros.
2. The coach's commission is set by admin per coach (US-AB-010 future enhancement); v1 reads a coach column.
3. Reviews older than 12 months are excluded from the average.

### UI/UX Specifications
- Mobile: stacked cards; each card has a big number and a label.
- RTL: full RTL.
- Loading: skeleton.
- Empty: defensive.
- Error: retry.

### Data Model
- Reads `attendance_records` (this file), `reviews` (File 02), `coach_session_assignments` (this file).
- New column on `coaches`: `commission_split numeric(3,2) null` (0.60 = 60%).

### API Endpoints
- `GET /api/coach/earnings?month=YYYY-MM`

### Security Considerations
- RLS: the coach sees only their own data.
- Commission is admin-set; the coach cannot edit.

### Performance Requirements
- Page p95 < 500 ms.

### Notifications
- None.

### Localization
- Card labels EN/AR.

### Error Handling
- `forbidden` 403.

### Logging & Analytics
- `coach.earnings.view` per load.

### Testing Notes
- E2E: render with seeded data.

### Related User Stories
- US-AB-010 (File 05) coach create.

### Dependencies
- `coaches`, `attendance_records`, `reviews`, `coach_session_assignments`.

### Tags
`coach` · `earnings` · `mobile-first`

### Notes / Rationale
A focused earnings view builds trust; the alternative is asking the front desk, which is friction.

---

## US-CO-012 — Coach view-only ratings

### Story
As a coach,
I want to see the approved reviews left about me — with rating, body, activity, and the customer's name only if they made it public — and export to PDF,
So that I can track my quality and share it on social channels if I want.

### Priority: P2
### Status: Draft
### Estimate: 3
### Sprint: Sprint 5 — Coach MVP

### Actors
- **Primary actor:** Coach.

### Preconditions
1. The coach has at least one approved review.

### Postconditions
1. The page lists reviews; "Export PDF" produces a downloadable file.

### Main Flow (Happy Path)
1. Coach opens `/coach/ratings`.
2. The page lists approved reviews: rating stars, body, activity name, date, customer name (only if `profiles.public_name=true`).
3. The summary shows the average rating and total count.
4. Coach taps "Export PDF"; a PDF is downloaded.

### Alternate Flows

#### A1 — No reviews
1. "No reviews yet — be patient, the first ones are coming."

#### A2 — Customer made name public
1. The review shows the full name; otherwise "AquaLudo customer".

### Exception Flows

#### E1 — PDF generation fails
1. Toast "Couldn't generate PDF — try again".

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Coach view-only ratings

  Scenario: Lists approved reviews
    Given Ahmed has 8 approved reviews
    When he opens /coach/ratings
    Then 8 rows render
      And the summary shows "Average 4.7 — 8 reviews"

  Scenario: Customer did not make name public
    Given a review's author has public_name=false
    When the coach views the list
    Then the row shows "AquaLudo customer" instead of the name

  Scenario: Export PDF
    When the coach taps "Export PDF"
    Then a PDF file downloads with the reviews
```

### Edge Cases
1. A review has no body (rating only) — rendered as "Rating: 5/5" with no body.
2. A review is in Arabic — the body is shown in Arabic.
3. A review's author profile was deleted — shown as "AquaLudo customer".

### UI/UX Specifications
- Mobile: list view; sticky export button.
- RTL: full RTL.
- Loading: skeleton.
- Empty: defensive.
- Error: retry.

### Data Model
- Reads `reviews` (File 02), `profiles` (File 04).
- No new tables.

### API Endpoints
- `GET /api/coach/ratings?page=`
- `GET /api/coach/ratings/export.pdf` — server-side render via a PDF lib.

### Security Considerations
- The coach sees only their own reviews (RLS on `reviews` filtered by `coach_id=<me>`).
- PII minimisation: customer's `phone`, `email`, `dob` are never exposed.

### Performance Requirements
- List p95 < 500 ms.
- PDF generation p95 < 2 s for up to 100 reviews.

### Notifications
- None.

### Localization
- Body in original locale.

### Error Handling
- `pdf_failed` 500 with retry.

### Logging & Analytics
- `coach.ratings.view` / `coach.ratings.export_pdf`.

### Testing Notes
- E2E: render list, export PDF.

### Related User Stories
- US-AB-013 (File 05 review moderation), US-AC-006 (File 02 public display).

### Dependencies
- `reviews`, `profiles`.

### Tags
`coach` · `ratings` · `mobile-first` · `i18n`

### Notes / Rationale
The coach's view of their own reviews is a quality feedback loop; an exportable PDF is a low-cost goodwill gesture.

---

## US-CO-013 — Daily 7am session digest WhatsApp

### Story
As a coach,
I want to receive a WhatsApp message at 07:00 `Africa/Cairo` every day summarising my sessions for the day (start time, activity, lead vs assistant, attendee count, and any last-minute changes),
So that I can plan my morning without opening the app.

### Priority: P1
### Status: Draft
### Estimate: 3
### Sprint: Sprint 5 — Coach MVP

### Actors
- **Primary actor:** Coach.
- **System actor:** Vercel Cron; the dispatcher (File 09).

### Preconditions
1. The coach has at least one session assigned for today.
2. The coach has not muted the daily digest in their settings (US-CO-014).

### Postconditions
1. A `whatsapp_dispatch_jobs` row is enqueued with `trigger='coach_daily_digest'`, `scheduled_for=today 07:00:00 Africa/Cairo`.

### Main Flow (Happy Path)
1. Vercel Cron runs at 07:00 `Africa/Cairo`.
2. The cron handler queries `coach_session_assignments` for today, grouped by coach.
3. For each coach with sessions, the dispatcher enqueues the digest with the template `aqualudo_coach_daily_digest_v1` and parameters (count, list of sessions).
4. The Meta Cloud API sends; the coach receives the message.

### Alternate Flows

#### A1 — No sessions today
1. The cron handler skips the coach (no message).

#### A2 — Coach muted
1. The cron handler checks `notification_preferences.coach_daily_digest`; if false, skip.

#### A3 — Last-minute change
1. If a session is reassigned or cancelled after 07:00, the cron fires an additional `aqualudo_coach_session_change_v1` (per File 09 US-CN-011).

### Exception Flows

#### E1 — Cron fails
1. The retry queue absorbs the failure; if abandoned, an admin alert fires.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Daily 7am session digest

  Scenario: Coach with 4 sessions today receives a digest
    Given Ahmed has 4 sessions today
    When the 07:00 cron runs
    Then a WhatsApp is sent with template "aqualudo_coach_daily_digest_v1"
      And the body includes the count and the list of sessions

  Scenario: Coach with no sessions today
    When the 07:00 cron runs
    Then no message is sent

  Scenario: Coach muted the digest
    Given Ahmed has notification_preferences.coach_daily_digest=false
    When the cron runs
    Then no message is sent
      And a no-op row is recorded in whatsapp_dispatch_jobs
```

### Edge Cases
1. The cron runs in a different time zone — the server converts to `Africa/Cairo` for the schedule.
2. The coach's phone is invalid — the job is `failed` with `last_error='invalid_phone'`.
3. The cron is delayed by more than 5 minutes — the coach still gets the digest.

### UI/UX Specifications
- N/A (headless service; the WhatsApp is the UI).

### Data Model
- Reads `coach_session_assignments` (this file), `notification_preferences` (File 04).
- Inserts `whatsapp_dispatch_jobs` (File 09).

### API Endpoints
- `POST /api/whatsapp/dispatcher/run` — the cron entry point.

### Security Considerations
- The cron handler is gated by the Vercel Cron secret.
- Per-coach opt-out enforced.

### Performance Requirements
- The cron processes 50 coaches in < 30 s.

### Notifications
- The digest itself.

### Localization
- Template EN/AR by `profiles.locale`.

### Error Handling
- Retries per File 09 US-CN-016.

### Logging & Analytics
- `whatsapp.dispatch.coach_daily_digest.scheduled` per coach.

### Testing Notes
- E2E: simulate the cron; assert the message is sent.

### Related User Stories
- US-CN-013 (File 09), US-CO-014 (mute setting).

### Dependencies
- `coach_session_assignments`, `notification_preferences`, dispatcher.

### Tags
`coach` · `digest` · `cron` · `whatsapp`

### Notes / Rationale
A 07:00 daily digest replaces the coach's morning app-open; the alternative is "I forgot about the 09:00 session" which is a service failure.

---

## US-CO-014 — Coach settings (notification triggers, language, phone change request)

### Story
As a coach,
I want a settings page to opt in/out of the three coach-facing notification triggers (new session assignment, customer reply, daily digest), change my language preference, and submit a phone number change request that requires admin approval,
So that I have control over my own surfaces without admin hand-holding for the small things.

### Priority: P1
### Status: Draft
### Estimate: 3
### Sprint: Sprint 5 — Coach MVP

### Actors
- **Primary actor:** Coach.
- **Secondary actor:** Content admin (for phone change approval).

### Preconditions
1. The coach is signed in.

### Postconditions
1. The toggles are persisted to `notification_preferences`.
2. The language preference is persisted to `profiles.locale`.
3. A phone change request is enqueued for admin approval; on approval, `profiles.phone` is updated.

### Main Flow (Happy Path)
1. Coach opens `/coach/settings`.
2. The page renders:
   - Notification triggers: three toggles (new_session_assignment, customer_reply, daily_digest).
   - Language: a radio list (EN, AR).
   - Phone: a "Request phone change" CTA.
3. Coach toggles "daily_digest" off; saves.
4. `notification_preferences` is updated.
5. Coach changes language to AR; saves; `profiles.locale='ar'`; the UI re-renders in RTL.

### Alternate Flows

#### A1 — Phone change request
1. Coach taps "Request phone change", enters the new number, optional reason.
2. The request is enqueued; the admin is notified.
3. On approval, `profiles.phone` is updated; the coach is notified.

#### A2 — Phone change rejected
1. The coach is notified with the reason.

### Exception Flows

#### E1 — Phone change for a number already in use
1. The request is blocked; the coach is told the number is already associated with another profile.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Coach settings

  Scenario: Mute the daily digest
    When the coach toggles "daily_digest" off
    Then notification_preferences.daily_digest is false
      And the next 07:00 cron skips the coach

  Scenario: Change language to AR
    When the coach selects Arabic
    Then profiles.locale is "ar"
      And the UI re-renders in RTL

  Scenario: Request phone change
    When the coach submits a new number
    Then a request is created
      And the admin is notified
      And the coach sees the request in "Pending requests"

  Scenario: Admin approves the phone change
    When the admin approves
    Then profiles.phone is updated
      And the coach is notified
```

### Edge Cases
1. The coach's `profiles.locale` change re-renders the entire panel in the new language.
2. The phone change request expires after 7 days without admin action.
3. A coach cannot change their own role via this surface.

### UI/UX Specifications
- Mobile: full-screen settings list.
- RTL: full RTL.
- Loading: spinner.
- Empty: N/A.
- Error: toast.

### Data Model
- Updates `notification_preferences` (File 04 DDL), `profiles.locale` (File 04 DDL).
- New table for phone change requests:

```sql
coach_phone_change_requests
  id              uuid pk default gen_random_uuid()
  coach_id        uuid not null references coaches(id) on delete cascade
  old_phone       text
  new_phone       text not null
  reason          text
  status          text not null check (status in ('pending','approved','rejected')) default 'pending'
  created_at      timestamptz not null default now()
  decided_at      timestamptz
  decided_by      uuid references auth.users(id)
  rejection_reason text
  -- RLS: coach SELECT own; admin SELECT/UPDATE all
```

### API Endpoints
- `GET /api/coach/settings`
- `PATCH /api/coach/settings/notifications` — body `{ daily_digest?, new_session_assignment?, customer_reply? }`.
- `PATCH /api/coach/settings/locale` — body `{ locale: 'en'|'ar' }`.
- `POST /api/coach/settings/phone-change-request` — body `{ new_phone, reason? }`.

### Security Considerations
- The phone change must be OTP-verified before submission (the new number receives a 6-digit code).
- RLS: the coach sees only their own settings.

### Performance Requirements
- Save p95 < 300 ms.

### Notifications
- `aqualudo_phone_change_request_v1` to the admin team.
- `aqualudo_phone_change_approved_v1` / `_rejected_v1` to the coach.

### Localization
- The settings UI is locale-aware.

### Error Handling
- `phone_in_use` 409.
- `phone_invalid` 422.

### Logging & Analytics
- `coach.settings.update` per change.

### Testing Notes
- E2E: toggle, change language, request phone change.

### Related User Stories
- US-CO-013 (digest), US-LD-013 (File 01 language toggle).

### Dependencies
- `notification_preferences`, `profiles`, dispatcher.

### Tags
`coach` · `settings` · `notifications` · `i18n` · `mobile-first`

### Notes / Rationale
A coach's settings are their own; the only gated action is the phone change (security-critical, requires admin oversight to prevent hijack).

---

## End of File 08

This file was authored with detailed User Stories covering the Coach Panel for AquaLudo v2. The four tables owned here — `coach_session_assignments`, `coach_time_off`, `coach_slot_template_requests`, `attendance_records` — together with the staging table `coach_profile_drafts` and `coach_phone_change_requests` are the durable artefacts. The fourteen user stories document the dock-side reality of AquaLudo's coaching staff: today's schedule, attendance, customer messaging, profile editing, slot template change requests, time-off requests, earnings, ratings, daily digest, and settings.

Up next in the project's user-story library:

- **File 09** — Communications & Notifications US-CN-001..020
- **File 10** — Platform Infrastructure US-IN-001..018

Files 09 and 10 are already written. The AquaLudo v2 user-story library is complete with this file.
