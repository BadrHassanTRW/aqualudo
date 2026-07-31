# 03. Booking Flow

## Goal
The MVP booking flow is a simple request form: the customer picks a session (activity, date, time) and leaves their contact details. The booking is stored as a pending request, and the admin confirms it manually via WhatsApp. No online payment, no live availability engine, no user accounts required to book.

## User Stories (MVP)
- As a visitor, I want to see a list of upcoming sessions (activity + date + time) on the booking page, so that I can pick when I want to come.
- As a visitor, I want to fill in my name, phone number, and any notes, so that the academy can reach me about my booking.
- As a visitor, I want to submit a booking request and see a confirmation message, so that I know my request was received.
- As an admin, I want to see all pending booking requests in a simple list, so that I can review new requests.
- As an admin, I want to mark a booking as confirmed (and contact the customer via WhatsApp) or cancelled, so that the schedule stays accurate.

## Out of Scope (for MVP)
- User accounts, login, or auth gate on the booking page
- Online payment (cards, wallets, cash-on-arrival handled in the system)
- Real-time availability or live slot updates
- Multi-step booking wizard (activity picker, tier picker, coach picker, add-ons)
- Pricing tier selection UI (one price per activity for MVP)
- Coach selection by the customer (admin assigns coach)
- Party size, group bookings, or capacity enforcement
- Add-ons (wetsuit, GoPro, photo packages)
- Session package redemption (8-pack + 1 free)
- Membership redemption
- Promo codes, discounts, partial payments, refunds
- Multi-currency display
- Email confirmations (WhatsApp only, sent manually by admin)
- Waitlist functionality
- Event-based booking entry
- Calendar sync or ICS downloads
