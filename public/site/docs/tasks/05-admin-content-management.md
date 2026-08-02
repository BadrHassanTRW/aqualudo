# Task 05. Admin Content Management

## Goal
Build a password-protected `/admin` section where the owner can sign in with a single env-var password and perform basic CRUD on the `activities` and `schedules` tables (titles, descriptions, images, prices, weekly slots, and active flag). No roles, no audit log, no SEO tools — just the minimum needed to keep the public site accurate.

## Steps
1. **Add Supabase schema for activities and schedules** — Create the `activities` and `schedules` tables via a SQL migration (id, title_en, description_en, image_url, base_price, is_active, plus `schedules` with activity_id, day_of_week, start_time, end_time, capacity). Files: `supabase/migrations/0005_admin_tables.sql`. Notes: enable RLS but grant full access to the service role only.
2. **Add admin env-var password and auth helper** — Set `ADMIN_PASSWORD` in `.env.local` and write a small `checkAdmin()` helper using a signed httpOnly cookie (`aqualudo_admin`) set/cleared on login and logout. Files: `lib/admin/auth.ts`, `app/api/admin/login/route.ts`, `app/api/admin/logout/route.ts`. Notes: cookie is signed with `ADMIN_SECRET`; password compared in constant time.
3. **Build the admin layout and guard** — Add `app/admin/layout.tsx` that calls `checkAdmin()` server-side and redirects to `/admin/login` if no valid cookie. Keep the shell minimal (logo + logout button). Files: `app/admin/layout.tsx`, `app/admin/login/page.tsx`, `components/admin/AdminShell.tsx`.
4. **Build the activities CRUD pages** — List view at `/admin/activities` with table + "Add activity" button, plus new/edit form at `/admin/activities/new` and `/admin/activities/[id]/edit` for title_en, description_en, image_url, base_price, is_active toggle. Files: `app/admin/activities/page.tsx`, `app/admin/activities/new/page.tsx`, `app/admin/activities/[id]/edit/page.tsx`, `components/admin/ActivityForm.tsx`.
5. **Wire activities CRUD to Supabase via server actions** — Use Next.js server actions under `app/admin/activities/actions.ts` to create/update/archive (soft delete via `is_active = false`) rows in `activities`. Files: `app/admin/activities/actions.ts`, `lib/admin/activities.ts`. Notes: validate required fields and positive price server-side; revalidate `/activities` and `/` on success.
6. **Build the schedules editor on the activity page** — On each activity edit page, render a weekly schedule editor (day-of-week checkboxes + start/end time inputs + capacity) with add/remove slot rows. Files: `components/admin/ScheduleEditor.tsx`, `app/admin/activities/[id]/edit/actions.ts`. Notes: each save replaces the activity's schedule rows in one transaction.
7. **Add Tailwind styling and small UX touches** — Style admin pages with the same Tailwind tokens as the public site, show inline save/error states on forms, and surface a "Saved" toast after successful mutations. Files: `components/admin/Button.tsx`, `components/admin/Toast.tsx`, `app/admin/globals.css` (if needed). Notes: keep it dense and utilitarian, no marketing polish.
8. **Seed example data and document the flow** — Insert the five MVP activities (Rowing, Kayaking, SUP, Wakeboard, Fitness) with placeholder image URLs and one weekly slot each via a seed script, and add a short README section in `docs/admin.md` explaining the login URL and password rotation. Files: `supabase/seed.sql`, `docs/admin.md`.

## Acceptance Criteria
- [ ] Visiting `/admin` while logged out redirects to `/admin/login`; entering the wrong password shows an inline error and does not set a cookie.
- [ ] Entering the correct `ADMIN_PASSWORD` sets the signed cookie and redirects to `/admin/activities`; clicking "Logout" clears the cookie and redirects back to `/admin/login`.
- [ ] From `/admin/activities` the owner can add a new activity with title_en, description_en, image_url, base_price, and is_active; the new row appears in the list and on the public `/activities` page after refresh.
- [ ] Editing an existing activity updates the row in Supabase and the change is visible on the public site (e.g. updated base_price) without a redeploy.
- [ ] Archiving an activity (is_active = false) hides it from the public `/activities` listing but keeps it visible in the admin list.
- [ ] On an activity's edit page, the owner can add and remove weekly schedule slots (day, start, end, capacity); saved slots appear under that activity on the public booking/schedule view and the capacity number matches what was entered.
- [ ] All admin pages are unreachable without a valid signed cookie (verified by clearing cookies in DevTools and reloading any `/admin/*` URL).
- [ ] The five seed activities (Rowing, Kayaking, SUP, Wakeboard, Fitness) are present after running the seed script and each has at least one schedule slot.
