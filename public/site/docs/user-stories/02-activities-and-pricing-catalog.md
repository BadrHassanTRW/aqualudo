# File 02 — Activities & Pricing Catalog User Stories

> **Project:** AquaLudo v2 (water sports academy on the Nile, Cairo, Egypt)
> **Stack:** Next.js 14 (App Router) + Supabase (Postgres + Auth + Storage) + Paymob
> **Domain covered by this file:** Activities listing, activity detail page, search/filter, pricing, memberships, public coach profiles, gallery, event marketing pages, reviews display, activity SEO, sharing controls.
> **Last updated:** 2026-07-28
> **Status:** Draft (awaiting technical + business review)
> **Owner:** Product team
> **Related files:** `01-loading-and-public-discovery.md`, `03-booking-flow.md`, `04-customer-account.md`, `05-admin-content-management.md`, `08-coach-panel.md`, `10-platform-infrastructure.md`

---

## How to read this document

User stories follow the same template introduced in File 01 (see "How to read this document" there). For convenience, the sections per story are:

1. Story · 2. Priority/Status/Estimate · 3. Actors · 4. Preconditions/Postconditions · 5. Main Flow · 6. Alternate Flows · 7. Exception Flows · 8. Acceptance Criteria (Gherkin) · 9. Edge Cases · 10. UI/UX Specifications · 11. Data Model · 12. API Endpoints · 13. Security Considerations · 14. Performance Requirements · 15. Notifications · 16. Localization · 17. Error Handling · 18. Logging & Analytics · 19. Testing Notes · 20. Related User Stories · 21. Dependencies · 22. Tags · 23. Notes / Rationale.

Acceptance criteria are written in Gherkin so they map directly to Playwright/Cypress assertions.

---

## Architectural Context

The catalog is the **heart of the customer-facing experience**. Everything upstream of an actual booking flows through one of the catalog pages: a visitor browses the activities listing (`/activities`), drills into an activity (`/activities/[slug]`), applies filters, compares pricing (`/pricing`), reads reviews, sees coaches (`/coaches/[slug]`), or browses events (`/events/[slug]`). All these routes are publicly indexable (anonymous RLS) and statically rendered via ISR to give both fast first paint and reliable SEO.

The catalog is backed by the following Supabase tables (full schema todos live in File 10 — Platform Infrastructure; this file documents the fields each user story relies on):

```
categories
  id            uuid pk
  slug          text unique
  name          jsonb not null         -- { "en": "Rowing", "ar": "تجديف" }
  description   jsonb
  display_order int
  enabled       boolean default true

activities
  id            uuid pk
  slug          text unique
  category_id   uuid fk categories.id
  name          jsonb not null
  short_description jsonb not null
  long_description  jsonb not null
  hero_image_url   text not null      -- CDN
  gallery_image_urls text[]            -- up to 8 optional additional images
  status        text check (status in ('draft','published','archived')) default 'draft'
  display_order int default 1000
  default_slot_minutes int default 60
  default_capacity int default 4
  min_capacity  int default 1
  max_capacity  int default 8
  is_private_only boolean default false
  created_at    timestamptz default now()
  updated_at    timestamptz
  created_by    uuid fk auth.users.id
  updated_by    uuid fk auth.users.id

activity_pricing_tiers
  id            uuid pk
  activity_id   uuid fk activities.id on delete cascade
  tier_code     text not null          -- 'onboarding', 'foundation', 'performance', 'elite', 'private'
  name          jsonb not null
  description   jsonb
  duration_minutes int not null
  price_egp     int not null
  capacity      int default 4
  is_default    boolean default false
  enabled       boolean default true
  display_order int default 100
  unique (activity_id, tier_code)

activity_add_ons
  id            uuid pk
  activity_id   uuid fk activities.id on delete cascade null  -- null means global add-on available for any activity
  name          jsonb not null
  description   jsonb
  price_egp     int not null
  enabled       boolean default true
  display_order int default 100

session_packages
  id            uuid pk
  slug          text unique
  name          jsonb not null
  description   jsonb
  session_count int not null           -- e.g. 8
  bonus_count   int default 0          -- e.g. 1 free
  price_egp     int not null           -- total package price
  activities_included uuid[] -- array of activity_ids; empty = any activity
  validity_days int default 90
  display_order int default 100
  enabled       boolean default true

membership_tiers
  id            uuid pk
  slug          text unique
  name          jsonb not null
  description   jsonb
  price_egp_monthly int not null
  sessions_per_month int not null
  activities_included uuid[]   -- activities allowed on this tier
  benefits     jsonb         -- stored list of {en,ar} bullet strings
  is_popular   boolean default false
  display_order int default 100
  enabled       boolean default true

coaches
  id            uuid pk
  slug          text unique
  user_id       uuid fk auth.users.id not null     -- linked to profiles row
  full_name     text not null
  specialties   text[]                              -- ['rowing','sup',...]
  certifications jsonb  -- [{issuer, title, year, locale}]
  languages     text[]    -- ['en','ar']
  instagram_handle text
  bio           jsonb     -- {en, ar}
  avatar_url    text
  display_order int
  status        text check (status in ('draft','published','archived')) default 'draft'

events
  id            uuid pk
  slug          text unique
  name          jsonb not null
  description   jsonb
  hero_image_url text
  start_at      timestamptz not null
  end_at        timestamptz not null
  location_name jsonb
  address       jsonb
  pricing_notes jsonb             -- { "tiers" : [{ name, price_egp }] }
  capacity      int
  status        text check (status in ('draft','published','archived')) default 'draft'
  created_at    timestamptz default now()
  updated_at    timestamptz

reviews
  id            uuid pk
  rating        int check (rating between 1 and 5) not null
  body          text check (length(body) > 0 and length(body) <= 1000) null
  activity_id   uuid fk activities.id
  coach_id      uuid fk coaches.id null
  user_id       uuid fk auth.users.id
  booking_id    uuid fk bookings.id          -- a review is tied to a real booking to avoid spam
  locale        text default 'en'
  status        text check (status in ('pending','approved','rejected','archived')) default 'pending'
  moderated_by  uuid fk auth.users.id null
  moderated_at  timestamptz null
  created_at    timestamptz default now()
  unique (booking_id)                       -- one review per booking
  index on (activity_id, status, created_at desc)

gallery_items
  id            uuid pk
  type          text check (type in ('photo','video')) not null
  url           text not null
  title         jsonb
  description   jsonb
  width         int
  height        int
  thumbnail_url text
  tags          text[]
  display_order int default 100
  status        text check (status in ('pending','published','archived')) default 'pending'
  taken_at      timestamptz null
  created_at    timestamptz default now()
```

Each row is published/archived by admin through File 05 flows. Review moderation creates `reviews.status='approved'` rows that this file's read paths surface.

---

## Domain Glossary

- **Activity** — a bookable, recurring water-sports offering (Rowing, Kayaking, SUP, Wakeboarding, Fitness). Has 1+ pricing tiers.
- **Category** — a navigation grouping above activities (Rowing, Kayaking, SUP, Wakeboard, Fitness).
- **Pricing tier** — a single bookable unit inside an activity (e.g. Rowing On-Boarding vs Rowing Elite). Each has its own price, capacity, and duration.
- **Add-on** — an optional purchasable item at booking (wetsuit rental, GoPro footage, photo package). Per activity, can be global.
- **Session package** — a prepaid bundle of sessions with optional bonus (e.g. 8 sessions + 1 free).
- **Membership tier** — a monthly subscription tier with N included sessions and access to a defined activity set.
- **Coach** — a staff user with public profile, schedule, and customer-messaging rights.
- **Event** — a special, date-bound occasion (Run & Row Challenge, Ramadan Iftar). Marketing-page only, per the chosen interview scope; "Sign up" triggers normal booking flow.
- **Review** — a star rating + short text written by a verified customer after their session; must be matched to a booking; goes through admin moderation.

---

## Table of Contents

1. US-AC-001 — Activities listing page
2. US-AC-002 — Activity detail page
3. US-AC-003 — Activity filtering and search ([/activities?q=…&category=…])
4. US-AC-004 — Pricing & Memberships page
5. US-AC-005 — Membership tier comparison block
6. US-AC-006 — Activity reviews display (post-moderation, with rating summary)
7. US-AC-007 — Gallery page (photos + videos)
8. US-AC-008 — Coach public profile page (with personal session booking)
9. US-AC-009 — Events marketing page (/events/[slug])
10. US-AC-010 — Activity related & cross-sell section
11. US-AC-011 — Activity SEO + structured data (schema.org SportsActivityLocation)
12. US-AC-012 — Social sharing buttons (deep links to WhatsApp / Facebook / X / Instagram)

---

## US-AC-001 — Activities listing page

### Story
As a visitor wanting to discover what AquaLudo offers,
I want a clean listing grid of all published activities — each showing an image, name, short description, starting price, duration badge, and two CTAs (Learn More / Book Now),
So that I can compare activities visually and pick one without paging through endless detail pages.

### Priority: P0
### Status: Draft
### Estimate: 8 (story points)
### Sprint: Sprint 2 — Catalog MVP

### Actors
- **Primary actor:** Anonymous public visitor to `/activities`.
- **Secondary actor:** Logged-in customer browsing.
- **System actor:** `app/(public)/activities/page.tsx`, `<ActivityGrid/>` server component.

### Preconditions
1. At least one published activity exists in `activities`.
2. Visitor is on a modern browser with JavaScript enabled (graceful no-JS rendering supported — `/activities` is fully SSR).
3. ISR cache key for `/activities` is fresh (< 60 s).

### Postconditions
1. A responsive grid of `n` activity cards is rendered on first paint, where `n = count(activities where status='published')`.
2. Cards are sorted by `display_order` ASC, then `created_at` DESC within ties.
3. Each card shows: hero image, category badge, name (locale), one-line teaser (locale), starting price (lowest `activity_pricing_tiers.price_egp` for enabled tiers), duration badge (`{duration_minutes} min`), "Learn more" link, "Book now" button.
4. Hover state on desktop lifts the card with shadow; mobile scroll is snappy.
5. SEO IRL meta tags + Open Graph are populated.

### Main Flow (Happy Path)
1. Visitor navigates to `/activities` (header nav, footer link, hero secondary CTA, or directly typed).
2. Next.js ISR serves the cached `/activities` HTML if fresh, else regenerates in the background while serving stale.
3. Server component queries Supabase:

   ```sql
   select a.*, c.slug as category_slug, c.name as category_name,
          min(t.price_egp) as starting_price,
          min(t.duration_minutes) as default_duration
     from activities a
     join categories c on c.id = a.category_id
     left join activity_pricing_tiers t on t.activity_id = a.id and t.enabled = true
     where a.status='published'
     group by a.id, c.id
     order by a.display_order asc, a.created_at desc;
   ```

4. Cards rendered server-side; lazy-hydrated once the grid is in the viewport.
5. Each card's CTA labelled `Learn more` links to `/activities/[slug]`.
6. Each card's CTA labelled `Book now` links to `/booking?activity=[slug]`.
7. Telemetry event `activities.listing.view` fires when ≥ 50 % of the grid is in the viewport for ≥ 500 ms.

### Alternate Flows

#### A1 — Category filter applied via URL
1. Visitor navigates to `/activities?category=rowing`.
2. Server reads `category` from search params and filters by `categories.slug='rowing'`.
3. Page renders only Rowing activities; URL is shareable and SEO-friendly.

#### A2 — Search query string
1. Visitor navigates to `/activities?q=beginner`.
2. Server component runs an ILIKE query across `name`, `short_description`, `long_description`.
3. Results render; an empty-state block shows if no matches (US-AC-003).

#### A3 — Visitor switches language to Arabic
1. `<LanguageToggle/>` mutation updates active locale.
2. All card copy re-renders from jsonb locale keys.
3. No reload needed.
4. URL unchanged; `<html dir="rtl">` applied.

#### A4 — Visitor is logged in
1. Header continues to show avatar (US-LD-009).
2. Cards have a subtle "favorite" heart; clicking toggles `customer_favorites` entry (per US-CA-008 history tab).

### Exception Flows

#### E1 — Supabase read fails
1. Next.js catches server error and renders the cached previous successful render if it exists.
2. If no cached render exists, server returns HTTP 500 and the themed error page US-LD-014 renders.

#### E2 — Image CDN fails
1. Card image uses `next/image` blur-up fallback gradient.

#### E3 — Activity has zero published pricing tiers
1. "Starting price" badge renders "Price on request" instead of a number.
2. Card's "Book now" button is replaced with "Enquire on WhatsApp" linking to `wa.me/201011329642?text=Hi AquaLudo, I'd like to ask about [activity name]`.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Activities listing page

  Scenario: Default view renders all published activities
    Given there exist 5 published activities with display_order set
    When the visitor opens /activities
    Then a responsive grid of 5 activity cards is rendered
      And each card shows image, category badge, name, teaser, starting price, duration badge, and the two CTAs

  Scenario: Category filter renders only matching activities
    Given the visitor navigates to /activities?category=rowing
    When the page renders
    Then only rowing activities are shown in the grid

  Scenario: Direct URL share honours the filter
    Given a colleague shared the URL "/activities?category=rowing" with the visitor
    When the visitor opens the link
    Then only rowing activities are shown without requiring an explicit filter click

  Scenario: Activity with no published pricing tier shows "Price on request"
    Given an activity "X" has all activity_pricing_tiers.enabled=false
    When the activities listing renders X's card
    Then the price area shows "Price on request" instead of an EGP amount
      And the "Book now" button is labelled "Enquire on WhatsApp"

  Scenario: Click "Book now" on a card navigates to the booking flow with activity pre-selected
    Given the visitor clicks "Book now" on the Wakeboarding card
    Then the browser navigates to /booking?activity=wakeboarding
      And if anonymous, the auth gate intercepts first

  Scenario: Click "Learn more" on a card navigates to the detail page
    Given the visitor clicks "Learn more" on the Rowing card
    Then the browser navigates to /activities/rowing

  Scenario: Switching language re-renders cards without a full reload
    Given the visitor on /activities with locale "en"
    When the visitor toggles to Arabic
    Then card texts are in Arabic
      And <html dir> is "rtl"
      And the browser URL does not change
```

### Edge Cases
1. **Activity flagged `home_card_hidden=true`** — still appears in listing; only the home teaser suppresses it.
2. **Two activities share the same `display_order`** — tie-broken by `created_at` DESC (newer first).
3. **Pricing tier has a different duration than the activity default** — listing card badge shows the lowest price tier's duration.
4. **Activity marked `is_private_only=true`** — card badge "Private only".
5. **Long Arabic activity name overflow** — clamp to 2 lines via CSS `-webkit-line-clamp:2`.
6. **Logged-in customer's favorite marker persisted** — heart filled in gold for activities in favorites.
7. **RSS / sitemap.xml** — `/activities` is included in `sitemap.xml` at site root.

### UI/UX Specifications

#### Desktop (≥ 1024 px)
- 3-column grid (≤ 1280 px) or 4-column grid (≥ 1440 px).
- Card aspect 4:3.
- Card padding 16 px; rounded 12 px; shadow on hover lifts 4 px.
- "Starting price" tag: gold pill `#F5A623` background, white text 14 px Inter 700, anchored bottom-left of image.
- Duration badge: white pill, teal text 12 px Inter 600, anchored bottom-right of image.
- Image hover zoom 1.04× inside fixed card frame.

#### Mobile (≤ 640 px)
- Single column full-width.
- Card image switches to 16:9 with text below.
- "Learn more" text CTA, "Book now" full-width pill button.

#### RTL (Arabic)
- Grid flows right-to-left.
- Price/duration badges swap corners.

#### Loading state
- Shimmer skeletons (12 cards) until payload resolves.

#### Empty state
- "Couldn't find activities matching your filter. Clear filters or browse all." with a "Clear" button.

#### Error state
- Themed error block (US-LD-014 style).

#### Success state
- All cards visible and interactive within 200 ms of first paint.

### Data Model

- Reads from `activities`, `categories`, `activity_pricing_tiers`.
- Optional eager-load of `customer_favorites` if user session is provided (slot for US-CA-008).

```
customer_favorites
  user_id      uuid fk auth.users.id
  activity_id  uuid fk activities.id on delete cascade
  created_at   timestamptz default now()
  primary key (user_id, activity_id)
```

### API Endpoints

#### Next.js Route Handlers
- `GET /api/activities` — JSON list response (admin-only POST/PATCH are in File 05).

#### Supabase queries
- Server component uses the `anon` RLS-enabled `select` of the join above.
- Caching: `revalidate=60`.

#### Optional search params
- `?category=<slug>` (string; lowercased if needed).
- `?q=<free text>` (string; trimmed).
- `?page=<int>` and `?limit=<int>` for pagination — default `page=1`, `limit=24`.
- `?sort=<created_at|price|rating>` — defaults to `display_order+created_at`.

### Security Considerations
- All rows exposed are `status='published'` only — enforced by RLS.
- Search ILIKE parameterised; no SQL injection vectors.
- Rate limits: anon `/api/activities` capped at 60 calls/min/IP.

### Performance Requirements
- LCP ≤ 1.8 s on 4G mobile.
- Card images delivered via AVIF/WebP at sizes responsive to viewport via `next/image`.
- 24 activity cards' combined image payload ≤ 1.0 MB on a 4 G connection.

### Notifications
None.

### Localization
- All name/description fields locale-segmented (jsonb `{en,ar}`).
- "Starting price" prefix: `From` (EN) / `يبدأ من` (AR).
- "min" suffix: `min` (EN) / `د` (AR) — for slot duration. (Arabic uses "د" for دقيقة.)

### Error Handling
- Bad query params (e.g. `?page=-1`) ignore invalid and use defaults with no error to user.
- 404 on category filter: render an empty state without server 404.

### Logging & Analytics
- `activities.listing.view` — `{count, category_filter, sort}`.
- `activities.listing.card_click` — `{activity_id, cta: 'learn_more' | 'book_now' | 'favorite'}`.

### Testing Notes

#### Unit
- `<ActivityGrid/>` render with empty, 1, 5 cards.
- `selectActivitiesForList` SQL helper with various filter inputs.

#### Integration
- Mock Supabase returns different `count` results; verify rendering.
- Anonymous vs logged-in variant for the favorite heart.

#### E2E (Playwright)
- Visit `/activities`; assert card count matches seeded test data.
- Click "Learn more" → URL is `/activities/[slug]`.
- Click "Book now" (anon) → URL is `/booking?activity=[slug]` and then auth redirect.
- Toggle language → card title text changes.

### Related User Stories
- US-LD-005 (home page activities teaser using same cards).
- US-LD-009 (header navigation to /activities).
- US-BF-002 (booking flow with pre-selected activity).
- US-AB-003 (admin activity creation).
- US-IN-011 (accessibility for the grid).
- US-IN-008 (image CDN).

### Dependencies
- `activities` and `categories` rows seeded with the five default rows (Rowing, Kayaking, SUP, Wakeboard, Fitness).
- ISR cache built at build time.

### Tags
`activities` · `catalog` · `listing` · `isr` · `i18n` · `seo`

### Notes / Rationale
The single listing grid consolidates the current Wix fragmentation (4 identical 200 EGP rowing cards) by exposing each activity as one card, with its tiers listed inside the detail page. Visually elevates the user's choice to "which activity" before "which tier".

---

## US-AC-002 — Activity detail page

### Story
As a visitor who clicked through from the listing or landed directly via a search result,
I want a rich activity detail page that explains the activity (long copy, image gallery, included/excluded items, what to bring, safety notes, coach list, available pricing tiers, reviews, related activities, and the next available bookable slots),
So that I can confidently decide whether to book it now or save it for later.

### Priority: P0
### Status: Draft
### Estimate: 13 (story points)
### Sprint: Sprint 2 — Catalog MVP

### Actors
- **Primary actor:** Anonymous or logged-in visitor.
- **System actor:** `app/(public)/activities/[slug]/page.tsx`.
- **Admin actor:** Edits content via US-AB-003 / US-AB-004.

### Preconditions
1. `activities.slug = '[slug]'` exists with `status='published'`.
2. ISR cache for the activity route is fresh (< 300 s).

### Postconditions
1. Page renders hero, long copy, gallery, included/excluded items, what to bring, safety notes, coach list, pricing tiers, reviews, related activities, and next-available slot preview.
2. Primary CTA "Book now" routes to `/booking?activity=[slug]&tier=[chosen tier code]`.
3. Schema.org markup renders for Google rich results (US-AC-011).

### Main Flow (Happy Path)
1. Visitor navigates to `/activities/[slug]`.
2. Server fetches activity row + tiers + assigned coaches + gallery + reviews.
3. Page renders hero image with overlay title + tagline.
4. Below hero: long copy in 2-column wrapper (max-width 1200 px).
5. Right rail (sticky on desktop): pricing-tiers card with each tier's price and a Select radio; selected tier determines the "Book now" deep link.
6. Below copy: tabbed sections "Overview / What to bring / Coaches / Reviews".
7. "Reviews" tab loads 6 sample approved reviews with `Average rating star` overview (US-AC-006).
8. "Related activities" cross-sell row appears under the tabs (US-AC-010).
9. "Next available slots" strip shows 3 upcoming dates/times with availability counts as a quick preview into the booking flow.
10. Telemetry `activity.detail.view`.

### Alternate Flows

#### A1 — Activity flag private-only
1. Page hero badge "Private only".
2. Booking CTA deep link uses `tier=private`.

#### A2 — Activity has no reviews yet
1. Reviews tab shows "Be the first to leave a review" with a CTA to book first.

#### A3 — Activity has no published coaches yet
1. Coaches tab shows "Coaches will be published soon" placeholder.

#### A4 — Logged-in customer viewing
1. Sticky right rail shows historical bookings for this activity (count + last visit).
2. Favorite heart available.

### Exception Flows

#### E1 — Activity not found / archived
1. `app/not-found.tsx` (US-LD-014) renders.
2. If admin renamed the slug, a 301 from the slug-history table (US-AB-004) redirects to the new URL.

#### E2 — Pricing tier error
1. If no enabled tiers, page hero shows "Price on request" and CTA "Enquire on WhatsApp".

#### E3 — Image CDN failure
1. Hero falls back to a teal gradient; gallery shows blur-up thumbnails.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Activity detail page

  Scenario: Page layouts include all sections
    Given visitor navigates to /activities/rowing
    Then the page shows hero, long copy, gallery, "What to bring", coaches, reviews overview, and related activities

  Scenario: Selecting a pricing tier updates the Book Now link
    Given the activity has three tiers (Foundation, Performance, Elite)
    When the visitor toggles to "Elite" in the pricing card
    Then the "Book now" button href changes to /booking?activity=rowing&tier=elite

  Scenario: Clicking Book Now when anonymous redirects through the auth gate
    Given the visitor is anonymous
    When the visitor clicks Book Now on the Rowing detail page with the Elite tier selected
    Then the browser navigates to /booking?activity=rowing&tier=elite
      And the auth gate intercepts and prompts login

  Scenario: Logged-in customer sees their booking history on the page
    Given a returning logged-in customer with prior Rowing bookings
    When they visit /activities/rowing
    Then the right rail displays "You've booked Rowing 4 times. Last visit: 11 Jul 2026."

  Scenario: Activity not found renders 404
    Given visitor navigates to /activities/does-not-exist
    Then the 404 page (US-LD-014) renders

  Scenario: Renamed activity slug redirects to the new path
    Given admin renamed an activity slug from "rowing-basic" to "rowing-foundation"
    When the visitor opens /activities/rowing-basic
    Then the server returns 301 to /activities/rowing-foundation

  Scenario: Telemetry records the view
    Given an anonymous visitor views /activities/rowing
    Then a telemetry event "activity.detail.view" is fired with {activity_id, tier_id, locale}
```

### Edge Cases
1. Activity with 0 gallery image URLs — gallery section hidden.
2. Review rating average rounds to half-stars — render half star SVG.
3. Coach was archived since booking — coach name still shown as "Coach (former)" so historical reviews don't reference a deleted person.
4. Slot preview shows 5 days + button "See all slots" → `/booking?activity=[slug]`.

### UI/UX Specifications

#### Desktop
- Hero full-bleed 720 px tall, image darkened with overlay 30 %.
- Long copy under hero, 2-column layout: main 8/12 + rail 4/12 (sticky).
- Pricing card 360 px wide in rail.

#### Mobile
- Hero 480 px tall.
- Long copy stacked.
- Pricing card sits below copy, full-width.
- Tabs full-width.

#### RTL
- All text right-aligned; rail sits left (in DOM order it remains right via dir flip).

#### Loading state
- Skeleton sections with placeholders.

#### Empty state
- "Page not found" if activity missing.

#### Error state
- Themed error block.

#### Success state
- Cross-sell section visible; reviews cards with star ratings rendered.

### Data Model

- `activities`, `activity_pricing_tiers`, `coaches`, `reviews`, `gallery_items`.
- Cross-reference table `activity_coaches`:

```
activity_coaches
  activity_id  uuid fk activities.id on delete cascade
  coach_id     uuid fk coaches.id  on delete cascade
  is_primary   boolean default false
  primary key (activity_id, coach_id)
```

### API Endpoints
- `GET /api/activities/[slug]` returns the SSR payload (cacheable).
- Supabase query joins tables with published-only filters.

### Security Considerations
- All public fields exposed through RLS.
- Reviews server-side aggregated; no PII exposed.
- Image URLs validated client + server.

### Performance Requirements
- LCP ≤ 2.2 s on 4G mobile.
- Hero image lazy-loaded after LCP.
- Tabs lazy-mount their content on activation (each tab fetched on demand).

### Notifications
None.

### Localization
- Hero, copy, includes, what-to-bring, safety notes — all locale-segmented jsonb fields.

### Error Handling
- 404 fallback if row not found.
- Validation on `slug` route param.

### Logging & Analytics
- `activity.detail.view` with `{activity_id, tier_id, locale}`.
- `activity.detail.book_now_click`.
- `activity.detail.tab_change` with `{tab}`.

### Testing Notes
#### Unit
- Tier radio selection updates URL tracking.
- Tabbed lazy-mount.

#### Integration
- Seed 3 tiers and assert pricing card.
- Seed 5 reviews and assert summary.
- 0 reviews → empty state.

#### E2E
- Navigate `/activities/rowing`; assert hero.
- Toggle tier; assert href change.
- Logged-in mock; assert history rail.

### Related User Stories
- US-AC-001 (listing → detail transition).
- US-BF-002 (booking flow entry point).
- US-AC-006 (reviews tab content).
- US-AC-010 (related activities).
- US-AC-011 (SEO schema).
- US-AB-003 (create), US-AB-004 (update slug redirect).

### Dependencies
- `activity_coaches`, `activity_pricing_tiers`, `reviews` seeded.

### Tags
`activities` · `detail` · `seo` · `isr` · `i18n` · `reviews` · `related`

### Notes / Rationale
The detail page is where the customer decides. Multiple pricing tiers under a single activity page (rather than 4 separate cards as today) eliminates the user confusion flagged in `about.md`'s audit ("Rowing is fragmented into 4 identical 200 EGP options").

---

## US-AC-003 — Activity filtering and search

### Story
As a visitor who knows roughly what they're looking for,
I want to filter the activities listing by category, price range, duration, skill level, and language spoken by the coach,
So that I can find the right activity for me without paging through unrelated cards.

### Priority: P1
### Status: Draft
### Estimate: 6 (story points)

### Actors
- **Primary actor:** Anonymous visitor at `/activities`.
- **System actor:** `<ActivityFilterSidebar/>` + URL state.

### Preconditions
1. Listing page is rendered.

### Postconditions
1. Filters mutate URL search params (`?category=rowing&minPrice=100&maxPrice=400&duration=60&level=beginner&spokenLang=ar`).
2. Listing page reflects filtered set.
3. Filter chips above the grid show active filters; each chip removable.

### Main Flow (Happy Path)
1. Visitor toggles a filter (e.g. category Rowing).
2. URL updates client-side via `next/navigation` `useRouter().replace`.
3. Server reads searchParams and queries accordingly.
4. Filter chip rendered representing the active filter; click to remove.
5. Telemetry `activities.filter.apply` with `{filter, value}`.

### Alternate Flows

#### A1 — Multiple categories selected
- `category=rowing&category=kayak` URL array. Query uses `in (…)`.

#### A2 — Search query + filter combination
- `/activities?q=beginner&category=rowing` shows beginner-related Rowing activities.

#### A3 — Clear all filters button
- Removes all URL params; grid returns to default.

### Exception Flows

#### E1 — Filter returns 0 results
- Empty state with "Clear filters" button.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Activity filtering & search

  Scenario: Apply a single category filter
    Given visitor on /activities
    When the visitor toggles "Kayaking" in the filter sidebar
    Then the URL becomes /activities?category=kayaking
      And only Kayak activities render in the grid

  Scenario: Apply a price range filter
    Given visitor selects the price range 100–400 EGP
    Then the URL becomes /activities?minPrice=100&maxPrice=400
      And only activities with at least one enabled tier priced within the range are shown

  Scenario: Apply a duration filter
    Given visitor selects "30 min"
    Then the URL becomes /activities?duration=30
      And only activities whose default slot minutes equal 30 are shown

  Scenario: Combine search text with category
    Given visitor types "beginner" in the search box
      And toggles the Rowing category
    Then the URL is /activities?q=beginner&category=rowing
      And only Rowing activities with "beginner" in title or description appear

  Scenario: Clear all filters restores default grid
    Given multiple filters are active
    When the visitor clicks "Clear filters"
    Then the URL becomes /activities with no search params
      And the grid returns to all published activities

  Scenario: Filter chips show active filters and remove individually
    Given two filters active
    Then two chips are rendered above the grid
      And clicking chip X removes only that filter
```

### Edge Cases
1. Invalid price (`minPrice > maxPrice`) → silently swap values and apply.
2. `category=some-fake` → returns empty grid with "No matching activities" empty state.
3. URL shared with filter combination persists across visits.

### UI/UX Specifications

#### Desktop
- Filter sidebar left (240 px wide), sticky.
- Categories as checkboxes (max 1 selected by default; multi via shift-click is `could` v2).
- Price range slider 100–4000 EGP.
- Duration dropdown `{30 min, 60 min, 90 min}`.
- Skill level `{Beginner, Intermediate, Advanced}` — derived from tier-code mapping.
- Language spoken.

#### Mobile
- "Filters" button bottom sheet.

#### RTL
- Sidebar on right; chips appear top-right.

#### Loading state
- Filter toggle → grid shimmer for ~150 ms while request resolves.

### Data Model
- Reads use existing tables. Skill level is derived from `tier_code` mapping:
  ```
  onboarding   → Beginner
  foundation   → Beginner
  performance  → Intermediate
  elite        → Advanced
  private      → Any
  ```

### API Endpoints
- Existing `GET /api/activities` extends to accept `minPrice`, `maxPrice`, `duration`, `level`, `spokenLang` query params.

### Security Considerations
- All params enumerated/typed; reject unknown params with 400 silently (ignore).
- ILIKE used for free text.

### Performance Requirements
- Filtered queries return in ≤ 300 ms p95.

### Notifications
None.

### Localization
- Filter labels internationalised.

### Error Handling
- Server 5xx → fall back to unfiltered grid with toast "Filters unavailable".

### Logging & Analytics
- `activities.filter.apply` per filter toggle.

### Testing Notes
#### Unit
- URL builder/parser.
- Query builder.

#### E2E
- Toggle each filter; assert grid changes.
- Clear all; assert default.

### Related User Stories
- US-AC-001.
- US-IN-009 (search infra).

### Dependencies
- Client-side navigation; `useSearchParams`.

### Tags
`activities` · `filter` · `search` · `i18n`

### Notes / Rationale
Filtering belongs server-side so URLs are shareable. Skill-level derivation avoids a separate column while staying aligned with tier codes.

---

## US-AC-004 — Pricing & Memberships page

### Story
As a visitor comparing price options,
I want a single page showing all session packages and all membership tiers with prices and benefits,
So that I can decide between pay-per-session, a prepaid package, or a monthly membership before booking.

### Priority: P0
### Status: Draft
### Estimate: 8 (story points)

### Actors
- **Primary actor:** Anonymous visitor at `/pricing`.
- **System actor:** `app/(public)/pricing/page.tsx`.

### Preconditions
1. At least one published `session_packages` row OR one published `membership_tiers` row exists.
2. ISR cache fresh (< 300 s).

### Postconditions
1. Page has two sections: Session packages grid, Membership tiers grid.
2. "Popular" badge on the `is_popular=true` membership tier.
3. Each package card shows: name, description, session count + bonus count, total price, "Buy package" CTA.
4. Each tier card shows: monthly price, included sessions, benefits bullets (locale), "Subscribe" CTA.

### Main Flow (Happy Path)
1. Visitor navigates to `/pricing` (header or footer).
2. Server fetches `session_packages_enabled` and `membership_tiers_enabled`.
3. Card grid for packages renders first, with 2-3 columns.
4. Card grid for memberships renders below with 3 columns.
5. Each CTA routes to `/booking?type=package&slug=[…]` or `?type=membership&slug=[…]`.

### Alternate Flows

#### A1 — Logged-in customer
- Tier/package "Subscribe" CTA directly triggers purchase flow if logged in.

### Exception Flows

#### E1 — No published packages or tiers
- Page renders empty state explaining session-only pricing is the current model.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Pricing & Memberships page

  Scenario: Page renders packages grid + membership grid
    Given one published session_packages and one published membership_tier
    When the visitor opens /pricing
    Then the page shows a Session Packages grid and a Membership Tiers grid

  Scenario: "Popular" badge renders on the highlighted tier
    Given a membership_tier with is_popular=true exists
    When the page renders
    Then that tier's card has a "Most Popular" badge

  Scenario: Buy Package CTA links to the booking flow with package pre-selected
    Given a session_package exists with slug="8-pack-1-free"
    When the visitor clicks "Buy package"
    Then the browser navigates to /booking?type=package&slug=8-pack-1-free

  Scenario: Subscribe CTA links to the booking flow with membership pre-selected
    Given a membership_tier with slug="silver-monthly"
    When the visitor clicks "Subscribe"
    Then the browser navigates to /booking?type=membership&slug=silver-monthly
```

### Edge Cases
1. Sessions included in package limited to certain activities → card shows "Valid for: Rowing, Kayaking".
2. Membership benefits bullets overflow → 5 max.
3. RTL — card grid reordered.

### UI/UX Specifications
- 2 columns for packages, 3 for memberships on desktop.
- Each card 280 px wide, 280 px tall, white bg, shadow 8 px.
- "Most Popular" badge is gold pill `#F5A623` background, white text 13 px.

### Data Model
- `session_packages`, `membership_tiers` as defined above.

### API Endpoints
- Server uses an RLS-enabled query.

### Security Considerations
- Public read only.

### Performance Requirements
- ISR 5 min.

### Notifications
None.

### Localization
- All copy jsonb.

### Error Handling
- Empty state.

### Logging & Analytics
- `pricing.view` per visit.
- `pricing.cta_click` — `{type, slug}`.

### Testing Notes
#### Unit
- Renderer under populated and empty.

#### E2E
- Click `Subscribe` → URL change.

### Related User Stories
- US-AC-005 (tier comparison block).
- US-BF-015 (package redemption at checkout).

### Dependencies
- `session_packages`, `membership_tiers` rows seeded.

### Tags
`pricing` · `memberships` · `packages` · `i18n`

### Notes / Rationale
Consolidating packages and memberships on one page lets a returning customer self-upgrade without admin hand-holding.

---

## US-AC-005 — Membership tier comparison block

### Story
As a visitor comparing membership tiers,
I want a comparison table of benefits side-by-side,
So that I can pick the tier delivering the best value.

### Priority: P2
### Status: Draft
### Estimate: 4 (story points)

### Actors
- **Primary actor:** Anonymous `/pricing` visitor.
- **System actor:** `<MembershipComparisonTable/>`.

### Preconditions
1. At least 2 enabled `membership_tiers` exist.

### Postconditions
1. A comparison table renders below the membership cards.
2. Row labels internationalised; cells filled with check / cross / numeric value.

### Main Flow (Happy Path)
1. Server passes tiers + benefit labels.
2. Renderer constructs matrix: rows = benefit labels, columns = tiers.
3. Cell content derived from `benefits jsonb`: if included, `check`; if numeric, the number; otherwise `cross`.
4. Clicking a column header scrolls to top tier card and triggers the "Subscribe" CTA hover.

### Alternate Flows

#### A1 — Single tier exists
- Comparison table not rendered (degenerate).

### Exception Flows

#### E1 — Missing translations
- Bring benefit strings through localefalls back to English key.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Membership tier comparison block

  Scenario: Two or more tiers render comparison table
    Given two published membership_tiers exist
    When the pricing page renders
    Then a comparison table appears below the membership cards
      And each benefit row shows the tier membership's benefit values

  Scenario: Single tier suppresses comparison table
    Given one published membership_tier exists
    When the pricing page renders
    Then no comparison table is shown
```

### Edge Cases
1. Excel-like sticky first column for mobile widths < 480 px.
2. RTL flips column order.

### UI/UX Specifications
- Sticky first column on mobile.
- Checkmarks green `#1BB80C`, crosses grey `#9CA3AF`.

### Data Model
Same as US-AC-004.

### API Endpoints
Same.

### Security Considerations
None new.

### Performance Requirements
Lazy-rendered below fold.

### Notifications
None.

### Localization
Benefit items are localised per benefit row.

### Error Handling
Empty → suppress.

### Logging & Analytics
`pricing.comparison_view`.

### Testing Notes
Unit, integration as per File 01.

### Related User Stories
US-AC-004.

### Dependencies
`membership_tiers.benefits` structured jsonb.

### Tags
`pricing` · `memberships` · `comparison` · `i18n`

### Notes / Rationale
Self-evident tier comparison lifts membership conversion.

---

## US-AC-006 — Activity reviews display (post-moderation, with rating summary)

### Story
As a visitor browsing an activity,
I want to see an average star rating, the count of ratings, and 6 sample approved reviews with their author first name and avatar,
So that I can trust the activity's quality through verified customer feedback.

### Priority: P1
### Status: Draft
### Estimate: 8 (story points)

### Actors
- **Primary actor:** Anonymous visitor on `/activities/[slug]`.
- **Backend:** `reviews` table.
- **Admin actor:** Moderation pipeline (US-AB-013).

### Preconditions
1. At least one approved review for the activity.

### Postconditions
1. Activity detail page shows summary: average rating (1 decimal), count of approved reviews, 5-star bar chart (count per rating level).
2. 6 most recent approved reviews render in the Reviews tab.
3. Each review shows: author first name + initial of last, rating, date, locale tag, body.
4. "Load more" pagination fetches the next 12.
5. Only reviews tied to a real booking are shown (no anonymous submissions).

### Main Flow (Happy Path)
1. Server component runs:

   ```sql
   with summary as (
     select count(*)::int as count, avg(rating)::numeric(2,1) as avg
       from reviews where activity_id = $1 and status='approved'
   )
   select r.id, r.rating, r.body, r.locale, r.created_at,
          p.full_name, p.avatar_url
     from reviews r
     join auth.users u on r.user_id = u.id
     join profiles p on p.user_id = u.id
     where r.activity_id = $1 and r.status='approved'
     order by r.created_at desc
     limit 12;
   ```

2. Summary card renders with stars and bar chart.
3. Reviews list renders under reviews tab.
4. Load more button triggers fetch of next 12 from `/api/activities/[slug]/reviews?cursor=...`.

### Alternate Flows

#### A1 — Zero approved reviews yet
- "Be the first to review" CTA prompting the visitor to book (US-CA-014).

### Exception Flows

#### E1 — Author profile missing
- Use placeholder "Verified customer" + first initial.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Activity reviews display

  Scenario: Summary shows average rating and total count
    Given activity has 12 approved reviews averaging 4.6
    When the page renders
    Then the summary shows "4.6 ★ (12 ratings)"

  Scenario: 5-star bar chart shows distribution
    Given counts per star are 5:8, 4:3, 3:1, 2:0, 1:0
    Then a horizontal bar chart shows that distribution

  Scenario: Load more pulls the next 12 reviews
    Given the reviews list shows 12 reviews and "Load more"
    When the visitor clicks Load more
    Then 12 additional reviews render below

  Scenario: Zero reviews renders empty CTA
    Given zero approved reviews for the activity
    When the page renders
    Then the reviews tab shows a "Be the first to review" CTA
```

### Edge Cases
1. Review body empty (rating only) — body not rendered, only stars.
2. Author name has unicode Arabic — apply right font.
3. Reviews count for activity id changes mid-session — revalidate ISR every 60 s.

### UI/UX Specifications
- Summary card 320 px tall with average + bar chart + total count.
- Each review card: 16 px font, max 4 lines, gradient fade.
- Load more as a text link rather than button.

### Data Model
- See `reviews`, `profiles`, `bookings` scripts.
- New view `activity_rating_summary`:

```sql
create or replace view activity_rating_summary as
  select activity_id,
         count(*)::int as count,
         avg(rating)::numeric(2,1) as avg,
         count(*) filter (where rating=5)::int as rating5,
         count(*) filter (where rating=4)::int as rating4,
         count(*) filter (where rating=3)::int as rating3,
         count(*) filter (where rating=2)::int as rating2,
         count(*) filter (where rating=1)::int as rating1
    from reviews where status='approved'
    group by activity_id;
```

### API Endpoints
- `GET /api/activities/[slug]/reviews?cursor=…` returns next batch.
- Supabase RPC: `paginated_reviews(activity_slug, cursor, limit)`.

### Security Considerations
- Reviews are server-aggregated; bodies are rendered safely with strict escape.
- Author name transformed to first name + last initial to preserve privacy.

### Performance Requirements
- Initial reviews (< 12) embedded in SSR HTML.
- Average calculation cached in the `activity_rating_summary` materialised view refreshed every 5 min.

### Notifications
None — submission flows from US-CA-014.

### Localization
- Locale tag visible (e.g., "Arabic review" EN pill or "تقييم بالعربية" AR pill).
- Date formatted via locale-aware `Intl.DateTimeFormat`.

### Error Handling
- Empty list → CTA.
- 4xx on load more → toast "Couldn't load more reviews. Please refresh."

### Logging & Analytics
- `reviews.list.visible`.
- `reviews.load_more.click`.
- `reviews.load_more.result_count`.

### Testing Notes
#### Unit
- Star bar chart proportions maths.
- Author name obfuscation.

#### Integration
- 0 reviews vs many.

#### E2E
- Click "Load more" → assert 24 total rendered.

### Related User Stories
- US-CA-014 (customer writes a review).
- US-AB-013 (admin moderates).
- US-AC-002 (reviews tab in detail page).

### Dependencies
- `reviews` table linked to `bookings` (unique constraint).

### Tags
`reviews` · `social-proof` · `i18n` · `privacy`

### Notes / Rationale
Linking reviews to bookings (no anonymous submissions) is the safeguard that defeats fake reviews and lets the brand site become a verified customer experience.

---

## US-AC-007 — Gallery page (photos + videos)

### Story
As a prospective customer wanting to feel the AquaLudo vibe,
I want a gallery page that mixes photos and short videos (Instagram-like),
So that I can see real moments on the Nile and feel the community before booking.

### Priority: P2
### Status: Draft
### Estimate: 6 (story points)

### Actors
- **Primary actor:** Anonymous visitor at `/gallery`.
- **System actor:** `app/(public)/gallery/page.tsx` and `<GalleryMasonry/>`.

### Preconditions
1. At least one `gallery_items` row with `status='published'`.

### Postconditions
1. Masonry layout shows photos and videos.
2. Each item is a tappable tile; click opens a lightbox.
3. Filter chips allow photo-only / video-only / by tag.

### Main Flow (Happy Path)
1. Server queries `gallery_items` enabled published.
2. Masonry rendered lazily; intersection observer loads more.
3. Tap → lightbox with prev/next arrows.

### Alternate Flows

#### A1 — Filter applied
- `?type=video` URL filter.

### Exception Flows

#### E1 — Item URL fails
- Tile placeholder with retry link.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Gallery page

  Scenario: Masonry displays items
    Given at least 12 published gallery items
    When visitor opens /gallery
    Then a masonry of those items renders

  Scenario: Filter photo-only
    Given visitor clicks "Photos only"
    Then the URL becomes /gallery?type=photo
      And only photo items are shown

  Scenario: Lightbox opens on tile click
    Given visitor clicks a tile
    Then a lightbox mounts with the item displayed full-size
      And prev/next arrows appear

  Scenario: Lightbox opens with keyboard navigation
    Given the lightbox is open
    When the visitor presses ArrowRight
    Then the next item is displayed
```

### Edge Cases
1. Portrait vs landscape → masonry preserves aspect.
2. RTL — tiles flow right-to-left.
3. Lightbox Esc to close.
4. Video autoplay muted in lightbox.

### UI/UX Specifications
- Masonry 3 cols desktop, 2 on tablet, 1 on mobile.
- Tiles 12 px gap.
- Hover scale 1.02.
- Lightbox backdrop `rgba(0,0,0,0.86)`.

### Data Model
- `gallery_items` table (defined above).

### API Endpoints
- `/api/gallery?page=…&type=…`.

### Security Considerations
- URLs validated against CDN origin.

### Performance Requirements
- Lazy-load via `IntersectionObserver` 12 items at a time.

### Notifications
None.

### Localization
- Title/description locale-segmented.

### Error Handling
- Tile error → placeholder.

### Logging & Analytics
- `gallery.view`.
- `gallery.tile_click`, `gallery.lightbox_open`, `gallery.filter_toggle`.

### Testing Notes
#### Unit
- Filter URL builder.

#### E2E
- Open gallery; click tile; assert lightbox.

### Related User Stories
- US-AB-010 (admin uploads gallery).
- US-LD-011 (about page CTA to gallery).

### Dependencies
- `gallery_items` seeded.

### Tags
`gallery` · `masonry` · `lightbox` · `i18n`

### Notes / Rationale
A real photo flow matters: Egyptian customers buy on trust.

---

## US-AC-008 — Coach public profile page (with personal session booking)

### Story
As a visitor interested in a particular coach (perhaps seen on Instagram or in an event),
I want a coach profile page showing their bio, photo, specialties, languages, certifications, Instagram handle, and a schedule preview with their upcoming bookable sessions,
So that I can decide to book a private session with them.

### Priority: P1
### Status: Draft
### Estimate: 8 (story points)

### Actors
- **Primary actor:** Anonymous visitor at `/coaches/[slug]`.
- **System actor:** `app/(public)/coaches/[slug]/page.tsx`.

### Preconditions
1. `coaches.slug` row exists with `status='published'`.

### Postconditions
1. Profile page renders: avatar, full name, "Book with [name]" CTA, bio, specialties chips, certifications list, languages flags, Instagram handle link, schedule preview (next 7 days with available slots).

### Main Flow (Happy Path)
1. Server fetches coach + their activities (via `activity_coaches`) + their next-bookable-slot preview via `coach_next_slots(coach_id)`.
2. Profile layout: hero (avatar + name + specialty pills) + main + rail with certification + Instagram.
3. Schedule preview listed as horizontal scroll of date pills; selecting a date shows time slots.
4. "Book with [name]" CTA routes to `/booking?coach=[slug]&tier=private` — pre-selecting that coach for a private session.

### Alternate Flows

#### A1 — Coach has no upcoming availability
- Schedule preview shows "Contact for availability" with WhatsApp deep link.

#### A2 — Coach has no Instagram
- Instagram section hidden.

### Exception Flows

#### E1 — Coach not found
- 404 page.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Coach public profile page

  Scenario: Coach profile page shows biography + certifications + Instagram
    Given coach "ahmed-z" exists with status='published'
    When the visitor opens /coaches/ahmed-z
    Then the page renders biography, specialties, certifications, languages, Instagram link
      And "Book with Ahmed" CTA is present

  Scenario: Clicking "Book with [name]" routes to booking with coach + private tier
    Given the visitor clicks "Book with Ahmed"
    Then the browser navigates to /booking?coach=ahmed-z&tier=private

  Scenario: Schedule preview lists next 7 days with available slots
    Given coach has 3 published slot templates this week
    Then a horizontal date pill list appears with the available days
      And tapping a date shows time slots
      And tapping a slot routes to /booking?coach=ahmed-z&slot=...

  Scenario: No upcoming availability shows WhatsApp CTA
    Given coach has zero upcoming slots
    Then the schedule preview shows "Contact for availability" with a WhatsApp deep link prefilled with the coach name
```

### Edge Cases
1. Coach speaks multiple languages — render flag icons.
2. Coach specialties overlap multiple activities — all chips rendered.
3. Coach logged-in editable session revoked via admin (US-AB-011) — page falls back to 410/404.

### UI/UX Specifications
- Hero 480 px tall with avatar 240 px round.
- Specialties rendered as pills with activity names.
- Certifications list with issuer + year.
- Instagram row icon-anchored.
- Schedule preview module 4-week carousel.

### Data Model
- `coaches`, `activity_coaches`, `coach_slot_templates` (US-AB-011 creates), `coach_next_slots` view.

```
coach_slot_templates
  id            uuid pk
  coach_id      uuid fk coaches.id on delete cascade
  activity_id   uuid fk activities.id
  start_time    time not null
  end_time      time not null
  day_of_week   int check (day_of_week between 0 and 6)
  capacity      int default 1
  enabled       boolean default true

coach_next_slots
  -- view defined: union of slots generated from templates over the next 14 days,
  -- minus those whose slot_id has reached capacity via bookings
```

### API Endpoints
- `coach_next_slots(coach_id)` RPC.
- `/api/coaches/[slug]/slots?from=…&to=…`.

### Security Considerations
- Public RLS over published coaches only.
- Coach contact details (email/phone) NOT exposed on public profile; booking is the communication channel.

### Performance Requirements
- ISR caching at 600 s.

### Notifications
None.

### Localization
- Bio, certifications, languages all locale-aware.

### Error Handling
- Empty coach or archived → 410 Gone, redirect to `/coaches`.

### Logging & Analytics
- `coach_profile.view` `{coach_id}`.
- `coach_profile.book_click`.
- `coach_profile.instagram_click`.

### Testing Notes
#### Unit
- Schedule preview component.

#### E2E
- Book private session with coach.

### Related User Stories
- US-AB-011 (admin coach management).
- US-CO-008 (coach edits their profile).
- US-BF-013 (booking with coach preference).

### Dependencies
- `coaches`, `coach_slot_templates` tables.

### Tags
`coaches` · `booking` · `private` · `isr` · `i18n`

### Notes / Rationale
Coach profiles turn the academy into a community, not just a service. Direct booking from the profile gives the customer continuity ("I want to be with Salma again").

---

## US-AC-009 — Events marketing page (/events/[slug])

### Story
As a visitor interested in a special event like the Run & Row Challenge,
I want a marketing page that describes the event, its date, location, pricing tiers, and a "Sign up" CTA,
So that I can commit and reserve a place.

### Priority: P1
### Status: Draft
### Estimate: 5 (story points)

### Actors
- **Primary actor:** Anonymous visitor.
- **System actor:** `app/(public)/events/[slug]/page.tsx`.

### Preconditions
1. `events.slug = '[slug]'` exists with `status='published'`.

### Postconditions
1. Page shows hero, date, time, location, description, optional tier list with capacity countdown, and "Sign up" CTA routing to the normal booking flow with event context.

### Main Flow (Happy Path)
1. Server fetches `events` row + tiers (`events` table flexible; tier list stored in `pricing_notes jsonb`).
2. Hero renders event image (fallback gradient) + name + date.
3. Body shows description (locale).
4. Pricing tier rows render where admin has stored them.
5. "Sign up" CTA → `/booking?event=[slug]`.

### Alternate Flows

#### A1 — Event capacity reached
- CTA disabled; "Fully booked — join waitlist" alt CTA.

### Exception Flows

#### E1 — Event in past
- Render event page with banner "This event has ended" and link to next upcoming event.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Event marketing page

  Scenario: Default event page shows all sections
    Given an event "run-and-row-2026" is published
    When visitor opens /events/run-and-row-2026
    Then hero, description, date/location, pricing tiers, and Sign up CTA render

  Scenario: Sign up routes to booking with event context
    Given visitor clicks "Sign up"
    Then browser navigates to /booking?event=run-and-row-2026

  Scenario: Full event shows waitlist CTA
    Given event capacity all booked
    When page renders
    Then "Sign up" is replaced with "Join waitlist" linking to /booking?event=run-and-row-2026&waitlist=1
```

### Edge Cases
1. Multi-tier events with capacity counters.
2. RTL mirroring.
3. Past events displayed in archive.

### UI/UX Specifications
- Hero full-bleed 60 vh.
- Date in big 36 px Inter 700.
- Tiers listed in horizontal cards.
- "Sign up" full-width.

### Data Model
- `events` table (see architectural context).

### API Endpoints
- Server component RLS.

### Security Considerations
- RLS-published.

### Performance Requirements
- ISR 300 s.

### Notifications
None.

### Localization
- All copy locale-segmented jsonb.

### Error Handling
- Past event flagged but not 404.

### Logging & Analytics
- `events.view`.
- `events.signup_click`.

### Testing Notes
#### E2E
- Open event; click Sign up; assert redirect.

### Related User Stories
- US-AB-012 (admin manages events).

### Dependencies
- Events seeded.

### Tags
`events` · `marketing` · `i18n` · `isr`

### Notes / Rationale
Events are marketing pages leading to the standard booking flow, NOT a separate RSVP system (per interview decision).

---

## US-AC-010 — Activity related & cross-sell section

### Story
As a visitor on an activity detail page,
I want a "You might also like" section showing 2-4 related activities,
So that I can discover other things to try.

### Priority: P2
### Status: Draft
### Estimate: 4 (story points)

### Actors
- **Primary actor:** Visitor on `/activities/[slug]`.
- **System actor:** `<RelatedActivities/>`.

### Preconditions
At least one other published activity shares the same category or has been admin-tagged.

### Postconditions
2-4 cards rendered.

### Main Flow (Happy Path)
1. Server picks: same `category_id`, exclude current id; fallback to other categories if < 2.
2. Render card grid horizontally.

### Alternate Flows

#### A1 — Admin-pinned related activities
- `activity_related` table overrides default picks.
```
activity_related
  activity_id uuid
  related_id  uuid
  display_order int
  primary key (activity_id, related_id)
```

### Exception Flows

#### E1 — No similar found
- Section hidden.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Related activities section

  Scenario: 4 related cards render
    Given the current activity has at least 4 other groupmates
    Then a "You might also like" row renders with 4 cards

  Scenario: Admin pinned cards take precedence
    Given admin pinned 3 relations for activity X
    Then up to 3 pinned cards render first
      And the 4th is auto-filled from same category

  Scenario: No related activities hides the section
    Given no similar candidate exists
    Then the section is omitted
```

### Edge Cases
- Tied order pinned排在 alphabetical.

### UI/UX Specifications
- Horizontal scroll on mobile, 4-col on desktop.

### Data Model
- `activity_related` join table as above.

### API Endpoints
None.

### Security Considerations
- Read-only RLS.

### Performance Requirements
- Lazy-hydrate.

### Notifications
None.

### Localization
- Section heading locale-aware.

### Error Handling
None new.

### Logging & Analytics
- `related.card_click` `{to_activity_id}`.

### Testing Notes
#### Unit
- Related resolver.

#### E2E
- Click related → navigate.

### Related User Stories
- US-AC-002.
- US-AB-003 (admin can pin related).

### Dependencies
- `activity_related` table (new).

### Tags
`cross-sell` · `activities` · `i18n`

### Notes / Rationale
Increases average pages-per-session and conversion by surfacing adjacent activities.

---

## US-AC-011 — Activity SEO + structured data (schema.org SportsActivityLocation)

### Story
As a content bot indexing AquaLudo's site,
I want each activity page to ship schema.org structured data for `SportsActivityLocation` and `Offer`,
So that I can render the activity's price and rating directly in Google search results.

### Priority: P1
### Status: Draft
### Estimate: 4 (story points)

### Actors
- **System actor:** Next.js `generateMetadata` + JSON-LD injected into the activity detail page.

### Preconditions
1. Activity detail page renders.

### Postconditions
1. JSON-LD script tag at `/activities/[slug]` includes `SportsActivityLocation` with name, description, image, address, geo coordinates, `aggregateRating`, `Offer` for at least the cheapest pricing tier.

### Main Flow (Happy Path)
1. Server computes JSON-LD tree.
2. Injects `<script type="application/ld+json">` into HTML head.
3. `generateMetadata` populates Open Graph + Twitter card tags.
4. Sitemap.xml includes the activity route with lastmod.

### Alternate Flows

#### A1 — No approved reviews
- `aggregateRating` omitted.

### Exception Flows

#### E1 — Geo coords missing
- Use business geo fallback.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Activity SEO

  Scenario: JSON-LD ships on activity detail page
    Given visitor opens /activities/rowing
    Then the page HTML head contains a script type="application/ld+json" with @type="SportsActivityLocation"
      And it contains aggregateRating when at least one approved review exists
      And it contains an Offer for at least one pricing tier

  Scenario: Sitemap lists all activities
    Given there are 5 published activities
    When /sitemap.xml is requested
    Then it includes URLs for /activities/rowing, /activities/kayaking, ..., each with lastmod

  Scenario: Open Graph tags include hero image
    Given visitor opens /activities/rowing
    Then the HTML head's og:image meta tag points to the activity hero image CDN URL
```

### Edge Cases
1. Multi-tier offers — emit one `Offer` per tier.
2. Arabic locale — JSON-LD stays English locale for SEO consistency; arabic still rendered in body.

### UI/UX Specifications
None (machine-readable only).

### Data Model
- Re-uses `activities`, `categories`, `reviews`.

### API Endpoints
- `/sitemap.xml` route generated at build + ISR with 3600 s revalidate.

### Security Considerations
- No user PII in JSON-LD.

### Performance Requirements
- JSON-LD rendered serverside; < 4 KB per page.

### Notifications
None.

### Localization
- JSON-LD remains in `en`; site copy is locale-aware.

### Error Handling
- JSON-LD malformed → caught by JSON-LD validator linter in CI.

### Logging & Analytics
- `seo.jsonld_view` once per page view (server log).

### Testing Notes
#### Unit
- JSON-LD generator snapshot.

#### E2E
- Use `@google/structured-data-testing-tool` to validate.

### Related User Stories
- US-AC-002.
- US-IN-014 (deployment).

### Dependencies
- `next-sitemap` or custom sitemap.

### Tags
`seo` · `json-ld` · `structured-data` · `sitemap`

### Notes / Rationale
The current Wix site has no schema (per `about.md`). Adding JSON-LD is the highest-leverage SEO move for local Cairo discovery in Google Search + Google Maps.

---

## US-AC-012 — Social sharing buttons (WhatsApp / Facebook / X / Instagram cross-share)

### Story
As a visitor who enjoyed engaging with AquaLudo,
I want share buttons on activity and event pages so I can instantly forward to friends via WhatsApp,
So that I can drive word-of-mouth referrals.

### Priority: P2
### Status: Draft
### Estimate: 3 (story points)

### Actors
- **Primary actor:** Visitor on activity or event page.
- **System actor:** `<ShareButtons/>`.

### Preconditions
- Page exists.

### Postconditions
1. Share buttons render: WhatsApp (primary for Egypt), Facebook, X, copy-link.
2. Clicking opens the platform's share intent in a new tab.
3. Copy-link copies canonical URL.

### Main Flow (Happy Path)
1. Component receives `title`, `url`.
2. Renders WhatsApp button with `https://wa.me/?text=<title> <url>` (URL-encoded).
3._FB / X / copy-link accordingly.
4. Telemetry `share.click` per platform.

### Alternate Flows

#### A1 — Page is loaded on `/events/[slug]`
- Title prefix "AquaLudo event —".

### Exception Flows

#### E1 — `navigator.share` available (mobile)
- Replace buttons with a single "Share…" button calling the native share sheet.

### Acceptance Criteria (Gherkin)

```gherkin
Feature: Share buttons

  Scenario: WhatsApp share opens wa.me web intent
    Given visitor clicks the WhatsApp share icon
    Then a new tab opens https://wa.me/?text=<encoded title and url>

  Scenario: Copy link button copies canonical URL
    Given visitor clicks the Copy link button
    Then navigator.clipboard.writeText is invoked with the canonical URL
      And a "Copied!" toast is shown

  Scenario: Web Share API preempts buttons on mobile
    Given the browser supports navigator.share
    Then a single "Share…" button appears in place of the four buttons
      And clicking invokes the native share sheet
```

### Edge Cases
1. `navigator.clipboard` blocked → fallback textarea + select-all.

### UI/UX Specifications
- Buttons 32 × 32 px circle icons on desktop.
- Mobile: a "Share" button row at the bottom of the article body.

### Data Model
None new.

### API Endpoints
None.

### Security Considerations
- URLs validated to start with the site origin.

### Performance Requirements
- Tiny bundle 3 KB.

### Notifications
None.

### Localization
- `Share` labels.

### Error Handling
- Clipboard error fallback.

### Logging & Analytics
- `share.click` `{platform}`.

### Testing Notes
#### E2E
- Click each button; assert intent URL pattern.

### Related User Stories
- US-AC-002.
- US-AC-009.

### Dependencies
None.

### Tags
`share` · `social` · `whatsapp`

### Notes / Rationale
WhatsApp is the dominant Egyptian share channel — make it first and most prominent.

---

## End of File 02

This file documents user stories for the public-facing activities and pricing catalog used by AquaLudo v2. The next file (`03-booking-flow.md`) defines the user stories for the conversion-critical booking funnel that consumes these activities.