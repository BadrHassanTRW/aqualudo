# 09. Communications & Notifications

## Goal
The MVP lets AquaLudo contact customers using only a WhatsApp deep-link button and a basic confirmation email. There are no automated message triggers, no template engine, no provider integration, and no backend notification service. The owner manually sends any messages from the business WhatsApp account and the booking system emails a one-off confirmation when a booking is confirmed.

## User Stories (MVP)
- As a customer who just booked a session, I want to receive a plain confirmation email with the activity, date, time, coach, and location, so that I have a record of my booking in my inbox.
- As a visitor on the site, I want to see a WhatsApp button on every page that opens a chat with the business number (+201011329642), so that I can ask questions or call to book without filling in a form.
- As a customer with an upcoming booking, I want the WhatsApp button to deep-link to a pre-filled message containing my activity name, so that I do not have to type the details myself.
- As the owner, I want the booking confirmation email to be sent automatically when an admin marks a booking as confirmed in the admin panel, so that I do not have to email customers manually.
- As the owner, I want a contact form on the site that emails the lead to my inbox, so that I can follow up with people who are not yet ready to book.
- As a customer, I want to see the business phone number, WhatsApp number, and email address clearly in the site footer, so that I can reach AquaLudo through whichever channel I prefer.

## Out of Scope (for MVP)
- Automated WhatsApp message templates and Meta Cloud API integration.
- Scheduled reminders (24h, 1h, post-session review request).
- SMS notifications and push notifications.
- Email template engine with multiple designs, A/B testing, or drip campaigns.
- Customer notification preferences and opt-out management.
- Inbound message handling, chat threading, and keyword commands.
- Retry queues, delivery receipts, and delivery status tracking.
- Admin notification panel and unread-count badge.
- Anti-spam, rate limiting, and daily messaging caps.
- Multi-language template management (EN/AR template bodies).
- Magic tokens for deep-linked review or waitlist flows.
