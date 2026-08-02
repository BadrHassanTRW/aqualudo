# File 03 — Booking Flow User Stories

> **Project:** AquaLudo v2 (water sports academy on the Nile, Cairo, Egypt)
> **Stack:** Next.js 14 (App Router) + Supabase (Postgres + Auth + Storage) + Paymob
> **Domain covered by this file:** the conversion-critical booking funnel from `/booking` entry through auth gate, activity selection, pricing tier, optional coach picker, date+time slot selection with real-time availability, party-size and capacity enforcement, add-ons, package redemption (8-pack-1-free), membership redemption, customer details review, payment method selection across Paymob methods (Cards + Vodafone Cash + InstaPay + Fawry + Cash on arrival), the Paymob 3DS redirect and callback, the confirmation page that triggers WhatsApp dispatch per File 09, the waitlist join path on a full slot, and the event-driven booking entry via `/booking?event=[slug]`.
> **Last updated:** 2026-07-28
> **Status:** Draft (awaiting technical + business review)
> **Owner:** Product team
> **Related files:**
> - `01-loading-and-public-discovery.md`
> - `02-activities-and-pricing-catalog.md`
> - `04-customer-account.md`
> - `05-admin-content-management.md`
> - `06-admin-heatmap-dashboard.md`
> - `07-admin-booking-management.md`
> - `08-coach-panel.md`
> - `09-communications-notifications.md`
> - `10-platform-infrastructure.md`

---

## How to read this document

Every user story in this file follows the same template introduced in File 01 so downstream consumers can rely on a stable shape. The 23 sections per story are:

1. **Story** — the BDD-style intent (As a... I want to... So that...).
2. **Priority / Status / Estimate / Sprint** — MoSCoW priority (P0/P1/P2), workflow status, story-point estimate, owning sprint.
3. **Actors** — who triggers the flow and who else participates.
4. **Preconditions / Postconditions** — state before and after.
5. **Main Flow (Happy Path)** — numbered sequence of system + user steps.
6. **Alternate Flows** — branches the story must support.
7. **Exception Flows** — error paths.
8. **Acceptance Criteria (Gherkin)** — Given/When/Then scenarios; each is independently testable.
9. **Edge Cases** — obscure-but-real situations.
10. **UI/UX Specifications** — desktop, mobile, RTL, loading/empty/error/success states.
11. **Data Model** — Supabase tables, fields, indexes, constraints, RLS.
12. **API Endpoints** — Next.js Route Handlers (App Router), Supabase RPCs / queries, Paymob calls.
13. **Security Considerations** — RLS rules, input validation, abuse vectors, Paymob signature verification.
14. **Performance Requirements** — LCP, TTI, payloads, caches.
15. **Notifications** — WhatsApp cues owned by File 09 that this story triggers.
16. **Localization** — EN/AR copy keys; date and currency formatting.
17. **Error Handling** — codes, copy, fallback behaviour.
18. **Logging & Analytics** — funnel telemetry events.
19. **Testing Notes** — unit / integration / E2E Playwright.
20. **Related User Stories** — dependencies and dependents.
21. **Dependencies** — external services, prior stories.
22. **Tags** — for cross-cutting search.
23. **Notes / Rationale** — design decisions worth recording.

Acceptance criteria are written in **Gherkin** (Given/When/Then) so they can be reformulated directly into Playwright assertions.

The word **must** in this document means "non-negotiable for v1 ship". **Should** means strongly recommended. **Could** means deferred to v2.

---

## Architectural Context

The booking funnel is the commercial heart of AquaLudo v2. It is a Next.js App Router route group `app/(booking)/booking/*` that:

- Is **auth-gated** (US-BF-001). Anonymous entry redirects to `/login?next=...` preserving the full query string so a successful sign-in returns the customer to the booking step they were about to start. The user made required-account-to-book a locked decision.
- Renders as a single-page multi-step funnel (US-BF-002 to US-BF-012) using **SSR + React Server Components + streaming** for the slowest server fetches (slot availability, Paymob tokenization, customer packages / membership eligibility). The shell paints immediately while slow data streams in via `<Suspense>` boundaries, keeping TTFB and LCP tight per File 10 budgets.
- Persists a **client-side draft booking** in `sessionStorage["aqualudo.booking.draft.v1"]` so that accidental refresh during the funnel does not lose progress. The draft is migrated server-side to a real `bookings` row only at payment intent.
- Pays through **Paymob** with one of the wallet/card/cash methods (US-BF-012) and survives the Paymob 3DS redirect and webhook (US-BF-013). The webhook is signature-verified; the booking is **rebuilt from the callback**, never trusting client state to confirm a payment.
- Confirms via `/booking/success` (US-BF-014) and **enqueues the WhatsApp booking-confirmed dispatch** (US-CN-003 in File 09) within 30 seconds of capture.

Pages owned by this file:

| Route                                       | Component path                                              | Auth     | Rendering            |
|---------------------------------------------|-------------------------------------------------------------|----------|----------------------|
| `/booking`                                  | `app/(booking)/booking/page.tsx`                           | Yes*     | SSR + stream         |
| `/booking?activity=<slug>&tier=<tier_code>` | same as above                                                | Yes*     | SSR + stream         |
| `/booking?event=<slug>`                     | same as above                                                | Yes*     | SSR + stream         |
| `/booking/claim/<token>`                    | `app/(booking)/booking/claim/[token]/page.tsx`              | Yes**    | SSR + magic token    |
| `/booking/success/[id]`                     | `app/(booking)/booking/success/[id]/page.tsx`               | Yes      | SSR                  |
| `/api/bookings/draft`                       | `app/api/bookings/draft/route.ts`                           | Customer | Route Handler        |
| `/api/bookings/slots`                       | `app/api/bookings/slots/route.ts`                           | Customer | Route Handler        |
| `/api/bookings/quote`                       | `app/api/bookings/quote/route.ts`                           | Customer | Route Handler        |
| `/api/bookings/intent`                      | `app/api/bookings/intent/route.ts`                          | Customer | Route Handler        |
| `/api/paymob/webhook`                       | `app/api/paymob/webhook/route.ts`                           | Paymob   | Route Handler        |
| `/api/waitlist`                             | `app/api/waitlist/route.ts`                                 | Customer | Route Handler        |

`*` `/booking` is auth-gated. The shell renders statically for crawler indexing (per File 01 §Architectural Context) but the interactive content requires a session.
`**` `/booking/claim/<token>` consumes the waitlist magic token; if the token is valid within 15 minutes, the customer's session is still required (the token grants access to the chosen slot only — it does not bypass auth).

Tables owned by this file (introduced in the relevant stories' Data Model sections):

- `bookings`
- `slots`
- `booking_line_items`
- `waitlist_entries`
- `session_package_redemptions`

Tables referenced but defined in other files: `activities`, `activity_pricing_tiers`, `activity_add_ons`, `session_packages`, `coaches` (File 02); `coach_slot_templates` (File 02, US-AC-008); `coach_session_assignments` (File 08); `profiles`, `customer_packages`, `membership_subscriptions`, `waitlist_subscriptions`, `notification_preferences` (File 04); `whatsapp_dispatch_jobs`, `whatsapp_messages`, `magic_tokens` (File 09); `payment_transactions`, `booking_events` (File 07).

Currency is stored as integer piasters (1 EGP = 100 piasters). The customer portal displays amounts with the supervisor-defined currency locale string `en-EG` (English) or `ar-EG` (Arabic), formatted to two decimal places with the `EGP`/`ج.م` suffix.

---

## Domain Glossary

- **Funnel step** — one of `activity` → `tier` → `coach` → `slot` → `party_size` → `addons` → `package_or_membership` (optional)` → `details` → `payment` → `success`. The customer may move backward freely; each step writes into the client-side draft booking; the funnel state is URL-encoded so refresh / share is safe.
- **Booking** — the canonical row in the `bookings` table once the customer commits to a Paymob intent (or selects cash-on-arrival). Has a unique customer-readable id like `ROW-2026-0412` (US-BF-013).
- **Slot** — an instance of an activity priced at a tier at a specific `start_at`/`end_at`. Capacity is enforced per slot (`slots.capacity_used`). Slot templates are generated from `coach_slot_templates` (File 02 US-AC-008) and materialised into `slots` rows on a 60-day rolling horizon by a Vercel Cron (`0 3 * * *`) owned by File 10.
- **Party size** — number of attendees for the booking. Range is 1–N (default ≤6 in the funnel; per-slot `activity_pricing_tiers.capacity` caps group bookings). The customer enters one self plus friends/family.
- **Add-on** — an optional purchasable item attached to a booking (wetsuit rental, GoPro footage, photo package, private coach upgrade). Each activity defines which add-ons are available.
- **Session package** — a prepaid bundle from File 02 (`session_packages`); the customer purchases one in the catalog and redeems sessions during the funnel (US-BF-009).
- **Membership redemption** — Gold/Silver subscribers consume a per-month session allowance (US-BF-010). Over-capacity falls back to pay-per-session.
- **Cash on arrival** — Paymob method category 173 (cash-on-delivery adapted for the academy). Customer reserves the slot; pays at the venue; admin marks it collected in US-AD-011 (File 07).
- **Paymob intent** — a server-side payment intent created by `POST /api/bookings/intent`; returned to the client as a Paymob payment key coupled with a hosted payment page redirect that handles 3DS, wallet OTP, and the Fawry reference flow.
- **Waitlist entry** — a per-slot "I want this slot if it fills up" insertion. Created when a customer tries to book a fully-booked slot (US-BF-015) — distinct from `waitlist_subscriptions` (File 04) which is the customer's per-activity persistent interest. The waitlist-offer re-assignment processing logic lives in File 07 US-AD-008.
- **Magic token** — defined in File 09 US-CN-006/007; used here in `/booking/claim/<token>` to admit a waitlist-offer-selected customer without re-typing the booking details.
- **Stepper** — the top-of-funnel breadcrumb that visualises progress (Activity / Tier / Coach / Slot / Party / Add-ons / Details / Payment). The current step is bolded; completed steps are teal; future steps are grey.

---

## Table of Contents

1. US-BF-001 — Auth gate on /booking
2. US-BF-002 — Booking entry with pre-selected activity (`/booking?activity=[slug]&tier=[tier_code]`)
3. US-BF-003 — Activity picker step
4. US-BF-004 — Pricing tier selection card
5. US-BF-005 — Coach optional picker (default "Any")
6. US-BF-006 — Date+time slot selection (real-time availability via Supabase RPC)
7. US-BF-007 — Party size & capacity enforcement
8. US-BF-008 — Add-ons step (multi-select; live total)
9. US-BF-009 — Session package redemption (8-pack +1 free)
10. US-BF-010 — Membership redemption
11. US-BF-011 — Customer details review (pre-filled from profile; emergency contact; locale)
12. US-BF-012 — Payment method selection (Cards, Vodafone Cash, InstaPay, Fawry, Cash on arrival)
13. US-BF-013 — Paymob redirect & return (3DS, callback, signature validation)
14. US-BF-014 — Confirmation page + WhatsApp dispatch
15. US-BF-015 — Waitlist join during booking (full slot)
16. US-BF-016 — Event booking entry via `/booking?event=[slug]`

---

## US-BF-001 — Auth gate on /booking

### Story
As a visitor ready to book a Rowing session,
I want the booking route to redirect me to `/login` if I'm anonymous, but return me to the booking page I was on after authentication, with all my query params intact,
So that I don't lose my selected activity and tier just because I needed to sign in.

### Priority: P0
### Status: Draft
### Estimate: 3
### Sprint: Sprint 2 — Booking MVP

### Actors
- **Primary actor:** Anonymous visitor.
- **System actor:** Next.js middleware (`middleware.ts`) running on Vercel Edge; Supabase Auth session cookie.

### Preconditions
1. The visitor is not signed in (`sb-access-token` cookie absent).
2. The visitor navigates to `/booking?activity=rowing&tier=onboarding`.

### Postconditions
1. The visitor is redirected to `/login?next=<url-encoded original path and query>`.
2. After any of the four sign-in methods (US-CA-001..004 from File 04), the visitor lands back on `/booking?activity=rowing&tier=onboarding`.

### Main Flow (Happy Path)
1. Visitor opens `/booking?activity=rowing&tier=onboarding`.
2. Edge middleware resolves Supabase session cookie; no user.
3. Middleware responds 307 to `/login?next=%2Fbooking%3Factivity%3Drowing%26tier%3Donboarding`.
4. Visitor authenticates via any of the four methods; the auth callback (`/auth/callback`) reads the `next` search param.
5. Auth callback validates `next` against an allowlist of internal paths (open-redirect prevention per US-IN-004 File 10).
6. Redirect to `/booking?activity=rowing&tier=onboarding` as a signed-in customer.

### Alternate Flows

#### A1 — `/login` is opened directly (not via auth gate)
1. `next` is empty; post-auth redirect lands on `/account`.

### Exception Flows

#### E1 — Malformed next redirect (foreign host)
1. Callback rejects the foreign-host `next`; falls back to `/account`. Logged as `auth.callback.next_blocked`.

#### E2 — Session cookie expired mid-funnel
1. Next request to `/booking` triggers middleware challenge; cycle restarts with the same preserved query.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Auth gate on /booking

  Scenario: Anonymous /booking redirects with next preserved
    Given an anonymous visitor
    When she navigates to /booking?activity=rowing&tier=onboarding
    Then the response is a redirect to /login?next=%2Fbooking%3Factivity%3Drowing%26tier%3Donboarding
      And the response status code is 307

  Scenario: After sign-in the visitor returns to the booking route
    Given a visitor completes WhatsApp OTP sign-in with next preserved
    Then the post-auth redirect lands on /booking?activity=rowing&tier=onboarding as a signed-in customer

  Scenario: Open-redirect attempt blocked
    Given the visitor crafts /login?next=https://evil.example.com
    When auth callback processes
    Then it falls back to redirecting /account
      And audit_logs records action="auth_callback_next_blocked"
```

### Edge Cases
1. Visitor signs in then signs out mid-funnel — session cookie cleared; next click re-triggers the gate.
2. `next` contains hash fragments — middleware preserves hash in the encoded value.

### UI/UX Specifications
- The login page surfaces a banner "Sign in to continue booking your Rowing session" when `next` is present.
- RTL: form mirroring per US-LD-013.

### Data Model
Reads `auth.users`/`profiles`. No new tables.

### API Endpoints
- `/auth/callback` (File 04).
- The gate operates in middleware; no Route Handler call is required.

### Security Considerations
- Open-redirect allowlist enforced server-side (US-IN-004).
- The encoded `next` is verbatim; HTML-escaped before rendering the login banner.

### Performance Requirements
- Middleware run p95 < 50 ms.

### Notifications
- None.

### Localization
- "Sign in to continue booking" `booking.gate.banner.*` EN/AR.

### Error Handling
- `next_invalid` falls back to `/account` with a toast `auth_redirect_default`.

### Logging & Analytics
- `booking.gate.redirect` `{ next_path }`.

### Testing Notes
- Unit: middleware matcher.
- E2E: Playwright + Supabase Auth test provider.

### Related User Stories
- US-IN-004 (File 10) middleware contract.
- US-CA-001..004 (File 04) sign-in methods.

### Dependencies
- Supabase Auth middleware helper from `@supabase/ssr`.

### Tags
`booking` · `auth` · `gate` · `middleware`

### Notes / Rationale
The user's locked decision is that customer accounts are required to book. Preserving the query string on redirect converts the friction of the auth gate into a non-issue.

---

## US-BF-002 — Booking entry with pre-selected activity

### Story
As a visitor who clicked "Book now" on the Wakeboarding detail page `/activities/wakeboard`,
I want the booking funnel to open with the activity and tier pre-selected from the URL query string,
So that I don't have to re-pick Wakeboarding inside the funnel and can move straight to date/time selection.

### Priority: P0
### Status: Draft
### Estimate: 3
### Sprint: Sprint 2 — Booking MVP

### Actors
- **Primary actor:** Signed-in customer.
- **System actor:** `/booking` SSR; Supabase queries.

### Preconditions
1. Customer is signed in (post-gate).
2. The `activity` slug and optional `tier` code resolve to enabled records.

### Postconditions
1. The funnel opens with the Activity step shown as "selected"; Tier step visible; remaining steps enabled.
2. The stepper breadcrumb reflects the current position.

### Main Flow (Happy Path)
1. Customer navigates to `/booking?activity=wakeboard&tier=foundation`.
2. SSR fetches the activity by slug; if the slug is unknown or archived, falls back to US-BF-003's blank activity picker.
3. SSR fetches the tier; if the `tier` code is missing/unknown/disabled, the customer lands on the Tier step with the default enabled tier pre-selected.
4. The Activity step rendered as a read-only summary card (image, name, short description) with an "Edit" affordance back to US-BF-003.
5. The Tier step rendered with the requested tier highlighted.
6. Customer proceeds to Coach → Slot → ...

### Alternate Flows

#### A1 — Activity slug unknown `(e.g. /booking?activity=kitten-row)` 
1. SSR renders US-BF-003 picker; logs `booking.entry.unknown_activity`.

### Exception Flows

#### E1 — Activity is archived but historically bookable
1. SSR shows "This activity is no longer bookable. Pick another." and falls back to picker.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Booking entry with pre-selected activity

  Scenario: Valid activity and tier pre-fill
    Given the customer opens /booking?activity=wakeboard&tier=foundation
    Then the Activity step shows "Wakeboarding" as selected
      And the Tier step shows "Foundation" pre-selected
      And the customer starts on the Coach step

  Scenario: Unknown tier falls back to default
    Given the customer opens /booking?activity=rowing&tier=nonexistent
    Then the Activity step shows "Rowing" selected
      And the Tier step pre-selected to "On-Boarding" (default enabled)
      And the customer starts on the Coach step

  Scenario: Unknown activity falls back to picker
    Given the customer opens /booking?activity=unknown
    Then the Activity picker step renders with all published activities
```

### Edge Cases
1. Activity has zero published tiers — funnel lands on a "Pricing coming soon" stub; customers can waitlist by message (no waitlist_subscribe UI in this edge case).

### UI/UX Specifications
- Activity read-only card 4:3 image + name; "Edit" button top-right.

### Data Model
Reads `activities`, `activity_pricing_tiers`. No new tables.

### API Endpoints
- SSR server component fetcher `selectActivityBySlug(slug)`.

### Security Considerations
- RLS: anonymous access to activities; customer access to tiers.

### Performance Requirements
- SSR p95 < 400 ms.

### Notifications
- None.

### Localization
- Activity name from jsonb.

### Error Handling
- `activity_archived` → alert + picker fallback.

### Logging & Analytics
- `booking.entry.started` `{ has_activity, has_tier }`.

### Testing Notes
- E2E: navigate from activity detail card through booking.

### Related User Stories
- US-AC-001 (File 02) catalog "Book now" CTA.

### Dependencies
- File 02 catalog.

### Tags
`booking` · `entry` · `activity` · `url_params`

### Notes / Rationale
Pre-selection removes a step from the funnel and dramatically improves conversion. URL-driven selection also makes the funnel shareable.

---

## US-BF-003 — Activity picker step

### Story
As a customer who entered `/booking` without an activity preselected,
I want to pick from a compact grid of all enabled activities inside the funnel,
So that I can choose a Rowing or Wakeboarding session without abandoning the funnel.

### Priority: P0
### Status: Draft
### Estimate: 5
### Sprint: Sprint 2 — Booking MVP

### Actors
- **Primary actor:** Signed-in customer.

### Preconditions
1. Customer is signed in.

### Postconditions
1. The picker step shows all activities with `status='published'`.
2. Each card is selectable; selecting updates the URL `/booking?activity=<slug>` and persists the draft.

### Main Flow (Happy Path)
1. SSR fetches activities into a 2-column grid.
2. Each card shows photo, name (locale), starting price, "Choose" pill.
3. Customer taps an activity; the URL is updated statelessly; the next step (Tier) is enabled.

### Alternate Flows

#### A1 — Customer changes Activity mid-funnel
1. Customer uses the breadcrumb to come back; current selection highlighted.

### Exception Flows

#### E1 — Activity catalog empty
1. Picker surfaces the marketing empty state ("We're updating our activity list; please WhatsApp us").

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Activity picker step

  Scenario: All published activities render in the picker
    Given there are 5 published activities
    When the picker step renders
    Then 5 cards are listed sorted by display_order ASC

  Scenario: Selecting updates the URL and draft
    Given the customer taps "Wakeboarding"
    Then the URL becomes /booking?activity=wakeboard
      And the booking draft stores activity_id pointing to Wakeboarding
      And the Tier step becomes available
```

### Edge Cases
1. Activity marked `is_private_only=true` — card shows a "Private only" badge.

### UI/UX Specifications
- Two-column grid desktop; one-column mobile; tap opens Tier step.

### Data Model
Reads `activities`. No new tables.

### API Endpoints
- SSR component reuses the catalog query from US-AC-001 (File 02); cached 60s.

### Security Considerations
- Anon RLS read.

### Performance Requirements
- Render < 400 ms.

### Notifications
- None.

### Localization
- Names from jsonb.

### Error Handling
- `no_activities` empty state.

### Logging & Analytics
- `booking.picker.activity_selected`.

### Testing Notes
- E2E: picker to tier transition.

### Related User Stories
- US-AC-001 (File 02) catalog; US-BF-002 entry.

### Dependencies
- None new.

### Tags
`booking` · `picker` · `activity`

### Notes / Rationale
The picker is a fallback path; the primary funnel path enters with activity pre-selected.

---

## US-BF-004 — Pricing tier selection card

### Story
As a customer booking Rowing,
I want a single card showing all enabled pricing tiers (On-Boarding 200 EGP, Foundation 200 EGP, Performance 200 EGP, Elite 200 EGP, Private 400 EGP) with their duration and capacity,
So that I can choose the right tier for my level without confusion.

### Priority: P0
### Status: Draft
### Estimate: 3
### Sprint: Sprint 2 — Booking MVP

### Actors
- **Primary actor:** Signed-in customer.

### Preconditions
1. Activity selected; ≥1 enabled tier.

### Postconditions
1. Tier selection writes the tier id into the draft; the next step is enabled.

### Main Flow (Happy Path)
1. SSR fetches enabled tiers for the activity, sorted by `display_order ASC`.
2. Renders a radio list of tier cards.
3. Customer taps a tier; selected card highlights teal; tier id stored in the draft.

### Alternate Flows

#### A1 — Privately-marked tiers (cap=1)
1. Tier card shows "1 person" capacity pill.

### Exception Flows

#### E1 — Activity has zero tiers
1. "Pricing coming soon" stub; customer can WhatsApp admin.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Pricing tier selection

  Scenario: Rowing shows 4 enabled tiers
    Given the customer selected "Rowing" which has 4 enabled tiers
    When the Tier step renders
    Then 4 radio rows appear in order On-Boarding, Foundation, Performance, Elite each with a 200 EGP price pill

  Scenario: Private tier shows capacity 1
    Given the Rowing activity has a "Private" tier with price 400 EGP
    Then the Private row shows "Capacity: 1 person"
```

### Edge Cases
1. Activity has 6 tiers — list scrolls; default visible.

### UI/UX Specifications
- Radio rows with 80px image thumbnail at left, name + description mid, price + duration right.

### Data Model
Reads `activity_pricing_tiers`. No new tables.

### API Endpoints
- SSR component query.

### Security Considerations
- RLS anon.

### Performance Requirements
- Render < 200 ms.

### Notifications
- None.

### Localization
- Names and prices localised.

### Error Handling
- `no_tiers` stub.

### Logging & Analytics
- `booking.tier.selected` `{ tier_code }`.

### Testing Notes
- E2E: pick rowing private 400.

### Related User Stories
- US-AB-006 (File 05) admin tier CRUD.

### Dependencies
- `activity_pricing_tiers`.

### Tags
`booking` · `tier` · `pricing`

### Notes / Rationale
The tiers for the same Rowing activity share a 200 EGP price in v1; the variation is purely level/audience labelling — clarity carried in description copy.

---

## US-BF-005 — Coach optional picker (default "Any")

### Story
As a customer booking a Wakeboarding session,
I want to pick a specific named coach from their public next-7-days availability, or accept "Any available coach" as the default,
So that I can retain my preferred coach but the academy can fill slots even if a specific coach isn't picked.

### Priority: P1
### Status: Draft
### Estimate: 5
### Sprint: Sprint 2 — Booking MVP

### Actors
- **Primary actor:** Signed-in customer.
- **System actor:** `coaches` (File 02); `coach_slot_templates` (File 02).

### Preconditions
1. Activity selected; at least one published coach with the activity in `coaches.specialties`.

### Postconditions
1. Either "Any" or a specific coach id is selected in the draft.

### Main Flow (Happy Path)
1. SSR presents three coaches who can teach Wakeboarding sorted by display_order.
2. Default "Any available coach" radio is pre-selected.
3. Customer taps a coach — funnel reveals that coach's next-7-days slot grid inline.
4. Customer selects a slot; both the coach id and slot id are recorded in the draft.

### Alternate Flows

#### A1 — Coach unavailable within 14 days
1. Slot grid shows next-7-days only; if no slot, customer is nudged to a "next-14-days limited view" if admin enabled.

### Exception Flows

#### E1 — Selected coach becomes unavailable
1. Coach marks time off (US-CO-010 in File 08) after the customer selected; the funnel surfaces an alert and reverts to a comparable slot from another coach.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Coach optional picker

  Scenario: "Any" pre-selected
    Given the customer reached the Coach step
    Then "Any available coach" is selected by default

  Scenario: Specific coach selection reveals their slot grid
    Given the customer taps "Ahmed Z."
    Then the next-7-days Wakeboarding slot grid appears inline filtered to Ahmed's templates
```

### Edge Cases
1. Customer chooses "Any" then comes back to Coach step — selection retained.

### UI/UX Specifications
- Three coach avatar cards; selected card outlined teal.

### Data Model
Reads `coaches` + `coach_slot_templates`.

### API Endpoints
- SSR list coaches by activity; `GET /api/bookings/slots?coach_id=&activity_id=`.

### Security Considerations
- Anon read on public coach fields only.

### Performance Requirements
- Coach list < 300 ms; slot grid < 500 ms.

### Notifications
- US-CN-011 coach-new-assignment fires if a specific coach is selected at confirmation.

### Localization
- Coach bios EN/AR.

### Error Handling
- `coach_no_template` → "Coach Ahmed's schedule is not yet published; choose another".

### Logging & Analytics
- `booking.coach.selected` `{ coach_id|'any' }`.

### Testing Notes
- E2E: switching coaches updates slots.

### Related User Stories
- US-AC-008 (File 02) public coach page; US-AB-010 (File 05) admin coach CRUD; US-CO-009 (File 08) coach slot template requests.

### Dependencies
- `coach_slot_templates`.

### Tags
`booking` · `coach` · `picker` · `slots`

### Notes / Rationale
"Any" is the recommended default for operational flexibility; specific coach selection is a customer-retention feature.

---

## US-BF-006 — Date+time slot selection (real-time availability)

### Story
As a customer booking a Rowing session tomorrow,
I want to see the next 14 days' slot grid (1-cell per slot, color-coded by remaining capacity, refreshed in near-real-time so two customers don't grab the last slot),
So that I can pick a date+time confident that the slot is genuinely available.

### Priority: P0
### Status: Draft
### Estimate: 13
### Sprint: Sprint 2 — Booking MVP

### Actors
- **Primary actor:** Signed-in customer.
- **System actor:** Supabase RPC `slots_for(activity_id, tier_id, coach_id, from_date, to_date)`; Realtime subscription on `public:slots`.

### Preconditions
1. Activity + tier (and optional coach) selected.
2. Slot horizon contains at least one published slot.

### Postconditions
1. Selected slot written to the draft; party-size step enabled.

### Main Flow (Happy Path)
1. SSR calls `slots_for(activity_id, tier_id, coach_id, from=today, to=today+14d)` over PostgREST.
2. The SSR payload renders a 14-day calendar; each slot cell colored by remaining capacity (`slots.capacity_used >= capacity` → red/empty; `> 0` → green; `<= 50%` → amber).
3. Customer taps a slot; the cell becomes "selected" teal.
4. In the background, the cell publishes a Supabase Realtime subscription on its slot row id so that if another customer grabs the last seat, the cell updates to "filled" within ~1 s.
5. Customer proceeds to Party size.

### Alternate Flows

#### A1 — Customer picks a slot, then another customer grabs it
1. Realtime event flips the cell red; a toast "Slot just filled; please pick another" appears.
2. Draft slot id invalidated; the Party size step disabled until a new slot is selected.

### Exception Flows

#### E1 — RPC returns empty set
1. "No slots open in the next 14 days. Join the waitlist." CTA → US-BF-015.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Slot selection with real-time capacity

  Scenario: Slot grid renders 14 days
    Given Rowing has slots published for the next 14 days
    When the Slot step renders
    Then 14 days are listed with cells color-coded by remaining capacity

  Scenario: Two customers race for the last slot
    Given Rowing slot "ROW-1432-1207-2" has capacity_used=1 capacity=2
    When both Salma and Omar click "Reserve" simultaneously
    Then exactly one of them confirms; the other sees the slot turn red within 1s via Realtime
      And the loser's draft slot id is invalidated
```

### Edge Cases
1. Slot has two tiers with overlapping window (Wakeboarding 30min vs Rowing 60min) — these are separate `slots` rows rendered separately.
2. Customer opens the funnel in two tabs — both tabs share the Realtime subscription; capacity events reflect in both.

### UI/UX Specifications
- Desktop: 2-column calendar (7 days per column), stacked weeks.
- Mobile: horizontal swipe carousel of 7-day strips.
- RTL: dates run right-to-left; week starts Saturday per Arabic convention.
- Loading: skeleton cells.
- Empty: "No slots open" + waitlist CTA.
- Error: "Couldn't fetch slots. Retry."

### Data Model

```sql
slots
  id                 uuid pk default gen_random_uuid()
  activity_id        uuid not null references activities(id) on delete cascade
  tier_id            uuid references activity_pricing_tiers(id) on delete cascade   -- nullable for activity-level slots
  coach_id           uuid references coaches(id)
  start_at           timestamptz not null
  end_at             timestamptz not null                          -- computed from start_at + tier.duration_minutes
  capacity           int not null default 4                       -- copy from tier.capacity for speed; admin may override
  capacity_used      int not null default 0 check (capacity_used >= 0)
  status             text not null check (status in ('open','full','cancelled','completed')) default 'open'
  created_at         timestamptz not null default now()
  unique (activity_id, tier_id, start_at)
  index on (activity_id, status, start_at)
  index on (coach_id, start_at) where coach_id is not null
  -- RLS: anon SELECT; service role UPDATE on capacity_used/status
```

```sql
create or replace function slots_for(
  activity_id uuid,
  tier_id     uuid default null,
  coach_id    uuid default null,
  from_date   timestamptz default now(),
  to_date     timestamptz default now() + interval '14 days'
) returns table (
  id uuid,
  activity_id uuid,
  tier_id uuid,
  coach_id uuid,
  start_at timestamptz,
  end_at timestamptz,
  capacity int,
  capacity_used int,
  remaining int
)
language sql security definer set search_path = public as $$
  select id, activity_id, tier_id, coach_id, start_at, end_at, capacity,
         capacity_used,
         capacity - capacity_used as remaining
    from slots
   where slots.activity_id = slots_for.activity_id
     and (slots_for.tier_id  is null or slots.tier_id  = slots_for.tier_id)
     and (slots_for.coach_id is null or slots.coach_id = slots_for.coach_id)
     and start_at >= from_date
     and start_at <= to_date
     and status = 'open'
   order by start_at asc;
$$;
grant execute on function slots_for(uuid, uuid, uuid, timestamptz, timestamptz) to authenticated;
```

### API Endpoints
- `GET /api/bookings/slots?activity_id=&tier_id=&coach_id=&from=&to=` (wraps the RPC).
- Supabase Realtime channel `public:slots` filtered by `activity_id=eq.<id>`.

### Security Considerations
- RLS anon (no PII in slots).
- Realtime subscription requires the customer's JWT.
- Capacity decrement happens atomically in a single transaction with the booking insert (US-BF-013).

### Performance Requirements
- RPC p95 < 350 ms (indexed by `(activity_id, status, start_at)`).
- Realtime cell-update lat < 1 s.

### Notifications
- None directly; selecting a specific coach triggers US-CN-011 later at confirmation.

### Localization
- Calendar dates locale-aware; Arabic numerals for AR (`٥ جمادى`); locale-aware weekday labels.

### Error Handling
- `slots_unavailable` empty state with waitlist CTA.

### Logging & Analytics
- `booking.slot.selected` `{ slot_id, remaining }`.
- `booking.slot.taken_by_another` `{ slot_id }`.

### Testing Notes
- Unit: RPC correctness, capacity math.
- Integration: simulate Realtime race in a Playwright pair test.
- E2E: select a slot, confirm draft contains the slot id.

### Related User Stories
- US-CO-009 (File 08) coaches request slot template changes authoring slots.
- US-AB-011 (File 05) admin slot template management.

### Dependencies
- Slot materialisation cron (File 10).

### Tags
`booking` · `slots` · `realtime` · `capacity`

### Notes / Rationale
Realtime is justified only when the inventory is genuinely contested — AquaLudo's small slot capacities (2-4) qualify. Open redirects: none; the funnel preserves the URL state.

---

## US-BF-007 — Party size & capacity enforcement

### Story
As a customer bringing 2 friends to a Wakeboarding session,
I want to pick party size 3 and be blocked if the slot can't accept 3 attendees,
So that I don't reach checkout and find my friends can't fit.

### Priority: P0
### Status: Draft
### Estimate: 5
### Sprint: Sprint 2 — Booking MVP

### Actors
- **Primary actor:** Signed-in customer.
- **System actor:** `slots.capacity - slots.capacity_used`.

### Preconditions
1. Slot selected.
2. Slot has `remaining = capacity - capacity_used` seats.

### Postconditions
1. Draft stores `party_size` from 1..6 (frontend limit) and `<= remaining` (server validation).

### Main Flow (Happy Path)
1. The Party step surfaces a stepper with `+ / -` controls.
2. Initial value is 1.
3. Server validates `party_size <= remaining` (the URL query stores `?party=3`).
4. Repeat for in-customer limits if applicable; the draft stores `party_size`; the next step enables.

### Alternate Flows

#### A1 — Slot remaining=1
1. The stepper disables `+` beyond 1.

### Exception Flows

#### E1 — Concurrent booking races the party-size submit
1. The booking intent request is rejected with `slot_full`; the funnel bounces back to slot step with a toast.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Party size and capacity enforcement

  Scenario: Party size capped by remaining
    Given a slot has remaining=2
    When the customer increments party size 1→2
    Then the increment to 3 is disabled

  Scenario: Concurrent race yields slot_full
    Given two customers try to book party_size=2 on a remaining=2 slot
    Then exactly one succeeds
      And the other gets 409 "slot_full"
```

### Edge Cases
1. Customer tries `?party=99` via URL manipulation — server rejects with 422.

### UI/UX Specifications
- Numeric stepper, party-size number rendered as "you + 2".

### Data Model
Reads `slots`. No new tables; draft preserves `party_size`.

### API Endpoints
- `POST /api/bookings/quote` (request validated).
- Validation runs server-side via zod.

### Security Considerations
- Server-side validation of `party_size in [1, min(activity.max_capacity, slot.remaining)]`.

### Performance Requirements
- < 100 ms.

### Notifications
- None.

### Localization
- "you + N" copy keys EN/AR.

### Error Handling
- `slot_full` 409; `party_size_invalid` 422.

### Logging & Analytics
- `booking.party_size.set`.

### Testing Notes
- Unit: server validation.

### Related User Stories
- US-BF-006 slots.

### Dependencies
- None new.

### Tags
`booking` · `party_size` · `capacity`

### Notes / Rationale
Server validation is the truth; client hints are advisory.

---

## US-BF-008 — Add-ons step (multi-select; live total)

### Story
As a customer booking Wakeboarding,
I want to add a GoPro footage add-on and a wetsuit rental, see the live total update,
So that I can complete the checkout without surprises.

### Priority: P1
### Status: Draft
### Estimate: 3
### Sprint: Sprint 2 — Booking MVP

### Actors
- **Primary actor:** Signed-in customer.

### Preconditions
1. Activity + tier + slot + party_size selected.

### Postconditions
1. Draft `addons[]` array stores selected add-on ids; live total recalculated including party_size multipliers where applicable.

### Main Flow (Happy Path)
1. SSR fetches enabled activity_add_ons for the activity plus global ones.
2. Renders a checkbox grid of cards.
3. Customer ticks "GoPro footage" (e.g. 250 EGP flat per booking) and "Wetsuit rental" (e.g. 100 EGP per attendee).
4. Live total updates via quote API `POST /api/bookings/quote`.

### Alternate Flows

#### A1 — No add-ons configured
1. Step surfaces "Add-ons are not available for this activity"; "Continue" enabled directly.

### Exception Flows

#### E1 — Add-on disabled mid-funnel
1. Quote validation rejects; UI surfaces "Add-on no longer available" toast and unticks the box.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Add-ons step with live total

  Scenario: Selecting add-ons updates the total
    Given a Wakeboarding session at 1800 EGP with party_size=2
      And a wetsuit add-on priced at 100 EGP per attendee
      And a GoPro add-on priced at 250 EGP per booking
    When the customer ticks both
    Then the live total shows 1800 + 200 + 250 = 2250 EGP

  Scenario: Add-on disabled mid-funnel reverts
    Given the customer has wetsuit ticked
      And admin disables wetsuit while she is on the next step
    When the quote is requested again
    Then the wetsuit line item is removed and the total recalculated
```

### Edge Cases
1. Add-on with `party_size_based_pricing=true` — applied per attendee.
2. Add-on with `per_session=true` — applied once per booking.

### UI/UX Specifications
- Card grid; floating sticky footer with the live total.

### Data Model
Reads `activity_add_ons`. Draft writes add-on ids into `booking_line_items`.

```sql
booking_line_items
  id              uuid pk default gen_random_uuid()
  booking_id      uuid not null references bookings(id) on delete cascade
  type            text not null check (type in ('session','add_on','package_redemption','membership_redemption'))
  ref_id          uuid not null                  -- activity_add_ons.id / session_packages.id / etc.
  amount_egp_int  bigint not null check (amount_egp_int >= 0)
  qty             int not null default 1
  description     jsonb not null                 -- locale-aware name snapshot
  created_at      timestamptz not null default now()
  index on (booking_id)
  -- RLS: owner SELECT; service role INSERT
```

### API Endpoints
- `POST /api/bookings/quote` recomputes the total.

### Security Considerations
- Server re-validates each line item's enabled state and price.

### Performance Requirements
- Quote p95 < 250 ms.

### Notifications
- None.

### Localization
- Add-on names jsonb.

### Error Handling
- `addon_disabled` 409; `addon_price_changed` — surface new price inline.

### Logging & Analytics
- `booking.addons.selected` `{ ids }`.

### Testing Notes
- E2E: tick add-ons; verify total inline.

### Related User Stories
- US-AB-007 (File 05) admin add-on CRUD.

### Dependencies
- `activity_add_ons`.

### Tags
`booking` · `addons` · `quote` · `line_items`

### Notes / Rationale
Live total is critical; users hate surprise charges at Paymob step.

---

## US-BF-009 — Session package redemption (8-pack + 1 free)

### Story
As a customer who previously purchased an 8-pack + 1 free Rowing package,
I want to redeem one session instead of paying at checkout,
So that my prepaid balance is consumed and the booking is confirmed without a Paymob redirect.

### Priority: P0
### Status: Draft
### Estimate: 8
### Sprint: Sprint 2 — Booking MVP

### Actors
- **Primary actor:** Signed-in customer with `customer_packages.sessions_remaining > 0`.
- **System actor:** `customer_packages` (File 04); `session_package_redemptions` table owned here.

### Preconditions
1. The customer has an active `customer_packages` row with `sessions_remaining > 0` for the chosen activity.

### Postconditions
1. `customer_packages.sessions_remaining -= 1` (or `bonus_remaining -= 1` if regular depleted) — preference is regular sessions first per File 04 US-CA-013.
2. A `session_package_redemptions` row records the redemption's linkage to the booking.
3. Booking `payment_method='package_redemption'`; no Paymob intent.

### Main Flow (Happy Path)
1. At the package-redeem step, SSR fetches the customer's active packages that include the chosen activity.
2. UI lists eligible packages; the recommended one (closest to expiry, then most sessions left) is ranked first.
3. Customer taps "Use 1 session" → draft `payment_method='package_redemption'`, `ref_id=customer_packages.id`.
4. At confirmation (US-BF-014), the database transaction:
   a. Insert into `session_package_redemptions`.
   b. Decrement `customer_packages.sessions_remaining` or `bonus_remaining`.
   c. Insert booking with `status='confirmed'` and `total_egp_int=0`.
   d. Decrement `slots.capacity_used` by `party_size`.
   e. Enqueue WhatsApp `booking_confirmed` dispatch (US-CN-003) with payment method param `8-pack + 1 free`.

### Alternate Flows

#### A1 — Package depleted
1. UI hides redemption option; customer proceeds to pay.

#### A2 — Package expired with sessions remaining
1. UI surfaces "Package expired; remaining sessions forfeited." No redemption offered.

### Exception Flows

#### E1 — Race condition: customer has 2 active packages and tries to redeem from both
1. The transaction is atomic; the second request sees `sessions_remaining=0` on the same `customer_packages` row after the first commits.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Session package redemption

  Scenario: Successful redemption consumes one regular session
    Given a customer with customer_packages.sessions_remaining=5 bonus_remaining=1 for Rowing
    When she books Rowing On-Boarding using one package session
    Then sessions_remaining becomes 4, bonus_remaining stays 1
      And a session_package_redemptions row links her booking to her package
      And the booking is confirmed with total_egp_int=0

  Scenario: Regular depleted first, then bonus consumed
    Given a customer with sessions_remaining=0 bonus_remaining=2
    When she books using the package
    Then bonus_remaining becomes 1, sessions_remaining stays 0

  Scenario: Package expired blocks redemption
    Given a customer's package expired yesterday with sessions_remaining=3
    Then the redemption affordance is hidden
```

### Edge Cases
1. Customer has package for Rowing-only and tries to book Wakeboarding — package doesn't appear (activities_includes @> ARRAY[activity_id]).
2. Customer cancels a package-redeemed booking within the 24h refund rule (per US-CA-012) — booking_events records the restore; the package counter is incremented back.

### UI/UX Specifications
- Package grid with progress bar; "Use 1 session" CTA prominent.

### Data Model

```sql
session_package_redemptions
  customer_package_id  uuid not null references customer_packages(id) on delete cascade
  booking_id           uuid not null references bookings(id) on delete cascade
  redeemed_at          timestamptz not null default now()
  primary key (booking_id)                -- one redemption per booking
  index on (customer_package_id)
  -- RLS: owner SELECT; service role INSERT (atomic with booking insert)
```

### API Endpoints
- `POST /api/bookings/intent` with `payment_method='package_redemption'`.
- A single Postgres function `confirm_package_redemption(booking_id, customer_package_id)` performs the atomic update.

### Security Considerations
- All updates run inside one transaction with row locks on the customer_packages row (SELECT FOR UPDATE) so racing booking attempts cannot exceed the available count.

### Performance Requirements
- Confirm p95 < 600 ms including transaction.

### Notifications
- US-CN-003 fires with payment_method "8-pack + 1 free".

### Localization
- Param text: "Your 8-pack + 1 free" in EN, AR.

### Error Handling
- `package_depleted` 409.
- `package_expired` 409.

### Logging & Analytics
- `booking.package_redeemed` `{ package_id, regular_used:bool }`.

### Testing Notes
- Unit: decrement preference; integration: race test.

### Related User Stories
- US-CA-013 (File 04) tracker; US-AB-008 (File 05) admin package CRUD; US-CA-012 (File 04) cancel restores.

### Dependencies
- `customer_packages`, `session_packages`.

### Tags
`booking` · `package_redemption` · `8pack` · `atomicity`

### Notes / Rationale
The user locked the bonus session ordering: regular sessions decrement first so customers always "feel" the +1 free as the last one. This story is the authoritative statement that File 04 US-CA-013 references.

---

## US-BF-010 — Membership redemption

### Story
As a Silver monthly member with 4 sessions used this month out of 12,
I want to redeem an included session when booking a Rowing session,
So that the membership benefits are felt without paying per session.

### Priority: P1
### Status: Draft
### Estimate: 5
### Sprint: Sprint 2 — Booking MVP

### Actors
- **Primary actor:** Signed-in customer with `membership_subscriptions.status='active'`.
- **System actor:** `membership_subscriptions` (File 04).

### Preconditions
1. Membership is active and the activity is in `tier.activities_included` and `sessions_used_this_period < sessions_per_month`.

### Postconditions
1. Booking `payment_method='membership_redemption'` with `total_egp_int=0`.
2. `membership_subscriptions.sessions_used_this_period += 1`.
3. A `booking_line_items` row records the membership redemption.

### Main Flow (Happy Path)
1. At the redemption step, the SSR surfaces "Use your Silver membership session (4/12 used this month)".
2. Customer taps "Use included session".
3. At confirmation, the transaction decrements `sessions_used_this_period`, increments `capacity_used`, inserts booking.
4. WhatsApp dispatch `booking_confirmed` per US-CN-003 with the payment method param "Silver membership — session 5/12".

### Alternate Flows

#### A1 — Membership sessions exhausted this period
1. UI surfaces "You've used all 12 sessions this month. Book at per-session price (200 EGP) or wait for next billing date."

#### A2 — Customer books an activity not in the membership
1. UI hides the redemption option.

### Exception Flows

#### E1 — Membership cancelled-at-period-end mid-funnel
1. Server validates again at confirm; rejects with `membership_cancelled` 409.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Membership redemption

  Scenario: Active membership redeems one included session
    Given an active Silver membership with sessions_used_this_period=4
    When the customer books Rowing and uses the membership
    Then sessions_used_this_period becomes 5
      And the booking is confirmed with total_egp_int=0
      And whatsapp_booking_confirmed template fires with payment_method="Silver membership — session 5/12"

  Scenario: Member exhausts sessions within the period
    Given sessions_used_this_period=12
    Then the membership redemption affordance is hidden
      And per-session pricing is shown
```

### Edge Cases
1. Customer starts the booking before midnight on the period-end day and confirms after midnight — the cron that resets the period has already bumped `current_period_end` and reset `sessions_used_this_period=0`; the booking confs against the new period.

### UI/UX Specifications
- Membership card with usage bar; "Use included session" CTA.

### Data Model
Reads/writes `membership_subscriptions` (File 04). Writes `booking_line_items` (owned here, defined in US-BF-008).

### API Endpoints
- `POST /api/bookings/intent { payment_method: 'membership_redemption' }`.

### Security Considerations
- Row-level SELECT FOR UPDATE on the membership row inside the confirm transaction.

### Performance Requirements
- Confirm p95 < 600 ms.

### Notifications
- US-CN-003.

### Localization
- Copy keys `booking.membership.*` EN/AR.
- Per-period label localises "this month" (EN) / "هذا الشهر" (AR).

### Error Handling
- `membership_not_eligible` 409.
- `membership_period_reset_to_zero` 200.

### Logging & Analytics
- `booking.membership_redeemed` `{ tier_slug, used_count }`.

### Testing Notes
- Integration: cancel-at-period-end boundary cases.

### Related User Stories
- US-CA-014 (File 04) customer view of membership.
- US-AB-009 (File 05) admin membership tier CRUD.

### Dependencies
- `membership_tiers`, `membership_subscriptions`.

### Tags
`booking` · `membership` · `redemption`

### Notes / Rationale
The redemption over-capacity fallback is "pay-per-session"; this is mentioned but the membership's own counter increments separately from any paid bookings.

---

## US-BF-011 — Customer details review

### Story
As a customer approaching checkout,
I want the funnel's Details step to show my pre-filled profile (name, phone, email, emergency contact) and a chance to update it inline, plus a locale confirmation,
So that the academy has accurate safety information before I pay.

### Priority: P0
### Status: Draft
### Estimate: 3
### Sprint: Sprint 2 — Booking MVP

### Actors
- **Primary actor:** Signed-in customer.

### Preconditions
1. Customer's `profiles` row is loaded.

### Postconditions
1. Customer can edit emergency contact inline (write-through to `profiles.emergency_contact`).
2. Booking draft captures a snapshot of the customer's locale and emergency contact for the booking record.

### Main Flow (Happy Path)
1. At Details step, SSR fetches the profile.
2. Renders read-only name + phone + email; editable emergency contact + role e.g. "I'm a beginner".
3. Customer edits; SAVE persists to `profiles`.
4. Draft snapshot stored.

### Alternate Flows

#### A1 — Customer profile phone unverified
1. UI surfaces "Verify phone" CTA → US-CA-002 flow.

### Exception Flows

#### E1 — Profile fetch fails
1. Details step falls back to manual entry; warned to update profile after booking.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Customer details review

  Scenario: Pre-filled details snapshot
    Given a signed-in customer with phone "+201011329642" and emergency contact set
    When she reaches the Details step
    Then the fields are pre-filled
      And her edits to emergency_contact persist to profiles

  Scenario: Unverified phone warns
    Given a customer whose profiles.phone is pending verification
    Then the Details step shows a "Verify phone" CTA but still allows booking
```

### Edge Cases
1. Customer books on behalf of a friend — emergency contact should be the friend's; this requires a comment field available in Details.

### UI/UX Specifications
- Single-column form; emergency contact sub-form.

### Data Model
Reads/writes `profiles.emergency_contact`.

### API Endpoints
- Reuses `PATCH /api/account/profile` (File 04) for inline edits.

### Security Considerations
- Inline edit auth-gated.

### Performance Requirements
- < 300 ms.

### Notifications
- None.

### Localization
- Locale confirmation nudges the booking's `locale_snapshot` field for downstream WhatsApp dispatch.

### Error Handling
- `profile_incomplete` 200 with editable form.

### Logging & Analytics
- `booking.details.snapshotted`.

### Testing Notes
- E2E: fill emergency, proceed.

### Related User Stories
- US-CA-007 (File 04) profile edit.

### Dependencies
- `profiles`.

### Tags
`booking` · `details` · `emergency`

### Notes / Rationale
Pre-fill reduces friction; the editable emergency contact is safety-critical and copied into the booking so the coach can see it (US-CO-003 File 08) even if the profile later changes.

---

## US-BF-012 — Payment method selection (Cards, Vodafone Cash, InstaPay, Fawry, Cash on arrival)

### Story
As a customer at the payment step,
I want to pick one of the Paymob methods supported by AquaLudo (Card, Vodafone Cash, InstaPay, Fawry, Cash on arrival),
So that I can pay using the channel my Egyptian financial life uses.

### Priority: P0
### Status: Draft
### Estimate: 5
### Sprint: Sprint 2 — Booking MVP

### Actors
- **Primary actor:** Signed-in customer.
- **System actor:** Paymob API (intent creation).

### Preconditions
1. All upstream steps completed; total > 0 (package/membership paths bypass this step).

### Postconditions
1. Draft `payment_method` reflects chosen method.
2. The "Continue" button kicks off US-BF-013 Paymob intent creation.

### Main Flow (Happy Path)
1. SSR fetches the methods enabled in admin settings (default: all five cards+walled+cash).
2. Renders 5 radio cards with brand icons.
3. Customer selects "Vodafone Cash".
4. Customer taps "Continue".
5. `POST /api/bookings/intent` creates a Paymob payment intent with that method; returns a redirect URL.

### Alternate Flows

#### A1 — Cash on arrival
1. Customer selects cash; no Paymob intent redirect; the booking is created in `status='pending'` with `payment_method='cash_on_arrival'`. WhatsApp dispatched via US-CN-003 variant for cash reservations.
2. Customer is taken straight to `/booking/success/[id]` (with a "Pay 200 EGP at the academy" reminder).

#### A2 — Customer redeems package or membership
1. The Payment step is skipped entirely; the booking created directly with `payment_method='package_redemption'` or `membership_redemption'`.

### Exception Flows

#### E1 — Paymob intent creation fails
1. UI surfaces "Payment provider not available, please try again"; no booking created.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Payment method selection

  Scenario: Pick Vodafone Cash and create intent
    Given a customer at the Payment step with total 200 EGP
    When she picks "Vodafone Cash" and taps Continue
    Then /api/bookings/intent creates a Paymob intent with method="vodafone_cash"
      And she is redirected to Paymob's hosted payment page

  Scenario: Cash on arrival skips redirect
    Given a customer selects "Cash on arrival"
    When she taps Continue
    Then a booking is created in status="pending" with payment_method="cash_on_arrival"
      And /booking/success/[id] loads with a "Pay at the academy" reminder

  Scenario: Package redemption skips the Payment step entirely
    Given the customer redeemed a package
    Then the Payment step is bypassed
      And the booking is confirmed with payment_method="package_redemption"
```

### Edge Cases
1. Paymob's method list at the merchant agrees with admin settings; if mismatched, admin warns in File 05 to keep the surface consistent.

### UI/UX Specifications
- Card grid with Paymob method icons; bottom-anchored "Continue" button.

### Data Model
Reads Paymob config. Booking draft `payment_method`.

### API Endpoints
- `POST /api/bookings/intent` (Paymob integration id vaulted).
- `GET /api/paymob/methods` for the admin-managed list of methods.

### Security Considerations
- Paymob integration id + secret in Supabase Vault; never shipped to client.
- All amounts are server-side re-validated from quoted line items.

### Performance Requirements
- Intent creation p95 < 1.5 s.

### Notifications
- US-CN-003 wires up once the booking transitions to `confirmed` (cards) or `pending` (cash).

### Localization
- Method names EN/AR; "Cash on arrival" / "الدفع عند الحضور".

### Error Handling
- `paymob_intent_failed` 502.
- `payment_method_disabled` 409.

### Logging & Analytics
- `booking.payment.method_selected`.

### Testing Notes
- Integration: mock Paymob intent.

### Related User Stories
- US-AB-015 (File 05) methods config; US-AD-005 (File 07) manual cash bookings; US-AD-007 (File 07) refunds.

### Dependencies
- Paymob merchant integration.

### Tags
`booking` · `payment_method` · `paymob`

### Notes / Rationale
Per the locked interview, all five Paymob channels are required. Each has a slightly different ux post-selection (cardsInternally 3DS; wallets have on-device OTP; Fawry prints a reference code; cash is local).

---

## US-BF-013 — Paymob redirect & return (3DS, callback, signature validation)

### Story
As a customer who tapped "Continue" after selecting Card,
I want to be redirected to Paymob's hosted payment page, complete 3DS, and return to AquaLudo where my booking is rebuilt from a signature-verified Paymob callback (not from client state),
So that a malicious client cannot forge a successful booking.

### Priority: P0
### Status: Draft
### Estimate: 8
### Sprint: Sprint 2 — Booking MVP

### Actors
- **Primary actor:** Signed-in customer.
- **System actor:** Paymob redirect + `POST /api/paymob/webhook`.

### Preconditions
1. The customer's booking intent is in `status='pending'` with a `payment_intent_id` and an HMAC signature stored on `payment_transactions.pending_signature`.
2. The customer's browser accepted the redirect to Paymob.

### Postconditions
1. On Paymob success callback: `payment_transactions.status='captured'`, `bookings.status='confirmed'`, `bookings.id` committed as `ROW-2026-0412`, a `booking_events` row `event_type='payment_captured'` (File 07).
2. WhatsApp `booking_confirmed` (US-CN-003) enqueued within 30s.
3. The customer lands on `/booking/success/ROW-2026-0412`.
4. On Paymob cancellation callback: `payment_transactions.status='voided'`; booking `status='cancelled'` with `cancel_reason='payment_abandoned'`; no slot consumed; customer redirected to `/booking?activity=...&tier=...` with toast "Payment cancelled; choose a different method or try again".

### Main Flow (Happy Path)
1. `POST /api/bookings/intent` returns Paymob's hosted payment URL with `merchant_reference=<booking_id>`.
2. Browser redirect; customer enters Card details; 3DS challenge pops up.
3. Paymob posts the result webhook to `POST /api/paymob/webhook` with `HMAC` header.
4. Server recomputes the HMAC against the vaulted Paymob secret.
5. Server matches `merchant_reference` to the booking.
6. On success: server transaction:
   a. Update `payment_transactions.status='captured'`.
   b. Update `bookings.status='confirmed'`, generate the human id `ROW-2026-0412`.
   c. Insert `booking_events` row `event_type='payment_captured'`.
   d. Enqueue `booking_confirmed` dispatch with the correct payment method param.
7. Paymob redirects the customer's browser to `/booking/success/ROW-2026-0412`.

### Alternate Flows

#### A1 — Browser redirect lands before webhook
1. `/booking/success/[id]` polls `GET /api/bookings/[id]/status` for up to 30s; on `confirmed` it renders success; on `cancelled` it routes back to the funnel; if neither after 30s, it surfaces "Payment processing — we'll WhatsApp you the confirmation within 60s".

### Alternate Flow A2 — Vodafone Cash / InstaPay on-device flow
1. No 3DS; Paymob sends an OTP to the customer's phone; on confirm, webhook fires with success/failure as above.

### Exception Flows

#### E1 — Signature mismatch
1. Server returns 401, logs `paymob.webhook.signature_invalid`, ignores the payload.

#### E2 — Order amount mismatch vs server quote
1. Server rejects on capture; booking `status='cancelled'` with `cancel_reason='amount_mismatch'`.

#### E3 — Webhook doesn't arrive
1. The customer's `pending` booking expires (15-min timeout); the cron sweep marks it `cancelled` and frees the slot capacity.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Paymob redirect and signature-verified callback

  Scenario: Successful card capture confirms the booking
    Given a pending booking "ROW-2026-0412-pending" with total_egp_int=20000
    When Paymob posts the success webhook with a valid HMAC
    Then payment_transactions.status becomes "captured"
      And bookings.status becomes "confirmed"
      And a booking_confirmed WhatsApp is enqueued within 30 seconds
      And the browser lands on /booking/success/ROW-2026-0412

  Scenario: Tampered signature rejected
    Given a Paymob webhook with an altered HMAC header
    When the server verifies
    Then it returns 401
      And no rows are updated
      And audit log records action="paymob_signature_invalid"

  Scenario: Cancellation voids the booking and frees the slot
    Given the customer abandons Paymob at the 3DS step
    When Paymob posts the cancellation webhook
    Then payment_transactions.status becomes "voided"
      And bookings.status becomes "cancelled"
      And slots.capacity_used is decremented for the freed seats

  Scenario: Webhook missing causes webhook miss timeout
    Given a pending booking whose webhook never arrives within 15 minutes
    When the expiry cron sweeps
    Then the booking is marked cancelled with reason "webhook_timeout"
      And the slot capacity is restored
```

### Edge Cases
1. Customer re-pays for the same booking after a timeout — a new `payment_transactions` row is inserted with a new intent; the prior `cancelled` transaction is preserved.

### UI/UX Specifications
- Success page shows the order id, activity, date, with a "View in my bookings" CTA.
- Cancellation page offers "Try another payment method" plus "Reschedule".

### Data Model
Writes `bookings`, the central table of this file:

```sql
bookings
  id                 uuid pk default gen_random_uuid()
  human_id           text unique                      -- "ROW-2026-0412", generated at confirm
  user_id            uuid not null references auth.users(id) on delete cascade
  activity_id        uuid not null references activities(id)
  tier_code          text not null                    -- snapshot, joins activity_pricing_tiers by code
  coach_id           uuid references coaches(id)
  slot_id            uuid not null references slots(id)
  start_at           timestamptz not null              -- snapshot from slots.start_at
  party_size         int not null check (party_size between 1 and 8)
  total_egp_int      bigint not null check (total_egp_int >= 0)   -- integer piasters
  payment_method     text not null check (payment_method in
                       ('card','vodafone_cash','instapay','fawry','cash_on_arrival',
                        'package_redemption','membership_redemption'))
  payment_intent_id  text                             -- Paymob intent id (nullable for non-Paymob)
  status             text not null check (status in
                       ('pending','confirmed','cancelled','no_show','attended',
                        'refunded_partial','refunded_full')) default 'pending'
  cancelled_at       timestamptz
  cancel_reason      text
  reminder_24h_sent_at    timestamptz
  reminder_1h_sent_at     timestamptz
  locale_snapshot    text check (locale_snapshot in ('en','ar')) default 'en'
  emergency_contact_snapshot jsonb                     -- snapshot from profiles at confirm time
  event_id           uuid references events(id)        -- if event-driven booking (US-BF-016)
  created_at         timestamptz not null default now()
  updated_at         timestamptz not null default now()
  index on (user_id, status, start_at)
  index on (slot_id, status)
  index on (status, start_at) where status in ('pending','confirmed')
  -- RLS: owner SELECT/UPDATE; coach SELECT for assigned bookings; admin SELECT/UPDATE; service role on inserts
```

A serial generator for `human_id` per activity-slug:

```sql
create sequence booking_human_id_seq_rowing;
create sequence booking_human_id_seq_kayaking;
create sequence booking_human_id_seq_sup;
create sequence booking_human_id_seq_wakeboard;
create sequence booking_human_id_seq_fitness;
-- generator picks based on activity slug:
-- ROW-YYYY-IDMMDD where ID is the nextval of the per-activity sequence, zero-padded
create or replace function get_human_id(activity_slug text, day date) returns text
language sql security definer as $$
  select upper(substr(activity_slug,1,3)) || '-' || extract(year from day)::text || '-' ||
         lpad(nextval('booking_human_id_seq_' || activity_slug)::text, 4, '0');
$$;
```

### API Endpoints
- `POST /api/bookings/intent` creates Paymob intent; returns redirect URL.
- `POST /api/paymob/webhook` signature-verified callback handler.
- `GET /api/bookings/[id]/status` polling helper.

### Security Considerations
- Paymob HMAC verified against vaulted secret; bodies over 1KB are pre-canonicalised.
- The webhook handler is THE authoritative confirmation surface; no client trust.
- `merchant_reference` matched server-side.
- Amount compared against `booking_line_items` snapshot.

### Performance Requirements
- Webhook-to-confirm p95 < 1.5 s (DB write + dispatch enqueue).
- Success page poll p95 < 200 ms per call.

### Notifications
- US-CN-003 booking confirmed dispatched at the moment of confirmation.
- US-CN-010 admin new booking trigger if admin prefs opted in.

### Localization
- Template copy keys per method param localised.

### Error Handling
- `paymob_signature_invalid` 401.
- `paymob_amount_mismatch` 200 with booking cancelled.
- `webhook_timeout` 200 silent.

### Logging & Analytics
- `booking.intent.created` `{ payment_intent_id, method }`.
- `booking.confirmed` `{ booking_id, captured_amount }`.
- `booking.cancelled` `{ reason }`.

### Testing Notes
- Unit: HMAC computation; sequence prefix map.
- Integration: mock Paymob success/cancel/reject flows.
- E2E: Happy pay and abandon pay.

### Related User Stories
- US-CN-003 (File 09) WhatsApp confirmed trigger.
- US-AD-005 (File 07) admin manual booking.
- US-AD-007 (File 07) refunds.
- US-CN-007 (File 09) waitlist claimant flow lands here.

### Dependencies
- Paymob merchant integration; Paymob webhook URL registered in Paymob dashboard.

### Tags
`booking` · `paymob` · `webhook` · `signature` · `3ds`

### Notes / Rationale
The user's locked decision was to support all five Paymob methods plus package/membership redemption. The signature-verified webhook is the only source of truth for "did payment really happen" — this is a hard security boundary. The booking rebuilt-from-callback approach (not trusting client state) is also a hard rule in the handoff spec.

---

## US-BF-014 — Confirmation page + WhatsApp dispatch

### Story
As a customer who just paid,
I want a confirmation page that displays my booking id, activity, date/time, coach, location, and a "Add to calendar" button, with a WhatsApp confirmation arriving on my phone within 30 seconds,
So that I have proof of booking on the site and on my phone.

### Priority: P0
### Status: Draft
### Estimate: 5
### Sprint: Sprint 2 — Booking MVP

### Actors
- **Primary actor:** Signed-in customer.
- **System actor:** `/booking/success/[id]` page; File 09 dispatcher.

### Preconditions
1. Booking `status='confirmed'`.

### Postconditions
1. The confirmation page renders the booking summary.
2. The WhatsApp `booking_confirmed` dispatch trace exists in `whatsapp_messages`.

### Main Flow (Happy Path)
1. Paymob webhook completes; /booking/success/ROW-2026-0412 SSR fetches the booking.
2. Renders summary card with id, date/time, coach (or "Any"), location, party size, add-ons, payment method, total.
3. The customer lands; the page polls `whatsapp_messages` (limited to within 30s) and once delivered shows a green tick "WhatsApp sent".
4. "Add to calendar" downloads .ics.
5. CTAs: "View in my bookings" (to /account/bookings?tab=upcoming), "Book another".

### Alternate Flows

#### A1 — WhatsApp dispatch slower than 30s
1. The page transitions to "WhatsApp queued; will arrive soon" instead of green-tick.

### Exception Flows

#### E1 — Booking fetch fails
1. Pre-rendered 500 page (US-LD-014).

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Confirmation page and WhatsApp dispatch

  Scenario: Happy path confirms and sends WhatsApp within 30s
    Given Paymob capture completes for booking "ROW-2026-0412"
    When the browser lands on /booking/success/ROW-2026-0412
    Then the summary card shows the right activity, time, coach, total
      And within 30 seconds the WhatsApp confirmed template is sent
      And the page surfaces a "WhatsApp sent" status

  Scenario: Add to calendar
    Given the customer taps "Add to calendar"
    Then an .ics downloads with the slot start/end, address, coach name
```

### Edge Cases
1. WhatsApp send deferred by daily cap — page surfaces "WhatsApp will arrive later today".

### UI/UX Specifications
- Summary card 720px max; teal-checkmark header.
- ICS includes event alarm 1h before.

### Data Model
Reads `bookings` + `whatsapp_messages`.

### API Endpoints
- `GET /api/bookings/[id]` returns full summary.
- `GET /api/bookings/[id]/whatsapp-status` for the polling.

### Security Considerations
- RLS owner.

### Performance Requirements
- SSR p95 < 500 ms.

### Notifications
- US-CN-003 within 30 s SLA.

### Localization
- All strings localised; date/time Africa/Cairo.

### Error Handling
- `booking_not_confirmed` 200 with "Still processing" spinner.

### Logging & Analytics
- `booking.success.viewed` `{ booking_id, whatsapp_sent_within_30s:bool }`.

### Testing Notes
- E2E: full Paymob capture → success page → whatsapp stub.

### Related User Stories
- US-CN-003 (File 09); US-CA-009 (File 04).

### Dependencies
- File 09 dispatcher.

### Tags
`booking` · `success` · `whatsapp` · `ics`

### Notes / Rationale
30 seconds is the user-experience contractual ceiling. The polling pattern on the page lets the customer see the green tick as soon as their phone buzzes.

---

## US-BF-015 — Waitlist join during booking (full slot)

### Story
As a customer who found her desired slot fully booked,
I want a "Join waitlist" button on the full slot cell that inserts me on the slot-specific waitlist and adds me to the activity's `waitlist_subscriptions` if I'm not already,
So that I'm positioned for the admin's manual pick if a slot opens.

### Priority: P1
### Status: Draft
### Estimate: 5
### Sprint: Sprint 2 — Booking MVP

### Actors
- **Primary actor:** Signed-in customer.
- **System actor:** `waitlist_entries` (owned here) + `waitlist_subscriptions` (File 04).

### Preconditions
1. Selected activity + tier; hover/tap on a full slot reveals "Join waitlist".

### Postconditions
1. A `waitlist_entries` row exists with `slot_id` and `status='pending'`.
2. A `waitlist_subscriptions` row (idempotent create) ensures the customer is on the activity's waitlist.

### Main Flow (Happy Path)
1. Customer hovers over a full slot red cell; "Join waitlist" pill appears.
2. Tap → modal "You'll be added to the waitlist for [activity] [date+time]. Admin will manually pick you if a slot opens; you'll receive a WhatsApp with a 15-minute claim window."
3. Confirm → `POST /api/waitlist { activity_id, slot_id, preferred_times }`.
4. Server inserts `waitlist_entries` with `joined_at=now(), status='pending'`.
5. Server ensures activity-level `waitlist_subscriptions` row exists.
6. UI updates to "On waitlist"; breadcrumb closes.

### Alternate Flows

#### A1 — Customer already on the waitlist for this slot
1. Modal says "You're already on the waitlist for this slot"; UI shows the existing entry timestamp.

### Exception Flows

#### E1 — Slot is no longer full (someone cancelled between view and tap)
1. Modal re-renders to the booking flow at the Party-size step with this slot soft-selected.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Waitlist join during booking

  Scenario: Full slot exposes waitlist join
    Given a Rowing slot "ROW-1432-1207" has capacity=2 capacity_used=2
    When the customer taps the slot cell
    Then a "Join waitlist" pill appears in the modal

  Scenario: Customer joins the waitlist
    When the customer confirms joining
    Then a waitlist_entries row exists with slot_id="ROW-1432-1207" status="pending"
      And a waitlist_subscriptions row exists for that customer+activity
      And UI surfaces "On waitlist"

  Scenario: Slot freed mid-join
    Given capacity_used dropped to 1 between view and tap
    When the customer attempts to join waitlist
    Then the modal reverts to the Party size step with that slot selectable
```

### Edge Cases
1. Customer joined waitlist, then the slot opens — admin manual pick per US-AD-008 (File 07) creates an offer to the customer per US-CN-007.

### UI/UX Specifications
- Modal 480px; "Join waitlist" CTA gold; dismiss crosses back to slot picker.
- After join: a teal "On waitlist" pill replaces the "Join" button on the cell.

### Data Model

```sql
waitlist_entries
  id            uuid pk default gen_random_uuid()
  user_id       uuid not null references auth.users(id) on delete cascade
  activity_id   uuid not null references activities(id) on delete cascade
  slot_id       uuid references slots(id) on delete cascade        -- null = activity-level ride-along
  joined_at     timestamptz not null default now()
  status        text not null check (status in ('pending','offered','fulfilled','expired')) default 'pending'
  unique (user_id, slot_id)
  index on (slot_id, status)
  index on (activity_id, status)
  -- RLS: owner SELECT/INSERT; admin SELECT
```

### API Endpoints
- `POST /api/waitlist` (customer).
- `GET /api/waitlist/me` (customer reads their pending entries).

### Security Considerations
- RLS owner + admin SELECT.
- Unique constraint prevents duplicate joins from pathologies.

### Performance Requirements
- Insert + activity-level subscription ensure p95 < 250 ms.

### Notifications
- US-CN-007 fires when admin picks this customer; nothing fires here directly.

### Localization
- "Join waitlist" copy keys EN/AR.

### Error Handling
- `already_on_waitlist` 409.
- `slot_now_open` 409 with retry.

### Logging & Analytics
- `booking.waitlist.joined` `{ slot_id }`.

### Testing Notes
- E2E: hover full slot → join.

### Related User Stories
- US-CA-017 (File 04) waitlist subscriptions; US-AD-008 (File 07) admin pick; US-CN-007 (File 09) offer WhatsApp.

### Dependencies
- File 04 `waitlist_subscriptions`.

### Tags
`booking` · `waitlist` · `join`

### Notes / Rationale
The "waitlist_entries" is slot-specific (short-lived), while `waitlist_subscriptions` is activity-level and persistent. The admin manual pick (US-AD-008 in File 07) consults both, ordered by `joined_at ASC`.

---

## US-BF-016 — Event booking entry via `/booking?event=[slug]`

### Story
As a customer reading the Run & Row Challenge event page (`/events/run-and-row-challenge`),
I want the "Sign up" CTA to take me straight into the booking funnel with the event's context preserved (banner sticker, prefilled activity, prefilled date) so that my booking reflects my event participation,
So that the academy sees event-driven signups on the heatmap without a separate RSVP flow.

### Priority: P1
### Status: Draft
### Estimate: 5
### Sprint: Sprint 2 — Booking MVP

### Actors
- **Primary actor:** Signed-in customer.

### Preconditions
1. Event `status='published'` and `end_at > now()`.
2. Customer clicked "Sign up" on `/events/[slug]`.

### Postconditions
1. Booking funnel opens with the activity pre-selected (or recommended) for the event's tier.
2. The booking `event_id` is set to the event's id when confirmed.
3. The heatmap dashboard and booking record annotate the event participation.

### Main Flow (Happy Path)
1. Customer opens `/events/run-and-row-challenge`.
2. `Sign up` button anchors to `/booking?event=run-and-row-challenge` (per the locked events-as-marketing decision).
3. SSR fetches the event, identifies a recommended activity+tier (Rowing On-Boarding) and preferred slot date (the event start date if published).
4. The funnel opens at the Slot step with the date pre-scoped to the event's date.
5. Selecting a slot completes funnel; at confirm, `bookings.event_id` is set.
6. The WhatsApp `booking_confirmed` includes an `event_name` param.

### Alternate Flows

#### A1 — Event has no published booked activity link
1. Fall back to the regular Activity picker at US-BF-003.

### Exception Flows

#### E1 — Event has expired
1. SSR redirects to `/events/run-and-row-challenge?expired=1` and the "Sign up" button disabled.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Event booking entry

  Scenario: Sign-up CTA enters funnel with event context
    Given the customer navigates to /events/run-and-row-challenge
    When she taps "Sign up"
    Then the browser lands on /booking?event=run-and-row-challenge
      And the Slot step is pre-scoped to the event's date
      And the booking draft stores event_id=run-and-row-challenge

  Scenario: Booking confirm records event_id
    When the customer confirms payment
    Then the bookings.event_id is set to the event's id
      And the booking_confirmed WhatsApp includes the event name

  Scenario: Expired event disables sign-up
    Given the event end_at is in the past
    Then the /events page shows "Event ended"
      And /booking?event=run-and-row-challenge redirects back with toast "Event already ended"
```

### Edge Cases
1. Customer removes the `event` query param mid-funnel — the booking strips the event_id at confirm; admin still may register them via CSV import later.

### UI/UX Specifications
- Pre-funnel: a thin teal banner reading "Booking for Run & Row Challenge" persists on every step of the funnel.

### Data Model
Reads `events` (File 02). Writes `bookings.event_id` (column defined in US-BF-013).

### API Endpoints
- `GET /api/events/[slug]/recommended-booking` returns the recommended `(activity_slug, tier_code, preferred_date)`.
- `POST /api/bookings/intent` accepts the `event_id` param.

### Security Considerations
- Server validates that the event is published.

### Performance Requirements
- < 500 ms SSR including event lookup.

### Notifications
- US-CN-003 booking confirmed; payload includes `event_name` param.
- Admin notifications (US-CN-009) tag the booking as event-driven.

### Localization
- Event names from `events.name` jsonb; banner copy localised.

### Error Handling
- `event_not_found` → falls back to non-event funnel.
- `event_expired` 307 to /events/[slug].

### Logging & Analytics
- `booking.event.entry` `{ event_slug }`.

### Testing Notes
- E2E: events page → Sign up → confirmed booking → heatmap shows event participation.

### Related User Stories
- US-AC-009 (File 02) events marketing page.
- US-AB-012 (File 05) admin event CRUD.
- US-HM-012 (File 06) admin heatmap could filter by event.

### Dependencies
- `events` table.

### Tags
`booking` · `events` · `event_entry`

### Notes / Rationale
The user's locked decision: "Events are pure marketing pages that link to `/booking?event=[slug]` — NO separate RSVP flow". This story executes that decision.

---

## End of File 03

This file documents the booking funnel for AquaLudo v2. Adjacent files:

- `04-customer-account.md` — owns `profiles`, `customer_packages`, `membership_subscriptions`, `waitlist_subscriptions`, `notification_preferences`; the funnel's package/membership redemption flows consume those rows, and the post-confirmation success page links to the customer's Upcoming tab.
- `06-admin-heatmap-dashboard.md` — the dashboard aggregates confirmed bookings written by this file.
- `07-admin-booking-management.md` — adminrefund, no-show/attendance marks, and the waitlist-offer reassignment centerpiece consume the bookings and booking_events rows written here.
- `08-coach-panel.md` — coach attendance updates a booking's `status='attended'`, which is the trigger for the post-session WhatsApp via File 09.
- `09-communications-notifications.md` — the dispatcher that fires the booking-confirmed, reminder, and waitlist-offer messages throughout this funnel.
- `10-platform-infrastructure.md` — Vercel Cron for slot materialisation and pending-booking expiry sweep; Paymob vaulted secrets.