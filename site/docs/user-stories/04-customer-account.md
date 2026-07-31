# File 04 — Customer Account User Stories

> **Project:** AquaLudo v2 (water sports academy on the Nile, Cairo, Egypt)
> **Stack:** Next.js 14 (App Router) + Supabase (Postgres + Auth + Storage) + Paymob
> **Domain covered by this file:** the customer's authenticated portal — sign-up and the four sign-in methods (email+password, WhatsApp OTP, Google, Facebook), profile editing, dashboard home, My Bookings (upcoming/past/cancelled tabs), self-cancellation with the strict 24h refund rule, session-package tracker, membership subscription view, favorites, leave-a-review flow, waitlist subscriptions, notification preferences, personal data export, and account deletion.
> **Last updated:** 2026-07-28
> **Status:** Draft (awaiting technical + business review)
> **Owner:** Product team
> **Related files:**
> - `01-loading-and-public-discovery.md`
> - `02-activities-and-pricing-catalog.md`
> - `03-booking-flow.md`
> - `05-admin-content-management.md`
> - `06-admin-heatmap-dashboard.md`
> - `07-admin-booking-management.md`
> - `08-coach-panel.md`
> - `09-communications-notifications.md`
> - `10-platform-infrastructure.md`

---

## How to read this document

Every user story in this file follows the same template introduced in File 01 so downstream consumers (specs, plans, QA, contract review) can rely on a stable shape. The 23 sections per story are:

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
11. **Data Model** — Supabase tables, fields, indexes, constraints.
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

Acceptance criteria are written in **Gherkin** (Given/When/Then) so they can be reformulated directly into Playwright or Cypress assertions.

The word **must** in this document means "non-negotiable for v1 ship". **Should** means strongly recommended. **Could** means deferred to v2.

---

## Architectural Context

The customer portal is the authenticated half of the public site. Once a visitor signs in (or signs up) through one of four identity methods, they enter route group `app/(account)/account/*` guarded by a Supabase Auth session resolved by middleware (US-IN-004 / US-IN-005 in File 10). Anonymous requests to any `/account/*` route are redirected to `/login?next=<original path>?<original query>` with the original URL preserved so a successful sign-in returns the customer to the page they wanted.

Pages owned by this file:

| Route                                       | Component path                                          | Auth          | Rendering            |
|---------------------------------------------|---------------------------------------------------------|---------------|----------------------|
| `/login`                                    | `app/(auth)/login/page.tsx`                            | No            | Static + RSC         |
| `/signup`                                   | `app/(auth)/signup/page.tsx`                            | No            | Static + RSC         |
| `/forgot-password`                          | `app/(auth)/forgot-password/page.tsx`                  | No            | Static + RSC         |
| `/auth/callback`                            | `app/(auth)/callback/route.ts`                         | No            | Route Handler        |
| `/account`                                  | `app/(account)/account/page.tsx`                        | Customer      | SSR                  |
| `/account/bookings`                         | `app/(account)/account/bookings/page.tsx`              | Customer      | SSR                  |
| `/account/bookings/[id]`                    | `app/(account)/account/bookings/[id]/page.tsx`          | Customer      | SSR                  |
| `/account/packages`                         | `app/(account)/account/packages/page.tsx`               | Customer      | SSR                  |
| `/account/membership`                       | `app/(account)/account/membership/page.tsx`             | Customer      | SSR                  |
| `/account/favorites`                        | `app/(account)/account/favorites/page.tsx`              | Customer      | SSR                  |
| `/account/reviews/new/[bookingId]`          | `app/(account)/account/reviews/new/[bookingId]/page.tsx`| Customer      | SSR                  |
| `/account/waitlist`                         | `app/(account)/account/waitlist/page.tsx`               | Customer      | SSR                  |
| `/account/notifications`                    | `app/(account)/account/notifications/page.tsx`          | Customer      | SSR                  |
| `/account/data-export`                      | `app/(account)/account/data-export/page.tsx`            | Customer      | SSR                  |
| `/account/delete`                           | `app/(account)/account/delete/page.tsx`                 | Customer      | SSR                  |
| `/account/profile`                          | `app/(account)/account/profile/page.tsx`                | Customer      | SSR                  |

Identity fundamentals come from Supabase Auth (File 10 US-IN-004). The customer portal merely extends the auth contract with AquaLudo-specific profile state. The four sign-in methods are:

- **Email + password** with a reset-by-email flow (US-CA-001/005/006).
- **WhatsApp OTP** — a 6-digit code is sent by the dispatcher in File 09. Code is verified by a custom Supabase Auth Hook that calls `verify_otp_token`, returning a session. US-CA-002.
- **Google OAuth** — Supabase Auth provider `google`. US-CA-003.
- **Facebook OAuth** — Supabase Auth provider `facebook`. US-CA-004.

All four paths converge on the same `profiles` row keyed by `auth.users.id`. On first sign-in via any method, a database trigger `handle_new_user()` inserts a `profiles` row with `role='customer'`. The JWT `app_metadata.role` is the authoritative role source (per File 10); `profiles.role` is a denormalised mirror used for queries.

Currency is stored in integer piasters (`*_egp_int` columns where 1 EGP = 100 piasters). The customer portal displays amounts with the supervisor-defined currency locale string `en-EG` (English) or `ar-EG` (Arabic), formatted to two decimal places with the `EGP`/`ج.م` suffix.

Cross-cutting platform concerns (i18n, RLS, accessibility, audit, monitoring, security headers) are owned by File 10 and are referenced but not redefined here. The WhatsApp transport itself is owned by File 09; this file owns the customer's per-trigger opt-out surface.

---

## Domain Glossary

- **Customer** — any signed-in user with `profiles.role='customer'`. Can also be a coach or admin in another session, but the portal surface in this file is customer-only.
- **Identity method** — one of `email`, `whatsapp_otp`, `google`, `facebook`. Each auth.users row may accumulate 1..4 identities (Supabase Auth supports linking).
- **Magic token** — a single-use, time-limited signed URL token used to grant an already-authenticated customer access to a deep link (the leave-review page, the waitlist offer pay-link) without re-entering credentials.
- **Strict 24h rule** — the policy that defines the cancellation window. A booking with `start_at - now() >= 24h` may be self-cancelled by the customer for a full refund; once below 24h, the booking may not be cancelled by the customer without admin intervention and refunds are at admin discretion.
- **Package redemption** — a booking paid for by consuming one session from a `customer_packages` row. Decrements `sessions_remaining` (preferred) before `bonus_remaining`.
- **Membership redemption** — a booking that consumes one of the `sessions_per_month` slots of an active `membership_subscriptions` row. Over-capacity falls back to pay-per-session.
- **Soft delete** — a `profiles.deleted_at` flag set the moment a customer requests deletion. The customer can no longer sign in, but data is retained for admins and for the 30-day hard-delete grace window.
- **Hard delete** — final, irreversible removal of the `auth.users` row and PII fields from `profiles`, scheduled 30 days after soft delete. Booking, payment, and audit records are retained for admin traceability.
- **Notification preference** — a per-trigger, per-channel opt flag keyed by `(user_id, trigger, channel)`. The only channel in v1 is `whatsapp`.
- **Emergency contact** — a small jsonb record `{name, phone, relationship}` that a customer may attach to their profile. Surfaced to the assigned coach in US-CO-003 (File 08) on the session detail.

---

## Table of Contents

1. US-CA-001 — Sign up (email+password) with email verification
2. US-CA-002 — WhatsApp OTP login
3. US-CA-003 — Google OAuth login
4. US-CA-004 — Facebook OAuth login
5. US-CA-005 — Email+password login (remember-me + failed-attempt throttle)
6. US-CA-006 — Password reset (forgot password email flow)
7. US-CA-007 — Profile edit (name, phone, DOB, gender, locale, emergency contact, avatar)
8. US-CA-008 — Dashboard home (next session card, package/membership counters, recent activity feed)
9. US-CA-009 — My Bookings: Upcoming tab (list + cancel CTA + add-to-calendar)
10. US-CA-010 — My Bookings: Past tab (history + leave-review CTA per booking)
11. US-CA-011 — My Bookings: Cancelled tab
12. US-CA-012 — Self-cancel a booking (strict 24h rule and refund workflow)
13. US-CA-013 — Session package tracker
14. US-CA-014 — Membership subscription view (active tier, usage, cancel-at-period-end, renew)
15. US-CA-015 — Favorites (heart/unheart any activity; list view)
16. US-CA-016 — Submit review after completed session
17. US-CA-017 — Waitlist subscriptions (subscribe to activity; my subscriptions; unsubscribe)
18. US-CA-018 — Notification preferences (per-trigger opt-out; WhatsApp only)
19. US-CA-019 — Personal data export (JSON)
20. US-CA-020 — Account deletion (soft delete now + 30-day hard delete)

---

## US-CA-001 — Sign up (email+password) with email verification

### Story
As a first-time visitor ready to book a Rowing On-Boarding session,
I want to register an account with my email address and a password, then confirm my email via a magic link,
So that I can sign in to `/booking` and the academy has a verified channel to reach me.

### Priority: P0
### Status: Draft
### Estimate: 5
### Sprint: Sprint 1 — Foundation

### Actors
- **Primary actor:** Anonymous visitor on `/signup`.
- **System actor:** Supabase Auth (`signUp`), Postgres trigger `handle_new_user()`, Next.js Route Handler `POST /api/auth/signup`.

### Preconditions
1. The visitor is not yet signed in.
2. Supabase Auth email provider is enabled with a confirmation email template registered.

### Postconditions
1. A new `auth.users` row and a matching `profiles` row exist with `role='customer'`.
2. The visitor sees a "Check your inbox" confirmation screen.
3. No session is granted until the visitor clicks the magic link in the email.

### Main Flow (Happy Path)
1. Visitor navigates to `/signup` via the header "Log In" link (US-LD-009 in File 01) and taps "Create an account".
2. Visitor enters `email`, `password` (min 10 chars), optional `full_name`, and a `locale` toggle (defaults from cookie per US-LD-013).
3. Client posts JSON to `POST /api/auth/signup`.
4. Route Handler calls `supabase.auth.signUp({ email, password, options: { data: { full_name, locale } } })`.
5. Postgres trigger `handle_new_user()` inserts a `profiles` row keyed by the new `auth.users.id` with `role='customer'`, `locale`, and `full_name`.
6. Supabase sends a confirmation email; Route Handler returns `{ status: 'confirmation_required' }`.
7. Client renders `auth/check-email.tsx` ("We sent a link to **<email>**. Open it within 24 hours.").
8. Visitor clicks the magic link; Supabase redirects to `/auth/callback?code=...` which exchanges the code and redirects to `/account`.

### Alternate Flows

#### A1 — Visitor already has a profile from a previous OAuth sign-in
1. Supabase Auth detects the email is registered. `signUp` returns `user_exists` instead of creating a duplicate.
2. The Route Handler suggests "Use Google / Facebook / email sign-in instead" and prefills the email.
3. Telemetry event `signup.duplicate_email`.

### Exception Flows

#### E1 — Email deliverability failure
1. Supabase sends the confirmation but the bounce webhook records a hard bounce.
2. Next attempt to sign in surfaces "We couldn't deliver to that address; please check it or contact admin".

#### E2 — Password under strength
1. Client and server reject `< 10` chars or known-breached (HIBP check via server).

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Customer email sign-up with verification

  Scenario: Successful sign-up creates a customer profile pending confirmation
    Given a fresh visitor on /signup
      And the visitor enters "salma@example.com" with a 12-character password
      And locale "en"
    When the visitor submits the form
    Then an auth.users row is created
      And a profiles row exists with role="customer" and locale="en"
      And no session cookie is set
      And the visitor sees the "Check your inbox" screen

  Scenario: Magic link click activates the session
    Given a confirmation-required account for "salma@example.com"
    When the visitor clicks the magic link in the email
    Then the browser lands on /auth/callback
      And the session cookie is set
      And the visitor is redirected to /account

  Scenario: Duplicate email does not create a second profile
    Given a profile already exists for "salma@example.com" via Google
    When the visitor tries /signup with the same email
    Then the response indicates "account_exists"
      And no new auth.users row is created
```

### Edge Cases
1. Visitor signs up with locale `ar` — the confirmation email body is the Arabic template; the post-activation landing uses `dir="rtl"`.
2. Visitor signs up but never confirms — the unconfirmed `auth.users` row is purged after 7 days by a Supabase scheduled cleanup; the `profiles` row is removed by cascade.
3. Visitor forces a callback with an expired or already-consumed code — `/auth/callback` returns a 410-style page with a "Request a new link" CTA.

### UI/UX Specifications
- Desktop: two-column card centred at 480px; left side marketing slit, right side form.
- Mobile: single column, full-bleed form, sticky "Create account" CTA.
- RTL: form labels flip; password reveal icon mirrors.
- Loading: button spinner while `signUp` is in flight (≈1s).
- Empty: N/A.
- Error: inline red helper text near the offending field; sticky summary on submit failure.
- Success: full-page "Check your inbox" with a "Resend email" affordance (rate-limited to 1/60s).

### Data Model

```sql
profiles
  id                 uuid pk default gen_random_uuid()
  user_id            uuid not null unique references auth.users(id) on delete cascade
  full_name          text not null default ''
  phone              text                                      -- E.164
  dob                date
  gender             text check (gender in ('male','female','prefer_not')) default 'prefer_not'
  locale             text not null check (locale in ('en','ar')) default 'en'
  emergency_contact  jsonb                                     -- { name, phone, relationship }
  avatar_url         text
  role               text not null check (role in ('customer','coach','admin')) default 'customer'
  deleted_at         timestamptz
  created_at         timestamptz not null default now()
  updated_at         timestamptz not null default now()
  index on (role)
  index on (phone) where phone is not null
  -- RLS: a customer selects/updates only their own row; admin selects all.
```

```sql
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, full_name, locale, role)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
          coalesce(new.raw_user_meta_data->>'locale','en'),
          'customer')
  on conflict (user_id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
```

### API Endpoints
- `POST /api/auth/signup` — wraps `supabase.auth.signUp`. Rate-limited 5/min/IP.
- `GET /auth/callback?code=...` — exchanges code, sets session cookie, redirect to `next` or `/account`.

### Security Considerations
- Password never logged; `signUp` payload validated server-side (zod).
- Confirmation email rate-limited by Supabase Auth (resend throttle).
- HIBP breach password check on server; reject if k-anon hash is known breached.

### Performance Requirements
- Sign-up Route Handler p95 < 800ms (auth + DB trigger).
- Confirmation screen rendered < 200ms after submit.

### Notifications
- Confirmation email sent by Supabase Auth (this is the only email the platform sends in v1; everything else is WhatsApp per File 09).

### Localization
- Email subject keys: `auth.signup.subject.en|ar`.
- Copy keys: `auth.signup.heading`, `auth.signup.email_label`, `auth.signup.password_label`, `auth.signup.cta`, `auth.signup.check_email`.

### Error Handling
- `email_taken` → `signup.email_exists` toast, link to `/login`.
- `password_weak` → inline helper with rules.
- `network_error` → retry within 30s with backoff.

### Logging & Analytics
- `auth.signup.started` — `{ method: 'email', locale }`.
- `auth.signup.completed` — `{ user_id, method }`.
- `auth.signup.failed` — `{ reason }`.

### Testing Notes
- Unit: zod signup schema + Route Handler.
- Integration: trigger `handle_new_user()` against a temporary `auth.users` row; assert `profiles` insert.
- E2E: Playwright `/signup` → submit `/auth/callback` mock → land on `/account`.

### Related User Stories
- US-IN-004 (File 10) auth layer.
- US-BF-001 (File 03) `/booking` auth gate consumes the resulting session.
- US-CA-005 login.

### Dependencies
- Supabase Auth email provider enabled with branded templates.
- `handle_new_user()` trigger deployed (File 10 migration).

### Tags
`auth` · `signup` · `email` · `i18n` · `profiles`

### Notes / Rationale
Customer accounts are required to book (the user's locked decision in the discovery interview). Making email+password the default signup method maximises converter on a market where many customers share phones, while still allowing WhatsApp-OTP quick sign-in (US-CA-002) for re-entry.

---

## US-CA-002 — WhatsApp OTP login

### Story
As a returning customer with my phone registered,
I want to sign in by receiving a 6-digit code on WhatsApp and entering it on the site,
So that I don't need to remember a password and re-entry is one tap on the device I already have.

### Priority: P0
### Status: Draft
### Estimate: 8
### Sprint: Sprint 1 — Foundation

### Actors
- **Primary actor:** Customer with a verified `profiles.phone` (E.164).
- **System actor:** Route Handler `POST /api/auth/whatsapp/request` and `POST /api/auth/whatsapp/verify`; WhatsApp dispatcher (File 09).

### Preconditions
1. The customer profile exists and `profiles.phone` is not null.
2. The phone is E.164 normalised (e.g. `+201011329642`).
3. The phone is opted into WhatsApp (a `whatsapp_conversations` row exists with `status='active'`).
4. The Meta Cloud WhatsApp template `aqualudo_otp_v1` is approved.

### Postconditions
1. A pending OTP code is recorded in `auth_otp_requests` (hashed) with `expires_at = now()+5m`.
2. A WhatsApp message delivers the 6-digit code.
3. On successful verify, the customer receives a Supabase session and is redirected to `next` or `/account`.

### Main Flow (Happy Path)
1. Customer taps "Sign in with WhatsApp" on `/login`.
2. Customer enters a phone (auto-formatted to E.164 via `libphonenumber-js`).
3. Client `POST /api/auth/whatsapp/request { phone }`.
4. Server normalises the phone, looks up the `profiles` row by `phone`, returns 404 if not found (anti-enumeration: always render "If we recognise the number, you'll receive a code" success message after request).
5. Server generates a 6-digit code, hashes it (`sha256(code + per-profile salt)`) and inserts an `auth_otp_requests` row; raw code is never persisted.
6. Dispatcher enqueues an outbound WhatsApp message using template `aqualudo_otp_v1` (per File 09 US-CN-001) with `{{1}}=code` and `{{2}}="AquaLudo"`.
7. Customer receives the WhatsApp message within ~10s and types the code on the site.
8. Client `POST /api/auth/whatsapp/verify { phone, code }`.
9. Server hashes the supplied code with the stored salt and compares; on match it calls `supabase.auth.admin.generate_link` or issues a custom signed session via the Auth Hook `verify_otp_token`.
10. Cookie set, redirect to `next` or `/account`.

### Alternate Flows

#### A1 — Unknown phone number
1. Server records `auth_otp_requests` with `profile_id=NULL` but returns the same success message to the client.
2. Telemetry event `auth.otp.unknown_phone`.

#### A2 — Resend code
1. Customer taps "Resend" after 30s. Server invalidates any prior pending code, generates new, dispatches.

### Exception Flows

#### E1 — Rate limit exceeded (5 requests/15min/phone or 20/IP)
1. Server returns HTTP 429 with `retry_after`.

#### E2 — Three consecutive wrong verifies
1. Server voids the pending code and forces a 5-minute cooldown.

#### E3 — WhatsApp undelivered after 60s
1. Dispatcher surfaces a "Tap to resend" in-app banner after 60s with no delivery receipt.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: WhatsApp OTP login

  Scenario: Recognised phone receives a code on WhatsApp
    Given a profile with phone "+201011329642"
    When the customer requests a WhatsApp OTP for that phone
    Then an auth_otp_requests row exists with expires_at = now + 5 minutes
      And a WhatsApp message is dispatched using template aqualudo_otp_v1
      And the response body does not reveal whether the phone exists

  Scenario: Correct code grants a session
    Given the customer received code "481926"
    When the customer submits phone and code to /api/auth/whatsapp/verify
    Then the server compares sha256("481926" + salt) to the stored hash
      And on match a session cookie is set
      And the customer is redirected to the next page

  Scenario: Unknown phone returns the same success message
    Given no profile exists for "+201000000000"
    When the customer requests an OTP
    Then the response is identical to a known profile
      And no WhatsApp message is dispatched

  Scenario: Expired code is rejected
    Given a code generated 6 minutes ago
    When the customer submits the code
    Then verify returns 401 with code "otp_expired"
```

### Edge Cases
1. Phone is registered but `whatsapp_conversations.status='opted_out'` — dispatcher refuses to send; customer sees "Re-opt in to WhatsApp by sending BOOK to +201011329642".
2. Customer enters a phone with spaces or dashes — normalised before lookup.
3. Customer started but never finished email signup (no phone yet) — treated as unknown.
4. Two profiles share a phone (not allowed by unique index, but defensive) — verify picks the first; admin merges via File 05 users page.

### UI/UX Specifications
- Desktop / mobile identical form factor: phone field → 30s countdown → 6 separate 1-digit inputs.
- RTL: digit input guard direction flips; phone field prefix `+20`.
- Loading: phone submit disabled 8s; verify submit spinner.
- Empty: digit inputs clearly distinguish blank vs error.
- Error: red ring on first invalid digit; helper under inputs.
- Success: 100ms confetti-free confirmation; redirect.

### Data Model

```sql
auth_otp_requests
  id              uuid pk default gen_random_uuid()
  profile_id      uuid references profiles(id) on delete cascade  -- null when phone unknown
  phone           text not null                                   -- E.164 at request time
  code_hash       text not null                                   -- sha256(code || salt)
  salt            text not null                                   -- per-request random
  attempts        int not null default 0
  expires_at      timestamptz not null
  consumed_at     timestamptz
  created_at      timestamptz not null default now()
  index on (phone)
  index on (code_hash) where consumed_at is null
  -- RLS: no SELECT access to anyone but the service role
```

### API Endpoints
- `POST /api/auth/whatsapp/request { phone }` — rate-limited.
- `POST /api/auth/whatsapp/verify { phone, code }` — issues session or 401.

### Security Considerations
- Hashed codes; raw codes never logged.
- Constant-time compare on verify.
- Anti-enumeration: identical response for known/unknown phones.
- Per-phone and per-IP rate limits (US-IN-005 throttling primitives in File 10).
- Auth Hook `verify_otp_token` is `security definer` and lives in a hardened schema `auth_private`.

### Performance Requirements
- Dispatch enqueue < 200ms p95.
- Verify p95 < 300ms.

### Notifications
- Outbound WhatsApp message via File 09 dispatcher using template `aqualudo_otp_v1`.

### Localization
- Template body EN: `Your AquaLudo code is {{1}}. It expires in 5 minutes. — AquaLudo by Oar & Sail`.
- Template body AR: `رمز أكوالودو الخاص بك هو {{1}}. ينتهي خلال ٥ دقائق. — أكوالودو أوار آند سايل`.

### Error Handling
- `otp_expired` → "That code expired. Request a new one."
- `otp_invalid` → "Wrong code. X attempts left."
- `otp_locked` → "Too many attempts. Try again in 5 minutes."

### Logging & Analytics
- `auth.otp.requested` — `{ phone_prefix:`+2010`, known:bool }`.
- `auth.otp.delivered` — `{ wa_message_id }`.
- `auth.otp.verified` — `{ user_id }`.
- `auth.otp.failed` — `{ reason }`.

### Testing Notes
- Unit: hash/compare parity, rate-limit math.
- Integration: mock dispatcher; verify full chain.
- E2E: Playwright intercepts the WhatsApp envelope; asserts session.

### Related User Stories
- US-CN-001 (File 09) WhatsApp Business API connection.
- US-CA-005 email login.

### Dependencies
- File 09 dispatcher service.
- Meta Cloud API template approval.

### Tags
`auth` · `whatsapp` · `otp` · `rate-limit`

### Notes / Rationale
The user explicitly chose to support all four sign-in methods. WhatsApp OTP is the most authentic re-entry path for the Cairo market where many customers use WhatsApp as their primary inbox, but it must not become an enumeration vector against the phone database.

---

## US-CA-003 — Google OAuth login

### Story
As a customer who already uses Google,
I want to sign in to AquaLudo with my Google account in one tap,
So that I do not have to create or remember a separate AquaLudo password.

### Priority: P1
### Status: Draft
### Estimate: 3
### Sprint: Sprint 1 — Foundation

### Actors
- **Primary actor:** Customer with a Google account.
- **System actor:** Supabase Auth Google provider; Next.js Route Handler redirect helpers.

### Preconditions
1. Supabase Auth Google provider is enabled with OAuth client id/secret vaulted.
2. Redirect URI `https://aqualudo.net/auth/callback` is registered in Google Cloud.

### Postconditions
1. A session cookie is set on the customer's browser.
2. If first sign-in, a `profiles` row is inserted by `handle_new_user()`.

### Main Flow (Happy Path)
1. Customer clicks "Continue with Google" on `/login`.
2. Client navigates to Supabase's Google OAuth URL with `redirect_to=/auth/callback` and `next=/account`.
3. Google consent screen appears; customer approves.
4. Google redirects to `/auth/callback?code=...`.
5. Server exchanges code with Supabase Auth; session is established.
6. Server reads `user.app_metadata.provider` to mark the identity in `profiles`.
7. Redirect to `next`.

### Alternate Flows

#### A1 — Customer already has an email+password profile
1. Supabase Auth links the Google identity to the existing user.

#### A2 — Customer denies consent
1. Google redirects back to `/login?error=access_denied`; UI surfaces a non-blocking toast.

### Exception Flows

#### E1 — Provider temporarily down
1. Server surfaces "Google is unavailable, use email or WhatsApp" with a dismissal toast.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Google OAuth login

  Scenario: First-time Google sign-in creates a profile
    Given no profile exists for "salma@gmail.com"
    When the customer completes the Google consent flow
    Then a profiles row is created with role="customer"
      And a session cookie is set
      And the customer lands on /account

  Scenario: Returning Google sign-in grants session
    Given a profile exists linked to Google
    When the customer repeats the Google flow
    Then no new profiles row is created
      And the existing session is replaced with a fresh one

  Scenario: Consent denied returns to login with an error
    Given the customer clicks "Deny" on the Google consent
    When the redirect lands
    Then the customer sees /login?error=access_denied
      And no session cookie is set
```

### Edge Cases
1. Google account email matches an unconfirmed email signup — Supabase promotes the existing unconfirmed account to confirmed on link.
2. Customer's Google locale header `Accept-Language` respects `ar` — `profiles.locale` is seeded from the OAuth locale claim.
3. Customer uses a legacy Google Workspace account whose email bounces later — surfaced in admin user list with bounce flag.

### UI/UX Specifications
- "Continue with Google" branded button + Google logo (per Google brand guidelines).
- Loading: button spinner.
- Error: inline red helper.

### Data Model
No new tables. Reads/writes `profiles` via existing trigger. The Supabase `identities` table records the link.

### API Endpoints
- `GET /api/auth/google/start?next=...` — redirects to Supabase OAuth URL.
- `GET /auth/callback` — shared callback with US-CA-001.

### Security Considerations
- OAuth state parameter validated by Supabase.
- `redirect_to` allowlist enforced server-side to open-redirect prevention.

### Performance Requirements
- Start redirect < 150ms; callback exchange < 800ms p95.

### Notifications
- None beyond the dispatch queue activity of any post-login templates.

### Localization
- Button copy `auth.google.cta` in EN/AR.

### Error Handling
- `provider_unavailable` → fallback list to other methods.
- `state_mismatch` → 401 with retry.

### Logging & Analytics
- `auth.google.started`, `auth.google.completed`, `auth.google.failed`.

### Testing Notes
- Integration: mock Google provider in test Supabase project.
- E2E: Playwright with `google` account fixture.

### Related User Stories
- US-CA-004 Facebook OAuth.
- US-IN-004 (File 10) auth layer.

### Dependencies
- Supabase Auth Google provider.

### Tags
`auth` · `oauth` · `google`

### Notes / Rationale
Google accords the fastest social sign-in for customers already inside the Google ecosystem (Gmail, Android).

---

## US-CA-004 — Facebook OAuth login

### Story
As a customer who uses Facebook as my primary social account,
I want to sign in to AquaLudo with my Facebook identity in one tap,
So that I can register/book without yet another password.

### Priority: P1
### Status: Draft
### Estimate: 3
### Sprint: Sprint 1 — Foundation

### Actors
- **Primary actor:** Customer with a Facebook account.
- **System actor:** Supabase Auth Facebook provider.

### Preconditions
1. Supabase Auth Facebook provider is enabled.
2. Facebook app review approved `email` and `public_profile` scopes.

### Postconditions
1. Session cookie set; `profiles` row created on first link.

### Main Flow (Happy Path)
1. Customer clicks "Continue with Facebook" on `/login`.
2. Client navigates to Supabase Facebook OAuth URL.
3. Facebook consent screen; customer approves.
4. Redirect to `/auth/callback?code=...`; session established.
5. Redirect to `next`.

### Alternate Flows

#### A1 — Customer previously used email sign-up
1. Supabase detects existing email; links identity.

### Exception Flows

#### E1 — Facebook returns a transient `API_UNAVAILABLE`
1. UI surfaces the same fallback as US-CA-003 E1.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Facebook OAuth login

  Scenario: Successful Facebook sign-in
    Given a Facebook account with email "omar@example.com"
    When the customer completes the Facebook consent
    Then a session cookie is set
      And a profiles row exists for that email

  Scenario: Returning customer via Facebook
    Given a previously linked Facebook identity
    When the customer repeats the flow
    Then the existing profile is reused
```

### Edge Cases
1. Facebook returns no verified email — Supabase requires a manual email link via `/account/profile`.
2. Customer's Facebook account is locked — Facebook returns `OAuthException`; server maps to `provider_locked` toast.

### UI/UX Specifications
- "Continue with Facebook" branded button + Facebook logo, below the Google button.

### Data Model
No new tables.

### API Endpoints
- `GET /api/auth/facebook/start?next=...`.
- Reuses `/auth/callback`.

### Security Considerations
- App secret vaulted; `redirect_to` allowlist enforced.

### Performance Requirements
- < 1s p95 end-to-end.

### Notifications
- None.

### Localization
- `auth.facebook.cta` EN/AR.

### Error Handling
- `provider_locked` toast + fallback list.

### Logging & Analytics
- `auth.facebook.started`, `auth.facebook.completed`, `auth.facebook.failed`.

### Testing Notes
- Integration: mock Facebook provider in test Supabase project.
- E2E: Playwright `facebook` fixture.

### Related User Stories
- US-CA-003 Google OAuth.

### Dependencies
- Supabase Auth Facebook provider.

### Tags
`auth` · `oauth` · `facebook`

### Notes / Rationale
The user chose all four sign-in methods including Facebook because a meaningful slice of the Cairo market still lists Facebook as their primary social login.

---

## US-CA-005 — Email+password login (remember-me + failed-attempt throttle)

### Story
As a returning customer who signed up with email and password,
I want a sign-in form with a "remember me" option and protection against brute-force attempts on my account,
So that I can resume booking quickly while my account stays safe from guessed passwords.

### Priority: P0
### Status: Draft
### Estimate: 3
### Sprint: Sprint 1 — Foundation

### Actors
- **Primary actor:** Returning email customer.
- **System actor:** Supabase Auth `signInWithPassword`; rate-limit primitives from File 10.

### Preconditions
1. A confirmed `auth.users` row exists with the email.

### Postconditions
1. Session cookie set with `rememberMe` extending expiry to 30 days otherwise 1 day.
2. Failed attempts counter incremented on each failure; locked after 5 within 15 minutes for 30 minutes.

### Main Flow (Happy Path)
1. Customer navigates to `/login`.
2. Enters email + password; checks "Remember me".
3. `POST /api/auth/login`.
4. `supabase.auth.signInWithPassword({ email, password })`.
5. Route Handler returns session and sets cookie with chosen expiry.
6. Redirect to `next` or `/account`.

### Alternate Flows

#### A1 — Brute force detected
1. Server returns 429 after 5 failed attempts in 15min on a single email.
2. UI surfaces "Account temporarily locked. Try again in 30 minutes."

### Exception Flows

#### E1 — Email not confirmed yet
1. Server surfaces "Please confirm your email first" with a "Resend link" affordance.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Email+password login

  Scenario: Successful login with remember me
    Given a confirmed account for "salma@example.com"
    When the customer signs in with email, password, and remember-me checked
    Then a session cookie is set with a 30-day expiry
      And the customer lands on /account

  Scenario: Five consecutive failures lock the account
    Given an attacker submits the wrong password 5 times in 15 minutes
    When the attacker attempts a 6th time
    Then the server returns HTTP 429 with code "login_locked"
      And the lock lasts 30 minutes

  Scenario: Unconfirmed email cannot sign in
    Given an unconfirmed account
    When the customer submits the form
    Then the server returns 403 with code "email_not_confirmed"
      And the UI offers a Resend link affordance
```

### Edge Cases
1. Customer remembers password after lockout — must wait 30min; admin can manually unlock via File 05.
2. Customer signs in via Google after their email was locked — Google flow is independent and unaffected.

### UI/UX Specifications
- Form identical to signup; "Remember me" default on.
- "Forgot password?" link to `/forgot-password`.

### Data Model
No new tables; rate-limit counters keyed on `(email, ip)` live in `auth_login_attempts`.

### API Endpoints
- `POST /api/auth/login`.

### Security Considerations
- Failed-attempt counter only increments by 1 per email+IP pair; protects against silent enumeration.
- bcrypt via Supabase Auth.
- Cookie `Secure`, `HttpOnly`, `SameSite=Lax`.

### Performance Requirements
- < 700ms p95.

### Notifications
- A WhatsApp "New sign-in on your account" may be queued if `notification_preferences['login_alert']='whatsapp'` is enabled (default off).

### Localization
- Copy keys `auth.login.*` EN/AR.

### Error Handling
- `login_locked` / `email_not_confirmed` / `invalid_credentials`.

### Logging & Analytics
- `auth.login.started`, `auth.login.failed` `{ reason }`, `auth.login.locked`.

### Testing Notes
- Unit: rate-limit math.
- E2E: 5-fail → 6th blocked.

### Related User Stories
- US-CA-001 signup, US-CA-006 reset.

### Dependencies
- Supabase Auth.

### Tags
`auth` · `login` · `rate-limit` · `email`

### Notes / Rationale
Brute-force protection is paired with anti-enumeration so attackers cannot deduce whether an account exists by observing differing responses.

---

## US-CA-006 — Password reset (forgot password email flow)

### Story
As a customer who has forgotten my AquaLudo password,
I want to enter my email and receive a reset link in my inbox,
So that I can choose a new password and regain access.

### Priority: P0
### Status: Draft
### Estimate: 2
### Sprint: Sprint 1 — Foundation

### Actors
- **Primary actor:** Email customer.
- **System actor:** Supabase Auth `resetPasswordForEmail`.

### Preconditions
1. The customer's email is confirmed.

### Postconditions
1. A reset email is dispatched (rate-limited to 1 / 60s / email).
2. On click, the customer lands on `/reset-password?code=...` and chooses a new password.

### Main Flow (Happy Path)
1. Customer opens `/forgot-password`, enters email.
2. `POST /api/auth/reset` calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: '/reset-password' })`.
3. Server returns 200 even if the email is unknown (anti-enumeration).
4. Customer clicks the reset link; lands on `/reset-password?code=...`.
5. New password entered; supabase.auth.exchangeCodeForSession + updateUser.
6. Redirect to `/account`.

### Alternate Flows

#### A1 — Customer requests reset while signed in
1. Server still sends reset email; current session preserved.

### Exception Flows

#### E1 — Reset link already consumed or expired
1. Server surfaces "link expired" with a "Request a new link" CTA.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Password reset

  Scenario: Reset email dispatched
    Given a confirmed account for "salma@example.com"
    When the customer requests a reset
    Then Supabase dispatches a reset email
      And the response body is identical regardless of whether the email is known

  Scenario: Reset link consumes and updates password
    Given a reset email was sent
    When the customer clicks the link and submits a new password
    Then the password is updated
      And a fresh session is issued
      And old sessions for that user are revoked
```

### Edge Cases
1. Customer resets password, then gains access to an old device still logged in — old sessions revoked for safety.

### UI/UX Specifications
- Two-step flow: enter email → check inbox; same template as the sign-up confirmation.

### Data Model
No new tables.

### API Endpoints
- `POST /api/auth/reset`, `POST /api/auth/reset/confirm`.

### Security Considerations
- New password must satisfy the same strength rules as sign-up.

### Performance Requirements
- < 700ms p95.

### Notifications
- Reset email via Supabase Auth. No WhatsApp in v1 for this trigger.

### Localization
- Email subject + body keys in EN/AR.

### Error Handling
- `reset_link_invalid` / `reset_link_expired`.

### Logging & Analytics
- `auth.reset.requested`, `auth.reset.completed`.

### Testing Notes
- E2E: fetch reset link from test-mail inbox; submit new password.

### Related User Stories
- US-CA-005 login.

### Dependencies
- Supabase Auth.

### Tags
`auth` · `reset` · `email`

### Notes / Rationale
Anti-enumeration matters here too: identical response shape regardless of whether the supplied email is registered.

---

## US-CA-007 — Profile edit

### Story
As a signed-in customer,
I want to edit my full name, phone, date of birth, gender, locale, emergency contact, and avatar,
So that AquaLudo has accurate records for safety and communications.

### Priority: P1
### Status: Draft
### Estimate: 5
### Sprint: Sprint 2 — Catalog MVP

### Actors
- **Primary actor:** Signed-in customer.
- **System actor:** `app/(account)/account/profile/page.tsx`; Route Handler `PATCH /api/account/profile`.

### Preconditions
1. Customer has a session.

### Postconditions
1. `profiles` row is updated (only the set of fields in the request body — partial PATCH).
2. `updated_at` is bumped.
3. If `phone` changed, an OTP re-verification WhatsApp message is dispatched before the change is committed (the new phone must be verified before the row updates).

### Main Flow (Happy Path)
1. Customer opens `/account/profile`.
2. SSR fetches the customer's `profiles` row.
3. Customer edits and saves.
4. Client sends `PATCH /api/account/profile` with the changed fields.
5. Server validates zod, updates the row, audits with `entity='profiles'` (File 05).
6. UI shows a success toast.

### Alternate Flows

#### A1 — Phone change
1. Server marks `profiles.pending_phone = '+201000000000'`.
2. Dispatches an OTP WhatsApp to the new phone.
3. Customer verifies via `/account/profile/verify-phone`.
4. On verify, server commits `phone = pending_phone`, clears `pending_phone`.

### Exception Flows

#### E1 — Avatar upload exceeds 2MB
1. Server rejects; UI surfaces "Image too large; max 2MB".

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Profile edit

  Scenario: Customer updates their full name
    Given a signed-in customer "Salma Akl"
    When she changes her name to "Salma Akl-Omar"
    Then the profiles row reflects the new full_name
      And updated_at advances

  Scenario: Phone change requires verification
    Given a signed-in customer with phone "+201011329642"
    When she changes her phone to "+201000000000"
    Then pending_phone is set to "+201000000000"
      And profiles.phone remains "+201011329642"
      And a WhatsApp OTP is dispatched to the new number

  Scenario: Avatar over 2MB is rejected
    Given a signed-in customer uploading a 3MB PNG
    When she submits
    Then the server returns 413 with code "avatar_too_large"
```

### Edge Cases
1. Customer clears `gender` — allowed; UI offers "Prefer not to say".
2. Customer sets DOB to today — rejected (admin can override rare cases).
3. Customer uploads a non-image file disguised as image — server checks magic bytes.

### UI/UX Specifications
- Two-column form on desktop; single-column mobile.
- Avatar in 128px circle; click to upload or drag-and-drop.
- RTL: labels mirror; emergency contact fields in right-to-left order.

### Data Model
Adds columns to `profiles`: `pending_phone text`, `pending_phone_until timestamptz`. No new tables.

### API Endpoints
- `GET /api/account/profile` · `PATCH /api/account/profile` · `POST /api/account/profile/verify-phone`.

### Security Considerations
- RLS: only the owner can update; admin can update any non-role field.
- Phone re-verification prevents account hijack via phone update.

### Performance Requirements
- PATCH p95 < 400ms; avatar upload p95 < 2s.

### Notifications
- WhatsApp OTP to new phone on phone change (per A1).

### Localization
- Copy keys `account.profile.*` EN/AR; date picker accepts `dd/mm/yyyy` (EN) and `dd/mm/yyyy` AR with Arabic-Indic digits.

### Error Handling
- `avatar_too_large` / `phone_format_invalid` / `phone_taken` (phone must be unique).

### Logging & Analytics
- `account.profile.updated` `{ fields }`.
- `account.profile.phone_change_started` / `phone_change_verified`.

### Testing Notes
- Unit: zod schema.
- E2E: Playwright fills profile, changes phone, mocks OTP, verifies.

### Related User Stories
- US-CA-002 OTP.
- US-AB-013 (File 05) admin review of edited names.

### Dependencies
- Supabase Storage bucket `avatars`.

### Tags
`account` · `profile` · `phone-verification` · `storage`

### Notes / Rationale
Phone re-verification prevents hijacking by a temporary account sharer. Admins may approve name edits before they appear publicly on reviews (US-AB-013).

---

## US-CA-008 — Dashboard home

### Story
As a signed-in customer,
I want a single dashboard page that shows my next session, my remaining package/membership counts, and recent activity,
So that the moment I land on `/account` I know what's next without hunting.

### Priority: P0
### Status: Draft
### Estimate: 5
### Sprint: Sprint 2 — Catalog MVP

### Actors
- **Primary actor:** Signed-in customer.

### Preconditions
1. Customer has a session.

### Postconditions
1. `/account` renders the four regions in one screenful on desktop (next-session card, package and membership counters, recent activity feed, quick actions).

### Main Flow (Happy Path)
1. Customer navigates to `/account`.
2. SSR fetches in parallel:
   - Next confirmed booking (`bookings where user_id=? and status='confirmed' order by start_at asc limit 1`).
   - Active packages totals (sum of `sessions_remaining+bonus_remaining` per `customer_packages`).
   - Active membership usage row.
   - Last 8 activity rows from `booking_events` joined to `bookings`.
3. Renders four regions.

### Alternate Flows

#### A1 — No upcoming bookings
1. Next-session card renders as a "Book a session" CTA linking to `/booking`.

### Exception Flows

#### E1 — Profile is soft-deleted (status flag pending hard delete)
1. Server surfaces "Your account is scheduled for deletion. Recover before <date>." with a "Recover account" CTA.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Dashboard home

  Scenario: Next session card shown
    Given a confirmed booking "ROW-2026-0412" tomorrow at 07:00
    When the customer opens /account
    Then the next-session card shows tomorrow's date, "Rowing", coach, and a "Get directions" link

  Scenario: No upcoming bookings shows CTA instead
    Given the customer has no confirmed future bookings
    When the customer opens /account
    Then the next-session card is replaced by a "Book a session" CTA

  Scenario: Package counters are accurate
    Given two active packages with 6 and 4 sessions remaining
    When the dashboard renders
    Then the package counter shows "10 sessions remaining"
```

### Edge Cases
1. Customer has both packages and a membership — both regions render; memberships usage shows "(8/12) used this month".
2. Booking's coach was archived after the booking — coach name still shown with "(archived)".

### UI/UX Specifications
- Desktop: 4-up grid; mobile: stacked accordion.
- Each region has a "View all" link to its dedicated page.
- Loading: skeleton regions.

### Data Model

```sql
customer_packages
  id                 uuid pk default gen_random_uuid()
  user_id            uuid not null references auth.users(id) on delete cascade
  package_id         uuid not null references session_packages(id)
  sessions_remaining int not null default 0 check (sessions_remaining >= 0)
  bonus_remaining    int not null default 0 check (bonus_remaining >= 0)
  expires_at         timestamptz not null
  status             text not null check (status in ('active','expired','depleted')) default 'active'
  created_at         timestamptz not null default now()
  index on (user_id, status)
  -- RLS: owner SELECT, admin SELECT/UPDATE; service role on decrement
```

### API Endpoints
- `GET /api/account/dashboard` — single endpoint returning the four regions' payloads to the SSR.

### Security Considerations
- RLS enforced across all queries.

### Performance Requirements
- p95 < 600ms with parallel queries.

### Notifications
- The dashboard loads no notifications itself, but the header bell surfaces unread inbound WhatsApp (US-CN-015).

### Localization
- Copy keys `account.dashboard.*` EN/AR; date format `Africa/Cairo`.

### Error Handling
- Each region survives independently failing; if next-session fails, the rest still render.

### Logging & Analytics
- `account.dashboard.viewed`.

### Testing Notes
- Unit: counters.
- E2E: dashboard with seeded data.

### Related User Stories
- US-CA-009 upcoming bookings, US-CA-013 packages, US-CA-014 memberships.

### Dependencies
- `bookings`, `customer_packages`, `membership_subscriptions` (owned in this file).

### Tags
`account` · `dashboard` · `packages` · `membership`

### Notes / Rationale
One screenful, four answers — this is the customer's "am I OK?" page; nothing else competes for first paint.

---

## US-CA-009 — My Bookings: Upcoming tab

### Story
As a customer with confirmed bookings,
I want an Upcoming tab listing all my future sessions, each with a Cancel CTA and an Add-to-calendar affordance,
So that I can plan and act on my booked sessions in one view.

### Priority: P0
### Status: Draft
### Estimate: 3
### Sprint: Sprint 2 — Catalog MVP

### Actors
- **Primary actor:** Signed-in customer at `/account/bookings?tab=upcoming`.

### Preconditions
1. Customer has 1+ future confirmed bookings.

### Postconditions
1. Bookings render sorted by `start_at` ASC; each row shows date, time, activity, tier, coach, party size, and a "Cancel" button (gated by the 24h rule per US-CA-012).

### Main Flow (Happy Path)
1. Customer opens `/account/bookings` (defaults to Upcoming).
2. SSR queries `bookings` where `user_id=?` and `status in ('confirmed','pending')` and `start_at > now()` order by `start_at`.
3. Renders card list.
4. Each card shows: activity image thumbnail, date, time (locale 12h/24h), location, coach name, party size, "Cancel" (disabled if <24h), "Add to Google/Apple/Outlook calendar" download .ics affordance.

### Alternate Flows

#### A1 — Booking is `pending` (awaiting Paymob capture)
1. Card shows a "Payment pending" amber pill; Cancel replaced by "Abandon payment" link.

### Exception Flows

#### E1 — Booking not found after stale cache
1. Card renders skeleton then a "Booking no longer available" message; if the row was cancelled by admin, the new state appears within 60s.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Upcoming bookings tab

  Scenario: Confirmed bookings listed in time order
    Given 3 confirmed future bookings at 09:00, 11:00, 14:00 tomorrow
    When the customer opens the Upcoming tab
    Then the bookings are listed 09:00 → 11:00 → 14:00
      And each row has a "Cancel" button enabled because each is more than 24h away

  Scenario: Booking inside the 24h window disables Cancel
    Given a confirmed booking in 12 hours
    When the customer opens Upcoming
    Then the "Cancel" button is disabled
      And the helper text reads "Cancellation window closed"

  Scenario: Add-to-calendar download
    Given a confirmed booking on 2026-08-15 09:00
    When the customer clicks "Add to calendar"
    Then a .ics file downloads with the slot, address, and coach name
```

### Edge Cases
1. Booking coach was reassigned since creation — coach name reflects the latest assignment.
2. Booking party_size greater than 1 — row shows "you + 2".

### UI/UX Specifications
- Desktop: 2-column card grid; mobile: single column.
- Loading: list skeleton.

### Data Model
Reads `bookings` (owned by File 03); reads `coach_session_assignments` (owned by File 08) to show coach.

### API Endpoints
- `GET /api/account/bookings?tab=upcoming&page=1`.

### Security Considerations
- RLS: only owner.

### Performance Requirements
- < 400ms p95.

### Notifications
- Renders next-session count without re-firingWhatsApp cues.

### Localization
- 12-hour time format with `am/pm` (EN) or `ص/م` (AR).

### Error Handling
- `booking_not_found` renders an inline "no longer available" row.

### Logging & Analytics
- `account.bookings.upcoming.viewed`.
- `account.bookings.cancel_clicked` leads to US-CA-012.
- `account.bookings.ics_downloaded`.

### Testing Notes
- Unit: filter logic.
- E2E: Playwright with seeded upcoming bookings.

### Related User Stories
- US-CA-010 Past, US-CA-011 Cancelled, US-CA-012 self-cancel.

### Dependencies
- `bookings` (File 03).

### Tags
`account` · `bookings` · `calendar`

### Notes / Rationale
The "Cancel" enabled/disabled state is the canonical enforcement surface for the strict 24h rule. The rule itself lives in US-CA-012.

---

## US-CA-010 — My Bookings: Past tab (history + leave-review CTA)

### Story
As a customer who has attended sessions,
I want a Past tab listing my completed sessions, with a "Leave a review" button on any I haven't yet reviewed,
So that I can give feedback while the memory is fresh and within the 14-day window.

### Priority: P1
### Status: Draft
### Estimate: 3
### Sprint: Sprint 2 — Catalog MVP

### Actors
- **Primary actor:** Signed-in customer.

### Preconditions
1. Customer has 1+ bookings with `status='attended'`.

### Postconditions
1. Each past booking renders a "Leave a review" CTA unless a `reviews` row already exists for that `booking_id`.
2. The CTA is ghosted if the 14-day post-session window has elapsed.

### Main Flow (Happy Path)
1. Customer opens Past tab.
2. SSR fetches bookings where `status in ('attended','no_show','cancelled_late')` order by `start_at desc` limit 50.
3. For each booking, joins `reviews` on `booking_id`.
4. Renders card with a "Leave a review" button if no review exists and `slot.end_at + 14d > now()`.
5. Otherwise renders "Reviewed" badge or "Review window closed".

### Alternate Flows

#### A1 — Booking was cancelled by admin post-slot
1. Card surfaces "Cancelled by AquaLudo" + admin reason.

### Exception Flows

#### E1 — Booking has no `slot` (rare after race conditions)
1. Calback records show "Booking details unavailable; contact support."

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Past tab

  Scenario: Attended booking without review shows Leave-a-review CTA
    Given an attended booking "ROW-2026-0412" 5 days ago with no review
    When the customer opens the Past tab
    Then the booking card shows a "Leave a review" button

  Scenario: Booking outside the 14-day window hides the CTA
    Given an attended booking 20 days ago with no review
    When the customer opens the Past tab
    Then the booking card shows "Review window closed"

  Scenario: Booking already reviewed shows Reviewed badge
    Given an attended booking with an approved review
    When the customer opens the Past tab
    Then the booking card shows "Reviewed" badge
```

### Edge Cases
1. Customer attended but had party_size 3 — "Leave a review" still appears once per booking (one review per booking).

### UI/UX Specifications
- Same card grid as Upcoming; "Leave a review" pill button.

### Data Model
Reads `bookings` and `reviews` (File 02).

### API Endpoints
- `GET /api/account/bookings?tab=past&page=1`.

### Security Considerations
- RLS: owner.

### Performance Requirements
- < 500ms p95 with join.

### Notifications
- "Leave a review" deep link uses a magic token valid 14 days (US-CN-006).

### Localization
- Date format locale-aware.

### Error Handling
- `booking_no_slot` handled inline.

### Logging & Analytics
- `account.bookings.past.viewed`.
- `account.bookings.review_clicked → /account/reviews/new/<bookingId>`.

### Testing Notes
- E2E: seeded attended booking; click CTA; leave review.

### Related User Stories
- US-CA-016 leave review.

### Dependencies
- `bookings`, `reviews`.

### Tags
`account` · `bookings` · `reviews` · `past`

### Notes / Rationale
Co-locating the review CTA on the past booking keeps the post-session WhatsApp review request (US-CN-006) and the customer's manual review path consistent.

---

## US-CA-011 — My Bookings: Cancelled tab

### Story
As a customer,
I want a Cancelled tab showing bookings I or admin cancelled, with the reason and refund status,
So that I can verify refunds posted correctly.

### Priority: P2
### Status: Draft
### Estimate: 2
### Sprint: Sprint 3 — Portal polish

### Actors
- **Primary actor:** Signed-in customer.

### Preconditions
1. Customer has 1+ cancelled bookings.

### Postconditions
1. Each cancelled booking lists cancellation reason, actor, refund total, and refund status.

### Main Flow
1. Customer opens Cancelled tab.
2. SSR fetches bookings where `status in ('cancelled','refunded_partial','refunded_full')`.
3. For each, joins `booking_events` filtered to `event_type in ('cancelled','refunded_partial','refunded_full')`.

### Alternate Flows

#### A1 — No refunds (booking was free via package)
1. Card shows "No refund applicable (package redemption)".

### Exception Flows

#### E1 — Refund still in flight
1. Card shows "Refund pending; funds may take 2-5 business days".

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Cancelled tab

  Scenario: Booking self-cancelled within 24h shows no refund
    Given a booking self-cancelled inside the 24h window
    When the customer opens Cancelled
    Then the card shows reason="customer_inside_24h" and refund_status="none"

  Scenario: Booking cancelled with full refund
    Given a booking self-cancelled 30h before slot
    When the customer opens Cancelled
    Then the card shows refund_status="refunded_full" and refund_total=20000 piasters
```

### Edge Cases
1. Customer was a no-show then admin voided — appears here with reason="no_show_then_void".

### UI/UX Specifications
- List with refund pill.

### Data Model
Reads `bookings`, `booking_events` (File 07), `payment_transactions` (File 07).

### API Endpoints
- `GET /api/account/bookings?tab=cancelled&page=1`.

### Security Considerations
- RLS.

### Performance Requirements
- < 500ms p95.

### Notifications
- None beyond the cancellation WhatsApp cues already fired.

### Localization
- Reason codes translated.

### Error Handling
- Missing refund row surfaces "Refund in flight".

### Logging & Analytics
- `account.bookings.cancelled.viewed`.

### Testing Notes
- Unit: tab query.

### Related User Stories
- US-CA-012 self-cancel.

### Dependencies
- Booking tables.

### Tags
`account` · `bookings` · `cancelled` · `refunds`

### Notes / Rationale
The Cancelled tab gives the customer a refund receipt they can show their bank; cannot trigger any state change.

---

## US-CA-012 — Self-cancel a booking (strict 24h rule and refund workflow)

### Story
As a customer who needs to cancel a confirmed booking,
I want to cancel from my Upcoming tab and receive a full refund if I cancel 24+ hours before the slot, or be informed that no refund is owed within 24h,
So that the policy is enforced predictably and refunds post automatically.

### Priority: P0
### Status: Draft
### Estimate: 8
### Sprint: Sprint 2 — Catalog MVP

### Actors
- **Primary actor:** Signed-in customer.
- **System actor:** Route Handler `POST /api/account/bookings/[id]/cancel`; Paymob refund API; File 09 dispatcher; File 07 waitlist-offer flow.

### Preconditions
1. Booking `status='confirmed'`, `user_id=?` (RLS-enforced).
2. The booking was paid for by Paymob (`payment_transactions.method in ('card','vodafone_cash','instapay','fawry')`) or by package/membership redemption.

### Postconditions
1. Booking `status='cancelled'` if outside 24h; booking `status='cancelled'` with no refund if inside 24h (user may still cancel; refunds inside 24h are admin-only per US-AD-007 in File 07).
2. A `booking_events` row (File 07) records `event_type='cancelled'`, `actor_id=<user>`, `meta.reason`.
3. If the refund applies, a `payment_transactions` row contains `status='refunded_full'` with Paymob refund id.
4. A WhatsApp "Cancellation confirmed" is dispatched (File 09).
5. The slot capacity is restored (`slots.capacity_used -= party_size`).
6. The File 07 waitlist-offer flow is triggered if a `waitlist_subscriptions` row exists for the activity; this story owns only the booking's status change and the notification; the manual selection of the next person is admin per US-AD-008.

### Main Flow (Happy Path)
1. Customer clicks "Cancel" on Upcoming row "ROW-2026-0412".
2. Modal confirms "Cancel booking? You're 30h before the slot — full refund applies." with CTA "Confirm cancel".
3. `POST /api/account/bookings/ROW-2026-0412/cancel { reason: 'customer_request' }`.
4. Server validates 24h: `slot.start_at - now() >= 24h`.
5. Server marks booking `status='cancelled'`, frees slot capacity, appends `booking_events`.
6. If paid by Paymob: calls Paymob refund API (`POST /v2/payments/refund`); records `payment_transactions` row.
7. If paid by package redemption: increments `customer_packages.sessions_remaining` (or `bonus_remaining` if it had consumed a bonus).
8. If paid by membership redemption: decrements `membership_subscriptions.sessions_used_this_period`.
9. Dispatches "Cancellation confirmed" WhatsApp (File 09 trigger) and "Waitlist slot opened" if applicable (US-CN-007) — though the manual pick remains admin per US-AD-008.
10. UI updates row to "Cancelling... → Cancelled" with refund pill.

### Alternate Flows

#### A1 — Cancellation inside the 24h window
1. Modal reads "You're inside the 24h cancellation window — no refund will be issued. Are you sure? (Y/N)". Cancellation still allowed; no refund.
2. `booking_events.meta.reason='customer_inside_24h'`; payment row untouched.

#### A2 — Cancellation by cash-on-arrival
1. There is no Paymob refund; the admin is notified to manage cash desk reconciliation.

### Exception Flows

#### E1 — Paymob refund fails (gateway error)
1. Server keeps booking `status='cancelled'`, marks a `payment_transactions` row with `status='failed'` and `error_code`. The dispatcher re-queues (File 09 US-CN-016); admin sees a "Refund failed" alert.

#### E2 — Customer double-clicks cancel
1. Server is idempotent: second request sees `status='cancelled'` and returns 200 with no further action.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Self-cancel with strict 24h rule

  Scenario: Cancel 30h before slot triggers full refund
    Given booking "ROW-2026-0412" with slot start_at 30h in the future and a 20000-piaster card payment
    When the customer cancels
    Then the booking status becomes "cancelled"
      And a payment_transactions row is inserted with status="refunded_full" amount=20000
      And booking_events records event_type="cancelled" actor_id=customer
      And slots.capacity_used is decremented by the booking.party_size
      And a "cancellation_confirmed" WhatsApp is dispatched

  Scenario: Cancel 12h before slot records no refund but still cancels
    Given booking "ROW-2026-0412" with slot start_at 12h in the future
    When the customer cancels via the confirm-then-cancel modal
    Then the booking status becomes "cancelled"
      And no payment_transactions refund row is created
      And booking_events.meta.reason equals "customer_inside_24h"

  Scenario: Package redemption auto-restores a session
    Given a booking paid by a package redemption consuming 1 of 9 sessions
    When the customer cancels 30h before the slot
    Then the customer_packages row returns to 9 sessions remaining

  Scenario: Idempotent on double submit
    Given the customer submits cancel twice within 1 second
    Then the second response is 200 and no second booking_events row is created
```

### Edge Cases
1. Customer cancels a waitlist-fulfilled booking — same flow; the original waitlist offer is now closed.
2. Customer cancels inside 24h but the slot is then marked no-show by admin — admin's subsequent `refunded_partial` override bumps back via US-AD-007.
3. Cash-on-arrival booking cancelled inside 24h — no cash to refund; booking_events.meta captures "no_refund_cash_inside_24h".

### UI/UX Specifications
- Desktop modal 480px; mobile bottom sheet.
- Loading: button spinner while cancel runs (≤1s typical).
- Success: row transitions through "Cancelling..." to "Cancelled" with refund pill animating.
- Error: red banner; slot frees anyway (booking status must be cancelled even if the refund stalls).

### Data Model
Adds columns to `bookings` if not present: `cancelled_at timestamptz`, `cancel_reason text`. No new tables (events owned by File 07).

### API Endpoints
- `POST /api/account/bookings/[id]/cancel` body `{ reason }`.

### Security Considerations
- RLS: only the booking owner may POST; middleware enforces.
- The Paymob refund uses the admin's service-role key server-side; no client involvement.

### Performance Requirements
- Cancel p95 < 1.5s (DB + Paymob + dispatcher enqueue).
- The slot capacity update is atomic with the cancel in a single transaction to prevent double-booking of the freed seat.

### Notifications
- File 09 US-CN-010 admin cancellation-received trigger.
- Customer's own "cancellation_confirmed" WhatsApp.

### Localization
- Modal copy keys `booking.cancel.confirm.title` EN/AR.

### Error Handling
- `paymob_refund_failed` → admin alert; booking stays cancelled.
- `booking_id_not_found` 404.
- `cancel_window_closed` 409 — reserved for forced admin case where policy differs.

### Logging & Analytics
- `booking.cancel.requested` `{ id, reason, before_24h: bool }`.
- `booking.cancel.completed` `{ id, refunded_int }`.
- `booking.cancel.refund_failed`.

### Testing Notes
- Unit: 24h boundary, package restore.
- Integration: mock Paymob refund.
- E2E: cancel both inside and outside 24h; verify events and WhatsApp queue.

### Related User Stories
- US-CA-009 upcoming list / Cancel button enabled-state owner.
- US-AD-007 (File 07) admin refund.
- US-AD-008 (File 07) waitlist-offer flow.
- US-CN-010 (File 09) cancellation WhatsApp triggers.

### Dependencies
- File 07 booking_events append; File 09 dispatcher; Paymob refund endpoint.

### Tags
`account` · `bookings` · `cancellation` · `refund` · `paymob`

### Notes / Rationale
The user's locked decision: "FULL refund if 24h+ before slot; NO refund after the 24h cutoff (strict)." This story encodes that binary without an admin-discretion override on the customer surface; discretion lives entirely in admin (File 07 US-AD-007).

---

## US-CA-013 — Session package tracker

### Story
As a customer who purchased an 8-session + 1 free package,
I want a Packages page showing my active packages with how many sessions I've used and how many are remaining, plus an expiry date,
So that I can plan redemptions before expiry and decide when to buy another.

### Priority: P1
### Status: Draft
### Estimate: 4
### Sprint: Sprint 2 — Catalog MVP

### Actors
- **Primary actor:** Signed-in customer.
- **System actor:** `customer_packages` rows owned by this file; `session_packages` rows owned by File 02.

### Preconditions
1. Customer has 1+ `customer_packages` rows with `status='active'`.

### Postconditions
1. Each card shows package name, total sessions (sessions_remaining + bonus_remaining + used), used count, remaining count (split regular vs bonus), and `expires_at`.

### Main Flow
1. Customer opens `/account/packages`.
2. SSR fetches `customer_packages` joined to `session_packages`.
3. Per row, computes totals and renders a progress bar `used / total`.

### Alternate Flows

#### A1 — Package depleted
1. Status `'depleted'`; card badge "Used up"; offer "Buy another 8-pack" CTA.

### Exception Flows

#### E1 — Package expired with sessions remaining
1. Card renders expired state; remaining sessions are forfeited; "Buy a new package" CTA.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Session package tracker

  Scenario: Active 8-pack-1-free with 3 used renders accurate counters
    Given a customer_packages row with sessions_remaining=5 bonus_remaining=1 expires_at=2026-12-31
    When the customer opens /account/packages
    Then the card shows "5 of 9 regular sessions remaining" with a 3/9 progress bar
      And shows "1 bonus session remaining"
      And shows "Expires 2026-12-31"

  Scenario: Expired package surfaces forfeiture banner
    Given a customer_packages row with expires_at=2025-01-01 and sessions_remaining=2
    When the customer opens /account/packages
    Then the card shows "Expired" badge
      And the "Buy a new package" CTA appears
```

### Edge Cases
1. Package includes only specific activities (e.g. Rowing-only) — card lists the included activities.
2. Bonus session consumed first when customer redeems via booking (redemption preference is `sessions_remaining` first per US-BF-009 in File 03 — note this is the *opposite* direction; document which is true somewhere).

### UI/UX Specifications
- Desktop 2-up; mobile single column.
- Progress bar gold fill.
- Status pill: Active / Depleted / Expired.

### Data Model
Uses `customer_packages` defined in US-CA-008 plus a helper view:

```sql
create or replace view customer_packages_summary as
  select cp.id, cp.user_id, sp.slug, sp.name,
         cp.sessions_remaining, cp.bonus_remaining,
         (sp.session_count + sp.bonus_count) as total_sessions,
         (sp.session_count + sp.bonus_count) - cp.sessions_remaining - cp.bonus_remaining as used_count,
         cp.expires_at, cp.status
    from customer_packages cp
    join session_packages sp on sp.id = cp.package_id;
grant select on customer_packages_summary to authenticated;
```

### API Endpoints
- `GET /api/account/packages`.

### Security Considerations
- RLS owner.

### Performance Requirements
- < 300ms p95.

### Notifications
- Optional WhatsApp "Your package expires in 7 days" (admin-enabled in File 09).

### Localization
- Counters split in EN: "5 of 9 sessions remaining"; AR: "بقي 5 من 9 جلسات".

### Error Handling
- None beyond RLS.

### Logging & Analytics
- `account.packages.viewed`.

### Testing Notes
- Unit: totals.

### Related User Stories
- US-BF-009 (File 03) package redemption consumes sessions_remaining first.
- US-AB-008 (File 05) admin creates package.

### Dependencies
- `session_packages`.

### Tags
`account` · `packages` · `tracking`

### Notes / Rationale
The order is: `sessions_remaining` decremented first (paying-sessions countdown), then `bonus_remaining` (the +1 free) last so customers always "feel" the free session. Cross-check this against File 03 US-BF-009 — this is the authoritative policy statement.

---

## US-CA-014 — Membership subscription view

### Story
As a Silver or Gold monthly subscriber,
I want a Membership page showing my active tier, my included sessions usage this period, my next billing date, and the ability to cancel-at-period-end or renew,
So that I can manage my subscription without contacting admin.

### Priority: P1
### Status: Draft
### Estimate: 5
### Sprint: Sprint 2 — Catalog MVP

### Actors
- **Primary actor:** Signed-in customer with `membership_subscriptions.status='active'`.
- **System actor:** Paymob recurring charge (if Paymob subscription enabled) or admin-managed monthly invoice.

### Preconditions
1. Customer has 1+ `membership_subscriptions` row with `status='active'`.

### Postconditions
1. Page shows tier name, monthly price, sessions used out of `tiers.sessions_per_month`, next period end date.
2. CTAs: Cancel at period end / Renew early (immediate next-period payment).

### Main Flow
1. Customer opens `/account/membership`.
2. SSR fetches `membership_subscriptions` joined to `membership_tiers`.
3. Renders card with usage and CTAs.

### Alternate Flows

#### A1 — Cancel at period end
1. Customer taps "Cancel"; modal "Cancel at period end on `current_period_end`?" confirm.
2. Server sets `cancelled_at` and `status` stays `'active'` until `current_period_end`; a Vercel Cron (File 10) flips status to `'past_due'` at period end and revokes the included-session credit.

### Exception Flows

#### E1 — Payment fails next period
1. After `current_period_end`, status flips to `'past_due'`; UI surfaces "Renew membership" CTA.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Membership subscription view

  Scenario: Active Silver membership shows usage
    Given an active membership in "silver-monthly" with sessions_used_this_period=8
      And sessions_per_month=12 And current_period_end=2026-08-01
    When the customer opens /account/membership
    Then the card shows "Silver — 8/12 sessions used"
      And shows "Next billing date 2026-08-01"

  Scenario: Cancel at period end
    Given the customer taps Cancel and confirms
    Then membership_subscriptions.cancelled_at is set to now
      And the row remains status="active" until current_period_end
```

### Edge Cases
1. Admin grants complimentary membership — `started_at` recorded; no billing.
2. Customer buys Silver then upgrades to Gold mid-period — pro-rated by admin (US-AB-009 in File 05).

### UI/UX Specifications
- Card 800px max; mobile full-bleed.

### Data Model

```sql
membership_subscriptions
  id                       uuid pk default gen_random_uuid()
  user_id                  uuid not null references auth.users(id) on delete cascade
  tier_id                  uuid not null references membership_tiers(id)
  status                   text not null check (status in ('active','cancelled','past_due')) default 'active'
  current_period_end       timestamptz not null
  sessions_used_this_period int not null default 0
  started_at               timestamptz not null default now()
  cancelled_at             timestamptz
  created_at               timestamptz not null default now()
  index on (user_id, status)
  -- RLS: owner SELECT/UPDATE only on cancelled_at; service role on sessions_used_this_period
```

### API Endpoints
- `GET /api/account/membership`.
- `POST /api/account/membership/cancel` (set `cancelled_at`).
- `POST /api/account/membership/renew`.

### Security Considerations
- Owner may set `cancelled_at` but not `sessions_used_this_period` (that is updated only by booking redemptions in File 03).

### Performance Requirements
- < 400ms p95.

### Notifications
- WhatsApp "Membership renewing on <date>" if Paymob recurring pre-debit.

### Localization
- Tier names from `membership_tiers.name` jsonb.

### Error Handling
- `membership_not_found` 404.

### Logging & Analytics
- `account.membership.viewed`, `account.membership.cancelled`.

### Testing Notes
- Integration: cron flips status at period end.

### Related User Stories
- US-BF-010 (File 03) membership redemption per booking.
- US-AB-009 (File 05) admin creates membership tiers.

### Dependencies
- `membership_tiers` (File 02), Paymob recurring.

### Tags
`account` · `membership` · `subscription`

### Notes / Rationale
Cancellation at period end preserves the customer's included sessions for the remainder of the paid period — aligning with the user's interview stance that refunds are tight.

---

## US-CA-015 — Favorites (heart/unheart any activity; list view)

### Story
As a customer browsing activities,
I want to heart/unheart any activity and see my favorites list at `/account/favorites`,
So that I can keep a shortlist of activities I plan to try.

### Priority: P2
### Status: Draft
### Estimate: 2
### Sprint: Sprint 3 — Portal polish

### Actors
- **Primary actor:** Signed-in customer.

### Preconditions
1. Customer signed in.

### Postconditions
1. `customer_favorites` row inserted/deleted on heart toggle (table owned by File 02).
2. `/account/favorites` page lists favorited activities.

### Main Flow
1. Customer visits `/activities/rowing`; taps heart icon in header.
2. `POST /api/account/favorites { activityId }`.
3. Activity card heart fills gold.
4. Customer opens `/account/favorites` — list of favorited activities with quick "Book now" CTAs.

### Alternate Flows

#### A1 — Unheart
1. `DELETE /api/account/favorites/{ activityId }`.

### Exception Flows

#### E1 — Activity archived after favoriting
1. List row renders greyed "Archived" pill; CTA disabled.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Favorites

  Scenario: Heart an activity
    Given a signed-in customer on /activities/rowing
    When she taps the heart
    Then customer_favorites row exists for (user, rowing)
      And the heart icon becomes filled gold

  Scenario: List favorites
    Given 3 favorited activities
    When the customer opens /account/favorites
    Then the 3 activities render with Book now CTAs
```

### Edge Cases
1. Heart toggled from a public catalog page when anonymous — heart icon asks for sign-in.

### UI/UX Specifications
- Heart icon top-right of activity card.

### Data Model
Reads/writes `customer_favorites` (owned by File 02).

### API Endpoints
- `POST /api/account/favorites`, `GET /api/account/favorites`, `DELETE /api/account/favorites/{id}`.

### Security Considerations
- RLS owner.

### Performance Requirements
- < 250ms p95.

### Notifications
- None.

### Localization
- "Favorites" copy keys EN/AR.

### Error Handling
- `activity_archived` 409.

### Logging & Analytics
- `account.favorites.toggle`.

### Testing Notes
- E2E: heart, list, unheart.

### Related User Stories
- US-AC-001 (File 02) catalog lists the heart.

### Dependencies
- `customer_favorites`.

### Tags
`account` · `favorites`

### Notes / Rationale
A simple shortlist; no notifications.

---

## US-CA-016 — Submit review after completed session

### Story
As a customer who attended a session,
I want to leave a star rating and a short text review for that booking, within 14 days, once per booking,
So that other customers can make informed choices and coaches get feedback.

### Priority: P1
### Status: Draft
### Estimate: 4
### Sprint: Sprint 2 — Catalog MVP

### Actors
- **Primary actor:** Signed-in customer.
- **System actor:** `reviews` table owned by File 02, moderation queue consumed by File 05.

### Preconditions
1. Booking `status='attended'`.
2. No existing `reviews` row for the booking (unique constraint).
3. `slot.end_at + 14d > now()`.

### Postconditions
1. A `reviews` row with `status='pending'` exists.
2. Admin moderation (US-AB-013) can promote to approved or reject.
3. Customer may not edit after submission; only admin can.

### Main Flow
1. Customer taps "Leave a review" on a past booking row.
2. Opens `/account/reviews/new/ROW-2026-0412` with magic token in URL.
3. Selects 1-5 stars; types 280-char body.
4. `POST /api/account/reviews` body `{ booking_id, rating, body, locale }`.
5. Server validates: booking belongs to user, status='attended', no existing review, within 14 days.
6. Inserts review with `status='pending'`, `coach_id` resolved from `coach_session_assignments`.
7. UI shows "Thanks! Your review is pending moderation."

### Alternate Flows

#### A1 — Customer arrives via WhatsApp magic link (US-CN-006)
1. Magic token grants session-equivalent access without re-login.

### Exception Flows

#### E1 — Booking outside 14d window
1. Server returns 409 `review_window_expired`.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Submit review after session

  Scenario: Submit a 5-star review
    Given an attended booking "ROW-2026-0412" 5 days ago with no existing review
    When the customer submits rating=5 and body="Loved it"
    Then a reviews row exists with status="pending"
      And coach_id matches the booking's assigned coach
      And the response surfaces "pending moderation"

  Scenario: Cannot submit twice for one booking
    Given a reviews row already exists for "ROW-2026-0412"
    When the customer tries to submit again
    Then the server returns 409 with code "review_already_exists"

  Scenario: Cannot review outside 14-day window
    Given an attended booking 20 days ago with no review
    When the customer tries to submit
    Then the server returns 409 with code "review_window_expired"
```

### Edge Cases
1. Body length 0 — allowed? — no, server requires 1..280 chars (per File 02 schema).
2. Customer leaves Arabic review — `locale='ar'`; moderation UI shows both EN/AR tabs (US-AB-013).

### UI/UX Specifications
- 5 hoverable star icons; 280-char textarea with counter.
- Submit button disabled until rating selected and body length 1..280.

### Data Model
Writes to `reviews` (owned by File 02; unique `(booking_id)` and check `rating in 1..5`, body `1..1000` — but this story's UI caps at 280 chars; the 1000-char schema upper bound gives moderation room for revisions).

### API Endpoints
- `POST /api/account/reviews`, `GET /api/account/reviews/pending`.

### Security Considerations
- RLS: customer inserts their own review; admin reads/moderates all.
- Magic token validated server-side.

### Performance Requirements
- < 400ms p95.

### Notifications
- Admin sees new pending review count via File 05 moderation queue.

### Localization
- Star review copy keys `reviews.submit.*` EN/AR.

### Error Handling
- `review_already_exists` 409; `review_window_expired` 409; `invalid_rating` 422.

### Logging & Analytics
- `review.submitted` `{ booking_id, rating, locale }`.

### Testing Notes
- E2E: review submission + moderation promotion.

### Related User Stories
- US-AB-013 (File 05) moderation.
- US-CN-006 (File 09) post-session review request WhatsApp.

### Dependencies
- `reviews` (File 02).

### Tags
`account` · `reviews` · `moderation`

### Notes / Rationale
One review per booking enforces authenticity; this is the user's locked decision. The 280-char UI cap keeps reviews skimmable while the schema's 1000-char upper bound leaves room for the moderator to allow longer.

---

## US-CA-017 — Waitlist subscriptions (subscribe to activity; my subscriptions; unsubscribe)

### Story
As a customer who couldn't get a slot on a fully-booked activity,
I want to subscribe to that activity's waitlist and later unsubscribe if I change my mind,
So that the admin can manually offer me a slot when one opens (US-AD-008 in File 07).

### Priority: P1
### Status: Draft
### Estimate: 3
### Sprint: Sprint 2 — Catalog MVP

### Actors
- **Primary actor:** Signed-in customer.
- **System actor:** `waitlist_subscriptions` table.

### Preconditions
1. Customer is signed in.

### Postconditions
1. `waitlist_subscriptions` row exists with `status='active'`.
2. Customer's `/account/waitlist` page lists her subscriptions.

### Main Flow
1. Customer in booking flow (US-BF-015 in File 03) selects "Join waitlist" on a full slot.
2. Server inserts a `waitlist_subscriptions` row.
3. Customer lands on `/account/waitlist` showing subscription with preferred times.
4. Customer taps Unsubscribe; `status='paused'` (soft)`.
5. Telemetry.

### Alternate Flows

#### A1 — Customer subscribes from activity detail page globally (not tied to a slot)
1. Same insert with `slot_id=null`.

### Exception Flows

#### E1 — Already subscribed
1. Server returns 409 `already_subscribed` instead of duplicating.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Waitlist subscriptions

  Scenario: Subscribe to rowing waitlist
    Given a signed-in customer
    When she joins the waitlist on a full rowing slot
    Then a waitlist_subscriptions row exists with status="active"
      And her /account/waitlist page lists the subscription

  Scenario: Unsubscribe
    Given an active subscription
    When she taps Unsubscribe
    Then the row status becomes "paused"
      And admin waitlist view (US-AD-008) filters it out
```

### Edge Cases
1. Customer wants preferred times only Mon/Wed/Sat 09:00 — captured in `preferred_times` jsonb.

### UI/UX Specifications
- List with pause/unpause toggle.

### Data Model

```sql
waitlist_subscriptions
  id              uuid pk default gen_random_uuid()
  user_id         uuid not null references auth.users(id) on delete cascade
  activity_id     uuid not null references activities(id) on delete cascade
  slot_id         uuid references slots(id) on delete cascade   -- null = global per activity
  preferred_times jsonb                                         -- { days:[0,3,6], from:"09:00", to:"10:00" }
  status          text not null check (status in ('active','paused','fulfilled')) default 'active'
  created_at      timestamptz not null default now()
  index on (activity_id, slot_id, status)
  unique (user_id, activity_id, slot_id)
  -- RLS: owner SELECT/INSERT/UPDATE
```

### API Endpoints
- `POST /api/account/waitlist`, `GET /api/account/waitlist`, `DELETE /api/account/waitlist/{id}` (soft via status).

### Security Considerations
- RLS owner.

### Performance Requirements
- < 300ms p95.

### Notifications
- Customer is matched into US-AD-008's waitlist-offer queue when slot opens; "waitlist slot opened" WhatsApp (US-CN-007) is sent to her if the admin manually selects her.

### Localization
- EN/AR copy keys `waitlist.*`.

### Error Handling
- `already_subscribed` 409.

### Logging & Analytics
- `waitlist.subscribed` `{ activity_id }`.
- `waitlist.unsubscribed`.

### Testing Notes
- Unit: subscribe/unsubscribe; integration with US-AD-008 admin pick.

### Related User Stories
- US-BF-015 (File 03) join waitlist from booking flow.
- US-AD-008 (File 07) admin manual waitlist pick (the centerpiece).
- US-CN-007 (File 09) waitlist slot opened WhatsApp.

### Dependencies
- `waitlist_entries` (File 03 per-slot join); `slots` (File 03).

### Tags
`account` · `waitlist` · `subscriptions`

### Notes / Rationale
The user's locked decision was "admin manually picks the next person from waitlist"; the customer surface here is just the subscription entry.

---

## US-CA-018 — Notification preferences (per-trigger opt-out; WhatsApp only)

### Story
As a customer,
I want a Notifications preferences page where I can opt out of individual WhatsApp triggers,
So that I keep the messages I want (booking confirmation, 24h reminder) and silence the ones I don't (post-session review request).

### Priority: P1
### Status: Draft
### Estimate: 3
### Sprint: Sprint 2 — Catalog MVP

### Actors
- **Primary actor:** Signed-in customer.

### Preconditions
1. WhatsApp is the only channel; preferences are per-trigger per-channel.

### Postconditions
1. Toggling a trigger updates `notification_preferences.enabled` for the customer.

### Main Flow
1. Customer opens `/account/notifications`.
2. SSR lists the 4 customer-facing triggers from File 09: `booking_confirmed`, `reminder_24h`, `reminder_1h`, `post_session_review`.
3. Each row has an on/off toggle (WhatsApp icon).
4. Customer toggles, persists via `PATCH /api/account/notifications`.

### Alternate Flows

#### A1 — Customer stops all (STOP keyword)
1. The keyword STOP via WhatsApp (US-CN-020 in File 09) sets all triggers to disabled here too.

### Exception Flows

#### E1 — Trigger doesn't exist
1. Server ignores unknown trigger codes.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Notification preferences

  Scenario: Customer disables post-session review WhatsApp
    Given a signed-in customer with all triggers enabled by default
    When she toggles "post_session_review" off
    Then notification_preferences row exists with trigger="post_session_review" enabled=false
      And File 09 dispatcher skips her for that trigger

  Scenario: STOP keyword disables all
    Given the customer texts STOP to the business number
    When the dispatcher processes the keyword
    Then all notification_preferences rows for the customer have enabled=false
```

### Edge Cases
1. `booking_confirmed` is system-critical and cannot be disabled — UI shows locked pill with helper text.

### UI/UX Specifications
- List with WhatsApp icon next to each trigger and a switch.
- Locked items render a lock icon and greyed switch.

### Data Model

```sql
notification_preferences
  user_id    uuid not null references auth.users(id) on delete cascade
  trigger    text not null check (trigger in
              ('booking_confirmed','reminder_24h','reminder_1h','post_session_review',
               'waitlist_slot_opened','login_alert','membership_renewing'))
  channel    text not null check (channel = 'whatsapp')
  enabled    boolean not null default true
  primary key (user_id, trigger, channel)
  -- RLS: owner SELECT/UPDATE; service role default inserts
```

### API Endpoints
- `GET /api/account/notifications`, `PATCH /api/account/notifications`.

### Security Considerations
- RLS owner.
- `booking_confirmed` cannot be disabled (server ignores opt-out).

### Performance Requirements
- < 250ms p95.

### Notifications
- Self-referential — these preferences drive the File 09 dispatcher.

### Localization
- Trigger labels key `notifications.trigger.<code>.label` EN/AR.

### Error Handling
- `unknown_trigger` 422.

### Logging & Analytics
- `notifications.preferences.updated` `{ trigger, enabled }`.

### Testing Notes
- Unit: server ignores opt-out of locked trigger.

### Related User Stories
- US-CN-014 (File 09) preferences echoed via WhatsApp keywords.
- US-CN-020 STOP keyword.

### Dependencies
- File 09 dispatcher.

### Tags
`account` · `notifications` · `whatsapp` · `preferences`

### Notes / Rationale
The user's decision was "WhatsApp only in v1"; preferences are therefore per-trigger not per-channel.

---

## US-CA-019 — Personal data export (JSON)

### Story
As a customer,
I want to download a JSON file of all my bookings, reviews, messages, and preferences,
So that I have a GDPR-style copy of my AquaLudo data.

### Priority: P2
### Status: Draft
### Estimate: 3
### Sprint: Sprint 3 — Portal polish

### Actors
- **Primary actor:** Signed-in customer.

### Preconditions
1. Customer signed in.

### Postconditions
1. A signed URL to a time-limited ZIP (containing `bookings.json`, `reviews.json`, `messages.json`, `profile.json`) is generated in Supabase Storage and emailed or WhatsApped to the customer.

### Main Flow
1. Customer opens `/account/data-export`, taps "Request export".
2. Server enqueues a Vercel background job to assemble the ZIP.
3. Asynchronous completion writes a ZIP to `customer-exports/<user-id>/<ts>.zip` in Supabase Storage.
4. WhatsApp dispatched with the download link (valid 7 days).

### Alternate Flows

#### A1 — Customer re-requests within 24h
1. Server returns the existing ZIP URL.

### Exception Flows

#### E1 — Export assembly fails
1. Job logged; admin sees alert; customer sees "Export failed, retry" CTA.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Personal data export

  Scenario: Successful export
    Given a signed-in customer
    When she taps "Request export"
    Then a background job assembles bookings, reviews, messages, and profile into a ZIP
      And a WhatsApp with the download link is dispatched within 5 minutes
      And the link is valid for 7 days

  Scenario: Idempotent within 24h
    Given a prior export within 24 hours
    When she requests again
    Then the same ZIP URL is returned without a fresh job
```

### Edge Cases
1. Customer with 5,000 bookings — ZIP can take >1 min; the job uses a streaming JSON generator.

### UI/UX Specifications
- Card with "Request export" button and "Last export <ts>" timestamp.

### Data Model
No new tables; reads `bookings`, `reviews`, `whatsapp_messages`, `notification_preferences`, `profiles`.

### API Endpoints
- `POST /api/account/data-export`, `GET /api/account/data-export/status`.

### Security Considerations
- RLS enforced across all read queries.
- Export ZIP stored in private Storage bucket; signed URL only.

### Performance Requirements
- Job completes < 10 min for the largest test customer; signed URL generated in < 200ms.

### Notifications
- WhatsApp with download link (File 09).

### Localization
- Filename includes date: `aqualudo-export-<yyyy-mm-dd>.zip`.

### Error Handling
- `export_busy` 409 if a fresh request repeats within 60s.

### Logging & Analytics
- `account.export.requested`, `account.export.ready`, `account.export.downloaded`.

### Testing Notes
- Integration: simulate large customer; assert JSON parse.

### Related User Stories
- US-CA-020 deletion also runs a final export before hard delete.

### Dependencies
- Supabase Storage signed URL helper.

### Tags
`account` · `privacy` · `export`

### Notes / Rationale
A lightweight right-to-portability surface; no email body needed beyond the WhatsApp link.

---

## US-CA-020 — Account deletion (soft delete now + 30-day hard delete)

### Story
As a customer,
I want to delete my account with a 30-day recovery window,
So that I can change my mind, but knowing that after 30 days all my PII is irreversibly removed (admin records retained).

### Priority: P0
### Status: Draft
### Estimate: 5
### Sprint: Sprint 2 — Catalog MVP

### Actors
- **Primary actor:** Signed-in customer.
- **System actor:** Vercel Cron hard-delete job 30 days later.

### Preconditions
1. Customer signed in.
2. Customer's bookings: any confirmed future bookings must be cancelled first (UI requires Step 1 "Cancel upcoming").

### Postconditions
1. `profiles.deleted_at = now()`.
2. Customer cannot sign in (Supabase Auth user disabled via `admin.updateUserById({ ban: 24h })`).
3. A `account_deletion_requests` row records the scheduled hard-delete date.
4. A final data export (US-CA-019) is generated and dispatched via WhatsApp.
5. 30 days later a Vercel Cron job (File 10) hard-deletes: removes PII columns from `profiles`, anonymises `reviews` (clears `user_id`), and removes the `auth.users` row.

### Main Flow
1. Customer opens `/account/delete`.
2. UI forces confirmation of an explicit statement text "DELETE" typed into a field (kill-switch guilt).
3. Server checks for future confirmed bookings; if any, requires cancel-first.
4. Server sets `profiles.deleted_at=now()` and inserts `account_deletion_requests`.
5. Dispatches the final export WhatsApp and an "Account scheduled for deletion" WhatsApp.
6. Sign-out client side.

### Alternate Flows

#### A1 — Customer recovers within 30 days
1. Customer returns, attempts sign-in, server sees `deleted_at` not yet hard-delete, reveals `/account/recover` link.
2. Customer confirms recovery; `account_deletion_requests.status='cancelled'`; `profiles.deleted_at=null`; user un-banned.

### Exception Flows

#### E1 — Hard delete fails (rare)
1. Cron retries 3 times; admin alerted; retry daily.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Account deletion with 30-day window

  Scenario: Soft delete schedules hard delete
    Given a signed-in customer with no upcoming bookings
    When she types DELETE and confirms
    Then profiles.deleted_at equals now
      And account_deletion_requests.scheduled_hard_delete_at equals now + 30 days
      And a final data export WhatsApp is dispatched
      And the customer is signed out

  Scenario: Recovery within 30 days
    Given a soft-deleted account 5 days ago
    When she attempts to sign in
    Then she is offered a recovery link
      And confirming recovery clears deleted_at
      And account_deletion_requests.status becomes "cancelled"

  Scenario: Hard delete at 30 days removes PII
    Given a soft-deleted account whose scheduled_hard_delete_at is now
    When the daily cron runs
    Then profiles row has full_name, phone, dob, avatar_url set to null
      And reviews rows have user_id set to null
      And the auth.users row is removed (cascade deletes the profile)
      And bookings, booking_events, and audit_logs rows are preserved
```

### Edge Cases
1. Customer has reviews already approved — `reviews.user_id` cleared but body preserved with "Anonymous" attribution on the catalog page.
2. Customer books are referenced by an admin audit trail — those rows preserved (audit_logs uses actor_id only; no name).

### UI/UX Specifications
- Kill-switch page with clear warnings, recovery notice ("You have 30 days to change your mind"), and typed sentence confirmation.

### Data Model

```sql
account_deletion_requests
  user_id                     uuid pk references auth.users(id) on delete cascade
  requested_at                timestamptz not null default now()
  scheduled_hard_delete_at    timestamptz not null
  status                      text not null check (status in ('pending','cancelled','complete')) default 'pending'
  completed_at                timestamptz
```

### API Endpoints
- `POST /api/account/delete`, `POST /api/account/recover` (during recovery window).

### Security Considerations
- Typing "DELETE" reduces accidental mass deletion.
- Hard delete in cron uses service-role key in an Edge Function (File 10).

### Performance Requirements
- Soft delete p95 < 600ms.

### Notifications
- "Account scheduled for deletion" WhatsApp; final export WhatsApp per US-CA-019.

### Localization
- Confirmation text localized: "حذف" in Arabic.

### Error Handling
- `upcoming_bookings_block` 409 lists the upcoming booking ids to cancel first.

### Logging & Analytics
- `account.delete.requested`, `account.delete.recovered`, `account.delete.hard_completed`.

### Testing Notes
- Unit: recovery interval boundaries.
- Integration: cron-driven hard delete.

### Related User Stories
- US-CA-019 final export.
- US-IN-020 (File 10) Vercel Cron for hard-delete sweep.

### Dependencies
- Supabase Auth admin API, Vercel Cron.

### Tags
`account` · `deletion` · `privacy` · `cron`

### Notes / Rationale
The 30-day window respects recovery while staying GDPR-grade-clean. Booking/payment/audit records are retained for admin traceability, complying with the user's direction that admin history is preserved.

---

## End of File 04

This file documents the customer-account portal for AquaLudo v2. Adjacent files:

- `03-booking-flow.md` — the funnel that this portal's packages and memberships feed into.
- `05-admin-content-management.md` — admin moderation of customer-submitted reviews; admin user management interface.
- `07-admin-booking-management.md` — the booking lifecycle this portal's self-cancel writes into; the waitlist-offer flow that re-engages subscribers from this portal.
- `09-communications-notifications.md` — the WhatsApp transport that delivers every customer-facing trigger opted out via US-CA-018, the post-session review deep link used in US-CA-016, the login OTP in US-CA-002, and the final-export link in US-CA-019.