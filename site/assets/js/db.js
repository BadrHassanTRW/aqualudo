(function (global) {
  const K = {
    activities: 'aqualudo_db_activities',
    schedules: 'aqualudo_db_schedules',
    sessions: 'aqualudo_db_sessions',
    bookings: 'aqualudo_db_bookings',
    customers: 'aqualudo_db_customers',
    reviews: 'aqualudo_db_reviews',
    events: 'aqualudo_db_events',
    coaches: 'aqualudo_db_coaches',
    packages: 'aqualudo_db_packages',
    memberships: 'aqualudo_db_memberships',
    codes: 'aqualudo_db_auth_codes',
    contact: 'aqualudo_db_contact_leads',
    session: 'aqualudo_session',
    admin: 'aqualudo_admin_session',
    splash: 'aqualudo_splash_seen',
    seeded: 'aqualudo_seeded_v1',
  };
  const ADMIN_PASSWORD = 'aqualudo2026';

  const read = (k, d) => {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; }
  };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const today = () => new Date().toISOString().slice(0, 10);
  const now = () => new Date().toISOString();

  const BASE = (function () {
    const s = document.querySelector('script[src*="assets/js/db.js"]');
    if (!s) return '';
    const src = s.getAttribute('src') || '';
    const i = src.indexOf('assets/js/');
    return i >= 0 ? src.substring(0, i) : '';
  })();

  const ACTIVITY_PHOTOS = {
    rowing: 'assets/img/activities/rowing.jpg',
    kayaking: 'assets/img/activities/kayaking.jpg',
    sup: 'assets/img/activities/sup.jpg',
    wakeboard: 'assets/img/activities/wakeboard.jpg',
    fitness: 'assets/img/activities/fitness.jpg',
  };
  const photo = (slug) => (ACTIVITY_PHOTOS[slug] ? BASE + ACTIVITY_PHOTOS[slug] : '');

  const ART_PALETTES = {
    rowing:    { sky: '#F4E9D8', sun: '#FF5A3C', deep: '#0B2434', wave: '#0F6F94' },
    kayaking:  { sky: '#FFE9D6', sun: '#FF8E5C', deep: '#0B2434', wave: '#0F6F94' },
    sup:       { sky: '#FFF0E1', sun: '#FFB087', deep: '#0B2434', wave: '#0F6F94' },
    wake:      { sky: '#FFE0D0', sun: '#FF6B3C', deep: '#0B2434', wave: '#0F6F94' },
    fit:       { sky: '#F4E9D8', sun: '#FF5A3C', deep: '#0B2434', wave: '#0F6F94' },
  };

  const AVATAR_PALETTES = [
    { bg: '#FF5A3C', fg: '#FFF8F0' },
    { bg: '#0B2434', fg: '#FFF8F0' },
    { bg: '#0F6F94', fg: '#FFF8F0' },
    { bg: '#F4E9D8', fg: '#0B2434' },
  ];
  function buildAvatar(name) {
    const parts = name.split(' ');
    const initials = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
    const p = AVATAR_PALETTES[Math.abs(name.charCodeAt(0)) % AVATAR_PALETTES.length];
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='${p.bg}'/>
          <stop offset='100%' stop-color='${p.bg}' stop-opacity='0.7'/>
        </linearGradient>
      </defs>
      <rect width='200' height='200' fill='url(#g)'/>
      <text x='100' y='118' text-anchor='middle' font-family='Cairo, sans-serif' font-weight='900' font-size='80' fill='${p.fg}'>${initials}</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  function buildEventArt(slug, title) {
    const palettes = {
      'run-row-challenge': { sky: '#FFE0D0', sun: '#FF5A3C', accent: '#0B2434' },
      'sunset-paddle':     { sky: '#FFD3B0', sun: '#FF8E5C', accent: '#0B2434' },
      'nationals-regatta-2026': { sky: '#F4E9D8', sun: '#FF5A3C', accent: '#0B2434' },
      'ramadan-iftar':     { sky: '#1A0F2E', sun: '#FFD080', accent: '#FFD080' },
    };
    const p = palettes[slug] || palettes['sunset-paddle'];
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 700' preserveAspectRatio='xMidYMid slice'>
      <defs>
        <linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0%' stop-color='${p.sky}'/>
          <stop offset='100%' stop-color='${p.sun}' stop-opacity='0.4'/>
        </linearGradient>
        <radialGradient id='sun' cx='0.65' cy='0.6' r='0.3'>
          <stop offset='0%' stop-color='${p.sun}'/>
          <stop offset='100%' stop-color='${p.sun}' stop-opacity='0'/>
        </radialGradient>
      </defs>
      <rect width='1200' height='700' fill='url(#sky)'/>
      <rect width='1200' height='700' fill='url(#sun)'/>
      <circle cx='780' cy='450' r='90' fill='${p.sun}' opacity='0.85'/>
      <g stroke='${p.accent}' stroke-opacity='0.2' stroke-width='2' fill='none'>
        <path d='M0 500 Q200 480 400 500 T800 500 T1200 500'/>
        <path d='M0 540 Q200 520 400 540 T800 540 T1200 540'/>
        <path d='M0 580 Q200 560 400 580 T800 580 T1200 580'/>
      </g>
      <g transform='translate(600, 540)'>
        <ellipse cx='0' cy='0' rx='80' ry='12' fill='${p.accent}' opacity='0.4'/>
        <path d='M-70 -8 L70 -8 L60 8 L-60 8 Z' fill='${p.accent}' opacity='0.85'/>
      </g>
      <g font-family='Cairo, sans-serif' font-weight='900' fill='${p.accent}'>
        <text x='60' y='160' font-size='160' opacity='0.08'>${title.slice(0, 2)}</text>
      </g>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }
  const ART_ICONS = {
    rowing: '<g stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"><line x1="100" y1="380" x2="700" y2="380"/><line x1="400" y1="380" x2="400" y2="350"/><line x1="380" y1="360" x2="420" y2="360"/><ellipse cx="400" cy="375" rx="35" ry="5"/><path d="M250 280 Q400 220 550 280"/><circle cx="400" cy="180" r="6" fill="currentColor"/></g>',
    kayaking: '<g stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"><path d="M250 360 Q400 320 550 360 L540 380 Q400 360 260 380 Z"/><line x1="350" y1="340" x2="500" y2="260"/><line x1="480" y1="270" x2="510" y2="290"/><circle cx="350" cy="330" r="8" fill="currentColor"/></g>',
    sup: '<g stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"><ellipse cx="400" cy="380" rx="160" ry="14"/><line x1="400" y1="380" x2="400" y2="240"/><circle cx="400" cy="220" r="14" fill="currentColor"/><line x1="395" y1="220" x2="370" y2="280"/><line x1="405" y1="220" x2="430" y2="280"/><line x1="400" y1="240" x2="350" y2="160"/><ellipse cx="350" cy="155" rx="6" ry="20" fill="currentColor"/></g>',
    wake: '<g stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"><path d="M150 360 L250 340 L280 380 L150 380 Z"/><line x1="250" y1="340" x2="450" y2="280"/><circle cx="450" cy="280" r="10" fill="currentColor"/><line x1="445" y1="280" x2="420" y2="220"/><line x1="455" y1="280" x2="480" y2="220"/><line x1="450" y1="280" x2="430" y2="350"/></g>',
    fit: '<g stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"><circle cx="300" cy="320" r="20"/><line x1="300" y1="340" x2="300" y2="380"/><line x1="280" y1="350" x2="320" y2="350"/><line x1="300" y1="380" x2="280" y2="400"/><line x1="300" y1="380" x2="320" y2="400"/><line x1="350" y1="350" x2="500" y2="350"/><line x1="500" y1="350" x2="540" y2="320"/><line x1="500" y1="350" x2="540" y2="380"/></g>',
  };
  function buildArt(icon, label) {
    const p = ART_PALETTES[icon] || ART_PALETTES.rowing;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450' preserveAspectRatio='xMidYMid slice'>
      <defs>
        <linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0%' stop-color='${p.sky}'/>
          <stop offset='60%' stop-color='#FFF8F0'/>
          <stop offset='100%' stop-color='${p.wave}'/>
        </linearGradient>
        <radialGradient id='sun' cx='0.7' cy='0.25' r='0.35'>
          <stop offset='0%' stop-color='${p.sun}' stop-opacity='0.7'/>
          <stop offset='100%' stop-color='${p.sun}' stop-opacity='0'/>
        </radialGradient>
        <pattern id='ripple' x='0' y='0' width='40' height='12' patternUnits='userSpaceOnUse'>
          <path d='M0 6 Q10 0 20 6 T40 6' fill='none' stroke='${p.wave}' stroke-opacity='0.3' stroke-width='1.5'/>
        </pattern>
      </defs>
      <rect width='800' height='450' fill='url(#sky)'/>
      <rect width='800' height='450' fill='url(#sun)'/>
      <circle cx='640' cy='120' r='40' fill='${p.sun}'/>
      <g transform='translate(0, 30)'>
        <g color='${p.deep}' opacity='0.85'>${ART_ICONS[icon] || ART_ICONS.rowing}</g>
      </g>
      <rect x='0' y='340' width='800' height='110' fill='url(#ripple)'/>
      <g font-family='Cairo, sans-serif' font-weight='900' fill='${p.deep}'>
        <text x='40' y='80' font-size='90' opacity='0.1'>${label}</text>
      </g>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  const seedActivities = [
    {
      id: 'act-rowing', slug: 'rowing', name: 'Ø§Ù„ØªØ¬Ø¯ÙŠÙ', number: '01',
      tagline: 'Ø§Ø¨Ù†ÙŠ ØªÙƒÙ†ÙŠÙƒ ÙˆÙ‚ÙˆØ© ÙˆÙØ±ÙŠÙ‚.',
      short: 'Ø§ØªØ¹Ù„Ù… ØªÙƒÙ†ÙŠÙƒ ÙˆØªÙˆØ§Ø²Ù† ÙˆÙ‚ÙˆØ© ØªØ­Ù…Ù„ Ù…Ø¹ ÙƒÙˆØªØ´Ø§Øª Ù…Ø¹ØªÙ…Ø¯ÙŠÙ† Ø¹Ù„Ù‰ Ø´Ù„Ø² ØªØ¬Ø¯ÙŠÙ Ø§Ø­ØªØ±Ø§ÙÙŠØ©.',
      long: 'Ø§Ù„ØªØ¬Ø¯ÙŠÙ Ù‡Ùˆ Ø§Ù„Ø³Ø¨Ø¨ Ø§Ù„Ù„ÙŠ Ø§ØªØ£Ø³Ø³ Ø¨ÙŠÙ‡ Ø£ÙƒÙˆØ§ Ù„ÙˆØ¯Ùˆ. ÙØ±ÙŠÙ‚Ù†Ø§ Ù…Ù† Ø§Ù„ÙƒÙˆØªØ´Ø§Øª Ø§Ù„Ù…Ø¹ØªÙ…Ø¯ÙŠÙ† Ù‡ÙŠÙˆØµÙ„Ùƒ Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙŠØ© ÙˆÙŠØ®Ù„ÙŠÙƒ ØªØ¹Ù…Ù„ Ø£ÙˆÙ„ Ø¬Ø±Ø¨Ø© ÙƒÙˆÙŠØ³Ø© Ù…Ù† Ø£ÙˆÙ„ Ø³ÙŠØ´Ù†. Ø¨Ù†Ø´ØªØºÙ„ ÙÙŠ Ù…Ø¬Ù…ÙˆØ¹Ø§Øª Ù…ØªØ¯Ø±Ø¬Ø© â€” On Boarding Ù„Ù„Ù…Ø¨ØªØ¯Ø¦ÙŠÙ†ØŒ Foundation Ù„Ù„ÙØ¶ÙˆÙ„ÙŠÙŠÙ†ØŒ Performance Ù„Ù„Ø±ÙŠØ§Ø¶ÙŠÙŠÙ†ØŒ ÙˆElite Ù„ÙØ±ÙŠÙ‚Ù†Ø§ Ø§Ù„ØªÙ†Ø§ÙØ³ÙŠ. ÙƒÙ„ Ø§Ù„Ù…Ø¹Ø¯Ø§Øª Ø¹Ù„ÙŠÙ†Ø§ØŒ ÙˆØ§Ù„Ø¬Ø²Ø¡ Ø¨ØªØ§Ø¹Ù†Ø§ ÙÙŠ Ø§Ù„Ù†ÙŠÙ„ Ù…Ù† Ø£Ù‡Ø¯Ù‰ ÙˆØ£Ø£Ù…Ù† Ø§Ù„Ø£Ù…Ø§ÙƒÙ† Ø§Ù„Ù„ÙŠ ØªØªØ¹Ù„Ù… ÙÙŠÙ‡Ø§ ÙÙŠ Ø§Ù„Ù‚Ø§Ù‡Ø±Ø©.',
      hero: photo('rowing'),
      icon: 'rowing',
      pricing: [
        { name: 'On Boarding', desc: 'Ø³ÙŠØ´Ù† Ø¥Ø¬Ø¨Ø§Ø±ÙŠ Ù„Ù„Ù…Ø¨ØªØ¯Ø¦ÙŠÙ† ÙƒÙ„Ù‡Ù….', price: 200, duration: 'Ø³Ø§Ø¹Ø©' },
        { name: 'Foundation', desc: 'Ø§Ø¨Ù†ÙŠ Ø§Ù„Ø£Ø³Ø§Ø³. Ø¬Ø±Ø¨Ø© ÙˆØ±Ø§ Ø¬Ø±Ø¨Ø©.', price: 200, duration: 'Ø³Ø§Ø¹Ø©' },
        { name: 'Performance', desc: 'Ù„Ù„Ù…Ø¬ØªÙ‡Ø¯ÙŠÙ†. Ù‚ÙˆØ© ÙˆØ³Ø±Ø¹Ø© ÙˆØªÙƒÙ†ÙŠÙƒ.', price: 200, duration: 'Ø³Ø§Ø¹Ø©' },
        { name: 'Elite', desc: 'ØªØ¬Ø¯ÙŠÙ ØªÙ†Ø§ÙØ³ÙŠ Ø¹Ø§Ù„ÙŠ Ø§Ù„ÙƒØ«Ø§ÙØ©.', price: 200, duration: 'Ø³Ø§Ø¹Ø©' },
        { name: 'Ø®Ø§Øµ 1-Ø¹Ù„Ù‰-1', desc: 'ÙƒÙˆØªØ´Ù†Ø¬ Ø´Ø®ØµÙŠØŒ Ø¥Ù†Øª ÙˆÙƒÙˆØªØ´ Ø¨Ø³.', price: 400, duration: 'Ø³Ø§Ø¹Ø©' },
      ],
      included: ['Ø§Ù„Ù‚Ø§Ø±Ø¨ ÙˆØ§Ù„Ù…Ø¬Ø§Ø¯ÙŠÙ', 'ÙƒÙˆØªØ´ Ù…Ø¹Ø§Ùƒ Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙŠØ©', 'Ø¬Ø§ÙƒÙŠØª Ø¥Ù†Ù‚Ø§Ø°', 'Ù…ÙŠØ© Ù…Ø¹Ø¨Ø£Ø©'],
      bring: ['Ù‡Ø¯ÙˆÙ… Ø³Ø¨Ø§Ø­Ø© Ø£Ùˆ Ø³Ø±ÙŠØ¹Ø© Ø§Ù„Ø¬ÙØ§Ù', 'ÙƒØ±ÙŠÙ… Ø´Ù…Ø³', 'ÙÙˆØ·Ø©', 'ØµÙ†Ø¯Ù„ Ù…Ù…ÙƒÙ† ÙŠØªØ¨Ù‘Ù„'],
      active: true,
    },
    {
      id: 'act-kayaking', slug: 'kayaking', name: 'Ø§Ù„ÙƒÙŠØ§Ùƒ', number: '02',
      tagline: 'Ø§ØªØ¬ÙˆÙ„ Ø¹Ù„Ù‰ Ø§Ù„Ù†ÙŠÙ„.',
      short: 'Ø§Ø³ØªÙƒØ´Ù Ø§Ù„Ù†ÙŠÙ„ ÙÙŠ Ø³ÙŠØ´Ù†Ø² ÙƒÙŠØ§Ùƒ ØªØ±ÙÙŠÙ‡ÙŠØ© Ø£Ùˆ ØªÙ…Ø±ÙŠÙ†ÙŠØ© Ø¨Ø¥Ø´Ø±Ø§Ù ÙƒÙˆØªØ´.',
      long: 'Ù…ÙÙŠØ´ Ø­Ø§Ø¬Ø© Ø²ÙŠ Ø¥Ù†Ùƒ ØªÙƒÙˆÙ† ÙƒØ§Ù… Ø³Ù†ØªÙŠ ÙÙˆÙ‚ Ø§Ù„Ù…ÙŠØ© ÙÙŠ ÙƒÙŠØ§Ùƒ ÙˆØ¨ØªØ¹Ø¯ÙŠ Ø¬Ù†Ø¨ Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©. Ø§Ù„Ø³ÙŠØ´Ù†Ø² Ø¨ØªØ§Ø¹ØªÙ†Ø§ Ù…ØªÙ‚Ø³Ù…Ø© Ø¨ÙŠÙ† "ÙƒÙŠØ§Ùƒ Ù„Ù„Ù…ØªØ¹Ø©" â€” Ø£Ø³Ù‡Ù„ Ø·Ø±ÙŠÙ‚Ø© ØªÙ‚Ø¹ ÙÙŠ Ø­Ø¨ Ø§Ù„Ø±ÙŠØ§Ø¶Ø© â€” Ùˆ"Flatwater Training" Ù„Ù„ÙŠ Ø¹Ø§ÙŠØ² ØªÙƒÙ†ÙŠÙƒ ÙˆÙ‚ÙˆØ© ØªØ­Ù…Ù„ ÙˆÙŠÙØ¶Ù„ ÙŠÙ†Ø¶Ù… Ù„Ø¬Ø±ÙˆØ¨ Ø§Ù„Ø¨Ø§Ø¯Ù„Ø³ Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ÙŠ Ø¨ØªØ§Ø¹Ù†Ø§ Ø¹Ù„Ù‰ Ø§Ù„Ù†ÙŠÙ„.',
      hero: photo('kayaking'),
      icon: 'kayak',
      pricing: [
        { name: 'ÙƒÙŠØ§Ùƒ Ù„Ù„Ù…ØªØ¹Ø©', desc: 'ÙƒÙŠØ§Ùƒ ØªØ±ÙÙŠÙ‡ÙŠ Ø¹Ù„Ù‰ Ø§Ù„Ù†ÙŠÙ„ Ù„ÙƒÙ„ Ø§Ù„Ù†Ø§Ø³.', price: 130, duration: 'Ø³Ø§Ø¹Ø©' },
        { name: 'Flatwater Training', desc: 'ØªÙƒÙ†ÙŠÙƒ ÙˆÙ‚ÙˆØ© ØªØ­Ù…Ù„.', price: 120, duration: 'Ø³Ø§Ø¹Ø©' },
      ],
      included: ['ÙƒÙŠØ§Ùƒ ÙØ±Ø¯ÙŠ Ø£Ùˆ Ù…Ø²Ø¯ÙˆØ¬', 'Ø¨Ø§Ø¯Ù„ ÙˆØ¬Ø§ÙƒÙŠØª', 'Ù…Ø³Ø§Ø± Ø¨Ø¥Ø´Ø±Ø§Ù ÙƒÙˆØªØ´', 'Ù…ÙŠØ© Ù…Ø¹Ø¨Ø£Ø©'],
      bring: ['Ù‡Ø¯ÙˆÙ… Ø³Ø¨Ø§Ø­Ø© Ø£Ùˆ Ø³Ø±ÙŠØ¹Ø© Ø§Ù„Ø¬ÙØ§Ù', 'ÙƒØ±ÙŠÙ… Ø´Ù…Ø³', 'ÙÙˆØ·Ø©', 'Ù‡Ø¯ÙˆÙ… ØªØ§Ù†ÙŠØ©'],
      active: true,
    },
    {
      id: 'act-sup', slug: 'sup', name: 'Stand-Up Paddle (SUP)', number: '03',
      tagline: 'ØªÙˆØ§Ø²Ù† ÙˆÙƒÙˆØ±.',
      short: 'Ù‚ÙˆÙ‘ÙŠ Ø¹Ø¶Ù„Ø§ØªÙƒ Ø§Ù„ÙˆØ³Ø·Ù‰ ÙˆØªÙˆØ§Ø²Ù†Ùƒ ÙˆØ§Ø³ØªÙ…ØªØ¹ Ø¨ÙˆÙ‚ÙØªÙƒ Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙŠØ© ÙÙŠ Ø³ÙŠØ´Ù†Ø² Ø§Ù„Ø´Ø±ÙˆÙ‚ ÙˆØ§Ù„ØºØ±ÙˆØ¨.',
      long: 'SUP Ù‡ÙŠ Ø£Ø³Ù‡Ù„ Ø±ÙŠØ§Ø¶Ø© ØªØ¨Ø¯Ø£ Ø¨ÙŠÙ‡Ø§. ÙÙŠ Ø¹Ø´Ø± Ø¯Ù‚Ø§ÙŠÙ‚ Ù…Ù† Ù…Ø§ ØªÙ‚Ù Ø¹Ù„Ù‰ Ø§Ù„Ø¨ÙˆØ±Ø¯ Ù„Ø£ÙˆÙ„ Ù…Ø±Ø© Ù„Ø£ÙˆÙ„ Ø¬Ø±Ø¨Ø© ÙƒÙˆÙŠØ³Ø©. Ø¨Ù†Ø¹Ù…Ù„ Ø³ÙŠØ´Ù†Ø² Ø´Ø±ÙˆÙ‚ ÙˆØºØ±ÙˆØ¨ Ø¹Ù„Ù‰ Ø£Ù‡Ø¯Ù‰ Ø¬Ø²Ø¡ ÙÙŠ Ø§Ù„Ù†ÙŠÙ„ØŒ ÙˆÙƒÙˆØªØ´Ø§ØªÙ†Ø§ Ø´ØºÙ„Ù‡Ù… Ø¬Ø§Ù…Ø¯ ÙÙŠ Ø¥Ù†Ù‡Ù… ÙŠØ®Ù„ÙˆØ§ Ø§Ù„Ù…Ø¨ØªØ¯Ø¦ ÙŠÙ‚ÙˆÙ… ÙˆÙŠØ¨Ø§Ø¯Ù„ Ø¨Ø³Ø±Ø¹Ø©.',
      hero: photo('sup'),
      icon: 'sup',
      pricing: [
        { name: 'Ø³ÙŠØ´Ù† SUP', desc: 'Ø³Ø§Ø¹Ø© Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙŠØ© Ù…Ø¹ ÙƒÙˆØªØ´.', price: 350, duration: 'Ø³Ø§Ø¹Ø©' },
        { name: 'ØºØ±ÙˆØ¨ SUP', desc: 'Ø£ÙƒØªØ± Ø³ÙŠØ´Ù† Ø¨Ù†Ø¹Ù…Ù„Ù‡Ø§. Ø§Ù„Ø³Ø§Ø¹Ø© Ø§Ù„Ø°Ù‡Ø¨ÙŠØ© Ø¹Ù„Ù‰ Ø§Ù„Ù†ÙŠÙ„.', price: 350, duration: 'Ø³Ø§Ø¹Ø©' },
      ],
      included: ['Ø¨ÙˆØ±Ø¯ ÙˆØ¨Ø§Ø¯Ù„', 'ÙƒÙˆØªØ´ Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙŠØ©', 'Ø¬Ø§ÙƒÙŠØª Ø¥Ù†Ù‚Ø§Ø°', 'ØµÙˆØ± Ù…Ù† Ø³ÙŠØ´Ù†ØªÙƒ'],
      bring: ['Ù‡Ø¯ÙˆÙ… Ø³Ø¨Ø§Ø­Ø© Ø£Ùˆ Ø³Ø±ÙŠØ¹Ø© Ø§Ù„Ø¬ÙØ§Ù', 'ÙƒØ±ÙŠÙ… Ø´Ù…Ø³', 'ÙÙˆØ·Ø©', 'Ù‡Ø¯ÙˆÙ… ØªØ§Ù†ÙŠØ©'],
      active: true,
    },
    {
      id: 'act-wakeboard', slug: 'wakeboard', name: 'ÙˆÙŠÙƒ Ø¨ÙˆØ±Ø¯', number: '04',
      tagline: 'Ø£Ø¯Ø±ÙŠÙ†Ø§Ù„ÙŠÙ† Ø®Ø§Ù„Øµ.',
      short: 'Ø³ÙŠØ´Ù†Ø² Ø³Ø­Ø¨ Ø¨Ø§Ù„Ù‚Ø§Ø±Ø¨ Ù„Ø¨Ø·Ù„ÙŠÙ† Ø¹Ø§ÙŠØ²ÙŠÙ† ÙŠÙ‚ÙØ²ÙˆØ§ ÙˆÙŠÙ‚Ø·Ø¹ÙˆØ§ Ù…ÙˆØ¬ Ø§Ù„Ù†ÙŠÙ„.',
      long: 'Ø§Ù„ÙˆÙŠÙƒ Ø¨ÙˆØ±Ø¯ Ø¹Ù†Ø¯Ù†Ø§ Ø¨ÙŠØªÙ… ÙˆØ±Ø§ Ù‚Ø§Ø±Ø¨ Ø³ÙƒØ§ÙŠ Ø­Ù‚ÙŠÙ‚ÙŠØŒ Ù…Ø¹ ÙƒÙˆØªØ´ ÙÙŠ Ø§Ù„Ù…ÙŠØ© Ù…Ø¹Ø§Ùƒ ÙÙŠ Ø£ÙˆÙ„ Ø±Ø§ÙŠØ¯Ø². Ø§Ù„Ù…Ø¨ØªØ¯Ø¦ÙŠÙ† Ø¨ÙŠØ¨Ø¯Ø£ÙˆØ§ Ø¨Ø­Ø¨Ù„ Ø£Ø·ÙˆÙ„ ÙˆØ¨ØªØªÙ‚Ø¯Ù… Ø¨Ø³Ø±Ø¹Ø©. Ø¹Ù†Ø¯Ù†Ø§ Ø§Ù„Ø¹Ø¯Ø©ØŒ ÙˆØ§Ù„Ù‚Ø§Ø±Ø¨ØŒ ÙˆØ§Ù„ØµØ¨Ø±. ÙƒÙ„ Ø§Ù„Ù„ÙŠ Ù…Ø­ØªØ§Ø¬Ù‡ Ø´ÙˆÙŠØ© Ø´Ø¬Ø§Ø¹Ø© ÙˆØ§Ø³ØªØ¹Ø¯Ø§Ø¯ ØªØªØ¨Ù‘Ù„.',
      hero: photo('wakeboard'),
      icon: 'wake',
      pricing: [
        { name: 'ÙˆÙŠÙƒ Ø¨ÙˆØ±Ø¯ Ù…Ø¨ØªØ¯Ø¦', desc: 'Ø£ÙˆÙ„ Ø±Ø§ÙŠØ¯Ø² ÙˆØ±Ø§ Ø§Ù„Ù‚Ø§Ø±Ø¨. Ø¨Ù†Ø¨Ø¯Ø£Ùƒ Ø¨Ø­Ø¨Ù„ Ø£Ø·ÙˆÙ„.', price: 1800, duration: '30 Ø¯Ù‚ÙŠÙ‚Ø©' },
        { name: 'ÙˆÙŠÙƒ Ø¨ÙˆØ±Ø¯ Ù…Ø­ØªØ±Ù', desc: 'ÙƒØ§ÙØ³ ÙˆÙ‚ÙØ² ÙˆØ­Ø±ÙƒØ§Øª. Ù„Ù„Ù…Ø­ØªØ±ÙÙŠÙ†.', price: 1800, duration: '30 Ø¯Ù‚ÙŠÙ‚Ø©' },
      ],
      included: ['Ù‚Ø§Ø±Ø¨ ÙˆØ³ÙˆØ§Ù‚', 'Ø¨ÙˆØ±Ø¯ ÙˆØ¬Ø§ÙƒÙŠØª', 'Ø®ÙˆØ°Ø©', 'ÙƒÙˆØªØ´ ÙÙŠ Ø§Ù„Ù…ÙŠØ© Ù…Ø¹Ø§Ùƒ'],
      bring: ['Ù‡Ø¯ÙˆÙ… Ø³Ø¨Ø§Ø­Ø©', 'ÙƒØ±ÙŠÙ… Ø´Ù…Ø³', 'ÙÙˆØ·Ø©', 'Ù‡Ø¯ÙˆÙ… ØªØ§Ù†ÙŠØ©', 'ÙƒÙØ± Ù…ÙˆØ¨Ø§ÙŠÙ„ Ù…Ù‚Ø§ÙˆÙ… Ù„Ù„Ù…Ø§ÙŠØ© Ù„Ùˆ Ø¹Ù†Ø¯Ùƒ'],
      active: true,
    },
    {
      id: 'act-fitness', slug: 'fitness', name: 'ÙØªÙ†Ø³ Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙŠØ©', number: '05',
      tagline: 'Ø£Ù‚ÙˆÙ‰ ÙƒÙ„ ÙŠÙˆÙ….',
      short: 'Ù‚ÙˆØ© ÙˆØªØ­Ù…Ù„ ÙˆÙ…Ø±ÙˆÙ†Ø© Ù…ØµÙ…Ù…Ø© Ù„Ù„Ø±ÙŠØ§Ø¶Ø§Øª Ø§Ù„Ù…Ø§Ø¦ÙŠØ© ÙˆØ£Ø³Ù„ÙˆØ¨ Ø­ÙŠØ§Ø© Ù†Ø´ÙŠØ·.',
      long: 'Ø¨Ø±Ù†Ø§Ù…Ø¬ Ø§Ù„ÙØªÙ†Ø³ Ø¨ØªØ§Ø¹Ù†Ø§ Ù…Ø¹Ù…ÙˆÙ„ Ø¨ÙˆØ§Ø³Ø·Ø© ØªØ¬Ø¯Ù‘Ø§ÙÙŠÙ†ØŒ Ù„ÙƒÙ„ Ø§Ù„Ù†Ø§Ø³. Ù‚ÙˆØ© ÙˆØªÙƒÙŠÙŠÙ Ø¨Ø¯Ù†ÙŠ Ù…ØµÙ…Ù… Ø¹Ù„Ù‰ Ø§Ù„Ø±ÙŠØ§Ø¶Ø§Øª Ø§Ù„Ù…Ø§Ø¦ÙŠØ© Ø§Ù„Ù„ÙŠ Ø¨ØªØ­Ø¨Ù‡Ø§ â€” Ø¶Ù‡Ø± Ø£Ù‚ÙˆÙ‰ØŒ ÙˆÙ‚ÙØ© Ø£Ø­Ø³Ù†ØŒ Ø§Ø³ØªØ´ÙØ§Ø¡ Ø£Ø³Ø±Ø¹. Ø¨Ù†Ø®Ù„Ù‘Ø· ØªÙ…Ø§Ø±ÙŠÙ† ÙˆØ²Ù† Ø§Ù„Ø¬Ø³Ù… Ùˆ bands Ùˆ drills Ø¬Ù…Ø§Ø¹ÙŠØ©. Ø§Ù„Ø¬Ø±ÙˆØ¨ Ø²ÙŠ Ø±ÙŠØ§Ø¶Ø© Ø¬Ù…Ø§Ø¹ÙŠØ©ØŒ ÙˆØ§Ù„Ø³ÙŠØ´Ù†Ø² Ø§Ù„Ø®Ø§ØµØ© Ù…ØªØ¸Ø¨Ø·Ø© Ø¹Ù„Ù‰ Ø£Ù‡Ø¯Ø§ÙÙƒ.',
      hero: photo('fitness'),
      icon: 'fit',
      pricing: [
        { name: 'ÙØªÙ†Ø³ Ø¬Ù…Ø§Ø¹ÙŠ', desc: 'Ø³ÙŠØ´Ù† Ø¬Ø±ÙˆØ¨ ÙÙŠ Ø§Ù„Ù‡ÙˆØ§ Ø§Ù„Ø·Ù„Ù‚. ÙƒÙ„ Ø§Ù„Ù…Ø³ØªÙˆÙŠØ§Øª.', price: 150, duration: 'Ø³Ø§Ø¹Ø©' },
        { name: 'ØªØ¯Ø±ÙŠØ¨ Ø´Ø®ØµÙŠ', desc: '1-Ø¹Ù„Ù‰-1 Ù…ØªØ¸Ø¨Ø· Ø¹Ù„ÙŠÙƒ.', price: 400, duration: 'Ø³Ø§Ø¹Ø©' },
      ],
      included: ['ÙƒÙ„ Ø§Ù„Ù…Ø¹Ø¯Ø§Øª', 'Ø³ÙŠØ´Ù† Ø¨Ø¥Ø´Ø±Ø§Ù ÙƒÙˆØªØ´', 'Ù…ÙŠØ©', 'Ø§Ø³ØªØ´ÙØ§Ø¡ ÙˆØ§Ø³ØªØ±ØªØ´'],
      bring: ['Ø´Ø¨Ø´Ø¨ Ø±ÙŠØ§Ø¶ÙŠ Ø£Ùˆ Ø¬Ø²Ù…Ø© Ø±ÙŠØ§Ø¶ÙŠØ©', 'ÙÙˆØ·Ø©', 'Ø²Ø¬Ø§Ø¬Ø© Ù…ÙŠØ©', 'Ø·Ø§Ù‚Ø© Ø¥ÙŠØ¬Ø§Ø¨ÙŠØ©'],
      active: true,
    },
  ];

  const seedSchedules = [
    { id: uid(), activityId: 'act-rowing', day: 1, start: '06:00', end: '08:00', capacity: 8 },
    { id: uid(), activityId: 'act-rowing', day: 3, start: '06:00', end: '08:00', capacity: 8 },
    { id: uid(), activityId: 'act-rowing', day: 5, start: '17:00', end: '19:00', capacity: 8 },
    { id: uid(), activityId: 'act-kayaking', day: 2, start: '09:00', end: '11:00', capacity: 6 },
    { id: uid(), activityId: 'act-kayaking', day: 4, start: '16:00', end: '18:00', capacity: 6 },
    { id: uid(), activityId: 'act-kayaking', day: 6, start: '08:00', end: '10:00', capacity: 6 },
    { id: uid(), activityId: 'act-sup', day: 0, start: '06:00', end: '07:30', capacity: 4 },
    { id: uid(), activityId: 'act-sup', day: 5, start: '18:00', end: '19:30', capacity: 4 },
    { id: uid(), activityId: 'act-wakeboard', day: 4, start: '14:00', end: '17:00', capacity: 3 },
    { id: uid(), activityId: 'act-fitness', day: 1, start: '19:00', end: '20:00', capacity: 10 },
    { id: uid(), activityId: 'act-fitness', day: 3, start: '19:00', end: '20:00', capacity: 10 },
  ];

  const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function buildSeedSessions() {
    const out = [];
    const acts = read(K.activities);
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i + 1);
      const dow = d.getDay();
      const matching = read(K.schedules).filter(s => s.day === dow);
      for (const s of matching) {
        const act = acts.find(a => a.id === s.activityId);
        if (!act) continue;
        const [hh, mm] = s.start.split(':').map(Number);
        const starts = new Date(d);
        starts.setHours(hh, mm, 0, 0);
        if (starts < new Date()) continue;
        out.push({
          id: uid(),
          activityId: act.id,
          coachId: 'coach-1',
          startsAt: starts.toISOString(),
          durationMin: 60,
          capacity: s.capacity,
          booked: 0,
          status: 'scheduled',
        });
      }
    }
    return out;
  }

  const seedCoaches = [
    { id: 'coach-1', name: 'ÙŠÙˆØ³Ù Ø§Ù„Ø³ÙŠØ¯', role: 'Ø§Ù„ÙƒÙˆØªØ´ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ Â· ØªØ¬Ø¯ÙŠÙ', token: 'demo-youssef', active: true, photo: buildAvatar('ÙŠÙˆØ³Ù Ø§Ù„Ø³ÙŠØ¯'), bio: 'Ø£ÙƒØªØ± Ù…Ù† 10 Ø³Ù†ÙŠÙ† Ø¹Ù„Ù‰ Ø§Ù„Ù†ÙŠÙ„. Ø¯Ø±Ù‘Ø¨ Ù„Ø§Ø¹Ø¨ÙŠÙ† ÙˆØµÙ„ÙˆØ§ ÙŠØªÙ†Ø§ÙØ³ÙˆØ§ Ø¹Ù„Ù‰ Ø§Ù„Ù…Ø³ØªÙˆÙ‰ Ø§Ù„ÙˆØ·Ù†ÙŠ.' },
    { id: 'coach-2', name: 'Ø³Ù„Ù…Ù‰ Ù‡Ø§Ù†ÙŠ', role: 'ÙƒÙˆØªØ´ Â· ÙƒÙŠØ§Ùƒ Ùˆ SUP', token: 'demo-salma', active: true, photo: buildAvatar('Ø³Ù„Ù…Ù‰ Ù‡Ø§Ù†ÙŠ'), bio: 'Ù‡Ø§Ø¯ÙŠØ© ÙˆÙˆØ§Ø¶Ø­Ø©ØŒ Ø´ØºÙ„Ù‡Ø§ Ø¬Ø§Ù…Ø¯ Ù…Ø¹ Ø§Ù„Ù…Ø¨ØªØ¯Ø¦ÙŠÙ†. Ø£ÙˆÙ„ Ø³ÙŠØ´Ù† Ù…Ø¹Ø§Ù‡Ø§ Ù‡ØªØ­Ø³ Ø¥Ù†Ù‡Ø§ Ù…ÙŠØª Ø³ÙŠØ´Ù†.' },
    { id: 'coach-3', name: 'Ø¹Ù…Ø± ÙØ§Ø±ÙˆÙ‚', role: 'ÙƒÙˆØªØ´ Â· ÙˆÙŠÙƒ Ø¨ÙˆØ±Ø¯', token: 'demo-omar', active: true, photo: buildAvatar('Ø¹Ù…Ø± ÙØ§Ø±ÙˆÙ‚'), bio: 'Ø¨Ø·Ù„ ÙˆÙŠÙƒ Ø¨ÙˆØ±Ø¯ Ù‚Ø¯Ø§Ù…. Ø¹Ø§ÙŠØ´ Ø§Ù„Ù„Ø­Ø¸Ø© Ø§Ù„Ù„ÙŠ Ø¨ØªÙ‚ÙˆÙ… ÙÙŠÙ‡Ø§ Ø¹Ù„Ù‰ Ø§Ù„Ø¨ÙˆØ±Ø¯ Ù„Ø£ÙˆÙ„ Ù…Ø±Ø©.' },
    { id: 'coach-4', name: 'Ù†ÙˆØ± Ø­Ø³Ù†', role: 'ÙƒÙˆØªØ´ Â· ÙØªÙ†Ø³', token: 'demo-nour', active: true, photo: buildAvatar('Ù†ÙˆØ± Ø­Ø³Ù†'), bio: 'ÙƒÙˆØªØ´ Ù‚ÙˆØ© Ø¨ÙŠØ¸Ø¨Ø· ÙƒÙ„ Ø¨Ø±Ù†Ø§Ù…Ø¬ Ø¹Ù„Ù‰ Ø§Ù„Ø±ÙŠØ§Ø¶Ø© Ø§Ù„Ù…Ø§Ø¦ÙŠØ© Ø§Ù„Ù„ÙŠ Ø¨ØªØ­Ø¨Ù‡Ø§.' },
  ];

  const seedCustomers = [
    { id: 'cust-salma', name: 'Ø³Ù„Ù…Ù‰ Ø¹Ù‚Ù„', email: 'salma@example.com', phone: '+201234567891', createdAt: now() },
    { id: 'cust-farida', name: 'ÙØ±ÙŠØ¯Ø© Ù…Ø­Ù…Ø¯', email: 'farida@example.com', phone: '+201234567892', createdAt: now() },
    { id: 'cust-andrew', name: 'Ø£Ù†Ø¯Ø±Ùˆ Ø¹Ø²Øª', email: 'andrew@example.com', phone: '+201234567893', createdAt: now() },
  ];

  const seedReviews = [
    { id: uid(), activitySlug: 'rowing', rating: 5, author: 'Ø³Ù„Ù…Ù‰ Ø¹Ù‚Ù„', body: 'Ø§Ù„ØªØ¬Ø¯ÙŠÙ Ù‡Ù†Ø§ Ø¨Ù‚Ù‰ Ù…ÙƒØ§Ù† Ø¨ÙŠØ¹Ø§Ù„Ø¬Ù†ÙŠ. Ø§Ù„ÙƒÙˆØªØ´Ø§Øª Ø¯Ø§Ø¹Ù…ÙŠÙ†ØŒ ÙˆØ§Ù„Ù†ÙŠÙ„ Ø­Ø§Ø¬Ø© ØªØ§Ù†ÙŠØ© ÙˆÙ‚Øª Ø§Ù„Ø´Ø±ÙˆÙ‚.', approved: true, createdAt: now() },
    { id: uid(), activitySlug: 'rowing', rating: 5, author: 'Ø£Ù†Ø¯Ø±Ùˆ Ø¹Ø²Øª', body: 'Ø¬ÙŠØª Ù„ØªØ±ÙŠØ§Ù„ ÙˆØ§Ø­Ø¯ ÙˆÙØ¶Ù„Øª Ø³Ù†ØªÙŠÙ†. ÙƒÙˆÙ…ÙŠÙˆÙ†ØªÙŠ Ø­Ù‚ÙŠÙ‚ÙŠØ©ØŒ ÙƒÙˆØªØ´Ù†Ø¬ Ø­Ù‚ÙŠÙ‚ÙŠ.', approved: true, createdAt: now() },
    { id: uid(), activitySlug: 'kayaking', rating: 5, author: 'ÙØ±ÙŠØ¯Ø© Ù…Ø­Ù…Ø¯', body: 'Ø£Ù†ØµØ­ Ø¬Ø¯Ø§Ù‹ Ø¨Ø³ÙŠØ´Ù†Ø² Ø§Ù„ÙƒÙŠØ§Ùƒ. Ø¢Ù…Ù†Ø© Ø¬Ø¯Ø§Ù‹ØŒ Ø§Ù„ÙØ±ÙŠÙ‚ Ù„Ø·ÙŠÙØŒ ÙˆØ¨ÙŠØ´Ø±Ø­ÙˆÙ„Ùƒ ÙƒÙ„ Ø­Ø§Ø¬Ø©.', approved: true, createdAt: now() },
    { id: uid(), activitySlug: 'sup', rating: 5, author: 'Ù†Ø³Ù…Ø© Ùƒ.', body: 'Ø³ÙŠØ´Ù† Ø§Ù„ØºØ±ÙˆØ¨ Ø¬Ù…ÙŠÙ„Ø© Ø¬Ø¯Ø§Ù‹. Ø³Ù„Ù…Ù‰ Ø®Ù„Ù‘ØªÙ†Ø§ Ù†Ù‚ÙˆÙ… Ø¹Ù„Ù‰ Ø§Ù„Ø¨ÙˆØ±Ø¯Ø² ÙÙŠ Ø®Ù…Ø³ Ø¯Ù‚Ø§ÙŠÙ‚. Ø§ØªØ¹Ù„Ù‚Ù‘ÙŠÙ†Ø§.', approved: true, createdAt: now() },
    { id: uid(), activitySlug: 'wakeboard', rating: 5, author: 'Ø­Ø³Ù† Ù….', body: 'Ø¹Ù…Ø± Ø£Ø³Ø·ÙˆØ±Ø©. Ø®Ù„Ø§Ù†ÙŠ Ø£Ù‚ÙˆÙ… Ø¹Ù„Ù‰ Ø§Ù„ÙˆÙŠÙƒ Ø¨ÙˆØ±Ø¯ Ù…Ù† Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø© Ø§Ù„ØªØ§Ù†ÙŠØ©. ÙŠØ³ØªØ§Ù‡Ù„ ÙƒÙ„ Ù‚Ø±Ø´.', approved: true, createdAt: now() },
    { id: uid(), activitySlug: 'fitness', rating: 5, author: 'ÙŠØ§Ø±Ø§ Ø·.', body: 'Ø¨Ø±Ù†Ø§Ù…Ø¬ Ù†ÙˆØ± Ù‡Ùˆ Ø§Ù„Ø³Ø¨Ø¨ Ø¥Ù†ÙŠ Ø¨Ø¬Ø¯Ù‘Ù Ù…Ù† ØºÙŠØ± ÙˆØ¬Ø¹ Ø¶Ù‡Ø±. Ø¨Ø¹Ø¯ Ø³Øª Ø´Ù‡ÙˆØ± Ø­Ø§Ø³Ø³ Ø¥Ù†ÙŠ Ø´Ø®Øµ ØªØ§Ù†ÙŠ.', approved: true, createdAt: now() },
  ];

  const seedEvents = [
    { id: 'evt-runrow', slug: 'run-row-challenge', title: 'ØªØ­Ø¯ÙŠ Ø§Ù„Ø±ÙƒØ¶ ÙˆØ§Ù„ØªØ¬Ø¯ÙŠÙ', date: '2026-07-31', time: '07:30 â€” 10:30 Ø§Ù„ØµØ¨Ø­', location: 'Ø£ÙƒÙˆØ§ Ù„ÙˆØ¯ÙˆØŒ Ø§Ù„Ø¯Ù‚ÙŠ', image: buildEventArt('run-row-challenge', 'ØªØ­Ø¯ÙŠ'), tagline: 'Ø§Ø¯Ù‘Ù‰ Ù†ÙØ³Ùƒ Ø¹Ù„Ù‰ Ø§Ù„Ø¨Ø± ÙˆØ§Ù„Ù…ÙŠÙ‡. ØªØ­Ø¯ÙŠ ÙˆØ§Ø­Ø¯. Ø§ØªÙ†ÙŠÙ† Ø±ÙŠØ§Ø¶Ø©. Ø£Ù†Øª Ø¬Ø§Ù‡Ø²ØŸ', body: 'Ø¬Ø§Ù‡Ø² ØªØ®ØªØ¨Ø± Ù†ÙØ³ÙƒØŸ Ø§Ù†Ø¶Ù… Ù„Ø£ÙƒÙˆØ§ Ù„ÙˆØ¯Ùˆ ÙÙŠ ØªØ­Ø¯ÙŠ ÙØªÙ†Ø³ Ø­Ù…Ø§Ø³ÙŠ Ø¨ÙŠØ¬Ù…Ø¹ Ø¨ÙŠÙ† Ù‚Ø¯Ø±Ø© Ø§Ù„Ø±ÙƒØ¶ ÙˆÙ‚ÙˆØ© Ø§Ù„ØªØ¬Ø¯ÙŠÙ. Ø³ÙˆØ§Ø¡ ÙƒÙ†Øª Ø¬Ø¯ÙŠØ¯ Ø¹Ù„Ù‰ Ø§Ù„Ø±ÙŠØ§Ø¶Ø© ÙˆÙ„Ø§ Ø±ÙŠØ§Ø¶ÙŠ Ø¹Ù†Ø¯Ù‡ Ø®Ø¨Ø±Ø©ØŒ ØªØ­Ø¯ÙŠ Run & Row Ù…Ø¹Ù…ÙˆÙ„ Ø¹Ø´Ø§Ù† ÙŠØ®ØªØ¨Ø± Ù‚ÙˆØªÙƒ ÙˆØ¹Ø²ÙŠÙ…ØªÙƒ ÙˆØ´ØºÙ„Ùƒ Ø§Ù„Ø¬Ù…Ø§Ø¹ÙŠ ÙÙŠ Ø¬Ùˆ Ù…Ù…ØªØ¹ ÙˆØ¯Ø§Ø¹Ù….', audience: 'Ù…ÙØªÙˆØ­ Ù„Ù„ÙƒÙ„', price: 250 },
    { id: 'evt-sunset', slug: 'sunset-paddle', title: 'ØºØ±ÙˆØ¨ SUP Ø¹Ù„Ù‰ Ø§Ù„Ù†ÙŠÙ„', date: '2026-08-22', time: '06:00 â€” 08:00 Ø¨Ù„ÙŠÙ„', location: 'Ø£ÙƒÙˆØ§ Ù„ÙˆØ¯ÙˆØŒ Ø§Ù„Ø¯Ù‚ÙŠ', image: buildEventArt('sunset-paddle', 'ØºØ±ÙˆØ¨'), tagline: 'Ø³Ù‡Ø±Ø© SUPØŒ Ø§Ù„Ø³Ø§Ø¹Ø© Ø§Ù„Ø°Ù‡Ø¨ÙŠØ©ØŒ ÙˆÙ†ÙˆØ± Ø§Ù„Ù…Ø¯ÙŠÙ†Ø© Ø¨ÙŠÙŠØ¬ÙŠ.', body: 'Ù…ÙÙŠØ´ Ø£Ø­Ù„Ù‰ Ù…Ù† Ø¥Ù†Ùƒ ØªÙ‚Ø¶ÙŠ Ø¢Ø®Ø± Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ ÙÙŠ Ø§Ù„Ù‚Ø§Ù‡Ø±Ø© Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙŠØ© ÙˆÙ‚Øª Ø§Ù„ØºØ±ÙˆØ¨. Ø®Ø¯ ØµØ§Ø­Ø¨ÙƒØŒ Ø§Ø¨Ø¯Ù„ Ù…Ø¹Ø§Ù†Ø§ Ø¹Ù„Ù‰ Ø§Ù„Ù†ÙŠÙ„ØŒ ÙˆØ´ÙˆÙ Ø§Ù„Ù…Ø¯ÙŠÙ†Ø© Ø¨ØªÙ†ÙˆÙ‘Ø±. ÙƒÙˆØªØ´Ø§Øª ÙˆÙ…ÙˆØ³ÙŠÙ‚Ù‰ Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙŠØ©ØŒ ØªØµÙˆÙŠØ± Ù…ØªØ¶Ù…Ù†.', audience: 'Ù…ÙØªÙˆØ­ Ù„Ù„ÙƒÙ„', price: 400 },
    { id: 'evt-regatta', slug: 'nationals-regatta-2026', title: 'Ø±ÙŠØ¬ÙŠØªØ§ Ø§Ù„ÙˆØ·Ù†ÙŠ 2026', date: '2026-09-12', time: '07:00 â€” 11:00 Ø§Ù„ØµØ¨Ø­', location: 'Ø£ÙƒÙˆØ§ Ù„ÙˆØ¯ÙˆØŒ Ø§Ù„Ø¯Ù‚ÙŠ', image: buildEventArt('nationals-regatta-2026', 'Ø±ÙŠØ¬ÙŠØªØ§'), tagline: 'ØªØ¬Ø¯Ù‘Ø§ÙÙŠÙ†Ø§ Ø§Ù„Ù…Ø­ØªØ±ÙÙŠÙ† Ø¨ÙŠØ§Ø®Ø¯ÙˆØ§ Ø¹Ù„Ù‰ Ù…ØµØ± ÙƒÙ„Ù‡Ø§.', body: 'Ø£ÙƒØ¨Ø± ÙŠÙˆÙ… ÙÙŠ Ø§Ù„ÙƒØ§Ù„ÙŠÙ†Ø¯Ø± Ø¨ØªØ§Ø¹Ù†Ø§. ØªØ¬Ø¯Ù‘Ø§ÙÙŠÙ†Ø§ Ø§Ù„Ù€ Elite ÙˆØ§Ù„Ù€ Performance Ø¨ÙŠØ´Ø§Ø±ÙƒÙˆØ§ Ø£Ø­Ø³Ù† Ù„Ø§Ø¹ÙŠØ¨Ø© Ø§Ù„Ø¨Ù„Ø¯ØŒ Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙŠØ© Ø§Ù„Ù„ÙŠ ØªÙ…Ø±Ù‘Ù†ÙˆØ§ Ø¹Ù„ÙŠÙ‡Ø§ Ø³Ù†ÙŠÙ†. ØªØ¹Ø§Ù„Ù‰ Ø´Ø§Ø±ÙƒØŒ ØªØ¹Ø§Ù„Ù‰ Ø´Ø¬Ù‘Ø¹ØŒ ØªØ¹Ø§Ù„Ù‰ Ø´ÙˆÙ Ù…Ø³ØªÙ‚Ø¨Ù„ Ø§Ù„ØªØ¬Ø¯ÙŠÙ ÙÙŠ Ù…ØµØ±.', audience: 'Ù„Ù„Ø£Ø¹Ø¶Ø§Ø¡ Ø¨Ø³', price: 0 },
    { id: 'evt-iftar', slug: 'ramadan-iftar', title: 'Ø¥ÙØ·Ø§Ø± Ø¬Ù…Ø§Ø¹ÙŠ Ø¹Ù„Ù‰ Ø§Ù„Ù†ÙŠÙ„', date: '2026-03-27', time: '07:00 â€” 11:00 Ø¨Ù„ÙŠÙ„', location: 'Ø£ÙƒÙˆØ§ Ù„ÙˆØ¯ÙˆØŒ Ø§Ù„Ø¯Ù‚ÙŠ', image: buildEventArt('ramadan-iftar', 'Ø¥ÙØ·Ø§Ø±'), tagline: 'Ù†ÙØ·Ø± Ù…Ø¹ Ø§Ù„ÙØ±ÙŠÙ‚ØŒ Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙŠØ©ØŒ ØªØ­Øª Ù†ÙˆØ± Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©.', body: 'Ø¥ÙØ·Ø§Ø±Ù†Ø§ Ø§Ù„Ø³Ù†ÙˆÙŠ. Ù‡Ø§Øª Ø¹ÙŠÙ„ØªÙƒ ÙˆØµØ­Ø§Ø¨Ùƒ ÙˆÙ…Ø¹Ø¯Ø© ÙØ§Ø¶ÙŠØ©. ÙØ±ÙŠÙ‚ Ø£ÙƒÙˆØ§ Ù„ÙˆØ¯Ùˆ Ù‡ÙŠÙƒÙˆÙ† Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙŠØ© Ø¨Ø§Ù„ÙÙˆØ§Ù†ÙŠØ³ ÙˆØ§Ù„Ø£ÙƒÙ„ ÙˆØ£Ø­Ø±Ù‘ ØªØ±Ø­ÙŠØ¨ ÙÙŠ Ø§Ù„Ù‚Ø§Ù‡Ø±Ø©.', audience: 'Ù…ÙØªÙˆØ­ Ù„Ù„ÙƒÙ„', price: 350 },
  ];

  const seedPackages = [
    { id: 'pkg-starter', name: 'Ø³ØªØ§Ø±ØªØ±', price: 130, scope: 'Ø³ÙŠØ´Ù† ÙˆØ§Ø­Ø¯', desc: 'Ø³ÙŠØ´Ù† Ø³Ø§Ø¹Ø© ÙˆØ§Ø­Ø¯ØŒ Ø¹Ù„Ù‰ Ø£ÙŠ Ù†Ø´Ø§Ø·. Ù…Ø«Ø§Ù„ÙŠ Ù„Ø£ÙˆÙ„ Ù…Ø±Ø© Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙŠØ©.', benefits: ['Ø³ÙŠØ´Ù† Ø³Ø§Ø¹Ø©', 'ÙƒÙ„ Ø§Ù„Ù…Ø¹Ø¯Ø§Øª Ø¹Ù„ÙŠÙ†Ø§', 'ÙƒÙˆØªØ´ Ù…Ø¹Ø§Ùƒ Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙŠØ©', 'Ø£ÙŠ ÙŠÙˆÙ… ÙÙŠ Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹'], featured: false },
    { id: 'pkg-crew', name: 'Ø¨Ø§ÙƒØ¬ Ø§Ù„Ø±ÙÙŠÙ‚', price: 1400, scope: '9 Ø³ÙŠØ´Ù†Ø²', desc: '8 Ø³ÙŠØ´Ù†Ø²ØŒ Ø²Ø§Ø¦Ø¯ 1 Ø¨ÙˆÙ†Øµ. Ø£Ø³Ø±Ø¹ Ø·Ø±ÙŠÙ‚Ø© ØªØ¨Ù‚Ù‰ ÙƒÙˆÙŠØ³ ÙØ¹Ù„Ø§Ù‹ ÙÙŠ Ø­Ø§Ø¬Ø© Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙŠØ©.', benefits: ['9 Ø³ÙŠØ´Ù†Ø² Ø¥Ø¬Ù…Ø§Ù„Ø§Ù‹ (1 Ø¹Ù„ÙŠÙ†Ø§)', 'Ø§Ø³ØªØ®Ø¯Ù…Ù‡Ø§ Ø¹Ù„Ù‰ Ø£ÙŠ Ù†Ø´Ø§Ø·', 'ØµØ§Ù„Ø­Ø© 3 Ø´Ù‡ÙˆØ±', 'ÙƒØ§Ø¨ ÙˆØ²Ø¬Ø§Ø¬Ø© Ø£ÙƒÙˆØ§ Ù„ÙˆØ¯Ùˆ Ù‡Ø¯ÙŠØ©', 'Ø£ÙˆÙ„ÙˆÙŠØ© ÙÙŠ Ø§Ù„Ø­Ø¬Ø²'], featured: true, badge: 'Ø§Ù„Ø£ÙƒØ«Ø± Ø­Ø¨Ø§Ù‹' },
    { id: 'pkg-unlimited', name: 'ØºÙŠØ± Ù…Ø­Ø¯ÙˆØ¯', price: 1800, scope: 'Ø´Ù‡Ø±ÙŠØ§Ù‹', desc: 'ØªÙ…Ø±Ù‘Ù† ÙƒÙ„ ÙŠÙˆÙ…. Ø£Ø­Ø³Ù† Ø­Ø§Ø¬Ø© Ù„Ù„ØªØ¬Ø¯Ù‘Ø§ÙÙŠÙ† Ø¨ØªÙˆØ¹Ù†Ø§ ÙˆØ§Ù„Ù†Ø§Ø³ Ø§Ù„Ù„ÙŠ Ø¨ØªÙ‚Ø¹ ÙÙŠ Ø§Ù„Ø­Ø¨ Ù…Ù† Ø£ÙˆÙ„ ÙŠÙˆÙ….', benefits: ['Ø³ÙŠØ´Ù†Ø² ØºÙŠØ± Ù…Ø­Ø¯ÙˆØ¯Ø© Ø·ÙˆÙ„ Ø§Ù„Ø´Ù‡Ø±', 'ØªÙ…Ø±ÙŠÙ† Ø¬Ù…Ø§Ø¹ÙŠ Ø£Ø³Ø¨ÙˆØ¹ÙŠ', '10% Ø®ØµÙ… Ø¹Ù„Ù‰ Ø§Ù„Ø¥ÙŠÙÙ†ØªØ³ ÙˆØ§Ù„Ø±Ø­Ù„Ø§Øª', 'Ø¨Ø±Ù†Ø§Ù…Ø¬ ØªØ¯Ø±ÙŠØ¨ÙŠ Ø´Ø®ØµÙŠ', 'Ø¬Ø±ÙˆØ¨ ÙˆØ§ØªØ³Ø§Ø¨ Ù„Ù„Ø£Ø¹Ø¶Ø§Ø¡'], featured: false },
  ];

  const seedMemberships = [
    { id: 'mem-bronze', name: 'Ø¨Ø±ÙˆÙ†Ø²', price: 600, scope: 'Ø´Ù‡Ø±ÙŠØ§Ù‹', desc: '4 Ø³ÙŠØ´Ù†Ø² ÙÙŠ Ø§Ù„Ø´Ù‡Ø±. Ø§Ù„ØªØ²Ø§Ù… Ø®ÙÙŠÙ.', benefits: ['4 Ø³ÙŠØ´Ù†Ø² ÙÙŠ Ø§Ù„Ø´Ù‡Ø±', 'Ø£ÙŠ Ù†Ø´Ø§Ø·', 'Ø¥ÙŠÙÙ†ØªØ§Øª Ø§Ù„Ø£Ø¹Ø¶Ø§Ø¡ Ø¨Ø³', 'Ù…ÙŠØ© Ù…Ø¬Ø§Ù†Ø§Ù‹'], featured: false },
    { id: 'mem-silver', name: 'Ø³ÙŠÙ„ÙØ±', price: 1100, scope: 'Ø´Ù‡Ø±ÙŠØ§Ù‹', desc: '8 Ø³ÙŠØ´Ù†Ø² ÙÙŠ Ø§Ù„Ø´Ù‡Ø±. Ø£ÙƒØªØ± ÙˆØ§Ø­Ø¯Ø© Ø¨Ù†Ø¨ÙŠØ¹Ù‡Ø§.', benefits: ['8 Ø³ÙŠØ´Ù†Ø² ÙÙŠ Ø§Ù„Ø´Ù‡Ø±', 'Ø£ÙŠ Ù†Ø´Ø§Ø·', '10% Ø®ØµÙ… ÙˆÙŠÙƒ Ø¨ÙˆØ±Ø¯', 'Ù…Ø±Ø§Ø¬Ø¹Ø© ØªÙ‚Ø¯Ù… Ø´Ù‡Ø±ÙŠØ©', 'Ø¹Ø¯Ø© Ø£ÙƒÙˆØ§ Ù„ÙˆØ¯Ùˆ Ù‡Ø¯ÙŠØ©'], featured: true, badge: 'Ø£Ø­Ø³Ù† Ù‚ÙŠÙ…Ø©' },
    { id: 'mem-gold', name: 'Ø¬ÙˆÙ„Ø¯', price: 1800, scope: 'Ø´Ù‡Ø±ÙŠØ§Ù‹', desc: 'ÙƒÙ„ Ø­Ø§Ø¬Ø© ØºÙŠØ± Ù…Ø­Ø¯ÙˆØ¯Ø©. Ù„Ù„Ø£Ø¹Ø¶Ø§Ø¡ Ø§Ù„Ø£ÙƒØªØ± Ø§Ù„ØªØ²Ø§Ù…Ø§Ù‹ Ø¹Ù†Ø¯Ù†Ø§.', benefits: ['Ø³ÙŠØ´Ù†Ø² ØºÙŠØ± Ù…Ø­Ø¯ÙˆØ¯Ø©', 'Ø¥ÙŠÙÙ†ØªØ§Øª ØºÙŠØ± Ù…Ø­Ø¯ÙˆØ¯Ø©', 'ÙƒÙˆØªØ´ Ø´Ø®ØµÙŠ Ø¹Ù„Ù‰ Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨', 'Ù…Ø±Ø§Ø¬Ø¹Ø© Ø£Ù‡Ø¯Ø§Ù Ø±Ø¨Ø¹ Ø³Ù†ÙˆÙŠØ©', 'Ù‡Ø§Øª ØµØ§Ø­Ø¨Ùƒ Ù…Ø±ØªÙŠÙ† ÙÙŠ Ø§Ù„Ø´Ù‡Ø±'], featured: false },
  ];

  const seedBookings = [
    { id: 'bk-1', customerId: 'cust-salma', sessionId: 'seed', activityId: 'act-rowing', name: 'Salma Akl', phone: '+201234567891', notes: '', status: 'confirmed', payment: 'paid', partySize: 1, startAt: new Date(Date.now() + 86400000 * 2).toISOString(), createdAt: now(), decidedAt: now() },
    { id: 'bk-2', customerId: 'cust-farida', sessionId: 'seed', activityId: 'act-kayaking', name: 'Farida Mohamed', phone: '+201234567892', notes: 'First time, very excited!', status: 'pending', payment: 'unpaid', partySize: 2, startAt: new Date(Date.now() + 86400000 * 3).toISOString(), createdAt: now() },
    { id: 'bk-3', customerId: 'cust-andrew', sessionId: 'seed', activityId: 'act-sup', name: 'Andrew Ezzat', phone: '+201234567893', notes: 'Sunset session please', status: 'pending', payment: 'unpaid', partySize: 1, startAt: new Date(Date.now() + 86400000 * 5).toISOString(), createdAt: now() },
    { id: 'bk-4', customerId: 'cust-salma', sessionId: 'seed', activityId: 'act-wakeboard', name: 'Salma Akl', phone: '+201234567891', notes: '', status: 'confirmed', payment: 'deposit_paid', partySize: 1, startAt: new Date(Date.now() - 86400000 * 4).toISOString(), createdAt: now(), decidedAt: now() },
    { id: 'bk-5', customerId: 'cust-farida', sessionId: 'seed', activityId: 'act-rowing', name: 'Farida Mohamed', phone: '+201234567892', notes: '', status: 'confirmed', payment: 'paid', partySize: 1, startAt: new Date(Date.now() - 86400000 * 10).toISOString(), createdAt: now(), decidedAt: now() },
    { id: 'bk-6', customerId: 'cust-andrew', sessionId: 'seed', activityId: 'act-rowing', name: 'Andrew Ezzat', phone: '+201234567893', notes: '', status: 'cancelled', payment: 'refunded', partySize: 1, startAt: new Date(Date.now() - 86400000 * 2).toISOString(), createdAt: now(), decidedAt: now() },
  ];

  function seed() {
    if (read(K.seeded)) {
      migratePhotos();
      return;
    }
    write(K.activities, seedActivities);
    write(K.schedules, seedSchedules);
    write(K.coaches, seedCoaches);
    write(K.customers, seedCustomers);
    write(K.reviews, seedReviews);
    write(K.events, seedEvents);
    write(K.packages, seedPackages);
    write(K.memberships, seedMemberships);
    write(K.bookings, seedBookings);
    write(K.sessions, buildSeedSessions());
    write(K.seeded, true);
  }

  function migratePhotos() {
    const acts = read(K.activities, []);
    let changed = false;
    acts.forEach(a => {
      if (ACTIVITY_PHOTOS[a.slug] && String(a.hero || '').startsWith('data:image')) {
        a.hero = photo(a.slug);
        changed = true;
      }
    });
    if (changed) write(K.activities, acts);
  }

  const DB = {
    init: seed,
    reset: () => {
      Object.values(K).forEach(k => localStorage.removeItem(k));
      seed();
    },

    dayName, monthName, ADMIN_PASSWORD,
    buildArt, buildAvatar, buildEventArt, photo,
    ACTIVITY_PHOTOS,

    activities: {
      all: () => read(K.activities, []),
      active: () => read(K.activities, []).filter(a => a.active),
      get: (slug) => read(K.activities, []).find(a => a.slug === slug),
      getById: (id) => read(K.activities, []).find(a => a.id === id),
      create: (data) => {
        const a = read(K.activities);
        const next = { id: 'act-' + uid(), active: true, pricing: [], included: [], bring: [], ...data };
        a.push(next); write(K.activities, a); return next;
      },
      update: (id, data) => {
        const a = read(K.activities);
        const i = a.findIndex(x => x.id === id);
        if (i < 0) return null;
        a[i] = { ...a[i], ...data }; write(K.activities, a); return a[i];
      },
      archive: (id) => {
        const a = read(K.activities);
        const i = a.findIndex(x => x.id === id);
        if (i < 0) return;
        a[i].active = false; write(K.activities, a);
      },
    },

    schedules: {
      for: (activityId) => read(K.schedules).filter(s => s.activityId === activityId),
      set: (activityId, slots) => {
        const all = read(K.schedules).filter(s => s.activityId !== activityId);
        const fresh = slots.map(s => ({ id: s.id || uid(), activityId, ...s }));
        write(K.schedules, [...all, ...fresh]);
      },
    },

    sessions: {
      upcoming: () => read(K.sessions, []).filter(s => s.status === 'scheduled' && new Date(s.startsAt) > new Date()).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)),
      all: () => read(K.sessions, []).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)),
      get: (id) => read(K.sessions, []).find(s => s.id === id),
      create: (data) => {
        const a = read(K.sessions, []);
        const next = { id: 'ses-' + uid(), status: 'scheduled', booked: 0, ...data };
        a.push(next); write(K.sessions, a); return next;
      },
      remove: (id) => write(K.sessions, read(K.sessions, []).filter(s => s.id !== id)),
    },

    bookings: {
      all: () => read(K.bookings, []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      get: (id) => read(K.bookings, []).find(b => b.id === id),
      forCustomer: (customerId) => read(K.bookings, []).filter(b => b.customerId === customerId),
      today: () => {
        const t = today();
        return read(K.bookings, []).filter(b => b.startAt && b.startAt.slice(0, 10) === t);
      },
      thisMonth: () => {
        const d = new Date();
        const m = d.getMonth(), y = d.getFullYear();
        return read(K.bookings, []).filter(b => {
          const bd = new Date(b.startAt);
          return bd.getMonth() === m && bd.getFullYear() === y;
        });
      },
      create: (data) => {
        const a = read(K.bookings, []);
        const next = { id: 'bk-' + uid(), status: 'pending', payment: 'unpaid', partySize: 1, createdAt: now(), ...data };
        a.push(next); write(K.bookings, a); return next;
      },
      update: (id, data) => {
        const a = read(K.bookings, []);
        const i = a.findIndex(x => x.id === id);
        if (i < 0) return null;
        a[i] = { ...a[i], ...data }; write(K.bookings, a); return a[i];
      },
      confirm: (id) => {
        const a = read(K.bookings, []);
        const i = a.findIndex(x => x.id === id);
        if (i < 0) return;
        a[i].status = 'confirmed'; a[i].decidedAt = now(); write(K.bookings, a);
      },
      cancel: (id) => {
        const a = read(K.bookings, []);
        const i = a.findIndex(x => x.id === id);
        if (i < 0) return;
        a[i].status = 'cancelled'; a[i].decidedAt = now(); write(K.bookings, a);
      },
    },

    customers: {
      all: () => read(K.customers, []),
      get: (id) => read(K.customers, []).find(c => c.id === id),
      findByEmail: (email) => read(K.customers, []).find(c => c.email && c.email.toLowerCase() === email.toLowerCase()),
      findByPhone: (phone) => read(K.customers, []).find(c => c.phone && c.phone === phone),
      findOrCreate: (data) => {
        const a = read(K.customers, []);
        let c = a.find(x => x.email && data.email && x.email.toLowerCase() === data.email.toLowerCase());
        if (c) return c;
        c = { id: 'cust-' + uid(), createdAt: now(), ...data };
        a.push(c); write(K.customers, a); return c;
      },
    },

    authCodes: {
      create: (email) => {
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const a = read(K.codes, []);
        a.push({ id: uid(), email: email.toLowerCase(), code, expiresAt: Date.now() + 10 * 60 * 1000, used: false });
        write(K.codes, a);
        return code;
      },
      verify: (email, code) => {
        const a = read(K.codes, []);
        const c = a.find(x => x.email === email.toLowerCase() && x.code === code && !x.used && x.expiresAt > Date.now());
        if (!c) return false;
        c.used = true; write(K.codes, a);
        return true;
      },
    },

    session: {
      set: (customerId) => { write(K.session, { customerId, since: now() }); },
      get: () => read(K.session),
      clear: () => { localStorage.removeItem(K.session); },
    },

    reviews: {
      for: (slug) => read(K.reviews, []).filter(r => r.activitySlug === slug && r.approved).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      create: (data) => {
        const a = read(K.reviews, []);
        const next = { id: uid(), approved: true, createdAt: now(), ...data };
        a.push(next); write(K.reviews, a); return next;
      },
    },

    events: {
      all: () => read(K.events, []).sort((a, b) => new Date(a.date) - new Date(b.date)),
      upcoming: () => read(K.events, []).filter(e => new Date(e.date) >= new Date(today())).sort((a, b) => new Date(a.date) - new Date(b.date)),
      get: (slug) => read(K.events, []).find(e => e.slug === slug),
      create: (data) => {
        const a = read(K.events, []);
        const next = { id: 'evt-' + uid(), ...data };
        a.push(next); write(K.events, a); return next;
      },
      remove: (id) => write(K.events, read(K.events, []).filter(e => e.id !== id)),
    },

    coaches: {
      all: () => read(K.coaches, []),
      get: (id) => read(K.coaches, []).find(c => c.id === id),
      byToken: (token) => read(K.coaches, []).find(c => c.token === token && c.active),
    },

    packages: { all: () => read(K.packages, []) },
    memberships: { all: () => read(K.memberships, []) },

    admin: {
      login: (password) => {
        if (password !== ADMIN_PASSWORD) return false;
        write(K.admin, { since: now() });
        return true;
      },
      logout: () => { localStorage.removeItem(K.admin); },
      isAuth: () => !!read(K.admin),
    },

    contact: {
      create: (data) => {
        const a = read(K.contact, []);
        const next = { id: uid(), createdAt: now(), ...data };
        a.push(next); write(K.contact, a); return next;
      },
      all: () => read(K.contact, []),
    },

    formatEGP: (n) => 'EGP ' + Number(n).toLocaleString('en-EG', { minimumFractionDigits: 0 }),
    formatDate: (iso) => {
      const d = new Date(iso);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    },
    formatDateShort: (iso) => {
      const d = new Date(iso);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    },
    formatTime: (iso) => {
      const d = new Date(iso);
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    },
  };

  global.AquaDB = DB;
  DB.init();
})(window);
