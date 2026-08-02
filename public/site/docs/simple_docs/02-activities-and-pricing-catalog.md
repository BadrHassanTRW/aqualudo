# 02. Activities & Pricing Catalog

## Goal
Show visitors the activities AquaLudo offers (Rowing, Kayaking, SUP, Wakeboarding, Fitness), let them see what each activity includes with its prices, and list session packages and memberships. Pricing is hard-coded in a simple content file (or basic CMS) for the MVP — no admin UI, no complex filters, no comparison tables.

## User Stories (MVP)
- As a visitor, I want to see a grid of all activities with an image, name, short description, and starting price, so that I can quickly pick one that interests me.
- As a visitor, I want to click an activity and see a detail page with a hero image, longer description, what's included, what to bring, and the available pricing tiers (e.g. Rowing Foundation 200 EGP/hr, Rowing Private 400 EGP/hr), so that I can decide whether to book it.
- As a visitor, I want a clear "Book now" button on both the listing card and the detail page that takes me to the booking flow with the activity pre-selected, so that I don't have to re-pick it.
- As a visitor, I want a `/pricing` page that shows session packages (e.g. 8 sessions + 1 free) and monthly membership tiers with their price and a short list of benefits, so that I can decide between pay-per-session, a package, or a membership.
- As a visitor, I want the activity detail page to show approved customer reviews (star rating + short text + first name) under a "Reviews" section, so that I trust the activity before booking.
- As a visitor, I want every catalog page to work well on mobile and load fast, so that I can browse from my phone on the way to the Nile.

## Out of Scope (for MVP)
- Search box and filter sidebar (price range, duration, skill level, language)
- Category filter chips
- Membership tier comparison table
- Wishlist / favorites
- Related activities / cross-sell section
- Coach public profile pages (handled in a later story)
- Gallery / lightbox
- Events marketing pages
- SEO structured data (schema.org)
- Social sharing buttons (WhatsApp / Facebook / X)
- Slug rename redirects
- Multi-language (jsonb locale fields) — English only for MVP
- Complex review moderation flow — reviews entered by admin directly
- Telemetry / analytics events
- ISR caching logic — simple SSR is fine
- Login-gated catalog features
