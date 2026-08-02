# 08. Coach Panel

## Goal
Coaches need a simple way to see what sessions they are teaching today and who is attending. For the MVP, the coach panel is read-only: a shared, unauthenticated link per coach shows today's sessions with attendee names, plus an ICS calendar feed the coach can subscribe to on their phone. No login, no attendance capture, no messaging, no profile editing.

## User Stories (MVP)
- As a coach, I want to open a personal link (e.g. `aqualudo.net/coach/<token>`) on my phone, so that I can see today's sessions assigned to me without logging in.
- As a coach, I want each session to show the start time, activity, and the list of attendee names, so that I know who is showing up and can prepare.
- As a coach, I want to subscribe to an ICS calendar feed of my assigned sessions, so that my sessions show up in my phone's calendar app.
- As an admin, I want to send each coach their personal link and ICS URL by WhatsApp, so that onboarding is one message and no account creation is needed.

## Out of Scope (for MVP)
- Coach login, password reset, OTP, OAuth.
- Attendance capture (showed / no-show / cancelled-late).
- Coach-to-customer messaging inbox.
- Editing bio, photo, specialties, languages, or any profile field.
- Slot template change requests.
- Time-off requests.
- Earnings, payouts, payroll, or revenue splits.
- Coach ratings or reviews.
- Daily 7am WhatsApp digest.
- Per-coach notification preferences or settings.
- Multi-coach assignments (lead vs assistant).
- Custom branding or coach-specific public pages.
