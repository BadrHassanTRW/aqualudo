# File 01 — Loading Animation & Public Discovery User Stories

> **Project:** AquaLudo v2 (water sports academy on the Nile, Cairo, Egypt)
> **Stack:** Next.js 14 (App Router) + Supabase (Postgres + Auth + Storage) + Paymob
> **Domain covered by this file:** Watery loading animation, public landing/marketing pages (home, about, contact), primary navigation, footer, language/RTL toggle, quick search, error pages.
> **Last updated:** 2026-07-28
> **Status:** Draft (awaiting technical + business review)
> **Owner:** Product team
> **Related files:**
> - `02-activities-and-pricing-catalog.md`
> - `03-booking-flow.md`
> - `04-customer-account.md`
> - `05-admin-content-management.md`
> - `06-admin-heatmap-dashboard.md`
> - `07-admin-booking-management.md`
> - `08-coach-panel.md`
> - `09-communications-notifications.md`
> - `10-platform-infrastructure.md`

---

## How to read this document

Every user story in this file follows the same template so downstream consumers (specs, plans, QA, contract review) can rely on a stable shape:

1. **Story** — the BDD-style intent (As a... I want to... So that...).
2. **Priority / Status / Estimate** — MoSCoW priority (P0/P1/P2), workflow status, story-point estimate.
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

AquaLudo v2 is a Next.js 14 App Router application deployed to Vercel. Public, pre-auth pages (home, about, contact, activities catalog, gallery, coach profile, events marketing) are statically rendered with **Incremental Static Regeneration (ISR)** at 60s revalidate, with on-demand revalidation hooked to Supabase row updates via database webhooks. Authentication, bookings, waitlists and the admin panel sit behind auth-gated route groups. The booking flow itself is server-rendered with streaming for the slowest data fetches (slot availability + Paymob tokenization) so the shell is visible immediately.

The watery loading animation is a client-only component mounted at the application root. It uses `sessionStorage` to ensure the animation plays **once per browser session** (per the user choice in the discovery interview). It honours `prefers-reduced-motion` and is rendered **outside** the React hydration critical path so it never blocks first paint of the eventual home content underneath.

The brand tone presets are:

- **Brand identity:** "AquaLudo by Oar & Sail" — AquaLudo is the modern primary brand; "Oar & Sail" is the heritage sub-line used in taglines, footers, and the rowing academy programme.
- **Default locale:** English with `dir="ltr"`. A single tap of the language pill in the header flips to Arabic with `dir="rtl"`. Choice persists to `localStorage` and a `locale` Supabase cookie so SSR pages honour the preference on next visit.
- **Currency:** Egyptian pound (EGP), formatted with the supervisor-defined currency locale string `ar-EG` for Arabic and `en-EG` for English.

Pages owned by this file:

| Route                                       | Component path                                   | Auth | Rendering     |
|---------------------------------------------|--------------------------------------------------|------|---------------|
| `/`                                         | `app/(public)/page.tsx`                          | No   | ISR 60s       |
| `/about`                                    | `app/(public)/about/page.tsx`                    | No   | ISR 3600s     |
| `/contact`                                  | `app/(public)/contact/page.tsx`                 | No   | Static        |
| `/activities`                               | `app/(public)/activities/page.tsx`              | No   | ISR 60s       |
| `/activities/[slug]`                        | `app/(public)/activities/[slug]/page.tsx`        | No   | ISR 300s      |
| `/coaches`                                  | `app/(public)/coaches/page.tsx`                 | No   | ISR 3600s     |
| `/coaches/[slug]`                           | `app/(public)/coaches/[slug]/page.tsx`          | No   | ISR 3600s     |
| `/gallery`                                  | `app/(public)/gallery/page.tsx`                 | No   | ISR 3600s     |
| `/events`                                   | `app/(public)/events/page.tsx`                 | No   | ISR 300s      |
| `/events/[slug]`                            | `app/(public)/events/[slug]/page.tsx`           | No   | ISR 300s      |
| `/pricing`                                  | `app/(public)/pricing/page.tsx`                 | No   | ISR 300s      |
| `/booking`                                  | `app/(public)/booking/page.tsx`                 | Yes* | Server stream |
| `/not-found`                                | `app/not-found.tsx`                             | No   | Static        |
| `/search?q=...`                             | `app/(public)/search/page.tsx`                  | No   | ISR on-demand |
| `global-error`                              | `app/global-error.tsx`                          | No   | Static        |

`*` `/booking` redirects anonymous users to log in via the paywall, but its shell renders statically for SEO indexing (US-BF-001, File 03).

---

## Domain Glossary

- **Loading animation** — the cinematic splash shown once per browser session. A boat "emerges from underwater" and splits a water surface to reveal the home page. Includes audible water + boat ambience and a short branded audio sting at the end (用户的最终选择).
- **Session skip** — `sessionStorage["aqualudo.loading.v1.played"] === "1"` causes the animation to be suppressed and the home page to render directly.
- **Reduce-motion** — `prefers-reduced-motion: reduce` in the OS/browsers: animation is replaced with a static water-wash mask that fades to the home content in ≤ 800 ms; no sound.
- **Language pill** — Header button that switches the active locale between `en` and `ar`. Persisted across sessions.
- **Quick search overlay** — A lightweight `/` + `⌘K` overlay that surfaces top activities, events and coaches for anonymous queries. Backed by Postgres `ILIKE`.
- **Pyramid content** — Top of the home page is a hero banner; the rest of the page is split into a vertical story: pillars → activities teaser → why-us → testimonials → metrics → CTA band → footer.

---

## Table of Contents

1. US-LD-001 — Watery loading animation: boat emerges from underwater
2. US-LD-002 — Loading animation session skip
3. US-LD-003 — Loading animation accessibility (reduce-motion, performance, audio)
4. US-LD-004 — Home page hero section
5. US-LD-005 — Home page "Explore Activities" teaser section
6. US-LD-006 — Home page "Why Choose AquaLudo" value propositions
7. US-LD-007 — Home page testimonials carousel
8. US-LD-008 — Home page impact metrics block (counters)
9. US-LD-009 — Site header and primary navigation
10. US-LD-010 — Site footer
11. US-LD-011 — About Us page
12. US-LD-012 — Contact page (map + WhatsApp sticky CTA)
13. US-LD-013 — Language toggle (EN/AR) with RTL layout
14. US-LD-014 — 404 Not Found and 500 Error pages
15. US-LD-015 — Quick search overlay (activities / events / coaches)

---

## US-LD-001 — Watery loading animation: boat emerges from underwater

### Story
As a first-time or returning-customer (per-session) visitor to aqualudo.net,
I want a beautiful, cinematic loading sequence where a boat emerges from beneath a watery surface and splits it to reveal the home page,
So that the brand promise ("AquaLudo — water-sports on the Nile") is felt immediately and emotionally before any text is read.

### Priority: P0
### Status: Draft
### Estimate: 13 (story points)
### Sprint: Sprint 1 — Foundation

### Actors
- **Primary actor:** Anonymous first-time or session-renewed visitor on any modern browser.
- **Secondary actor:** Customer with logged-in session cookie (animation still plays, just once).
- **System actor:** Next.js App Router root layout (`app/layout.tsx`), `<LoadingAnimation/>` mounted at root.

### Preconditions
1. The visitor has navigated to any route under `aqualudo.net` for the first time in this browser session.
2. `sessionStorage["aqualudo.loading.v1.played"]` is **unset** or not equal to `"1"`.
3. The visitor's browser supports `requestAnimationFrame`, Web Audio API, and `IntersectionObserver`.
4. A connection is available (online state).
5. The user has not opted out via the reduce-motion media query (handled by US-LD-003).

### Postconditions
1. The animation plays exactly once for this browser session.
2. `sessionStorage["aqualudo.loading.v1.played"]` is set to `"1"` before the animation actually completes (so a refresh mid-animation still treats the session as "having seen it").
3. The home page (`/`) is rendered beneath the loading layer and becomes visible as the animation pulls its mask away.
4. The visitor's chosen locale (EN or AR, US-LD-013) determines the orientation, easing curve, and copy of the loading layer.
5. Telemetry events (`loading_animation.start`, `loading_animation.complete`, `loading_animation.skip`) are emitted.

### Main Flow (Happy Path)
1. Visitor opens `https://aqualudo.net/` on a desktop Safari, a Chrome mobile device, or an Edge desktop.
2. Next.js server returns the initial HTML for the home route. `<LoadingAnimation/>` is included at the top of the `<body>` in `app/layout.tsx`.
3. `LoadingAnimation` hydration begins immediately. The component reads `sessionStorage` to determine whether the animation should play.
4. Since this is the first visit of the session, `LoadingAnimation` enters the "play" state.
5. The component renders a full-viewport `position:fixed` overlay (`z-index: 9999`) covering the home content below.
6. A WebGL/Canvas surface — pre-bundled as a single `*.webp` poster image + a 4-second `boat-emerge.mp4` clip — is shown.
7. The clip plays. It depicts:
   - **0.0s–0.3s:** A dark navy-to-deep-teal gradient fills the screen; tiny bioluminescent bubbles rise.
   - **0.3s–1.5s:** Camera sinks below a stylised water surface rendered with a noise-driven normal map; small wave ripples.
   - **1.5s–3.0s:** A silhouette of a row-boat enters from the bottom of the frame, slowly rising toward the waterline.
   - **3.0s–3.8s:** The boat pierces the surface; water splits left and right; the screen "opens" outward to reveal the home hero.
   - **3.8s–4.0s:** A short branded audio sting ("AquaLudo — by Oar & Sail") plays at the moment the boat pierces the surface.
8. As the surface splits, the loading overlay's `clip-path: inset(50% 0 50% 0)` is animated to `inset(0 0 0 0)` outward, revealing the home content beneath.
9. The home hero (`<HomeHero/>`, US-LD-004) is already rendered and flicker-free; the reveal feels like "the boat opened the curtain on the site".
10. At animation completion, the overlay is unmounted from React tree and removed from the DOM (`root.removeChild`), freeing GPU memory.
11. `sessionStorage["aqualudo.loading.v1.played"] = "1"` is written. Subsequent navigations within the session skip the animation (US-LD-002).
12. Analytics event `loading_animation.complete` fires with `duration_ms`, `reduced_motion=false`, `locale` properties.

### Alternate Flows

#### A1 — User navigates directly to a deep route (e.g. `/activities`)
1. User types `https://aqualudo.net/activities` directly into the URL bar from a fresh session.
2. `app/(public)/activities/page.tsx` is rendered. The `LoadingAnimation` still mounts because it is at the root layout.
3. The animation plays identically. On reveal, the activities listing (rather than the home hero) is shown.
4. After animation completes, the visitor lands on the activities page they originally requested, with the loading state removed.

#### A2 — User has locale set to Arabic
1. User's `localStorage["aqualudo.locale"] = "ar"`.
2. The animation mirrors horizontally (boat enters from bottom-right instead of bottom-left for cultural direction).
3. The branded audio sting is the Arabic localised version on file: "أكوالودو — أوار آند سايل" — pronounced identically, level-matched to EN version (peak -2 LUFS).
4. On completion, the home page is rendered with `dir="rtl"` already applied (US-LD-013).

#### A3 — User is on a slow 3G connection
1. The poster image (`water-surface-poster.webp`, 12 KB) loads instantly while the 4-second `boat-emerge.mp4` (~280 KB at standard, up to 720 KB at high DPR) streams.
2. The animation runtime begins on the poster load, not the video load — the video has 4 seconds to catch up before the boat emerges.
3. If the video has not buffered past 3.0s by the time the runtime reaches 3.0s, the runtime pauses 200ms to let the buffer catch up, then resumes.
4. Telemetry event `loading_animation.buffer_delay` includes `delay_ms`.

#### A4 — Repeat visitor hits the home page within the session
1. User has already seen the animation 5 minutes ago in the same browser session.
2. `sessionStorage["aqualudo.loading.v1.played"] = "1"`.
3. `LoadingAnimation` hydration reads this and **does not** mount any overlay.
4. The home page renders normally. Telemetry event `loading_animation.skipped_reason="session_seen"` fires.
5. (See US-LD-002 for full detail.)

### Exception Flows

#### E1 — Video asset fails to load
1. The `boat-emerge.mp4` request returns 4xx or 5xx, or `readyState` stays `<= 1` after 1.2 seconds.
2. After 1.2 seconds, the runtime falls back to a Lottie animation (`boat-emerge.json` ~45 KB) of identical narrative.
3. If Lottie also fails, the runtime falls back to a cross-fade from the poster image to the home page in 400 ms.
4. Telemetry event `loading_animation.fallback_used` with `level ∈ {lottie, poster}`.

#### E2 — Web Audio API blocked or fails to start
1. `AudioContext.resume()` does not transition to `running` after 300 ms, or the visitor's browser blocks autoplay-with-sound.
2. The branded audio sting is silently skipped. The visual narrative completes as designed.
3. A small "muted" pill appears in the bottom-right corner for 2 seconds so the visitor knows audio was intentionally muted.
4. Telemetry event `loading_animation.audio_blocked=true`.

#### E3 — Browser does not support `requestAnimationFrame`
1. Detected via feature check.
2. The runtime skips the canvas-ripples and the mask animation, going directly to the cross-fade fallback.
3. Telemetry records `loading_animation.low_feature_browser=true`.

#### E4 — Visitor refreshes mid-animation
1. `sessionStorage["aqualudo.loading.v1.played"]` is set to `"1"` immediately when state machine enters the "play" branch, before the visual reveal begins.
2. On refresh, the runtime reads `"1"`, declines to play again, and renders the home page directly (US-LD-002).
3. Telemetry event `loading_animation.refresh_aborted` fires.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Watery loading animation — boat emerges from underwater

  Scenario: First-time visitor sees the full 4-second animation
    Given a fresh browser session with no sessionStorage entry
      And the visitor navigates to "https://aqualudo.net/"
      And prefers-reduced-motion is "no-preference"
    When the page loads
    Then a full-viewport loading overlay is mounted above the home content
      And the overlay shows a boat emerging from underwater across ~4 seconds
      And a branded audio sting plays once at the 3.8s mark
      And after the animation completes, the overlay is unmounted from the DOM
      And sessionStorage["aqualudo.loading.v1.played"] equals "1"
      And the home hero is fully visible and interactive

  Scenario: Visitor with Arabic locale sees mirrored animation
    Given a fresh browser session
      And localStorage["aqualudo.locale"] equals "ar"
    When the page loads
    Then the loading animation is mirrored horizontally
      And the branded audio sting plays the Arabic-localised recording
      And after completion the home page renders with dir="rtl"

  Scenario: Visitor navigates directly to a deep route
    Given a fresh browser session
    When the visitor navigates to "https://aqualudo.net/activities"
    Then the loading animation still plays once
      And on completion the activities page (not the home page) is shown

  Scenario: sessionStorage already records the animation as played
    Given a returning session where sessionStorage["aqualudo.loading.v1.played"] equals "1"
    When the visitor navigates to any public route
    Then no loading overlay is mounted
      And the target page renders immediately

  Scenario: Mid-animation refresh aborts the animation on next load
    Given a fresh browser session mid-loading at t=2.0s
    Then sessionStorage["aqualudo.loading.v1.played"] already equals "1"
    When the visitor refreshes the browser
    Then the home page renders directly with no overlay

  Scenario: Video asset fails to load triggers Lottie fallback
    Given a fresh browser session
      And the boat-emerge.mp4 request returns 404
    When the page loads
    Then the runtime falls back to the bundled Lottie animation
      And the visual narrative is preserved
      And a telemetry event "loading_animation.fallback_used" is fired with level="lottie"

  Scenario: All visual assets fail triggers cross-fade fallback
    Given a fresh browser session
      And both boat-emerge.mp4 and boat-emerge.json fail to load
    When the page loads
    Then the poster image is shown for 600 ms
      And the system cross-fades to the home page in 400 ms
      And a telemetry event "loading_animation.fallback_used" is fired with level="poster"

  Scenario: Browser blocks autoplay with audio
    Given a fresh browser session
      And the browser's AudioContext cannot resume within 300 ms
    When the page loads
    Then the visual animation completes as designed
      And the branded sting is silenced
      And a muted indicator pill appears in the bottom-right for 2 seconds
      And a telemetry event "loading_animation.audio_blocked=true" is fired
```

### Edge Cases
1. **Browser tab is backgrounded mid-animation.** `requestAnimationFrame` is throttled; the runtime pauses the animation at the current frame and resumes when the tab returns to foreground. The audio context is suspended and resumed so the branded sting plays at the right moment rather than immediately on focus.
2. **Visitor uses a screen reader.** `aria-live="polite"` region announces "AquaLudo loading animation playing…" at start and "AquaLudo — by Oar & Sail. Welcome." at the end. The audio sting is suppressed while a screen reader is actively speaking.
3. **Visitor is on a smartwatch / very small viewport (<240px wide).** The runtime skips the WebGL canvas and uses the Lottie fallback rescaled to fit; if even Lottie cannot paint, falls back to cross-fade.
4. **Visitor's device is in power-save mode.** Frames are throttled; the runtime extends the runtime clock by the delta between `requestAnimationFrame` timestamps and the wall clock so the boat still emerges at the conceptual "4 second" mark.
5. **Visitor's clock is skewed.** All timing is monotonic (`performance.now()`), not wall-clock. A skewed device clock does not corrupt animation timing.
6. **Visitor's device has high DPI (3x).** The 4 K master `boat-emerge-4k.mp4` is only delivered if `devicePixelRatio >= 2.5` and `navigator.connection.effectiveType ∈ {4g}` AND the device reports `deviceMemory >= 4`. Otherwise the 1080p version is used.
7. **Visitor returns to the site many hours later in the same session.** `sessionStorage` keeps `"played":"1"` for the entire browser session, even across many hours. Closing the browser clears it; next browser session plays again.

### UI/UX Specifications

#### Desktop (≥ 1024 px)
- Overlay: `position: fixed; inset: 0; background: #04141c; z-index: 9999;`.
- Video element: `<video autoplay muted playsinline preload="auto">`.
- Mute indicator pill (`aria-hidden=true` until audio is blocked): bottom-right corner, blue/teal pill, 96 px×32 px, 12 px text.
- Locale switch overlay: not shown during loading.
- Skip control: small "Skip intro" affordance appears bottom-right at t=2.0s; clicking it triggers US-LD-002's skip path and adds `loading_animation.skipped` event.

#### Mobile (≤ 640 px)
- 4-sec vertical portrait video is shipped (`boat-emerge-portrait.mp4`, 110 KB at 720×1280, bitrate ~250 kbps).
- Tap-to-skip: tapping anywhere on the screen from t=2.0s onward skips.
- "Skip intro" text fades out at t=2.5s so the visitor's eye stays on the boat.

#### RTL (Arabic locale)
- The painting direction flips: the boat rises from the bottom-right corner.
- The mask's `clip-path` reveal emulates opening a curtain from the RTL side instead of LTR.
- All gestures mirror.

#### Loading state (already mounted but video not yet ready)
- A static poster frame (`loading-poster.webp`, 12 KB) is painted instantly while the video buffers.

#### Empty state
- N/A — there is always at least a poster.

#### Error state
- See Exception Flow E1.

#### Success state
- Overlay removed; home content visible & interactive. The home hero's own entrance animation (US-LD-004) fires after a 120 ms delay so it is not visually fighting the loading reveal.

### Data Model
This user story primarily reads/sets client-side storage rather than database rows. Two Supabase tables, however, are touched:

```
analytics_events
  id uuid pk default gen_random_uuid()
  event_name text not null
  event_properties jsonb not null default '{}'
  session_id text
  user_id uuid fk auth.users.id null
  created_at timestamptz not null default now()
  index on (event_name, created_at desc)
```

No indexes are required specifically for this user story; the analytics table is partitioned monthly by `created_at`.

### API Endpoints

#### Next.js Route Handlers
- `POST /api/loading/telemetry` — receives `{ event_name, event_properties }` from the client. Idempotent. RLS: anonymous allowed (anon key), throttled server-side at 5 events per session per 30 seconds.
- `GET /loading-assets/manifest.json` — generated at build time; declares the per-locale asset URLs and their fallback chain. Cached at CDN for 1 hour.

#### Supabase queries
- None directly; the client uses `supabase.auth.getSession()` to determine `user_id`, but anonymous access is the common case.

### Security Considerations
1. The `/api/loading/telemetry` endpoint must rate-limit by IP + session cookie at 5 events / 30 sec to prevent flooding.
2. Asset URLs must include signed-query strings for any private CDN bucket, but the loading-animation assets are public.
3. The telemetry payload must be sanitised on the server (max 32 keys, max 256 chars per key, max 2048 chars per value).
4. Do not embed user-PII in telemetry events from the loading animation.

### Performance Requirements
- **LCP of the home hero with animation:** ≤ 2.5 seconds on a 4G mobile profile (450 ms for first byte + 1.6 s for video equity + 120 ms reveal animation).
- **Total bytes shipped to mobile:** ≤ 350 KB on initial visit (poster 12 KB + Lottie 45 KB + mp4-streamed bytes up to 280 KB chunk + React shell).
- **No layout shift (CLS):** the overlay's iz-index and fixed inset means it produces no CLS. Unmounting produces no CLS.
- **Animation runs at 60 fps on a 2020 mid-range Android.** If the runtime detects FPS < 30 for 10 consecutive frames, it transparently upgrades to the Lottie fallback.

### Notifications
None.

### Localization
- EN copy:
  - Skip intro: `Skip intro`
  - Audio-muted indicator: `Audio off in this browser`
  - End-of-animation screen-reader announcement: `AquaLudo — by Oar & Sail. Welcome.`
- AR copy:
  - Skip intro: `تخطّي`
  - Audio-muted indicator: `الصوت مكتوم في هذا المتصفح`
  - Announcement: `أكوالودو — أوار آند سايل. أهلاً بك.`

### Error Handling
- Telemetry POST returns 429 on rate-limit; the client silently swallows (no retry).
- Asset 4xx/5xx triggers Lottie fallback gracefully without surfacing an error to the user.

### Logging & Analytics
- `loading_animation.start` — fires on overlay mount.
- `loading_animation.complete` — fires on overlay unmount.
- `loading_animation.skip` — fires on user skip.
- `loading_animation.skipped_reason` — fires when no overlay is mounted for a given session, with reason ∈ `{session_seen, no_raf, reduce_motion}`.
- `loading_animation.fallback_used` — `{reason, level}`.
- `loading_animation.audio_blocked` — `{blocked_by ∈ {policy, blocked_request, low_quality}}`.
- `loading_animation.buffer_delay` — `{delay_ms}`.
- `loading_animation.fps_degraded` — if FPS < 30 for 10 frames.

### Testing Notes
#### Unit
- `LoadingAnimationSessionState` tests: reading/writing sessionStorage; correct skip behaviour across reloads.
- `LoadingAnimationRuntime` tests: state machine transitions; fallback chain; locale mirroring.

#### Integration
- Mock the video element; assert the Lottie fallback mounts when `video.readyState` stays ≤ 1 past 1.2s.
- Mock `AudioContext.resume`; assert muting behaviour when it does not transition to "running".

#### E2E (Playwright)
- Fresh incognito context → assert overlay appears at t=0 and is gone by t=4.4s.
- Reload within the same context → assert no overlay.
- `/activities` first visit → assert overlay + content underneath is the activities page.
- RTL-mode via `localStorage` injection → assert mirrored orientation via a data attribute `data-orientation="rtl"`.

### Related User Stories
- US-LD-002 (session skip)
- US-LD-003 (accessibility/performance)
- US-LD-004 (home hero entrance)
- US-LD-013 (language toggle)
- US-IN-001 (responsive design system)
- US-IN-002 (i18n framework)
- US-IN-003 (RTL support)
- US-IN-011 (accessibility)

### Dependencies
- Next.js App Router layout at root must mount `<LoadingAnimation/>` above `<Header/>` and route content.
- CDN distribution of the four animation asset variants (desktop-landscape, mobile-portrait, Lottie-fallback, poster).
- Web Audio API permission handling.
- A signed or public bucket on Supabase Storage for `loading-assets/`.

### Tags
`loading` · `cinematic` · `brand` · `first-impression` · `isr-not-applicable` · `core-vitals` · `i18n` · `audio`

### Notes / Rationale
The intent of this animation is to **emotionally** establish the brand promise before the visitor reads a single word. We accept the cost of ~280 KB on first visit because it is paid exactly once per session and creates a deliberate "wow" moment aligned with a premium water-sports academy. We explicitly avoid making this part of the LCP measurement because the home hero is already painted underneath; the animation is a "veil" not a blocker. The session-skip is critical: returning visitors in the same browsing session just had this experience minutes ago and will be annoyed to see it again.

---

## US-LD-002 — Loading animation session skip

### Story
As a returning visitor within the same browser session,
I want subsequent navigation events to not replay the loading animation,
So that the page feels fast and I am not repeatedly interrupted by a 4-second intro.

### Priority: P0
### Status: Draft
### Estimate: 3 (story points)

### Actors
- **Primary actor:** Returning visitor within the same browsing session.
- **System actor:** `<LoadingAnimation/>` root component.

### Preconditions
1. `sessionStorage["aqualudo.loading.v1.played"]` equals `"1"` from a prior play in the same browser session.
2. The visitor is navigating via client-side route transitions or hard refreshes.
3. Browser supports `sessionStorage` (degrade gracefully if not).

### Postconditions
1. No overlay is mounted.
2. The visitor lands directly on their target route.
3. Telemetry event `loading_animation.skipped_reason="session_seen"` is fired exactly once per page load where a play would otherwise have been expected.

### Main Flow (Happy Path)
1. Visitor already triggered US-LD-001 earlier in the session.
2. Visitor clicks a navigation link to `/activities` or refreshes a page.
3. The `LoadingAnimation` component mounts, hydrates.
4. The runtime synchronously reads `sessionStorage["aqualudo.loading.v1.played"]`.
5. The value is `"1"`.
6. The runtime returns early. No overlay is created.
7. The home/activities/about/etc. content is rendered directly.
8. `loading_animation.skipped_reason="session_seen"` fires via `/api/loading/telemetry`.

### Alternate Flows

#### A1 — Browser does not support sessionStorage
1. Detected via `try { sessionStorage.setItem("__test","1"); } catch { ... }`.
2. The runtime defaults to "playing once per full browser session" using an in-memory flag on the React tree (`Window.QL_played_in_memory = true` set after first play).
3. Hard refreshes in this degraded case **will** replay the animation, since in-memory flags do not survive refresh.

#### A2 — Visitor manually cleared sessionStorage mid-session
1. DevTools or a privacy extension clears sessionStorage after the visitor has seen the animation.
2. Next navigation: the runtime reads `null`, plays the animation again.
3. This is acceptable behaviour.

#### A3 — "Skip intro" clicked mid-animation
1. Visitor clicks the "Skip intro" affordance at any point after t=2.0s.
2. The runtime immediately:
   a. Sets `sessionStorage["aqualudo.loading.v1.played"] = "1"`.
   b. Fades the overlay out in 250 ms (instead of completing the remaining frames).
   c. Fires `loading_animation.skip` with `skipped_at_ms`.
3. From this point forward, the visitor is treated as having seen the animation for the rest of the session.

### Exception Flows

#### E1 — sessionStorage quota exceeded
1. Very rare. Caught by `try/catch`.
2. Falls back to in-memory flag behaviour as in A1.

#### E2 — sessionStorage throws due to private browsing in legacy iOS Safari
1. Falls back to in-memory flag.
2. Telemetry records `loading_animation.session_storage_unavailable=true`.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Loading animation session skip

  Scenario: Returning visitor within session sees no animation
    Given a browser session where the loading animation has already played
    When the visitor navigates to any public route
    Then no loading overlay mounts
      And the target page renders immediately
      And a telemetry event "loading_animation.skipped_reason" with reason="session_seen" is fired

  Scenario: Hard refresh after seeing animation does not replay
    Given the visitor's sessionStorage["aqualudo.loading.v1.played"] equals "1"
    When the visitor performs a hard refresh (Cmd+Shift+R)
    Then no loading overlay mounts
      And the home page renders directly

  Scenario: Skip intro click during animation records "played"
    Given a fresh browser session and the animation is mid-play at t=2.5s
    When the visitor clicks "Skip intro"
    Then sessionStorage["aqualudo.loading.v1.played"] is set to "1"
      And the overlay fades out within 250 ms
      And a telemetry event "loading_animation.skip" is fired

  Scenario: Browser without sessionStorage support uses in-memory flag
    Given a browser that throws on sessionStorage access
      And the animation has already played once in this browser process
    When the visitor performs client-side navigation
    Then no overlay is mounted (in-memory flag is set)

  Scenario: Hard refresh on a no-sessionStorage browser replays the animation
    Given a browser without sessionStorage support
      And the in-memory "played" flag was set
    When the visitor refreshes the page
    Then the in-memory flag is lost
      And the loading animation replays
      And a telemetry event "loading_animation.replay_reason=in_memory_only" is fired
```

### Edge Cases
1. **Visitor opens site in multiple tabs concurrently.** Each tab has its own in-memory flag; `sessionStorage` is shared per-tab in modern browsers (NOT shared across tabs; `sessionStorage` is per-tab) — so each tab plays once.
2. **Visitor opens site from a link in a new tab.** New tab has its own sessionStorage; animation plays once for the new tab.
3. **Browser is set to "delete sessionStorage on tab close".** Default modern behaviour; visiting the site tomorrow plays again, which is intentional.
4. **Visitor clears all site data.** Next visit replays; telemetry captures `loading_animation.replay_reason=session_cleared`.

### UI/UX Specifications
- **Skip button:** bottom-right corner, 96 × 32 px, blue fill `#0066FF` and white text, `border-radius: 16 px`, `font: 600 12px Inter`. Appears at t=2.0s of the animation with a 200 ms fade-in.
- **Hover state (desktop):** button bg becomes `#0052CC`, `transform: scale(1.05)`.
- **Focus state:** 2 px outline `#fff` offset 2 px.
- **Mobile:** the entire screen is tap-to-skip after t=2.0s. No visible button needed; the tap region is the full viewport.

### Data Model
No DB involvement beyond the analytics events from US-LD-001.

### API Endpoints
- `POST /api/loading/telemetry` (same as US-LD-001).

### Security Considerations
- Telemetry endpoint already rate-limited per US-LD-001.
- No new surfaces.

### Performance Requirements
- The skip path adds no perceived latency: setting `sessionStorage` is <1 ms.
- Skipping completes in 250 ms (fade-out).

### Notifications
None.

### Localization
- Skip intro EN: `Skip intro` · AR: `تخطّي`.

### Error Handling
- Telemetry POST failures are swallowed silently.

### Logging & Analytics
- `loading_animation.skip` — `{skipped_at_ms}`.
- `loading_animation.skipped_reason` — `{reason ∈ {session_seen, no_raf, reduce_motion}}`.
- `loading_animation.replay_reason` — `{reason ∈ {tab_fresh, session_cleared, in_memory_only}}`.
- `loading_animation.session_storage_unavailable` — boolean.

### Testing Notes
#### Unit
- Session storage read/write helper.
- In-memory flag fallback.

#### E2E (Playwright)
- Open home → assert animation → wait 5 s → click `/about` link → assert NO animation on `/about`.
- Hard refresh on `/about` → assert NO animation.
- Click "Skip intro" at t=2.0s → assert overlay gone within 350 ms.

### Related User Stories
- US-LD-001 (the animation itself).
- US-LD-003 (reduce-motion path).

### Dependencies
- `sessionStorage` availability.
- The `LoadingAnimation` component shares its telemetry endpoint with US-LD-001.

### Tags
`loading` · `skip` · `session` · `ux` · `performance`

### Notes / Rationale
The session-skip differs deliberately from `localStorage`-based permanent skip: the brand wants the visitor to enjoy the intro again next time they open the browser (a fresh context). Skipping within the same session prevents the intro from feeling repetitive.

---

## US-LD-003 — Loading animation accessibility (reduce-motion, performance, audio)

### Story
As a visitor who prefers reduced motion or who is on a low-power device,
I want the loading animation to respect my operating-system motion preferences and degrade gracefully,
So that I am not subjected to motion I cannot physically tolerate or load a video that crashes my device.

### Priority: P0
### Status: Draft
### Estimate: 5 (story points)

### Actors
- **Primary actor:** Visitor with `prefers-reduced-motion: reduce`.
- **Secondary actor:** Visitor on a low-end device or a metered connection.
- **System actor:** `LoadingAnimation` runtime + `prefers-reduced-motion` media query watcher.

### Preconditions
1. The OS/Browser reports `prefers-reduced-motion: reduce`, OR
2. `navigator.connection.saveData === true`, OR
3. `navigator.hardwareConcurrency <= 2`, OR
4. The runtime has detected FPS < 30 for 10 consecutive frames in a prior play.

### Postconditions
1. The runtime either plays a static water-wash mask that fades to home content in ≤ 800 ms, or skips directly to cross-fade.
2. No audio sting plays.
3. The visitor is not exposed to the full motion narrative.
4. Telemetry records the specific degrade path.

### Main Flow (Happy Path — reduce-motion)
1. Visitor triggers initial navigation.
2. `LoadingAnimation` mounts.
3. `window.matchMedia('(prefers-reduced-motion: reduce)').matches` returns `true`.
4. Runtime branches to "reduce-motion" mode.
5. A static poster image is shown for 600 ms, then a 400 ms cross-fade to the home content.
6. No audio. No WebGL canvas. No Lottie.
7. `sessionStorage["aqualudo.loading.v1.played"] = "1"`.
8. Telemetry event `loading_animation.skipped_reason="reduce_motion"` fires.

### Alternate Flows

#### A1 — Data-saver mode (saveData === true)
1. Detected at runtime.
2. Runtime uses poster-image-only mode (no mp4, no Lottie) to save bandwidth.
3. 600 ms poster + 400 ms cross-fade.
4. Telemetry records `loading_animation.skipped_reason="save_data"`.

#### A2 — Low-end device
1. Detected via `navigator.hardwareConcurrency <= 2`.
2. Runtime forces poster + cross-fade.
3. Telemetry records `loading_animation.skipped_reason="low_end_device"`.

#### A3 — Runtime FPS degraded mid-animation
1. During the play of the full animation, `requestAnimationFrame` reports timestamps inconsistent with 60 fps: < 30 fps for 10 consecutive frames.
2. The runtime upgrades to Lottie fallback mid-animation.
3. Telemetry records `loading_animation.fps_degraded` with the measured FPS.

#### A4 — User has both reduce-motion AND save-data
1. Reduce-motion is the dominant decision factor.
2. Poster + cross-fade. Telemetry attributes the skip to "reduce_motion" (first match).

### Exception Flows

#### E1 — `prefers-reduced-motion` watcher fails
1. Runtime defaults to full animation but adds a 200 ms introspection pause: if the first two rAF callbacks report 0 frames visible, abort to cross-fade.
2. Telemetry records `loading_animation.reduced_motion_probe_failed=true`.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Loading animation accessibility & performance

  Scenario: Reduce-motion preference triggers poster-only mode
    Given a fresh browser session
      And the OS reports prefers-reduced-motion: reduce
    When the page loads
    Then the loading overlay shows a static poster for 600 ms
      And the overlay cross-fades to the home content within 400 ms
      And no audio sting plays
      And respective telemetry records reason="reduce_motion"

  Scenario: Data-saver mode triggers poster-only mode
    Given a fresh browser session
      And navigator.connection.saveData returns true
    When the page loads
    Then poster + cross-fade is used
      And telemetry records reason="save_data"

  Scenario: Low-end device triggers poster-only mode
    Given a fresh browser session
      And navigator.hardwareConcurrency returns 2
    When the page loads
    Then poster + cross-fade is used
      And telemetry records reason="low_end_device"

  Scenario: FPS degrades mid-animation upgrades to Lottie
    Given the full animation is playing
    When the runtime detects FPS < 30 for 10 consecutive frames
    Then the runtime switches to the Lottie fallback
      And a telemetry event "loading_animation.fps_degraded" is fired
```

### Edge Cases
1. **Visitor toggles prefers-reduced-motion AFTER the page has rendered the home content.** Future visits honour the new preference; current visit is unaffected.
2. **Visitor's browser does not support `prefers-reduced-motion`.** Returns `false`; reduce-motion branch is unreachable on these legacy browsers; standard animation plays.
3. **Visitor has both reduce-motion AND a screen reader.** Poster + cross-fade plus the screen-reader announcement of the brand tagline at fade-out.

### UI/UX Specifications
- Poster image is `loading-poster.webp`, ≤ 12 KB, dark teal with a faint row-boat silhouette in the centre.
- The cross-fade uses `opacity 1 → 0` on the overlay layer plus `opacity 0 → 1` on the home content (which sits underneath; same root).
- No "Skip intro" button is shown (the cross-fade is faster than the button label).

### Data Model
No new tables; analytics events as already defined.

### API Endpoints
None new.

### Security Considerations
None additional.

### Performance Requirements
- Poster + cross-fade total is < 1.0 s, well within LCP budget.
- No script heavier than 1.5 KB is shipped for this path.

### Notifications
Screen-reader announcement at cross-fade start: `AquaLudo — by Oar & Sail. Loading complete.`

### Localization
EN: `AquaLudo — by Oar & Sail. Loading complete.`
AR: `أكوالودو — أوار آند سايل. اكتمل التحميل.`

### Error Handling
- Poster asset failure: native white screen backfill, no error UI for the visitor.

### Logging & Analytics
- `loading_animation.skipped_reason="reduce_motion"` · `"save_data"` · `"low_end_device"`.
- `loading_animation.fps_degraded` — `{fps}`.
- `loading_animation.reduced_motion_probe_failed` — boolean.

### Testing Notes

#### Unit
- `motionPreference` resolver: combines reduce-motion + saveData + hardwareConcurrency flags.

#### E2E (Playwright)
- Emulate `prefers-reduced-motion: reduce` → assert no `<video>` is mounted; assert poster image present.
- Emulate `navigator.connection.saveData = true` (override) → same assertion.
- Emulate low-end CPU (Playwright CPU throttling ×6) → assert runtime picks poster mode.

### Related User Stories
- US-LD-001 (animation).
- US-LD-002 (session skip).
- US-IN-011 (accessibility).

### Dependencies
- `prefers-reduced-motion` support in browser.
- `navigator.connection` API (gracefully degraded).

### Tags
`accessibility` · `reduce-motion` · `performance` · `core-vitals`

### Notes / Rationale
Accessibility is a P0 for AquaLudo v2. A 4-second cinematic animation is hostile to vestibular-sensitive visitors; the poster + cross-fade path keeps the brand frame without forcing motion. Data-saver mode handles Egyptian mobile users on metered plans.

---

## US-LD-004 — Home page hero section

### Story
As a visitor to the home page (after the loading animation completes, or directly on repeat session visits),
I want a striking hero banner that conveys AquaLudo's water-sports-on-the-Nile identity with clear calls-to-action to "Book Online" and "Explore Activities",
So that I can immediately understand what the business is and what to do next.

### Priority: P0
### Status: Draft
### Estimate: 8 (story points)

### Actors
- **Primary actor:** Anonymous visitor landing on `/`.
- **Secondary actor:** Logged-in customer returning to browse.
- **System actor:** `app/(public)/page.tsx`, `<HomeHero/>` server component.

### Preconditions
1. Loading animation has either completed (US-LD-001) or been skipped (US-LD-002 / US-LD-003).
2. The home route is requested.
3. ISR cache for `/` is fresh (< 60 s) or on-demand revalidation has produced a fresh render.

### Postconditions
1. Hero is visible above the fold on any viewport ≥ 320 px.
2. The promotional banner "New members offer: Get 1 extra session FREE with any 8-session package!" (admin-editable) is rendered at the top of the hero.
3. Primary CTA "Book Online" routes to `/booking` (enforcing auth gate per US-BF-001).
4. Secondary CTA "Explore Activities" routes to `/activities`.
5. Hero copy is rendered in the visitor's locale (EN/AR).
6. Hero image is a high-quality Nile-on-the-water motivational photo (admin-supplied, fallback stock).

### Main Flow (Happy Path)
1. Visitor's browser receives the home route's HTML response.
2. `<HomeHero/>` server component reads the home-page CMS payload from Supabase (`content_blocks` table where `slug='home_hero'`).
3. The payload includes: hero title, hero subtitle, hero image URLs (desktop + mobile), CTA labels (in EN and AR), promo banner text.
4. Server renders the hero with the appropriate locale copy.
5. Image is delivered via `next/image` with responsive `srcset`.
6. Two CTAs are rendered as primary/secondary buttons.
7. Hero title animates in via `framer-motion` opacity/translate after a 120 ms delay relative to the loading reveal.

### Alternate Flows

#### A1 — Admin has unpublished hero
1. The CMS record for `home_hero` is unpublished (status="draft").
2. The server falls back to the previously published version stored in `content_blocks_history`.
3. If no published version exists (launch day), the server falls back to a hardcoded default with admin-supplied contact info.

#### A2 — Admin has not uploaded a hero image
1. The CMS payload has `hero_image_url = null`.
2. The server uses a defaulting library to pick from a curated set of Nile/rowing stock images baked into the build.
3. A console warning is logged.

#### A3 — Promo banner disabled by admin
1. The CMS payload has `promo_enabled = false`.
2. The promo band is simply not rendered; the hero layout adjusts via CSS grid.

### Exception Flows

#### E1 — Image CDN fails
1. `next/image` returns a placeholder blur-up; if the image errors entirely it falls back to a CSS-gradient background (`linear-gradient(180deg, #0d4f73, #062031)`).
2. Hero text remains readable.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Home page hero

  Scenario: Hero renders above the fold on desktop and mobile
    Given a visitor lands on / on any viewport ≥ 320px
    When the home route is fully rendered
    Then the hero title, subtitle, primary CTA "Book Online", and secondary CTA "Explore Activities" are visible above the fold
      And the promotional banner is rendered at the top of the hero
      And the hero image fills the viewport height ≥ 70vh on mobile and ≥ 60vh on desktop

  Scenario: Clicking "Book Online" routes to the booking flow
    Given the hero is rendered
    When the visitor clicks the "Book Online" button
    Then the browser navigates to /booking
      And if the visitor is anonymous, the auth gate intercepts and prompts login

  Scenario: Clicking "Explore Activities" routes to the activities page
    Given the hero is rendered
    When the visitor clicks the "Explore Activities" button
    Then the browser navigates to /activities

  Scenario: Admin disables the promo band
    Given admin has set promo_enabled=false in the home_hero CMS record
    When the home route is rendered
    Then no promotional band is present
      And the hero occupies the freed space without layout shift
```

### Edge Cases
1. **Promo banner URL contains malicious script.** Server-side sanitises the promo copy via `DOMPurify` equivalent at render time; only whitelisted markup (`<em>`, `<strong>`) is allowed.
2. **Hero image is portrait asset on desktop.** `object-fit: cover` is applied; no distortion.
3. **Visitor has screen reader.** Hero image has `alt="Rowers on the Nile at Cairo, Egypt"` updated by admin via `home_hero.image_alt`.
4. **Visitor toggles language mid-session.** Hero copy is translated via the `useTranslations` hook (US-IN-002) without a full page reload.
5. **Visitor is offline.** The hero shows last cached version if service worker has it; next time online a revalidate is requested.

### UI/UX Specifications

#### Desktop (≥ 1024 px)
- Hero occupies 60–80 vh.
- Image is on the right 50%; title/subtitle/CTAs on the left 50% with a `backdrop-blur` "glass" card.
- Promotional band sits above: 48 px height, gradient teal `#0d4f73 → #1b80a4`, white text 14 px Inter Medium, optional dismissible × on the right.

#### Mobile (≤ 640 px)
- Hero is 85 vh; image fills entire viewport; copy overlays bottom in a dark gradient mask.
- "Book Online" button is sticky in a bottom sheet style on mobile (mirroring the WhatsApp sticky — US-LD-012).

#### RTL (Arabic)
- Copy alignment flips to right.
- Promotional band runs right-to-left.
- CTA order swaps (secondary appears to the right of primary).

#### Loading state
- The hero text uses shimmer skeletons while SSR payload resolves; resolved before paint in production due to ISR caching.

#### Empty state
- If admin has cleared all hero copy (extremely unlikely), default copy "Discover Water Sports in Cairo with AquaLudo" is rendered.

#### Error state
- If the CMS lookup throws 5xx, the last successful cached payload is shown.

#### Success state
- Hero fully rendered; CTAs interactive within 100 ms of FCP.

### Data Model

```
content_blocks
  id uuid pk default gen_random_uuid()
  slug text not null unique            -- 'home_hero', 'home_pillars', etc.
  status text not null check (status in ('draft','published','archived'))
  payload jsonb not null default '{}'  -- locale-specific copy, image URLs, CTAs, flags
  published_at timestamptz null
  updated_by uuid fk auth.users.id null
  updated_at timestamptz not null default now()

content_blocks_history
  id uuid pk
  slug text not null
  payload jsonb not null
  published_at timestamptz not null
  snapshot_by uuid
  index on (slug, published_at desc)
```

For `home_hero`, `payload` schema:

```json
{
  "title": { "en": "Discover Water Sports in Cairo with AquaLudo", "ar": "اكتشف الرياضات المائية في القاهرة مع أكوالودو" },
  "subtitle": { "en": "Join our community and experience the thrill of rowing, kayaking, and more on the beautiful waters.", "ar": "..." },
  "image": {
    "url": "/cdn/home/hero.webp",
    "alt": { "en": "Rowers on the Nile at Cairo", "ar": "..." }
  },
  "image_mobile": { ... },
  "cta_primary":   { "label": { "en": "Book Online",        "ar": "احجز الآن" }, "href": "/booking" },
  "cta_secondary": { "label": { "en": "Explore Activities", "ar": "تصفح الأنشطة" }, "href": "/activities" },
  "promo": { "enabled": true, "text": { "en": "New members offer: ...", "ar": "..." } }
}
```

### API Endpoints

#### Next.js Route Handlers
- `GET /api/cms/home_hero` — admin-protected read/write endpoint; the public site reads via the Supabase anon role and RLS (US-IN-005).

#### Supabase queries
- `select * from content_blocks where slug='home_hero' and status='published' limit 1;` Query is cached with 60 s revalidate.

### Security Considerations
- Hero copy is escaped at render time to prevent XSS.
- Image URLs are validated to begin with the CDN origin or `/cdn`.
- Promo banner markup is sanitised through a strict allowlist.
- Database query uses anon RLS; the CMS endpoint is locked behind the `admin` role.

### Performance Requirements
- LCP ≤ 2.0 s on 4G mobile assuming image is properly lazy-loaded.
- Hero image shipped as AVIF/WebP, ≤ 200 KB on mobile.
- No JS is required to render the hero text; it is SSR HTML.

### Notifications
None.

### Localization
- All copy keys are defined in the CMS payload under locale keys (`en`, `ar`).
- `useTranslations("hero")` hook reads the active locale from the cookie / context.
- Date formatting: not applicable for hero.

### Error Handling
- Image error → blur-up placeholder.
- CMS error → emergency default copy baked into the build.

### Logging & Analytics
- `hero.visible` — fires when at least 50% of hero is in viewport for ≥ 500 ms.
- `hero.cta_click` — `{cta_id ∈ {primary, secondary}}`.

### Testing Notes
#### Unit
- CMS payload parser; locale selector.

#### Integration
- Empty CMS → fallback copy.
- Promo disabled → no band.

#### E2E (Playwright)
- Lighthouse run on `/`, assert LCP ≤ 2.0 s.
- Click primary CTA → assert route transition to `/booking`.
- Toggle language → assert copy swaps without full reload.

### Related User Stories
- US-LD-001 (animation reveals hero).
- US-LD-005 (activities teaser directly below).
- US-AB-014 (admin edits hero via CMS).
- US-IN-002 (i18n).
- US-IN-003 (RTL).
- US-IN-008 (image CDN).

### Dependencies
- `content_blocks` table seeded with default `home_hero` row.
- Image asset uploaded by admin to Supabase Storage.

### Tags
`home` · `hero` · `cms-driven` · `isr` · `cta` · `promo-banner`

### Notes / Rationale
The hero is the brand's first text impression after the loading animation. The "1 free session with 8-pack" promo is the existing business reality (per `about.md` audit) and is positioned at the very top to maximise conversion on the existing offer. Admin-editable copy keeps marketing autonomy.

---

## US-LD-005 — Home page "Explore Activities" teaser section

### Story
As a visitor on the home page,
I want a horizontally scrollable teaser of the five core activities (Rowing, Kayaking, SUP, Wakeboarding, Fitness) with image + one-line teaser + "Learn more"/"Book now" CTA,
So that I can dive into the activity that interests me without first navigating to the full activities page.

### Priority: P1
### Status: Draft
### Estimate: 5 (story points)

### Actors
- **Primary actor:** Anonymous home page visitor.
- **System actor:** `<HomeActivitiesTeaser/>` server component.

### Preconditions
1. The home route has rendered.
2. At least one published activity exists in `activities` table.

### Postconditions
1. A horizontal scroller displays up to `n` activity cards (`n = min(5, count(published activities))`).
2. Each card shows: image, name (locale), one-line teaser, "Learn more" + "Book now" CTAs.
3. Click-through paths: `/activities/[slug]` and `/booking?activity=[slug]`.

### Main Flow (Happy Path)
1. `<HomeActivitiesTeaser/>` queries Supabase for the first 5 published activities (ordered by `display_order`).
2. Cards are rendered using a `<ActivityCard/>` component.
3. Horizontal scroll on mobile; grid on desktop.
4. Telemetry `home.activities_teaser.impression`.
5. User clicks "Learn more" → router pushes `/activities/[slug]`.
6. User clicks "Book now" → router pushes `/booking?activity=[slug]` (US-BF-002).
7. Telemetry `home.activities_teaser.click` with activity_id.

### Alternate Flows

#### A1 — Activities count is 0
1. Card grid is empty.
2. A fallback block says "Activities will be published soon — meanwhile check out our Instagram @oarnsail" with anchor link.

#### A2 — Activities disabled by admin
1. Admin toggles `home_activities_teaser.enabled = false`.
2. Section not rendered at all; below sections flow up.

### Exception Flows

#### E1 — Image CDN slow/fail
- `next/image` fallback to blur-up or gradient background.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Home activities teaser

  Scenario: Teaser shows up to five activity cards
    Given at least five published activities exist with display_order set
    When the home route renders
    Then the activities teaser section shows exactly five cards
      And the cards are ordered by display_order ascending

  Scenario: Fewer than five activities available
    Given only three published activities exist
    When the home route renders
    Then the teaser shows exactly three cards

  Scenario: Zero published activities shows fallback block
    Given no published activities exist
    When the home route renders
    Then the teaser section shows a fallback message linking to Instagram

  Scenario: Click Learn more on a card
    Given the teaser is rendered
    When the visitor clicks "Learn more" on the Rowing card
    Then the browser navigates to /activities/rowing

  Scenario: Click Book now on a card
    Given the teaser is rendered
    When the visitor clicks "Book now" on the Wakeboarding card
    Then the browser navigates to /booking?activity=wakeboarding
```

### Edge Cases
1. A row-boat image is portrait but the card expects landscape → CSS `object-fit: cover`.
2. Two activities have the same `display_order` → tie-break sort by `created_at desc`.
3. Activity has `home_card_hidden = true` → excluded from teaser but appears on `/activities`.
4. Card CTAs hit 404 because activity slug was renamed → middleware redirects `/activities/[slug]` to a 404 (allow admin to set 301 to the new slug — see US-AB-004).

### UI/UX Specifications

#### Desktop
- 4-column grid; fifth card wraps to a new row OR is part of a 5-column flex depending on viewport ≥ 1280 px.
- Card aspect 4:3.
- Card has subtle shadow on hover; image zooms 1.05x.

#### Mobile
- Horizontal scroll-snap with peek of the next card (next-card hint at the right edge).
- Dot indicators below.

#### RTL
- Scroll direction reverses; first card sits on the right.

#### Loading state
- Skeleton cards.

#### Empty state
- Fallback block (see A1).

### Data Model
- Reads `activities` table (US-AC-001 for full schema).
- New field `home_card_hidden bool default false`.
- New column `home_teaser_text jsonb` (overrides the activity short description specifically for the home teaser).

### API Endpoints
- Supabase query `select id, slug, name, short_description, image_url, home_card_hidden, home_teaser_text, display_order from activities where status='published' order by display_order asc, created_at desc limit 5;`

### Security Considerations
- Read-only public access.
- Image URLs validated against CDN origin.

### Performance Requirements
- Teaser card images shipped ≤ 80 KB each (mobile) via adaptive `next/image`.
- Hydration is non-blocking; cards lazy-hydrate as `IntersectionObserver` enters viewport.

### Notifications
None.

### Localization
- All copy fields are jsonb with locale keys.
- Default teaser text falls back to the activity short description.
- Date format not applicable.

### Error Handling
- Image 4xx → blur-up + telemetry.

### Logging & Analytics
- `home.activities_teaser.impression` — fires when the section enters viewport.
- `home.activities_teaser.click` — `{activity_id, cta: 'learn_more' | 'book_now'}`.

### Testing Notes

#### Unit
- `<ActivityCard/>` snapshot under EN/AR locales.

#### Integration
- Empty result → fallback block render.
- 6 activities → only first 5 in the correct order.

#### E2E (Playwright)
- Click "Learn more" → URL change to `/activities/[slug]`.
- Click "Book now" (anonymous) → URL change + auth gate.

### Related User Stories
- US-AC-001 (activities listing page).
- US-AC-002 (activity detail page).
- US-BF-001 (auth-paywall on `/booking`).
- US-AB-003 (admin creates activity).

### Dependencies
- `activities` table seeded.
- `next/image` configured with the AquaLudo CDN domain allowlist.

### Tags
`home` · `activities` · `teaser` · `isr` · `cta` · `lazy-hydrate`

### Notes / Rationale
Putting a bite-sized "explore activities" right on the home page increases the chance that a visitor converts before bouncing. The "Book now" CTA going directly to `/booking?activity=...` pre-selects the activity in the booking flow (US-BF-002), saving one click.

---

## US-LD-006 — Home page "Why Choose AquaLudo" value propositions

### Story
As a visitor deciding whether to trust AquaLudo with my time and money,
I want a clean value-propositions section listing 5 reasons: Safety First, Prime Location, Expert Coaching, Proven Results, Community,
So that I can build confidence before clicking Book Online.

### Priority: P1
### Status: Draft
### Estimate: 4 (story points)

### Actors
- **Primary actor:** Anonymous visitor on home page.
- **System actor:** `<HomeWhyUs/>` server component.
- **Admin actor:** Edits the five pillars and icons via the CMS (US-AB-014).

### Preconditions
1. Home route rendered.
2. CMS record `home_why_us` is published (or historic fallback available).

### Postconditions
1. A 5-column (desktop) / 1-column (mobile) block renders icons + titles + 1-line descriptions for each pillar.
2. Pillars link to relevant sections (e.g. Expert Coaching links to `/coaches`, Prime Location links to `/contact#map`).

### Main Flow (Happy Path)
1. Server reads `home_why_us` from `content_blocks`.
2. Renders icons (lucide-react icons: `ShieldCheck`, `MapPin`, `Award`, `Trophy`, `Users`).
3. Pillars in EN/AR by locale.
4. Each pillar wraps in `<a href>` to its deep link.

### Alternate Flows

#### A1 — Admin disabled a pillar
1. The pillar in `payload.pillars[].enabled === false` is not rendered.
2. If `pillars.length < 1`, section is hidden.

#### A2 — Admin added a sixth pillar
1. The block renders 6 pillars in 3×2 grid (desktop). Mobile remains 1-column.

### Exception Flows

#### E1 — CMS payload missing
- Fallback to hardcoded 5-pillar default content.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Home page "Why Choose AquaLudo"

  Scenario: Five default pillars render
    Given the home route is rendered
      And the home_why_us CMS record has five pillars enabled
    Then the "Why Choose AquaLudo" section shows five icons paired with titles and short descriptions

  Scenario: Admin hides one pillar
    Given admin has set the "Proven Results" pillar's enabled flag to false
    When the home route renders
    Then only four pillars are visible

  Scenario: Clicking a pillar navigates deep
    Given the section is rendered
    When the visitor clicks the "Expert Coaching" pillar
    Then the browser navigates to /coaches
```

### Edge Cases
1. Pillar icon name doesn't match a valid lucide icon → fallback to `Sparkles`.
2. Order kept as specified in payload array.
3. RTL: icons mirror where appropriate (e.g. compasses); text alignment flips.

### UI/UX Specifications
- Background is a Nile-toned gradient `#0d4f73 → #1b80a4`.
- White cards with shadow on hover.
- Icons 48×48 px in the brand teal.

### Data Model
- `content_blocks` record `slug='home_why_us'`; `payload` schema:

```json
{
  "pillars": [
    { "icon":"ShieldCheck", "title":{"en":"Safety First","ar":"..."}, "blurb":{"en":"...","ar":"..."}, "href":"/about#safety", "enabled":true },
    { "icon":"MapPin",      "title":{"en":"Prime Location","ar":"..."},"blurb":{"en":"...","ar":"..."}, "href":"/contact#map", "enabled":true }
  ]
}
```

### API Endpoints
- Public read via anon RLS on `content_blocks`.

### Security Considerations
- Same as US-LD-004.
- Icon name validated against allowlist during editing (US-AB-014).

### Performance Requirements
- Section is below-the-fold; lazy-hydrated.
- Icons are tree-shaken lucide-react.

### Notifications
None.

### Localization
- All copy in jsonb locale keys.
- Length cap per blurb: 120 chars.

### Error Handling
- Payload missing → default pillars.

### Logging & Analytics
- `home.why_us.pillar_click` — `{pillar_id}`.

### Testing Notes
#### Unit
- Pillar parser and icon resolver.
- Edge cases: unknown icon, missing locale.

#### E2E (Playwright)
- 5 pillars render, click each navigates.

### Related User Stories
- US-AB-014 (admin CMS).
- US-IN-002 (i18n).

### Dependencies
- `content_blocks` seeded with default `home_why_us`.

### Tags
`home` · `value-props` · `cms` · `i18n`

### Notes / Rationale
Trust-building block deliberately placed in mid-page between the activities teaser and the testimonials, mirroring functional elegance present on Peek.com's category pages.

---

## US-LD-007 — Home page testimonials carousel

### Story
As a visitor on the home page,
I want to see a carousel of 6 testimonials from existing members with their name, a star rating, and a short quote,
So that social proof nudges me toward booking.

### Priority: P1
### Status: Draft
### Estimate: 5 (story points)

### Actors
- **Primary actor:** Anonymous home page visitor.
- **System actor:** `<TestimonialsCarousel/>` client component.
- **Admin actor:** Curates testimonials from the approved review queue.

### Preconditions
1. At least one published testimonial is in `testimonials` table.

### Postconditions
1. Carousel shows testimonials with avatar (or initial), name, rating (1–5 stars), quote.
2. Auto-advances every 6 s; pauses on hover; supports arrow/dot navigation.

### Main Flow (Happy Path)
1. Server fetches up to 12 published testimonials ordered by `created_at desc`.
2. Client component receives the testimonials prop and renders the carousel using `framer-motion` slide transitions.
3. Each slide has avatar (image if present, else initial in a circle), name, rating, quote.
4. Auto-advance every 6 s; pause on hover; pause on focus-within for accessibility.
5. Visitor can navigate via previous/next arrows (desktop) or swipe (mobile).
6. Telemetry `home.testimonials.view` per slide; `home.testimonials.nav` per user-driven navigation.

### Alternate Flows

#### A1 — Zero published testimonials
1. Carousel replaced with a static "Why our members love us — be the first to review!" CTA pointing to `/contact`.

### Exception Flows

#### E1 — Avatar image error
- Initial-letter fallback renders.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Home page testimonials carousel

  Scenario: Default carousel renders at least one visible testimonial
    Given the home route is rendered and there exists at least one published testimonial
    When the section enters the viewport
    Then a carousel is rendered showing avatar + name + rating + quote

  Scenario: Auto-advance every 6 seconds
    Given the carousel is visible and not hovered/focused
    Then after 6 seconds the next testimonial slides into view

  Scenario: Pause on hover
    Given the carousel is auto-advancing
    When the visitor hovers over it
    Then auto-advance is paused until the pointer leaves

  Scenario: Keyboard navigation works
    Given the carousel is focused via Tab key
    When the visitor presses ArrowRight
    Then next testimonial is shown

  Scenario: No published testimonials shows fallback CTA
    Given zero published testimonials exist
    When the home route renders
    Then a "Be the first to review" CTA is shown instead of the carousel

  Scenario: Click-through to the related activity
    Given a testimonial has activity_id set
    When the visitor clicks on the slide
    Then the browser navigates to /activities/[activity_slug]
```

### Edge Cases
1. **Testimonial rating is 0 or null** — stars not rendered, treated as "no rating".
2. **Quote contains URLs** — anchor wrapped pointing to the URL for review moderation context.
3. **Visitor has reduce-motion** — carousel becomes a stacked list (no auto-advance).
4. **Quote longer than 280 chars** — ellipsised at 277 with "..." and a "Read more" toggle.

### UI/UX Specifications
- Desktop: one large testimonial card, 720 px wide, centered.
- Mobile: full-width.
- Star rating uses a controlled label `rating_5_of_5`.
- Avatar 56×56 px circle, default stroke colour teal.
- Quote font-size 18 px, line-height 1.6.

### Data Model

```
testimonials
  id uuid pk default gen_random_uuid()
  author_name text not null
  author_avatar_url text null
  rating int check (rating between 1 and 5) null
  quote text not null check (length(quote) > 0 and length(quote) <= 1000)
  activity_id uuid fk activities.id null        -- nullable; can tie to a specific activity
  locale text check (locale in ('en','ar')) default 'en'  -- which locale the quote is in
  status text check (status in ('pending','approved','rejected','archived')) default 'pending'
  display_order int default 0
  created_at timestamptz default now()
  approved_at timestamptz null
  approved_by uuid fk auth.users.id null
  index on (status, display_order, created_at desc)
```

### API Endpoints
- Supabase read: `select * from testimonials where status='approved' order by display_order, created_at desc limit 12;`

### Security Considerations
- Quotes rendered with strict escape (no raw HTML in testimonials).
- Avatars validated against CDN origin.
- Admin approval workflow prevents spam.

### Performance Requirements
- Carousel script bundle ≤ 18 KB gz.
- Avatar images adaptive `next/image`.

### Notifications
None.

### Localization
- Quotes are stored in their original locale; if the visitor's active locale differs and a translated approved version exists, it's used; otherwise the original is rendered with a locale tag badge.

### Error Handling
- Empty result → fallback block.
- Single item → carousel still renders without controls (no other slide to navigate to).

### Logging & Analytics
- `home.testimonials.view` per slide viewed ≥ 1 s.
- `home.testimonials.nav` — `{direction ∈ {next, prev, dot, swipe}}`.
- `home.testimonials.click_through` — `{activity_id}`.

### Testing Notes
#### Unit
- `<TestimonialsCarousel/>` pausing, navigation.

#### Integration
- Empty result → fallback CTA.

#### E2E
- Test reduce-motion: stacked list rendered.
- Test keyboard nav.

### Related User Stories
- US-CA-014 (customer leaves a review that flows to testimonial queue after admin approval).
- US-AB-013 (admin moderates reviews).
- US-IN-011 (accessibility).

### Dependencies
- `testimonials` table seeded.
- `framer-motion` available.

### Tags
`home` · `social-proof` · `carousel` · `i18n`

### Notes / Rationale
The `about.md` audit lists 6 strong testimonials on the current site (Salma Akl, Farida Mohamed, Sherine El Gendy, Nesma, Andrew Ezzat, Esraa El Sherbine). These seed the carousel at v1 launch.

---

## US-LD-008 — Home page impact metrics block (counters)

### Story
As a visitor,
I want to see impact metrics on the home page: 250+ active members, 10+ expert coaches, 5+ activities, 30+ events per year,
So that the brand credibility hits me as a number, not just a slogan.

### Priority: P2
### Status: Draft
### Estimate: 3 (story points)

### Actors
- **Primary actor:** Anonymous home visitor.
- **System actor:** `<ImpactCounters/>` client component.
- **Admin actor:** Edits metrics or toggles "auto-recompute" so they update live from DB.

### Preconditions
1. Home route rendered.
2. Admin has set either static metrics or enabled auto-recompute.

### Postconditions
1. Four counters display: "250+ Active Members", "10+ Expert Coaches", "5+ Activities", "30+ Events Per Year".
2. Counters animate from 0 to the final number when scrolled into view.

### Main Flow (Happy Path)
1. Server passes metric values (from `content_blocks.metric_block` payload or from a derived count query).
2. Client component animates from 0 to value over 1.2 s with `easeOut` when the block enters viewport.
3. Telemetry `home.counters.visible`.

### Alternate Flows

#### A1 — Admin enabled auto-recompute
1. Server fragments make 4 cheap `count(*)` queries: `profiles where role='customer'`, `profiles where role='coach'`, `activities where status='published'`, `events where status='published' and start_date > now() - interval '1 year'`.
2. Cached at the edge for 1 hour.

### Exception Flows

#### E1 — Count<* queries slow
- Use cached values from the previous rendering pass.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Home page counters

  Scenario: Counters animate when scrolled into view
    Given a visitor scrolls down the home page
    When the impact metrics block enters the viewport
    Then each counter animates from 0 to its final value over ~1.2 seconds
      And the final values are "250+ Active Members", "10+ Expert Coaches", "5+ Activities", "30+ Events Per Year"

  Scenario: Reduce-motion: counters snap to final
    Given prefers-reduced-motion: reduce
    When the block enters the viewport
    Then the counters immediately display their final values without animation
```

### Edge Cases
1. Value is 0 → counter hidden.
2. Auto-recompute returns fewer published activities (2) than admin's "5+" claim → display "2+ Activities" if admin override is off, else display admin's static "5+" with note.

### UI/UX Specifications
- 4 columns on desktop, 2 on mobile.
- Big number 64 px Inter 700; subtitle 16 px medium.
- Background: light teal `#e6f4f9`.

### Data Model
- `content_blocks` row `slug='impact_metrics'`.
- Payload schema:

```json
{
  "auto_recompute": true,
  "static_values": { "members": 250, "coaches": 10, "activities": 5, "events": 30 }
}
```

### API Endpoints
- Supabase read of four count queries.

### Security Considerations
- Anon role allowed to read count aggregates (RLS denied rows).

### Performance Requirements
- Block lazy-hydrated.

### Notifications
None.

### Localization
- All labels EN/AR.

### Error Handling
- Empty value → 0; counter hidden.

### Logging & Analytics
- `home.counters.visible` — fires once per viewport entry.

### Testing Notes
#### Unit
- Verify animation interpolation.
#### E2E
- Reduce-motion variant.

### Related User Stories
- US-AB-014 (admin edits metric block).
- US-IN-011 (accessibility).

### Dependencies
- `content_blocks` seeded with `impact_metrics`.

### Tags
`home` · `counters` · `metrics` · `i18n`

### Notes / Rationale
Numbers build trust faster than adjectives. Auto-recompute is off by default to avoid showing "2 Activities" while admin builds out the catalogue on launch day.

---

## US-LD-009 — Site header and primary navigation

### Story
As a visitor or logged-in customer,
I want a sticky site header with a logo, primary navigation (Home / Activities / Events / About / Contact / Pricing), a language pill, a "Book Now" CTA, and a Profile/Login button,
So that I can navigate anywhere in one click and quickly switch language or log in.

### Priority: P0
### Status: Draft
### Estimate: 6 (story points)

### Actors
- **Primary actor:** All site visitors.
- **System actor:** `<Header/>` server component + associated client island for the language pill and login state.

### Preconditions
1. Any non-loading route rendered.

### Postconditions
1. Header is sticky at the top.
2. Navigation includes: Home, Activities, Events, About Us, Contact, Pricing — plus a primary "Book Now" button.
3. Language pill toggles EN/AR.
4. Profile/Login button: "Log In" if anonymous, avatar-and-name if logged in.
5. Native mobile: hamburger menu wraps the nav.

### Main Flow (Happy Path)
1. `<Header/>` renders inside the root layout.
2. It receives `session`, `locale`, `unread_count`, `promo_text` props.
3. Renders the brand logo on the left, nav centre, actions right.
4. If `session == null` renders "Log In"; otherwise avatar dropdown.
5. Telemetry fires `header.visible`.

### Alternate Flows

#### A1 — Scroll behaviour
1. On scroll down past 80 px, header compresses (logo shrinks 32 → 24 px).
2. On scroll up anywhere, header returns to expanded.

#### A2 — Promo banner active
1. Promo band is rendered ABOVE the header (height 32–48 px).
2. Header sits below it.

#### A3 — Customer has unread WhatsApp notifications
1. A small dot appears on the avatar.
2. The dropdown's first item is "My bookings (N unread)".

### Exception Flows

#### E1 — Profile image error
- Initials fallback.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Site header

  Scenario: Anonymous visitor sees Log In button
    Given an anonymous visitor
    When any public route is rendered
    Then the header shows a "Log In" button on the right

  Scenario: Logged-in customer sees avatar
    Given a logged-in customer
    Then the header shows a small avatar with name on the right

  Scenario: Language pill toggles locale
    Given the visitor has locale set to English
    When the visitor clicks the language pill
    Then the locale switches to Arabic
      And the page is re-rendered with dir="rtl" and Arabic copy
      And the pill now indicates "EN"

  Scenario: Hamburger menu opens on mobile
    Given viewport width ≤ 768 px
    When the visitor taps the hamburger icon
    Then a slide-in nav drawer reveals all nav links + the Book Now button + the language pill + the Login button

  Scenario: Sticky header compresses on scroll
    Given the visitor scrolls down 100 px
    Then the header's logo shrinks and the nav font decreases from 16 px to 14 px

  Scenario: clicking Book Now navigates to booking
    Given the visitor is on any page
    When the visitor clicks the Book Now button in the header
    Then the browser navigates to /booking (auth gate per US-BF-001)
```

### Edge Cases
1. **Long customer name in dropdown.** Truncate to 18 chars with `…`.
2. **Active route.** Underline bold for the active link in desktop; pill background in mobile.
3. **RTL.** Logo sits to the right; nav items align right; hamburger flips side.
4. **Promo banner disabled.** Header sits flush against the page top.
5. **Active route is `/booking`** — "Book Now" button replaced by "Continue booking".

### UI/UX Specifications
- Sticky `position: sticky; top: 0;` z-index 1000.
- Desktop height: 80 px expanded, 56 px compressed; mobile 56 px.
- Logo is the AquaLudo wordmark SVG, 32 px tall in expanded state.
- Background: `rgba(255,255,255,0.85)` with `backdrop-filter: blur(8px)`.
- Nav font: Inter 500 16 px, line-height 20 px.
- Book Now button: pill, teal `#0d4f73` fill, white text 14 px Inter 700, padding 12×24.

### Data Model
- Reads `nav_items` content block with admin ordering.
- Reads `session` from Supabase Auth (server component).
- Reads `promos` for the active banner (see US-AB-014).

```
nav_items
  id uuid pk
  label jsonb not null       -- { "en": "Activities", "ar": "الأنشطة" }
  href text not null
  display_order int not null
  enabled boolean default true
  index on (display_order)
```

### API Endpoints
- Supabase `auth.getSession()` server-side.
- Hyperlocal server-side prop merge from `nav_items` and `promos`.

### Security Considerations
- Session cookie validated server-side before user is rendered.
- Nav items validated to internal URLs only (no external anchors without admin review).

### Performance Requirements
- Header must paint within 1.2 s LCP.
- Sticky header should not cause scroll jank (use `transform`-based shrink).

### Notifications
- Unread badge on avatar (driven by `notifications_unread` view per US-CN-010).

### Localization
- All labels via `nav_items.label.{en,ar}`.
- Language pill: "AR" when in EN mode; "EN" when in AR mode.

### Error Handling
- If `nav_items` table empty, default 6-link nav rendered.

### Logging & Analytics
- `header.nav_click` — `{href}`.
- `header.book_now_click` — counts clicks.
- `header.language_toggle` — `{from,to}`.
- `header.login_click` — when login button clicked.

### Testing Notes
#### Unit
- Locale toggle in Header.
- Active-link highlighter.

#### Integration
- Login flow ends at header showing avatar.

#### E2E (Playwright)
- Toggle language; assert body dir change.
- Tap hamburger; drawer opens.

### Related User Stories
- US-LD-013 (language toggle).
- US-LD-010 (footer has quick links mirroring nav).
- US-CA-001 → US-CA-005 (auth flows).
- US-IN-002 (i18n framework).

### Dependencies
- Supabase session middleware.
- `nav_items` seeded.

### Tags
`header` · `navigation` · `book-now` · `locale` · `sticky` · `mobile-drawer`

### Notes / Rationale
Single header across all pages keeps discovery friction near zero. The "Book Now" CTA persistent in the header maps to the booking funnel — the primary revenue funnel of the entire site.

---

## US-LD-010 — Site footer

### Story
As a visitor or logged-in customer at the bottom of any page,
I want a footer containing quick links, contact info, social icons, newsletter signup, and a copyright/legal notice,
So that I can find any page even if I scrolled past the header and can contact the business via WhatsApp/Instagram/email.

### Priority: P1
### Status: Draft
### Estimate: 3 (story points)

### Actors
- **Primary actor:** All visitors.
- **System actor:** `<Footer/>` server component.

### Preconditions
- The current route has rendered body content; SSR completes.

### Postconditions
1. Multi-column footer with: Brand logo + tagline (left), Quick Links (Activities, Events, About Us, Contact, Book Online), Contact details (phone, email, address, WhatsApp), Social icons (Instagram, Facebook, TikTok), Newsletter signup form (email input + subscribe button).
2. Bottom strip shows legal: © 2026 AquaLudo. All rights reserved. Privacy Policy · Terms.

### Main Flow (Happy Path)
1. Server fetches `footer` content block + global `business_profile` settings (address, phone, email, socials).
2. Footer renders columns.
3. Newsletter form posts to `/api/newsletter/subscribe` (US-IN-010 — admin audience list).
4. Telemetry `footer.visible`.

### Alternate Flows

#### A1 — Newsletter disabled by admin
- Newsletter column hidden.

#### A2 — Social handle not configured
- That social icon hidden.

### Exception Flows

#### E1 — Newsletter subscription fails
- Inline error "Couldn't subscribe — please try WhatsApp instead."

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Site footer

  Scenario: Footer renders all columns
    Given a fully-rendered route
    Then the footer shows the brand tagline column, quick links, contact details, and social icons
      And the bottom strip shows the copyright notice and Privacy/Terms links

  Scenario: Newsletter subscribe posts to /api/newsletter/subscribe
    Given the visitor enters a valid email in the newsletter form
    When the visitor clicks "Subscribe"
    Then a POST is sent to /api/newsletter/subscribe with the email
      And on success a confirmation message is shown

  Scenario: Phone number opens tel: link
    Given the visitor clicks the +201011329642 phone link
    Then the browser opens the dialer with that number

  Scenario: WhatsApp icon links to wa.me
    Given the visitor clicks the WhatsApp icon
    Then the browser opens https://wa.me/201011329642?text=...
```

### Edge Cases
1. Email invalid → inline validation error.
2. Phone number has spaces and dashes → strip on render for tel: link.
3. RTL — column order reverses; Tel/WhatsApp icons sit on the left; text right-aligned.
4. Mobile — columns stack vertically.

### UI/UX Specifications
- Background `#062031` dark navy.
- Text white 14 px Inter 400; links `rgba(255,255,255,0.85)`.
- 4-column desktop; stacked mobile.
- Newsletter input 240 px; button 88 × 40; primary teal.

### Data Model

```
business_profile
  id int pk default 1
  phone text
  whatsapp text
  email text
  address jsonb           -- { "en": "...", "ar": "..." }
  map_query text          -- "114 Nile St, Ad Doqi A, Dokki, Giza Governorate"
  instagram_handle text
  tiktok_handle text
  facebook_handle text
  newsletter_enabled boolean default true
  updated_at timestamptz
```

`business_profile` is a single row (id=1, row-level locked).

### API Endpoints
- `POST /api/newsletter/subscribe` — body `{email}`. Adds to `newsletter_subscribers` table. Validates with `zod`. Rate-limited to 3/household/day.

### Security Considerations
- Newsletter subscriber email checked for legitimate format and MX domain presence on subscribe.
- CSRF token validated on POST.

### Performance Requirements
- Footer is below-the-fold; lazy-rendered.

### Notifications
None.

### Localization
- Address locale-segmented.
- Privacy/Terms labels internationalised.

### Error Handling
- Newsletter POST 4xx → inline form error.

### Logging & Analytics
- `footer.newsletter_subscribe` — `{success:bool}`.
- `footer.social_click` — `{platform}`.

### Testing Notes
#### Unit
- Newsletter form validation.

#### E2E
- Submit newsletter form mock; assert POST called.

### Related User Stories
- US-AB-014 (admin edits business profile).
- US-IN-010 (newsletter audience).

### Dependencies
- `business_profile` seeded.
- Newsletter API endpoint.

### Tags
`footer` · `contact` · `social` · `newsletter` · `i18n`

### Notes / Rationale
A bottom-of-every-page address + WhatsApp is critical for local Cairo discovery. The existing about.md content (address, phone, email, socials) seeds this row.

---

## US-LD-011 — About Us page

### Story
As a prospective customer who wants to know more about AquaLudo,
I want an "About Us" page that tells the academy's story, its values, its coaches, its history, and its community,
So that I feel I am joining a family, not just booking a service.

### Priority: P1
### Status: Draft
### Estimate: 6 (story points)

### Actors
- **Primary actor:** Anonymous visitor at `/about`.
- **System actor:** `app/(public)/about/page.tsx`.
- **Admin actor:** Edits `about_page` content block.

### Preconditions
1. `content_blocks` has published `about_page`.

### Postconditions
1. About page is rendered with: hero image of the Nile, brand narrative, four pillars (Expert Coaches, Strong Community, All Skill Levels, Oar & Sail Rowing Team), team teaser linking to `/coaches`, gallery CTA linking to `/gallery`, testimonials CTA linking to the home testimonials.

### Main Flow (Happy Path)
1. Server fetches `about_page` payload.
2. Renders hero (image + brand tagline `More Than a Sport, It's a Lifestyle`).
3. Renders narrative body in locale.
4. Renders pillars grid (re-uses the `home_why_us` components if helpful, with different content block slug `about_pillars`).
5. Renders team teaser: top 3 published coaches with avatar + name + specialty.
6. Renders CTA strip: "Meet the team" (→`/coaches`), "See the gallery" (→`/gallery`).
7. Telemetry `about_page.visible`.

### Alternate Flows

#### A1 — Admin disabled team teaser
- Section hidden; CTA strip alone remains.

### Exception Flows

#### E1 — Coaches count 0
- Section shows fallback "Coaches will be published soon."

### Acceptance Criteria (Gherkin)

```gherkin
Feature: About Us page

  Scenario: Page renders hero + narrative + pillars + team teaser
    Given the visitor navigates to /about
    Then the page is rendered with:
      | section        | content                                                                |
      | hero           | Nile image + tagline "More Than a Sport, It's a Lifestyle"             |
      | narrative      | body copy in current locale                                            |
      | pillars        | four pillars: Expert Coaches, Strong Community, All Skill Levels, ... |
      | team teaser    | top 3 coaches with avatar, name, specialties                           |
      | cta strip      | buttons to /coaches and /gallery                                       |
```

### Edge Cases
1. Pillars disabled in admin — section omitted.
2. Narrative copy missing for AR — fallback to EN copy with note `locale_fallback="en"` via SSR analytics.

### UI/UX Specifications
- Hero full-bleed Nile photo; 60 vh desktop; 50 vh mobile.
- Narrative max-width 800 px, readable 1.8 line-height.
- Pillars 4×1 grid desktop; 1×4 mobile.

### Data Model

```
content_blocks.slug IN ('about_hero','about_narrative','about_pillars','about_team_teaser','about_cta_strip')
```

Each payload has the locale-segmented copy.

### API Endpoints
- Single query: `select * from content_blocks where slug like 'about_%' and status='published'`.

### Security Considerations
- All copy sanitised on render.

### Performance Requirements
- ISR 1 hour.

### Notifications
None.

### Localization
- All fields locale-segmented; Pillars reuse the `payload.pillars[]` schema.

### Error Handling
- Missing blocks → default templates from build.

### Logging & Analytics
- `about_page.visible` once.
- `about_page.cta_click` — `{cta_id}`.

### Testing Notes
#### Unit
- Render with all sections enabled.
- Sections disabled.

#### E2E
- Visit `/about`; assert heading; click CTA link → `/coaches`.

### Related User Stories
- US-AC — coaches listing.
- US-LD-007 — testimonials carousel.
- US-AB-014 — admin CMS.

### Dependencies
- Coaches published.

### Tags
`about` · `brand` · `cms` · `i18n`

### Notes / Rationale
"More Than a Sport, It's a Lifestyle" is the existing tagline carried across from about.md — preserve brand continuity.

---

## US-LD-012 — Contact page (map + WhatsApp sticky CTA)

### Story
As a visitor wanting to reach the academy,
I want a contact page with the address, an embedded Google Map, phone, WhatsApp, email, opening hours, and a contact form,
So that I can find the venue physically and reach out on my preferred channel.

### Priority: P1
### Status: Draft
### Estimate: 5 (story points)

### Actors
- **Primary actor:** Anonymous visitor at `/contact`.
- **System actor:** `app/(public)/contact/page.tsx`.

### Preconditions
1. `business_profile` row exists.

### Postconditions
1. Page shows: business address (locale-segmented), Google Map embed (or fallback Mapbox), phone (`tel:`), WhatsApp (`wa.me` deep link with prefilled message), email (`mailto:`), opening hours, contact form.
2. Sticky WhatsApp button on the right edge of every public page when on desktop (mobile: bottom-right floating).

### Main Flow (Happy Path)
1. Server fetches `business_profile`.
2. Renders address + map + phone + WhatsApp + email + hours.
3. Contact form posts to `/api/contact`.
4. Telemetry `contact_page.visible`.

### Alternate Flows

#### A1 — Contact form submission
1. Form fields: name, email (or phone), message.
2. Submit → `/api/contact` writes to `contact_messages` table.
3. Admin gets a notification (US-CN-012).
4. Visitor gets a confirmation toast.

### Exception Flows

#### E1 — Map embed fails
- Fallback to a static map image (`Mapbox Static Images API` or `Google Static Maps`).
- Link to Google Maps directions opens new tab.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Contact page

  Scenario: All contact methods render
    Given visitor at /contact
    Then the page shows address, map, phone (tel:), WhatsApp (wa.me), email (mailto:), hours, and a contact form

  Scenario: Clicking the phone number opens dialer
    Given visitor clicks the phone link
    Then the dialer opens with +201011329642

  Scenario: Clicking WhatsApp opens chat
    Given visitor clicks the WhatsApp button
    Then https://wa.me/201011329642?text=<prefilled> opens in a new tab

  Scenario: Submitting the contact form creates a message
    Given the visitor fills the form with name, email, message
    When the visitor clicks "Send"
    Then a row is inserted in contact_messages
      And an admin notification is dispatched
      And a success toast appears

  Scenario: Sticky WhatsApp CTA hovers on every page
    Given any public page rendered
    When scrolled past the hero
    Then a floating WhatsApp button is visible bottom-right on mobile and side-floated on desktop
```

### Edge Cases
1. Phone number on iOS vs Android — both tel: and wa.me universally supported.
2. Prefilled WhatsApp text in Arabic: `السلام عليكم، أرغب في الاستفسار عن حجوزات أكوالودو`. In English: `Hi AquaLudo, I'd like to ask about booking.`

### UI/UX Specifications
- Map 16:9 aspect, 480 px tall on desktop.
- Contact form 2-column on desktop, single on mobile.
- Floating WhatsApp button 56×56 px, brand teal, white WhatsApp glyph.

### Data Model

```
contact_messages
  id uuid pk
  name text not null
  email text null
  phone text null
  message text not null check (length(message) > 0 and length(message) <= 2000)
  locale text
  user_agent text
  ip_hash text       -- sha256(ip + salt) for abuse tracking
  status text check (status in ('new','replied','archived')) default 'new'
  created_at timestamptz default now()
  handled_by uuid fk auth.users.id null
  handled_at timestamptz null
  index on (status, created_at desc)
```

### API Endpoints
- `POST /api/contact` — receives `{name,email?,phone?,message,locale}`. Body validated by zod. Honeypot field `company` rejects on filled. Rate-limited per IP.

### Security Considerations
- Honeypot to defeat basic bots.
- Rate-limit to 3 messages per IP per hour to prevent spam.
- All fields escaped on render.
- IP hashes stored (not raw IPs).

### Performance Requirements
- Map iframe lazy-loaded with Facade pattern; clicks reveal map.

### Notifications
- Admin gets a WhatsApp message + an in-admin-panel badge per new contact message.

### Localization
- Prefilled WhatsApp message is locale-aware.
- Fields labels EN/AR.

### Error Handling
- Form 4xx → inline errors.
- Form 5xx → toast "Service down — try WhatsApp instead" with link.

### Logging & Analytics
- `contact_page.visible`.
- `contact_page.form_submit`, `contact_page.wa_click`, `contact_page.phone_click`, `contact_page.email_click`.

### Testing Notes
#### Unit
- Form zod schema.
- Honeypot behaviour.

#### E2E
- Fill form, mock POST, assert row created (admin can see it).

### Related User Stories
- US-AD-012 (admin-to-customer message thread).
- US-CN-012 (admin notifications).

### Dependencies
- `business_profile` seeded.

### Tags
`contact` · `map` · `whatsapp` · `form` · `i18n`

### Notes / Rationale
WhatsApp is the dominant communication channel in Egypt. The sticky floating button directly raises conversion among the existing 250+ customer base.

---

## US-LD-013 — Language toggle (EN/AR) with RTL layout

### Story
As a visitor,
I want to flip the entire site between English (LTR) and Arabic (RTL) using a single language pill in the header,
So that I can browse in my preferred reading direction.

### Priority: P0
### Status: Draft
### Estimate: 8 (story points)

### Actors
- **Primary actor:** Any visitor or logged-in customer.
- **System actor:** `<LanguageToggle/>` client component; `app/layout.tsx` root that sets `<html dir>`.

### Preconditions
1. The visitor's browser supports `dir` attribute changes.

### Postconditions
1. The `<html>` element's `dir` attribute is `ltr` for EN, `rtl` for AR.
2. The `<html lang>` attribute is set to the active locale.
3. `localStorage["aqualudo.locale"]` persists the choice across sessions.
4. A signed `locale` cookie is also set so SSR honours locale on subsequent visits.
5. The language pill shows the opposite locale (toggle affordance).

### Main Flow (Happy Path)
1. On any visit, `<LanguageToggle/>` reads the active locale from context (US-IN-002 i18n provider).
2. Toggle click: client calls `setLocale(newLocale)`.
3. Context updates; `localStorage` written; cookie set via `/api/locale` POST.
4. All `useTranslation` subscribers re-render with new translations.
5. `document.documentElement.dir` and `lang` are updated.
6. Telemetry `locale.toggle` with `{from,to}`.

### Alternate Flows

#### A1 — Server rendering
1. On cold SSR, the locale is read from the `locale` cookie (preferred) or the `Accept-Language` header.
2. `<html dir="...">` is set at SSR before any paint to avoid flicker.

#### A2 — Locale cookie expired
1. The signed `locale` cookie default is `en`.
2. Browser `Accept-Language: ar-EG,en;q=0.8` → resolved to `ar`.

### Exception Flows

#### E1 — Visitor's browser does not support `dir` attribute correctly
- Modern browsers (Safari ≥ 14, Chrome ≥ 80, Firefox ≥ 74) cover 99.8% of the Egyptian market; legacy IE11 graceful degrade with a CSS-only flip via `body { direction: rtl; }`.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Language toggle

  Scenario: Toggle from EN to AR
    Given the visitor's locale is "en" and dir="ltr"
    When the visitor clicks the language pill showing "AR"
    Then <html dir> changes to "rtl"
      And <html lang> changes to "ar"
      And localStorage["aqualudo.locale"] equals "ar"
      And the page re-renders with Arabic copy without a full page reload

  Scenario: Returning visitor honours localStorage choice
    Given localStorage has "aqualudo.locale" = "ar"
    When the visitor opens aqualudo.net in a new browser session
    Then the SSR sets <html dir="rtl"> before paint
      And the page renders with Arabic copy

  Scenario: First-visit falls back to Accept-Language
    Given no localStorage, no locale cookie
      And Accept-Language header "ar-EG,en;q=0.9"
    When the home route is server-rendered
    Then the locale is set to "ar"
      And dir="rtl" is applied

  Scenario: Logged-in customer's locale preference is stored in profile
    Given the customer updates the language pill while logged in
    Then the customer's profiles.locale column is updated to "ar"
      And subsequent logins on any device use this preference
```

### Edge Cases
1. Direction flip on mounted `framer-motion` components — left ↔ right transform values swap.
2. Some Arabic strings are longer than their English counterparts; layout must flex (use `min-content` widths, not fixed).
3. Calendar/slot grid shows days right-to-left in Arabic.
4. Heatmap (File 06) renders week columns right-to-left in Arabic.

### UI/UX Specifications
- Pill button 64×32 px, white text on teal background.
- Pill shows the OPPOSITE locale label (e.g. "AR" when current is "en", to signal "click to switch to Arabic").
- Focus ring 2 px white offset 2 px.

### Data Model
- `profiles.locale text check (locale in ('en','ar')) default 'en'` for logged-in customers (Added by File 04).
- `cookies.locale` signed cookie server-set.
- `localStorage["aqualudo.locale"]`.

### API Endpoints
- `POST /api/locale` — body `{locale}`; sets cookie + (if logged in) updates `profiles.locale`.
- Server middleware reads the cookie at SSR.

### Security Considerations
- Cookie signed with `HMAC-SHA256` to prevent tampering.

### Performance Requirements
- Toggle re-renders via React state; no required network request beyond the small POST.

### Notifications
None.

### Localization
- Pill labels EN/AR via ContentDictionary.

### Error Handling
- Invalid locale payload → 400 Bad Request; client reverts the toggle.

### Logging & Analytics
- `locale.toggle` — `{from,to}`.
- `locale SSR resolved` — `{source ∈ {cookie, profile, accept-language, default}}`.

### Testing Notes
#### Unit
- Locale resolver utility.

#### E2E
- Toggle to Arabic; assert `<body dir="rtl">`.
- Reload page; assert Arabic SSR.

### Related User Stories
- US-IN-002 (i18n framework).
- US-IN-003 (RTL).
- US-AB-014 (admin can choose default locale for site).

### Dependencies
- `next-intl` (or equivalent) configured.

### Tags
`locale` · `i18n` · `rtl` · `accessibility` · `cookie`

### Notes / Rationale
EN+AR is a non-negotiable in Cairo (per about.md audit). Persisting at SSR via signed cookie prevents the "Arabic-then-flash-back-to-English" flicker that destroys trust on returning local visits.

---

## US-LD-014 — 404 Not Found and 500 Error pages

### Story
As a visitor who hits a broken URL or triggers a server error,
I want a friendly error page that explains the problem in EN/AR and offers quick links (Home, Activities, Contact),
So that I can recover without bouncing off the site entirely.

### Priority: P1
### Status: Draft
### Estimate: 3 (story points)

### Actors
- **Primary actor:** Any visitor.
- **System actor:** `app/not-found.tsx` and `app/error.tsx` (route-level) and `app/global-error.tsx`.

### Preconditions
- Triggered by a missing route, a 500, a React render error, or a thrown Supabase error.

### Postconditions
1. A themed error page renders above the loading overlay (no animation).
2. The page shows: large error number ("404" or "500"), supporting text (locale-aware), CTA buttons (Home, Book Now, Contact).
3. Telemetry `error.page` is fired with `{error_type}`.

### Main Flow (Happy Path)
1. Visitor navigates to `/some-bad-path`.
2. Next.js matches the NOT_FOUND route.
3. `app/not-found.tsx` renders the themed 404 page.
4. Logged-in session status is preserved (avatar in header renders if logged in).

### Alternate Flows

#### A1 — 500 server error
1. Route throws server-side.
2. `app/error.tsx` boundary catches.
3. Same themed page renders.

#### A2 — Global layout cannot render
1. `app/global-error.tsx` boundary catches.
2. Minimal page with brand logo only; reload button.

### Exception Flows

#### E1 — Error page itself throws
1. Browser default 404 page shown.
2. Log is shipped to Sentry automatically.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Error pages

  Scenario: 404 renders for unknown path
    Given the visitor navigates to /non-existent
    Then a 404 page is rendered showing "404 — Page not found"
      And buttons Home / Activities / Contact are visible

  Scenario: 500 renders when route throws server error
    Given a route throws an unhandled server error
    Then the 500 error page renders with no stack trace visible
      And a "Try again" button reloads the route

  Scenario: Locale-aware messages
    Given the visitor has locale "ar"
    Then the error page renders with Arabic copy and dir="rtl"
```

### Edge Cases
1. Error in production hides stack traces; in dev shows stack for engineers.
2. Error during SSR streaming shows a streaming error placeholder.
3. Logged-in user's avatar still shows in header error.

### UI/UX Specifications
- Background is the brand dark gradient.
- Large "404" 160 px Inter 800.
- Subline 18 px Inter 400.

### Data Model
None.

### API Endpoints
None.

### Security Considerations
- Stack traces never shown to user even on 500.
- Error messages are static templates to avoid info leakage.

### Performance Requirements
- Error pages are static and must render even if the Supabase server is down.

### Notifications
None.

### Localization
- Static copy EN/AR.

### Error Handling
- Recursive error in error page → global-error boundary.

### Logging & Analytics
- `error.page` — `{error_type ∈ {404, 500, render}}`. Captured to Sentry.

### Testing Notes
#### Unit
- Tests for `app/not-found.tsx` rendering in both locales.

#### E2E
- Visit `/non-existent`; assert 404 page.
- Tip a route to throw; assert 500.

### Related User Stories
- US-IN-012 (Sentry integration).

### Dependencies
- Sentry SDK initialised at root.

### Tags
`error` · `404` · `500` · `i18n` · `sentry`

### Notes / Rationale
Error pages cost little, save a lot. They keep bounce rate down on broken inbound links.

---

## US-LD-015 — Quick search overlay (activities / events / coaches)

### Story
As a visitor who knows what they want,
I want a quick-search overlay (⌘K / Ctrl K) that lets me find activities, events, coaches by name,
So that I can skip the click-through navigation and dive to the right page in 2 keystrokes.

### Priority: P2
### Status: Draft
### Estimate: 5 (story points)

### Actors
- **Primary actor:** Anonymous or logged-in visitor.
- **System actor:** `<QuickSearchOverlay/>` client component.
- **Backend:** Supabase RPC `quick_search`.

### Preconditions
- Visitor pressed ⌘K / clicked the search icon in the header.

### Postconditions
1. Overlay appears with input field autofocused.
2. Results stream in ≤ 250 ms after keystroke.
3. Each result row deep-links to its target (`/activities/[slug]`, `/events/[slug]`, `/coaches/[slug]`).
4. Telemetry `search.query` with `query_term`, `result_count`.

### Main Flow (Happy Path)
1. Visitor presses ⌘K.
2. Overlay mounts and input is focused.
3. As visitor types, debounced `txn` 250 ms; backend `RPC quick_search(q)` queries `activities`, `events`, `profiles (role='coach')` via case-insensitive ILIKE.
4. Results grouped by type, max 5 per group.
5. Pressing Enter navigates to first result.
6. Arrow keys navigate rows.
7. Esc or click outside closes the overlay.

### Alternate Flows

#### A1 — No results
- Static "No matches found. Try /activities browse or contact us." row shown.

### Exception Flows

#### E1 — Backend RPC slow / 5xx
- Sticky "Search unavailable — try the activities page." link.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Quick search overlay

  Scenario: ⌘K opens the overlay
    Given any page rendered
    When the visitor presses Cmd+K (or Ctrl+K)
    Then the quick search overlay mounts with the input focused

  Scenario: Typing "row" returns matching activities and events
    Given the overlay is open
    When the visitor types "row"
    Then within 500 ms results matching "row" appear
      And each result is grouped under "Activities", "Events", or "Coaches"

  Scenario: Enter navigates to the first result
    Given the overlay is showing results
    When the visitor presses Enter
    Then the browser navigates to the first result's URL

  Scenario: Esc closes overlay
    Given the overlay is open
    When the visitor presses Escape
    Then the overlay closes
      And the previously focused element regains focus

  Scenario: No results
    Given the visitor typed "zzz"
    When the query returns empty
    Then a "No matches" message and a /activities fallback link are shown
```

### Edge Cases
1. Mobile: no ⌘K. A search icon in the header opens the overlay.
2. RTL: results list rows swap icon/text order.
3. Two results have the same slug — backend dedups by `(type, slug)`.

### UI/UX Specifications
- Overlay: dark backdrop `rgba(0,0,0,0.55)` with `backdrop-filter: blur(4px)`.
- Modal 720×480 px desktop; full-bleed mobile.

### Data Model
- Postgres function:

```sql
create or replace function quick_search(q text) returns table (
  result_type text,
  slug text,
  title text,
  subtitle text,
  image_url text
)
language sql stable security definer as $$
  select 'activity' as result_type, slug, name, short_description, image_url
    from activities
    where status = 'published' and (name ilike '%'||q||'%' or short_description ilike '%'||q||'%')
    limit 5
  union all
  select 'event', slug, name, description, image_url
    from events
    where status = 'published' and (name ilike '%'||q||'%' or description ilike '%'||q||'%')
    limit 5
  union all
  select 'coach', slug, full_name, specialties::text, avatar_url
    from profiles
    where role = 'coach' and status = 'active' and full_name ilike '%'||q||'%'
    limit 5;
$$;
```

### API Endpoints
- `POST /api/search` — `{q:string}` returns array of results; RLS-protected RPC; rate-limited per-IP at 30/min.

### Security Considerations
- Parameterised ILIKE no SQL injection risk.
- Rate-limit prevents scraping.

### Performance Requirements
-304 milliseconds end-to-end for typical query length 3–8 chars.

### Notifications
None.

### Localization
- Result group labels EN/AR.

### Error Handling
- Empty query returns empty list (no errors).

### Logging & Analytics
- `search.query` — `{query, result_count}`.
- `search.result_click` — `{result_type, slug}`.

### Testing Notes
#### Unit
- `quick_search` function tests in SQL.

#### E2E
- ⌘K on desktop, type, Enter.

### Related User Stories
- US-AC-003 (activities filtering/search).
- US-IN-009 (search infra).

### Dependencies
- Supabase RPC function installed.

### Tags
`search` · `⌘K` · `overlay` · `i18n`

### Notes / Rationale
A power-user affordance; Press / keybinding drives engagement among the existing 250-member base who already know what they want.

---

## End of File 01

This file was authored with detailed User Stories covering the Loading Animation and Public Discovery experience for AquaLudo v2.

Up next in the project's user-story library:

- **File 02** — Activities & Pricing Catalog US-AC-001..012
- **File 03** — Booking Flow US-BF-001..015
- **File 04** — Customer Account US-CA-001..015
- **File 05** — Admin Content Management US-AB-001..015
- **File 06** — Admin Heatmap Dashboard US-HM-001..012
- **File 07** — Admin Booking Management US-AD-001..015
- **File 08** — Coach Panel US-CO-001..012
- **File 09** — Communications & Notifications US-CN-001..016
- **File 10** — Platform Infrastructure US-IN-001..018