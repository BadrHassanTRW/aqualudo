# File 10 — Platform Infrastructure User Stories

> **Project:** AquaLudo v2 (water sports academy on the Nile, Cairo, Egypt)
> **Stack:** Next.js 14 (App Router) + Supabase (Postgres + Auth + Storage) + Paymob. Deployed to Vercel.
> **Domain covered by this file:** Cross-cutting platform foundation user stories consumed by every other file. Includes i18n/RTL, authentication, Row-Level Security, image CDN, search infrastructure, accessibility, monitoring, audit logging, deployment, secrets, backups, security headers, telemetry, cron jobs, and database indexing.
> **Last updated:** 2026-07-28
> **Status:** Draft (awaiting technical + business review)
> **Owner:** Platform / Infrastructure team
> **Related files:**
> - `01-loading-and-public-discovery.md`
> - `02-activities-and-pricing-catalog.md`
> - `03-booking-flow.md`
> - `04-customer-account.md`
> - `05-admin-content-management.md`
> - `06-admin-heatmap-dashboard.md`
> - `07-admin-booking-management.md`
> - `08-coach-panel.md`
> - `09-communications-notifications.md`

---

## How to read this document

User stories follow the same template introduced in File 01 (see "How to read this document" there). For convenience, the sections per story are:

1. Story · 2. Priority/Status/Estimate/Sprint · 3. Actors · 4. Preconditions/Postconditions · 5. Main Flow · 6. Alternate Flows · 7. Exception Flows · 8. Acceptance Criteria (Gherkin) · 9. Edge Cases · 10. UI/UX Specifications · 11. Data Model · 12. API Endpoints · 13. Security Considerations · 14. Performance Requirements · 15. Notifications · 16. Localization · 17. Error Handling · 18. Logging & Analytics · 19. Testing Notes · 20. Related User Stories · 21. Dependencies · 22. Tags · 23. Notes / Rationale.

Acceptance criteria are written in Gherkin so they map directly to Playwright/Cypress assertions.

File 10 is intentionally **horizontal**: every other file in the user-story library consumes at least one story defined here. Where a downstream file references `US-IN-00x`, that reference resolves into this file. Most stories here have a UI/UX Specifications section marked "N/A" because they are infrastructure concerns; a note is added wherever a UI surface is involved (e.g. error boundaries, language toggle, accessibility declaration).

The word **must** in this document means "non-negotiable for v1 ship". **Should** means strongly recommended. **Could** means deferred to v2.

---

## Architectural Context

AquaLudo v2 is a Next.js 14 App Router application deployed as a single-package monorepo on Vercel. The platform layer in this file establishes the contracts every vertical feature relies on:

- **i18n & RTL** (US-IN-001..003) — Tailwind tokens, Inter + Cairo type stack, `next-intl` dictionaries under `messages/{en,ar}.json`, `<html dir>` resolution, logical CSS properties.
- **Identity & access** (US-IN-004..005) — Supabase Auth with email/password + Google + Facebook + WhatsApp OTP, server middleware session resolution, role resolution (`anon`/`customer`/`coach`/`admin`), and Row-Level Security policy templates applied uniformly to every core table.
- **Storage & media** (US-IN-006..008) — Supabase Storage buckets, `next/image` remotePatterns allowlist, signed URLs for private assets, transforms via `?width=` query params, AVIF/WebP agnostic delivery.
- **Data plane** (US-IN-007, US-IN-009, US-IN-021) — Supabase CLI migrations under `supabase/migrations/*.sql`, idempotent `create or replace`, pg_trgm-backed `quick_search` RPC, per-table indexes, quarterly `EXPLAIN ANALYZE` audit.
- **Operations** (US-IN-011..020) — Accessibility (WCAG 2.1 AA), Sentry, audit logs, Vercel deployment, env/secrets management, backups + PITR, monitoring + alerting, CSP & security headers, telemetry primitives, Vercel Cron jobs.

Pages and route handlers Import auth state via server-only helpers; browser code uses the Supabase JS client with the `anon` key plus the user's JWT. JWT `app_metadata.role` is the authoritative role source; `profiles.role` is a denormalised mirror used for queries.

Core tables enumerated across this file (RLS is enabled on all of them by US-IN-005): `profiles`, `bookings`, `payment_transactions`, `whatsapp_messages`, `audit_logs`, `content_blocks`, `activities`, `reviews`, `analytics_events`, `newsletter_subscribers`, `gallery_items`, `customer_favorites`, `session_packages`, `membership_tiers`, `events`, `coaches`.

External services enumerated: **Vercel** (hosting, ISR, edge middleware, cron, analytics), **Supabase** (Postgres + Auth + Storage + Database Webhooks + backups), **Paymob** (payments + webhooks), **Meta Cloud WhatsApp API** (messaging), **Sentry** (error + performance monitoring), **Mailchimp** (newsletter audience export downstream).

---

## Domain Glossary

- **App Router** — Next.js 14 routing layer using the `app/` directory with React Server Components by default.
- **CSP** — Content-Security-Policy HTTP response header; restricts resource origins the browser will load.
- **Edge middleware** — Next.js middleware running on Vercel Edge runtime before route resolution; used for locale + auth redirects.
- **ISR** — Incremental Static Regeneration; static pages regenerated in the background at configurable revalidate intervals.
- **JWT** — JSON Web Token issued by Supabase Auth; carries `app_metadata.role` and the user's `sub` identifier.
- **LocaleProvider** — Client + server context component that resolves the active `en`/`ar` locale from the `locale` cookie, `localStorage`, or URL path.
- **OAuth** — Open Authorization; used here for the Google + Facebook social sign-in flows.
- **PITR** — Point-in-Time Recovery; Supabase daily encrypted backups with a 7-day recovery window.
- **pg_trgm** — Postgres extension for trigram-based fuzzy text matching; powers `ILIKE` indexes on search columns.
- **RLS** — Row-Level Security; Postgres feature enforced per-table via policies that Supabase honours for the `anon`, `authenticated`, and service roles.
- **RSC** — React Server Components; the default rendering primitive in App Router.
- **RSC payload** — the serialized component tree sent from server to client during navigation.
- **Signed URL** — Time-limited, single-use URL granting access to a private Supabase Storage object.
- **Supabase service role key** — server-only secret key bypassing RLS; vaulted, never shipped to the browser.
- **Vercel Cron** — declarative scheduled job configuration in `vercel.json` invoking Route Handlers at fixed intervals.
- **WCAG** — Web Content Accessibility Guidelines; AA is the conformance target for AquaLudo v2.

---

## Table of Contents

1. US-IN-001 — Responsive design system & layout primitives
2. US-IN-002 — i18n framework (next-intl; dictionary structure; SSR cookie resolution)
3. US-IN-003 — RTL support (html dir, logical properties, RTL parity tests)
4. US-IN-004 — Authentication layer (Supabase Auth; middleware; role resolution)
5. US-IN-005 — Row-Level Security policies for all core tables
6. US-IN-006 — Supabase Storage + image CDN strategy
7. US-IN-007 — Postgres migrations & versioning (Supabase CLI)
8. US-IN-008 — Frontend image strategy (next/image; remotePatterns; blur placeholder)
9. US-IN-009 — Search infra (quick_search RPC + ILIKE indexes + pg_trgm)
10. US-IN-010 — Newsletter audience storage (double opt-in; suppression; CSV export)
11. US-IN-011 — Accessibility (WCAG 2.1 AA; reduce-motion; screen reader semantics)
12. US-IN-012 — Sentry integration (Next.js + Supabase adapters; source maps; sampling)
13. US-IN-013 — Audit log primitive (audit_logs table; audit_log() function)
14. US-IN-014 — Deployment to Vercel (preview deploys; prod on git push; edge middleware)
15. US-IN-015 — Environment & secrets management (Vercel env vars; service-role key vault)
16. US-IN-016 — Backups & disaster recovery (PITR; weekly S3 export; restore drill)
17. US-IN-017 — Monitoring & alerting (Vercel Analytics; Paymob ping; WhatsApp alert)
18. US-IN-018 — Security headers & CSP
19. US-IN-019 — Telemetry event primitives (analytics_events; typed catalog; track())
20. US-IN-020 — Cron jobs & scheduled tasks (Vercel Cron config)
21. US-IN-021 — Database performance indexing strategy

---

## US-IN-001 — Responsive design system & layout primitives

### Story
As a frontend engineer building any AquaLudo v2 page,
I want a single shared responsive design system built on Tailwind tokens — breakpoints at 640/768/1024/1440, container max-widths, spacing scale, and a paired Inter (EN) + Cairo (AR) typography stack,
So that every page renders consistently across mobile, tablet, and desktop, and Arabic copy doesn't fall back to a Latin glyph.

### Priority: P0
### Status: Draft
### Estimate: 5 (story points)
### Sprint: Sprint 1 — Foundation

### Actors
- **Primary actor:** Frontend engineer implementing pages in Files 01–09.
- **Secondary actor:** Anonymous visitor on a viewport from 320 px up to 2560 px.
- **System actor:** `tailwind.config.ts`, `app/layout.tsx`, global `globals.css`.

### Preconditions
1. The monorepo's `package.json` has Tailwind 3.4+ installed and configured.
2. Inter and Cairo variable fonts are bundled under `app/_assets/fonts/` and preloaded in the root layout.

### Postconditions
1. Breakpoints `sm 640 / md 768 / lg 1024 / xl 1440 / 2xl 1920` are the only responsive names used across the codebase.
2. Container utility supports `max-w-screen-sm|md|lg|xl` with auto horizontal padding (16 px mobile, 24 px ≥ 1024).
3. Spacing scale step is 4 px; tokens `space-1..space-16` cover the design.
4. `<html>` inherits `font-family` from `--font-en` when `lang="en"` and `--font-ar` when `lang="ar"`.
5. No inline magic numbers; every spacing/colour/radius consumes a token.

### Main Flow (Happy Path)
1. Engineer imports layout primitives (`<Container/>`, `<Stack/>`, `<Cluster/>`, `<Grid/>`) from `app/_components/layout`.
2. Engineer composes a page using these primitives plus Tailwind tokens; no per-page CSS files are introduced.
3. Browser renders at any viewport; container clamps to the nearest `max-w-screen-*` and centres horizontally.
4. Font preload swap is invisible (Inter / Cairo variable fonts use `size-adjust` so the boxes match).

### Alternate Flows

#### A1 — Arabic locale loads Cairo
1. `<LocaleProvider>` (US-IN-002) sets `document.documentElement.lang = "ar"`.
2. CSS rule `html[lang="ar"] { font-family: var(--font-ar); }` activates Cairo glyph set.
3. Numbers render with `font-feature-settings: "lnum"` to keep Western Arabic numerals consistent with EGP currency locale.

#### A2 — Very large viewport (≥ 2560 px)
1. Container caps at `max-w-screen-2xl` (1920 px) and remains centred; the surrounding gutter uses a `bg-gradient` to avoid white voids.

### Exception Flows

#### E1 — Variable font fails to load
1. Browser falls back to `system-ui, sans-serif` for EN and `Segoe UI, Tahoma, sans-serif` for AR (declared in the font-family stack).
2. Telemetry event `font.load_failed` with `{font}` is emitted.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Responsive design system & layout primitives

  Scenario: Container clamps to the active breakpoint max width
    Given a viewport 1280 px wide
    When a page with <Container/> renders
    Then the inner content area is 1024 px wide and centred
      And the horizontal gutter is 24 px

  Scenario: Mobile viewport uses the 640 px breakpoint gutter
    Given a viewport 375 px wide
    When a page with <Container/> renders
    Then the horizontal gutter is 16 px

  Scenario: Arabic locale switches the active font family
    Given the active locale is "ar"
    Then html[lang="ar"] resolves font-family to var(--font-ar)
      And Arabic glyphs render in Cairo

  Scenario: Latin numbers remain Latin under Arabic locale
    Given the active locale is "ar"
    When a price "200 EGP" renders
    Then the digits "200" remain Western Arabic numerals
```

### Edge Cases
1. **Long Arabic activity name** clamps via `-webkit-line-clamp: 2` and `text-overflow: ellipsis`.
2. **Customer on a 320 px iPhone SE** — container shrinks to 100 % minus 32 px gutter; no horizontal scroll.
3. **Print stylesheet** hides interactive chrome above 1024 px breakpoint assumption; print CSS uses `pt` units.

### UI/UX Specifications
N/A (infrastructure). Note: the `<Container/>` primitive accepts `as` and `className` props; layout primitives default to `min-height: 0` to participate in nested flex correctly.

### Data Model
No database involvement.

### API Endpoints
None.

### Security Considerations
- Font files served from the same origin only; `preload` headers are added in middleware (US-IN-018).

### Performance Requirements
- Variable fonts shipped ≤ 90 KB combined (Inter Latin subset + Cairo Arabic subset) with `font-display: swap`.
- No layout shift from typography swap (size-adjust pre-baked).

### Notifications
N/A.

### Localization
- Inter is the EN type stack; Cairo is the AR type stack. Numbers throughout the UI use Western Arabic numerals (per business decision; the Arabic `ar-EG` locale formatter still produces Western digits when configured).

### Error Handling
- Font load failure falls back to system fonts; no error UI for the visitor.

### Logging & Analytics
- `font.load_failed` `{font}`.

### Testing Notes
#### Unit
- Breakpoint resolver returns correct container width.
- `<Container/>` snapshot at 375, 768, 1280, 1920 widths.

#### Visual regression
- Chromatic screenshot per breakpoint for the home + activities pages.

### Related User Stories
- US-IN-002 (i18n), US-IN-003 (RTL), US-IN-011 (accessibility), every File 01–09 story that renders a layout.

### Dependencies
- Tailwind 3.4+, `@fontsource-variable/inter`, `@fontsource-variable/cairo`.

### Tags
`design-system` · `tailwind` · `responsive` · `i18n` · `fonts`

### Notes / Rationale
The 1440 px breakpoint matches the admin dashboard's max comfortable width while the 640 / 768 / 1024 trio covers every consumer device class. Pairing Inter + Cairo keeps brand consistency without custom font licensing.

---

## US-IN-002 — i18n framework (next-intl; dictionary structure; SSR cookie resolution)

### Story
As a frontend engineer building any customer-facing string in AquaLudo v2,
I want a single `next-intl` based internationalisation framework with EN + AR dictionaries under `messages/{en,ar}.json`, server-side cookie resolution, a `useTranslations` hook, and a fallback chain EN→AR,
So that every page renders in the visitor's chosen locale on first paint (SSR) without flashing the wrong language, and missing AR keys gracefully fall back to English.

### Priority: P0
### Status: Draft
### Estimate: 8 (story points)
### Sprint: Sprint 1 — Foundation

### Actors
- **Primary actor:** Frontend engineer.
- **Secondary actor:** Server middleware resolving locale.
- **System actor:** `next-intl` `LocaleProvider`, `getMessages`, `useTranslations`.

### Preconditions
1. `next-intl` 3.x is installed.
2. `messages/en.json` and `messages/ar.json` exist with matching key shapes.
3. The root layout wraps children in `<LocaleProvider>`.

### Postconditions
1. Every user-visible string flows through `useTranslations` or `getTranslations` (server).
2. The SSR HTML matches the visitor's locale before hydration.
3. The active locale is persisted in a `locale` cookie (1 year) and `localStorage["aqualudo.locale"]`.
4. Missing AR keys log a warning in dev and fall back to the EN string in prod.

### Main Flow (Happy Path)
1. Visitor requests `/`.
2. Edge middleware reads the `locale` cookie; if absent, browsers' `Accept-Language` is inspected; default `en`.
3. Middleware sets the request header `x-aqualudo-locale` for the server to consume.
4. Root layout's `getLocale()` reads the header; `getMessages()` loads the matching dictionary.
5. Server components call `getTranslations("namespace")` to resolve keys; client components call `useTranslations("namespace")`.
6. The HTML returns with `<html lang="en|ar">` set correctly.

### Alternate Flows

#### A1 — Visitor taps the language pill (US-LD-013)
1. `setLocale("ar")` writes the `locale` cookie and `localStorage["aqualudo.locale"]`.
2. A full client-side navigation is triggered to refetch messages and flip `dir` (US-IN-003).

#### A2 — Dictionary key missing in AR
1. `useTranslations` resolves to the EN string.
2. A dev-mode console warning lists the missing key path.
3. A telemetry event `i18n.missing_key` is fired in staging.

#### A3 — Visitor's browser preference is `ar` but no prior cookie
1. `Accept-Language: ar,en;q=0.8` honoured; locale resolved to `ar` with a fallback chain.

### Exception Flows

#### E1 — Dictionary file throws on parse
1. Server logs the failure and falls back to a minimal baked-in English dictionary with the home hero + critical navigation labels only.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: i18n framework

  Scenario: Server renders HTML in the visitor's chosen locale
    Given the visitor's locale cookie is "ar"
    When the visitor requests /
    Then the returned HTML has html lang="ar"
      And the hero title is the Arabic translation from messages/ar.json

  Scenario: Missing Arabic key falls back to English
    Given messages/ar.json lacks the key "home.hero.subtitle"
    When the home page renders in Arabic
    Then the subtitle renders the English string
      And a dev-mode console warning lists the missing key

  Scenario: Language pill toggle persists the choice
    Given the visitor on / with locale "en"
    When the visitor taps the Arabic pill
    Then the locale cookie is set to "ar"
      And localStorage["aqualudo.locale"] equals "ar"
      And the page re-renders with dir="rtl"

  Scenario: Accept-Language drives first-visit resolution
    Given a fresh visitor with no locale cookie
      And the browser sends Accept-Language "ar,en;q=0.8"
    When the visitor requests /about
    Then the page renders in Arabic
```

### Edge Cases
1. **Visitor's preference is `ar` but the route is admin-only English** — admin panel hard-codes `en` from US-AB-001 in File 05; the locale pill is hidden in admin.
2. **A translation contains ICU placeholders** (e.g. `{count, plural, one {# booking} other {# bookings}}`) — resolved by next-intl's ICU support.
3. **Very long Arabic label overflows a fixed-width button** — handled by min-width token, never truncate a CTA.

### UI/UX Specifications
N/A. Note: the language pill (US-LD-013) is the only user-facing affordance owned by this framework; all other strings surface through their owning stories.

### Data Model
No database involvement. Dictionaries live under `messages/{en,ar}.json` in the repository.

Example dictionary fragment:

```json
{
  "home": {
    "hero": {
      "title": "Discover Water Sports in Cairo with AquaLudo",
      "subtitle": "Join our community and experience the thrill of rowing, kayaking, and more on the beautiful waters.",
      "ctaPrimary": { "label": "Book Online", "href": "/booking" },
      "ctaSecondary": { "label": "Explore Activities", "href": "/activities" }
    }
  },
  "common": {
    "currency": "EGP",
    "loading": "Loading…",
    "from": "From"
  }
}
```

### API Endpoints
- Middleware (`middleware.ts`) — runs on every request; reads `locale` cookie; sets `x-aqualudo-locale` request header and the response `Content-Language`.

### Security Considerations
- Dictionary values are static JSON shipped to the browser; no user input is interpolated before rendering.
- Any user-generated locale-segmented content (e.g. CMS payloads) is escaped at render time.

### Performance Requirements
- Dictionary payload per locale ≤ 35 KB gzipped; loaded via `next-intl` lazy namespace splitting for non-home routes.
- No flash of wrong-locale text (FOUL): the SSR HTML already contains the right strings.

### Notifications
N/A.

### Localization
- This story *is* the localization framework.

### Error Handling
- Missing key: dev warning + EN fallback.
- Dictionary parse failure: minimal baked-in English dictionary.

### Logging & Analytics
- `i18n.missing_key` `{key}` in staging only.
- `i18n.locale_resolved` `{source ∈ {cookie, acceptLanguage, default}}` once per request in dev.

### Testing Notes
#### Unit
- `getLocale` cookie resolver; `setLocale` writer.
- Dictionary shape parity test: assert that every key in `messages/en.json` exists (or is intentionally optional) in `messages/ar.json`.

#### E2E (Playwright)
- Fresh context with `Accept-Language: ar` → assert `html` lang + first hero string in Arabic.
- Tap language pill → assert cookie + DOM update.

### Related User Stories
- US-LD-013 (language toggle UI), US-IN-003 (RTL), every story that surfaces copy.

### Dependencies
- `next-intl` 3.x.

### Tags
`i18n` · `next-intl` · `ssr` · `cookie` · `localization`

### Notes / Rationale
`next-intl` is chosen over `next-translate` for its App Router + RSC native support, ICU message format, and a stable server + client API. Keeping a fallback chain English→Arabic (rather than throwing) ensures partial translations can ship safely in early sprints without breaking pages.

---

## US-IN-003 — RTL support (html dir, logical properties, RTL parity tests)

### Story
As an Arabic-speaking visitor,
I want every page to honour `dir="rtl"` with mirrored flex/grid layouts, CSS logical properties (`margin-inline-start`, `padding-inline-end`), and framer-motion variants that animate from the right rather than the left,
So that the reading order and motion feel native to Arabic.

### Priority: P0
### Status: Draft
### Estimate: 5 (story points)
### Sprint: Sprint 1 — Foundation

### Actors
- **Primary actor:** Arabic-locale visitor.
- **System actor:** `<html dir>` resolver, Tailwind logical-property plugin, framer-motion variant map.

### Preconditions
1. US-IN-002 is implemented.
2. Tailwind `@tailwindcss/logical` plugin (or built-in logical property support) is enabled.

### Postconditions
1. `<html dir="rtl">` is set whenever the active locale is `ar`.
2. All layouts use logical (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`) Tailwind utilities, not physical (`ml-*`, `mr-*`).
3. framer-motion entrance animations flip x-axis values when `dir="rtl"`.
4. A Playwright RTL parity test runs in CI for the home, activities, and checkout pages.

### Main Flow (Happy Path)
1. Visitor activates Arabic (US-LD-013).
2. `setLocale("ar")` triggers a `<LocaleProvider>` side effect that sets `document.documentElement.dir = "rtl"`.
3. SSR HTML already sets `dir` from the resolved locale to avoid FOUC.
4. Tailwind logical utilities flip automatically under `dir="rtl"`.
5. framer-motion variant resolver reads `useDirection()` and reverses x-axis offsets.

### Alternate Flows

#### A1 — Visiting an admin page
1. Admin pages enforce `dir="ltr"` regardless of locale to preserve the admin layout assumptions.

### Exception Flows

#### E1 — A third-party widget enforces LTR
1. The widget's container receives a wrapping `<div dir="ltr">` so it renders correctly while the surrounding page remains RTL.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: RTL support

  Scenario: Toggling to Arabic sets document direction
    Given the visitor on / with locale "en"
    When the visitor switches to Arabic
    Then html dir equals "rtl"
      And logical margin utilities render right-aligned

  Scenario: RTL parity test passes for the activities page
    Given the Playwright RTL parity suite runs in CI
    When the activities page is rendered under dir="rtl"
    Then the page snapshot diff against the LTR variant is contained to direction-only deltas

  Scenario: framer-motion entrance animates from the right under RTL
    Given a hero card animation variant starts x=-24 under LTR
    When the same variant runs under dir="rtl"
    Then the animation starts from x=24
```

### Edge Cases
1. **Bidirectional content** (a Latin brand name inside Arabic copy) — wrapped in `<bdi>` to keep direction context isolated.
2. **Star ratings component** — icon order must mirror under RTL so the first star sits on the right.
3. **Phone numbers in footer** — always LTR via `<bdi>`.

### UI/UX Specifications
N/A. Note: shadows, glyphs, and arrow icons flip via the `rtl:rotate-180` Tailwind variant where appropriate.

### Data Model
None.

### API Endpoints
None.

### Security Considerations
None beyond standard escaping.

### Performance Requirements
- No additional JS shipped for RTL; the direction resolver is ~0.4 KB.

### Notifications
N/A.

### Localization
- The story *enables* Arabic locale rendering.

### Error Handling
- A component that forgets logical utilities is flagged by a custom ESLint rule (`aqualudo/no-physical-margins`).

### Logging & Analytics
- `i18n.direction_change` `{from, to}` when the pill is tapped.

### Testing Notes
#### Unit
- `useDirection()` hook returns `ltr` or `rtl`.
- ESLint rule unit test: catches `ml-4` outside allowlist.

#### E2E (Playwright)
- `dirRTL.spec.ts` renders each primary route under both directions and diffs the snapshot.

### Related User Stories
- US-LD-013, US-IN-002, every layout story.

### Dependencies
- Tailwind logical property support; `@tailwindcss/logical` if needed; framer-motion.

### Tags
`rtl` · `i18n` · `a11y` · `tailwind` · `framer-motion`

### Notes / Rationale
Enforcing logical properties via ESLint rather than developer discipline prevents the common "Arabic launch ships half-mirrored" failure. Pairing the framework with a Playwright parity test gives a regression backstop.

---

## US-IN-004 — Authentication layer (Supabase Auth; middleware; role resolution)

### Story
As a customer, coach, or admin using AquaLudo v2,
I want a unified authentication layer offering email/password, Google, Facebook, and WhatsApp OTP sign-in, with my role (`customer` / `coach` / `admin`) resolved server-side from the JWT `app_metadata.role`,
So that I can access my permitted features and be denied the rest, with a single sign-on experience that survives page refreshes and SSR.

### Priority: P0
### Status: Draft
### Estimate: 13 (story points)
### Sprint: Sprint 1 — Foundation

### Actors
- **Primary actor:** Customer, coach, admin.
- **Secondary actor:** Anonymous visitor upgrading to customer.
- **System actor:** Supabase Auth, Next.js middleware, server route handlers.

### Preconditions
1. Supabase Auth providers (Email, Google, Facebook, WhatsApp OTP via a custom edge function) are configured.
2. The `profiles` table is created (US-IN-007 migration) with a trigger that inserts a row on `auth.users` creation.
3. The application's service role key is vaulted (US-IN-015).

### Postconditions
1. After successful sign-in, the Supabase access + refresh tokens are stored as httpOnly cookies set by the server.
2. Every request flows through middleware that resolves `getSession()` and propagates the role to the request context.
3. `protected` route groups (`(admin)`, `(customer)`, `(coach)`) redirect unauthenticated users to `/sign-in?next=…`.
4. Role is resolved from `app_metadata.role` (set at sign-up) and mirrored to `profiles.role` by a trigger.
5. Telemetry events `auth.sign_in.start`, `auth.sign_in.success`, `auth.sign_in.fail` fire per attempt.

### Main Flow (Happy Path)
1. Visitor taps "Sign in" in the header (US-LD-009).
2. `/sign-in` renders the four provider buttons plus the email/password form.
3. Visitor picks Google OAuth → Supabase redirects to Google → returns to `/sign-in/callback` with tokens.
4. Server handler exchanges the code, sets the httpOnly cookies, and triggers a `profiles` upsert if first sign-in.
5. Visitor is redirected to the `next` URL (defaults to `/account`).
6. Subsequent navigations: middleware calls `supabase.auth.getSession()`; if valid, `app_metadata.role` is attached.

### Alternate Flows

#### A1 — Email/password
1. Visitor enters credentials; Supabase `signInWithPassword` returns tokens; cookies set.
2. Unverified email still allows sign-in but `/account` shows a "verify your email" banner.

#### A2 — WhatsApp OTP
1. Visitor enters phone; `/api/auth/whatsapp/otp` invokes the Meta Cloud WhatsApp API template `aqualudo_otp_v1` with a 6-digit code.
2. Visitor submits the code; server verifies; Supabase `signInWithOtp({ phone })` issues tokens.

#### A3 — Customer without `next` redirect lands on `/account`
1. Default redirect target after sign-in is the customer's account overview (File 04).

#### A4 — Coach sign-in redirects to coach panel
1. If role resolves to `coach`, post-sign-in redirect targets `/coach` (File 08).

### Exception Flows

#### E1 — OAuth provider fails
1. `/sign-in/callback` displays "Sign-in failed. Try another method." plus the four buttons.

#### E2 — Refresh token expired
1. Middleware detects a 401 from Supabase; clears cookies; redirects to `/sign-in?next=<original>`.

#### E3 — Account disabled
1. `profiles.status='banned'`; middleware returns 403 and shows "Account suspended — contact admin".

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Authentication layer

  Scenario: Email/password sign-in sets httpOnly cookies
    Given a verified customer with email/password
    When the customer signs in successfully
    Then the access and refresh tokens are stored in httpOnly cookies
      And telemetry fires auth.sign_in.success with provider="email"

  Scenario: Google OAuth round-trips through the callback
    Given the customer clicks "Continue with Google"
    When Google redirects back to /sign-in/callback
    Then the server exchanges the code and sets cookies
      And the redirect targets the "next" URL

  Scenario: WhatsApp OTP verifies a 6-digit code
    Given the customer entered a valid phone number
    When the customer submits the correct 6-digit OTP
    Then Supabase signInWithOtp issues tokens
      And the customer lands on /account

  Scenario: Anonymous visitor hits a protected route
    Given an anonymous visitor
    When the visitor navigates to /admin
    Then middleware redirects to /sign-in?next=/admin

  Scenario: Expired refresh token forces re-auth
    Given a customer whose refresh token has expired
    When the customer navigates to /account
    Then middleware clears the cookies and redirects to /sign-in?next=/account
```

### Edge Cases
1. **Customer signs in while cart holds an in-progress booking** — booking draft is preserved by US-BF-006 in File 03.
2. **Same email registered via two providers** — Supabase account linking enabled; identities merged.
3. **Phone number format varies (`+20 010 113 29642` vs `01001132964`)** — server normalises via `libphonenumber-js` before calling Supabase.

### UI/UX Specifications
N/A. Note: `/sign-in` is the only visible auth UI owned here; the four buttons are styled per US-LD-009 fragment in File 01.

### Data Model

```
profiles
  id            uuid pk default gen_random_uuid()
  user_id       uuid unique fk auth.users.id on delete cascade
  full_name     text not null
  phone         text
  role          text not null check (role in ('customer','coach','admin')) default 'customer'
  status        text check (status in ('active','banned','pending')) default 'active'
  avatar_url    text
  preferred_locale text default 'en'
  created_at    timestamptz default now()
  updated_at    timestamptz default now()
```

Trigger mirrors `auth.users.app_metadata.role` into `profiles.role`.

### API Endpoints
- `POST /api/auth/whatsapp/otp/request` — issues OTP via Meta Cloud WhatsApp API.
- `POST /api/auth/whatsapp/otp/verify` — verifies the code with Supabase.
- `GET /sign-in/callback` — OAuth code exchange.
- `POST /api/auth/sign-out` — clears cookies and revokes the Supabase session.

### Security Considerations
- Cookies set `httpOnly`, `secure`, `sameSite=lax`.
- The Supabase service role key never ships to the browser; only the anon key is public.
- OTP codes are rate-limited at 3 attempts per phone per 10 minutes.
- Refresh token rotation enabled in Supabase.
- All `/sign-in` form submissions protected by an edge rate-limiter (US-IN-018).

### Performance Requirements
- Middleware latency adds ≤ 18 ms p95 on warm hits (session cached on edge).
- `/sign-in` server renders in ≤ 200 ms TTFB on 4G.

### Notifications
- WhatsApp OTP template message delivery is itself a notification; confirmed by Meta webhook per US-CN-004 in File 09.

### Localization
- OTP template has EN + AR variants selected by `profiles.preferred_locale`.
- Sign-in copy lives under the `auth` namespace in `messages/{en,ar}.json`.

### Error Handling
- OAuth error → see E1.
- Rate-limited OTP → "Too many attempts. Try again in 10 minutes."
- Invalid credentials → "Email or password is incorrect."

### Logging & Analytics
- `auth.sign_in.start` `{provider}`.
- `auth.sign_in.success` `{provider, user_id, role}` (PII: user_id ok; never email/phone).
- `auth.sign_in.fail` `{provider, reason}`.
- `auth.sign_out`.
- `auth.session_refresh`.

### Testing Notes
#### Unit
- `resolveRole(jwt)` helper.
- Phone normalisation.

#### Integration
- Mock Supabase `signInWithPassword`; assert cookies set.
- Mock OAuth callback; assert code exchange.

#### E2E (Playwright)
- Sign in via email/password → land on `/account`.
- Sign in via Google (using test credentials) → land on `/account`.
- Anonymous → `/admin` redirect to `/sign-in`.

### Related User Stories
- US-LD-009 (header avatar), US-LD-013 (locale), US-BF-001 (booking auth gate), US-CA-001..015 (account), US-AB-001 (admin auth), US-CO-001 (coach auth), US-IN-005 (RLS uses roles), US-IN-018 (security headers), US-CN-004 (WhatsApp OTP messaging).

### Dependencies
- Supabase Auth (Email, Google, Facebook, Phone OTP).
- Meta Cloud WhatsApp API for OTP delivery.
- `libphonenumber-js`.

### Tags
`auth` · `supabase` · `oauth` · `whatsapp-otp` · `security` · `middleware`

### Notes / Rationale
Resolving role from `app_metadata.role` (JWT-embedded) rather than a DB lookup on every request lets the edge middleware authorise without a database round trip. The `profiles.role` mirror exists only for SQL-level joins, never for enforcement.

---

## US-IN-005 — Row-Level Security policies for all core tables

### Story
As a platform engineer responsible for AquaLudo v2 data security,
I want uniform RLS policies applied to every core table so that anonymous users read only published rows, customers read only their own rows, coaches read their own sessions and customer profiles, and admins have full access,
So that no client call can bypass the least-privilege model even if the anon key leaks.

### Priority: P0
### Status: Draft
### Estimate: 13 (story points)
### Sprint: Sprint 1 — Foundation

### Actors
- **System actor:** Postgres RLS, Supabase `anon`, `authenticated`, `service_role`.
- **Downstream consumer:** Every route handler and Supabase query in Files 01–09.

### Preconditions
1. The `profiles` table has the `role` column populated for every authenticated user (US-IN-004 trigger).
2. A `current_role()` SQL helper resolves the role from `auth.jwt() ->> 'role'`.

### Postconditions
1. RLS is enabled on every core table enumerated below.
2. Each table has at minimum: anon SELECT on published rows, customer SELECT on own rows, coach SELECT on own sessions, admin ALL.
3. The `service_role` bypasses RLS for server-only operations (Paymob webhooks, audit logging, backups).
4. A CI step runs `supabase db lint` and fails the build if any new table lacks RLS.

### Main Flow (Happy Path)
1. Engineer adds a new table migration.
2. Migration includes `alter table <t> enable row level security;` plus the four policy templates below.
3. CI lint fails if RLS is missing.
4. Browser queries via the Supabase JS client (anon key) cannot select rows outside the policy.
5. Server queries via the `service_role` bypass RLS for trusted flows only.

### Alternate Flows

#### A1 — A table needs a more permissive anon SELECT (e.g. `reviews` published only)
1. The policy narrows to `status = 'approved'` for `reviews`.

#### A2 — Coach needs to read bookings of their customers
1. Policy joins `bookings` to `coaches` on `coach_id` plus the coach's `user_id = auth.uid()`.

### Exception Flows

#### E1 — Engineer forgets the `enable row level security` statement
1. CI lint fails the migration with a list of offending tables.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: RLS policies

  Scenario: Anonymous SELECT on published activities
    Given RLS enabled on activities
    When the anon role selects from activities
    Then only rows with status='published' are returned

  Scenario: Customer SELECT on own bookings
    Given a customer signed in
    When they select from bookings
    Then only rows with user_id equal to their auth.uid() are returned

  Scenario: Coach SELECT on own sessions
    Given a coach signed in
    When they select from bookings where coach_id is their coach row
    Then those rows are returned
      And other coaches' rows are not

  Scenario: Admin ALL on profiles
    Given an admin signed in
    When they perform any operation on profiles
    Then the operation succeeds
      And the same operation by a customer fails

  Scenario: CI lint fails when a new table lacks RLS
    Given a new migration creates table foo without enabling RLS
    When CI runs supabase db lint
    Then the build fails with an RLS error for foo
```

### Edge Cases
1. **A service-role write from a Paymob webhook** — bypasses RLS by design; audit logged by US-IN-013.
2. **A coach who is also a customer** — `coach` role takes precedence; they can read their own customer bookings only if `bookings.user_id = auth.uid()`.
3. **Soft-deleted rows** — `status='archived'` excluded from anon SELECT but visible to admin.

### UI/UX Specifications
N/A (platform-only).

### Data Model

Policies explicitly enumerated for the eight primary tables (full SQL lives in the migration `20260728000005_enable_rls_core_tables.sql`).

```sql
-- Helper to resolve role from the JWT
create or replace function current_role()
returns text language sql stable security definer as $$
  select coalesce(auth.jwt() ->> 'role', 'anon');
$$;

-- profiles
alter table profiles enable row level security;
create policy profiles_self_select on profiles
  for select to authenticated using (user_id = auth.uid());
create policy profiles_admin_all on profiles
  for all to authenticated using (current_role() = 'admin') with check (current_role() = 'admin');

-- activities
alter table activities enable row level security;
create policy activities_published_read on activities
  for select to anon, authenticated using (status = 'published');
create policy activities_admin_all on activities
  for all to authenticated using (current_role() = 'admin') with check (current_role() = 'admin');

-- bookings
alter table bookings enable row level security;
create policy bookings_customer_self on bookings
  for select to authenticated using (user_id = auth.uid());
create policy bookings_coach_own on bookings
  for select to authenticated using (
    exists (select 1 from coaches c where c.id = bookings.coach_id and c.user_id = auth.uid())
  );
create policy bookings_admin_all on bookings
  for all to authenticated using (current_role() = 'admin') with check (current_role() = 'admin');

-- payment_transactions
alter table payment_transactions enable row level security;
create policy payments_customer_self on payment_transactions
  for select to authenticated using (user_id = auth.uid());
create policy payments_admin_all on payment_transactions
  for all to authenticated using (current_role() = 'admin') with check (current_role() = 'admin');

-- whatsapp_messages
alter table whatsapp_messages enable row level security;
create policy whatsapp_customer_self on whatsapp_messages
  for select to authenticated using (customer_user_id = auth.uid());
create policy whatsapp_admin_all on whatsapp_messages
  for all to authenticated using (current_role() = 'admin') with check (current_role() = 'admin');

-- audit_logs
alter table audit_logs enable row level security;
create policy audit_logs_admin_select on audit_logs
  for select to authenticated using (current_role() = 'admin');
-- No INSERT policy: rows only via `audit_log()` SECURITY DEFINER function.

-- content_blocks
alter table content_blocks enable row level security;
create policy content_blocks_published_read on content_blocks
  for select to anon, authenticated using (status = 'published');
create policy content_blocks_admin_all on content_blocks
  for all to authenticated using (current_role() = 'admin') with check (current_role() = 'admin');

-- reviews
alter table reviews enable row level security;
create policy reviews_approved_read on reviews
  for select to anon, authenticated using (status = 'approved');
create policy reviews_author_self on reviews
  for select to authenticated using (user_id = auth.uid());
create policy reviews_admin_all on reviews
  for all to authenticated using (current_role() = 'admin') with check (current_role() = 'admin');
```

### API Endpoints
- None (RLS is transparent to API consumers).

### Security Considerations
- RLS is the data-plane enforcement; do not rely on route-handler logic for row-level access.
- `service_role` key vaulted; audits confirm it never enters browser bundles (US-IN-015).
- `current_role()` is `security definer` so it evaluates as the Postgres owner; no privilege escalation.

### Performance Requirements
- Policies are simple `using (column = auth.uid())` predicates; planner cost ≤ 0.05 ms per table scan.

### Notifications
N/A.

### Localization
N/A.

### Error Handling
- A policy violation returns an empty result set (Supabase semantics); no error surfaced to the browser.

### Logging & Analytics
- `rls.policy_violation` is logged via Postgres `raise log` on admin panel endpoints only (P0 surfacing in v2).

### Testing Notes
#### Unit
- SQL-level: `set role anon; select ...` assertions for each table.

#### Integration
- A jest suite seeds row sets for anon + customer + coach + admin tokens and asserts result counts.

#### CI
- `supabase db lint --fail-on warning` runs on every PR.

### Related User Stories
- US-IN-004 (auth provides role), US-IN-007 (migrations create policies), every File 01–09 story that queries a table.

### Dependencies
- Supabase CLI; Postgres 15+.

### Tags
`rls` · `security` · `postgres` · `supabase` · `policy`

### Notes / Rationale
RLS shifts trust from the application to the database. Even if a route handler has a bug, a leaked anon key cannot read another customer's bookings. This is the platform's single most important security control.

---

## US-IN-006 — Supabase Storage + image CDN strategy

### Story
As a platform engineer,
I want a single Supabase Storage strategy with public and private buckets, on-the-fly transforms via `?width=` query, signed URLs for private assets, hotlink protection, and an alt-text storage discipline,
So that all media (hero, gallery, coach avatars, activity images) flows through one controlled delivery pipeline.

### Priority: P0
### Status: Draft
### Estimate: 8 (story points)
### Sprint: Sprint 1 — Foundation

### Actors
- **System actor:** Supabase Storage, `next/image`, Cloudflare/Vercel Image CDN.
- **Admin actor:** Uploads media via File 05 flows.

### Preconditions
1. Buckets `public-assets`, `private-assets`, `coach-uploads` exist.
2. CDN domain `cdn.aqualudo.net` mapped to Supabase Storage.

### Postconditions
1. Public buckets expose assets via `https://cdn.aqualudo.net/public/...`.
2. Private bucket assets require signed URLs valid for 10 minutes.
3. `?width=` and `?quality=` query params honoured by the Supabase image transform pipeline.
4. Hotlink protection returns 403 for `Referer` values outside an allowlist.
5. Every uploaded asset has a non-null `alt_text` stored in `media_assets`.

### Main Flow (Happy Path)
1. Admin uploads an activity hero image via `/api/admin/media` (File 05).
2. Server stores the binary in `public-assets/activities/{id}/hero.webp`.
3. Server inserts a row in `media_assets` with `bucket`, `path`, `mime`, `alt_text` (EN + AR jsonb), `width`, `height`, `uploaded_by`.
4. Browser renders `<Image src="https://cdn.aqualudo.net/public-assets/activities/{id}/hero.webp?width=480&quality=72"/>`.

### Alternate Flows

#### A1 — Private bucket requires a signed URL
1. Coach uploads a customer video to `private-assets`.
2. Server generates a signed URL with 10-minute expiry.
3. Browser fetches with the signed URL; on expiry, a server refresh endpoint issues a new URL.

#### A2 — Admin supplies alt_text in only one language
1. The empty language falls back to the supplied language per the i18n fallback chain.

### Exception Flows

#### E1 — Signed URL expired
1. Browser receives 403; client refetches via `/api/media/refresh?id=…`.

#### E2 — Hotlink detected
1. CDN responds 403 and a branded "leech" placeholder replaces the hotlinked asset.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Supabase Storage CDN strategy

  Scenario: Public asset is served via the CDN with transforms
    Given an admin uploaded an activity hero
    When the browser requests it with ?width=480&quality=72
    Then the response is the transformed image
      And the response has Cache-Control: public, max-age=86400, immutable

  Scenario: Private asset requires a signed URL
    Given a coach-uploaded video in private-assets
    When the browser requests the raw URL without a signature
    Then the response is 403

  Scenario: Hotlink protection rejects off-origin referers
    Given the referer is https://evil.com/page
    When the request hits cdn.aqualudo.net/public-assets/...
    Then the response is 403 with a branded placeholder image

  Scenario: alt_text is mandatory before publishing an activity
    Given an admin creates an activity and uploads a hero image
    When the admin tries to publish without alt_text
    Then the publish action is blocked with an error
```

### Edge Cases
1. **Animated GIF** — `?width=` keeps the animation; output is GIF.
2. **Uploaded PNG > 25 MB** — blocked at upload with "Max 25 MB per image".
3. **Alt-text in AR only** — for EN visitors falls back to AR alt attribute (rare; flagged in audit).

### UI/UX Specifications
N/A. Note: `/admin/media` (File 05) is the upload surface; this story defines the underlying storage and delivery contract.

### Data Model

```
media_assets
  id            uuid pk default gen_random_uuid()
  bucket        text not null check (bucket in ('public-assets','private-assets','coach-uploads'))
  path          text not null
  mime          text not null
  width         int
  height        int
  alt_text      jsonb not null default '{}'   -- { "en": "...", "ar": "..." }
  uploaded_by   uuid fk auth.users.id
  created_at    timestamptz default now()
  unique (bucket, path)
  index on (bucket, created_at desc)
```

### API Endpoints
- `POST /api/admin/media` (admin only) — multipart upload.
- `GET /api/media/refresh?id=…` (authenticated) — re-issues a signed URL.

### Security Considerations
- Upload endpoint enforces `image/*` and `video/*` mime types only.
- Signed URLs scoped to the requesting `auth.uid()` to prevent cross-customer URL sharing.
- Referer allowlist: `aqualudo.net`, `*.aqualudo.net`, `localhost` (dev only).

### Performance Requirements
- Transform cache hit ratio ≥ 90 % in production.
- CDN edge latency ≤ 30 ms for cached assets within Egypt.

### Notifications
- Upload success triggers `media.upload.created` event consumed by audit log (US-IN-013).

### Localization
- `alt_text` is jsonb with EN + AR; rendered into `alt="..."` per active locale.

### Error Handling
- Upload 4xx surfaces a toast in the admin panel.
- 403 on hotlink returns the branded placeholder silently.

### Logging & Analytics
- `media.upload.success` `{bucket, mime, bytes}`.
- `media.transform.cache_hit` boolean.
- `media.hotlink.blocked` `{referer}`.

### Testing Notes
#### Unit
- Signed URL generator + validator.
- Alt-text fallback resolver.

#### Integration
- Upload a fixture; assert media_assets row created.
- Hotlink test: spoofed referer 403.

#### E2E
- Visit a public activity page; `next/image` `srcset` values include `?width=` transforms.

### Related User Stories
- US-IN-008 (next/image strategy), US-AB-010 (admin gallery uploads), US-AC-007 (gallery rendering), US-LD-004 (hero), US-CO-008 (coach avatar).

### Dependencies
- Supabase Storage, image transformation pipeline.

### Tags
`storage` · `cdn` · `images` · `signed-url` · `i18n`

### Notes / Rationale
A single media pipeline avoids the Wix-era anti-pattern of arbitrarily-sized images. The `media_assets` table makes alt text a first-class, audited citizen rather than a tucked-away attribute.

---

## US-IN-007 — Postgres migrations & versioning (Supabase CLI)

### Story
As a platform engineer,
I want a Supabase-CLI-managed migration system where every schema change lives under `supabase/migrations/*.sql` as idempotent `create or replace` statements, CI runs `supabase db push` on PRs, down-migrations are hand-written when needed, and a seed for staging is maintained,
So that the database schema is reproducible, reviewable, and deployable with one command.

### Priority: P0
### Status: Draft
### Estimate: 8 (story points)
### Sprint: Sprint 1 — Foundation

### Actors
- **Primary actor:** Platform engineer.
- **System actor:** Supabase CLI, GitHub Actions CI.

### Preconditions
1. `supabase` CLI is installed locally and in CI.
2. The project is linked to the production Supabase project (`supabase link --project-ref aqualudo-v2`).

### Postconditions
1. All migrations live under `supabase/migrations/` with timestamp-prefixed names.
2. Each migration file begins with a header comment (pattern below).
3. CI runs `supabase db push --dry-run` on PRs and blocks merges on failure.
4. Production migrations are applied via `supabase db push` after merge to `main`.
5. Staging is seeded from `supabase/seed.sql` nightly.

### Main Flow (Happy Path)
1. Engineer runs `supabase migration new enable_xxx`.
2. Engineer writes the migration SQL using `create or replace` for functions/policies and `create table if not exists` for tables.
3. Engineer runs `supabase db push` locally against a fresh database to verify.
4. Engineer opens a PR; CI runs `supabase db push --dry-run`.
5. On merge, the deploy workflow runs `supabase db push` against production.

### Alternate Flows

#### A1 — A migration requires data backfill
1. Engineer adds an `insert ... select ...` block guarded by `on conflict do nothing`.
2. CI flags any migration affecting > 1000 rows with a warning comment requiring reviewer acknowledgement.

#### A2 — A down-migration is required
1. Engineer hand-writes a companion `supabase/migrations/<ts>_down_<name>.sql` that reverses the change.
2. Down-migrations are run manually; they are not applied automatically in production.

### Exception Flows

#### E1 — `db push` fails due to a captive object
1. Engineer identifies the blocking object (often a view depending on a renamed column).
2. Engineer adds `drop view if exists … cascade; … recreate view` in the migration.
3. CI dry-run re-attempts.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Postgres migrations & versioning

  Scenario: Migration file follows the header convention
    Given any migration in supabase/migrations
    Then the first lines contain the header comment with ticket, author, and date

  Scenario: CI dry-run blocks a broken migration
    Given a PR introduces a malformed migration
    When CI runs supabase db push --dry-run
    Then the build fails with a TODO list of failed statements

  Scenario: Idempotent migrations can be re-applied without error
    Given a migration uses create or replace function ...
    When the migration is applied twice
    Then the second run succeeds without errors

  Scenario: Staging is seeded nightly
    Given the cron job triggers at 02:00 UTC
    Then supabase/seed.sql is applied to the staging database
      And staging is reset to a known state
```

### Edge Cases
1. **A migration depends on another not yet merged** — CI runs migrations in lexical order; engineer uses a later timestamp prefix.
2. **A `create table if not exists` would silently skip a desired change** — engineer uses `alter table` for column additions.

### UI/UX Specifications
N/A.

### Data Model

Migration header comment pattern:

```sql
-- ============================================================================
-- Migration: 20260728000005_enable_rls_core_tables
-- Author:     <github handle>
-- Ticket:     AQL-115
-- Date:       2026-07-28
-- Summary:    Enable RLS on core tables; apply the four-template policies.
-- Reverses:   (manual) 20260728000005_down_enable_rls_core_tables.sql
-- ============================================================================

create or replace function current_role()
returns text language sql stable security definer as $$
  select coalesce(auth.jwt() ->> 'role', 'anon');
$$;
-- ... statements ...
```

### API Endpoints
None (CLI).

### Security Considerations
- Migrations never contain secrets; the production service role key is referenced via env var only at deploy time.
- `db push` runs with the service role; a 2-approval rule applies to migrations touching auth or RLS.

### Performance Requirements
- CI dry-run completes ≤ 120 s on a fresh Postgres container.

### Notifications
- Successful production migration posts to the engineering Slack channel `#aql-deploys`.

### Localization
N/A.

### Error Handling
- CI dry-run failure surfaces the offending statement block in the PR check.

### Logging & Analytics
- `db.migration.applied` `{name, duration_ms}` from the deploy workflow.

### Testing Notes
#### Unit
- A lint script verifies every migration file includes the header comment.

#### Integration
- `supabase db reset` then run the package's test suite; assert seed matches expectations.

#### CI
- `supabase db push --dry-run` per PR.

### Related User Stories
- US-IN-005 (RLS templates ship as a migration), US-IN-021 (indexing migrations), every File 02–09 story that adds a table.

### Dependencies
- Supabase CLI 1.x.

### Tags
`migrations` · `supabase` · `postgres` · `ci`

### Notes / Rationale
Treating schema as code (not as a knowledge artefact in a DBA's head) is the single foundation that lets the team ship reliably in growth-stage sprints. Idempotency (`create or replace`) keeps the migration set replayable on developer laptops without conflicts.

---

## US-IN-008 — Frontend image strategy (next/image; remotePatterns; blur placeholder)

### Story
As a visitor on a metered mobile plan or a slow 3G connection,
I want every image on AquaLudo v2 to be served via `next/image` with responsive `srcset`, native lazy-loading, a blur placeholder, format negotiation (AVIF/WebP agnostic), and an ISR-friendly preload for the LCP hero,
So that the hero paints fast and the rest of the page streams without burning my data.

### Priority: P0
### Status: Draft
### Estimate: 5 (story points)
### Sprint: Sprint 1 — Foundation

### Actors
- **Primary actor:** Anonymous visitor.
- **System actor:** `next/image`, the Vercel image optimiser, the CDN pipeline in US-IN-006.

### Preconditions
1. `next.config.js` `images.remotePatterns` allowlist includes `cdn.aqualudo.net` and the Supabase Storage domain.
2. AVIF/WebP transcode pipeline is enabled on the CDN.

### Postconditions
1. No `<img>` tag is shipped outside of `next/image`.
2. The hero image of every page uses `priority` for LCP preload.
3. All non-priority images use `loading="lazy"` (default in `next/image`).
4. `blurDataURL` is supplied for every image with a known placeholder.
5. `sizes` attribute is supplied so the browser picks the right `srcset` entry.

### Main Flow (Happy Path)
1. Engineer imports `Image` from `next/image` and uses it for every asset.
2. For hero images, engineer adds `priority` so Next injects the preload link.
3. For below-the-fold images, no `priority`; native lazy loading engages.
4. Browser negotiates AVIF > WebP > original via the Accept header.
5. Initial CLS is 0 because `width` + `height` are always set.

### Alternate Flows

#### A1 — Image asset has no known dimensions
1. Engineer passes `fill` plus a sized parent; no `width`/`height` required.

### Exception Flows

#### E1 — `next/image` upstream returns 5xx
1. The hosted fallback gradient (US-LD-004 E1) shows; the alt text remains.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Frontend image strategy

  Scenario: Hero image is preloaded for LCP
    Given the visitor opens /
    Then the HTML <head> contains <link rel="preload" as="image" href="…hero…">
      And the hero image renders within the LCP budget

  Scenario: Below-the-fold images native-lazy-load
    Given the visitor opens /activities
    Then card images have loading="lazy"
      And the gallery images are not requested until intersection

  Scenario: Browser requesting AVIF receives AVIF
    Given the browser sends Accept: image/avif,image/webp,*/*
    Then the response Content-Type is image/avif

  Scenario: A raw <img> tag fails the lint
    Given an engineer writes <img src=…/> in a component
    Then the ESLint rule aqualudo/no-raw-img fails the build
```

### Edge Cases
1. **Inline SVG icons** excluded from the rule (use `lucide-react`).
2. **User avatar with no upload** — falls back to a branded initials avatar.
3. **Animated hero video** — not subject to `next/image`; US-LD-001 handles that.

### UI/UX Specifications
N/A. Note: the blur placeholder is up to 28 px square, base64-encoded, ≤ 200 bytes.

### Data Model
None (uses `media_assets` from US-IN-006).

### API Endpoints
None.

### Security Considerations
- `remotePatterns` allowlist prevents arbitrary external image hosting.
- `dangerouslyAllowSVG` remains false; no SVG from user uploads.

### Performance Requirements
- Hero LCP ≤ 2.0 s on 4G mobile (US-LD-004).
- Combined image payload for `/activities` grid ≤ 1.0 MB at 4G.

### Notifications
N/A.

### Localization
- The `alt` attribute reflects `media_assets.alt_text[locale]` (US-IN-006).

### Error Handling
- Image 4xx/5xx → blur-up placeholder; telemetry `image.load_failed` `{url}`.

### Logging & Analytics
- `image.load_failed` `{url}`.
- `image.cache_hit` ratio reported monthly from `next/image`.

### Testing Notes
#### Unit
- ESLint rule unit test.
- `sizes` resolver utility.

#### E2E
- Visit `/`; assert `<link rel="preload" as="image">` is present.
- Throttle to 3G; assert hero first paint ≤ 2.0 s.

#### CI
- ESLint runs `aqualudo/no-raw-img` across the codebase.

### Related User Stories
- US-IN-006 (storage pipeline), US-LD-001 (loading animation poster), US-LD-004 (hero), US-AC-001 (cards), every visual story.

### Dependencies
- `next/image` (built-in), Vercel image optimiser (auto-enabled on Vercel).

### Tags
`images` · `next-image` · `lcp` · `performance` · `i18n`

### Notes / Rationale
`next/image` plus the Supabase transform pipeline gives AVIF/WebP for free; the only cost is discipline, which the ESLint rule enforces.

---

## US-IN-009 — Search infra (quick_search RPC + ILIKE indexes + pg_trgm)

### Story
As a visitor typing a free-text query in the quick search overlay (US-LD-015),
I want fast results across activities, events, and coaches with fuzzy matches against partial strings,
So that I can find "row", "rowing", or "rowsprinter" and land on the right page within 500 ms.

### Priority: P1
### Status: Draft
### Estimate: 5 (story points)
### Sprint: Sprint 2 — Catalog MVP

### Actors
- **Primary actor:** Anonymous visitor using ⌘K / `/` overlay.
- **System actor:** Postgres `quick_search(text)` RPC, `pg_trgm` extension, `gin(name gin_trgm_ops)` indexes.

### Preconditions
1. The `pg_trgm` extension is installed.
2. GIN trigram indexes exist on `activities.name`, `events.name`, `profiles.full_name`.
3. Partial indexes filter `status='published'`/`status='active'`.

### Postconditions
1. `quick_search(q text)` returns classified rows (activity/event/coach) within 250 ms p95 for queries of length 3–8.
2. Results are limited to 5 per category.
3. An empty query returns an empty list with no error.

### Main Flow (Happy Path)
1. Visitor types at least 1 character; the overlay debounces 150 ms.
2. Client calls `POST /api/search` with `{q}`.
3. Server invokes the Supabase RPC `quick_search(q)`.
4. Server returns a typed list; the overlay renders grouped rows.
5. Telemetry `search.query` `{query, result_count}`.

### Alternate Flows

#### A1 — Query length > 32 chars
1. Truncate to 32 chars before invoking the RPC.

#### A2 — Query contains only stopwords
1. The RPC still runs but may return 0 rows; overlay shows "No matches" with a fallback link to `/activities`.

### Exception Flows

#### E1 — RPC times out (> 1000 ms)
1. Server returns 504 with `{message: "Search is busy"}`; overlay shows a retry button.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Search infra

  Scenario: Partial text match returns activities
    Given the visitor types "row"
    When the search call returns
    Then results include Rowing activities
      And the response time is under 500 ms

  Scenario: Trigram index accelerates fuzzy matches
    Given the visitor types "rowsprinter" (a typo)
    Then results still return matching rows near "rowing"

  Scenario: Empty query returns empty list
    Given the visitor clears the search box
    Then POST /api/search returns 200 with an empty array

  Scenario: Rate limit caps a flooding client
    Given a client sending 100 search calls per minute
    Then calls beyond 30/min receive 429
```

### Edge Cases
1. **Arabic query** — trigram works on Arabic Unicode; the `gin_trgm_ops` operator class handles UTF-8.
2. **Query contains regex metacharacters** — `ILIKE` is parameterised; no regex injection.
3. **A new activity published mid-session** — the next query reflects it because no result caching at the RPC level.

### UI/UX Specifications
N/A. (Overlay UX is US-LD-015.)

### Data Model

```sql
create extension if not exists pg_trgm;

create index if not exists activities_name_trgm
  on activities using gin (name gin_trgm_ops)
  where status = 'published';

create index if not exists events_name_trgm
  on events using gin (name gin_trgm_ops)
  where status = 'published';

create index if not exists profiles_name_trgm
  on profiles using gin (full_name gin_trgm_ops)
  where role = 'coach' and status = 'active';

create or replace function quick_search(q text)
returns table (
  result_type text,
  slug text,
  title text,
  subtitle text,
  image_url text
)
language sql stable security definer as $$
  select 'activity'::text, slug, name, short_description, hero_image_url
    from activities
    where status = 'published' and (name ilike '%' || q || '%' or short_description ilike '%' || q || '%')
    limit 5
  union all
  select 'event'::text, slug, name, description, hero_image_url
    from events
    where status = 'published' and (name ilike '%' || q || '%' or description ilike '%' || q || '%')
    limit 5
  union all
  select 'coach'::text, slug, full_name, specialties::text, avatar_url
    from profiles
    where role = 'coach' and status = 'active' and full_name ilike '%' || q || '%'
    limit 5;
$$;
```

### API Endpoints
- `POST /api/search` — `{q: string}`; rate-limited at 30/min/IP.

### Security Considerations
- Parameterised `ILIKE`; no concatenation into SQL.
- Anon-only RPC `security definer` returns only public columns.

### Performance Requirements
- p95 ≤ 250 ms for queries 3–8 chars with `pg_trgm`.
- Zero full-table scans in `EXPLAIN ANALYZE`.

### Notifications
N/A.

### Localization
- Title/desc returned in the visitor's locale by the RPC (jsonb column access in the function).

### Error Handling
- Rate limit → 429 with `Retry-After: 60`.

### Logging & Analytics
- `search.query` `{query, result_count, duration_ms}`.
- `search.result_click` `{result_type, slug}` from the overlay.

### Testing Notes
#### Unit
- RPC test seeded with 20 activities + 5 events + 3 coaches; assert matching counts.

#### Integration
- A `/api/search` jest test with a real test-database call.

#### E2E
- ⌘K → type "row" → press Enter → land on `/activities/rowing`.

### Related User Stories
- US-LD-015 (overlay), US-AC-003 (activities filter), US-IN-021 (indexes).

### Dependencies
- Supabase Postgres 15+; `pg_trgm`.

### Tags
`search` · `pg-trgm` · `postgres` · `rpc`

### Notes / Rationale
Trigram indexes + ILIKE beat Postgres full-text search for the ≤ 5-result-per-category use case where partial matches matter more than relevance ranking. Relevant results ranking is done in the client by category.

---

## US-IN-010 — Newsletter audience storage (double opt-in; suppression; CSV export)

### Story
As an admin marketing manager,
I want to collect newsletter subscribers with a double opt-in flow, a suppression list for unsubscribes, and an admin-only CSV export in Mailchimp's expected format,
So that I can run newsletter campaigns without leaking unsubscribed contacts or false sign-ups.

### Priority: P2
### Status: Draft
### Estimate: 5 (story points)
### Sprint: Sprint 3 — Admin MVP

### Actors
- **Primary actor:** Anonymous visitor subscribing via the footer form (US-LD-010).
- **Admin actor:** Marketing manager exporting via `/admin/newsletter`.
- **System actor:** Supabase Auth-less table `newsletter_subscribers`.

### Preconditions
1. The footer newsletter form posts to `POST /api/newsletter/subscribe`.
2. SMTP / WhatsApp is available for the double opt-in link.

### Postconditions
1. Pending subscribers receive a confirmation email with a signed token.
2. Confirmed subscribers land in `newsletter_subscribers` with `status='subscribed'`.
3. Unsubscribe requests update `status='unsubscribed'` and add the email to `newsletter_suppressions`.
4. Admin CSV export filters only `status='subscribed'` and matches Mailchimp's column layout.

### Main Flow (Happy Path)
1. Visitor enters email in the footer form.
2. Server inserts `newsletter_subscribers` row with `status='pending'`, `confirm_token=gen_random_uuid()`.
3. Server sends a confirmation email with `https://aqualudo.net/newsletter/confirm?token=…`.
4. Visitor clicks the link; server updates `status='subscribed'`, clears the token.
5. Telemetry `newsletter.subscribe.confirmed`.

### Alternate Flows

#### A1 — Subscriber re-enters an already-confirmed email
1. Server returns a polite "You're already subscribed" toast; no duplicate row.

#### A2 — Subscriber unsubscribes via the email footer link
1. `https://aqualudo.net/newsletter/unsubscribe?token=…` matches a per-subscriber token.
2. Server updates `status='unsubscribed'` and inserts into `newsletter_suppressions`.

### Exception Flows

#### E1 — Confirmation token expired (7 days)
1. Server returns an "expired link" page with a "resend confirmation" CTA.

#### E2 — Complaint / hard bounce webhook
1. Mailchimp webhook posts to `/api/newsletter/webhook` → inserts suppression with `reason='bounce|complaint'`.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Newsletter audience storage

  Scenario: Double opt-in confirms a new subscriber
    Given a new email hello@example.com not in the table
    When the visitor submits the form
    Then a confirmation email is sent
      And newsletter_subscribers has a pending row
    When the visitor clicks the confirmation link
    Then the row status becomes "subscribed"
      And a telemetry event newsletter.subscribe.confirmed fires

  Scenario: Re-subscribe of an existing confirmed email is a no-op
    Given hello@example.com is already subscribed
    When the visitor submits the same email
    Then no new row is inserted
      And a toast "You're already subscribed" is shown

  Scenario: Unsubscribe token works once
    Given a subscriber with a valid unsubscribe token
    When the subscriber clicks the unsubscribe link
    Then the row status becomes "unsubscribed"
      And the email is added to newsletter_suppressions
      And a second click of the same link returns "Already unsubscribed"

  Scenario: Admin CSV export filters subscribed only
    Given the admin clicks "Export CSV"
    Then a CSV downloads with only subscribed rows
      And columns match Mailchimp's expected layout
```

### Edge Cases
1. **Email with mixed casing (`Hello@Example.com`)** — server lower-cases before insert/update.
2. **Bounce webhook arrives before confirm** — row pre-emptively marked `unsubscribed` via suppression.

### UI/UX Specifications
N/A. The footer form is the user-facing input (US-LD-010); admin export UI is owned by File 05.

### Data Model

```sql
create table newsletter_subscribers (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,
  status         text not null check (status in ('pending','subscribed','unsubscribed')) default 'pending',
  confirm_token  uuid,
  unsubscribe_token uuid,
  preferred_locale text default 'en',
  source         text,            -- 'footer', 'about', 'event'
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  confirmed_at   timestamptz
);

create table newsletter_suppressions (
  email          text primary key,
  reason         text not null check (reason in ('unsubscribe','bounce','complaint','manual')),
  created_at     timestamptz not null default now()
);

-- RLS: anon INSERT only on (email, preferred_locale, source);
--      all other operations admin-only.
```

### API Endpoints
- `POST /api/newsletter/subscribe` (anon) — creates pending row.
- `GET /api/newsletter/confirm?token=…` (anon) — confirms.
- `GET /api/newsletter/unsubscribe?token=…` (anon) — unsubscribes.
- `POST /api/newsletter/webhook` (Mailmob/Mailchimp HMAC-signed) — bounce/complaint.
- `GET /api/admin/newsletter/export.csv` (admin) — CSV export.

### Security Considerations
- Tokens are `gen_random_uuid()` (122 bits entropy).
- Webhook HMAC verified against the Mailchimp webhook secret.
- Rate limit subscribe at 5/min/IP.

### Performance Requirements
- Subscribe endpoint returns ≤ 200 ms TTFB.
- CSV export streams rows; no in-memory buffering for > 50k subscribers.

### Notifications
- Double opt-in email is the first notification; subsequently the audience is exported to Mailchimp for actual campaign delivery.

### Localization
- Confirmation email subject/body uses `preferred_locale`.

### Error Handling
- Invalid token → themed error page with a "Request a new link" CTA.
- Expired token → themed error page with a "Resend confirmation" CTA.

### Logging & Analytics
- `newsletter.subscribe.start`, `newsletter.subscribe.confirmed`, `newsletter.unsubscribe`, `newsletter.bounce`.

### Testing Notes
#### Unit
- Token generator and validator.
- CSV serializer column order.

#### Integration
- Subscribe → confirm → unsubscribe cycle.

#### E2E
- Fill the footer form → mock SMTP → click confirm link in the test body → assert subscribed status.

### Related User Stories
- US-LD-010 (footer form), US-AB-014 (admin panel), US-CN-001 (email dispatch infra).

### Dependencies
- Mailchimp (or equivalent ESP) for export; SMTP relay for confirmations.

### Tags
`newsletter` · `double-opt-in` · `suppression` · `csv` · `mailchimp`

### Notes / Rationale
Double opt-in plus a suppression list is the COMPLIANCE baseline for Egypt's emerging data-protection regime and aligns with Mailchimp's bounce standards. Storing the audience in-app (rather than only in Mailchimp) preserves the option to switch ESP without losing history.

---

## US-IN-011 — Accessibility (WCAG 2.1 AA; reduce-motion; screen reader semantics)

### Story
As a visitor who relies on a screen reader, keyboard navigation, or reduced-motion preferences,
I want AquaLudo v2 to conform to WCAG 2.1 AA — including color contrast ≥ 4.5:1 for body text, visible focus indicators, ARIA semantics, keyboard navigability, reduce-motion support, and alt-text discipline,
So that the site is usable by the widest audience including users with motor, visual, and cognitive differences.

### Priority: P0
### Status: Draft
### Estimate: 13 (story points)
### Sprint: Sprint 1 — Foundation (conformance Sprint 3)

### Actors
- **Primary actor:** Visitors using assistive technology.
- **System actor:** The entire app, ESLint `jsx-a11y` plugin, axe-core in CI.

### Preconditions
1. WCAG 2.1 AA target agreed.
2. `eslint-plugin-jsx-a11y` installed and configured to error.

### Postconditions
1. Body text color contrast ≥ 4.5:1; large text (≥ 18 px) ≥ 3:1.
2. Every interactive element has a visible focus indicator (≥ 2 px outline, offset 2 px).
3. Every image has a meaningful `alt` (decorative images use `alt=""`).
4. Every form control has an associated `<label>` or `aria-labelledby`.
5. `prefers-reduced-motion: reduce` disables non-essential animations (US-LD-003).
6. Keyboard-only E2E test passes for primary flows (home → activities → activity detail → booking shell).

### Main Flow (Happy Path)
1. Engineer implements components using semantic HTML (`<button>`, `<nav>`, `<main>`, `<section>` with `aria-labelledby`).
2. ESLint `jsx-a11y` rule set blocks accessibility violations on commit.
3. CI runs `axe-core` against primary Playwright routes; failures fail the build.
4. A quarterly accessibility audit samples 5 primary flows and verifies conformance.

### Alternate Flows

#### A1 — Decorative image
1. Engineer sets `alt=""` (`aria-hidden` not needed for img).
2. ESLint `jsx-a11y/alt-text` accepts the empty alt.

#### A2 — Animated component
1. Engineer wraps framer-motion animation in a `useReducedMotion` check; reduce-motion path renders the static end state.

### Exception Flows

#### E1 — An axe-core violation surfaces
1. CI fails with the offending rule and a Playwright screenshot.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Accessibility WCAG 2.1 AA

  Scenario: Body text contrast meets 4.5:1
    Given the home hero subtitle renders
    Then the computed contrast ratio between text and background is at least 4.5:1

  Scenario: Every interactive element is keyboard reachable
    Given a keyboard-only user on /
    When the user tabs through header, hero CTAs, nav, and footer
    Then every interactive element receives visible focus in logical order

  Scenario: Labels associate with form inputs
    Given the /sign-in form renders
    Then each input has an associated label or aria-labelledby
      And axe-core reports no form-label violations

  Scenario: Reduced-motion disables hero entrance
    Given the OS reports prefers-reduced-motion: reduce
    When the home hero mounts
    Then no entrance animation runs
      And the hero renders in its final state
```

### Edge Cases
1. **A focus indicator obscured by an overlapping element** — `:focus-visible` uses box-shadow with offset to guarantee visibility.
2. **Live region announcements for async errors** — sign-in error wrapped in `aria-live="polite"`.

### UI/UX Specifications
- Focus outline: `2px solid var(--brand-teal); outline-offset: 2px;`.
- Skip-to-content link first focusable element of every page.
- Color tokens tested against AA; teal `#0d4f73` on white = 7.4:1.

### Data Model
None.

### API Endpoints
None.

### Security Considerations
- Aria attributes use static keys; no `aria-*` interpolated from user input.

### Performance Requirements
- axe-core CI run completes ≤ 90 s on the five primary routes.

### Notifications
- Screen-reader announcements are emitted on critical toast and error states (US-LD-014, US-BF-* error toasts).

### Localization
- All aria-label values are localised via `useTranslations`.

### Error Handling
- CI failure surfaces a per-rule axe report.

### Logging & Analytics
- `a11y.audit.passed` once per CI run.
- `a11y.violation` `{rule_id}` in dev.

### Testing Notes
#### Unit
- `useReducedMotion()` hook.
- Color contrast token test.

#### Integration
- axe-core assertions on Playwright snapshots.

#### E2E
- Keyboard-only navigation from `/` through booking shell passes.

#### CI
- `npm run a11y:ci` runs axe-core on `/`, `/activities`, `/activities/rowing`, `/booking`, `/sign-in`.

### Related User Stories
- US-LD-003 (reduce-motion path), US-LD-014 (error pages), US-IN-002 (i18n for aria labels), every visual story.

### Dependencies
- `eslint-plugin-jsx-a11y`, `axe-core`, Playwright `@axe-core/playwright`.

### Tags
`accessibility` · `wcag` · `a11y` · `reduce-motion` · `i18n`

### Notes / Rationale
Egyptian audiences include elderly first-time rowers and parents of teen athletes; accessible patterns expand the addressable market and align with the brand's inclusive ethos. Beyond compliance, fixed focus indicators measurably improve conversion for keyboard power users.

---

## US-IN-012 — Sentry integration (Next.js + Supabase adapters; source maps; sampling)

### Story
As an on-call engineer supporting AquaLudo v2 in production,
I want Sentry to capture unhandled exceptions, install Next.js + Supabase adapters, upload source maps in CI, sample performance transactions at 10 %, and surface a user feedback widget on the 500 error page,
So that an error reaching production is triaged within minutes with full source-mapped stack traces and reproduction context.

### Priority: P1
### Status: Draft
### Estimate: 5 (story points)
### Sprint: Sprint 2 — Observability

### Actors
- **Primary actor:** On-call engineer.
- **Secondary actor:** Visitor who lands on the 500 page.
- **System actor:** Sentry Next.js SDK, Supabase adapter, CI source-map upload step.

### Preconditions
1. A Sentry project `aqualudo-v2` exists; DSN + auth token in Vercel env vars (US-IN-015).
2. Source maps are enabled in `next.config.js` (`productionBrowserSourceMaps: true`).

### Postconditions
1. Every unhandled client/server exception is reported to Sentry with the user's locale, route, and role.
2. Source maps are uploaded during the Vercel build step so stack traces de-obfuscate.
3. Performance monitoring samples 10 % of page views.
4. The 500 page renders a `<SentryUserFeedbackWidget/>` so the visitor can describe what happened.
5. PII redaction in place: emails and phone numbers scrubbed from breadcrumbs.

### Main Flow (Happy Path)
1. Build writes `.next/build/server/**.map` and client maps.
2. CI step `sentry-cli sourcemaps upload` runs after the Vercel build succeeds.
3. In production, runtime errors funnel into Sentry with release tags.
4. On-call engineer reviews the Sentry issue; merges a fix; Sentry marks the regression on the next deploy if the issue does not reappear.

### Alternate Flows

#### A1 — 500 page renders the feedback widget
1. Visitor lands on `/500`; clicks "Tell us what happened".
2. Message attached to the Sentry event for that session.

### Exception Flows

#### E1 — Sentry itself is unreachable
1. The SDK buffers up to 20 events locally and retries on subsequent navigation.
2. If buffer overflows, events are dropped silently.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Sentry integration

  Scenario: Unhandled exception is reported
    Given an engineer throws an unhandled error in a Route Handler
    When the error fires in production
    Then a Sentry issue is created
      And the issue includes the source-mapped stack trace

  Scenario: Source maps are uploaded in CI
    Given the Vercel build completes
    Then the sentry-cli sourcemaps upload step runs
      And Sentry shows de-obfuscated symbols for the new release

  Scenario: Performance monitoring samples 10 percent
    Given 1000 page views land in production
    Then approximately 100 transactions are sampled by Sentry

  Scenario: 500 page shows the user feedback widget
    Given a visitor hits /500
    Then the Sentry user feedback widget is rendered
      And submitting a message attaches it to the last error event
```

### Edge Cases
1. **Stripe/Paymob webhook signature failure** — captured as `paymob.webhook.invalid` with safe breadcrumbs.
2. **A Supabase query throws `null` parameter violation** — Supabase adapter wraps the error with a Postgres detail string.

### UI/UX Specifications
- The 500 page (US-LD-014) renders the feedback widget below the themed error copy.

### Data Model
None.

### API Endpoints
None (Sentry SDK writes to its own ingest endpoint).

### Security Considerations
- Sentry `beforeSend` hook scrubs `Authorization`, `Cookie`, and JWT substrings from breadcrumbs.
- PII rules strip email and phone regex matches from message bodies.

### Performance Requirements
- SDK initial bundle cost ≤ 25 KB gzipped.
- Per-event payload ≤ 8 KB compressed.

### Notifications
- On-call engineer receives a Sentry alert on `error` level issues that affect > 1 % of sessions in 5 minutes.

### Localization
- The feedback widget's "Tell us what happened" copy is localised.

### Error Handling
- SDK errors never escalate to the visitor; swallowed and logged to console in dev.

### Logging & Analytics
- Sentry issue URLs are linked into the engineering Slack alert channel.

### Testing Notes
#### Unit
- `beforeSend` scrubber regex test.

#### Integration
- Trigger an error in a staging Route Handler; assert Sentry ingest count.

#### E2E
- Visit `/500`; assert feedback widget visible; submit; assert attached event in Sentry test project.

### Related User Stories
- US-LD-014 (500 page), US-IN-014 (deployment uploads source maps), US-IN-017 (monitoring ties in here).

### Dependencies
- `@sentry/nextjs`, `@sentry/supabase` adapter, `sentry-cli`.

### Tags
`sentry` · `observability` · `errors` · `source-maps` · `performance`

### Notes / Rationale
Source-mapped errors reduce triage from hours to minutes. The 10 % performance sample caps cost while preserving statistical signal for Core Web Vitals correlation.

---

## US-IN-013 — Audit log primitive (audit_logs table; audit_log() function)

### Story
As a compliance-conscious platform,
I want an append-only `audit_logs` table that records every privileged state change (admin edits, payment events, role changes, content updates) via a `audit_log()` Postgres function callable in the same transaction as the change,
So that the platform has a tamper-evident trail admissible in internal investigations and Egyptian emerging regulatory review.

### Priority: P0
### Status: Draft
### Estimate: 8 (story points)
### Sprint: Sprint 2 — Platform hardening

### Actors
- **System actor:** Postgres `audit_log()` function, RLS on `audit_logs`.
- **Admin actor:** Reads audit history in `/admin/audit` (File 05).

### Preconditions
1. The `audit_logs` table is created.
2. `revoke update, delete on audit_logs from public, authenticated, anon` is in place.

### Postconditions
1. Every privileged mutation calls `select audit_log(action, entity, entity_id, payload)` within the same transaction.
2. The `audit_logs` row inherits the calling transaction's success or rollback.
3. `audit_logs` is admin-SELECT-only; no other role can read or modify the table directly.
4. A weekly digest summarises top actions and emails admins.

### Main Flow (Happy Path)
1. An admin presses "Publish activity" (File 05).
2. The Route Handler opens a Postgres transaction.
3. Insert into `activities` with `status='published'`.
4. `select audit_log('activity.publish', 'activities', new.id, jsonb_build_object('slug', new.slug))`.
5. Transaction commits; both rows written atomically.

### Alternate Flows

#### A1 — Transaction rolls back
1. The `audit_logs` row inserted in the same transaction is also rolled back, leaving no orphan trail.

### Exception Flows

#### E1 — `audit_log()` invoked outside a transaction
1. Function logs anyway (autonomous-style behaviour is intentionally NOT used to preserve atomicity); record is committed independently if caller has no surrounding transaction.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Audit log primitive

  Scenario: A privileged action creates an audit log row
    Given an admin publishes an activity
    When the publish transaction commits
    Then an audit_logs row exists with action="activity.publish"
      And entity_id matches the new activity id
      And payload contains the slug

  Scenario: Audit log row is rolled back if the parent transaction fails
    Given an admin publishes an activity that throws a constraint violation
    When the transaction rolls back
    Then no audit_logs row exists

  Scenario: Non-admin users cannot read audit_logs
    Given a customer signed in
    When they select from audit_logs
    Then the result set is empty

  Scenario: update/delete on audit_logs is revoked
    Given any non-superuser role
    When the role attempts update or delete on audit_logs
    Then Postgres returns permission denied
```

### Edge Cases
1. **A service-role call from Paymob webhook** — calls `audit_log('payment.webhook', 'payment_transactions', …)`.
2. **Bulk admin action affecting > 1000 rows** — emits a summary `audit_log` entry with counts plus per-row entries; throttle per-row entries after 1000.

### UI/UX Specifications
N/A. The `/admin/audit` listing surface is owned by File 05.

### Data Model

```sql
create table audit_logs (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  actor_id     uuid fk auth.users.id,
  role         text not null,                       -- 'admin','coach','customer','service'
  action       text not null,
  entity       text not null,
  entity_id    uuid,
  payload      jsonb not null default '{}'
);

create index audit_logs_entity_idx on audit_logs (entity, entity_id);
create index audit_logs_action_idx on audit_logs (action, created_at desc);

revoke update, delete on audit_logs from public, authenticated, anon;

create or replace function audit_log(
  p_action text,
  p_entity text,
  p_entity_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns void language plpgsql security definer as $$
declare
  v_role text;
  v_actor uuid;
begin
  v_role := coalesce(auth.jwt() ->> 'role', 'service');
  v_actor := auth.uid();
  insert into audit_logs (actor_id, role, action, entity, entity_id, payload)
  values (v_actor, v_role, p_action, p_entity, p_entity_id, p_payload);
end;
$$;
```

### API Endpoints
- `GET /api/admin/audit?page=…` (admin only) — paginated listing.

### Security Considerations
- `revoke update, delete` from all roles (except Postgres superuser) ensures append-only semantics.
- `audit_log` is `security definer` so non-admin roles can call it for their own actions without needing INSERT on the table.
- Admin SELECT via RLS policy.

### Performance Requirements
- `audit_log()` adds ≤ 1 ms to a transaction.
- `audit_logs` partitioned quarterly after year 2 to keep indexes small.

### Notifications
- Weekly digest emailed to admins (US-CN-001).

### Localization
- `action` strings are stable identifiers (not localised); the admin listing translates labels via a known-catalogue map.

### Error Handling
- If `audit_log()` itself fails, the transaction is allowed to succeed; a Sentry breadcrumb records the failed audit (rare; e.g. column overflow).

### Logging & Analytics
- Telemetry events `audit.write.success` and `audit.write.fail` are server-only.

### Testing Notes
#### Unit
- `audit_log()` call invoked inside a rollback; assert no row persisted.

#### Integration
- A Paymob webhook flow inserts a `payment.webhook` audit row.

#### E2E
- Admin signs in → publishes a content block → `/admin/audit` shows the new row.

### Related User Stories
- US-IN-005 (RLS for `audit_logs` admin-only SELECT), every admin story in Files 05, 06, 07 that mutates state.

### Dependencies
- Postgres 15+; Supabase.

### Tags
`audit` · `compliance` · `append-only` · `postgres`

### Notes / Rationale
Sharing the same transaction as the mutation guarantees the trail can never diverge from reality — a common gap when audit logs are written in the application layer after the fact.

---

## US-IN-014 — Deployment to Vercel (preview deploys; prod on git push; edge middleware)

### Story
As a developer,
I want every PR to deploy a Vercel preview environment, every push to `main` to deploy to production, ISR to be configured per-route, runtime to be Node.js 20, and edge middleware to handle locale + auth redirects,
So that I can review changes in a production-like environment and ship to `aqualudo.net` without manual deploy steps.

### Priority: P0
### Status: Draft
### Estimate: 8 (story points)
### Sprint: Sprint 1 — Foundation

### Actors
- **Primary actor:** Developer pushing to GitHub.
- **System actor:** Vercel build pipeline, edge middleware, ISR.

### Preconditions
1. The GitHub repo is connected to the Vercel project.
2. Environment variables configured per environment (US-IN-015).
3. `next.config.js` declares runtime config and `runtime: 'nodejs20x'` where applicable.

### Postconditions
1. Each PR gets a `*.vercel.app` preview URL with staging env vars.
2. Each push to `main` deploys to `aqualudo.net` after checks pass.
3. ISR revalidate intervals are honoured per route (60 s `/`, 300 s `/activities/[slug]`, etc.).
4. Edge middleware runs before route resolution for locale resolution and auth redirects.
5. Deployments are atomic; a failed build does not promote.

### Main Flow (Happy Path)
1. Developer opens a PR.
2. Vercel builds and deploys a preview.
3. Reviewer tests on the preview URL.
4. PR merges to `main`.
5. Vercel deploys to production; ISR caches regenerate lazily.
6. The deploy webhook posts the URL to `#aql-deploys`.

### Alternate Flows

#### A1 — Promote an older deployment via Vercel rollback
1. On-call clicks "Rollback" on a prior production deployment.
2. Vercel atomically swaps the active alias to the prior build.

### Exception Flows

#### E1 — Build fails in production
1. The previous deployment remains active; Slack alert fired.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Deployment to Vercel

  Scenario: PR opens and a preview URL is generated
    Given a developer opens a PR
    Then a Vercel preview deployment is created
      And the URL is posted as a GitHub check

  Scenario: Push to main deploys to production
    Given a PR is merged to main
    Then a production deployment starts
      And on success aqualudo.net serves the new build

  Scenario: Edge middleware redirects unauth admin visits
    Given an anonymous user requests /admin
    Then edge middleware returns 302 to /sign-in?next=/admin

  Scenario: ISR revalidates the home route every 60 seconds
    Given the home route was served 65 seconds ago
    When the next request arrives
    Then the response is regenerated
      And the Cache-Control header lists s-maxage=60
```

### Edge Cases
1. **Database migrations out of sync** — the deploy blocks if `supabase db push --dry-run` flagged a schema change in the same PR.
2. **A flagged feature off in prod but on in preview** — environment variable `FEATURE_FLAG_X` differs per env; conform to US-IN-015.

### UI/UX Specifications
N/A.

### Data Model
None.

### API Endpoints
- `middleware.ts` (Edge runtime) runs on every request.

### Security Considerations
- Preview URLs are visible to anyone who has the link; sensitive operations require sign-in even on preview.
- Production domain `aqualudo.net` SSL auto-rotated by Vercel.

### Performance Requirements
- Production warm TTFB ≤ 200 ms p95 in Cairo via Vercel's `iad1`/`fra1` PoPs.
- Edge middleware added latency ≤ 25 ms p95.

### Notifications
- Deploy success/failure posts to `#aql-deploys`.

### Localization
- Edge middleware resolves the locale cookie before any route renders.

### Error Handling
- Build failure logs surface in the GitHub check and the Vercel dashboard.

### Logging & Analytics
- `deploy.success` `{env, commit, deployment_url}`.
- `deploy.fail` `{env, commit, reason}`.

### Testing Notes
#### E2E
- A Playwright suite runs against the preview URL on every PR via a GitHub Actions matrix.
- A smoke suite runs against production after deploy via `/api/health`.

### Related User Stories
- US-IN-002 (middleware locale), US-IN-004 (middleware auth), US-IN-016 (ISR cache interacting with backups), every file that declares ISR revalidate intervals.

### Dependencies
- Vercel project; GitHub integration.

### Tags
`deployment` · `vercel` · `edge` · `middleware` · `isr`

### Notes / Rationale
Vercel's atomic deployments and PR previews remove the toil of staging environments. Edge middleware para la locale/auth resolution keeps the perceived TTFB low.

---

## US-IN-015 — Environment & secrets management (Vercel env vars; service-role key vault)

### Story
As a platform engineer,
I want every secret scoped per environment (development/preview/production), the Supabase service role key vaulted and never shipped to the browser, dev/prod/preview environments isolated, and a documented rotation playbook for every secret,
So that a leaked key can be rotated within 30 minutes without downtime and never escalates beyond its environment.

### Priority: P0
### Status: Draft
### Estimate: 5 (story points)
### Sprint: Sprint 1 — Foundation

### Actors
- **Primary actor:** Platform engineer.
- **System actor:** Vercel Environment Variables UI, Supabase project keys, Vercel runtime.

### Preconditions
1. The Vercel project has Development, Preview, and Production environments configured.
2. The Supabase service role key is stored only in encrypted Vercel env vars scoped to Production.

### Postconditions
1. Every secret is named `SUPABASE_*`, `PAYMOB_*`, `SENTRY_*`, `META_WHATSAPP_*`, `MAILCHIMP_*` consistently.
2. Public env vars (`NEXT_PUBLIC_*`) contain only the anon key and DSNs.
3. The service role key is server-only; verified by a CI grep that it never appears in a `NEXT_PUBLIC_*` var or a client bundle.
4. A rotation runbook documents each secret's lifecycle and the steps to rotate.

### Main Flow (Happy Path)
1. Engineer adds a new secret via Vercel CLI `vercel env add`.
2. Engineer scopes it to the correct environment.
3. Engineer references the secret in code via `process.env.NAME`.
4. CI verifies no client bundle includes the secret.

### Alternate Flows

#### A1 — Engineers need a secret locally
1. Engineer exports from Vercel Development environment into `.env.local` via `vercel env pull`.
2. `.env.local` is git-ignored.

### Exception Flows

#### E1 — A secret is leaked to a client bundle
1. CI scan finds the substring; the build fails; Slack alert fired.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Environment & secrets management

  Scenario: SUPABASE_SERVICE_ROLE_KEY is scoped to production only
    Given the Vercel project env vars
    Then SUPABASE_SERVICE_ROLE_KEY exists only in the Production environment
      And no NEXT_PUBLIC_* var contains its value

  Scenario: CI grep catches a client-side leak
    Given an engineer accidentally references process.env.SUPABASE_SERVICE_ROLE_KEY in a client component
    When CI runs the bundle grep
    Then the build fails with the offending file

  Scenario: Rotation runbook rotates Paymob secret within 30 minutes
    Given the Paymob webhook signing secret is suspected leaked
    When the on-call follows the runbook
    Then a new secret is provisioned and Vercel env var updated
      And the Paymob webhook continues to verify within 30 minutes of the alert
```

### Edge Cases
1. **Two developers share `.env.local`** — secrets must never be checked in; the runbook forbids this.
2. **Vercel preview needs a test Paymob key** — the Preview environment uses Paymob's sandbox credentials, never production.

### UI/UX Specifications
N/A.

### Data Model
None.

### API Endpoints
- None directly; CI has a `scripts/audit-env.ts` that asserts key naming and scoping.

### Security Considerations
- Every secret rotated on a cadence (90 days for keys, 365 days for DSNs).
- Service role key vaulted; access logged.

### Performance Requirements
- The CI grep runs in ≤ 30 s.

### Notifications
- Slack alert `#aql-secrets` on a leak detection.

### Localization
N/A.

### Error Handling
- A missing secret in production surfaces as a 500 with Sentry breadcrumbs (no message in the response body).

### Logging & Analytics
- `secret.leak.detected` in Sentry.

### Testing Notes
#### Unit
- The `audit-env.ts` test mocks Vercel API responses.

#### CI
- The grep step runs on every PR.

### Related User Stories
- US-IN-004 (auth uses env vars), US-IN-005 (RLS enforcement pair), US-IN-014 (deployment), every Paymob/Meta/Mailchimp integration.

### Dependencies
- Vercel CLI; Supabase service role key; vault.

### Tags
`secrets` · `env-vars` · `vercel` · `security` · `ci`

### Notes / Rationale
Centralising secrets in Vercel's env var UI with named conventions (`UPPER_SNAKE` + provider prefix) keeps the audit grep simple. The 30-minute rotation SLA is what the business committed to in the data-protection review.

---

## US-IN-016 — Backups & disaster recovery (PITR; weekly S3 export; restore drill)

### Story
As the platform owner,
I want Supabase daily encrypted backups with PITR for 7 days, a weekly logical export to S3, a documented restore runbook, and a quarterly restore drill,
So that a catastrophic failure or accidental data loss can be recovered within 1 hour RTO and 24 hours RPO.

### Priority: P1
### Status: Draft
### Estimate: 5 (story points)
### Sprint: Sprint 2 — Platform hardening

### Actors
- **Primary actor:** On-call engineer.
- **System actor:** Supabase automated backups; nightly export script; S3 bucket.

### Preconditions
1. PITR is enabled on the production Supabase project.
2. An S3 (or compatible) bucket `aqualudo-prod-logical-exports` exists with lifecycle policy 90 days.

### Postconditions
1. Supabase creates daily encrypted snapshots at 02:00 UTC.
2. PITR supports restoring to any second within the last 7 days.
3. A nightly script (`scripts/db-export.ts`) dumps the logical schema + data to S3 weekly (Sunday 03:00 UTC).
4. A restore runbook lives in `docs/runbooks/restore.md`.
5. A quarterly restore drill verifies the runbook end-to-end.

### Main Flow (Happy Path)
1. Supabase creates the daily snapshot at 02:00 UTC.
2. Sunday 03:00 UTC: Vercel Cron triggers `scripts/db-export.ts` which streams `pg_dump` output to S3.
3. Quarterly: on-call runs the restore drill in a staging Supabase project and verifies row counts match.

### Alternate Flows

#### A1 — Restore a dropped `bookings` row via PITR
1. On-call opens the Supabase dashboard, picks the timestamp before the drop, restores to a fresh staging project, exports the missing row, and re-inserts into prod via a service-role script.

### Exception Flows

#### E1 — S3 export fails
1. Vercel Cron retries once after 10 minutes; if still failing, alerts `#aql-oncall`.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Backups & disaster recovery

  Scenario: Supabase creates a daily encrypted snapshot
    Given the production Supabase project
    When the clock reaches 02:00 UTC
    Then a snapshot is created and visible in the dashboard

  Scenario: Weekly logical export lands in S3
    Given it is Sunday 03:00 UTC
    When the Vercel Cron runs scripts/db-export.ts
    Then a new file lands in s3://aqualudo-prod-logical-exports/YYYY/MM/DD.sql.gz
      And the file size is greater than zero

  Scenario: Restore drill verifies recoverability
    Given the quarterly restore drill
    When on-call restores the latest weekly export to staging
    Then the row counts of activities, bookings, profiles match production within tolerance
      And a runbook sign-off entry is recorded
```

### Edge Cases
1. **Backup window conflicts with nightly maintenance** — Supabase schedules around it automatically.
2. **The logical export grows beyond 10 GB** — the script uses `pg_dump --schema-only` + per-table parallel dumps to keep within the 30-minute window.

### UI/UX Specifications
N/A.

### Data Model
None (operational concern).

### API Endpoints
- `POST /api/cron/db-export` (Vercel Cron with `CRON_SECRET` header check).

### Security Considerations
- The S3 bucket is private; access is via IAM roles cross-account.
- `pg_dump` runs with a read-only Supabase role.

### Performance Requirements
- Logical export completes ≤ 30 minutes for the v1 data size (estimated 200 MB).

### Notifications
- Drill success posted to `#aql-platform`.
- Drill failure pages the on-call.

### Localization
N/A.

### Error Handling
- Cron failure retries once then alerts.

### Logging & Analytics
- `backup.daily_snapshot` `{id, size}` from Supabase webhook.
- `backup.logical_export.success` and `.fail` from the cron.

### Testing Notes
#### Integration
- A staging DR run replays the latest weekly export and asserts schema round-trip.

#### Operability
- Quarterly drill sign-off recorded in `docs/runbooks/restore.md`.

### Related User Stories
- US-IN-014 (deployment), US-IN-020 (cron infrastructure), US-AB-013 (admin delete actions must be backed up).

### Dependencies
- Supabase PITR; S3-compatible bucket.

### Tags
`backups` · `disaster-recovery` · `pitr` · `s3` · `cron`

### Notes / Rationale
"A backup that has never been restored is not a backup." The quarterly drill codifies this truth and keeps on-call engineers familiar with the restore path under low pressure.

---

## US-IN-017 — Monitoring & alerting (Vercel Analytics; Paymob ping; WhatsApp alert)

### Story
As the on-call engineer,
I want Vercel Analytics tracking Core Web Vitals, Supabase Health monitored, Paymob payment webhook uptime pinged every 5 minutes, alerting on 95th percentile error rate > 5 % over 5 minutes, and critical alerts dispatched to admins via WhatsApp (per File 09 dispatcher),
So that production issues are surfaced before customers report them.

### Priority: P1
### Status: Draft
### Estimate: 8 (story points)
### Sprint: Sprint 2 — Observability

### Actors
- **Primary actor:** On-call engineer.
- **Admin actor:** Receives WhatsApp alerts.
- **System actor:** Vercel Analytics, uptime pinger, alert dispatcher.

### Preconditions
1. Vercel Analytics enabled on the project.
2. `PAYMOB_WEBHOOK_URL` configured.
3. The File 09 WhatsApp dispatcher exposes a server-side `sendAdminAlert(message)` helper.

### Postconditions
1. Vercel Web Vitals dashboard shows LCP, INP, CLS for production.
2. Supabase Health status polled every 5 minutes; degradation triggers an alert.
3. Paymob webhook uptime pinged every 5 minutes; two consecutive failures fire an alert.
4. Sentry error rate > 5 % p95 over a 5-minute window raises a critical alert.
5. Critical alerts dispatched to admins via WhatsApp within 60 seconds.

### Main Flow (Happy Path)
1. Vercel Cron invokes `/api/cron/health-check` every 5 minutes.
2. Endpoint pings Supabase Health, Paymob webhook URL, and Vercel's own build status.
3. Results stored in `monitoring_pings` (last 24 hours retained).
4. An alert rule evaluates error-rate from Sentry + pings; if any rule is true, calls `sendAdminAlert`.

### Alternate Flows

#### A1 — Paymob ping returns non-200
1. Recorded as a failed ping; alert only after two consecutive failures to avoid transient flakes.

### Exception Flows

#### E1 — Alert dispatcher itself is unavailable
1. The monitoring endpoint logs to Sentry as `alert.dispatcher.fail`; on-call paged directly via Vercel's email integration.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Monitoring & alerting

  Scenario: Paymob ping succeeds
    Given the Paymob webhook is reachable
    When /api/cron/health-check runs
    Then a 200 status is recorded against paymob_webhook

  Scenario: Two consecutive failed pings raise an alert
    Given the Paymob webhook returns 503 twice in a row
    When the second ping completes
    Then sendAdminAlert is called with the Paymob failure summary
      And the admins receive a WhatsApp message

  Scenario: Sentry error rate spikes
    Given the p95 error rate exceeds 5 percent over 5 minutes
    Then a critical alert is dispatched via WhatsApp within 60 seconds

  Scenario: Core Web Vitals are visible in Vercel Analytics
    Given a real-user visit to /
    Then the LCP, INP, CLS metrics are recorded by Vercel Analytics
      And the dashboard shows the 75th percentile values
```

### Edge Cases
1. **Paymob sandbox in preview env** — only the production cron pings the production webhook URL.
2. **A spike triggered by a single malicious request** — the 5-minute window plus p95 is robust against single outliers.

### UI/UX Specifications
N/A.

### Data Model

```sql
create table monitoring_pings (
  id            uuid primary key default gen_random_uuid(),
  service       text not null,
  status        text not null,                -- 'ok', 'fail'
  latency_ms    int,
  detail        jsonb,
  created_at    timestamptz not null default now()
);
create index monitoring_pings_service_time on monitoring_pings (service, created_at desc);
```

### API Endpoints
- `POST /api/cron/health-check` (Vercel Cron with `CRON_SECRET` header).

### Security Considerations
- `CRON_SECRET` header verified on every cron invocation.
- Alerts do not include user PII; only service name and inline summary.

### Performance Requirements
- Health check endpoint completes ≤ 4 s including all three pings.

### Notifications
- WhatsApp alert via File 09 dispatcher is the primary channel.
- Email + Vercel dashboard fallback.

### Localization
- Admin alert message composed in `ar-EG` (default admin audience) with optional EN.

### Error Handling
- A failed ping is stored with status `'fail'` and a `detail.code`.

### Logging & Analytics
- `monitoring.ping` `{service, status, latency_ms}`.
- `monitoring.alert.dispatched` `{service, channel}`.

### Testing Notes
#### Unit
- The alert rule evaluator: feed varying windows; assert true/false.

#### Integration
- Mock the Paymob webhook; assert two failures raise an alert.

#### E2E
- Trigger a synthetic 503 on a staging Paymob endpoint; observe the WhatsApp test message.

### Related User Stories
- US-IN-012 (Sentry), US-IN-017 (this story's infrastructure), US-CN-001 (WhatsApp dispatcher), US-IN-020 (cron).

### Dependencies
- Vercel Analytics, Vercel Cron, File 09 dispatcher.

### Tags
`monitoring` · `alerting` · `whatsapp` · `uptime` · `cron`

### Notes / Rationale
Egyptian operations run predominantly on WhatsApp; routing critical alerts there minimises time-to-acknowledge. Pinging Paymob separately from generic uptime monitoring isolates the most revenue-critical dependency.

---

## US-IN-018 — Security headers & CSP

### Story
As a security-conscious platform owner,
I want every response to ship with a Content-Security-Policy that whitelists `self`, Supabase, the CDN, and Paymob; plus `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`, and a rate-limit on auth endpoints,
So that the platform mitigates XSS, clickjacking, header injection, and credential brute-force at the edge.

### Priority: P0
### Status: Draft
### Estimate: 5 (story points)
### Sprint: Sprint 1 — Foundation

### Actors
- **Primary actor:** Browser enforcing the headers.
- **System actor:** Next.js middleware headers, Vercel edge rate-limit.

### Preconditions
1. The Vercel domain `aqualudo.net` is HTTPS-only with HSTS preload list eligibility.

### Postconditions
1. Every HTML response sets `Content-Security-Policy` per template below.
2. `X-Frame-Options: DENY` on all responses.
3. `Referrer-Policy: strict-origin-when-cross-origin` on all responses.
4. `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
5. `/sign-in` and `/api/auth/whatsapp/otp/request` rate-limited per IP.

### Main Flow (Happy Path)
1. Middleware sets the security headers on every response.
2. Browser enforces CSP, blocking any inline script not in the nonce list.
3. Vercel Edge rate-limit kicks in after threshold breaches on auth endpoints.

### Alternate Flows

#### A1 — Paymob iframe needs frame-ancestors
1. The Paymob payment iframe host is added to `frame-src` and `child-src`.

### Exception Flows

#### E1 — A third-party script break due to CSP
1. The script's origin is added to `script-src` after security review; never use `'unsafe-inline'`.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Security headers & CSP

  Scenario: HTML response ships the CSP header
    Given any HTML response from aqualudo.net
    Then the Content-Security-Policy header is present
      And it whitelists self, supabase.co, cdn.aqualudo.net, and paymob

  Scenario: HSTS is enabled
    Given a request to aqualudo.net
    Then Strict-Transport-Security max-age=63072000 includeSubDomains preload

  Scenario: Sign-in rate limit caps brute-force
    Given an attacker makes 20 sign-in attempts in a minute
    Then the 21st attempt receives 429

  Scenario: Inline script without nonce is blocked
    Given a developer inserts a <script>console.log(1)</script> in a page
    Then the browser blocks it per CSP
      And the console reports a CSP violation
```

### Edge Cases
1. **Supabase Realtime** used in coach panel — `connect-src wss://*.supabase.co`.
2. **Sentry ingest endpoint** — `connect-src *.sentry.io`.
3. **OCR font from Google Fonts in legacy admin** — `style-src fonts.googleapis.com` and `font-src fonts.gstatic.com` added during migration only.

### UI/UX Specifications
N/A. Note: a CSP violation report endpoint `/api/csp-report` receives `report-to` payloads in dev/staging only.

### Data Model
None.

### API Endpoints
- `POST /api/csp-report` (dev/staging only) — stores samples for review.

### Security Considerations
- A nonce-based `script-src` policy is generated per request in middleware.
- Rate-limit applies per IP and per identifier (email/phone) — whichever triggers first.
- CSP `report-uri`/`report-to` configured for staging so violations surface before prod.

Example CSP header text:

```
default-src 'self';
script-src 'self' 'nonce-{random}' https://vercel.live;
style-src 'self' 'unsafe-inline';
img-src 'self' https://cdn.aqualudo.net https://*.supabase.co data:;
font-src 'self' https://fonts.gstatic.com;
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.paymob.com https://*.sentry.io;
frame-src https://accept.paymobsolutions.com https://iframe.paymob.com;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
report-uri /api/csp-report;
```

### Performance Requirements
- Header overhead per response ≤ 1 KB.
- Rate-limiter adds ≤ 5 ms.

### Notifications
- CSP violation samples surfaced weekly to the engineering team while in dev/staging.

### Localization
N/A.

### Error Handling
- A blocked resource logs to the browser console in dev; muted in prod.

### Logging & Analytics
- `csp.violation` sample `{directive, blocked-uri}` from dev/staging.

### Testing Notes
#### Unit
- Header resolver unit test for nonce rotation.

#### E2E
- Observatory-grade scan (Mozilla) returns A+.

#### CI
- `npm run security:headers` validates headers against `observatory` in staging.

### Related User Stories
- US-IN-004 (auth rate limit), US-IN-012 (Sentry in connect-src), US-IN-014 (Vercel response headers).

### Dependencies
- Next.js middleware; Vercel Edge rate-limit.

### Tags
`security` · `csp` · `hsts` · `rate-limit` · `headers`

### Notes / Rationale
A strict CSP plus nonce-based script allowlist prevents entire classes of stored XSS — critical because admin-supplied CMS text could otherwise execute as customer-context JS.

---

## US-IN-019 — Telemetry event primitives (analytics_events; typed catalog; track())

### Story
As a product analyst,
I want a single telemetry primitive — an `analytics_events` table, a typed event catalog, and a `track()` helper callable from both server and client — so that every event in the system is named consistently, schema-validated, and queryable for weekly retention reports,
So that product decisions rest on a unified data backbone rather than ad-hoc logging.

### Priority: P1
### Status: Draft
### Estimate: 5 (story points)
### Sprint: Sprint 2 — Observability

### Actors
- **Primary actor:** Frontend engineers adding events.
- **System actor:** `analytics_events` table, `track()` helper, downstream warehouse.

### Preconditions
1. The `analytics_events` table is partitioned monthly.
2. The typed catalog lives in `lib/telemetry/catalog.ts`.

### Postconditions
1. Every telemetry call goes through `track(eventName, properties)`.
2. The catalog supplies a TypeScript type for each event's properties; mismatched payloads fail typecheck.
3. Anonymous events (no `user_id`) carry a `session_id` cookie.
4. A weekly retention report aggregates `analytics_events` into a warehouse view exposed to the marketing team.

### Main Flow (Happy Path)
1. Engineer imports `track` from `lib/telemetry`.
2. Engineer adds an event name to the catalog with a typed properties interface.
3. Engineer calls `track('activity.detail.view', { activity_id, tier_id, locale })`.
4. On the client, `track` posts to `/api/telemetry`; on the server, it inserts directly.
5. CI typecheck blocks if the payload shape does not match the catalog.

### Alternate Flows

#### A1 — Server-side `track` in a Route Handler
1. `track('booking.created', { booking_id, user_id })` inserts via the service role.

### Exception Flows

#### E1 — Telemetry insert fails
1. Server logs the failure to Sentry as `telemetry.fail`; the visitor's request still succeeds.
2. Client `track` failures are silently swallowed.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Telemetry event primitives

  Scenario: Client track post inserts an analytics_events row
    Given an anonymous visitor
    When the client calls track("search.query", { query: "row", result_count: 3 })
    Then an analytics_events row is created with event_name="search.query"
      And event_properties contains the supplied values
      And session_id matches the visitor's telemetry session cookie

  Scenario: Mismatched payload fails typecheck
    Given an engineer calls track("activity.detail.view", { wrong_key: 1 })
    When the TypeScript compiler runs
    Then the build fails with a type error listing the expected shape

  Scenario: Telemetry failure does not break the request
    Given a Route Handler calls track and the Supabase insert throws
    Then the Route Handler still returns its normal response
      And a Sentry breadcrumb records telemetry.fail
```

### Edge Cases
1. **A client event before cookie is set** — generates a fresh `session_id` and sets the cookie immediately.
2. **A bulk import from a CSV** — uses the service role directly, bypassing `track`.

### UI/UX Specifications
N/A.

### Data Model

```sql
create table analytics_events (
  id            uuid primary key default gen_random_uuid(),
  event_name    text not null,
  event_properties jsonb not null default '{}',
  session_id    text,
  user_id       uuid fk auth.users.id,
  created_at    timestamptz not null default now()
) partition by range (created_at);

create index analytics_events_name_time on analytics_events (event_name, created_at desc);
create index analytics_events_session on analytics_events (session_id, created_at desc);
```

### API Endpoints
- `POST /api/telemetry` (anon allowed; rate-limited per US-IN-001 in File 01).

### Security Considerations
- Event properties are scrubbed for PII before insert (server-side scrubber).
- Rate limit: 60 events/min/session, 30/min/IP for anon.

### Performance Requirements
- `track` client → server roundtrip ≤ 100 ms in the background.
- Insert path is fire-and-forget on the client; failures are swallowed.

### Notifications
N/A.

### Localization
- Event names are English short-snake-case identifiers; never localised copy.

### Error Handling
- Server insert failures are logged to Sentry; do not block user flows.

### Logging & Analytics
- The system itself emits `telemetry.fail` to Sentry on insert failures.

### Testing Notes
#### Unit
- Catalog type assertions: every catalog entry has a TS interface that round-trips.

#### Integration
- A jest test inserts an event via `track` and asserts the row.

#### E2E
- Visit `/activities/rowing`; assert `activity.detail.view` row in the test database.

### Related User Stories
- US-LD-001 (loading events), US-AC-001 (listing events), every File 03–09 story that emits events.

### Dependencies
- Supabase Postgres partitioning.

### Tags
`telemetry` · `analytics` · `events` · `catalog` · `pii`

### Notes / Rationale
A typed catalog is the difference between product analytics that compounds and a flood of inconsistent event names. The catalog is the single source of truth that engineers, analysts, and reporting tools consult.

---

## US-IN-020 — Cron jobs & scheduled tasks (Vercel Cron)

### Story
As a platform engineer,
I want a single declarative Vercel Cron configuration covering scheduled WhatsApp dispatch scan, daily 07:00 coach digest, midnight waitlist-offer expiry sweep, and nightly Supabase backup verification,
So that scheduled operations are visible in one place, retry-safe, and authenticated via a shared CRON_SECRET header.

### Priority: P1
### Status: Draft
### Estimate: 5 (story points)
### Sprint: Sprint 2 — Platform hardening

### Actors
- **System actor:** Vercel Cron, Route Handlers.
- **Admin actor:** Reviews the daily 7am coach digest.

### Preconditions
1. `CRON_SECRET` env var configured.
2. Each Route Handler validates `x-cron-secret` header.

### Postconditions
1. The `vercel.json` cron block declares all scheduled jobs.
2. Each job is idempotent and safe to re-run.
3. Failures are logged to Sentry and surface in `#aql-oncall`.
4. The_CRON_SECRET-guarded handler returns 401 on missing/wrong header.

### Main Flow (Happy Path)
1. Vercel Cron triggers each Route Handler at the declared schedule.
2. The handler validates the secret header.
3. The handler executes its job (e.g. dispatch scan) and writes an `audit_log` entry.
4. The handler returns 200 on completion.

### Alternate Flows

#### A1 — Handler re-entered before previous run completes
1. A `cron_lock` row guards each handler; the second invocation returns 200 with `skipped`.

### Exception Flows

#### E1 — Handler throws an error
1. Sentry breadcrumb captures the exception; the response is 500; Vercel retries the cron on next interval naturally (no manual retry needed).

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Cron jobs & scheduled tasks

  Scenario: WhatsApp dispatch scan runs every 5 minutes
    Given the Vercel Cron schedule
    When the clock hits a 5-minute boundary
    Then /api/cron/whatsapp-dispatch is invoked
      And the x-cron-secret header matches

  Scenario: Daily 7am coach digest fires at 07:00 Cairo time
    Given the Vercel Cron schedule
    When the clock reaches 07:00 Africa/Cairo
    Then /api/cron/coach-digest is invoked
      And each active coach receives an email + WhatsApp digest

  Scenario: Midnight waitlist-offer expiry sweep
    Given it is 00:30 Africa/Cairo
    When /api/cron/waitlist-expiry runs
    Then all waitlist_offers with expires_at < now() are marked expired
      And customers are notified of the expiry

  Scenario: Nightly backup verification
    Given it is 02:30 UTC
    When /api/cron/db-backup-verify runs
    Then the latest Supabase snapshot from US-IN-016 is queried
      And a confirmation row is inserted into monitoring_pings

  Scenario: Missing CRON_SECRET header returns 401
    Given a request to /api/cron/whatsapp-dispatch without the secret
    Then the response is 401
      And no work is performed
```

### Edge Cases
1. **Daylight saving transition** — Vercel Cron uses UTC; the 7am Cairo job shifts by an hour in summer. Mitigation: handler checks `now() AT TIME ZONE 'Africa/Cairo'` and idempotently skips if already run today.
2. **A job runs for > 5 minutes** — `cron_lock` prevents double execution; the long job completes its iteration and the next interval's invocation runs cleanly.

### UI/UX Specifications
N/A.

### Data Model

```sql
create table cron_locks (
  job_name      text primary key,
  locked_at     timestamptz,
  locked_by     text
);
```

### API Endpoints
- `POST /api/cron/whatsapp-dispatch` (every 5 min).
- `POST /api/cron/coach-digest` (07:00 Africa/Cairo daily).
- `POST /api/cron/waitlist-expiry` (00:30 Africa/Cairo daily).
- `POST /api/cron/db-backup-verify` (02:30 UTC daily).

Example `vercel.json` cron config:

```json
{
  "crons": [
    { "path": "/api/cron/whatsapp-dispatch", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/coach-digest",       "schedule": "0 5 * * *" },
    { "path": "/api/cron/waitlist-expiry",    "schedule": "30 22 * * *" },
    { "path": "/api/cron/db-backup-verify",   "schedule": "30 2 * * *" }
  ]
}
```

(Schedules are in UTC; offsets above reflect 05:00 UTC = 07:00 Africa/Cairo in summer, 22:30 UTC = 00:30 Africa/Cairo in summer. Handlers assert `now() AT TIME ZONE 'Africa/Cairo'` to remain robust.)

### Security Considerations
- `CRON_SECRET` header required; the secret differs between Preview and Production.
- Handlers limit work per invocation; long scans paginate via `created_at` cursor.

### Performance Requirements
- Each handler completes ≤ 60 s; long tasks were split into minutes-scoped iterations.

### Notifications
- Coach digest dispatches via WhatsApp + email; failures alert on-call.

### Localization
- Coach digest body composed in the coach's `preferred_locale`.

### Error Handling
- Handler exception → 500 + Sentry breadcrumb.
- Idempotency via `cron_locks` ensures safe retries.

### Logging & Analytics
- `cron.job.completed` `{job_name, duration_ms, rows_affected}`.
- `cron.job.failed` `{job_name, reason}`.

### Testing Notes
#### Unit
- Lock acquire/release helper.
- Schedule-to-Cairo-time converter.

#### Integration
- WhatsApp dispatch handler with mocked dispatcher invocation.

#### E2E
- Trigger `/api/cron/whatsapp-dispatch` with the secret header; assert job progress rows.

### Related User Stories
- US-CN-002 (WhatsApp dispatcher), US-CO-009 (coach digest), US-BF-014 (waitlist offers), US-IN-016 (backup verify), US-IN-017 (monitoring).

### Dependencies
- Vercel Cron; `CRON_SECRET`.

### Tags
`cron` · `scheduling` · `vercel` · `supabase` · `whatsapp`

### Notes / Rationale
Putting all cron jobs in one `vercel.json` block creates a single a priori observability point; admins can answer "what runs on a schedule?" without grepping the codebase.

---

## US-IN-021 — Database performance indexing strategy

### Story
As a platform engineer,
I want a per-table indexing strategy enumerated for every core table, with monitoring via `pg_stat_user_indexes`, and a quarterly `EXPLAIN ANALYZE` audit to catch unused and missing indexes,
So that query latency stays consistent as AquaLudo v2 grows from 250 to 25,000 customers.

### Priority: P1
### Status: Draft
### Estimate: 5 (story points)
### Sprint: Sprint 2 — Platform hardening

### Actors
- **Primary actor:** Platform engineer.
- **System actor:** Postgres planner, `pg_stat_user_indexes`, quarterly audit script.

### Preconditions
1. The migrations in US-IN-007 created the indexes enumerated below.
2. `pg_stat_statements` enabled on Supabase Postgres.

### Postconditions
1. Every foreign key has a backed index (`<table>_<fk>_idx`).
2. Every query path documented in Files 01–09 has an index covering its predicates.
3. Unused indexes are identified via `pg_stat_user_indexes.idx_scan = 0` over 30 days and dropped.
4. A quarterly audit reports the slowest 10 queries by `mean_exec_time` from `pg_stat_statements`.

### Main Flow (Happy Path)
1. Engineer adds a new query path.
2. Engineer adds the covering indexes in the same migration.
3. CI runs `EXPLAIN (FORMAT JSON)` against the new query; asserts an index scan is chosen.
4. Quarterly script generates the audit report.

### Alternate Flows

#### A1 — A composite index is needed for a common filter combination
1. Engineer adds `create index … on activities (category_id, status) where status='published'`.

### Exception Flows

#### E1 — A sequential scan is unavoidable
1. The query planner chooses a seq scan on a ≤ 100-row table; this is acceptable. Document the decision.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Database performance indexing strategy

  Scenario: Every FK column has a backing index
    Given any foreign key column declared in schema migrations
    Then there exists an index on that column

  Scenario: pg_stat_user_indexes flags an unused index
    Given an index has idx_scan=0 over 30 days
    When the quarterly audit runs
    Then the index is listed in the drop candidates report

  Scenario: EXPLAIN ANALYZE confirms an index scan
    Given the activities listing query
    When EXPLAIN ANALYZE runs in CI
    Then the plan uses Index Scan on activities_status_published_idx
```

### Edge Cases
1. **A partial index's predicate changes** — the old index dropped before the new one created to avoid double maintenance cost.
2. **A query with an OR clause needs a UNION rewrite** — the audit catches it via the slow-query report.

### UI/UX Specifications
N/A.

### Data Model

Index enumeration (concise):

```sql
-- profiles
create index profiles_user_id_idx on profiles (user_id);
create index profiles_role_status_idx on profiles (role, status);

-- activities
create index activities_status_published_idx on activities (status) where status = 'published';
create index activities_category_idx on activities (category_id);
create index activities_display_order_idx on activities (display_order, created_at desc);

-- bookings
create index bookings_user_start_idx on bookings (user_id, start_at desc);
create index bookings_coach_start_idx on bookings (coach_id, start_at desc);
create index bookings_status_idx on bookings (status) where status in ('pending','confirmed','completed');

-- payment_transactions
create index payments_booking_idx on payment_transactions (booking_id);
create index payments_status_idx on payment_transactions (status);
create index payments_provider_ref_idx on payment_transactions (provider_reference);

-- whatsapp_messages
create index whatsapp_customer_idx on whatsapp_messages (customer_user_id, created_at desc);
create index whatsapp_status_idx on whatsapp_messages (status, scheduled_for);

-- audit_logs
create index audit_logs_entity_idx on audit_logs (entity, entity_id);
create index audit_logs_action_time_idx on audit_logs (action, created_at desc);

-- content_blocks
create index content_blocks_slug_status_idx on content_blocks (slug, status);

-- reviews
create index reviews_activity_status_idx on reviews (activity_id, status, created_at desc);
create index reviews_booking_idx on reviews (booking_id);

-- analytics_events
create index analytics_events_name_time_idx on analytics_events (event_name, created_at desc);
create index analytics_events_session_idx on analytics_events (session_id, created_at desc);

-- newsletter_subscribers
create index newsletter_status_email_idx on newsletter_subscribers (status, email);

-- monitoring_pings
create index monitoring_pings_service_time_idx on monitoring_pings (service, created_at desc);
```

### API Endpoints
None (operational concern).

### Security Considerations
- A new partial index avoids leaking unpublished rows because its predicate filters them out of the index entirely.

### Performance Requirements
- Quarterly audit script runs ≤ 5 minutes.
- Slowest p95 query remains ≤ 100 ms.

### Notifications
- Audit report emailed quarterly to `#aql-platform`.

### Localization
N/A.

### Error Handling
- A failed `EXPLAIN ANALYZE` in CI blocks the PR with the planner output.

### Logging & Analytics
- `db.index_audit.report_generated` once per run.

### Testing Notes
#### Unit
- A migration linter asserts every FK has a backing index.

#### Integration
- CI runs `EXPLAIN (FORMAT JSON)` for the activities listing and quick_search queries; parses the plan to assert index usage.

#### Operability
- The quarterly script writes its report to `docs/audits/db/YYYMM.md`.

### Related User Stories
- US-IN-005 (RLS predicates often require backing indexes), US-IN-009 (search is index-dependent), US-IN-021 (this story), every File 02–09 story that declares a query path.

### Dependencies
- Postgres 15+; `pg_stat_statements`, `pg_stat_user_indexes`.

### Tags
`indexes` · `performance` · `postgres` · `audit` · `explain-analyze`

### Notes / Rationale
Index regressions are the slow failure mode of growing platforms; the quarterly audit makes this a visible hygiene habit rather than a triage-only activity. Pairing the audit with `pg_stat_statements` ensures we measure real workload, not synthetic assumptions.

---

## End of File 10

This file documents the cross-cutting platform infrastructure user stories consumed by every other file in the AquaLudo v2 user-story library:

- **File 01** — Loading Animation & Public Discovery (consumes US-IN-001/002/003/004/005/006/008/009/011/014).
- **File 02** — Activities & Pricing Catalog (consumes US-IN-002/003/005/006/008/009/011/019/021).
- **File 03** — Booking Flow (consumes US-IN-004/005/006/013/018/019/020).
- **File 04** — Customer Account (consumes US-IN-002/003/004/005/006/011/019).
- **File 05** — Admin Content Management (consumes US-IN-004/005/006/007/013/019/020).
- **File 06** — Admin Heatmap Dashboard (consumes US-IN-004/005/013/019/021).
- **File 07** — Admin Booking Management (consumes US-IN-004/005/013/019/021).
- **File 08** — Coach Panel (consumes US-IN-002/003/004/005/006/013/019/020).
- **File 09** — Communications & Notifications (consumes US-IN-004/013/015/017/018/019/020).

---

## End of user story library

All ten files of the AquaLudo v2 user-story library are now authored:

1. `01-loading-and-public-discovery.md`
2. `02-activities-and-pricing-catalog.md`
3. `03-booking-flow.md`
4. `04-customer-account.md`
5. `05-admin-content-management.md`
6. `06-admin-heatmap-dashboard.md`
7. `07-admin-booking-management.md`
8. `08-coach-panel.md`
9. `09-communications-notifications.md`
10. `10-platform-infrastructure.md`

The library is intended as the canonical source of truth for v1 ship, with each file independently reviewable and each story independently estimable.