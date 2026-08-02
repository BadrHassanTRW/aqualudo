# Task 08. Coach Panel (Read-Only Personal Link + ICS Feed)

## Goal
Give every coach a personal unauthenticated link (`/coach/<token>`) that shows today's sessions and the attendee names for each, plus an ICS feed they can subscribe to in their phone's calendar. No login, no write actions, no profile editing — the link itself is the credential.

## Steps
1. **Add `coaches` table and `coach_id` on sessions** — Create a `coaches` table (id, name, phone, token uuid unique default gen_random_uuid(), active bool, created_at) in Supabase and add a nullable `coach_id uuid references coaches(id)` plus `starts_at timestamptz` index on `sessions`. Files: `supabase/migrations/0008_coach_panel.sql`, `lib/db/schema.sql`. Notes: re-run seed with 2-3 demo coaches and link a few existing sessions to them.
2. **Build the public coach page route** — Create a Next.js route `app/coach/[token]/page.tsx` that looks up the coach by token, queries `sessions` joined to `bookings` and `customers` for `starts_at` between today 00:00 and today 23:59 (Cairo time), and renders a list grouped by start time with attendee names. Files: `app/coach/[token]/page.tsx`, `components/CoachTodayList.tsx`, `lib/queries/todaySessions.ts`. Notes: server component, show "No sessions today" empty state, use the project's Tailwind tokens; never log the token.
3. **Expose the ICS feed endpoint** — Add `app/coach/[token]/ics/route.ts` returning `text/calendar` with one `VEVENT` per assigned session (past and future, not only today) including summary, start, end, location, and attendee count in the description. Files: `app/coach/[token]/ics/route.ts`, `lib/ics.ts`. Notes: set `Content-Disposition: inline; filename="coach.ics"` and a short `Cache-Control: max-age=300`; 404 if token not found or coach inactive.
4. **Add the share + copy block on the coach page** — Render the page's own URL and the matching `…/ics` URL as a copy-to-clipboard block at the top so the coach (or admin) can grab them, plus a "Subscribe in calendar" link that opens the ICS directly. Files: `components/CoachShareLinks.tsx`. Notes: links must be absolute (`NEXT_PUBLIC_SITE_URL` + path); use `navigator.clipboard.writeText` with a fallback `document.execCommand('copy')`.
5. **Document the admin onboarding message** — Add a short section to `docs/admin-onboarding.md` (or create it) with the exact WhatsApp template: greeting, the `/coach/<token>` link, the ICS link, and a one-line note that the link is private. Files: `docs/admin-onboarding.md`. Notes: include a reminder never to post the link publicly.

## Acceptance Criteria
- [ ] Visiting `/coach/<valid-token>` in a fresh private window shows the coach's name and a list of today's sessions (start time, activity, attendee names) with no login prompt.
- [ ] Visiting `/coach/<invalid-token>` returns a 404 page, not a stack trace or a blank screen.
- [ ] Each session row shows the correct attendee count and full names pulled from the joined `customers` table; sessions with zero bookings show "No attendees yet".
- [ ] Loading `/coach/<valid-token>/ics` returns `text/calendar` with a `BEGIN:VCALENDAR`, one `VEVENT` per assigned session (including future ones), and downloads/subscribes in Apple Calendar, Google Calendar, and Outlook.
- [ ] The coach page shows the absolute `/coach/...` and `/coach/.../ics` URLs with working copy-to-clipboard buttons, and the page works on a phone-sized viewport without horizontal scroll.
