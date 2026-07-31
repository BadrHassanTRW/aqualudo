# 01. Loading and Public Discovery

## Goal
Give first-time visitors a quick, branded first impression and let anyone find what AquaLudo offers and how to reach us, without auth, without dashboards, and without heavy assets.

## User Stories (MVP)
- As a first-time visitor, I want a short water-themed loading animation to play once when I open the site, so that I immediately feel the brand before reading any copy.
- As a returning visitor in the same browser session, I want the loading animation to be skipped, so that I get straight to the content.
- As any visitor, I want a clear home page with the academy name, what we offer, and a primary "Book Now" call-to-action, so that I know what to do next.
- As any visitor, I want a short About page explaining who AquaLudo is and what activities we run (Rowing, Kayaking, SUP, Wakeboarding, Fitness), so that I can trust the academy before booking.
- As any visitor, I want a Contact page with the address, phone, WhatsApp link, and a simple embedded map, so that I can reach the academy easily.
- As any visitor, I want a site header with navigation and a footer with basic info, so that I can move around the site and find social/contact links on every page.

## Out of Scope (for MVP)
- Cinematic video / WebGL loading animation (use a simple CSS water-themed splash or a static image)
- Language toggle (EN/AR) and full RTL support
- 404 and 500 error pages (use Next.js defaults)
- Quick search overlay (Cmd+K)
- Testimonials carousel
- Animated impact metrics / counters
- Telemetry, analytics events, and A/B testing
- Reduce-motion, save-data, and low-end device detection paths
- Admin-editable CMS content (hero copy, promo banner) — write hardcoded copy for now
- ISR, on-demand revalidation, and CDN asset variants
- Accessibility-specific announces beyond basic alt text and semantic HTML
