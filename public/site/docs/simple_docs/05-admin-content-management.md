# 05. Admin Content Management

## Goal
Give the academy owner a simple password-protected admin page where they can add, edit, and remove the activities offered on the site, update prices, and change the weekly schedule. No roles, no approval flows, no SEO tools, no audit log viewer — just the minimum CRUD needed to keep the public site accurate.

## User Stories (MVP)
- As the owner, I want to log in to `/admin` with a single shared password, so that only I can change site content.
- As the owner, I want to add, edit, and archive activities (Rowing, Kayaking, SUP, Wakeboard, Fitness) with an English title, short description, image, and base price, so that the public catalog stays in sync with what we actually offer.
- As the owner, I want to update the per-session price for each activity and turn it on or off for the season, so that customers always see the current rate.
- As the owner, I want to set the weekly schedule (which days and time slots each activity runs, with a simple capacity number per slot), so that customers see real bookable times.
- As the owner, I want to log out, so that no one else on a shared device can edit the site.

## Out of Scope (for MVP)
- Multiple admin accounts, roles, and permissions (one shared password only).
- Two-factor authentication and WhatsApp OTP.
- Arabic content editing in the admin (Arabic copy is seeded once, not edited).
- Slug rename with 301 redirects, version history, scheduled publishing, approval workflows.
- Image cropping, alt-text enforcement, gallery limits beyond a single hero image.
- SEO fields, sitemaps, meta descriptions.
- Coach records, slot templates, events, promo banners, CMS blocks, business profile editor.
- Add-ons, session packages, membership tiers.
- Reviews moderation queue and audit log viewer.
- Audit log of changes, revalidation hooks, multi-image gallery upload.
