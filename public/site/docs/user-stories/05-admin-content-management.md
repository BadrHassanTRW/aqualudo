# File 05 — Admin Content Management User Stories

> **Project:** AquaLudo v2 (water sports academy on the Nile, Cairo, Egypt)
> **Stack:** Next.js 14 (App Router) + Supabase (Postgres + Auth + Storage) + Paymob + Meta Cloud WhatsApp API
> **Domain covered by this file:** the admin's editorial surface — role assignment and 2FA, dashboard home, activities create/edit/archive, pricing tiers, add-ons, session packages, membership tiers, coach records and slot templates, events, reviews moderation, CMS blocks, business profile, promo banners, slug redirects, and the audit log viewer.
> **Last updated:** 2026-07-28
> **Status:** Draft (awaiting technical + business review)
> **Owner:** Product team
> **Related files:**
> - `01-loading-and-public-discovery.md`
> - `02-activities-and-pricing-catalog.md`
> - `03-booking-flow.md`
> - `04-customer-account.md`
> - `06-admin-heatmap-dashboard.md`
> - `07-admin-booking-management.md`
> - `08-coach-panel.md`
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
10. **UI/UX Specifications** — desktop, mobile, RTL, loading/empty/error/success states.
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

The admin content-management surface is the **editorial cockpit** of AquaLudo v2. It lives under `app/(admin)/admin/*` and is reachable only from authenticated admin sessions — the role gate is enforced both by Next.js middleware and by Supabase Row-Level Security. The file owns the routing skeleton (`/admin/home`, `/admin/activities`, `/admin/coaches`, `/admin/events`, `/admin/pricing`, `/admin/reviews`, `/admin/cms`, `/admin/business-profile`, `/admin/promos`, `/admin/slug-redirects`, `/admin/audit`, `/admin/users`, `/admin/settings`) plus the deep links to other admin surfaces: Heatmap (File 06) and Bookings (File 07). No `/admin/*` route is publicly indexed; `robots.txt` disallows the entire prefix and `<meta name="robots" content="noindex">` is rendered on every admin page.

The file owns the DDL for four Supabase tables that no other file introduces:

- `admin_roles` — the role table on top of `auth.users`; the role of `super_admin`, `content_admin`, or `finance_admin` is a 1-to-1 upgrade from the `profiles.role='admin'` baseline.
- `audit_logs` — append-only; every admin mutation story in this file appends one row; File 07 also fires into it for booking events. The "Audit log viewer" (US-AB-018) reads this table.
- `slug_history` — every time an admin renames a `slug` on `activities`, `coaches`, `events`, or any CMS-routed entity, the old slug is recorded here and the routing layer (US-AB-017) issues 301s.
- `promos` — admin-managed promo banners for the home hero, top bar, and footer slots. Drives the `<Header/>` promo band and the home hero.

All other tables used by the editorial flows — `activities`, `activity_pricing_tiers`, `activity_add_ons`, `session_packages`, `membership_tiers`, `coaches`, `events`, `reviews`, `gallery_items`, `content_blocks`, `nav_items`, `business_profile` — are defined in File 02 and File 01. This file only references them by name and adds the admin-specific DML surfaces (CRUD screens, bulk actions, revalidation hooks).

Pages owned by this file:

| Route                                                | Component path                                                | Auth                  | Rendering |
|------------------------------------------------------|---------------------------------------------------------------|-----------------------|-----------|
| `/admin`                                             | `app/(admin)/admin/page.tsx`                                  | Admin                 | SSR       |
| `/admin/activities`                                  | `app/(admin)/admin/activities/page.tsx`                       | Admin                 | SSR       |
| `/admin/activities/new`                              | `app/(admin)/admin/activities/new/page.tsx`                   | Admin                 | SSR       |
| `/admin/activities/[id]`                             | `app/(admin)/admin/activities/[id]/page.tsx`                  | Admin                 | SSR       |
| `/admin/pricing`                                     | `app/(admin)/admin/pricing/page.tsx`                          | Admin                 | SSR       |
| `/admin/pricing/tiers`                               | `app/(admin)/admin/pricing/tiers/page.tsx`                    | Admin                 | SSR       |
| `/admin/pricing/addons`                              | `app/(admin)/admin/pricing/addons/page.tsx`                   | Admin                 | SSR       |
| `/admin/coaches`                                     | `app/(admin)/admin/coaches/page.tsx`                          | Admin                 | SSR       |
| `/admin/coaches/new`                                 | `app/(admin)/admin/coaches/new/page.tsx`                      | Admin                 | SSR       |
| `/admin/coaches/[id]`                                | `app/(admin)/admin/coaches/[id]/page.tsx`                     | Admin                 | SSR       |
| `/admin/coaches/[id]/slot-templates`                 | `app/(admin)/admin/coaches/[id]/slot-templates/page.tsx`      | Admin                 | SSR       |
| `/admin/events`                                      | `app/(admin)/admin/events/page.tsx`                           | Admin                 | SSR       |
| `/admin/events/new`                                  | `app/(admin)/admin/events/new/page.tsx`                       | Admin                 | SSR       |
| `/admin/events/[id]`                                 | `app/(admin)/admin/events/[id]/page.tsx`                      | Admin                 | SSR       |
| `/admin/reviews`                                     | `app/(admin)/admin/reviews/page.tsx`                          | Admin                 | SSR       |
| `/admin/cms`                                         | `app/(admin)/admin/cms/page.tsx`                              | Admin                 | SSR       |
| `/admin/cms/[block_slug]`                            | `app/(admin)/admin/cms/[block_slug]/page.tsx`                 | Admin                 | SSR       |
| `/admin/business-profile`                            | `app/(admin)/admin/business-profile/page.tsx`                 | Admin                 | SSR       |
| `/admin/promos`                                      | `app/(admin)/admin/promos/page.tsx`                           | Admin                 | SSR       |
| `/admin/slug-redirects`                              | `app/(admin)/admin/slug-redirects/page.tsx`                   | Admin                 | SSR       |
| `/admin/audit`                                       | `app/(admin)/admin/audit/page.tsx`                            | Admin                 | SSR       |
| `/admin/users`                                       | `app/(admin)/admin/users/page.tsx`                            | Super admin only      | SSR       |
| `/admin/settings`                                    | `app/(admin)/admin/settings/page.tsx`                         | Admin                 | SSR       |
| `/admin/2fa`                                         | `app/(admin)/admin/2fa/page.tsx`                              | Admin (challenge)     | SSR       |
| `/api/admin/audit`                                   | `app/api/admin/audit/route.ts`                                | Admin                 | Route     |
| `/api/admin/promos`                                  | `app/api/admin/promos/route.ts`                               | Admin                 | Route     |
| `/api/admin/revalidate`                              | `app/api/admin/revalidate/route.ts`                           | Admin                 | Route     |
| `/api/admin/slug-redirects`                          | `app/api/admin/slug-redirects/route.ts`                       | Admin                 | Route     |
| `/api/whatsapp/templates`                            | (Registered here, runtime in File 09)                        | Admin                 | Route     |

The currency model is the same as everywhere else: integer piasters in the database (1 EGP = 100 piasters), `Intl.NumberFormat('en-EG'|'ar-EG', { style: 'currency', currency: 'EGP' })` on display. EGP amounts in this file use the canonical business data (e.g. Rowing 20000 piasters = 200 EGP per tier; Private 40000 piasters = 400 EGP; SUP 35000 = 350 EGP; Wakeboard from 180000 = 1800 EGP; Kayak from 13000 = 130 EGP; sample package `8-pack-1-free` at 160000 = 1600 EGP).

The brand tone is unchanged across the admin surface: **"AquaLudo by Oar & Sail"** appears in copy, mail, the bottom-of-the-admin foot strip, and the demo seed data. The Arabic mirror string is `أكوالودو من أوار آند سايل`.

---

## Domain Glossary

- **Admin role** — the role of `super_admin`, `content_admin`, or `finance_admin` granted on top of `profiles.role='admin'`. `super_admin` is the only role allowed to grant other admin roles (US-AB-001) and to view the audit log (US-AB-018). `content_admin` is allowed to mutate catalog content (activities, coaches, events, CMS, promos) but not `finance_admin` (pricing tiers, packages, memberships, payment overrides). `finance_admin` is allowed to view payment logs and override payment statuses (per File 07 US-AD-011) but cannot edit activity copy.
- **2FA via WhatsApp OTP** — every admin sign-in triggers a 6-digit code sent to the admin's verified WhatsApp number. The code is valid for 10 minutes and rate-limited to 3 failed attempts per session.
- **Activity** — a bookable, recurring water-sports offering (Rowing, Kayaking, SUP, Wakeboard, Fitness). Owned by File 02's DDL; this file mutates it.
- **Pricing tier** — a single bookable unit inside an activity (Onboarding, Foundation, Performance, Elite, Private). Owned by File 02; mutated here.
- **Add-on** — an optional, per-activity or global purchasable item (wetsuit rental, GoPro footage, photo package, private coach upgrade). Owned by File 02; managed here.
- **Session package** — a prepaid bundle (e.g. 8 sessions + 1 free) with validity window. Owned by File 02; managed here.
- **Membership tier** — a monthly subscription (e.g. silver-monthly, gold-monthly) with a session count and benefit list. Owned by File 02; managed here.
- **Coach** — staff user with public profile and schedule. The `coaches` row is owned by File 02; admin CRUD here drives it.
- **Slot template** — a recurring weekly availability entry per coach per activity (`coach_slot_templates`, owned by File 02). This file's US-AB-011 mutates the table.
- **Event** — a marketing page tied to a date range and a deep link to `/booking?event=[slug]`. Owned by File 02; mutated here.
- **Review** — a star rating + short text, gated to one per booking, admin-moderated. Owned by File 02; moderated here.
- **CMS block** — a row in `content_blocks` (File 01) that drives a section of a public page (home hero, pillars, why-us, impact metrics, about). Edited here.
- **Slug history** — the `slug_history` table tracks every `old_slug → new_slug` rename on catalog entities. Public routing reads it for 301s.
- **Audit log** — the append-only `audit_logs` table. Every mutation story in this file inserts at least one row.
- **Promo slot** — a specific UI position (home_hero_top, topbar, footer) where a promo banner can be turned on. Driven by `promos` table.
- **Soft delete / archive** — the `status='archived'` value on activities, coaches, events, CMS blocks. Existing bookings are preserved; the public surface suppresses archived rows via RLS.

---

## Table of Contents

1. US-AB-001 — Admin role assignment and 2FA via WhatsApp OTP
2. US-AB-002 — Admin dashboard home (cards + quick actions)
3. US-AB-003 — Activity create
4. US-AB-004 — Activity edit including slug rename with 301 redirect
5. US-AB-005 — Activity archive (soft delete)
6. US-AB-006 — Pricing tier CRUD per activity
7. US-AB-007 — Add-on management (global + per-activity)
8. US-AB-008 — Session package CRUD
9. US-AB-009 — Membership tier CRUD
10. US-AB-010 — Coach create/archive
11. US-AB-011 — Coach slot template management
12. US-AB-012 — Event CRUD
13. US-AB-013 — Reviews moderation queue
14. US-AB-014 — CMS editor for home/about content blocks
15. US-AB-015 — Business profile edit
16. US-AB-016 — Promo banner management
17. US-AB-017 — Slug redirect mapping
18. US-AB-018 — Audit log viewer

---

## US-AB-001 — Admin role assignment and 2FA via WhatsApp OTP

### Story
As a super admin,
I want to promote an existing authenticated user to the admin role with one of `super_admin`, `content_admin`, or `finance_admin`, and require every admin sign-in to pass a 6-digit WhatsApp OTP as a second factor,
So that a leaked password alone cannot publish a phishing home page or a bogus wakeboard promo, and the boundary between content editing and finance actions is enforceable per-role.

### Priority: P0
### Status: Draft
### Estimate: 8
### Sprint: Sprint 1 — Foundation

### Actors
- **Primary actor:** Super admin (already authenticated and 2FA-verified).
- **Secondary actor:** The user being promoted to admin.
- **System actor:** Supabase Auth, the WhatsApp dispatcher (File 09), the audit log writer.

### Preconditions
1. The super admin is signed in and 2FA-verified in this session.
2. The user being promoted already has an `auth.users` row and a `profiles` row with `role='customer'` (or `role='coach'` for the coach-to-admin handoff, but the typical case is promoting a customer account).
3. The user has a verified phone on `profiles.phone` that has been OTP-verified at least once.

### Postconditions
1. A row exists in `admin_roles` with `user_id=<target>`, `role='content_admin'|'finance_admin'|'super_admin'`, `granted_by=<super_admin>`, `granted_at=now()`.
2. `profiles.role` flips to `admin` for the target user.
3. The target user's next sign-in is required to complete 2FA via WhatsApp OTP.
4. An `audit_logs` row records the grant with `action='admin_role_grant'`, `before/after` diffs, and the super admin's actor id.

### Main Flow (Happy Path)
1. Super admin navigates to `/admin/users`.
2. Searches for the target user by phone (`+201011329642` for Salma Akl) or by email.
3. Clicks "Promote to admin"; a role-picker dialog appears.
4. Super admin picks `content_admin` (or `finance_admin` or `super_admin`) and an optional free-text reason (e.g. "joined as content lead 2026-07-28").
5. Confirms; the server runs the grant in a single transaction:
   - `insert into admin_roles (user_id, role, granted_by) values (...)`.
   - `update profiles set role='admin' where user_id = ...`.
   - `insert into audit_logs (actor_id, action, entity, entity_id, before, after) values (...)`.
   - A Supabase Database Webhook fires `whatsapp.dispatch.admin_role_granted` into the dispatcher queue.
6. The dispatcher sends a WhatsApp template `aqualudo_admin_role_granted_v1` in the user's `profiles.locale` to inform the new admin: "You've been promoted to [role] on AquaLudo Admin. Sign in and complete 2FA."
7. The target user signs in, lands on `/admin/2fa`, sees the OTP entry, enters the 6-digit code, and gains admin scope.

### Alternate Flows

#### A1 — Super admin revokes an admin role
1. Super admin opens `/admin/users`, finds the user, clicks "Revoke admin".
2. Confirm dialog: "Revoke [role] for [full_name]? They will be signed out within 60 seconds."
3. Server deletes the `admin_roles` row, flips `profiles.role='customer'`, signs the user out by invalidating all active sessions via Supabase `admin.signOut(user_id)`, and writes an `audit_logs` row.
4. A WhatsApp template `aqualudo_admin_role_revoked_v1` is sent to the user.

#### A2 — Promotion to `super_admin`
1. Allowed only if the grantor is also a `super_admin` and there is at least one other `super_admin` after the grant.
2. A check prevents the last super admin from demoting themselves.

#### A3 — Phone is not yet OTP-verified
1. The super admin is offered a "Send verification code" action that sends a one-time template `aqualudo_phone_verify_v1` via the dispatcher.
2. The target must verify before the grant can be saved.

### Exception Flows

#### E1 — Target user has no phone on file
1. UI shows "Add a phone number first — go to `/account` to add it." The grant is blocked.

#### E2 — 2FA code entered incorrectly 3 times
1. Session is invalidated; user must re-authenticate and request a new code.

#### E3 — OTP delivery fails
1. Per File 09 US-CN-016 retry queue; if 24-hour abandon occurs, the 2FA session is invalidated and the user is sent back to sign-in.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Admin role assignment + 2FA

  Scenario: Super admin promotes a user to content_admin
    Given a super admin is signed in
      And user "Salma Akl" exists with role="customer" and phone="+201011329642"
    When the super admin grants "content_admin" to Salma
    Then a row exists in admin_roles for Salma with role="content_admin"
      And profiles.role for Salma is "admin"
      And an audit_logs row exists with action="admin_role_grant"
      And a WhatsApp is sent to +201011329642 with template "aqualudo_admin_role_granted_v1"
      And Salma's next sign-in requires a 6-digit WhatsApp OTP at /admin/2fa

  Scenario: 2FA via WhatsApp OTP succeeds
    Given Salma has been promoted to content_admin
      And she has just signed in with her password
    When she lands on /admin/2fa
    Then a 6-digit code is requested and sent to her WhatsApp
      And entering the correct code within 10 minutes grants admin scope
      And entering the wrong code 3 times invalidates the session

  Scenario: Last super admin cannot demote themselves
    Given there is exactly one super_admin in the system
    When that super admin tries to revoke their own super_admin role
    Then the request is rejected with HTTP 409 "cannot_revoke_last_super_admin"

  Scenario: Promotion target has no phone on file
    Given a target user has no profiles.phone
    When the super admin attempts to promote them
    Then the UI blocks the action with a "Add a phone first" hint

  Scenario: 2FA OTP delivery retries per File 09
    Given a code is requested
      And the first send fails
    Then the dispatcher retries per US-CN-016
      And if abandoned after 24h, the 2FA session is invalidated
```

### Edge Cases
1. Super admin revoking another super admin's role when they are the only one — rejected.
2. Promotion while the target's WhatsApp is opted out — the role grant succeeds but the notification template silently drops; admin must rely on the in-panel "Action required" banner on the target's next sign-in attempt.
3. OTP requested twice within 5 minutes — the second request invalidates the first.
4. Target's `profiles.locale` is `ar` — the WhatsApp template is sent in Arabic.

### UI/UX Specifications

#### Desktop (≥ 1024 px)
- `/admin/users` table with columns: name, email, phone, current role, granted_by, granted_at, actions. Row action menu offers "Promote" or "Revoke".
- Promote dialog: a single-select radio list of roles + reason textarea; "Confirm" button teal pill.
- `/admin/2fa` page: large 6-digit OTP input (one digit per box, auto-advance), "Resend code" link, "Cancel and sign out" link.

#### Mobile (≤ 640 px)
- The user table collapses to a stacked card list.
- OTP input remains a 6-digit row but each digit is 56×64 px.

#### RTL (Arabic)
- The role list radio labels align right.
- The OTP digit row flows right-to-left; the first box is on the right.

#### Loading state
- `/admin/users` shows skeleton rows.
- The promote action shows an inline spinner in the dialog.

#### Empty state
- "No admin users yet. Promote a customer from their account row to get started." (with a deep link to a search-help modal).

#### Error state
- Promote failures surface as toast in EN/AR at the top of the screen.
- OTP failures show inline "Incorrect code — N attempts remaining".

#### Success state
- The promoted user's row updates to a green pill "content_admin" instantly.
- The WhatsApp notification is recorded in the timeline; a check mark confirms delivery.

### Data Model

```sql
admin_roles
  user_id     uuid pk references auth.users(id) on delete cascade
  role        text not null check (role in ('super_admin','content_admin','finance_admin'))
  granted_at  timestamptz not null default now()
  granted_by  uuid references auth.users(id)
  reason      text
  -- RLS:
  --   SELECT: any admin (so /admin/users can list)
  --   INSERT/UPDATE/DELETE: super_admin only
  --   Note: no UPDATE; role changes are insert+delete
  -- RLS enforced via:
  --   is_admin() security definer function checks profiles.role='admin' and existence in admin_roles

audit_logs
  id           uuid pk default gen_random_uuid()
  actor_id     uuid references auth.users(id) on delete set null
  action       text not null                            -- e.g. 'admin_role_grant', 'activity_create', 'pricing_tier_update'
  entity       text not null                            -- e.g. 'admin_roles', 'activities', 'coaches'
  entity_id    text                                     -- uuid as text for flexibility
  before       jsonb                                    -- snapshot of prior state
  after        jsonb                                    -- snapshot of new state
  ip_hash      text                                     -- sha256(ip + daily salt)
  user_agent   text
  created_at   timestamptz not null default now()
  index on (entity, entity_id, created_at desc)
  index on (actor_id, created_at desc)
  index on (action, created_at desc)
  -- RLS: admin SELECT only; INSERT only via service role; UPDATE/DELETE denied
```

`profiles` is updated to `role='admin'` on the target row. The `audit_logs` insertion must use the same transaction as the role grant.

### API Endpoints
- `POST /api/admin/users/[id]/grant` — body `{ role, reason? }`. Requires super admin. Rate-limited 30/h per super admin.
- `POST /api/admin/users/[id]/revoke` — body `{ reason? }`. Requires super admin.
- `POST /api/admin/2fa/request` — body `{ session_token }`. Sends OTP via dispatcher; rate-limited 3 / 15 minutes.
- `POST /api/admin/2fa/verify` — body `{ session_token, code }`. Verifies and flips session to admin scope.
- `GET /api/admin/users?q=` — admin list (admin scope).

### Security Considerations
1. The grant endpoint MUST be guarded by both middleware (admin scope) and an RLS check (`is_super_admin()` function).
2. The 2FA OTP is generated by `crypto.randomInt(0, 1_000_000)` and HMAC-signed with a server secret; the signed token is opaque to the client.
3. 2FA attempts are rate-limited to 3 failures per session per 15 minutes; an exponential backoff applies.
4. The OTPs are stored in `magic_tokens` (File 09 DDL) with `purpose='admin_2fa'` and a 10-minute expiry.
5. `audit_logs` is INSERT-only for the service role and denied to any authenticated user without a server-side context; the RLS policy is `for insert with check (false)` and a service-role bypass.
6. The promoted admin's password remains unchanged; the OTP is a second factor on top of the password, not a replacement.
7. The super admin promotion flow enforces a 2-of-N rule: there must always be at least one super admin.

### Performance Requirements
- `GET /api/admin/users` p95 < 300 ms with 50 admins.
- The 2FA OTP send latency is gated by the dispatcher (p95 < 30 s including Meta round-trip).
- The grant endpoint p95 < 500 ms including the audit log insert and the WhatsApp enqueue.

### Notifications
- The target receives `aqualudo_admin_role_granted_v1` (EN+AR) immediately.
- The super admin receives an in-panel toast confirming the grant and a sidebar audit counter increments.

### Localization
- Role labels: `super_admin` → EN `Super Admin` / AR `المسؤول الأعلى`; `content_admin` → EN `Content Admin` / AR `مسؤول المحتوى`; `finance_admin` → EN `Finance Admin` / AR `مسؤول المالية`.
- 2FA page copy fully EN/AR. OTP digits are locale-independent.

### Error Handling
- `cannot_revoke_last_super_admin` → 409 with a toast.
- `rate_limited` → 429 with a "try again in N seconds" inline.
- `otp_expired` → 400 with a "request a new code" link.
- `phone_not_verified` → 422 with a "verify phone first" CTA.

### Logging & Analytics
- `admin.role.grant` `{ target_user_id, role, granted_by }`.
- `admin.role.revoke` `{ target_user_id, role, revoked_by }`.
- `admin.2fa.requested` `{ user_id, ip_hash }`.
- `admin.2fa.succeeded` `{ user_id }`.
- `admin.2fa.failed` `{ user_id, attempts_remaining }`.
- `audit_logs` row for every grant/revoke with the full before/after diff.

### Testing Notes
#### Unit
- `is_super_admin()` RLS helper.
- 2FA OTP generation/verification helpers.
- Rate-limit middleware.

#### Integration
- Grant flow with mocked Supabase Auth and a stub dispatcher; assert `admin_roles` row, `profiles.role='admin'`, and `audit_logs` row in one transaction.
- Revoke flow with the "last super admin" guard.

#### E2E (Playwright)
- Promote a customer from `/admin/users`; assert row appears; sign in as the target, get redirected to `/admin/2fa`, enter the OTP from a mocked inbox; land on `/admin`.
- Attempt to demote the last super admin; expect 409 toast.

### Related User Stories
- US-IN-004 (File 10) admin role middleware.
- US-IN-005 (File 10) RLS policy templates.
- US-CN-001 (File 09) WhatsApp connection.
- US-CN-014 (File 09) customer notification preferences (admin's 2FA notification overrides the customer's opt-out for the admin role since it's security-critical).

### Dependencies
- `auth.users`, `profiles`.
- The dispatcher (File 09) must be connected and have approved templates `aqualudo_admin_role_granted_v1`, `aqualudo_admin_role_revoked_v1`, and `aqualudo_phone_verify_v1`.

### Tags
`admin` · `auth` · `2fa` · `whatsapp` · `audit` · `rls`

### Notes / Rationale
Passwords alone are insufficient: an Egyptian market with widespread device sharing means a single stolen password could publish a phishing home page. The 2FA is a security control, not a UX optimization; we choose WhatsApp OTP over TOTP because the customer base is on WhatsApp 24/7 and the admin staff too.

---

## US-AB-002 — Admin dashboard home (cards + quick actions)

### Story
As an admin arriving at `/admin` in the morning,
I want a dashboard home that shows today's bookings, today's revenue, pending reviews count, expiring packages this week, a 14-day traffic chart, and quick actions for the most common operations,
So that I can triage the day's work without bouncing between five pages.

### Priority: P0
### Status: Draft
### Estimate: 5
### Sprint: Sprint 1 — Foundation

### Actors
- **Primary actor:** Any admin (super, content, finance).
- **System actor:** `app/(admin)/admin/page.tsx`; aggregation RPCs on the Supabase side.

### Preconditions
1. Admin signed in and 2FA-verified.
2. Server has live read access to `bookings`, `payment_transactions`, `customer_packages`, `reviews`, and `analytics_events`.

### Postconditions
1. A dashboard renders six cards and a 14-day chart.
2. Quick actions are present: "New booking", "New activity", "Moderate reviews", "Today's bookings".

### Main Flow (Happy Path)
1. Admin lands on `/admin`.
2. Server fetches card data via parallel RPCs:
   - `get_today_bookings_count()` returns 17 (example).
   - `get_today_revenue_egp()` returns 4800 EGP (example).
   - `get_pending_reviews_count()` returns 3.
   - `get_expiring_packages_count(within_days := 7)` returns 5.
   - `get_pending_waitlist_offers_count()` returns 1.
   - `get_new_contact_messages_count()` returns 0.
3. The 14-day traffic chart pulls from `analytics_events` aggregated daily.
4. Quick actions render as a row of pill buttons.

### Alternate Flows

#### A1 — Finance admin role
1. The "Today's revenue" card is shown to finance admins; replaced with "Today's bookings" for content admins.

#### A2 — No data yet (fresh install)
1. Cards show 0; the chart shows a single line at zero with a "data not available" caption.

### Exception Flows

#### E1 — Aggregation query times out
1. The card shows a skeleton with a "retry" link; the rest of the page renders normally.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Admin dashboard home

  Scenario: Cards render with today's metrics
    Given today there are 17 confirmed bookings
      And today's revenue is 4800 EGP
      And 3 reviews are pending moderation
      And 5 packages expire within 7 days
    When the admin lands on /admin
    Then the cards show "17 bookings", "4,800 EGP revenue", "3 pending reviews", "5 expiring packages"
      And the 14-day chart renders with non-zero data

  Scenario: Quick actions navigate to the correct pages
    When the admin clicks the "New activity" quick action
    Then the browser navigates to /admin/activities/new

  Scenario: Finance admin sees revenue; content admin does not
    Given Salma is a content_admin
    When she lands on /admin
    Then the "Today's revenue" card is replaced with "Today's bookings"
```

### Edge Cases
1. Time zone: all "today" boundaries are computed in `Africa/Cairo`.
2. Cards are not click-throughs by default; clicking opens a deep-linked list (e.g. clicking the "Pending reviews" card opens `/admin/reviews?status=pending`).
3. The 14-day chart uses 1-day buckets; if no events for a day, the bucket is shown as a zero bar.

### UI/UX Specifications
- 6-card grid 3×2 desktop, 2×3 tablet, 1×6 mobile.
- Card: 240×140 px, white background, big number 36 px, label 14 px.
- 14-day chart 800×240 px desktop, full-width mobile.

### Data Model
- Reads `bookings`, `payment_transactions`, `reviews`, `customer_packages`, `analytics_events`, `waitlist_offers`, `contact_messages`.
- No new tables.

### API Endpoints
- `GET /api/admin/dashboard` returns the card bundle and chart series in one call.

### Security Considerations
- All queries filtered through the admin scope; finance role restricts access to revenue.

### Performance Requirements
- Card bundle p95 < 500 ms.
- Chart p95 < 600 ms.

### Notifications
- The card "Pending waitlist offers" count surfaces a notification bell badge.

### Localization
- Card labels EN/AR. Currency formatted with `en-EG` or `ar-EG`.

### Error Handling
- `aggregation_timeout` 504; cards show retry.

### Logging & Analytics
- `admin.dashboard.view` `{ role }`.

### Testing Notes
- Unit: card mapping.
- E2E: role-based card visibility.

### Related User Stories
- US-HM-001 (File 06) the heatmap is the deeper analytics view.
- US-AD-001 (File 07) the bookings list is the deep link for the bookings card.

### Dependencies
- All admin-mutated tables.

### Tags
`admin` · `dashboard` · `home`

### Notes / Rationale
The dashboard is the daily front door; it must answer "what needs my attention now?" in one glance.

---

## US-AB-003 — Activity create

### Story
As a content admin,
I want a guided form to create a new activity (e.g. "Coastal Rowing") with EN/AR copy, hero image, gallery of up to 8 images, category, default slot minutes, capacities, private-only flag, and display order,
So that a new offering goes live with no engineering touch.

### Priority: P0
### Status: Draft
### Estimate: 8
### Sprint: Sprint 2 — Catalog MVP

### Actors
- **Primary actor:** Content admin.
- **System actor:** `app/(admin)/admin/activities/new/page.tsx`; Supabase Storage; ISR revalidation endpoint.

### Preconditions
1. Admin signed in, 2FA-verified, role `content_admin` (or `super_admin`).
2. At least one category exists (File 02 seeds Rowing/Kayaking/SUP/Wakeboard/Fitness).

### Postconditions
1. A row exists in `activities` (File 02) with `status='draft'`.
2. Hero image stored in `cms/activities/[id]/hero.webp` on Supabase Storage.
3. Up to 8 gallery images stored in `cms/activities/[id]/gallery/[n].webp`.
4. An `audit_logs` row records the create.
5. ISR revalidation fires for `/`, `/activities`, `/activities/[slug]`.

### Main Flow (Happy Path)
1. Admin navigates to `/admin/activities/new`.
2. The form renders with EN/AR tabs side-by-side and the following fields: name (jsonb), short_description (jsonb), long_description (jsonb), category, hero image uploader, gallery uploader (up to 8), default_slot_minutes (default 60), default_capacity (default 4), min_capacity (1), max_capacity (8), is_private_only (false), display_order (default 1000).
3. Admin fills the EN tab, switches to AR, fills the AR tab.
4. Hero image uploader streams to `/api/admin/uploads` which writes to Supabase Storage bucket `cms` with the file path `activities/[temp_uuid]/hero.webp`.
5. Gallery uploader streams to the same bucket under `activities/[temp_uuid]/gallery/[n].webp`.
6. Admin clicks "Save as draft". The form posts to `/api/admin/activities` with the full payload.
7. Server validates the payload, inserts into `activities` (with `status='draft'`), moves the storage paths to the real activity id, inserts an `audit_logs` row, and fires revalidation for the public routes via `/api/admin/revalidate`.
8. Admin is redirected to `/admin/activities/[id]`.

### Alternate Flows

#### A1 — Save and publish immediately
1. Toggle "Save and publish" instead of "Save as draft".
2. Server sets `status='published'`; revalidation fires for `/`, `/activities`, `/activities/[slug]`.

#### A2 — Slug suggestion
1. The slug field is auto-suggested from the EN name (`coastal-rowing` from "Coastal Rowing"); admin can override.
2. If the slug collides with an existing row, the form surfaces an inline error.

#### A3 — Gallery uploader max 8 enforced
1. The 9th image is rejected client-side; the server re-validates as a hard rule.

#### A4 — Hero image missing alt text
1. Form enforces alt text per locale before save.

### Exception Flows

#### E1 — Storage upload fails
1. Inline error "Upload failed — retry".
2. Telemetry `admin.upload.failed`.

#### E2 — Slug collision
1. Form pre-flight via `/api/admin/activities/check-slug` returns 409; admin must change slug.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Activity create

  Scenario: Create activity as draft
    Given admin opens /admin/activities/new
    When they fill EN+AR copy, hero image, gallery of 4 images, category="Rowing", slot_minutes=60, capacity=4, is_private_only=false
      And click "Save as draft"
    Then an activities row exists with status="draft" and the supplied fields
      And an audit_logs row exists with action="activity_create"
      And the hero image is at cms/activities/<id>/hero.webp
      And the gallery is at cms/activities/<id>/gallery/1..4.webp

  Scenario: Save and publish triggers ISR revalidation
    Given admin fills the form and clicks "Save and publish"
    When the server commits the row
    Then the activities row has status="published"
      And the /, /activities, /activities/<slug> ISR cache is invalidated

  Scenario: Slug collision blocks save
    Given an activity with slug="rowing" already exists
    When admin tries to save with slug="rowing"
    Then the form surfaces an inline error "slug already in use"

  Scenario: Gallery cap 8 enforced
    Given admin has uploaded 8 images
    When they attempt to add a 9th
    Then the uploader disables the add control
```

### Edge Cases
1. Two admins create at the same time — the slug uniqueness constraint serializes the inserts; the loser sees a slug collision error.
2. Hero image > 8 MB — server resizes to 1920 px max-width AVIF.
3. AR copy not provided — the field is required; the form blocks save with a "Provide Arabic copy" hint.

### UI/UX Specifications
- Form 720 px wide centered, EN/AR tabs at top, sticky save bar at the bottom.
- Image uploader uses drag-and-drop with thumbnail previews.
- Mobile: form fields full-width, image uploader stacks.

### Data Model
- Mutates `activities` (File 02 DDL).
- No new tables.

### API Endpoints
- `POST /api/admin/uploads` — signed upload to Supabase Storage.
- `POST /api/admin/activities` — create.
- `POST /api/admin/activities/check-slug` — collision check.
- `POST /api/admin/revalidate` — internal, called after a successful create.

### Security Considerations
- Role check: `content_admin` or `super_admin`.
- Storage paths are namespaced by the activity id to prevent path traversal.
- Slug is lowercased, dashed, ASCII-only.
- The audit log captures the before/after diff.

### Performance Requirements
- Upload p95 < 4 s per image.
- Create p95 < 1 s including audit and revalidation.

### Notifications
- None.

### Localization
- All form labels EN/AR.
- Validation messages EN/AR.

### Error Handling
- `slug_taken` 409.
- `upload_failed` 502.
- `validation_failed` 422 with field-level errors.

### Logging & Analytics
- `admin.activity.create` `{ activity_id, name_en }`.
- `admin.upload.success` / `admin.upload.failed`.

### Testing Notes
- Unit: slug normaliser, EN/AR required validation.
- E2E: complete form, save, see row in `/admin/activities`.

### Related User Stories
- US-AB-004 (edit).
- US-AB-005 (archive).
- US-AC-001 (File 02) public listing.

### Dependencies
- `activities` (File 02), `categories` (File 02), `audit_logs` (this file), Supabase Storage `cms` bucket.

### Tags
`admin` · `activity` · `create` · `cms` · `i18n`

### Notes / Rationale
The activity is the atomic unit of catalog content. Making creation self-service for the content admin removes the bottleneck of engineering tickets for every new offering.

---

## US-AB-004 — Activity edit including slug rename with 301 redirect

### Story
As a content admin,
I want to edit any field of an existing activity and rename its slug with the system automatically registering a 301 redirect from the old slug,
So that marketing URLs can be evolved without breaking inbound links or SEO rank.

### Priority: P0
### Status: Draft
### Estimate: 8
### Sprint: Sprint 2 — Catalog MVP

### Actors
- **Primary actor:** Content admin.
- **System actor:** ISR revalidation, slug-redirect registry, public routing middleware.

### Preconditions
1. Activity exists.
2. Admin has `content_admin` or `super_admin` role.

### Postconditions
1. The `activities` row is updated with the new field values.
2. If the slug changed, a row in `slug_history` records `old_slug → new_slug`, and the public routing layer issues a 301 from the old URL.
3. ISR is revalidated.
4. `audit_logs` row captures the diff.

### Main Flow (Happy Path)
1. Admin opens `/admin/activities/[id]`.
2. Form prefilled with current values; EN/AR tabs.
3. Admin edits a field (e.g. short_description, capacity, is_private_only).
4. Admin edits the slug from `rowing` to `rowing-on-the-nile`.
5. Admin clicks "Save".
6. Server detects the slug change and runs in a single transaction:
   - `update activities set slug='rowing-on-the-nile' where id = ...`.
   - `insert into slug_history (old_slug, new_slug, entity_type, redirected_at) values ('rowing', 'rowing-on-the-nile', 'activity', now())`.
   - `insert into audit_logs (...)`.
7. ISR revalidation fires for `/`, `/activities`, `/activities/rowing-on-the-nile`.
8. Public traffic to `/activities/rowing` is matched by `slug_history` and returns 301 to `/activities/rowing-on-the-nile`.

### Alternate Flows

#### A1 — Slug unchanged
1. No `slug_history` row inserted.

#### A2 — Slug rename chain (a → b → c)
1. After two renames, traffic to `a` 301s to `b` 301s to `c` — or, depending on a setting, directly to `c`. The default is the chained redirect; the admin can opt for a direct redirect by deleting intermediate rows.

#### A3 — Rename a slug that is already a known old_slug
1. The system refuses and surfaces an error "Slug was used historically; pick a different one or restore the historical record first."

### Exception Flows

#### E1 — Concurrent edit conflict
1. The server returns 409 with "Activity was modified by another admin; reload to see the latest version."

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Activity edit + slug rename

  Scenario: Edit non-slug field
    Given activity "rowing" has short_description_en="Rowing on the Nile"
    When admin updates it to "Rowing with Oar & Sail on the Nile"
    Then the activities.short_description row is updated
      And an audit_logs row records the change
      And ISR is revalidated for /activities/rowing

  Scenario: Slug rename registers 301
    Given activity "rowing" exists
    When admin renames the slug to "rowing-on-the-nile"
    Then a slug_history row exists with old_slug="rowing" and new_slug="rowing-on-the-nile"
      And GET /activities/rowing returns 301 to /activities/rowing-on-the-nile

  Scenario: Slug rename chain
    Given activity was renamed from "rowing" to "rowing-foundation" to "rowing-on-the-nile"
    When a visitor hits /activities/rowing
    Then the response is 301 to /activities/rowing-foundation
      And a follow-up 301 to /activities/rowing-on-the-nile

  Scenario: Slug collision refused
    Given another activity has slug="rowing-on-the-nile"
    When admin tries to rename an activity to the same slug
    Then the form surfaces "slug already in use"
```

### Edge Cases
1. Renaming a slug that already exists in `slug_history` as a `new_slug` — refused.
2. Renaming while a customer is mid-booking — the booking is keyed by `slot_id` (File 03), not by slug; booking flow unaffected.
3. Public traffic during the rename window — race-safe via the single-transaction insert.
4. SEO sitemap update — regenerated within 60 s of save.

### UI/UX Specifications
- Same form as US-AB-003, prefilled.
- Slug field shows a "History" popover with the list of old slugs and a "Delete redirect" link per row.
- Save bar shows a "Save & preview" button that opens the public page in a new tab.

### Data Model
- Mutates `activities` (File 02).
- Mutates `slug_history`:

```sql
slug_history
  old_slug      text primary key
  new_slug      text not null
  entity_type   text not null check (entity_type in ('activity','coach','event','cms_block'))
  redirected_at timestamptz not null default now()
  redirect_count bigint not null default 0  -- incremented on every 301 hit (capped at 1000)
  -- RLS: admin SELECT; INSERT via service role
```

### API Endpoints
- `PATCH /api/admin/activities/[id]` — body fields.
- `POST /api/admin/activities/[id]/rename-slug` — body `{ new_slug }`.
- `POST /api/admin/revalidate` — internal.

### Security Considerations
- Slug regex: `^[a-z0-9-]+$`, length 3–80, lowercased.
- Slug rename history is immutable; deletion is admin-only and audited.

### Performance Requirements
- Rename p95 < 500 ms.
- 301 lookup p95 < 50 ms via a unique index on `old_slug`.

### Notifications
- None.

### Localization
- All field labels EN/AR; slug is ASCII.

### Error Handling
- `slug_taken` 409.
- `slug_invalid_format` 422.
- `concurrent_modification` 409.

### Logging & Analytics
- `admin.activity.update` `{ activity_id, fields_changed[] }`.
- `admin.activity.rename_slug` `{ old_slug, new_slug }`.
- `redirect.301_hit` `{ old_slug, new_slug }` (sampled at 1%).

### Testing Notes
- E2E: rename; hit old URL; assert 301; visit new URL; assert content.

### Related User Stories
- US-AB-017 (manual slug redirect mapping).
- US-AC-002 (File 02) detail page depends on slug uniqueness.

### Dependencies
- `activities`, `slug_history`, `audit_logs`, public routing middleware.

### Tags
`admin` · `activity` · `slug` · `301` · `seo` · `isr`

### Notes / Rationale
SEO is a slow-to-rebuild asset. Losing a 200-rank URL because a marketing team renamed an activity would be a recoverable-but-costly error; 301 chains preserve link equity.

---

## US-AB-005 — Activity archive (soft delete)

### Story
As a content admin,
I want to archive an activity (set `status='archived'`) without losing the existing bookings tied to it,
So that I can retire a defunct offering while keeping historical records and customers' bookings intact.

### Priority: P0
### Status: Draft
### Estimate: 3
### Sprint: Sprint 2 — Catalog MVP

### Actors
- **Primary actor:** Content admin.

### Preconditions
1. Activity exists with `status='published'` or `status='draft'`.
2. Future bookings may exist (US-AB-005 E1 must be handled).

### Postconditions
1. `activities.status='archived'`.
2. Existing `bookings` and `booking_events` rows preserved.
3. The activity disappears from public listings, the home teaser, and search.
4. ISR revalidation fires.
5. `audit_logs` row records the archive.

### Main Flow (Happy Path)
1. Admin opens `/admin/activities/[id]`.
2. Clicks "Archive".
3. Confirm dialog: "Archive [name]? Existing bookings will be preserved; the activity will no longer appear on the public site. You can restore it within 30 days from the audit log."
4. Confirms.
5. Server sets `status='archived'`, inserts an `audit_logs` row, and triggers ISR revalidation.

### Alternate Flows

#### A1 — Restore from archive
1. Within 30 days, the audit log entry exposes a "Restore" action.
2. Admin clicks Restore; status flips to `draft` (manual re-publish required).

#### A2 — Activity has future bookings
1. The confirm dialog shows "This activity has 4 future bookings. They will be preserved and customers will not be affected." Admin proceeds or cancels.

### Exception Flows

#### E1 — Activity has confirmed bookings within the next 24 hours
1. The confirm dialog adds a red banner: "There are 2 bookings in the next 24 hours. Refund or reassign them first (link to `/admin/bookings?activity=...`)."
2. The action is still allowed; the banner is a warning, not a block.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Activity archive

  Scenario: Archive an activity with no future bookings
    Given an activity "rowing" has no future bookings
    When admin archives it
    Then activities.status becomes "archived"
      And an audit_logs row exists with action="activity_archive"
      And the activity disappears from /activities, /, and search
      And existing historical bookings remain queryable

  Scenario: Archive an activity with future bookings preserves them
    Given activity "rowing" has 4 future bookings
    When admin archives it
    Then the 4 future bookings are preserved
      And the activity is hidden from public listings
      And a confirm dialog warning was shown

  Scenario: Restore within 30 days
    Given an activity was archived 5 days ago
    When admin clicks "Restore" from the audit log
    Then the activity's status becomes "draft" (not "published")
      And the admin must re-publish to make it public
```

### Edge Cases
1. Activity has customers in the booking flow mid-session — the slot availability query is unaffected because slots reference `slot_template_id` (File 02) not the activity status; the `/booking` page filters out archived activities at the activity-picker step.
2. The archived activity's coach assignments are preserved in `activity_coaches` (File 02).
3. The activity's reviews are preserved in `reviews`.

### UI/UX Specifications
- The activity list view has a "Status" column with a pill: `published`, `draft`, `archived`.
- A filter chip "Archived" toggles inclusion of archived rows in the list.
- The Restore button appears on the archived activity's edit page header.

### Data Model
- Updates `activities.status='archived'`.
- Inserts `audit_logs`.
- No new tables.

### API Endpoints
- `POST /api/admin/activities/[id]/archive` — body `{ reason? }`.
- `POST /api/admin/activities/[id]/restore` — body `{ reason? }`.

### Security Considerations
- Role check `content_admin` or `super_admin`.
- Restore within 30 days is enforced by the audit log row's `created_at`; after 30 days the Restore action is hidden (the row is still in the log for compliance).

### Performance Requirements
- Archive p95 < 300 ms.
- ISR revalidation p95 < 1 s for the affected routes.

### Notifications
- None for the archive action; but the bookings-preserved detail is shown in the confirm dialog.

### Localization
- Confirm dialog copy EN/AR.

### Error Handling
- `archive_failed` 500 with retry.

### Logging & Analytics
- `admin.activity.archive` `{ activity_id }`.
- `admin.activity.restore` `{ activity_id }`.

### Testing Notes
- E2E: archive; assert public listing; assert booking preserved.

### Related User Stories
- US-AB-003 (create), US-AB-004 (edit), US-AC-001 (File 02) public filtering.

### Dependencies
- `activities`, `audit_logs`, ISR revalidation.

### Tags
`admin` · `activity` · `archive` · `soft-delete`

### Notes / Rationale
Soft delete is the only safe option in a system with financial transactions. A hard delete would break the booking history and the audit trail.

---

## US-AB-006 — Pricing tier CRUD per activity

### Story
As a content admin (or finance admin),
I want to manage pricing tiers per activity (e.g. Rowing Onboarding 200 EGP, Rowing Foundation 200 EGP, Rowing Performance 200 EGP, Rowing Elite 200 EGP, Rowing Private 400 EGP), each with `tier_code`, EN/AR name, duration, capacity, default flag, enabled flag, and display order,
So that the catalog pricing stays in sync with the business's evolving commercial structure.

### Priority: P0
### Status: Draft
### Estimate: 8
### Sprint: Sprint 2 — Catalog MVP

### Actors
- **Primary actor:** Content or finance admin.
- **System actor:** `/admin/pricing/tiers` and `/admin/activities/[id]` (inline tier editor).

### Preconditions
1. Activity exists (or is being created).
2. Admin has `content_admin`, `finance_admin`, or `super_admin` role.

### Postconditions
1. `activity_pricing_tiers` rows reflect the new tier set.
2. `audit_logs` rows record each tier mutation.

### Main Flow (Happy Path)
1. Admin opens `/admin/pricing/tiers` to manage all tiers across all activities in one table, OR `/admin/activities/[id]` to manage tiers scoped to one activity.
2. Adds a new tier for Rowing: tier_code=`onboarding`, name EN=`Onboarding`, AR=`تأهيل`, duration_minutes=60, price_egp=20000, capacity=4, is_default=true, enabled=true, display_order=100.
3. Saves; the row is upserted (unique on `activity_id + tier_code`).
4. ISR is revalidated for the activity detail page.

### Alternate Flows

#### A1 — Edit tier price
1. Admin changes the price from 200 EGP to 220 EGP.
2. Server validates that no in-flight booking depends on the old price (the booking's `line_items` snapshot the price; future bookings pick up the new price).

#### A2 — Disable tier
1. Admin sets `enabled=false` on a tier; the public activity page no longer lists it.
2. Existing bookings on that tier are preserved.

#### A3 — Default tier change
1. Admin marks Performance as the new default; the form automatically un-sets the prior default.
2. Server ensures exactly one default per activity.

### Exception Flows

#### E1 — Setting a price that breaks a customer with an open cart
1. The server allows the change; the in-flight booking is re-priced on next load.

#### E2 — Negative or zero price
1. Validation rejects 0; the only allowed value is `>= 0` (0 is the free-tier use case).

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Pricing tier CRUD

  Scenario: Add a new tier
    Given activity "rowing" exists with no tiers
    When admin adds tier_code="onboarding", price_egp=20000, duration_minutes=60, capacity=4, is_default=true
    Then an activity_pricing_tiers row exists for Rowing onboarding at 200 EGP
      And the row is marked default

  Scenario: Edit tier price
    Given the Onboarding tier is 20000 piasters
    When admin changes it to 22000 piasters
    Then the new row exists at 22000
      And the audit log records before=20000, after=22000

  Scenario: Disable a tier
    Given the Elite tier is enabled
    When admin sets enabled=false
    Then it disappears from the public detail page
      And existing bookings on Elite are unaffected

  Scenario: Two defaults
    Given Performance is the default
    When admin sets Onboarding as the default too
    Then the server rejects with 422 "exactly one default required"
```

### Edge Cases
1. Bulk import via CSV (US-AB-006 future enhancement).
2. Tier order change via drag-and-drop.
3. Tier code uniqueness is per activity; the same code can exist on different activities.
4. Deleting a tier with future bookings is blocked; admin must first reassign or cancel those bookings.

### UI/UX Specifications
- Tier table 5 columns: tier_code, name (EN/AR inline), price, duration, enabled, default, actions.
- Inline edit on click; modal edit for full form.
- "Add tier" button at the bottom of the table.

### Data Model
- Mutates `activity_pricing_tiers` (File 02 DDL).
- `price_egp` is integer piasters.

### API Endpoints
- `POST /api/admin/activities/[id]/tiers` — create.
- `PATCH /api/admin/activities/[id]/tiers/[tier_id]` — update.
- `DELETE /api/admin/activities/[id]/tiers/[tier_id]` — soft delete (enabled=false).
- `POST /api/admin/activities/[id]/tiers/reorder` — body `{ ids: [...] }`.

### Security Considerations
- Role check `content_admin`, `finance_admin`, or `super_admin`.
- Price is integer piasters; no floats allowed.
- `is_default` toggle is server-enforced to keep at most one default per activity.

### Performance Requirements
- Tier save p95 < 300 ms.
- Public activity page ISR p95 < 1 s after revalidation.

### Notifications
- None.

### Localization
- All form labels EN/AR; price formatted with locale.

### Error Handling
- `price_invalid` 422.
- `multiple_defaults` 422.
- `tier_in_use` 422 with a deep link to bookings.

### Logging & Analytics
- `admin.tier.create` / `admin.tier.update` / `admin.tier.delete` per mutation.
- Audit row per change.

### Testing Notes
- Unit: default-uniqueness constraint.
- E2E: add tier, edit, disable.

### Related User Stories
- US-AB-003 (create activity), US-AB-004 (edit activity).
- US-AC-002 (File 02) public detail page.

### Dependencies
- `activity_pricing_tiers` (File 02), `audit_logs` (this file).

### Tags
`admin` · `pricing` · `tier` · `i18n`

### Notes / Rationale
Tiers are the levers the business uses to differentiate customers. Keeping them editable in a tight UI prevents the "ask engineering for a price change" bottleneck.

---

## US-AB-007 — Add-on management (global + per-activity)

### Story
As a content admin,
I want to manage optional add-ons that customers can purchase at checkout — both global add-ons (e.g. "Wetsuit rental 50 EGP") and per-activity add-ons (e.g. "GoPro footage 200 EGP" only on Wakeboard),
So that the academy can monetise its equipment and content without engineering tickets.

### Priority: P1
### Status: Draft
### Estimate: 5
### Sprint: Sprint 2 — Catalog MVP

### Actors
- **Primary actor:** Content admin.

### Preconditions
1. Admin has `content_admin` or `super_admin` role.

### Postconditions
1. `activity_add_ons` rows reflect the new add-on set.
2. Audit rows recorded.

### Main Flow (Happy Path)
1. Admin opens `/admin/pricing/addons`.
2. Sees two tabs: "Global" and "Per-activity".
3. Adds a global add-on: name EN=`Wetsuit rental`, AR=`استئجار بدلة`, price_egp=5000, enabled=true, display_order=100.
4. Adds a per-activity add-on: activity=`wakeboard`, name EN=`GoPro footage`, AR=`لقطات جوبرو`, price_egp=20000, enabled=true.
5. Saves; both rows are committed.

### Alternate Flows

#### A1 — Add-on is activity-specific
1. The `activity_id` is set; the add-on appears in the Wakeboard booking flow's add-on list only.

#### A2 — Disable globally
1. The row's `enabled=false`; the public activity page and booking flow hide it.

### Exception Flows

#### E1 — Add-on with future bookings
1. Disabling an add-on is allowed; in-flight bookings retain the snapshot in `booking_line_items`.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Add-on management

  Scenario: Add a global add-on
    When admin adds "Wetsuit rental" at 50 EGP, activity_id=null
    Then an activity_add_ons row exists with activity_id=null and enabled=true

  Scenario: Add a per-activity add-on
    When admin adds "GoPro footage" at 200 EGP, activity_id=<wakeboard>
    Then the row exists with the activity_id
      And the Wakeboard booking flow shows it as an add-on option

  Scenario: Disable an add-on
    Given an add-on is enabled
    When admin sets enabled=false
    Then the public surfaces and booking flow hide it
      And existing bookings with the add-on retain the snapshot
```

### Edge Cases
1. Deleting an add-on with future bookings is blocked; admin must first disable.
2. A "free" add-on (price 0) is valid (e.g. complimentary water).
3. Display order can be set to negative for sticky first-position items.

### UI/UX Specifications
- Two-tab table; same columns.
- Inline edit.
- Bulk-enable / bulk-disable action.

### Data Model
- Mutates `activity_add_ons` (File 02 DDL).

### API Endpoints
- `POST /api/admin/addons`
- `PATCH /api/admin/addons/[id]`
- `POST /api/admin/addons/reorder`

### Security Considerations
- Role check.
- Integer price only.

### Performance Requirements
- Save p95 < 300 ms.

### Notifications
- None.

### Localization
- Names EN/AR.

### Error Handling
- `price_invalid` 422.

### Logging & Analytics
- `admin.addon.create` / `update` / `disable`.

### Testing Notes
- E2E: add global + per-activity; assert on booking flow.

### Related User Stories
- US-AB-006 (pricing tiers).
- US-BF-009 (File 03) booking flow add-on step.

### Dependencies
- `activity_add_ons` (File 02), `audit_logs` (this file).

### Tags
`admin` · `addon` · `pricing` · `i18n`

### Notes / Rationale
Equipment and content are an underused revenue line; the add-on UI is the simplest way to surface them.

---

## US-AB-008 — Session package CRUD

### Story
As a content admin (or finance admin),
I want to manage session packages (e.g. the canonical `8-pack-1-free` at 1600 EGP, valid 90 days, applies to any activity) with EN/AR name, session count, bonus count, price, activities-included, validity, enabled, and display order,
So that prepay bundles are a self-service commercial surface.

### Priority: P0
### Status: Draft
### Estimate: 5
### Sprint: Sprint 2 — Catalog MVP

### Actors
- **Primary actor:** Content or finance admin.

### Preconditions
1. Admin has `content_admin`, `finance_admin`, or `super_admin` role.

### Postconditions
1. `session_packages` rows reflect the new package set.
2. Audit rows recorded.

### Main Flow (Happy Path)
1. Admin opens `/admin/pricing/packages` (or the `/pricing` admin section).
2. Adds the canonical package: slug=`8-pack-1-free`, name EN=`8 sessions + 1 free`, AR=`٨ حصص + ١ مجانية`, session_count=8, bonus_count=1, price_egp=160000, activities_included=[] (empty = any), validity_days=90, enabled=true, display_order=100.
3. Saves; the row is committed and revalidation fires for `/pricing`.

### Alternate Flows

#### A1 — Edit price
1. Admin raises the price from 1600 EGP to 1800 EGP; existing customer packages retain their `price_egp` snapshot at purchase (File 04); new purchases get the new price.

#### A2 — Restrict to a subset of activities
1. `activities_included` is set to `[rowing, kayaking]`; the package CTA hides on SUP/Wakeboard/Fitness detail pages.

#### A3 — Disable a package
1. `enabled=false`; the package disappears from `/pricing`. Existing customer packages continue to be redeemable until expiry.

### Exception Flows

#### E1 — Validity days < session count × typical cadence
1. Server allows it; the warning "Validity less than typical cadence — confirm?" is shown.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Session package CRUD

  Scenario: Create the 8-pack-1-free package
    When admin creates slug="8-pack-1-free" with session_count=8, bonus_count=1, price_egp=160000, validity_days=90
    Then a session_packages row exists with that shape
      And /pricing shows the package

  Scenario: Edit price of an existing package
    Given "8-pack-1-free" is at 160000 piasters
    When admin changes the price to 180000
    Then the new row reflects 180000
      And existing customer_packages retain their 1600 EGP snapshot

  Scenario: Restrict package to specific activities
    When admin sets activities_included=[rowing, kayaking]
    Then the package is hidden on SUP/Wakeboard/Fitness pages
```

### Edge Cases
1. Deleting a package with active customer packages is blocked.
2. Two packages with the same slug — slug is unique by constraint.
3. Negative session count — validation rejects.

### UI/UX Specifications
- Table view with inline edit.
- Multi-select activities picker.

### Data Model
- Mutates `session_packages` (File 02 DDL).

### API Endpoints
- `POST /api/admin/packages`
- `PATCH /api/admin/packages/[id]`
- `POST /api/admin/packages/reorder`

### Security Considerations
- Role check.
- Slug regex.

### Performance Requirements
- Save p95 < 300 ms.

### Notifications
- None.

### Localization
- Names EN/AR.

### Error Handling
- `slug_taken` 409.
- `in_use` 422 with a deep link.

### Logging & Analytics
- `admin.package.create` / `update` / `disable`.

### Testing Notes
- E2E: create, edit, disable.

### Related User Stories
- US-AB-009 (membership tiers).
- US-CA-007 (File 04) customer's package wallet.

### Dependencies
- `session_packages` (File 02), `audit_logs`.

### Tags
`admin` · `package` · `pricing` · `i18n`

### Notes / Rationale
The 8-pack-1-free is the academy's existing promo (per `about.md`); locking its edit-ability to admins prevents accidental loss of the canonical offer.

---

## US-AB-009 — Membership tier CRUD

### Story
As a content or finance admin,
I want to manage membership tiers (e.g. `silver-monthly` at 1500 EGP/month with 4 sessions, valid for Rowing + Kayaking + SUP; `gold-monthly` at 3000 EGP/month with 12 sessions, all activities, benefits like "free wetsuit rental") with EN/AR names, monthly price, session count, activities-included, benefits array, is_popular, enabled, and display order,
So that monthly subscribers are a self-service commercial surface.

### Priority: P1
### Status: Draft
### Estimate: 5
### Sprint: Sprint 2 — Catalog MVP

### Actors
- **Primary actor:** Content or finance admin.

### Preconditions
1. Admin has `content_admin`, `finance_admin`, or `super_admin` role.

### Postconditions
1. `membership_tiers` rows reflect the new set.
2. Audit rows recorded.

### Main Flow (Happy Path)
1. Admin opens `/admin/pricing/memberships`.
2. Adds `silver-monthly`: slug=`silver-monthly`, name EN=`Silver Monthly`, AR=`الفضية الشهرية`, price_egp_monthly=150000, sessions_per_month=4, activities_included=[rowing, kayaking, sup], benefits=[{en:"Priority booking 7 days ahead", ar:"حجز مبكر قبل ٧ أيام"}, {en:"Free wetsuit rental", ar:"استئجار بدلة مجاناً"}], is_popular=false, enabled=true, display_order=200.
3. Saves.

### Alternate Flows

#### A1 — Mark `is_popular` on the gold tier
1. The `/pricing` page renders the gold card with a "Most Popular" pill.

#### A2 — Edit benefits list
1. Admin adds a benefit; the comparison table (File 02 US-AC-005) updates on next ISR.

### Exception Flows

#### E1 — Active memberships exist on this tier
1. Disabling is allowed; existing subscriptions continue to their term end.
2. Deleting is blocked; admin must first migrate subscribers.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Membership tier CRUD

  Scenario: Create silver-monthly
    When admin creates "silver-monthly" at 1500 EGP/month, 4 sessions, activities=[rowing,kayaking,sup]
    Then a membership_tiers row exists
      And /pricing shows the tier

  Scenario: Mark is_popular
    When admin sets gold-monthly.is_popular=true
    Then /pricing shows the gold card with a "Most Popular" pill

  Scenario: Active subscriptions block delete
    Given silver-monthly has 12 active subscriptions
    When admin attempts to delete it
    Then the action is blocked with a deep link to migrate
```

### Edge Cases
1. Two tiers with the same slug — rejected.
2. Empty benefits list — allowed; the card simply has no bullets.
3. `price_egp_monthly=0` — allowed (e.g. trial tier with admin approval only).

### UI/UX Specifications
- Table view; drag-and-drop reorder.
- Benefits editor: a list of {en, ar} pairs with add/remove.

### Data Model
- Mutates `membership_tiers` (File 02 DDL).

### API Endpoints
- `POST /api/admin/memberships`
- `PATCH /api/admin/memberships/[id]`
- `POST /api/admin/memberships/reorder`

### Security Considerations
- Role check.

### Performance Requirements
- Save p95 < 300 ms.

### Notifications
- None.

### Localization
- Names and benefits EN/AR.

### Error Handling
- `slug_taken` 409.
- `has_active_subscriptions` 422 with deep link.

### Logging & Analytics
- `admin.membership.create` / `update` / `disable`.

### Testing Notes
- E2E: create, edit, popular flag, disable.

### Related User Stories
- US-AB-008 (session packages).
- US-CA-008 (File 04) customer's membership wallet.

### Dependencies
- `membership_tiers` (File 02), `audit_logs`.

### Tags
`admin` · `membership` · `pricing` · `i18n`

### Notes / Rationale
Memberships are the academy's recurring-revenue line; a small set of admin-controllable tiers keeps the offering tight.

---

## US-AB-010 — Coach create / archive

### Story
As a content admin,
I want to create a coach record (linking to a `profiles` user), set specialties, certifications, languages, Instagram handle, EN/AR bio, avatar, display order, and status, and to archive coaches when they leave,
So that the public `/coaches/[slug]` page stays current and the coach panel access (File 08) is bound to a real coach record.

### Priority: P0
### Status: Draft
### Estimate: 5
### Sprint: Sprint 2 — Catalog MVP

### Actors
- **Primary actor:** Content admin.
- **Secondary actor:** The new coach (receives a welcome WhatsApp).

### Preconditions
1. The user being made a coach already has a `profiles` row with a verified phone.

### Postconditions
1. A `coaches` row exists (File 02) with `user_id=<target>` and `status='published'`.
2. `profiles.role` flips to `coach` if not already.
3. The new coach receives a WhatsApp template `aqualudo_coach_welcome_v1`.
4. Audit row recorded.

### Main Flow (Happy Path)
1. Admin opens `/admin/coaches/new`.
2. Form: user search (email or phone), specialties multi-select (Rowing, Kayaking, SUP, Wakeboard, Fitness), certifications jsonb editor, languages (EN, AR), Instagram handle, bio EN, bio AR, avatar uploader, display_order, status.
3. Admin searches for "Salma Akl" with phone +201011329642; the matching profile appears.
4. Admin fills the rest and saves.
5. Server inserts the `coaches` row, updates `profiles.role='coach'`, fires the WhatsApp, writes audit.

### Alternate Flows

#### A1 — Archive a coach
1. Admin opens `/admin/coaches/[id]`, clicks "Archive".
2. Confirm: "Archive [name]? They will lose access to `/coach/*`. Their future bookings can be reassigned."
3. Status flips to `archived`; the user's `/coach/*` access is revoked (File 08) by removing the role.

#### A2 — Coach already has future bookings
1. The confirm dialog shows a count and a deep link to `/admin/bookings?coach=...` for reassignment.

### Exception Flows

#### E1 — Phone not verified
1. The form blocks save.

#### E2 — User is already a coach
1. The search returns the existing row; the form is "Edit" mode.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Coach create / archive

  Scenario: Create a coach from an existing profile
    Given user "Salma Akl" with phone +201011329642 exists
    When admin creates a coach for Salma with specialties=[rowing, sup], languages=[en, ar]
    Then a coaches row exists with user_id=<Salma>
      And profiles.role is "coach"
      And a WhatsApp is sent with template "aqualudo_coach_welcome_v1"

  Scenario: Archive a coach
    Given coach "ahmed-z" is published
    When admin archives the coach
    Then coaches.status becomes "archived"
      And /coaches/ahmed-z returns 404 publicly
      And Ahmed loses /coach/* access at next sign-in
```

### Edge Cases
1. Two coaches with the same user_id — uniqueness constraint blocks.
2. The coach's avatar upload fails — server uses the profile's existing avatar as fallback.
3. Bio is long (> 1000 chars) — form enforces a 1000-char cap per locale.

### UI/UX Specifications
- Same form shape as the activity form; user search is a typeahead.
- Specialties picker is a checkbox group; languages are toggle pills.
- Avatar uploader 200×200 crop.

### Data Model
- Mutates `coaches` (File 02 DDL).
- Updates `profiles.role`.
- Inserts `audit_logs`.

### API Endpoints
- `POST /api/admin/coaches`
- `PATCH /api/admin/coaches/[id]`
- `POST /api/admin/coaches/[id]/archive`
- `POST /api/admin/coaches/[id]/restore`

### Security Considerations
- Role check `content_admin` or `super_admin`.
- `user_id` is verified to exist in `auth.users`.

### Performance Requirements
- Save p95 < 500 ms.

### Notifications
- Welcome template `aqualudo_coach_welcome_v1` EN+AR.
- Coach profile edits enqueue a revalidation for `/coaches/[slug]`.

### Localization
- Bio EN/AR.

### Error Handling
- `user_not_found` 404.
- `phone_unverified` 422.

### Logging & Analytics
- `admin.coach.create` / `update` / `archive` / `restore`.

### Testing Notes
- E2E: create coach, assert public profile.

### Related User Stories
- US-AC-008 (File 02) public profile.
- US-CO-001 (File 08) coach sign-in flow.
- US-AB-011 (this file) slot template management.

### Dependencies
- `coaches` (File 02), `profiles`, `audit_logs`.

### Tags
`admin` · `coach` · `cms` · `i18n`

### Notes / Rationale
A coach is a high-trust entity; we ensure they have a verified phone before granting role escalation.

---

## US-AB-011 — Coach slot template management

### Story
As a content admin,
I want to manage each coach's weekly recurring availability (slot templates) — per activity, day_of_week 0–6, start/end time, capacity — with a "next 14 days" preview that lists the concrete slots generated from the templates,
So that the booking flow has accurate real-time availability without engineering tickets per coach.

### Priority: P0
### Status: Draft
### Estimate: 8
### Sprint: Sprint 2 — Catalog MVP

### Actors
- **Primary actor:** Content admin.

### Preconditions
1. The coach exists (US-AB-010).
2. Activities exist for the academy.

### Postconditions
1. `coach_slot_templates` rows reflect the new templates.
2. The next 14-day concrete slot list is generated and rendered.
3. Audit rows recorded.

### Main Flow (Happy Path)
1. Admin opens `/admin/coaches/[id]/slot-templates`.
2. Sees a 7-row × time-grid editor.
3. Adds a Saturday 09:00–12:00 block for Rowing, capacity=4. (The system creates 3 one-hour slots.)
4. Saves; the templates are committed and the 14-day preview is regenerated.
5. Future bookings can now pick these slots.

### Alternate Flows

#### A1 — Coach submits a slot template request (File 08 US-CO-009)
1. The admin sees a "Pending requests" tab.
2. Approves or rejects; on approve, a template row is created.

#### A2 — Edit an existing template
1. Admin changes the time; the 14-day preview updates.
2. In-flight bookings on the old slot are preserved; new bookings use the new times.

#### A3 — Remove a template
1. Admin deletes; future concrete slots are cancelled (no booking impact unless a booking exists, in which case the admin is warned).

### Exception Flows

#### E1 — Time conflict
1. The form detects an overlap and surfaces "Time conflict with [existing template]".

#### E2 — Capacity > activity max_capacity
1. Validation rejects with a hint to lower the slot capacity.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Coach slot template management

  Scenario: Add a Saturday morning block
    When admin adds day_of_week=6, start=09:00, end=12:00, activity=rowing, capacity=4
    Then three coach_slot_templates rows exist (09:00, 10:00, 11:00) with day_of_week=6
      And the 14-day preview lists the concrete slots for the next two Saturdays

  Scenario: Time conflict
    Given a Saturday 09:00–12:00 block exists
    When admin adds a Saturday 11:00–13:00 block
    Then the form surfaces a time-conflict error

  Scenario: Approve a coach's request
    Given a coach submitted a request to add Tuesday 18:00–20:00 Kayaking
    When admin approves
    Then two coach_slot_templates rows are inserted (18:00, 19:00) for the coach
      And the coach sees the request marked "approved" in their panel
```

### Edge Cases
1. Time zone: all times are stored in `Africa/Cairo`; rendering respects the active locale.
2. A coach with overlapping templates for two activities is allowed (the system picks the one matching the booking's activity).
3. The 14-day preview re-generates on every save; the concrete slots table is append-only on the historical side, future slots regenerated.

### UI/UX Specifications
- 7-column weekly grid; each cell shows the templates covering that day.
- Drag to extend; click to edit.
- 14-day preview is a separate tab.

### Data Model
- Mutates `coach_slot_templates` (File 02 DDL).
- Reads `activities` (File 02) for the activity picker.

### API Endpoints
- `GET /api/admin/coaches/[id]/slot-templates`
- `POST /api/admin/coaches/[id]/slot-templates`
- `PATCH /api/admin/coaches/[id]/slot-templates/[template_id]`
- `DELETE /api/admin/coaches/[id]/slot-templates/[template_id]`
- `POST /api/admin/coaches/[id]/slot-templates/requests/[request_id]/approve`
- `POST /api/admin/coaches/[id]/slot-templates/requests/[request_id]/reject`

### Security Considerations
- Role check.
- `day_of_week` validated 0–6.
- `start < end`.

### Performance Requirements
- Save p95 < 500 ms.
- 14-day preview regeneration p95 < 1 s.

### Notifications
- On approval, the coach receives `aqualudo_slot_template_approved_v1` via dispatcher.

### Localization
- Day labels EN/AR (Mon, Tue, ...).

### Error Handling
- `time_conflict` 422.
- `capacity_exceeds_activity` 422.

### Logging & Analytics
- `admin.slot_template.create` / `update` / `delete` / `approve_request` / `reject_request`.

### Testing Notes
- Unit: 09:00–12:00 → 3 templates.
- E2E: add block, preview, approve coach request.

### Related User Stories
- US-AB-010 (coach create).
- US-CO-009 (File 08) coach's request flow.
- US-BF-005 (File 03) slot availability.

### Dependencies
- `coach_slot_templates` (File 02), `audit_logs`, dispatcher.

### Tags
`admin` · `slot` · `schedule` · `coach`

### Notes / Rationale
The slot template is the bridge between coach availability and the booking flow's slot picker. Centralising the edit here keeps the surface consistent.

---

## US-AB-012 — Event CRUD

### Story
As a content admin,
I want to create and edit events (e.g. "Run & Row Challenge 2026", "Ramadan Iftar 2026", "Nationals Regatta 2026") with EN/AR copy, hero image, start/end timestamps, location name, address jsonb, capacity, pricing notes jsonb array, and status (draft / published / archived),
So that the public `/events/[slug]` page and the booking deep link `/booking?event=[slug]` stay in sync with the academy's calendar.

### Priority: P1
### Status: Draft
### Estimate: 5
### Sprint: Sprint 3 — Events & Marketing

### Actors
- **Primary actor:** Content admin.

### Preconditions
1. Admin has `content_admin` or `super_admin` role.

### Postconditions
1. `events` row reflects the new shape.
2. Public `/events/[slug]` page renders if `status='published'`.
3. Audit row recorded.

### Main Flow (Happy Path)
1. Admin opens `/admin/events/new`.
2. Fills the form: slug=`run-row-2026`, name EN=`Run & Row Challenge 2026`, AR=`تحدي الجري والتجديف ٢٠٢٦`, description EN+AR, hero image, start_at=`2026-07-31 07:30:00+02`, end_at=`2026-07-31 10:30:00+02`, location_name EN=`Oar & Sail Academy`, AR=`أكاديمية أوار آند سايل`, address EN+AR, capacity=60, pricing_notes=[{name:"Tier 1 — Starter", price_egp:0}], status=draft.
3. Saves; ISR revalidates `/events` and `/events/run-row-2026` on publish.

### Alternate Flows

#### A1 — Auto-archive after end_at
1. A daily cron sets `status='archived'` for any event with `end_at < now() - interval '1 day'`. The admin can also archive manually.

#### A2 — Pricing notes array
1. The admin enters tiers with `name` and `price_egp_int`. The public event page renders the price list.

#### A3 — Promote to featured
1. A boolean `is_featured` flag is added; featured events appear in the home events teaser.

### Exception Flows

#### E1 — Event with `end_at < start_at`
1. Validation rejects.

#### E2 — Capacity < bookings count
1. Capacity reduce is allowed; admin is warned "12 bookings exist; reducing capacity below 12 will not cancel them."

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Event CRUD

  Scenario: Create an event
    When admin creates slug="run-row-2026" with start_at 2026-07-31 07:30, end_at 2026-07-31 10:30, capacity 60
    Then an events row exists
      And /events/run-row-2026 renders if status="published"

  Scenario: Auto-archive after end_at
    Given event end_at is 2026-06-09 11:00
      And current date is 2026-06-11
    When the daily cron runs
    Then the event's status is "archived"

  Scenario: Pricing notes array
    When admin adds [{name:"Starter", price_egp:0}, {name:"Pro", price_egp:20000}]
    Then the event page renders the two tiers with their prices
```

### Edge Cases
1. Event has a payment tier with `price_egp=0` (free) — the booking CTA "Reserve" is enabled and no Paymob is invoked.
2. Event at the same time as another event — allowed; capacity is per-event.
3. Event slug collision — rejected.

### UI/UX Specifications
- Form with EN/AR tabs; image uploader; date pickers in `Africa/Cairo`.
- Pricing notes editor: a list of {name, price_egp_int} rows.

### Data Model
- Mutates `events` (File 02 DDL).

### API Endpoints
- `POST /api/admin/events`
- `PATCH /api/admin/events/[id]`
- `POST /api/admin/events/[id]/archive`

### Security Considerations
- Role check.
- `start_at < end_at`.

### Performance Requirements
- Save p95 < 500 ms.

### Notifications
- On publish, an admin notification fires if the admin has a Slack/email integration enabled (deferred to v2).

### Localization
- All copy EN/AR.

### Error Handling
- `end_before_start` 422.
- `slug_taken` 409.

### Logging & Analytics
- `admin.event.create` / `update` / `archive`.

### Testing Notes
- E2E: create event, assert public page, simulate cron.

### Related User Stories
- US-AC-009 (File 02) public events page.
- US-BF-002 (File 03) booking with `?event=` pre-select.

### Dependencies
- `events` (File 02), `audit_logs`, cron.

### Tags
`admin` · `event` · `cms` · `i18n`

### Notes / Rationale
Events are the academy's marquee marketing surface; making the CRUD self-service is a key operational unblock.

---

## US-AB-013 — Reviews moderation queue

### Story
As a content admin,
I want a moderation queue that lists every `pending` review submitted by a verified customer (one per booking, per File 02 US-AC-006), lets me approve or reject with a reason, and notifies the rejected author privately via WhatsApp,
So that the public review surface stays clean and we have a transparent, auditable rejection trail.

### Priority: P0
### Status: Draft
### Estimate: 5
### Sprint: Sprint 4 — Reviews & Quality

### Actors
- **Primary actor:** Content admin.
- **Secondary actor:** The rejected review's author (receives WhatsApp).

### Preconditions
1. At least one `reviews` row exists with `status='pending'`.

### Postconditions
1. Approved reviews get `status='approved'`, `moderated_by=<admin>`, `moderated_at=now()`, and become visible on the public activity page (File 02 US-AC-006).
2. Rejected reviews get `status='rejected'`, `rejection_reason`, `moderated_by`, `moderated_at`. The author receives a WhatsApp template `aqualudo_review_rejected_v1` with the reason.
3. Audit row recorded per moderation action.

### Main Flow (Happy Path)
1. Admin opens `/admin/reviews`.
2. Sees a list of pending reviews with: rating, body excerpt, author name, activity, booking id, submitted_at.
3. Opens a review: full body, customer context (booking, attendance, prior reviews).
4. Approves: the row flips to `status='approved'`, the public activity page picks it up on next ISR.
5. Audit row recorded.

### Alternate Flows

#### A1 — Reject with reason
1. Admin picks "Reject", enters a reason from a dropdown ("Offensive language", "Spam", "Mentions competitor", "Other — free text").
2. The row flips to `status='rejected'`.
3. The dispatcher enqueues `aqualudo_review_rejected_v1` in the customer's locale; the template body includes the reason text (truncated to 200 chars).
4. The author receives a WhatsApp privately; the rejection is not shown publicly.

#### A2 — Bulk approve
1. Admin selects 10 reviews, clicks "Approve all". All 10 are moderated in one transaction.

#### A3 — Filter by activity / rating / language
1. The list supports filters; URL params persist.

### Exception Flows

#### E1 — Rejected review has a subsequent approved review for the same booking
1. Impossible due to the unique `(booking_id)` constraint on `reviews` (File 02).

#### E2 — Customer has opted out of WhatsApp
1. The dispatch job is recorded as `failed` with `last_error='opted_out'`; the rejection still stands.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Reviews moderation

  Scenario: Approve a review
    Given a pending review for booking ROW-2026-0412 with rating=5
    When admin approves
    Then reviews.status becomes "approved"
      And the public activity page shows the review on next ISR
      And an audit_logs row exists

  Scenario: Reject with reason and notify author
    Given a pending review for booking ROW-2026-0412 with body containing profanity
    When admin rejects with reason="Offensive language"
    Then reviews.status becomes "rejected"
      And the rejection_reason is "Offensive language"
      And a WhatsApp is sent to the customer with template "aqualudo_review_rejected_v1"
      And the WhatsApp body includes the reason text

  Scenario: Bulk approve
    When admin selects 10 pending reviews and clicks "Approve all"
    Then 10 reviews flip to "approved" in one transaction
      And 10 audit rows are written

  Scenario: Author opted out
    Given the customer has whatsapp_conversations.status="opted_out"
    When admin rejects a review for that customer
    Then reviews.status becomes "rejected"
      And the WhatsApp dispatch job is recorded as "failed" with last_error="opted_out"
```

### Edge Cases
1. Review is for a coach — the same moderation flow applies; the coach sees it on their `/coach/ratings` page (File 08 US-CO-012) once approved.
2. Customer whose booking was later marked no-show — admin is shown a warning banner and can still approve.
3. Re-review after rejection is impossible (one per booking).

### UI/UX Specifications
- Two-pane layout: list left, detail right.
- Filter sidebar: status, activity, rating, locale, date.
- Bulk select with checkboxes; "Approve all" and "Reject all (with reason)" actions.

### Data Model
- Updates `reviews` (File 02 DDL) with `status`, `moderated_by`, `moderated_at`, `rejection_reason`.
- Inserts `audit_logs`.
- Enqueues `whatsapp_dispatch_jobs` (File 09 DDL).

### API Endpoints
- `GET /api/admin/reviews?status=pending|approved|rejected&q=`
- `POST /api/admin/reviews/[id]/approve`
- `POST /api/admin/reviews/[id]/reject` — body `{ reason }`.
- `POST /api/admin/reviews/bulk-approve` — body `{ ids: [...] }`.
- `POST /api/admin/reviews/bulk-reject` — body `{ ids: [...], reason }`.

### Security Considerations
- Role check `content_admin` or `super_admin`.
- The rejection reason is sanitised to prevent XSS in the WhatsApp body.
- The customer is notified privately — the rejection is not exposed publicly.

### Performance Requirements
- Approve p95 < 300 ms.
- Bulk approve 50 reviews p95 < 1 s.

### Notifications
- Rejection: `aqualudo_review_rejected_v1` EN+AR.
- Approval: optional `aqualudo_review_approved_v1` is **not** sent in v1 (the public surface is the notification).

### Localization
- Reason dropdown EN/AR; free-text reason uses the admin's locale for input.

### Error Handling
- `review_not_found` 404.
- `already_moderated` 409.

### Logging & Analytics
- `admin.review.approve` / `admin.review.reject`.
- Audit row per action.

### Testing Notes
- E2E: approve, reject, bulk.

### Related User Stories
- US-CA-014 (File 04) customer leaves review.
- US-AC-006 (File 02) public display.
- US-CO-012 (File 08) coach's view of their own reviews.

### Dependencies
- `reviews` (File 02), `whatsapp_templates` (File 09), `audit_logs` (this file).

### Tags
`admin` · `reviews` · `moderation` · `whatsapp` · `i18n`

### Notes / Rationale
Rejection notifications are private to the author. We do not post rejection reasons publicly because the academy values the community feeling; an angry author who gets rejected is still a customer.

---

## US-AB-014 — CMS editor for home/about content blocks

### Story
As a content admin,
I want a CMS editor for every content block that drives the public site (`home_hero`, `home_why_us`, `home_pillars`, `home_activities_teaser`, `impact_metrics`, `about_hero`, `about_narrative`, `about_pillars`, `about_team_teaser`, `about_cta_strip`, footer) with EN/AR tabs, draft/published status, preview, and publish-with-revalidation,
So that the marketing surface is editable without engineering tickets.

### Priority: P0
### Status: Draft
### Estimate: 13
### Sprint: Sprint 3 — Marketing CMS

### Actors
- **Primary actor:** Content admin.

### Preconditions
1. The content block row exists in `content_blocks` (File 01) — File 01 seeds defaults on first run.

### Postconditions
1. The block's `payload` is updated.
2. Status flips from `draft` to `published` (or back) on demand.
3. On publish, ISR revalidation fires for the affected routes.
4. Audit row recorded.

### Main Flow (Happy Path)
1. Admin opens `/admin/cms` and sees a list of content blocks grouped by page (Home, About, Footer).
2. Clicks "Edit" on `home_hero`.
3. The editor renders with EN/AR tabs side-by-side; the current `payload` is loaded.
4. Admin edits the EN hero title from "Discover Water Sports in Cairo with AquaLudo" to "Paddle Cairo's Nile with AquaLudo by Oar & Sail".
5. Saves as draft; the row's `status='draft'`, the published version remains the prior content.
6. Admin previews the draft via `/admin/cms/home_hero/preview?locale=en` (a static SSR route that does not affect production).
7. Admin clicks "Publish"; the row's `status='published'`, the `published_at` is set, and ISR revalidates `/`, `/ar`.

### Alternate Flows

#### A1 — Edit a list-shaped block (pillars, benefits)
1. The editor renders a list editor with add/remove/reorder.
2. The schema is block-specific; the editor switches schema based on the block slug.

#### A2 — Restore from `content_blocks_history`
1. The editor exposes a "History" tab listing prior published versions with timestamps.
2. Admin clicks "Restore this version"; the prior payload is restored and re-published.

#### A3 — Impact metrics
1. The `impact_metrics` block supports a `auto_recompute` flag; if true, the numbers derive from `count(*)` queries cached for 1 hour. The admin can override with `static_values`.

### Exception Flows

#### E1 — Publish fails
1. The row stays `draft`; an error toast surfaces; the audit row records the failure.

#### E2 — Concurrent edit
1. Optimistic locking on `updated_at`; a stale save returns 409 with "block was modified by another admin".

### Acceptance Criteria (Gherkin)

```gherkin
Feature: CMS editor

  Scenario: Edit and publish the home hero
    Given the home hero block is published with title_en="Discover Water Sports in Cairo with AquaLudo"
    When admin edits the EN title to "Paddle Cairo's Nile with AquaLudo by Oar & Sail"
      And clicks "Publish"
    Then content_blocks.payload.title.en is updated
      And content_blocks.status is "published"
      And ISR is revalidated for /
      And an audit_logs row records the publish

  Scenario: Edit list-shaped block (pillars)
    When admin adds a new pillar to home_why_us
    Then the payload.pillars array is appended
      And the preview reflects the new pillar
      And the publish commits the change

  Scenario: Restore from history
    Given the home hero was published twice with different titles
    When admin restores the first version
    Then content_blocks.payload.title.en reverts
      And an audit row records the restore

  Scenario: Concurrent edit conflict
    Given admin A saved a change at 14:01
    When admin B saves with a stale updated_at
    Then the response is 409 with "block was modified by another admin"
```

### Edge Cases
1. Two admins editing the same block — optimistic locking surfaces the conflict.
2. The block's payload schema is wrong (e.g. a `pillar` missing `enabled`) — validation rejects the save.
3. A new block slug is added in a future release — the editor auto-discovers it; admins see it in the list.

### UI/UX Specifications
- Sidebar lists blocks; the editor is the main pane.
- EN/AR tabs top right.
- Save bar bottom: "Save draft", "Publish", "Preview".
- History popover on the block header.

### Data Model
- Mutates `content_blocks` (File 01 DDL) and `content_blocks_history` (File 01 DDL).
- Inserts `audit_logs`.

### API Endpoints
- `GET /api/admin/cms/[block_slug]`
- `PATCH /api/admin/cms/[block_slug]` — body `{ payload, status }`.
- `POST /api/admin/cms/[block_slug]/publish`
- `POST /api/admin/cms/[block_slug]/restore` — body `{ history_id }`
- `GET /api/admin/cms/[block_slug]/preview?locale=en|ar`

### Security Considerations
- Role check `content_admin` or `super_admin`.
- Payload sanitised on render; the editor's payload is JSON Schema validated.

### Performance Requirements
- Save p95 < 500 ms.
- Preview SSR p95 < 800 ms.
- Publish + revalidation p95 < 1.5 s.

### Notifications
- None.

### Localization
- Editor itself is locale-aware: EN/AR tabs; preview in either locale.

### Error Handling
- `payload_invalid` 422 with field-level errors.
- `stale_version` 409.

### Logging & Analytics
- `admin.cms.edit` / `admin.cms.publish` / `admin.cms.restore`.

### Testing Notes
- E2E: edit, preview, publish, restore.

### Related User Stories
- US-LD-004..012 (File 01) public pages driven by these blocks.

### Dependencies
- `content_blocks`, `content_blocks_history` (File 01), `audit_logs` (this file), ISR revalidation.

### Tags
`admin` · `cms` · `marketing` · `i18n`

### Notes / Rationale
The marketing team needs a self-service surface for every section of the public site. The CMS is the simplest abstraction that supports EN/AR + draft/publish + history without becoming a heavyweight headless CMS.

---

## US-AB-015 — Business profile edit

### Story
As a content admin,
I want to edit the academy's business profile (single row: phone, WhatsApp, email, address jsonb EN+AR, map_query, instagram_handle, facebook_handle, tiktok_handle, opening_hours jsonb, newsletter_enabled) from a single form,
So that the footer, contact page, sticky WhatsApp button, and other public surfaces all reflect the same canonical business data.

### Priority: P0
### Status: Draft
### Estimate: 3
### Sprint: Sprint 1 — Foundation

### Actors
- **Primary actor:** Content admin.

### Preconditions
1. The `business_profile` row (File 01 DDL, id=1) exists.

### Postconditions
1. The row is updated.
2. ISR revalidates `/`, `/about`, `/contact`, `/pricing`, `/coaches`, `/events`, `/gallery`, `/booking`, all of which reference business_profile.
3. Audit row recorded.

### Main Flow (Happy Path)
1. Admin opens `/admin/business-profile`.
2. The form prefills with the current values.
3. Admin updates the phone from `+201011329642` to `+201550012345` (rare; example).
4. Saves; the row is updated; ISR revalidates the affected routes.

### Alternate Flows

#### A1 — Update opening hours
1. Opening hours is a jsonb `{ "mon":[{open:"06:00",close:"20:00"}], ... }`; the editor renders a weekly grid.
2. Saves; the contact page reflects the new hours.

#### A2 — Disable newsletter
1. Toggle `newsletter_enabled=false`; the footer's newsletter form is hidden.

### Exception Flows

#### E1 — Invalid phone format
1. E.164 validation; non-matching input is rejected with a hint.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Business profile edit

  Scenario: Update phone number
    Given business_profile.phone="+201011329642"
    When admin updates it to "+201550012345"
    Then business_profile.phone is "+201550012345"
      And ISR revalidates /contact, /, /footer surfaces
      And the contact page shows the new number

  Scenario: Update opening hours
    When admin sets opening hours to mon-fri 06:00-20:00, sat-sun 07:00-19:00
    Then the contact page reflects the new hours

  Scenario: Disable newsletter
    When admin sets newsletter_enabled=false
    Then the footer hides the newsletter form
```

### Edge Cases
1. Two admins edit at the same time — last write wins, with an audit log.
2. Phone format with spaces — server normalises to E.164.
3. The map_query is passed verbatim to Google Maps; the editor previews the link.

### UI/UX Specifications
- Single form, EN/AR labels.
- Phone field is a single input with E.164 placeholder.
- Opening hours weekly grid.

### Data Model
- Updates `business_profile` (File 01 DDL).
- Inserts `audit_logs`.

### API Endpoints
- `GET /api/admin/business-profile`
- `PATCH /api/admin/business-profile` — body fields.

### Security Considerations
- Role check.
- Phone E.164 validation.

### Performance Requirements
- Save p95 < 300 ms.

### Notifications
- None.

### Localization
- Address and hours are jsonb EN+AR.

### Error Handling
- `phone_invalid` 422.

### Logging & Analytics
- `admin.business_profile.update` per change.

### Testing Notes
- E2E: edit phone, see it on /contact.

### Related User Stories
- US-LD-010 (File 01) footer, US-LD-012 (File 01) contact page.

### Dependencies
- `business_profile` (File 01), `audit_logs`.

### Tags
`admin` · `business-profile` · `cms`

### Notes / Rationale
One canonical row for business data; a single source of truth eliminates the "footer says X, contact page says Y" class of bug.

---

## US-AB-016 — Promo banner management

### Story
As a content admin,
I want to enable and edit promo banners for the home hero top, the top bar, and the footer — with EN/AR text, scheduled start and end timestamps, and an enabled toggle,
So that the academy can run time-bound promos (e.g. "Ramadan special: book 4 sessions, get 1 free") without engineering help.

### Priority: P1
### Status: Draft
### Estimate: 3
### Sprint: Sprint 3 — Marketing CMS

### Actors
- **Primary actor:** Content admin.

### Preconditions
1. The `promos` table exists (this file).

### Postconditions
1. The promo row is upserted; the public surfaces render it when the schedule is in-window.
2. Audit row recorded.

### Main Flow (Happy Path)
1. Admin opens `/admin/promos`.
2. Sees three slots: `home_hero_top`, `topbar`, `footer`.
3. Picks `topbar`; creates a promo: text EN=`Ramadan: 8+1 free — ends 28 Mar`, AR=`رمضان: ٨+١ مجاناً — ينتهي ٢٨ مارس`, scheduled_start=`2026-03-01 00:00`, scheduled_end=`2026-03-28 23:59`, enabled=true.
4. Saves; the top bar shows the promo on the public site.

### Alternate Flows

#### A1 — Disable a promo
1. Toggle `enabled=false`; the slot hides immediately.

#### A2 — Schedule future promo
1. The `scheduled_start` is in the future; the public site respects the schedule via the cron or on each request's `revalidate=60`.

### Exception Flows

#### E1 — Two promos on the same slot
1. The `promos` table allows multiple rows per slot; the public site picks the one with `enabled=true AND scheduled_start <= now() AND scheduled_end >= now() ORDER BY created_at DESC LIMIT 1`.
2. If two match, the latest-created wins.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Promo banner management

  Scenario: Enable a topbar promo
    When admin creates a topbar promo for Ramadan 2026
    Then a promos row exists with slot="topbar" enabled=true
      And the public top bar shows the text

  Scenario: Disable a promo
    When admin sets enabled=false
    Then the top bar hides the text
      And an audit row records the change

  Scenario: Schedule future
    When admin sets scheduled_start=2027-01-01
    Then the promo is not visible until that date
```

### Edge Cases
1. A promo spans the locale switch — text is EN+AR; both are shown as appropriate.
2. A promo is enabled but the schedule is in the past — hidden.
3. A promo with no `scheduled_end` — runs indefinitely.

### UI/UX Specifications
- Three-slot accordion; each expands to its form.
- Date pickers in `Africa/Cairo`.

### Data Model

```sql
promos
  id              uuid pk default gen_random_uuid()
  slot            text not null check (slot in ('home_hero_top','topbar','footer'))
  text            jsonb not null                       -- { "en": "...", "ar": "..." }
  scheduled_start timestamptz
  scheduled_end   timestamptz
  enabled         boolean not null default false
  created_by      uuid references auth.users(id)
  created_at      timestamptz not null default now()
  updated_at      timestamptz
  index on (slot, enabled, scheduled_start, scheduled_end)
  -- RLS: admin SELECT/INSERT/UPDATE; service role for cron; anon read via a public view
```

### API Endpoints
- `GET /api/admin/promos`
- `POST /api/admin/promos`
- `PATCH /api/admin/promos/[id]`
- `POST /api/admin/promos/[id]/disable`

### Security Considerations
- Role check.
- Text sanitised to prevent XSS (only `<strong>`, `<em>`, `<a>` allowed).

### Performance Requirements
- Save p95 < 300 ms.

### Notifications
- None.

### Localization
- Text EN/AR.

### Error Handling
- `text_too_long` 422 (max 200 chars per locale).

### Logging & Analytics
- `admin.promo.create` / `update` / `disable`.

### Testing Notes
- E2E: enable, see on top bar; disable; gone.

### Related User Stories
- US-LD-009 (File 01) header reads the topbar promo.
- US-LD-010 (File 01) footer reads the footer promo.
- US-LD-004 (File 01) home hero reads the home_hero_top promo.

### Dependencies
- `promos` (this file), `audit_logs`.

### Tags
`admin` · `promo` · `marketing` · `i18n`

### Notes / Rationale
Promos are the academy's conversion lever for time-bound offers. A single table slot-tagged keeps the editor simple.

---

## US-AB-017 — Slug redirect mapping

### Story
As a content admin,
I want a screen to manually map old marketing URLs to new ones (e.g. `nationals-2024` → `nationals-regatta-2024` for an event rename, or a campaign-specific URL like `/summer-2025` → `/events/summer-fun-day-2025`) by reading the `slug_history` table and adding manual redirects,
So that historical marketing collateral and backlinks continue to resolve.

### Priority: P2
### Status: Draft
### Estimate: 3
### Sprint: Sprint 3 — Marketing CMS

### Actors
- **Primary actor:** Content admin.

### Preconditions
1. The `slug_history` table exists.
2. The public routing layer reads from it.

### Postconditions
1. New redirect rows are added; public traffic to the old URL is 301-redirected.
2. Audit row recorded.

### Main Flow (Happy Path)
1. Admin opens `/admin/slug-redirects`.
2. Sees two sections: "Automatic (from slug_history)" and "Manual (marketing campaigns)".
3. Adds a manual redirect: `from=/summer-2025`, `to=/events/summer-fun-day-2025`, `http_status=301`.
4. Saves; the row is added; a public hit to `/summer-2025` is 301-redirected.

### Alternate Flows

#### A1 — 302 (temporary) redirect
1. The http_status can be 302 for A/B test scenarios.

#### A2 — Delete a manual redirect
1. Admin clicks "Delete" on a row; the redirect is removed.

### Exception Flows

#### E1 — Redirect loop
1. The server validates that the `to` is not reachable from the `from` via another redirect (cycle detection); the save is rejected with "redirect loop".

#### E2 — Conflicting manual and automatic redirect
1. The system refuses to add a manual redirect that conflicts with an automatic one; admin is shown a "rename conflict" hint.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Slug redirect mapping

  Scenario: Add a manual redirect
    When admin creates from="/summer-2025" to="/events/summer-fun-day-2025" http_status=301
    Then a slug_history row exists (treated as a manual entry)
      And a public hit to /summer-2025 is 301-redirected

  Scenario: Cycle detection
    Given a redirect from A to B exists
    When admin tries to add a redirect from B to A
    Then the save is rejected with "redirect loop"

  Scenario: Delete a manual redirect
    When admin deletes the /summer-2025 row
    Then public hits to /summer-2025 are no longer 301'd
```

### Edge Cases
1. Manual redirect to an external URL — admin must enable a flag; default is internal-only.
2. A redirect that points to a non-existent target — admin is warned but allowed.
3. A redirect with `from` matching an existing published slug — refused (would shadow the page).

### UI/UX Specifications
- Two-section table.
- Add row modal with three fields: from, to, status.
- Delete button per row.

### Data Model
- Reuses `slug_history` (this file).
- Adds a `manual` boolean column:

```sql
alter table slug_history add column manual boolean not null default false;
alter table slug_history add column http_status int not null default 301 check (http_status in (301, 302));
```

### API Endpoints
- `GET /api/admin/slug-redirects`
- `POST /api/admin/slug-redirects` — body `{ from, to, http_status? }`.
- `DELETE /api/admin/slug-redirects/[from]`

### Security Considerations
- Role check.
- `from` validated to start with `/`.
- `to` validated internal-only by default; external allowed only with `external_allow=true` flag.

### Performance Requirements
- Save p95 < 300 ms.
- Redirect lookup p95 < 50 ms via the unique index on `old_slug`.

### Notifications
- None.

### Localization
- N/A (URLs are ASCII).

### Error Handling
- `redirect_loop` 422.
- `redirect_shadows_published` 409.
- `from_invalid` 422.

### Logging & Analytics
- `admin.redirect.create` / `delete`.
- Audit row per change.

### Testing Notes
- E2E: add redirect, hit URL, assert 301.

### Related User Stories
- US-AB-004 (slug rename).

### Dependencies
- `slug_history` (this file), public routing middleware.

### Tags
`admin` · `slug` · `redirect` · `seo`

### Notes / Rationale
Slug history already handles auto-redirects from renames; this story adds the manual layer for marketing-driven aliases.

---

## US-AB-018 — Audit log viewer

### Story
As a super admin,
I want a `/admin/audit` page that lists every admin action in `audit_logs` with filters (actor, action, entity, date range), pagination, and a CSV export,
So that we can answer "who changed this activity's price last week?" and "show me every admin grant this month" without engineering help.

### Priority: P0
### Status: Draft
### Estimate: 5
### Sprint: Sprint 4 — Admin Operations MVP

### Actors
- **Primary actor:** Super admin.

### Preconditions
1. `audit_logs` has rows from prior admin actions.
2. The super admin is signed in and 2FA-verified.

### Postconditions
1. The page renders a paginated list with filters.
2. A CSV export is available for the current filter scope.

### Main Flow (Happy Path)
1. Super admin opens `/admin/audit`.
2. Default scope: last 7 days, all actors, all actions.
3. The table lists each row: timestamp, actor (name + email), action, entity, before/after diff (collapsible), IP hash.
4. Admin filters by `action='pricing_tier_update'` and `date_from=2026-07-20`.
5. URL becomes `/admin/audit?action=pricing_tier_update&date_from=2026-07-20`.
6. Admin clicks "Export CSV"; the file downloads.

### Alternate Flows

#### A1 — Drill into a row
1. Clicking a row opens a side panel with the full before/after jsonb diff rendered as a key-by-key comparison.

#### A2 — Filter by actor
1. The actor filter is a typeahead of admin users.

### Exception Flows

#### E1 — Filter scope returns 0 rows
1. Empty state with "No audit rows in this scope".

#### E2 — CSV too large
1. The server caps exports at 10,000 rows; the admin is shown a hint to narrow the scope.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Audit log viewer

  Scenario: Default list shows last 7 days
    Given audit_logs has 50 rows in the last 7 days and 1000 older
    When the super admin opens /admin/audit
    Then only the 50 recent rows are listed

  Scenario: Filter by action
    When super admin filters action="pricing_tier_update" date_from=2026-07-20
    Then the URL contains those params
      And the table shows only matching rows

  Scenario: Drill into a row
    When super admin clicks a row
    Then a side panel opens with the before/after jsonb diff

  Scenario: Export CSV
    When super admin clicks "Export CSV"
    Then a CSV file downloads with the rows in the current scope
      And the export is rate-limited to 10 per hour

  Scenario: Non-super-admin role
    Given the admin is content_admin
    When they navigate to /admin/audit
    Then the page is forbidden (403) — only super_admin can view
```

### Edge Cases
1. An `audit_logs` row's `before` is null (e.g. creates) — the side panel shows "no prior state".
2. An `actor_id` points to a deleted user — the actor column shows "Deleted user [id]".
3. IP hash is the only network identifier; no raw IPs are exposed.

### UI/UX Specifications
- Filter bar top; table below.
- Side panel slides in from the right.
- CSV export button top right.

### Data Model
- Reads `audit_logs` (this file).
- No new tables.

### API Endpoints
- `GET /api/admin/audit?action=&actor=&date_from=&date_to=&entity=&page=`
- `GET /api/admin/audit/export.csv?action=&actor=&date_from=&date_to=&entity=` — returns CSV.

### Security Considerations
- Role check `super_admin` only.
- CSV export rate-limited to 10 per hour.
- No raw IP exposure; only the hash.
- The `before/after` diff is rendered as text; no PII is highlighted (admin discretion).

### Performance Requirements
- Page load p95 < 500 ms with 50,000 audit rows.
- Filter apply p95 < 500 ms.
- CSV export p95 < 5 s for 10,000 rows.

### Notifications
- None.

### Localization
- Action labels EN/AR (e.g. `pricing_tier_update` → EN `Pricing tier update` / AR `تحديث فئة التسعير`).

### Error Handling
- `forbidden` 403.
- `export_too_large` 422 with a hint.

### Logging & Analytics
- The viewer itself logs `admin.audit.view` (meta-self-referential).
- CSV export logs `admin.audit.export` with row count.

### Testing Notes
- E2E: filter, drill, export.

### Related User Stories
- Every US-AB-* story inserts into `audit_logs`.

### Dependencies
- `audit_logs` (this file).

### Tags
`admin` · `audit` · `super-admin` · `compliance`

### Notes / Rationale
The audit log is the trust anchor for the entire admin surface. A super admin must be able to answer any "who did what?" question within 30 seconds.

---

## End of File 05

This file was authored with detailed User Stories covering the Admin Content Management surface for AquaLudo v2. The four tables owned here — `admin_roles`, `audit_logs`, `slug_history`, `promos` — are the durable artefacts; the eighteen user stories document the editorial flows that mutate or read them and the surrounding catalog (`activities`, `activity_pricing_tiers`, `activity_add_ons`, `session_packages`, `membership_tiers`, `coaches`, `events`, `reviews`, `content_blocks`, `business_profile`).

Up next in the project's user-story library:

- **File 06** — Admin Heatmap Dashboard US-HM-001..012
- **File 07** — Admin Booking Management US-AD-001..017
- **File 08** — Coach Panel US-CO-001..014
- **File 09** — Communications & Notifications US-CN-001..020
- **File 10** — Platform Infrastructure US-IN-001..018

Files 06, 07, 09, 10 are already written. The remaining file in the library is **File 08 (Coach Panel)**, to be authored in the same session.
