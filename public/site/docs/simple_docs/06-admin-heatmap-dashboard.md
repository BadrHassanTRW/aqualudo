# 06. Admin Dashboard

## Goal
A single simple admin page that shows the two numbers the owner cares about most each day: how many bookings were made today, and how much revenue came in this month. No charts, no filters, no drilldowns.

## User Stories (MVP)
- As an admin, I want to see today's confirmed booking count on my dashboard, so that I can tell at a glance how busy the academy is today.
- As an admin, I want to see this month's total revenue (in EGP) on my dashboard, so that I can track how the month is going without running a report.
- As an admin, I want to see this month's total booking count on my dashboard, so that I have a quick sense of session volume.
- As an admin, I want the page to load fast and show numbers that are no older than a few minutes, so that the data is trustworthy when I check it.
- As an admin, I want to see the numbers in English, formatted with Egyptian-pound currency, so that the dashboard reads naturally for our local admin.

## Out of Scope (for MVP)
- Yearly heatmap grid and GitHub-style activity chart
- Activity and coach filters
- Year scrubber, month nav, day-detail drawer
- Hover tooltips, click-to-drill, inline booking actions
- "Currently in session" pulse card
- Export to PNG or CSV
- URL-persisted filter state and shareable links
- Supabase Realtime live updates (numbers can be cached and reloaded on page refresh)
- Aggregate statistics sidebar (cancellation rate, no-show rate, busiest hour, top activity)
- Empty state illustrations and onboarding graphics
- Arabic / RTL localisation (EN only for MVP)
- Predictive analytics, comparisons, year-over-year trends
