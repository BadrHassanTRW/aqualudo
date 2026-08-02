# Task 03. Booking Flow

## Goal
Implement the MVP booking request flow: visitors pick an upcoming session, submit their contact details, and the request lands as `pending` in the database. An admin reviews pending requests in a protected page and marks them `confirmed` (then messages the customer via WhatsApp) or `cancelled`. No payments, no auth for visitors, no live availability.

## Steps
1. **Database schema (sessions + booking_requests)** — Create a Supabase migration with two tables: `sessions(id, activity_id, starts_at, duration_min, status enum['scheduled','cancelled'])` and `booking_requests(id, session_id FK, name text, phone_e164 text, notes text nullable, status enum['pending','confirmed','cancelled'], created_at timestamptz default now(), decided_at timestamptz nullable)`. Files: `supabase/migrations/0001_booking.sql`, `lib/supabase.ts` (server client). Notes: `phone_e164` stores `+20...` format; add an index on `booking_requests(status, created_at desc)`.

2. **Public booking page (session list)** — Server-rendered page at `app/booking/page.tsx` that queries `sessions` where `status='scheduled'` and `starts_at > now()`, joins `activities` for title/price, and renders them as a vertical list (date, time, activity name, price in EGP). Files: `app/booking/page.tsx`, `components/booking/SessionList.tsx`. Notes: empty state ("No upcoming sessions, contact us on WhatsApp") when none returned.

3. **Booking request form + POST API** — Client component with fields: `session_id` (hidden or radio per session), `name` (required, text), `phone` (required, text, placeholder `+20...`), `notes` (optional, textarea). POSTs JSON to `app/api/booking-requests/route.ts` which inserts a row with `status='pending'`. Files: `components/booking/RequestForm.tsx`, `app/api/booking-requests/route.ts`.

4. **Server-side validation and rate guard** — In the POST route: require `session_id` that exists and is `scheduled` with `starts_at > now()`; require `name` 1-80 chars; require `phone` matching a basic E.164 regex (`^\+[1-9]\d{7,14}$`); cap `notes` at 500 chars. Return `400` with field-level error messages. Files: `app/api/booking-requests/route.ts`, `lib/validation.ts`.

5. **Confirmation screen** — On successful POST, navigate to `app/booking/thank-you/page.tsx` (or render an in-page success state) showing "Request received — we'll contact you on WhatsApp" plus a summary (activity, date, name). Disable the submit button while in-flight; on error, show the field error inline and keep the user's input. Files: `app/booking/thank-you/page.tsx`, `components/booking/RequestForm.tsx`.

6. **Admin bookings list page** — Protected page at `app/admin/bookings/page.tsx` listing `booking_requests` joined with `sessions` and `activities`, ordered by `status='pending' first, then created_at desc`. Columns: created_at, name, phone, activity, session date/time, notes, status badge, action buttons. Files: `app/admin/bookings/page.tsx`, `components/admin/BookingRow.tsx`, `middleware.ts` (admin auth gate).

7. **Admin confirm/cancel actions + WhatsApp link** — Two server actions or `PATCH /api/admin/bookings/[id]` that set `status='confirmed'|'cancelled'` and `decided_at=now()`. Each row also shows a "WhatsApp" link using `https://wa.me/<digits>?text=...` with a localized message template referencing the activity and date. Admin auth: a shared `ADMIN_TOKEN` env var checked via a signed cookie set on a simple `/admin/login` page. Files: `app/api/admin/bookings/[id]/route.ts`, `lib/whatsapp.ts`, `app/admin/login/page.tsx`.

## Acceptance Criteria
- [ ] Visiting `/booking` shows a list of upcoming sessions fetched from Supabase, sorted by `starts_at` ascending; sessions whose `starts_at` is in the past are not shown.
- [ ] Submitting the form with name, phone (`+201234567890`), and a selected session creates a `booking_requests` row with `status='pending'` and the user sees the thank-you screen.
- [ ] Submitting with an empty name, an empty phone, or a phone that does not match E.164 shows an inline error and does NOT create a row.
- [ ] Reloading `/admin/bookings` after a submission shows the new request in the Pending list with the customer's name, phone, and chosen session.
- [ ] Clicking "Confirm" on a pending request updates its status to `confirmed`, sets `decided_at`, and the row moves out of the Pending list.
- [ ] Clicking "Cancel" on a request updates its status to `cancelled` and removes it from the Pending list.
- [ ] The "WhatsApp" link on each row opens `wa.me` in a new tab with a pre-filled message that includes the customer's first name, the activity, and the session date.
- [ ] Visiting `/admin/bookings` without the admin cookie redirects to `/admin/login`; submitting the correct `ADMIN_TOKEN` sets the cookie and grants access.
