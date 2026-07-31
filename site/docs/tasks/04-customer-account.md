# Task 04. Customer Account

## Goal
Provide a minimal customer area where a visitor signs in with a one-time code sent to their email (or a phone lookup fallback), then views their upcoming and past bookings, can cancel an upcoming session outside the 24-hour window, and sees the basic contact profile the academy holds. No passwords, no OAuth, no profile editing, no analytics.

## Steps
1. **Add a `customers` table and lookup helpers in Supabase** — Create a `customers` table keyed by email (unique) with `full_name`, `phone`, `created_at`, and write small server helpers in `lib/customers.ts` (`findCustomerByEmail`, `findCustomerByPhone`, `findOrCreateByEmail`) that the auth route and profile page will share. Notes: phone is nullable and not unique since the MVP may fall back to phone lookup only when email is missing on the booking record.

2. **Build the sign-in page with a one-time email code** — In `app/account/sign-in/page.tsx` render a single-field form (email) that posts to a Next.js Route Handler at `app/api/auth/request-code/route.ts`; the handler generates a 6-digit code, stores `{email, code, expires_at}` in a short-lived `auth_codes` table (TTL 10 min), and emails it via the Resend helper in `lib/email.ts`. A second handler `app/api/auth/verify-code/route.ts` checks the code, sets a signed, HTTP-only `account_session` cookie containing the `customer_id` (7-day expiry), and redirects to `/account`. Notes: no password, no WhatsApp, no remember-me — exactly the MVP story.

3. **Create the `/account` dashboard with Upcoming and Past tabs** — In `app/account/page.tsx` read `customer_id` from the cookie, redirect to `/account/sign-in` if missing, and fetch bookings from Supabase via a helper in `lib/bookings.ts` (`getBookingsForCustomer`). Render two client-side tabs (`components/account/UpcomingList.tsx`, `components/account/PastList.tsx`) showing date, time, activity name, and coach name. A canceled booking is filtered out of Upcoming; no separate Cancelled tab.

4. **Implement cancellation with the 24-hour guard** — Add `cancelBooking(bookingId, customerId)` in `lib/bookings.ts` that refuses the operation when the session start is within 24 hours (returns a typed error `TOO_LATE`) and otherwise updates `bookings.status` to `cancelled` and writes a `cancellations` audit row. Wire it to a `Cancel` button on each Upcoming card via a Route Handler `app/api/bookings/[id]/cancel/route.ts` and a small `components/account/CancelButton.tsx` that handles loading, success, and the `TOO_LATE` error message inline.

5. **Add the profile view page** — In `app/account/profile/page.tsx` show the customer's `full_name`, `email`, and `phone` as read-only fields and a link back to `/account`. A `Sign out` button posts to `app/api/auth/sign-out/route.ts` which clears the `account_session` cookie and redirects to `/account/sign-in`. Notes: no edit form, no avatar, no emergency contact — explicitly out of scope for MVP.

6. **Seed test data and add a hand-test checklist to the README** — In `supabase/seed.sql` insert 2-3 customers with a mix of upcoming (>24h), upcoming (<24h), past, and cancelled bookings across the existing activities. Document the manual flow in `README.md` under a "Customer account (MVP)" heading: request code from `/account/sign-in`, check inbox, paste code, see lists, cancel an upcoming session, attempt to cancel one inside 24h and confirm it is blocked, then sign out.

## Acceptance Criteria
- [ ] Visiting `/account` while signed out redirects to `/account/sign-in`.
- [ ] Entering a known seeded email at `/account/sign-in` delivers a 6-digit code to the inbox and the code expires after 10 minutes.
- [ ] Submitting the correct code sets an HTTP-only cookie and lands the user on `/account` showing the seeded customer's name.
- [ ] An invalid or expired code shows an inline error and does not set a session.
- [ ] `/account` lists every upcoming booking (date, time, activity, coach) in chronological order and every past booking in reverse chronological order.
- [ ] A booking that was cancelled no longer appears in the Upcoming list.
- [ ] Clicking `Cancel` on an upcoming booking more than 24 hours away removes it from Upcoming on the next render; clicking `Cancel` on one inside 24 hours shows the "too late, contact the academy" message and leaves the booking in place.
- [ ] `/account/profile` shows the customer's full name, email, and phone as read-only text and offers a working `Sign out` button that returns the user to `/account/sign-in`.
- [ ] No UI for editing the profile, no password field, and no social/OAuth buttons exist anywhere in `/account`.
