# 04. Customer Account

## Goal
A lightweight customer area where a visitor can identify themselves with an email or phone number, see their upcoming and past bookings at AquaLudo, cancel an upcoming session if the 24-hour rule allows, and view the basic contact details the academy has on file. No social logins, no profile customization, no analytics, no loyalty, no family accounts, no data export.

## User Stories (MVP)
- As a returning customer, I want to sign in by entering my email or phone number and receiving a one-time code, so that I can access my bookings without creating or remembering a password.
- As a signed-in customer, I want to see a list of my upcoming sessions with the date, time, activity, and coach, so that I know what is next on my schedule.
- As a signed-in customer, I want to see a list of my past sessions, so that I can remember what I did and when.
- As a signed-in customer, I want to cancel an upcoming booking that is more than 24 hours away, so that I can free up the slot and (per the academy's policy) get a full refund.
- As a signed-in customer, I want to view my basic profile (name, email, phone), so that I can confirm the academy has the right contact details for me.

## Out of Scope (for MVP)
- Email + password login, Google login, Facebook login, or any OAuth provider.
- WhatsApp OTP, password reset, or remember-me toggles.
- Profile editing (name, phone, date of birth, gender, emergency contact, avatar).
- A rich dashboard with package counters, membership usage, or activity feed.
- A separate "Cancelled" tab; cancelled bookings are simply removed from Upcoming.
- Self-cancellation inside the 24-hour window (the academy handles these manually).
- Favorites, leaving reviews, waitlist subscriptions, notification preferences.
- Personal data export and account deletion flows.
- Package tracker, membership subscription view, or any usage analytics.
- Family accounts, loyalty points, referral codes, or session analytics.
