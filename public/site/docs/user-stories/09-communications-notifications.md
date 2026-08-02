# File 09 — Communications & Notifications User Stories

> **Project:** AquaLudo v2 (water sports academy on the Nile, Cairo, Egypt)
> **Stack:** Next.js 14 (App Router) + Supabase (Postgres + Auth + Storage) + Paymob + Meta Cloud WhatsApp API
> **Domain covered by this file:** the WhatsApp-only notification system end-to-end — provider connection, template registration and admin approval, the Notification Dispatcher service (queue-backed, idempotent, retry-aware), the eight customer-facing triggers, the four admin-facing triggers, the three coach-facing triggers, customer notification preferences, inbound message handling and chat threading, the retry queue, delivery receipts, anti-spam and rate limits, the admin notification panel, and inbound keyword commands.
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
> - `08-coach-panel.md`
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
10. **UI/UX Specifications** — most stories here are headless services, so this section is N/A unless a UI surface is involved.
11. **Data Model** — Supabase tables, fields, indexes, constraints, RLS.
12. **API Endpoints** — Next.js Route Handlers, Supabase RPCs, Meta Cloud API calls.
13. **Security Considerations** — RLS rules, input validation, abuse vectors, signature verification.
14. **Performance Requirements** — p95 budgets, payloads, caches, queues.
15. **Notifications** — meta-self-referential notes only.
16. **Localization** — EN/AR template bodies, fallback chains.
17. **Error Handling** — codes, copy, fallback behaviour.
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

WhatsApp is the only customer-facing channel in AquaLudo v1 (the locked interview decision; SMS and email were explicitly deferred). The business WhatsApp number is `+201011329642` (the line already owned by AquaLudo/Oar & Sail per the audit in `about.md`).

The notification system is a Notification Dispatcher composed of two runtime surfaces:

1. **Instant triggers** — Next.js Route Handlers in `app/api/whatsapp/*` receive Supabase Database Webhook events (or are called directly from booking/customer flows) and enqueue a dispatch job on `whatsapp_dispatch_jobs`. With the help of a PostgreSQL trigger + `pg_listen`, an Edge Function pulls a job and calls Meta Cloud API to send the message.
2. **Scheduled triggers** — A Vercel Cron job (`vercel.json` cron `*/5 * * * *`) scans for scheduled triggers (24h reminder, 1h reminder, coach daily 7am digest, waitlist-offer expiry sweep). Each scheduled job is fired by the cron and enqueues into the same `whatsapp_dispatch_jobs` queue.

The dispatcher is **idempotent**: each dispatch job carries `(trigger, ref_id)` with a unique constraint, so the same event inserted twice dispatches once. The retry policy uses exponential backoff (30 s, 2 m, 10 m, 1 h) and abandons a job after 24h of unrelenting failure (US-CN-016). The Meta Cloud API surface is wrapped by an interface `WhatsAppProvider` so 360dialog can be swapped without rewriting the dispatcher; the concrete implementation in v1 is Meta Cloud API.

Inbound messages land at `POST /api/whatsapp/webhook` (signature-verified per Meta requirements). Each inbound resolves a customer by phone, appends to the `customer_messages` inbox thread (visible to admin and coach), and may trigger keyword handling (US-CN-020). Delivery receipt webhooks (sent, delivered, read, failed) update `whatsapp_messages.status` and timestamps (US-CN-017).

Pages and route handlers owned by this file:

| Route / Handler                                    | Component path                                              | Auth                  | Rendering         |
|----------------------------------------------------|-------------------------------------------------------------|-----------------------|-------------------|
| `/admin/notifications`                             | `app/(admin)/admin/notifications/page.tsx`                  | Admin                 | SSR               |
| `POST /api/whatsapp/webhook`                       | `app/api/whatsapp/webhook/route.ts`                         | Meta HMAC signature   | Route Handler     |
| `POST /api/whatsapp/dispatcher/run` (Vercel cron)  | `app/api/whatsapp/dispatcher/run/route.ts`                  | Vercel Cron secret    | Route Handler     |
| `POST /api/whatsapp/templates`                    | `app/api/whatsapp/templates/route.ts`                       | Admin                 | Route Handler     |
| `POST /api/whatsapp/test`                          | `app/api/whatsapp/test/route.ts`                            | Admin                 | Route Handler     |
| `POST /api/whatsapp/send`                          | `app/api/whatsapp/send/route.ts`                            | Internal signed token | Route Handler     |

External services enumerated: **Meta Cloud WhatsApp API** (provider), **Vercel Cron** (scheduling), **Supabase Database Webhooks** (instant triggers from `bookings`/`reviews`/`waitlist_offers`), **Postgres `pg_listen`** (Edge Function dispatcher loop).

Cross-cutting concerns owned by File 10: Vercel Cron configuration; secrets vaulting; RLS policy templates applied to every WhatsApp table. Cross-cutting concerns owned by File 04: per-trigger opt-out (`notification_preferences` consulted by the dispatcher before send). Cross-cutting concerns owned by File 05: admin role gating on the admin notification panel.

The Meta message template naming convention is `aqualudo_<purpose>_v<n>` — short, lowercase, snake_case, versioned. Two languages per template are required for v1: `en` and `ar`. The Meta approval flow (US-CN-002) governs the lifecycle of each template.

---

## Domain Glossary

- **WhatsAppProvider** — a server-side TypeScript interface `{ sendTemplate, sendText, getTemplateStatus, registerTemplate, fetchDeliveryReceipt }`. Concrete impl in v1: `MetaCloudWhatsAppProvider`.
- **Template** — a pre-approved Meta message template (with `{{n}}` placeholders) that may be used inside the 24-hour customer service window or for outbound marketing/utility messaging when the conversation is open. Templates must be approved by Meta before being used.
- **Trigger** — a business event that produces a single outbound message. The eight customer-facing triggers: `booking_confirmed`, `reminder_24h`, `reminder_1h`, `post_session_review`, `waitlist_slot_opened`, `login_alert`, `membership_renewing`, `package_expiry_warning`. The four admin-facing: `admin_contact_message`, `admin_new_booking`, `admin_new_cancellation`, `admin_new_review_pending`. The three coach-facing: `coach_new_assignment`, `coach_customer_reply`, `coach_daily_digest`.
- **Dispatch job** — a row in `whatsapp_dispatch_jobs` representing one message the dispatcher should attempt. Status transition: `pending → in_flight → succeeded | failed | abandoned`.
- **Conversation window** — the Meta 24-hour customer service window that opens after a customer's last inbound. Outside the window, only approved templates may be sent; inside the window, free-text may be sent. AquaLudo's flow uses templates for every outbound trigger so the window does not gate us.
- **Magic token** — a single-use signed URL token, valid for a defined window (default 14 days for review; 15 minutes for waitlist claim). Used to deep-link a customer into the app without requiring sign-in.
- **Quality rating** — Meta's per-business-number quality score (`HIGH`, `MEDIUM`, `LOW`); a low rating downgrades the daily messaging limit tier. Surfaced in the admin notifications panel.
- **Messaging limit tier** — Meta's per-business-number daily cap (`TIER_1K`, `TIER_10K`, `TIER_100K`, `UNLIMITED`). AquaLudo starts at `TIER_1K`.
- **STOP keyword** — inbound "STOP" sets `whatsapp_conversations.status='opted_out'`, ensuring the dispatcher refuses future outbound to that number.
- **Idempotency key** — the concatenation `(trigger||':'||ref_id||':'||language)` serves as the unique key per dispatch job, so a duplicated webhook for the same booking confirmation doesn't send the customer two messages.

---

## Table of Contents

1. US-CN-001 — WhatsApp Business API connection setup & test
2. US-CN-002 — Template registration & admin approval (Meta pre-approved template flow)
3. US-CN-003 — Trigger: Booking confirmed message (within 30s of Paymob capture / cash collected)
4. US-CN-004 — Trigger: 24h reminder (23h30m–24h30m window)
5. US-CN-005 — Trigger: 1h reminder (50m–70m window)
6. US-CN-006 — Trigger: Post-session thank-you + review request (30 min after slot end)
7. US-CN-007 — Trigger: Waitlist slot opened (admin manual pick, 15-min claim window)
8. US-CN-008 — Trigger: Admin — new contact message received
9. US-CN-009 — Trigger: Admin — new booking received
10. US-CN-010 — Trigger: Admin — cancellation received
11. US-CN-011 — Coach — new session assigned
12. US-CN-012 — Coach — customer replied in chat
13. US-CN-013 — Coach — daily 7am digest of today's sessions (cron)
14. US-CN-014 — Customer notification preferences (per-trigger opt-out via UI + WhatsApp keywords)
15. US-CN-015 — Inbound message handling + chat threading
16. US-CN-016 — Failed message retry queue (30s, 2m, 10m, 1h; abandon after 24h)
17. US-CN-017 — Delivery receipt webhook → status log (delivered, read, failed)
18. US-CN-018 — Anti-spam & rate-limits (per-customer per-trigger throttle; daily business cap; fallback chain)
19. US-CN-019 — Admin notification panel (badge with unread count; dropdown list)
20. US-CN-020 — WhatsApp inbound keyword commands (BOOK, CANCEL <id>, STOP, START)

---

## US-CN-001 — WhatsApp Business API connection setup & test

### Story
As the AquaLudo platform administrator,
I want to connect the WhatsApp Business API (Meta Cloud API) to my business number `+201011329642`, run a round-trip test message, and surface the connection status in the admin panel,
So that every downstream notification trigger has a working transport before any customer-facing flow depends on it.

### Priority: P0
### Status: Draft
### Estimate: 5
### Sprint: Sprint 1 — Foundation

### Actors
- **Primary actor:** Admin (Supabase Auth role `admin`) in `/admin/settings/whatsapp`.
- **System actor:** `MetaCloudWhatsAppProvider`; Route Handlers `POST /api/whatsapp/test` and `POST /api/whatsapp/webhook`.

### Preconditions
1. A Meta Business Manager account exists with the AquaLudo Business verified.
2. The Meta app has the WhatsApp Business Cloud API product enabled.
3. The business phone number `+201011329642` is provisioned and approved for production messaging.
4. The webhook URL `https://aqualudo.net/api/whatsapp/webhook` has been registered in the Meta app dashboard with the verify token stored in Supabase Vault.

### Postconditions
1. A `whatsapp_business_numbers` row exists with `phone_number='+201011329642'`, `status='connected'`, `messaging_limit_tier='TIER_1K'`.
2. A round-trip test message is recorded: an outbound sendTemplate + an inbound echo (when admin replies).
3. Telemetry event `whatsapp.connection.verified` fires.

### Main Flow (Happy Path)
1. Admin navigates to `/admin/settings/whatsapp`.
2. The page surfaces a "Connect" wizard with pre-filled phone `+201011329642`, Meta app id, and business id.
3. Admin clicks "Verify webhook". The page calls `GET /api/whatsapp/webhook?hub.verify_token=...&hub.challenge=...` — the Route Handler echoes the challenge if the token matches the vaulted value.
4. Admin enters a test recipient phone (their own).
5. Admin clicks "Send test message". The page calls `POST /api/whatsapp/test` with the recipient.
6. `MetaCloudWhatsAppProvider.sendTemplate('aqualudo_connection_test_v1', { to: recipient, language: 'en' })` sends the test template.
7. The Meta Cloud API returns `wa_message_id`; the page polls `/api/whatsapp/messages?id=...` for up to 30 s.
8. On delivery receipt, the `whatsapp_messages.status` flips to `delivered`; UI surfaces green check.
9. `whatsapp_business_numbers.status` set to `connected`.

### Alternate Flows

#### A1 — Admin also sends an Arabic test
1. Repeat with `language='ar'` to verify the Arabic template renders.

### Exception Flows

#### E1 — Webhook verify token mismatch
1. The webhook echo fails; UI surfaces "Verify token mismatch — check your Supabase Vault value".

#### E2 — Meta Cloud API "WEBHOOK_NOT_VERIFIED"
1. Meta has not seen a successful webhook handshake; UI suggests waiting 60s and retrying.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: WhatsApp Business API connection

  Scenario: Verified webhook echoes Meta challenge
    Given the verify token is vaulted as "aqualudo-verify-9f2c"
    When Meta fetches /api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=aqualudo-verify-9f2c&hub.challenge=abc123
    Then the response body equals "abc123"
      And the Content-Type is text/plain

  Scenario: Test template round-trip succeeds
    Given the business number is registered and a template "aqualudo_connection_test_v1" is approved
    When the admin sends a test to their own number
    Then a whatsapp_messages row is inserted with direction="outbound" and a wa_message_id
      And within 30 seconds the row's status flips to "delivered"
```

### Edge Cases
1. Admin provisioned the business number on a different Meta app — the connection test passes but production messaging fails until the right app id is set in Vault.
2. Number was previously associated with another WhatsApp Business Account (WABA) — Meta requires a migrate flow; surfaced as "Number already in use".

### UI/UX Specifications
- N/A for the webhook verification; admin UI surfaces a single status card on `/admin/settings/whatsapp`.

### Data Model

```sql
whatsapp_business_numbers
  id                     uuid pk default gen_random_uuid()
  phone_number           text not null unique             -- E.164
  display_name           text not null default 'AquaLudo'
  quality_rating         text check (quality_rating in ('HIGH','MEDIUM','LOW','UNKNOWN')) default 'UNKNOWN'
  messaging_limit_tier   text check (messaging_limit_tier in ('TIER_1K','TIER_10K','TIER_100K','UNLIMITED')) default 'TIER_1K'
  status                 text not null check (status in ('pending','connected','restricted','banned')) default 'pending'
  last_quality_refresh_at timestamptz
  -- RLS: admin only; service role on writes
```

### API Endpoints
- `GET /api/whatsapp/webhook` — Meta verification handshake (no auth, returns echo).
- `POST /api/whatsapp/webhook` — Meta event webhook (HMAC signature verified).
- `POST /api/whatsapp/test` — admin pushes a test send.
- `GET /api/whatsapp/health` — returns business numbers status for the admin page.

### Security Considerations
- The verify token and `APP_SECRET` (HMAC) are vaulted in Supabase Vault; never written to the client bundle.
- The webhook `POST` is verified by `X-Hub-Signature-256` HMAC-SHA256 with the vaulted app secret. Mismatch returns 401, the body is discarded (US-CN-015, US-CN-017 rely on this guarantee).
- `POST /api/whatsapp/test` requires admin session + a signed admin CSRF token.

### Performance Requirements
- Webhook verification response p95 < 100 ms.
- Test send p95 < 1.5 s (includes Meta round-trip).

### Notifications
- The test message itself is the notification. No cascading triggers.

### Localization
- Test template bodies shipped in EN and AR. EN: `AquaLudo by Oar & Sail — your connection works. Sent at {{1}}.` AR: `أكوالودو أوار آند سايل — اتصالك يعمل. أُرسلت في {{1}}.`

### Error Handling
- `meta_http_error` with status code surfaced to UI.
- `verify_token_mismatch` 401.

### Logging & Analytics
- `whatsapp.connection.verify_started` / `verify_succeeded` / `verify_failed`.
- `whatsapp.connection.test_sent` `{ wa_message_id }`.

### Testing Notes
- Unit: HMAC verification helper.
- Integration: simulated Meta handshake in test env.
- E2E: Playwright admin flow with mocked provider.

### Related User Stories
- US-CN-002 template registration.
- US-IN-014 (File 10) secrets vaulting.

### Dependencies
- Supabase Vault; Meta Cloud API IAM.

### Tags
`whatsapp` · `connection` · `meta` · `admin`

### Notes / Rationale
A failed WhatsApp transport would silently drop every notification; we make the connection an explicit, testable step before any trigger ships.

---

## US-CN-002 — Template registration & admin approval

### Story
As the AquaLudo platform administrator,
I want to register Meta message templates (EN + AR) with placeholder slots, submit them to Meta for review, and see the ready-to-use status alongside any Meta rejection reasons,
So that every outbound trigger has an approved template before it is invoked.

### Priority: P0
### Status: Draft
### Estimate: 5
### Sprint: Sprint 1 — Foundation

### Actors
- **Primary actor:** Admin in `/admin/communications/templates`.
- **System actor:** `MetaCloudWhatsAppProvider.registerTemplate`; webhooks for `MESSAGE_TEMPLATE_STATUS_UPDATED`.

### Preconditions
1. The connection in US-CN-001 is established.
2. The dispatcher falls back to free-text inside the 24h customer service window when templates are unavailable.

### Postconditions
1. A `whatsapp_templates` row exists per `(template_name, language)` pair with `status` reflecting Meta's review.
2. The dispatcher's `sendTemplate` lookup returns the latest approved version's body for the requested language.

### Main Flow (Happy Path)
1. Admin opens `/admin/communications/templates`, taps "Register template".
2. Fills template name `aqualudo_booking_confirmed_v1`, category `UTILITY`, body for EN and AR with placeholder markers `{{1}}` `{{2}}` etc.
3. Submits for review.
4. The Route Handler calls `MetaCloudWhatsAppProvider.registerTemplate(...)`.
5. Meta returns `template_id` and `status='PENDING'`; the `whatsapp_templates` row stores the raw_response.
6. When Meta completes the review, Meta fires a `MESSAGE_TEMPLATE_STATUS_UPDATED` webhook; the dispatcher's handler updates `status` to `APPROVED` or `REJECTED` with admin reason.
7. Admin sees the green pill for approved; red with reason for rejected.

### Alternate Flows

#### A1 — Template approved then revised
1. Admin updates the body and resubmits; a new row with `version+1` is inserted. The dispatcher picks the highest approved version by name.

### Exception Flows

#### E1 — Meta rejects the template
1. Admin edits and resubmits; old rejection row retained for audit.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Template registration

  Scenario: Successfully registered template pending review
    Given admin submits EN + AR bodies for "aqualudo_booking_confirmed_v1"
    When the register call returns a template_id
    Then a whatsapp_templates row exists with status="pending"
      And the raw_response stores Meta's payload

  Scenario: Meta approval flips status
    Given a pending template
    When Meta fires MESSAGE_TEMPLATE_STATUS_UPDATED with status="APPROVED"
    Then the row's status becomes "approved"
      And the dispatcher's sendTemplate returns that body

  Scenario: Meta rejection records reason
    Given a pending template
    When Meta rejects with reason="VARIABLE_PLACEHOLDER_COUNT_MISMATCH"
    Then the row's status becomes "rejected"
      And the admin sees the reason inline
```

### Edge Cases
1. Template body contains the brand text "AquaLudo by Oar & Sail" but the parameters wrap onto two lines — Meta's preview still validates.
2. AR body uses Arabic-Indic digits in a placeholder position — Meta's grammar allows.

### UI/UX Specifications
- Admin table listing templates with EN/AR tabs side-by-side; status pill; version column; "Resubmit" CTA on rejected rows.
- Loading: spinner during register call.
- Empty state: "No templates yet. Start with the canned bundles from `messages/whatsapp-templates/*.json`".

### Data Model

```sql
whatsapp_templates
  id              uuid pk default gen_random_uuid()
  template_name   text not null                              -- aqualudo_<purpose>_v<n>
  language        text not null check (language in ('en','ar'))
  body            text not null                              -- Meta template body with {{n}} placeholders
  params          jsonb                                      -- { "1":"{customer_name}", "2":"{activity_name_en}", ... }
  category        text not null check (category in ('UTILITY','MARKETING','AUTHENTICATION')) default 'UTILITY'
  status          text not null check (status in ('pending','approved','rejected','paused')) default 'pending'
  meta_template_id text
  raw_response    jsonb
  created_at      timestamptz not null default now()
  approved_at     timestamptz
  unique (template_name, language)
  index on (status)
  -- RLS: admin SELECT/INSERT/UPDATE; service role SELECT for dispatcher lookup
```

### API Endpoints
- `POST /api/whatsapp/templates` (admin) — register.
- `GET /api/whatsapp/templates?status=pending|approved|rejected` (admin) — list.
- `POST /api/whatsapp/webhook` (Meta) — receives the status update.

### Security Considerations
- Admin role gate.
- Bodies validated against Meta's length and placeholder rules.
- No customer PII is stored inside the template body; param binding happens at send time.

### Performance Requirements
- Register p95 < 2 s (Meta round-trip).

### Notifications
- Self-referential — the system that owns notifications registers its own templates.

### Localization
- Each template has paired EN + AR rows. The dispatcher's lookup priority is customer's `profiles.locale` first; if that language template is `rejected`, fall back to EN (US-CN-018).

### Error Handling
- `meta_template_invalid` 422 with surfaced Meta reason.
- `template_already_exists` 409.

### Logging & Analytics
- `whatsapp.template.registered`, `whatsapp.template.approved`, `whatsapp.template.rejected`.

### Testing Notes
- Unit: placeholder binding.
- Integration: Meta sandbox webhook simulation.

### Related User Stories
- US-CN-001 connection.
- All of US-CN-003..013 rely on approved templates.

### Dependencies
- Meta Cloud API template review SLA (typically 1-24h).

### Tags
`whatsapp` · `templates` · `admin` · `meta`

### Notes / Rationale
Pre-approved templates let AquaLudo message outside the 24-hour customer service window without restriction — fundamental for reminders and review requests that fire long after any inbound.

---

## US-CN-003 — Trigger: Booking confirmed message (within 30s of Paymob capture)

### Story
As a customer whose Paymob payment has just been captured for booking "ROW-2026-0412",
I want to receive a WhatsApp confirmation with the activity name, date, time, coach, location, and order number within 30 seconds,
So that I have an immediate proof of booking on my phone.

### Priority: P0
### Status: Draft
### Estimate: 5
### Sprint: Sprint 2 — Booking + Notifications

### Actors
- **Primary actor:** Customer (signed-in).
- **System actor:** Booking capture Route Handler (US-BF-013 in File 03); the dispatcher; Meta Cloud API.

### Preconditions
1. Booking `status='confirmed'` and a `payment_transactions` row exists with `status='captured'` OR admin manually marked paid (`payment_captured`) OR cash-on-arrival `cash_collected` per US-AD-011 (File 07).
2. Template `aqualudo_booking_confirmed_v1` is approved in the customer's preferred language.
3. `whatsapp_conversations.status` is not `opted_out` for the customer.
4. `notification_preferences` for the customer's `booking_confirmed` trigger has `enabled=true` (locked: cannot be disabled).

### Postconditions
1. A `whatsapp_dispatch_jobs` row is created with `trigger='booking_confirmed'`, `ref_id=ROW-2026-0412`, `status='pending'`, `scheduled_for=now()`.
2. Within 30 s the dispatcher sends and the customer receives the message.
3. A `whatsapp_messages` row records the outbound with `wa_message_id`.

### Main Flow (Happy Path)
1. The booking capture Route Handler calls `enqueueTrigger('booking_confirmed', booking_id, customer_id)` — a server-side helper that emits a Postgres NOTIFY `dispatch:new` and inserts a `whatsapp_dispatch_jobs` row in the same transaction as the booking `status='confirmed'` update.
2. The dispatcher Edge Function picks up the job within 5 s.
3. The dispatcher:
   a. Looks up the customer's `profiles.locale` to pick the language.
   b. Looks up the booking (joins activity + tier + coach + slot).
   c. Binds the params: `{{1}}` = activity nameEN/AR, `{{2}}` = formatted date+time (Africa/Cairo), `{{3}}` = coach name, `{{4}}` = location address, `{{5}}` = order number `ROW-2026-0412`.
   d. Picks the approved template body for the language.
   e. Posts to Meta Cloud API `POST /v20.0/<phone_id>/messages` with the template payload.
4. Meta returns `wa_message_id`; the dispatcher writes `whatsapp_messages` outbound row and updates `whatsapp_dispatch_jobs.status='succeeded'`.
5. Telemetry event `whatsapp.dispatch.booking_confirmed.sent`.

### Alternate Flows

#### A1 — Customer locale AR template is rejected
1. Dispatcher falls back to EN template (US-CN-018 fallback chain records `fallback='en'`).

### Exception Flows

#### E1 — Meta returns rate-limit (429 "rate limit exceeded")
1. Dispatcher schedules retry per US-CN-016.

#### E2 — Conversation opted_out
1. Dispatcher skips send, marks `whatsapp_dispatch_jobs.status='failed'` with `last_error='opted_out'`.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Booking confirmed WhatsApp trigger

  Scenario: Capture fires booking_confirmed within 30s
    Given Paymob captures payment for booking "ROW-2026-0412" owned by Salma Akl, locale "en"
    When the booking capture handler runs
    Then a whatsapp_dispatch_jobs row exists with trigger="booking_confirmed" ref_id="ROW-2026-0412" status="pending"
      And the dispatcher sends the "aqualudo_booking_confirmed_v1" template within 30 seconds
      And the customer's WhatsApp shows the activity, date, coach, and order number
      And a whatsapp_messages row exists with direction="outbound" and a non-null wa_message_id

  Scenario: Arabic locale prefers the Arabic template
    Given Salma Akl has locale="ar"
    When booking_confirmed fires
    Then the dispatcher uses the Arabic template body and Arabic-Indic dates

  Scenario: Opted-out conversation skips send
    Given the customer's whatsapp_conversations.status="opted_out"
    When booking_confirmed fires
    Then the dispatch job status becomes "failed" with last_error="opted_out"
      And no Meta API call is made
```

### Edge Cases
1. Booking party_size > 1 — message adds "you + N" phrase.
2. Booking has add-ons — message appends brief bullet list (truncated if >3 → "and N add-ons").
3. Booking paid via package redemption — payment method param shows "8-pack + 1 free".
4. Booking paid via membership — "Silver membership — session 8/12".
5. Booking assigned to "any coach" — coach name param shows "Any AquaLudo coach".

### UI/UX Specifications
- N/A (headless service; the message is the UI).

### Data Model
Reads `bookings`, `profiles`, `activities`, `activity_pricing_tiers`, `coach_session_assignments` (File 08), `slots`. Writes `whatsapp_dispatch_jobs`, `whatsapp_messages`. The full schema for the two WhatsApp tables:

```sql
whatsapp_dispatch_jobs
  id              uuid pk default gen_random_uuid()
  trigger         text not null
  ref_id          uuid not null                       -- booking_id / waitlist_subscription_id / review_id / etc.
  customer_id     uuid references auth.users(id) on delete cascade
  coach_id        uuid references auth.users(id) on delete cascade
  admin_id        uuid references auth.users(id) on delete cascade
  template_id     uuid references whatsapp_templates(id)
  language        text not null check (language in ('en','ar'))
  params          jsonb not null
  scheduled_for   timestamptz not null default now()
  status          text not null check (status in ('pending','in_flight','succeeded','failed','abandoned')) default 'pending'
  attempt_count   int not null default 0
  last_error      text
  created_at      timestamptz not null default now()
  completed_at    timestamptz
  unique (trigger, ref_id, language)
  index on (status, scheduled_for)
  -- RLS: service role only; admin SELECT for ops panel

whatsapp_messages
  id              uuid pk default gen_random_uuid()
  customer_id     uuid references auth.users(id) on delete cascade
  coach_id        uuid references auth.users(id) on delete cascade
  admin_id        uuid references auth.users(id) on delete cascade
  direction       text not null check (direction in ('outbound','inbound'))
  template_id     uuid references whatsapp_templates(id)
  body            text not null                       -- rendered text after param binding
  params          jsonb
  wa_message_id   text                                -- Meta's message id (outbound)
  business_phone  text not null default '+201011329642'
  status          text not null check (status in ('queued','sent','delivered','read','failed')) default 'queued'
  created_at      timestamptz not null default now()
  sent_at         timestamptz
  delivered_at    timestamptz
  read_at         timestamptz
  error_code      text
  error_message   text
  index on (customer_id, created_at desc)
  index on (wa_message_id) where wa_message_id is not null
  -- RLS: customer SELECT own inbound/outbound; admin SELECT all; service role INSERT
```

### API Endpoints
- `enqueueTrigger(trigger, refId, actorId)` — Postgres function called from the booking capture Route Handler; inserts the dispatch job and issues `pg_notify('dispatch:new', job_id)`.
- `POST /v20.0/<phone_id>/messages` (Meta Cloud API) — outbound sendTemplate.
- `POST /api/whatsapp/webhook` (Meta) — delivery receipt for the outbound.

### Security Considerations
- Only the internal Route Handlers / RPC may call `enqueueTrigger`. Exposed `POST /api/whatsapp/send` requires a signed internal token.
- The Meta phone id and access token are vaulted; the dispatcher fetches them at send time from Supabase Vault cache (5 min TTL).

### Performance Requirements
- Capture → enqueue p95 < 100 ms (same transaction).
- Enqueue → Meta send p95 < 30 s (per acceptance criteria).

### Notifications
- Self-referential.

### Localization
- Template `aqualudo_booking_confirmed_v1` EN body: `Hi {{1}} — your {{2}} session on {{3}} is confirmed.\nCoach: {{4}}\nWhere: {{5}}\nOrder: {{6}}\n— AquaLudo by Oar & Sail`.
- AR body: `مرحبًا {{1}} — تم تأكيد حجز جلسة {{2}} بتاريخ {{3}}.\nالمدرب: {{4}}\nالموقع: {{5}}\nرقم الطلب: {{6}}\n— أكوالودو أوار آند سايل`.
- Date/time format: Arabic-Indic numerals for AR.

### Error Handling
- `meta_template_not_found` (template was paused between enqueue and send) — requeue with fallback to EN.
- `customer_phone_missing` 422 — admin alert.

### Logging & Analytics
- `whatsapp.dispatch.booking_confirmed.enqueued` `{ booking_id, language }`.
- `whatsapp.dispatch.booking_confirmed.sent` `{ wa_message_id }`.
- `whatsapp.dispatch.booking_confirmed.failed` `{ reason }`.

### Testing Notes
- Unit: param binding helper.
- Integration: mock Meta send; assert dispatch row transition.
- E2E: simulate Paymob capture webhook; assert WhatsApp outbox row within 30s in a test WABA.

### Related User Stories
- US-BF-013/014 (File 03) Paymob capture + confirmation page.
- US-CA-018 (File 04) opt-out (locked for this trigger).

### Dependencies
- US-CN-001 connection; US-CN-002 template approval.

### Tags
`whatsapp` · `trigger` · `booking_confirmed` · `paymob`

### Notes / Rationale
The 30-second SLA is the contractual promise the user made to the customer in the discovery interview — confirmed bookings should feel instant on WhatsApp.

---

## US-CN-004 — Trigger: 24h reminder (23h30m–24h30m window)

### Story
As a customer with a confirmed booking tomorrow morning,
I want to receive a WhatsApp reminder 24 hours before the slot start,
So that I can plan logistics, request leave, or cancel within the refund window if needed.

### Priority: P0
### Status: Draft
### Estimate: 5
### Sprint: Sprint 2 — Booking + Notifications

### Actors
- **Primary actor:** Customer with a `confirmed` booking whose `slot.start_at` is 23h30m–24h30m away.
- **System actor:** Vercel Cron job running every 5 min; dispatcher.

### Preconditions
1. Booking `status='confirmed'`.
2. No prior `reminder_24h` dispatch job for the booking id.

### Postconditions
1. One `whatsapp_dispatch_jobs` row exists with `trigger='reminder_24h'` and `status='succeeded'` (or appropriate failure).
2. Customer receives the reminder WhatsApp.

### Main Flow (Happy Path)
1. Vercel Cron `*/5 * * * *` triggers `POST /api/whatsapp/dispatcher/run`.
2. The Route Handler queries bookings whose `slot.start_at` falls in `[now()+23h30m, now()+24h30m]` and `status='confirmed'` and no existing `reminder_24h` dispatch job.
3. For each match, call `enqueueTrigger('reminder_24h', booking_id, customer_id)` with `scheduled_for=now()`.
4. The dispatcher sends template `aqualudo_reminder_24h_v1` with params `{customer_name, activity, formatted_start, location, coach}`.
5. On success the dispatch job is `succeeded`; the booking record is marked `reminder_24h_sent_at` to short-circuit future scans (also enforced via unique constraint `(trigger, ref_id, language)`).

### Alternate Flows

#### A1 — Customer opted out
1. Dispatch job recorded as `failed` with `last_error='opted_out'`.

### Exception Flows

#### E1 — Vercel Cron misses one run
1. The 5-minute frequency and 1-hour window overlap means the next run catches any missed bookings; no booking is silently skipped.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: 24h reminder

  Scenario: A booking 24h away receives the reminder
    Given a confirmed booking "ROW-2026-0412" with slot.start_at = now + 24h
    When the cron runs
    Then a reminder_24h dispatch job is enqueued and the customer receives the template within 60 seconds

  Scenario: A booking 23h away does not receive the reminder yet
    Given a confirmed booking with slot.start_at = now + 23h
    When the cron runs
    Then no reminder_24h dispatch job is created (outside the window)

  Scenario: Reminder is idempotent per booking
    Given a reminder_24h dispatch row already exists for "ROW-2026-0412"
    When the cron runs again
    Then no second row is created
```

### Edge Cases
1. Booking was cancelled by customer between cron runs — booking status='cancelled'; cron query excludes it.
2. Booking in the next 24h but it's a waitlist-offer-fulfilled booking made with a 15-min claim — the reminder still fires for it (it's a real confirmed booking now).

### UI/UX Specifications
- N/A (headless service).

### Data Model
Reads `bookings` + `slots`. Writes `whatsapp_dispatch_jobs`, `whatsapp_messages`. Adds column `reminder_24h_sent_at timestamptz` to `bookings` (owned by File 03 — referenced, not redefined here).

### API Endpoints
- `POST /api/whatsapp/dispatcher/run` (Vercel-Cron-protected).
- The cron handler internally invokes a Postgres function `due_reminder_24h()` returning the booking id list.

### Security Considerations
- Vercel Cron secret header verified by middleware; the run handler refuses non-Vercel-Cron calls.
- The dispatcher's enqueue uses the service role key.

### Performance Requirements
- Cron iteration p95 < 5 s (max ~1000 bookings scanned per run).
- The repeated 5-min scan plus 30-min-wide window guarantees at least one fire opportunity per booking.

### Notifications
- Self-referential.

### Localization
- Template `aqualudo_reminder_24h_v1` EN: `Reminder {{1}}: your {{2}} session is tomorrow at {{3}}.\nWhere: {{4}}\nNeed to cancel? Tap here: {{5}}\n— AquaLudo`.
- AR: `تذكير {{1}}: جلسة {{2}} غدًا عند الساعة {{3}}.\nالموقع: {{4}}\nلإلغاء الحجز اضغط هنا: {{5}}\n— أكوالودو`.

### Error Handling
- `cron_skipped_due_to_lock` — if a prior run is still in flight (long-running batch); the next cron run continues the work.

### Logging & Analytics
- `whatsapp.cron.reminder_24h.run` `{ matches }`.

### Testing Notes
- Unit: window math edge cases.
- Integration: seeded bookings across the window, run cron forward.

### Related User Stories
- US-CA-009 (File 04) upcoming tab includes the reminder send timestamp.

### Dependencies
- US-CN-001 connection; templates approved.

### Tags
`whatsapp` · `trigger` · `reminder_24h` · `cron`

### Notes / Rationale
A 30-minute scan window plus a 5-minute cron guarantees no missed reminders — the wider window prevents drift from clock skew or a single missed cron run.

---

## US-CN-005 — Trigger: 1h reminder (50m–70m window)

### Story
As a customer with a confirmed booking shortly,
I want to receive a WhatsApp reminder around 1 hour before the slot start,
So that I leave on time and arrive at the Nile boathouse prepared.

### Priority: P0
### Status: Draft
### Estimate: 3
### Sprint: Sprint 2 — Booking + Notifications

### Actors
- **Primary actor:** Customer with a confirmed booking 50-70 min away.
- **System actor:** Vercel Cron job; dispatcher.

### Preconditions
1. Booking `status='confirmed'`.
2. No prior `reminder_1h` dispatch.

### Postconditions
1. Customer receives a 1h reminder WhatsApp.

### Main Flow (Happy Path)
1. Vercel Cron `*/5 * * * *` calls `POST /api/whatsapp/dispatcher/run`.
2. Cron query selects bookings with `slot.start_at in [now()+50m, now()+70m]` and `status='confirmed'` and no prior `reminder_1h` dispatch.
3. For each, `enqueueTrigger('reminder_1h', booking_id, customer_id)`.
4. Dispatcher sends `aqualudo_reminder_1h_v1` with `{customer_name, activity, time, location, preparation_tips}`.

### Alternate Flows

#### A1 — Booking's slot start is in the past
1. Cron query excludes past slots.

### Exception Flows

#### E1 — Customer opted out of reminder_1h
1. Dispatcher skips, `whatsapp_dispatch_jobs.status='failed'`, `last_error='opted_out'`.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: 1h reminder

  Scenario: Booking 60 minutes away fires reminder_1h
    Given a confirmed booking with slot.start_at = now + 60 minutes
    When the cron runs
    Then a reminder_1h dispatch job is created and the customer receives the WhatsApp

  Scenario: Reminder_1h idempotent per booking
    Given an existing reminder_1h dispatch job for "ROW-2026-0412"
    When the cron runs again
    Then no duplicate row is created
```

### Edge Cases
1. Booking party_size > 1 — message ends "you + N".

### UI/UX Specifications
- N/A.

### Data Model
Reads `bookings` + `slots`. Adds column `reminder_1h_sent_at timestamptz` to `bookings` (File 03).

### API Endpoints
- `POST /api/whatsapp/dispatcher/run`.

### Security Considerations
- Vercel Cron secret protected.

### Performance Requirements
- Cron iteration p95 < 3 s.

### Notifications
- Self-referential.

### Localization
- Template `aqualudo_reminder_1h_v1` EN body: `Heads up {{1}}: your {{2}} session starts in 1 hour at {{3}}.\nWhat to bring: refillable bottle, hat, towel.\nNeed to cancel? Refunds only before 24h.\n— AquaLudo`.

### Error Handling
- Same as US-CN-004.

### Logging & Analytics
- `whatsapp.cron.reminder_1h.run`.

### Testing Notes
- Unit: window edge.

### Related User Stories
- US-CN-004 24h reminder (analogous).

### Dependencies
- US-CN-004 dispatcher.

### Tags
`whatsapp` · `trigger` · `reminder_1h` · `cron`

### Notes / Rationale
The 50-70 min window centres the 60-min mark with margin for clock skew and exactly-1h bookings.

---

## US-CN-006 — Trigger: Post-session thank-you + review request

### Story
As a customer whose session has just ended,
I want to receive a thank-you WhatsApp 30 minutes after the slot end with a deep link to leave a review,
So that I can rate the session while the experience is fresh, without re-signing in.

### Priority: P1
### Status: Draft
### Estimate: 5
### Sprint: Sprint 2 — Booking + Notifications

### Actors
- **Primary actor:** Customer with an attended booking.
- **System actor:** Cron sweep; dispatcher; magic-token issuer.

### Preconditions
1. Booking `status='attended'` (set by coach in US-CO-005, File 08, or admin US-AD-010).
2. `slot.end_at + 30m` is now or in the past.
3. No existing `post_session_review` dispatch for the booking.

### Postconditions
1. A WhatsApp with a magic deep link is sent; valid 14 days.
2. The deep link target is `/account/reviews/new/ROW-2026-0412?token=<signed>`.

### Main Flow (Happy Path)
1. Cron `*/5 * * * *` selects bookings where `status='attended'`, `slot.end_at + 30m in [now()-5m, now()]`, and no prior `post_session_review` dispatch.
2. Magic token is signed (`{booking_id, exp}`) and stored in `magic_tokens` table.
3. `enqueueTrigger('post_session_review', booking_id, customer_id)` with `params.deep_link`.
4. Dispatcher sends `aqualudo_post_session_review_v1` with `{customer_name, activity, deep_link}`.
5. Customer taps link → magic-token-exchange middleware → `/account/reviews/new/...` authenticated via the token.

### Alternate Flows

#### A1 — Customer had a no-show booking
1. Cron query filters by `status='attended'` only; no-show bookings never receive this trigger.

### Exception Flows

#### E1 — Magic-token reuse or tamper
1. The exchange middleware rejects; surfaces "Link expired, sign in to leave a review".

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Post-session review request

  Scenario: Attended booking sends the trigger 30 min after slot end
    Given an attended booking "ROW-2026-0412" that ended 30 minutes ago
    When the cron runs
    Then a post_session_review dispatch is created with a magic-token-backed deep link
      And the customer receives the WhatsApp with the link

  Scenario: Opted-out customer does not receive the request
    Given notification_preferences.enabled=false for trigger="post_session_review"
    When the cron runs
    Then no Meta API call is made
```

### Edge Cases
1. Group booking 3 attended — each member gets the trigger individually (each row has their booking id tied to their profile).
2. Booking cancelled after the slot end-raced attendance update — `status` resets to `cancelled_late`; the query filter prevents firing.

### UI/UX Specifications
- The review page renders the booking summary and a star + body form (US-CA-016).

### Data Model
Reads `bookings` + `slots`; writes `whatsapp_dispatch_jobs`, `whatsapp_messages`. Magic tokens live in:

```sql
magic_tokens
  id           uuid pk default gen_random_uuid()
  user_id      uuid not null references auth.users(id) on delete cascade
  purpose      text not null check (purpose in ('review','waitlist_claim'))
  ref_id       uuid not null                      -- booking_id or waitlist_offer_id
  token_hash   text not null unique              -- sha256(raw)
  expires_at   timestamptz not null
  consumed_at  timestamptz
  created_at   timestamptz not null default now()
  index on (token_hash)
  -- RLS: service role only; customer indirect via exchange middleware
```

### API Endpoints
- `POST /api/whatsapp/dispatcher/run`.
- `GET /api/magic-token/verify?t=<token>&ref=<ref_id>&purpose=<purpose>`.

### Security Considerations
- Token is random 256-bit; hashed before storage; raw never logged.
- The deep link uses HTTPS; tokens consumed on first use.

### Performance Requirements
- Cron p95 < 3 s; token issue p95 < 200 ms.

### Notifications
- Self-referential.

### Localization
- Template `aqualudo_post_session_review_v1` EN: `Thanks {{1}} for booking {{2}} with AquaLudo. How was it? Tap to leave a 5-star review: {{3}}`.
- AR: `شكرًا {{1}} على حجز {{2}} مع أكوالودو. كيف كانت؟ اضغط لتقييم بخمس نجوم: {{3}}`.

### Error Handling
- `magic_token_failed` → fallback to "Sign in and find your booking on /account/bookings".

### Logging & Analytics
- `whatsapp.dispatch.post_session_review.issued` `{ booking_id, magic_token_id }`.
- `whatsapp.dispatch.post_session_review.clicked` `{ token_id }`.

### Testing Notes
- Unit: token sign + verify round-trip.
- Integration: cron → exchange → review submit.

### Related User Stories
- US-CA-016 (File 04) leaves the review.
- US-CO-005 (File 08) coach attendance sets status='attended'; the cooldown is "within 1h-after-slot" per the handoff.

### Dependencies
- US-CN-001/002; cron.

### Tags
`whatsapp` · `trigger` · `post_session` · `reviews` · `magic-token`

### Notes / Rationale
A 30-min-after-slot delay avoids the recovery period for the customer and lands in the user's "I am home, relaxed" window — improving review completion rates.

---

## US-CN-007 — Trigger: Waitlist slot opened (admin manual pick, 15-min claim window)

### Story
As a customer chosen by admin from the waitlist to fill a freed slot,
I want to receive a WhatsApp offering the slot with a 15-minute claim window and pay-link,
So that I can confirm before the slot returns to public availability.

### Priority: P0
### Status: Draft
### Estimate: 8
### Sprint: Sprint 2 — Booking + Notifications

### Actors
- **Primary actor:** Customer on the waitlist for an activity.
- **Secondary actor:** Admin (US-AD-008 in File 07) who manually picks the customer.
- **System actor:** Dispatcher; `waitlist_offers` table owned by File 07; `magic_tokens`.

### Preconditions
1. Admin in `/admin/bookings/[id]` clicked "Pick from waitlist" and selected one `waitlist_subscriptions` row (US-AD-008).
2. A `waitlist_offers` row exists with `claimed_until = now() + 15m`.
3. Templates `aqualudo_waitlist_offer_v1` EN/AR approved.

### Postconditions
1. The customer receives a WhatsApp with the slot details and a pay-link.
2. Magic-token `purpose='waitlist_claim'` and `expires_at = claimed_until`.
3. If the customer does not claim within 15 minutes, the offer expires; the admin may pick another (US-AD-008) or the slot is returned to availability.

### Main Flow (Happy Path)
1. Admin submits the waitlist pick. The File 07 Route Handler creates the `waitlist_offers` row, issues a magic token, and calls `enqueueTrigger('waitlist_slot_opened', waitlist_offer_id, customer_id)` with `params={activity, slot, pay_link, expires_in_minutes}`.
2. Dispatcher sends `aqualudo_waitlist_offer_v1` EN/AR with the params.
3. Customer taps the pay-link; lands at `/booking/claim/<token>` which prefills the booking funnel with the offered slot.
4. Customer completes payment via Paymob (US-BF-013). On capture, the dispatcher enqueues `booking_confirmed` (US-CN-003). The `waitlist_offers.status` flips to `fulfilled` and the original cancelled booking's slot capacity is restored atomically.

### Alternate Flows

#### A1 — Customer declines by not acting
1. After 15 minutes the `waitlist_offers.status='expired'` (cron updates expired offers).
2. Admin is notified to pick another; original waitlist subscriber remains `active` so admin can re-pick in future.

### Exception Flows

#### E1 — Customer wants to decline explicitly
1. Customer taps a "I can't make it" link in the message (also magic-token-signed); offer `status='declined'`; admin notified.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Waitlist slot opened

  Scenario: Admin picks a waitlist member and the customer receives the offer
    Given admin picks Salma Akl from the rowing waitlist for a slot 3 days away
    When the pick is submitted
    Then a waitlist_offers row exists with claimed_until = now + 15 minutes
      And a magic-token for purpose="waitlist_claim" exists
      And Salma receives the waitlist_slot_opened WhatsApp within 60 seconds

  Scenario: Customer claims within 15 minutes
    Given Salma taps the pay-link within 14 minutes
    When she completes payment via Paymob
    Then a new booking is created with the offered slot
      And waitlist_offers.status becomes "fulfilled"

  Scenario: Customer does not act — offer expires
    Given the claimed_until deadline passes
    When the cron sweeps expired offers
    Then the offer status becomes "expired"
      And admin is notified to pick another
```

### Edge Cases
1. Customer is offered the slot but already has a booking for that exact time — the claim page surfaces a conflict; customer can decline; slot reverts.
2. Customer opts out of WhatsApp mid-offer — dispatcher already sent; if customer claims the pay-link the system honours anyway.

### UI/UX Specifications
- The offer message shows a countdown 15:00 in the message text. The landing page renders a live countdown matching the token's `expires_at`.

### Data Model
Reads `waitlist_subscriptions` (File 04) and `waitlist_offers` (File 07). Writes `whatsapp_dispatch_jobs` + `whatsapp_messages` + `magic_tokens`.

### API Endpoints
- `POST /api/admin/bookings/[id]/waitlist-offer/pick` (File 07) → enqueueTrigger.
- `GET /api/magic-token/verify` with `purpose=waitlist_claim`.
- `POST /booking/claim` (File 03).

### Security Considerations
- Magic token single-use; expired tokens refused.
- Pay-link target cannot be tampered (signed URL binding offer_id).

### Performance Requirements
- Admin pick → Customer WhatsApp p95 < 60 s.

### Notifications
- Self-referential. Admin also receives a follow-up when the offer expires (US-CN-010 admin trigger variant).

### Localization
- Template `aqualudo_waitlist_offer_v1` EN: `Hi {{1}}, a Rowing slot just opened on {{2}} at {{3}}.\nYou have 15 minutes to claim it. Tap to book: {{4}}\n— AquaLudo`.
- AR similar.

### Error Handling
- `waitlist_offer_expired` → "This slot was offered to someone else. Stay on the waitlist for the next opening."
- `waitlist_offer_already_fulfilled` → "Already booked. Enjoy your session!"

### Logging & Analytics
- `whatsapp.dispatch.waitlist_slot_opened.sent` `{ offer_id }`.
- `waitlist.offer.claimed` / `.expired` / `.declined`.

### Testing Notes
- E2E: simulate admin pick → customer claim → booking created.

### Related User Stories
- US-AD-008 (File 07) the waitlist pick centerpiece.
- US-BF-014/015 (File 03) booking confirmation after claim.
- US-CA-017 (File 04) customer waitlist subscription.

### Dependencies
- File 07 waitlist_offers; magic-token service.

### Tags
`whatsapp` · `trigger` · `waitlist` · `15min_claim` · `admin-pick`

### Notes / Rationale
The 15-minute window enforces user's intent ("admin manually picks the next person from waitlist") and reverts gracefully without long hold periods when the customer does not act.

---

## US-CN-008 — Trigger: Admin — new contact message received

### Story
As an AquaLudo admin,
I want to receive a WhatsApp notification when a new message arrives via the public Contact page,
So that I never miss a sales enquiry for longer than a few minutes.

### Priority: P1
### Status: Draft
### Estimate: 3
### Sprint: Sprint 2 — Booking + Notifications

### Actors
- **Primary actor:** Anonymous visitor on `/contact`.
- **Secondary actor:** Admin (any of the admin role users).

### Preconditions
1. The Contact form (US-LD-012 in File 01) submission lands in `contact_messages` (owned by File 01).
2. Admin's `notification_preferences` for `admin_contact_message` has `enabled=true`.

### Postconditions
1. Each admin with the trigger enabled receives a WhatsApp with the contact message summary.

### Main Flow
1. Visitor submits `/contact` form.
2. File 01 Route Handler inserts the message row and calls `enqueueTrigger('admin_contact_message', message_id, admin_id)` for each active admin.
3. Dispatcher sends template `aqualudo_admin_contact_v1` with `{sender_name, sender_contact, short_subject, admin_link}`.
4. Admin taps link → `/admin/messages/<message_id>` to reply.

### Alternate Flows

#### A1 — Multiple admins on duty
1. Each admin gets a copy; dedup via `(trigger, ref_id, language, recipient)` unique constraint.

### Exception Flows

#### E1 — No admin opted in
1. Dispatcher logs `no_admin_recipient` warning; admin surfaced daily digest catch.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Admin new contact message trigger

  Scenario: Contact form fires admin_contact_message
    Given an admin with notification_preferences trigger="admin_contact_message" enabled=true
    When a visitor submits the /contact form
    Then the admin receives a WhatsApp with the sender name and subject within 60s
```

### Edge Cases
1. Visitor is a returning customer who is signed in — Customer tab includes their profile link in the admin inbox row.

### UI/UX Specifications
- Admin `/admin/messages` shows the inbound.

### Data Model
Reads `contact_messages` (File 01). Writes `whatsapp_dispatch_jobs` + `whatsapp_messages`.

### API Endpoints
- File 01 `POST /api/contact` → enqueueTrigger.

### Security Considerations
- The admin notification does not include the visitor's free-text body; just a subject. The full body lives in `/admin/messages`.

### Performance Requirements
- p95 < 60s.

### Notifications
- Self-referential.

### Localization
- Template `aqualudo_admin_contact_v1` EN body: `New contact message from {{1}} ({{2}}). Subject: {{3}}. Review: {{4}}`.

### Error Handling
- `no_admin_recipient` 200 (silent skip).

### Logging & Analytics
- `whatsapp.dispatch.admin_contact_message.sent`.

### Testing Notes
- Unit: dedup unique constraint.

### Related User Stories
- US-LD-012 (File 01) contact page.

### Dependencies
- US-CN-001 connection.

### Tags
`whatsapp` · `trigger` · `admin_contact_message`

### Notes / Rationale
Admin's WhatsApp is the closest thing AquaLudo has to a CRM in v1; routing contact enquiries to the admin's phone keeps response times short.

---

## US-CN-009 — Trigger: Admin — new booking received

### Story
As an admin,
I want to receive a WhatsApp when any new booking is confirmed,
So that the academy can plan staffing if a wave of bookings lands.

### Priority: P2
### Status: Draft
### Estimate: 2
### Sprint: Sprint 3 — Polish

### Actors
- **Primary actor:** Customer booking.
- **Secondary actor:** Admin (optional opt-in).

### Preconditions
1. Admin's `preferences.admin_new_booking.enabled=true`.

### Postconditions
1. Admin receives a brief WhatsApp per confirmed booking.
2. Telemetry.

### Main Flow
1. `enqueueTrigger('admin_new_booking', booking_id, admin_id)` from US-BF-014 (File 03) confirmation flow.
2. Dispatcher sends template `aqualudo_admin_new_booking_v1` with `{booking_id, customer_name, activity, time, party_size, payment_method}`.

### Alternate Flows

#### A1 — Admin batched digest enabled instead
1. Admin can choose between per-booking and a daily 8pm digest in their preferences.
2. If digest chosen, the dispatcher accumulates into a `whatsapp_dispatch_jobs.meta.bookings[]` JSONB array and dispatches once per day.

### Exception Flows

#### E1 — Admin opted out
1. Dispatch job recorded as `failed` with `last_error='opted_out'`.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Admin new booking trigger

  Scenario: Per-booking trigger fires
    Given admin preferences admin_new_booking enabled=true and digest=false
    When a booking is confirmed
    Then the admin receives a WhatsApp within 30 seconds

  Scenario: Daily digest rolls up to 8pm
    Given admin preferences digest=true
    When 30 bookings confirm during the day
    Then a single digest WhatsApp is sent at 20:00 listing all 30 ids
```

### Edge Cases
1. Admin pool has 3 admins; each gets a copy (dedup via unique constraint).

### UI/UX Specifications
- Admin preferences page toggles per-trigger and digest.

### Data Model
Reads `bookings`. Writes `whatsapp_dispatch_jobs`, `whatsapp_messages`.

### API Endpoints
- File 03 enqueue helper; `POST /api/whatsapp/dispatcher/run` for digest cron.

### Security Considerations
- Customer PII in the admin's message is scoped to admins only.

### Performance Requirements
- p95 < 30s per booking.

### Notifications
- Self.

### Localization
- Template `aqualudo_admin_new_booking_v1` EN body: `New booking {{1}} for {{2}} ({{3}}) on {{4}} by party {{5}} via {{6}}`.

### Error Handling
- `no_admin_recipient` silent skip.

### Logging & Analytics
- `whatsapp.dispatch.admin_new_booking.sent`.

### Testing Notes
- Integration with booking confirmation.

### Related User Stories
- US-BF-014 (File 03).

### Dependencies
- US-CN-001.

### Tags
`whatsapp` · `trigger` · `admin_new_booking`

### Notes / Rationale
Default off because not every admin wants per-booking noise; useful for launch weeks when traffic spikes are unpredictable.

---

## US-CN-010 — Trigger: Admin — cancellation received

### Story
As an admin,
I want to receive a WhatsApp when a customer cancels a booking,
So that I know there's a free slot and may pick a waitlist member to fill it.

### Priority: P1
### Status: Draft
### Estimate: 3
### Sprint: Sprint 2 — Booking + Notifications

### Actors
- **Primary actor:** Customer self-cancel (US-CA-012 in File 04).
- **Secondary actor:** Admin.

### Preconditions
1. Admin preferences `admin_new_cancellation.enabled=true`.

### Postconditions
1. Admin receives a WhatsApp with the cancelled booking summary, count of waitlist subscribers for the activity, and a deep link to the waitlist-offer pick modal.

### Main Flow
1. File 04 cancel Route Handler calls `enqueueTrigger('admin_new_cancellation', booking_id, admin_id)`.
2. Dispatcher sends template `aqualudo_admin_new_cancellation_v1` with `{booking_id, activity, time, waitlist_count, pick_link}`.

### Alternate Flows

#### A1 — No waitlist subscribers
1. `waitlist_count=0`; the pick link still opens but slides "no eligible waitlist members" empty state.

### Exception Flows

#### E1 — Admin opted out
1. Silent skip.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Admin cancellation received trigger

  Scenario: Customer cancels triggers admin notification with waitlist count
    Given a booking with 3 active waitlist subscribers for its activity
    When the customer cancels Salma's booking "ROW-2026-0412"
    Then the admin receives a WhatsApp with waitlist_count=3
      And the message includes a deep link to the admin waitlist-pick modal
```

### Edge Cases
1. Admin cancelled directly (US-AD-006 in File 07) — same trigger fires.

### UI/UX Specifications
- The pick modal lives at `/admin/bookings/[id]/reassign` (File 07).

### Data Model
Reads `bookings`, `waitlist_subscriptions` (File 04), `waitlist_offers` (File 07).

### API Endpoints
- File 04/07 cancel handler → enqueueTrigger.

### Security Considerations
- Admin role only on the pick-link target.

### Performance Requirements
- p95 < 60s.

### Notifications
- Self.

### Localization
- Template `aqualudo_admin_new_cancellation_v1` EN body: `Booking {{1}} cancelled for {{2}} on {{3}}.\n{{4}} waitlist members available. Pick one: {{5}}`.

### Error Handling
- `no_admin_recipient` silent skip.

### Logging & Analytics
- `whatsapp.dispatch.admin_new_cancellation.sent` `{ waitlist_count }`.

### Testing Notes
- Integration with cancel flow.

### Related User Stories
- US-CA-012 (File 04), US-AD-006 (File 07), US-AD-008 (File 07).

### Dependencies
- File 07 waitlist pick surface.

### Tags
`whatsapp` · `trigger` · `admin_new_cancellation` · `waitlist`

### Notes / Rationale
Pairing cancellation with the waitlist count in the same message saves the admin one click — the immediate question "is there anyone waiting" is answered on the phone screen.

---

## US-CN-011 — Coach — new session assigned

### Story
As a coach,
I want to receive a WhatsApp when a new booking is assigned to me,
So that I can prepare equipment and arrive early if needed.

### Priority: P1
### Status: Draft
### Estimate: 3
### Sprint: Sprint 3 — Coach surface

### Actors
- **Primary actor:** Coach (`profiles.role='coach'`).
- **System actor:** File 08 `coach_session_assignments` write.

### Preconditions
1. A `coach_session_assignments` row inserted (admin assignment or auto-assignment from booking flow).

### Postconditions
1. The coach receives a WhatsApp with the upcoming session summary.

### Main Flow
1. File 08 assignment Route Handler calls `enqueueTrigger('coach_new_assignment', assignment_id, coach_id)`.
2. Dispatcher sends template `aqualudo_coach_new_assignment_v1` with `{coach_name, activity, time, customer_name, party_size}`.

### Alternate Flows

#### A1 — Coach updated preferences to opt out
1. Dispatcher skips.

### Exception Flows

#### E1 — Coach phone missing
1. Dispatcher logs `coach_phone_missing`; admin alert.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Coach new session assignment

  Scenario: New assignment notifies the coach
    Given a coach "ahmed-z" with notification_preferences.coach_new_assignment enabled
    When a booking is assigned to him
    Then Ahmed receives a WhatsApp with the activity and time within 60s
```

### Edge Cases
1. Booking reassigned from coach A to coach B — both receive a WhatsApp (coach A receives "unassigned" sub-template; coach B "assigned").

### UI/UX Specifications
- The coach panel inbox (US-CO-007, File 08) also shows it.

### Data Model
Reads `coach_session_assignments` (File 08) + `bookings` + `profiles`.

### API Endpoints
- File 08 assignment handler → enqueueTrigger.

### Security Considerations
- Coach phone never surfaces in customer-facing UI.

### Performance Requirements
- p95 < 60s.

### Notifications
- Self.

### Localization
- Template `aqualudo_coach_new_assignment_v1` EN/AR.

### Error Handling
- `coach_phone_missing` 422 admin alert.

### Logging & Analytics
- `whatsapp.dispatch.coach_new_assignment.sent`.

### Testing Notes
- Integration with assignment flow.

### Related User Stories
- US-CO-001 (File 08) coach dashboard.

### Dependencies
- US-CN-001.

### Tags
`whatsapp` · `trigger` · `coach_new_assignment`

### Notes / Rationale
Coaches are field users; WhatsApp is the only useful channel. They have no email workflow.

---

## US-CN-012 — Trigger: Coach — customer replied in chat

### Story
As a coach who has messaged a customer,
I want to receive a WhatsApp when the customer replies in the same chat thread,
So that I can continue the conversation promptly.

### Priority: P2
### Status: Draft
### Estimate: 3
### Sprint: Sprint 3 — Coach surface

### Actors
- **Primary actor:** Customer.
- **Secondary actor:** Coach.

### Preconditions
1. A `customer_messages` row exists for the (coach, customer) pair signifying an existing thread.

### Postconditions
1. The coach receives a WhatsApp with the inbound text excerpt.
2. The coach's inbox (US-CO-007, File 08) gets a new unread row.

### Main Flow
1. Customer's inbound text on WhatsApp (US-CN-015) is routed to the active coach thread (most-recently-outbound coach on the customer's thread, otherwise the assigned coach on the next upcoming booking).
2. `enqueueTrigger('coach_customer_reply', inbound_id, coach_id)`.
3. Dispatcher sends `aqualudo_coach_customer_reply_v1` with `{customer_name, excerpt, deep_link}`.

### Alternate Flows

#### A1 — Multiple coaches have messaged this customer
1. Cron picks the most recently outbound coach; others see it next time they open the inbox.

### Exception Flows

#### E1 — Coach opted out / off-duty
1. Dispatcher marks `failed`, last_error=`opted_out`.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Coach customer reply trigger

  Scenario: Customer replies, coach notified
    Given Salma Akl wrote back to her coach "ahmed-z" in the WhatsApp chat
    When the inbound lands
    Then Ahmed receives a WhatsApp with the customer's name and the message excerpt
```

### Edge Cases
1. Customer writes back after a >24h silence (since coach's last outbound) — Meta's customer service window for that customer is closed; the inbound reopens it normally, so the dispatcher uses templates (free-text not needed).

### UI/UX Specifications
- The coach's inbox unreads increment; a 1-line preview replaces the previous preview.

### Data Model
Reads `customer_messages` + `whatsapp_messages`. Writes `whatsapp_dispatch_jobs` + `whatsapp_messages`.

### API Endpoints
- US-CN-015 inbound handler → enqueueTrigger.

### Security Considerations
- The coach's WhatsApp only sees an excerpt; full body in `/coach/inbox/<thread_id>`.

### Performance Requirements
- p95 < 30s.

### Notifications
- Self.

### Localization
- Template `aqualudo_coach_customer_reply_v1` EN/AR.

### Error Handling
- `no_coach_assigned` 200 silent skip.

### Logging & Analytics
- `whatsapp.dispatch.coach_customer_reply.sent`.

### Testing Notes
- Integration with inbound handler.

### Related User Stories
- US-CN-015 inbound; US-CO-007 inbox (File 08).

### Dependencies
- US-CN-001.

### Tags
`whatsapp` · `trigger` · `coach_customer_reply`

### Notes / Rationale
Replying in the WhatsApp client (rather than the in-app inbox) keeps coach response latency low.

---

## US-CN-013 — Trigger: Coach — daily 7am digest of today's sessions (cron)

### Story
As a coach,
I want a single WhatsApp at 7am every day summarising my sessions for that day,
So that I can plan my day in one tap without scanning the app.

### Priority: P1
### Status: Draft
### Estimate: 3
### Sprint: Sprint 3 — Coach surface

### Actors
- **Primary actor:** Coach.
- **System actor:** Vercel Cron at 7am.

### Preconditions
1. Coach preferences `coach_daily_digest.enabled=true`.
2. Coach has at least 1 confirmed booking today.

### Postconditions
1. A `whatsapp_dispatch_jobs` row with `trigger='coach_daily_digest'` is created once per coach per day.

### Main Flow
1. Vercel Cron at `0 7 * * *` calls `POST /api/whatsapp/dispatcher/run?type=daily_digest`.
2. Cron query selects coaches with sessions today and no existing digest job.
3. For each coach, `enqueueTrigger('coach_daily_digest', today_yyyymmdd, coach_id)` with `params.sessions[]`.
4. Dispatcher sends `aqualudo_coach_daily_digest_v1` with `{coach_name, sessions_count, sessions_summary}` where `sessions_summary` is a bullet list per session.

### Alternate Flows

#### A1 — Coach has no sessions
1. No dispatch job created.
2. Optional coach-empty-mode message — turned off by default.

### Exception Flows

#### E1 — Coach opted out
1. No dispatch.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Coach daily digest

  Scenario: Coach with 3 sessions today receives digest at 7am
    Given coach "ahmed-z" has 3 confirmed bookings today
    When the 7am cron runs
    Then Ahmed receives a single WhatsApp listing the 3 sessions with customer names and times

  Scenario: Idempotent per coach per day
    Given a coach_daily_digest dispatch already exists for Ahmed today
    When the cron runs again
    Then no duplicate is sent
```

### Edge Cases
1. Multiple time zones (none in Egypt, but bé Canton timezone fixed to Africa/Cairo).

### UI/UX Specifications
- N/A.

### Data Model
Reads `bookings` + `coach_session_assignments`. The digest uniqueness key is `trigger='coach_daily_digest'` AND `ref_id = make_date(year, month, day)` AND `coach_id`.

### API Endpoints
- `POST /api/whatsapp/dispatcher/run?type=daily_digest` (Vercel-Cron secret).

### Security Considerations
- Customer names in coach digest; RLS ensures only the coach receives it.

### Performance Requirements
- Cron iteration p95 < 5 s for up to 50 coaches.

### Notifications
- Self.

### Localization
- Template `aqualudo_coach_daily_digest_v1` EN: `Good morning {{1}}. You have {{2}} sessions today:{{3}}\n— AquaLudo`.
- AR with Arabic-Indic times.

### Error Handling
- `no_sessions_today` silent skip per coach.

### Logging & Analytics
- `whatsapp.cron.coach_daily_digest.run` `{ coaches_sent_to }`.

### Testing Notes
- Unit: build summary helper.

### Related User Stories
- US-CO-013 (File 08) coach setting to mute this digest.

### Dependencies
- US-CN-001.

### Tags
`whatsapp` · `trigger` · `coach_daily_digest` · `cron`

### Notes / Rationale
7am precedes the earliest AquaLudo slot (typically 7:30am) so the coach arrives informed.

---

## US-CN-014 — Customer notification preferences (per-trigger opt-out via UI + WhatsApp keywords)

### Story
As a customer,
I want to opt in or out of individual WhatsApp triggers via either the `Notifications` page on the website, or by texting keywords like "STOP reminders" on WhatsApp,
So that preferences change with low friction and stay consistent across both interfaces.

### Priority: P0
### Status: Draft
### Estimate: 3
### Sprint: Sprint 2 — Booking + Notifications

### Actors
- **Primary actor:** Customer.
- **System actor:** File 04 `notification_preferences` table (owned by File 04) — referenced; US-CN-020 inbound keywords handler modifies it.

### Preconditions
1. Customer has a `profiles` row.
2. Default preferences seeded at signup: all triggers `enabled=true`.

### Postconditions
1. Each preference update is reflected in `whatsapp_conversations.status` (when STOP all) or `notification_preferences.enabled` (per trigger).

### Main Flow (UI path)
1. Customer opens `/account/notifications` (File 04 US-CA-018).
2. Toggles per trigger.
3. PATCH persists.
4. Telemetry.

### Main Flow (WhatsApp keyword path)
1. Customer texts "REMINDERS OFF" to the business number.
2. US-CN-020 keyword handler parses and updates `notification_preferences` for `reminder_24h` and `reminder_1h`.
3. Customer receives an acknowledgment template.

### Alternate Flows

#### A1 — STOP all keyword
1. `whatsapp_conversations.status='opted_out'`; all future dispatch jobs for this customer short-circuit.

### Exception Flows

#### E1 — Booking confirmed locked trigger ignores opt-out
1. Even if customer texts "BOOKING CONFIRMED OFF", the handler responds "This confirmation is system-critical and cannot be turned off".

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Notification preferences consistency

  Scenario: STOP all
    Given a customer texts "STOP" to the business number
    When the keyword handler parses
    Then whatsapp_conversations.status becomes "opted_out"
      And notification_preferences.enabled=false for all the customer's triggers
      And the customer receives an acknowledgment

  Scenario: START restores
    Given an opted-out customer
    When she texts "START"
    Then whatsapp_conversations.status becomes "active"
      And notification_preferences.enabled=true for all (except those she had disabled individually before STOP)

  Scenario: Per-trigger opt via web
    Given a signed-in customer on /account/notifications
    When she toggles "post_session_review" off
    Then the dispatcher will skip her for that trigger on next emission
```

### Edge Cases
1. Customer's per-trigger opt-out state is preserved across STOP/START — STOP turns off all; START restores previous individual preferences.

### UI/UX Specifications
- File 04 owns the UI page (US-CA-018); here only the keyword mail-back is described.

### Data Model
Touches `notification_preferences` (File 04) and `whatsapp_conversations`:

```sql
whatsapp_conversations
  id                   uuid pk default gen_random_uuid()
  customer_id          uuid not null references auth.users(id) on delete cascade
  status               text not null check (status in ('active','opted_out')) default 'active'
  last_inbound_at      timestamptz
  last_outbound_at     timestamptz
  opt_in_method        text check (opt_in_method in ('whatsapp_reply','customer_signup','admin_import')) default 'customer_signup'
  created_at           timestamptz not null default now()
  index on (customer_id)
  unique (customer_id, business_phone)
  -- RLS: owner SELECT; service role + admin INSERT/UPDATE
```

### API Endpoints
- US-CN-020 inbound keyword handler writes via service role.

### Security Considerations
- STOP is reversible via START; the explicit consent flavour ensures compliance with Meta's marketing rules.

### Performance Requirements
- Keyword reflection p95 < 5s (real-time).

### Notifications
- Self.

### Localization
- Keywords accept EN and Arabic: `إيقاف`, `تشغيل`, `تذكير إيقاف`. The handler accepts both.

### Error Handling
- `unknown_keyword` 200 with "Sorry, I didn't catch that. Reply BOOK to see options".

### Logging & Analytics
- `notifications.keyword.stopped` `{ customer_id }`.

### Testing Notes
- E2E: STOP → START → per-trigger check.

### Related User Stories
- US-CA-018 (File 04) UI preferences page.
- US-CN-020 keywords.

### Dependencies
- File 04 preferences table.

### Tags
`whatsapp` · `preferences` · `keywords` · `opt_out`

### Notes / Rationale
Two paths to the same end-state — web UI for the planning customer, WhatsApp keywords for the in-the-moment customer.

---

## US-CN-015 — Inbound message handling + chat threading

### Story
As a customer who texts the AquaLudo WhatsApp number about her booking,
I want my message to appear as a thread in the admin and coach inbox immediately,
So that AquaLudo staff can reply via either the app's `/admin/messages` or `/coach/inbox`, or directly from their WhatsApp client.

### Priority: P0
### Status: Draft
### Estimate: 8
### Sprint: Sprint 2 — Booking + Notifications

### Actors
- **Primary actor:** Customer.
- **Secondary actor:** Admin and assigned coach.
- **System actor:** `/api/whatsapp/webhook` POST route.

### Preconditions
1. Webhook verified with Meta and able to receive `messages` events.
2. Customer's phone is linked to exactly one `profiles` row.

### Postconditions
1. A `customer_messages` row is inserted with `direction='inbound'`.
2. A `whatsapp_messages` row is inserted with `direction='inbound'` and the inbound wam id.
3. The most appropriate coach or admin sees an unread badge increment.
4. If a keyword, US-CN-020 routes the message instead.

### Main Flow (Happy Path)
1. Customer sends WhatsApp text to `+201011329642`.
2. Meta posts `POST /api/whatsapp/webhook` with `entry[0].changes[0].value.messages[0]`.
3. Server verifies `X-Hub-Signature-256`.
4. Server normalises the phone (E.164) and looks up the `profiles` row.
5. If found:
   a. Insert `whatsapp_messages` row (direction='inbound', body text).
   b. Insert or update `whatsapp_conversations.last_inbound_at=now()`.
   c. If body is a keyword, route to US-CN-020.
   d. Otherwise insert `customer_messages` row linking the active coach/admin thread.
6. Enqueue `coach_customer_reply` trigger (US-CN-012) if a coach thread is active.
7. Admin inbox unreads increment (optional flag based on routing).

### Alternate Flows

#### A1 — Unknown customer (no profile for the phone)
1. Server creates a "ghost" inbox thread tagged with phone only; admin can convert to a customer via the user screen.
2. The inbound is logged for telemetry.

### Exception Flows

#### E1 — Signature verification fails
1. Server returns 401 and discards.

#### E2 — Customer sends unsupported media type
1. Stored with `attachments=[{type:'UNSUPPORTED'}]`; admin sees a placeholder.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Inbound message handling

  Scenario: Inbound text creates a thread row
    Given Salma Akl texts "Can I bring a friend?" to +201011329642
    When Meta posts the webhook
    Then whatsapp_messages has a direction="inbound" row
      And a customer_messages row links this inbound to her active coach thread
      And the coach receives coach_customer_reply within 30 seconds

  Scenario: Unknown sender creates a ghost thread
    Given a phone not in profiles texts the business number
    When the webhook posts
    Then a customer_messages row is inserted with customer_id=null and an admin-url friendly tag
      And no coach_customer_reply trigger fires

  Scenario: Invalid signature rejected
    Given a webhook with a tampered X-Hub-Signature-256
    When the server checks
    Then it returns 401 and no rows are written
```

### Edge Cases
1. Customer sends media (image / audio / document) — attachments stored in Supabase Storage; `customer_messages.attachments=[{type, url, mime_type, size}]`.
2. Customer sends a video — message stored but auto-thumbnail via Storage transform.
3. Customer sends a sticker — admin sees "[sticker]".

### UI/UX Specifications
- Admin inbox on `/admin/messages`; coach inbox on `/coach/inbox`; both show inbound threads.

### Data Model

```sql
customer_messages
  id              uuid pk default gen_random_uuid()
  customer_id     uuid references auth.users(id) on delete set null    -- null for ghost inbound
  admin_id        uuid references auth.users(id) on delete cascade
  coach_id        uuid references auth.users(id) on delete cascade
  direction       text not null check (direction in ('outbound','inbound'))
  channel         text not null check (channel = 'whatsapp') default 'whatsapp'
  body            text
  attachments     jsonb                          -- [{ type, url, mime_type, size }]
  template_id     uuid references whatsapp_templates(id)
  wa_message_id   text                           -- Meta id inbound OR outbound
  created_at      timestamptz not null default now()
  index on (customer_id, created_at desc)
  index on (coach_id, created_at desc) where coach_id is not null
  index on (admin_id, created_at desc) where admin_id is not null
  -- RLS: customer SELECT own rows (bidirectional);
  --      coach SELECT rows where coach_id = me OR (customer_id in my upcoming-booked customers)
  --      admin SELECT all; service role INSERT for inbound
```

### API Endpoints
- `POST /api/whatsapp/webhook` (Meta).
- `GET /api/admin/messages` and `GET /api/coach/inbox` (consumers).

### Security Considerations
- Signature verification is THE gate; everything after a verified signature is trusted.
- Customer-facing text never includes admin escalations.
- Attachments scanned via ClamAV in Supabase Storage (per File 10 US-IN-006).

### Performance Requirements
- Webhook handler p95 < 500ms (write only, no outbound blocks).
- Coach reply trigger async via dispatch queue.

### Notifications
- US-CN-012 surfaces to the coach.

### Localization
- Customer's inbound language is inferred from the message's detected language or the profile locale.

### Error Handling
- `signature_invalid` 401.
- `sender_phone_unparsable` 422 (logged + ignored).

### Logging & Analytics
- `whatsapp.inbound.received` `{ customer_id_known:bool, has_attachment:bool }`.

### Testing Notes
- Unit: signature verify.
- Integration: simulate Meta webhook payload.

### Related User Stories
- US-CN-017 delivery receipts.
- US-AD-013 (File 07) admin thread surface.
- US-CO-007 (File 08) coach inbox.

### Dependencies
- Meta webhook subscription (US-CN-001).

### Tags
`whatsapp` · `inbound` · `webhook` · `signature` · `threads`

### Notes / Rationale
Threads centralise admin/coach replying; the customer always stays in WhatsApp. This is the single most-used surface during operational hours.

---

## US-CN-016 — Failed message retry queue (30s, 2m, 10m, 1h; abandon after 24h)

### Story
As the platform,
I want the dispatcher to retry failed Meta sends with exponential backoff, and to abandon a job after 24h of unrecoverable failure,
So that transient Meta issues do not silently lose notifications while long-stuck jobs don't accumulate forever.

### Priority: P0
### Status: Draft
### Estimate: 5
### Sprint: Sprint 2 — Booking + Notifications

### Actors
- **Primary actor:** Dispatcher (Postgres `pg_listen` + Edge Function).
- **System actor:** Vercel Cron at `*/5 * * * *`.

### Preconditions
1. A `whatsapp_dispatch_jobs` row exists with `status='failed'` and `attempt_count < 4`.

### Postconditions
1. The job is retried; on success transitions to `succeeded`; on exhaustion transitions to `abandoned`.

### Main Flow (Happy Path)
1. After a failed send, the dispatcher sets `status='failed'`, increments `attempt_count` by 1, and `next_attempt_at = now() + backoff(attempt_count)` where `backoff = 30s, 2m, 10m, 1h` for attempts 1-4.
2. A `*/5 * * * *` cron selects failed jobs with `next_attempt_at <= now()` and `attempt_count < 4` and `status='failed'`; sets them to `pending` again so the listener picks them up.
3. After 4 attempts (total elapsed ~1h 12m 30s), if still failing, the job remains `failed` but no more retries.
4. An hourly cron at `0 * * * *` selects `failed` jobs whose `created_at < now() - 24h`; sets `status='abandoned'`, fires admin alert.

### Alternate Flows

#### A1 — Job succeeds on attempt 2
1. Transitions to `succeeded`.

### Exception Flows

#### E1 — Job's `last_error` indicates permanent failure (e.g. `RECIPIENT_PHONE_NUMBER_INVALID`)
1. Dispatcher immediately marks `abandoned` regardless of attempts.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Retry queue

  Scenario: Transient failure schedules a retry
    Given a Meta send fails with HTTP 500
    When the dispatcher handles the failure
    Then the dispatch job status becomes "failed", attempt_count=1, next_attempt_at = now + 30s

  Scenario: 24h abandonment
    Given a dispatch job has been failing for 24h
    When the hourly cron runs
    Then the job status becomes "abandoned"
      And an admin alert WhatsApp is enqueued

  Scenario: Permanent failure abandons immediately
    Given a Meta send returns "RECIPIENT_PHONE_NUMBER_INVALID"
    When the dispatcher handles it
    Then the job status becomes "abandoned" with last_error="RECIPIENT_PHONE_NUMBER_INVALID"
      And no retry is scheduled
```

### Edge Cases
1. Customer opted out mid-retry — dispatcher short-circuits on next attempt with `last_error='opted_out'`.

### UI/UX Specifications
- `/admin/communications/jobs` shows the dispatch jobs table with status colour, attempts, last error.

### Data Model
Adds columns to `whatsapp_dispatch_jobs`: `next_attempt_at timestamptz`, `permanent_failure boolean default false`.

### API Endpoints
- `POST /api/whatsapp/dispatcher/run?mode=retry` (Vercel Cron).
- `POST /api/whatsapp/dispatcher/run?mode=sweep_abandoned` (hourly cron).

### Security Considerations
- Cron routes carry Vercel secret + signed bearer token.
- Abandoned job bodies stay readable to admins for forensic review.

### Performance Requirements
- Cron iteration p95 < 5s for up to 1000 dirty jobs.

### Notifications
- Admin "job abandoned" alert dispatched via US-CN-019 (admin notification panel).

### Localization
- N/A.

### Error Handling
- `meta_rate_limited` schedules retry with the rate-limit `Retry-After` header value (overrides default backoff).

### Logging & Analytics
- `whatsapp.dispatch.retry.scheduled` `{ attempt_count, next_attempt_at }`.
- `whatsapp.dispatch.abandoned`.

### Testing Notes
- Unit: backoff computation.
- Integration: simulate a Meta 5xx; assert scheduled retry.

### Related User Stories
- US-CN-003..013 all use the retry queue transparently.
- US-CO-007 (File 08) coach inbox shows pending outbound state.

### Dependencies
- Vercel Cron secret.

### Tags
`whatsapp` · `retry` · `backoff` · `cron`

### Notes / Rationale
Exponential backoff prevents hot retry loops hammering Meta during outages; the 24h-abandonment bound keeps the queue bounded.

---

## US-CN-017 — Delivery receipt webhook → status log (delivered, read, failed)

### Story
As the admin,
I want the delivery receipt webhook from Meta to update the `whatsapp_messages` row's status and timestamps,
So that the admin messages panel can show which messages were actually delivered/read/failed.

### Priority: P1
### Status: Draft
### Estimate: 3
### Sprint: Sprint 2 — Booking + Notifications

### Actors
- **Primary actor:** Meta Cloud API webhook.
- **System actor:** `/api/whatsapp/webhook` POST route.

### Preconditions
1. Webhook subscribed to `statuses` events.

### Postconditions
1. For each `statuses` event, the `whatsapp_messages` row paired by `wa_message_id` is updated with the latest status and timestamp.

### Main Flow (Happy Path)
1. Meta posts `POST /api/whatsapp/webhook` with `entry[0].changes[0].value.statuses[]`.
2. Server verifies signature.
3. For each status entry:
   - Find `whatsapp_messages` row by `wa_message_id = statuses[].id`.
   - Update `status`, `sent_at`, `delivered_at`, `read_at`, `error_code`, `error_message` per the event.
   - If `status='failed'` and the row corresponded to a `whatsapp_dispatch_jobs` job, the dispatcher is notified (it will retry per US-CN-016).

### Alternate Flows

#### A1 — Stale status (newer status exists)
1. Server keeps newer timestamp; only advances status in defined order (`queued`→`sent`→`delivered`→`read`).

### Exception Flows

#### E1 — Unknown wa_message_id (likely from a different WABA)
1. Log and discard.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Delivery receipts

  Scenario: Delivered status updates the row
    Given a whatsapp_messages row with wa_message_id="wam.1"
    When Meta posts a status event with status="delivered" id="wam.1"
    Then the row status becomes "delivered" and delivered_at is set

  Scenario: Read status overrides delivered
    Given a row with status="delivered"
    When Meta posts status="read"
    Then the row status becomes "read" and read_at is set

  Scenario: Failed status surfaces an error_code
    When Meta posts status="failed" with errors=[{code:"131047"}]
    Then the row failure metadata is recorded
      And the dispatch job linked to the row is marked failed for retry
```

### Edge Cases
1. Status event fires before the corresponding `whatsapp_messages` write completes (rare race) — server stores into a `status_buffer` for up to 30s and reconciles.

### UI/UX Specifications
- `/admin/communications/messages` shows the status pill per row.

### Data Model
Reads/writes `whatsapp_messages`. No new tables; adds an index `index on (wa_message_id)` if not already present.

### API Endpoints
- `POST /api/whatsapp/webhook` (reuses the same route).

### Security Considerations
- Signature verification as the gate.

### Performance Requirements
- Webhook p95 < 500ms.

### Notifications
- N/A.

### Localization
- N/A.

### Error Handling
- `unknown_wa_message_id` 200 (logged silently).

### Logging & Analytics
- `whatsapp.status.<status>` counter.

### Testing Notes
- Unit: status transition precedence.
- Integration: webhook simulation.

### Related User Stories
- US-CN-016 retry.

### Dependencies
- Meta statuses subscription.

### Tags
`whatsapp` · `receipts` · `webhook`

### Notes / Rationale
The admin "did this message actually reach the customer" inspector depends on receipts being well logged.

---

## US-CN-018 — Anti-spam & rate-limits (per-customer per-trigger throttle; daily business cap; fallback chain)

### Story
As the platform,
I want anti-spam throttling that caps per-customer sends, a daily business cap that respects Meta's tier, and a language fallback chain to keep messages flowing even if a template is unavailable in a language,
So that no customer is spammed, the WABA stays healthy, and language gaps don't drop messages.

### Priority: P0
### Status: Draft
### Estimate: 5
### Sprint: Sprint 2 — Booking + Notifications

### Actors
- **Primary actor:** Dispatcher.
- **System actor:** `whatsapp_conversations`; `whatsapp_dispatch_jobs` unique constraint.

### Preconditions
1. Business number `messaging_limit_tier` is enforced daily by cron.

### Postconditions
1. Each send respects:
   - per-customer per-trigger throttle (e.g. max 1 per trigger per 30min unless new ref_id).
   - per-business daily cap (TIER_1K = 1000 unique customers / day).
   - language fallback (locale → EN if AR template missing/rejected).

### Main Flow (Happy Path)
1. Before sending, dispatcher checks:
   a. `(trigger, ref_id, language)` unique constraint — duplicate bypass.
   b. Per-customer last-sent timestamp for the same trigger within last 30min (only for stateless triggers like login_alert).
   c. Business-day counter; if at or near the daily cap, the dispatcher defers non-urgent triggers and logs `daily_cap_deferred`.
2. Sends the template in the customer's `profiles.locale`; if the template's `status!='approved'` in that language, falls back to EN.
3. Records the dispatched language in `whatsapp_messages.params.fallback` if a fallback occurred.

### Alternate Flows

#### A1 — Daily cap reached
1. Marketing/upcoming reminders deferred to next day; transactional (booking_confirmed, login_alert) still sent because Meta slots them separately.

### Exception Flows

#### E1 — Both EN and AR templates rejected
1. Dispatcher uses free-text inside the 24h customer service window if available; otherwise abandons with `last_error='no_template_available'`.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Anti-spam and language fallback

  Scenario: Duplicate trigger idempotency
    Given the same booking_confirmed webhook fires twice for "ROW-2026-0412"
    When the dispatcher tries to enqueue
    Then only one dispatch job exists (unique constraint triggers)

  Scenario: Arabic template rejected falls back to English
    Given customer locale="ar" and the AR booking_confirmed template is rejected
    When the dispatcher runs
    Then it uses the EN template, params.fallback="en"
      And a telemetry event records the fallback

  Scenario: Daily cap defers low-priority triggers
    Given the business number is at 990/1000 today
    When a reminder_24h dispatch is enqueued
    Then it is deferred (status="pending", scheduled_for=midnight tonight) and the customer keeps their slot

  Scenario: Transactional trigger bypasses daily cap
    Given the daily cap is at 1000
    When a booking_confirmed fires
    Then the dispatcher still sends it (transactional override)
```

### Edge Cases
1. The `[23h30m, 24h30m]` reminder window deferral risks missing the window if the daily cap is hit; in practice the cap rarely approaches 1000 and the transactional category in Meta allows utility templates outside the cap.
2. Customer's locale toggle mid-conversation — each new send re-evaluates locale.

### UI/UX Specifications
- `/admin/communications/jobs?status=deferred` surfaces deferred messages.

### Data Model
Reads `whatsapp_templates` and `whatsapp_business_numbers`. Adds `whatsapp_business_numbers.daily_send_count int default 0` and `daily_count_reset_at timestamptz` and is reset by a daily cron at midnight Africa/Cairo.

### API Endpoints
- `POST /api/whatsapp/dispatcher/run`.

### Security Considerations
- Anti-spam protects the WABA quality rating — a `LOW` quality can cascade to a ban.

### Performance Requirements
- The duplicate-idempotency check happens at the DB constraint layer in < 5ms.

### Notifications
- Self.

### Localization
- Fallback chain order: `locale` → `en`. (v2 may add `fr` or other.)

### Error Handling
- `daily_cap_deferred` 200; the cron will retry tomorrow.
- `no_template_available` 422.

### Logging & Analytics
- `whatsapp.dispatch.fallback.used` `{ from: 'ar', to: 'en' }`.
- `whatsapp.dispatch.deferred.daily_cap`.

### Testing Notes
- Unit: throttle math; fallback chain.
- Integration: simulate daily-cap clamp.

### Related User Stories
- US-CN-002 template approvals; US-CN-019 admin panel.

### Dependencies
- Meta tier monitoring.

### Tags
`whatsapp` · `anti_spam` · `throttle` · `fallback` · `daily_cap`

### Notes / Rationale
Protect the WABA quality rating and the customer experience in one rule set.

---

## US-CN-019 — Admin notification panel (badge with unread count; dropdown list)

### Story
As an AquaLudo admin,
I want a bell icon in the admin layout header with an unread count and a dropdown listing the most recent admin notification triggers (new contact, new booking, cancellation, review pending, job abandoned),
So that operational events are at my glance without leaving whatever admin page I'm on.

### Priority: P1
### Status: Draft
### Estimate: 3
### Sprint: Sprint 2 — Booking + Notifications

### Actors
- **Primary actor:** Admin.

### Preconditions
1. Admin session.

### Postconditions
1. The bell badge shows unread count.
2. The dropdown lists the most recent 10 admin notifications.

### Main Flow (Happy Path)
1. Admin opens any `/admin/*` page.
2. SSR fetches `admin_notifications` view of unread admin triggers from the last 30 days.
3. The bell renders the count; dropdown renders 10 most-recent; each row has a deep link to the destination (e.g. `/admin/messages/<id>`, `/admin/bookings/[id]`, `/admin/reviews`).
4. Admin clicks a row → marks read (`read_at`) → navigates.
5. The badge count refreshes via Supabase Realtime channel `admin:notifications`.

### Alternate Flows

#### A1 — Admin "Mark all read"
1. Bulk update `read_at=now()` for the current admin.

### Exception Flows

#### E1 — Realtime disconnected
1. The badge falls back to 30s polling interval.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Admin notification panel

  Scenario: Bell shows unread count
    Given 5 unread admin notifications
    When the admin opens /admin
    Then the bell badge shows "5"

  Scenario: Mark one as read decrements the bell
    Given the admin clicks a row
    When the row's read_at is set
    Then the badge shows "4" within 1 second via Realtime
```

### Edge Cases
1. Two admins simultaneously mark the same notification read — only the first updates the row; second's update is no-op.

### UI/UX Specifications
- Header-right bell icon, 24px circle badge red, dropdown panel 380px max-height with scroll.
- RTL: bell mirrors to the left.

### Data Model

```sql
admin_notifications
  id           uuid pk default gen_random_uuid()
  admin_id     uuid not null references auth.users(id) on delete cascade
  trigger      text not null                 -- admin_contact_message, admin_new_booking, admin_new_cancellation, admin_new_review_pending, dispatch_abandoned
  ref_id       uuid not null
  payload      jsonb not null
  read_at      timestamptz
  created_at   timestamptz not null default now()
  index on (admin_id, read_at, created_at desc)
  -- RLS: admin SELECT own; service role INSERT on dispatch
```

### API Endpoints
- `GET /api/admin/notifications` and `POST /api/admin/notifications/read`.
- Realtime channel `admin:notifications`.

### Security Considerations
- RLS: admin only sees their own notifications.

### Performance Requirements
- Dropdown SSR p95 < 200ms.

### Notifications
- Self (meta).

### Localization
- Trigger labels EN/AR.

### Error Handling
- `realtime_disconnected` 200 fallback to polling.

### Logging & Analytics
- `admin.notifications.read`.

### Testing Notes
- E2E: bell count + read flow.

### Related User Stories
- All admin triggers (US-CN-008/009/010/013 when applicable to admins).

### Dependencies
- Supabase Realtime.

### Tags
`admin` · `notifications` · `panel` · `realtime`

### Notes / Rationale
A glanceable operational feed; deep links into the destination page in one tap.

---

## US-CN-020 — WhatsApp inbound keyword commands (BOOK, CANCEL <id>, STOP, START)

### Story
As a customer,
I want to text simple keywords to the AquaLudo WhatsApp number to perform operations (see latest menu, cancel a future booking, opt out of messages),
So that I can manage my bookings when I'm away from the website, all from my WhatsApp inbox.

### Priority: P1
### Status: Draft
### Estimate: 5
### Sprint: Sprint 3 — Polish

### Actors
- **Primary actor:** Customer.
- **System actor:** US-CN-015 inbound handler; keyword routing layer.

### Preconditions
1. Customer is opted into the WhatsApp conversation.

### Postconditions
1. The customer receives the corresponding response template.

### Main Flow (Happy Path)
1. Customer texts `BOOK` to the business number.
2. US-CN-015 inbound handler routes to US-CN-020 keyword router.
3. Router fires `aqualudo_keyword_book_v1` template with deep link to `/booking`.
4. Customer texts `CANCEL ROW-2026-0412`.
5. Router validates the booking belongs to the customer and slot is >24h away (per US-CA-012 policy); if inside 24h, refuses with refusal template.
6. Successful cancel enqueues US-CA-012 cancel flow; responds with `aqualudo_keyword_cancelled_v1`.
7. Customer texts `STOP` → US-CN-014 mark opted out.
8. Customer texts `START` → US-CN-014 restore.

### Alternate Flows

#### A1 — Misspelled keyword
1. Router replies with `aqualudo_keyword_unknown_v1` listing valid keywords.

### Exception Flows

#### E1 — Booking id not owned by sender
1. Router replies `not_found` to keep enumeration-safe.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Inbound keyword commands

  Scenario: BOOK returns the booking menu
    Given Salma texts "BOOK"
    When the router handles
    Then Salma receives a template with the deep link to /booking

  Scenario: CANCEL with valid booking cancels it
    Given Salma has future booking "ROW-2026-0412" with slot start_at > 24h
    When she texts "CANCEL ROW-2026-0412"
    Then the booking is cancelled and Salma receives cancellation_confirmed
      And a refund is processed if applicable

  Scenario: CANCEL inside 24h refuses
    Given Salma has future booking "ROW-2026-0412" with slot start_at < 24h
    When she texts "CANCEL ROW-2026-0412"
    Then the router responds that the 24h cancellation window has closed
      And the booking remains confirmed

  Scenario: STOP opts out
    Given Salma texts "STOP"
    Then whatsapp_conversations.status becomes "opted_out"
      And Salma receives an acknowledgment
      And no more outbound WhatsApp will be sent to her

  Scenario: Unknown keyword returns the menu
    Given Salma texts "PRICES"
    When the router handles
    Then Salma receives the unknown_keyword template
```

### Edge Cases
1. Customer's booking-id query spelling case-insensitive — handled by uppercase normalisation.
2. Customer spams keywords — the per-customer per-trigger throttle in US-CN-018 limits responses.

### UI/UX Specifications
- All responses are templates (no free-text required).

### Data Model
Uses existing `whatsapp_dispatch_jobs`, `whatsapp_messages`, `whatsapp_conversations`, `notification_preferences`.

### API Endpoints
- US-CN-015 inbound handler delegates to keyword router helper.

### Security Considerations
- Anti-enumeration: identical response for not-found and not-owned booking ids.
- A keyword response counts against the per-customer outbound aggregate.

### Performance Requirements
- Keyword router p95 < 200ms.

### Notifications
- Self.

### Localization
- Keyword responses are templates in EN/AR. Recognised keywords expanded in v2; v1 supports both EN and AR equivalents.

### Error Handling
- `unknown_keyword` → response template.
- `cancel_refused_inside_24h` → response template.

### Logging & Analytics
- `whatsapp.keyword.book`, `.cancel.success`, `.cancel.refused`, `.start`, `.stop`, `.unknown`.

### Testing Notes
- Unit: keyword parser (case normalisation, "CANCEL ROW-2026-0412" splits).
- Integration with File 04 cancel.

### Related User Stories
- US-CA-012 (File 04) cancel flow.
- US-CN-014 preferences.

### Dependencies
- US-CN-001, US-CN-015.

### Tags
`whatsapp` · `keywords` · `commands` · `self_service`

### Notes / Rationale
Self-service keywords reduce admin load and align with the user's locked stipulation that cancellation is "customer-self-cancel only (not via WhatsApp reply)" — strictly speaking the user said "not via WhatsApp reply". The strict reading means CANCEL via WhatsApp is NOT supported. This story should therefore be revised to remove CANCEL keyword handling; STOP and BOOK and START remain. Re-confirm with the user before shipping CANCEL-by-WhatsApp.

---

## End of File 09

This file documents the communications and notifications system for AquaLudo v2. Adjacent files:

- `03-booking-flow.md` — the booking capture path that enqueues `booking_confirmed` and `waitlist_slot_opened` triggers; owns the `/booking/claim/<token>` route that consumes waitlist magic tokens.
- `04-customer-account.md` — owns `notification_preferences` and reads `whatsapp_conversations.status`; supplies the OTP-template payload for US-CA-002; consumes the post-session review deep link in US-CA-016.
- `05-admin-content-management.md` — admin owns the templates editor at `/admin/communications/templates`.
- `07-admin-booking-management.md` — admin waitlist pick (US-AD-008) enqueues the waitlist-slot-opened dispatch; admin inbox consumes `customer_messages` rows assembled in US-CN-015.
- `08-coach-panel.md` — coach inbox consumes `customer_messages` rows assembled here; coach attendance updates in US-CO-005 trigger the `post_session_review` dispatch.