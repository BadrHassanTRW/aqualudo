# Task 07. Admin Booking Management

## Goal
Build a single `/admin/bookings` page for AquaLudo staff that lists today's booking requests in a table and lets an admin confirm, cancel, or manually add a booking. This is the minimum needed to run the day's operations on the ground at the Nile site.

## Steps
1. **Define the `bookings` schema in Supabase** — Create a `bookings` table with the columns shown in the MVP table plus a status column: `id uuid pk`, `customer_name text`, `phone text`, `activity text`, `start_time timestamptz`, `party_size int`, `payment_status text` (e.g. `unpaid` / `deposit_paid` / `paid`), `booking_status text` (e.g. `pending` / `confirmed` / `cancelled`), `created_at timestamptz default now()`. Files: `supabase/migrations/0007_bookings.sql`. Notes: enable RLS and add a simple policy so only the service-role key (used server-side) can read/write; seed 3-5 rows dated today for manual testing.
2. **Create a server-side Supabase client and the admin page route** — Add a `lib/supabase/server.ts` helper that uses Next.js 14 server components to read the service-role key from `process.env`, then add `app/admin/bookings/page.tsx` as a Server Component that queries `bookings` where `start_time::date = current_date` ordered by `start_time asc`. Files: `lib/supabase/server.ts`, `app/admin/bookings/page.tsx`. Notes: gate the route behind a basic admin check (env-flag or simple shared-password cookie) so it is not publicly open; defer real auth to a later task.
3. **Build the `BookingsTable` UI component** — Render a Tailwind table with columns Customer, Phone, Activity, Time, Party size, Payment status, Status, and an Actions cell with a green Confirm button and a red Cancel button per row. Files: `app/admin/bookings/BookingsTable.tsx`. Notes: visually mute cancelled rows (e.g. `opacity-50 line-through`) and badge confirmed rows in green; show an empty state ("No bookings today") when the query returns zero rows.
4. **Add server actions to confirm and cancel** — Implement `confirmBooking(id)` and `cancelBooking(id)` as Next.js server actions that update `booking_status` in Supabase and call `revalidatePath('/admin/bookings')`. Files: `app/admin/bookings/actions.ts`. Notes: pass `id` through a hidden form input or `bind` from the row; the Cancel action should `confirm()` in the browser before submitting to prevent mis-clicks.
5. **Build the `AddBookingForm` for walk-ins and phone-ins** — Add a small Tailwind form above the table with fields Customer name, Phone, Activity, Date+time, Party size, and Payment status; submitting calls a `createBooking` server action that inserts a row with `booking_status = 'confirmed'`. Files: `app/admin/bookings/AddBookingForm.tsx`, extend `app/admin/bookings/actions.ts`. Notes: validate required fields server-side and return a simple inline error message; use a native `<input type="datetime-local">` to avoid pulling in a date-picker library.

## Acceptance Criteria
- [ ] Visiting `/admin/bookings` in a browser renders a table of today's bookings with columns: Customer, Phone, Activity, Time, Party size, Payment status, Status, Actions.
- [ ] When no bookings exist for today, the page shows a "No bookings today" empty state instead of a broken table.
- [ ] Clicking Confirm on a pending row updates the row to a confirmed state visible immediately (no manual refresh) and persists after reloading the page.
- [ ] Clicking Cancel on a row updates the row to a cancelled state, asks for confirmation first, and the row renders visually muted (e.g. strikethrough or greyed) afterwards.
- [ ] Submitting the Add booking form with all required fields inserts a new row that appears at the correct time-slot position in the table with status "confirmed".
- [ ] Submitting the Add booking form with a missing required field shows an inline error and does not create a row.
- [ ] Unauthenticated visits to `/admin/bookings` are redirected or blocked (not a public 200 response with the full table).
