# أكوا لودو · Aqua Ludo

A marketing + admin site for a water-sports academy on the Nile in Cairo — rowing, kayaking, SUP, wakeboard, and water fitness. Arabic-first (RTL) with a full English mirror, i18n switching, and a JS-only demo data layer (`localStorage`) so the whole thing runs with no backend.

Built as a **Next.js app** that serves the original hand-crafted static pages (HTML/CSS/JS) verbatim from `public/`, with a tiny App Router shell. Deploys free on Vercel's Hobby tier.

---

## Features

- **Next.js on top of static pages** — every existing page (Arabic + English, admin, 404) is served unchanged from `public/`; `/` redirects to the homepage.
- **Splash screen on every hard refresh** — the boat glide intro plays on `Ctrl+Shift+R` / `Cmd+Shift+R` (and on normal loads). Soft navigation between pages skips it.
- **Hidden admin access** — a small lock icon in the bottom-right corner (faint, reveals on hover) auto-logs you in and drops you straight into the admin dashboard. For the owner. For everyone else it's basically invisible.
- **Public pages** — home, activities catalog, single activity, pricing, events, single event, about, contact, booking flow, account, account profile, sign-in, coach view, 404.
- **Admin pages** — dashboard, bookings, activities CMS, contact inbox, login. Auth-gated with a session check that redirects to login.
- **Customer-side forms** — booking, contact, sign-in, account. All write to `localStorage` (demo).
- **RTL Arabic UI + full English mirror** — `site/en/` duplicates every page; `i18n.js` rewrites links and swaps `lang`/`dir` on language switch.
- **RTL Arabic UI** with Cairo as the body font and Outfit/Plus Jakarta Sans for accents.

---

## Project structure

```
aqualudo/
├── app/                       ← Next.js App Router shell
│   ├── layout.jsx             ← minimal root layout (lang/dir)
│   └── page.jsx               ← redirects / → /index.html
├── next.config.mjs            ← redirects for /, /site/en, /site/admin
├── package.json
├── public/                    ← the entire site, served as static assets
│   ├── index.html             ← the homepage (Arabic)
│   ├── logo.jpg
│   └── site/
│       ├── pages/             ← all public-facing HTML
│       │   ├── 404.html
│       │   ├── about.html
│       │   ├── account.html
│       │   ├── account-profile.html
│       │   ├── activities.html
│       │   ├── activity.html  ← single activity (uses ?slug=)
│       │   ├── booking.html
│       │   ├── coach-ics.html
│       │   ├── coach.html     ← uses ?token= for coach auth
│       │   ├── contact.html
│       │   ├── event.html     ← uses ?slug=
│       │   ├── events.html
│       │   ├── pricing.html
│       │   └── sign-in.html
│       ├── en/                ← full English mirror of pages/ + admin/
│       ├── admin/             ← gated admin UI
│       │   ├── index.html     ← dashboard
│       │   ├── activities.html← activities CMS
│       │   ├── bookings.html
│       │   ├── contacts.html
│       │   └── login.html
│       ├── assets/
│       │   ├── css/main.css
│       │   ├── js/
│       │   │   ├── app.js     ← header/footer/splash, admin float, toast
│       │   │   ├── db.js      ← localStorage data layer + seed data
│       │   │   ├── db-en.js   ← English seed data
│       │   │   └── i18n.js    ← language switch + link rewriting
│       │   ├── img/
│       │   └── video/hero.mp4
│       ├── docs/              ← product specs (simple_docs / tasks / user-stories)
│       └── screenshots/       ← dev screenshots + take-screenshots.ps1
└── bench/                     ← dev harness (smoke tests, benchmarks)
```

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

Then open:

- `http://localhost:3000/` — homepage (redirects to `/index.html`)
- `http://localhost:3000/site/pages/about.html` — any public page
- `http://localhost:3000/site/admin/login.html` — admin login
- `http://localhost:3000/site/en/index.html` — English homepage

Production build + serve:

```bash
npm run build
npm run start      # http://localhost:3000
```

## Deploy (free tier)

**Vercel (recommended, free Hobby tier):**

1. Push this repo to GitHub.
2. Import the repo at https://vercel.com/new — framework auto-detects **Next.js**, no settings needed.
3. Deploy. Done — the site lives at `https://<project>.vercel.app`.

You can also deploy via CLI: `npm i -g vercel && vercel --prod`.

Alternative: any host that runs Next.js (`npm run build && npm run start`), e.g. Render/Railway free plans.

---

## Admin access

Two ways in:

1. **Hidden button (one click)** — look at the bottom-right corner of any public page. The tiny lock icon is almost invisible until you hover. Click → you're in the admin dashboard. (Uses the default password from `db.js`.)
2. **Manual** — go to `/site/admin/login.html` and enter the password.

Default password is set in `public/site/assets/js/db.js` as the `ADMIN_PASSWORD` constant. Change it for any non-demo deployment.

```js
const ADMIN_PASSWORD = 'aqualudo2026';
```

To log out: there's a **خروج** button in the top-right of every admin page.

---

## How it works

- **`public/site/assets/js/db.js`** — single `AquaDB` global. Seeds itself on first load (idempotent via `aqualudo_seeded_v1` flag in `localStorage`). Exposes `activities`, `bookings`, `customers`, `events`, `coaches`, `packages`, `sessions`, `admin` (login/logout/isAuth), etc. Reset everything with `AquaDB.reset()` in the console.
- **`public/site/assets/js/app.js`** — exposes the `Aqua` global: `renderHeader`, `renderFooter`, `renderSplash`, `runSplash`, `bindHeader`, `bindAdminFloat`, `reveal`, `toast`. Computes a `BASE` prefix from the script's own `src` so header/footer links resolve correctly whether the page is at the root or inside `site/pages/` or `site/admin/`.
- **`public/site/assets/js/i18n.js`** — language preference in `localStorage` (`aqualudo_lang`); rewrites `/site/...` ↔ `/site/en/...` and swaps `lang`/`dir`.
- **Splash** — `runSplash()` checks `performance.getEntriesByType('navigation')[0].type` and bypasses the sessionStorage "already seen" skip when the navigation is a `reload` or `back_forward`. That's how the boat shows on hard refresh.
- **Hidden admin button** — rendered by `renderFooter()` (so it appears on every page that has a footer). Wired by `bindAdminFloat()` on `DOMContentLoaded`. Click auto-logs in (calls `AquaDB.admin.login(AquaDB.ADMIN_PASSWORD)`) and redirects to `site/admin/index.html`.
- **Next.js shell** — `app/page.jsx` and `next.config.mjs` redirect `/`, `/site/en`, `/site/admin` to their `index.html` counterparts. Everything else is served byte-for-byte from `public/`. No React rewrite of the site pages — keeps the original code untouched and trivially portable.

### Reset demo data

Open DevTools console and run:

```js
AquaDB.reset();   // wipes localStorage and re-seeds
location.reload();
```

### Smoke test

```bash
node bench/smoke.mjs   # headless-Chrome checks of every page + link validation
```

---

## Customising the design

All design tokens are CSS custom properties at the top of `public/site/assets/css/main.css`:

```css
--bg: #FFF8F0;
--ink: #0B2434;
--coral: #FF5A3C;   /* primary accent */
--nile: #0F6F94;    /* secondary */
--gold: #E2B339;
--r-md: 20px;
--shadow-md: 0 12px 32px rgba(11, 36, 52, 0.10);
```

Change the brand color in one place and it cascades through buttons, the admin-float, badges, etc.

---

## Tech stack

- Next.js (App Router, static serving) + React.
- The site itself remains vanilla HTML, CSS, JavaScript — no build step for page code.
- `localStorage` for data persistence (demo only).
- Google Fonts: Cairo, Plus Jakarta Sans, Outfit.

---

## Browser support

Targets modern evergreen browsers (Chrome, Edge, Firefox, Safari). Uses:

- `performance.getEntriesByType('navigation')` — supported in all modern browsers.
- CSS `clamp()`, custom properties, `aspect-ratio` — broadly supported in 2021+ browsers.
- ES2017 syntax.

---

## Notes for production

This is a demo. Before shipping:

- Replace `localStorage` with a real backend (or a BaaS like Supabase/Firebase).
- Move the admin password out of client-side code (real auth, server-side session).
- Add CSP, HTTPS, proper image optimization (the activity art is generated inline as SVG — replace with real photos when available).
- Set up a real `sitemap.xml` and `robots.txt` (drop them in `public/`).
- Replace the placeholder Unsplash portrait URLs with consented photos.
- Add real Open Graph / Twitter card meta tags to each page.
