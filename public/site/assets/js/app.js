(function (global) {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const BASE = (function () {
    const s = document.querySelector('script[src*="assets/js/app.js"]');
    if (!s) return '';
    const src = s.getAttribute('src') || '';
    const i = src.indexOf('assets/js/');
    return i >= 0 ? src.substring(0, i) : '';
  })();
  const isAdminPath = () => { const path = location.pathname; return path.includes('/admin/') || path.endsWith('/admin') || /\/admin(\/|$|\.)/.test(path); };
  const isPublicPath = () => !isAdminPath();
  const LANG = (global.AQUA_LANG || 'en') === 'ar' ? 'ar' : 'en';
  const AR = LANG === 'ar';
  const T = (ar, en) => AR ? ar : en;
  const LOC = AR ? 'ar-EG' : 'en-GB';
  const EGP = (n) => (AR ? Number(n).toLocaleString('ar-EG') + ' ج' : 'EGP ' + Number(n).toLocaleString('en-GB'));
  const ROOT = (BASE.startsWith('../') ? '../' + BASE : '');
  const NAV = global.AQUA_NAV || null;
  const rootHome = () => (NAV ? NAV.home() : ROOT + 'index.html');
  const pagesBase = () => (NAV ? NAV.pages('') : ROOT + 'site/pages/');
  const adminBase = () => (NAV ? NAV.admin('') : ROOT + 'site/admin/');
  const langSwitchHref = () => (global.AQUA_COUNTERPART || '#');
  const langSwitchLink = () => `
      <a class="nav-lang-btn" href="${langSwitchHref()}" data-lang-switch="${T('en', 'ar')}" aria-label="${T('English', 'العربية')}" title="${T('English', 'العربية')}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        <span>${T('EN', 'عربي')}</span>
      </a>`;

  function renderHeader(active) {
    const isAdmin = isAdminPath();
    if (isAdmin) return '';
    const session = (typeof AquaDB !== 'undefined' && AquaDB.session) ? AquaDB.session.get() : null;
    const customer = session ? AquaDB.customers.get(session.customerId) : null;
    const userLabel = customer ? (customer.name.split(' ')[0]) : T('حسابي', 'My Account');
    return `
      <header class="site-header" id="header">
        <div class="container row">
          <a href="${rootHome()}" class="logo">
            <span class="logo-mark"><img src="${BASE}assets/img/boat.png" alt="${T('أكوا لودو', 'Aqua Ludo')}" /></span>
            <span>${T('أكوا لودو', 'Aqua Ludo')}</span>
          </a>
          <nav class="nav-links">
            <a href="${pagesBase()}activities.html"${active === 'activities' ? ' class="active"' : ''}>${T('الأنشطة', 'Activities')}</a>
            <a href="${pagesBase()}pricing.html"${active === 'pricing' ? ' class="active"' : ''}>${T('الأسعار', 'Pricing')}</a>
            <a href="${pagesBase()}events.html"${active === 'events' ? ' class="active"' : ''}>${T('الإيفنتات', 'Events')}</a>
            <a href="${pagesBase()}about.html"${active === 'about' ? ' class="active"' : ''}>${T('مين احنا', 'About')}</a>
            <a href="${pagesBase()}contact.html"${active === 'contact' ? ' class="active"' : ''}>${T('تواصل', 'Contact')}</a>
          </nav>
          <div class="nav-cta">
            ${langSwitchLink()}
            <button class="header-search" id="headerSearch" type="button" aria-label="${T('ابحث', 'Search')}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="${T('ابحث', 'Search')}" readonly tabindex="-1" />
              <span class="kbd">Ctrl K</span>
            </button>
            <div style="position: relative;">
              <button class="nav-user-btn" id="navUserBtn" type="button" aria-haspopup="true" aria-expanded="false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span>${userLabel}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="user-menu" id="userMenu" role="menu">
                ${customer ? `
                  <div class="label">${customer.name}</div>
                  <a href="${pagesBase()}account.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${T('حجوزاتي', 'My Bookings')}</a>
                  <a href="${pagesBase()}account-profile.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${T('البروفايل', 'Profile')}</a>
                  <div class="divider"></div>
                ` : ''}
                <a href="${pagesBase()}sign-in.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>${customer ? T('تبديل الحساب', 'Switch Account') : T('دخول', 'Sign In')}</a>
                <a href="${pagesBase()}booking.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/></svg>${T('احجز سيشن', 'Book a Session')}</a>
                <div class="divider"></div>
                <a href="${adminBase()}login.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>${T('دخول الموظف', 'Staff Login')}</a>
                ${customer ? `<button type="button" id="signOutBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>${T('خروج', 'Sign Out')}</button>` : ''}
              </div>
            </div>
            <a href="${pagesBase()}booking.html" class="btn btn-primary" style="padding: 10px 18px; font-size: 0.88rem;">${T('احجز دلوقتي', 'Book Now')}</a>
            <button class="menu-toggle" id="menuToggle" aria-label="${T('القائمة', 'Menu')}"><span></span></button>
          </div>
        </div>
      </header>
      <div class="mobile-menu" id="mobileMenu">
        <a href="${pagesBase()}activities.html">${T('الأنشطة', 'Activities')}</a>
        <a href="${pagesBase()}pricing.html">${T('الأسعار', 'Pricing')}</a>
        <a href="${pagesBase()}events.html">${T('الإيفنتات', 'Events')}</a>
        <a href="${pagesBase()}about.html">${T('مين احنا', 'About')}</a>
        <a href="${pagesBase()}contact.html">${T('تواصل', 'Contact')}</a>
        <a href="${pagesBase()}account.html">${T('حسابي', 'My Account')}</a>
        <a href="${pagesBase()}booking.html" class="btn btn-primary btn-lg" style="margin-top: 16px;">${T('احجز سيشن', 'Book a Session')}</a>
      </div>
      <nav class="bottom-nav" id="bottomNav" aria-label="${T('التنقل السريع', 'Quick navigation')}">
        <a href="${rootHome()}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5 12 2l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z"/></svg>
          <span>${T('الرئيسية', 'Home')}</span>
        </a>
        <a href="${pagesBase()}activities.html">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.5" cy="6.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/><path d="M6.5 8.5v7M17.5 15.5v-7M6.5 15.5 17.5 8.5"/></svg>
          <span>${T('الأنشطة', 'Activities')}</span>
        </a>
        <button type="button" data-qb="1" aria-label="${T('احجز سيشن', 'Book a session')}" class="bn-book">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <a href="${pagesBase()}events.html">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>${T('الإيفنتات', 'Events')}</span>
        </a>
        <a href="${pagesBase()}account.html">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>${T('حسابي', 'My Account')}</span>
        </a>
      </nav>
    `;
  }

  function renderFooter() {
    return `
      <div class="footer-quickbar">
        <div class="container">
          <div class="footer-quickbar-inner">
            <div class="fqb-text">
              <span class="eyebrow" style="color: var(--coral);">${T('جاهز تنزل المية؟', 'Ready to hit the water?')}</span>
              <h3>${T('احجز سيشنك دلوقتي في 3 نقرات.', 'Book your session now in 3 clicks.')}</h3>
            </div>
            <div class="fqb-actions">
              <a href="${pagesBase()}booking.html" class="btn btn-primary">${T('احجز سيشن', 'Book a Session')}</a>
              <a href="https://wa.me/201011329642?text=${T('عايز%20استفسر', 'Hello%20Aqua%20Ludo%2C%20I%20have%20a%20question')}" target="_blank" rel="noopener" class="btn" style="background:#25D366;color:#fff;">${T('كلمنا واتساب', 'WhatsApp Us')}</a>
              <a href="tel:+201011329642" class="btn btn-light">${T('اتصل بينا', 'Call Us')}</a>
            </div>
          </div>
        </div>
      </div>
      <footer>
        <div class="container">
          <div class="footer-grid">
            <div class="footer-brand">
              <a href="${rootHome()}" class="logo">
                <span class="logo-mark"><img src="${BASE}assets/img/boat.png" alt="${T('أكوا لودو', 'Aqua Ludo')}" /></span>
                <span>${T('أكوا لودو', 'Aqua Ludo')}</span>
              </a>
              <p>${T('أكوا لودو هو بيتك في القاهرة للتجديف، الكياك، SUP، ويك بورد، وفتنس على المية. على النيل، في الدقي، من 2017.', 'Aqua Ludo is your home in Cairo for rowing, kayaking, SUP, wakeboarding and on-water fitness. On the Nile, in Dokki, since 2017.')}</p>
              <div class="socials">
                <a href="https://instagram.com/oarnsail" target="_blank" rel="noopener" aria-label="${T('انستجرام', 'Instagram')}">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener" aria-label="${T('فيسبوك', 'Facebook')}">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg>
                </a>
                <a href="https://wa.me/201011329642" target="_blank" rel="noopener" aria-label="${T('واتساب', 'WhatsApp')}">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                </a>
                <a href="mailto:Oarnsail1@gmail.com" aria-label="${T('إيميل', 'Email')}">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </a>
              </div>
            </div>
            <div class="footer-col">
              <h4>${T('زورنا', 'Visit')}</h4>
              <ul>
                <li><a href="${pagesBase()}activities.html">${T('الأنشطة', 'Activities')}</a></li>
                <li><a href="${pagesBase()}pricing.html">${T('الأسعار', 'Pricing')}</a></li>
                <li><a href="${pagesBase()}events.html">${T('الإيفنتات', 'Events')}</a></li>
                <li><a href="${pagesBase()}about.html">${T('مين احنا', 'About')}</a></li>
                <li><a href="${pagesBase()}contact.html">${T('تواصل', 'Contact')}</a></li>
              </ul>
            </div>
            <div class="footer-col">
              <h4>${T('الحساب', 'Account')}</h4>
              <ul>
                <li><a href="${pagesBase()}booking.html">${T('احجز سيشن', 'Book a Session')}</a></li>
                <li><a href="${pagesBase()}account.html">${T('حجوزاتي', 'My Bookings')}</a></li>
                <li><a href="${pagesBase()}account-profile.html">${T('البروفايل', 'Profile')}</a></li>
                <li><a href="${pagesBase()}sign-in.html">${T('دخول', 'Sign In')}</a></li>
                <li><a href="${adminBase()}login.html">${T('دخول الموظفين', 'Staff Login')}</a></li>
              </ul>
            </div>
            <div class="footer-col">
              <h4>${T('تواصل', 'Contact')}</h4>
              <ul>
                <li>${T('114 شارع النيل، الدقي', '114 Nile Street, Dokki')}</li>
                <li>${T('الدقي، الجيزة 3750432', 'Dokki, Giza 3750432')}</li>
                <li><a href="tel:+201011329642">+20 101 132 9642</a></li>
                <li><a href="https://wa.me/201011329642" target="_blank" rel="noopener">${T('كلمنا واتساب', 'WhatsApp Us')}</a></li>
                <li><a href="mailto:Oarnsail1@gmail.com">Oarnsail1@gmail.com</a></li>
              </ul>
            </div>
          </div>
          <div class="footer-bottom">
            <p>© 2026 ${T('أكوا لودو. كل الحقوق محفوظة.', 'Aqua Ludo. All rights reserved.')}</p>
            <p>${T('متعمّل بحب على النيل.', 'Made with love on the Nile.')}</p>
          </div>
        </div>
      </footer>
      <a class="wa-float" href="https://wa.me/201011329642?text=${T('أهلاً%20أكوا%20لودو،%20عايز%20أحجز%20سيشن', 'Hello%20Aqua%20Ludo%2C%20I%20want%20to%20book%20a%20session')}" target="_blank" rel="noopener" aria-label="${T('كلمنا واتساب', 'WhatsApp us')}">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
      </a>
      <a class="admin-float" href="${adminBase()}login.html" id="adminFloat" aria-label="${T('لوحة التحكم', 'Dashboard')}" title="${T('لوحة التحكم', 'Dashboard')}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </a>

      <div class="fab-hub" id="fabHub">
        <button class="fab-main" id="fabMain" type="button" aria-label="${T('إجراءات سريعة', 'Quick actions')}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <div class="fab-actions" id="fabActions">
          <button type="button" class="fab-action primary" data-fab="book">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/></svg>
            ${T('احجز سيشن', 'Book a Session')}
          </button>
          <a class="fab-action wa" href="https://wa.me/201011329642?text=${T('أهلاً%20أكوا%20لودو', 'Hello%20Aqua%20Ludo')}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
            ${T('واتساب', 'WhatsApp')}
          </a>
          <a class="fab-action" href="tel:+201011329642">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            ${T('اتصل', 'Call')}
          </a>
          <a class="fab-action" href="${pagesBase()}activities.html">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.5" cy="6.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/><path d="M6.5 8.5v7M17.5 15.5v-7M6.5 15.5 17.5 8.5"/></svg>
            ${T('الأنشطة', 'Activities')}
          </a>
          <a class="fab-action" href="${pagesBase()}events.html">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${T('الإيفنتات', 'Events')}
          </a>
          <a class="fab-action" href="${pagesBase()}account.html">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            ${T('حسابي', 'My Account')}
          </a>
        </div>
      </div>

      <div class="cmdk-backdrop" id="cmdk" role="dialog" aria-modal="true" aria-label="${T('بحث سريع', 'Quick search')}">
        <div class="cmdk" role="document">
          <div class="cmdk-input-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" class="cmdk-input" id="cmdkInput" placeholder="${T('ابحث في الأنشطة، الإيفنتات، الباكدجز… أو اكتب إجراء', 'Search activities, events, packages… or type an action')}" autocomplete="off" />
            <span class="kbd">ESC</span>
          </div>
          <div class="cmdk-results" id="cmdkResults"></div>
          <div class="cmdk-hint">
            <span><span class="kbd">↑</span><span class="kbd">↓</span> ${T('تنقل', 'Navigate')}</span>
            <span><span class="kbd">↵</span> ${T('تنفيذ', 'Run')}</span>
            <span><span class="kbd">Ctrl K</span> ${T('فتح / إغلاق', 'Open / Close')}</span>
          </div>
        </div>
      </div>

      <div class="modal-backdrop" id="qbModal" role="dialog" aria-modal="true" aria-label="${T('احجز سيشن سريع', 'Quick book a session')}">
        <div class="modal" role="document">
          <div class="modal-head">
            <h2>${T('احجز سيشن سريع', 'Quick Book')}</h2>
            <button class="modal-close" type="button" data-close-qb aria-label="${T('إغلاق', 'Close')}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body" id="qbBody"></div>
          <div class="modal-foot">
            <small class="muted" id="qbHint">${T('اختار نشاط وموعد وسيب الباقي علينا.', 'Pick an activity and time, leave the rest to us.')}</small>
            <div style="display: flex; gap: 8px;">
              <a href="${pagesBase()}booking.html" class="btn btn-ghost">${T('الصفحة الكاملة', 'Full Page')}</a>
              <button type="button" class="btn btn-primary" id="qbSubmit" disabled>${T('ابعت الطلب', 'Send Request')}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-backdrop" id="activityModal" role="dialog" aria-modal="true" aria-label="${T('عرض النشاط', 'View activity')}">
        <div class="modal" role="document"></div>
      </div>

      <div class="shortcut-overlay" id="shortcutOverlay" role="dialog" aria-modal="true">
        <div class="shortcut-card">
          <div class="sh-head">
            <h2>${T('اختصارات الكيبورد', 'Keyboard Shortcuts')}</h2>
            <button class="modal-close" type="button" data-close-shortcuts aria-label="${T('إغلاق', 'Close')}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="sh-body">
            <div class="shortcut-row"><span>${T('فتح البحث السريع', 'Open quick search')}</span><span class="kbd"><span>Ctrl</span><span>K</span></span></div>
            <div class="shortcut-row"><span>${T('حجز سريع', 'Quick book')}</span><span class="kbd"><span>B</span></span></div>
            <div class="shortcut-row"><span>${T('فتح / إغلاق قائمة الإجراءات', 'Open / close action menu')}</span><span class="kbd"><span>.</span></span></div>
            <div class="shortcut-row"><span>${T('الانتقال للرئيسية', 'Go to home')}</span><span class="kbd"><span>G</span><span>H</span></span></div>
            <div class="shortcut-row"><span>${T('الانتقال للأنشطة', 'Go to activities')}</span><span class="kbd"><span>G</span><span>A</span></span></div>
            <div class="shortcut-row"><span>${T('الانتقال للحساب', 'Go to account')}</span><span class="kbd"><span>G</span><span>M</span></span></div>
            <div class="shortcut-row"><span>${T('الانتقال للأسعار', 'Go to pricing')}</span><span class="kbd"><span>G</span><span>P</span></span></div>
            <div class="shortcut-row"><span>${T('الانتقال للإيفنتات', 'Go to events')}</span><span class="kbd"><span>G</span><span>E</span></span></div>
            <div class="shortcut-row"><span>${T('إغلاق أي نافذة', 'Close any window')}</span><span class="kbd"><span>ESC</span></span></div>
            <div class="shortcut-row"><span>${T('عرض الاختصارات', 'Show shortcuts')}</span><span class="kbd"><span>?</span></span></div>
          </div>
        </div>
      </div>
    `;
  }

  function renderAdminShell(active) {
    const isAuth = typeof AquaDB !== 'undefined' && AquaDB.admin && AquaDB.admin.isAuth && AquaDB.admin.isAuth();
    if (!isAuth) return '';
    const stats = adminStats();
    const path = location.pathname.split('/').pop() || 'index.html';
    const adminHref = (p) => adminBase() + p;
    return `
      <div class="adm-shell">
        <div class="adm-sidebar-scrim" id="admScrim"></div>
        <aside class="adm-sidebar" id="admSidebar" aria-label="${T('تنقل الموظف', 'Staff navigation')}">
          <a href="${adminHref('index.html')}" class="logo">
            <span class="logo-mark"><img src="${BASE}assets/img/boat.png" alt="${T('أكوا لودو', 'Aqua Ludo')}" /></span>
            <span>${T('أكوا لودو · لوحة التحكم', 'Aqua Ludo · Dashboard')}</span>
          </a>
          <div class="adm-nav">
            <div class="adm-section-label">${T('الرئيسية', 'Main')}</div>
            <a href="${adminHref('index.html')}" class="adm-link ${path === 'index.html' ? 'active' : ''}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5 12 2l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z"/></svg>
              ${T('نظرة عامة', 'Overview')}
            </a>
            <a href="${adminHref('bookings.html')}" class="adm-link ${path === 'bookings.html' ? 'active' : ''} ${stats.pending > 0 ? 'has-pulse' : ''}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${T('الحجوزات', 'Bookings')}
              ${stats.pending > 0 ? `<span class="badge">${stats.pending}</span>` : ''}
            </a>
            <div class="adm-section-label">${T('المحتوى', 'Content')}</div>
            <a href="${adminHref('activities.html')}" class="adm-link ${path === 'activities.html' ? 'active' : ''}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.5" cy="6.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/><path d="M6.5 8.5v7M17.5 15.5v-7M6.5 15.5 17.5 8.5"/></svg>
              ${T('الأنشطة', 'Activities')}
            </a>
            <a href="${pagesBase()}events.html" class="adm-link" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.8 5.8 21 7 14 2 9.3 9 8.5 12 2"/></svg>
              ${T('الإيفنتات', 'Events')}
            </a>
            <div class="adm-section-label">${T('العملاء', 'Customers')}</div>
            <a href="${adminHref('contacts.html')}" class="adm-link ${path === 'contacts.html' ? 'active' : ''} ${stats.newContacts > 0 ? 'has-pulse' : ''}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              ${T('الرسايل', 'Messages')}
              ${stats.newContacts > 0 ? `<span class="badge">${stats.newContacts}</span>` : ''}
            </a>
            <div class="adm-section-label">${T('أدوات', 'Tools')}</div>
            <a href="${pagesBase()}booking.html" target="_blank" rel="noopener" class="adm-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              ${T('حجز جديد', 'New Booking')}
            </a>
            <a href="${rootHome()}" target="_blank" rel="noopener" class="adm-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              ${T('عرض الموقع', 'View Site')}
            </a>
          </div>
          <div class="adm-user">
            <div class="avatar">A</div>
            <div class="who">
              <strong>Admin</strong>
              <small>${T('مرحباً 👋', 'Welcome 👋')}</small>
            </div>
            <button class="logout" id="admLogout" type="button" aria-label="${T('خروج', 'Log out')}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </aside>
        <div class="adm-content">
          <div class="adm-topbar">
            <div style="display: flex; align-items: center; gap: 12px;">
              <button class="adm-sidebar-toggle" id="admSidebarToggle" type="button" aria-label="${T('القائمة', 'Menu')}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
              <div class="adm-title" id="admPageTitle">${admPageTitle(path)}</div>
            </div>
            <div class="adm-quick" id="admQuick"></div>
            <a class="adm-lang" href="${langSwitchHref()}" data-lang-switch="${T('en', 'ar')}" aria-label="${T('English', 'العربية')}" title="${T('English', 'العربية')}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <span>${T('EN', 'عربي')}</span>
            </a>
          </div>
          <div class="adm-main" id="admMain"></div>
        </div>
      </div>

      <div class="cmdk-backdrop" id="cmdk" role="dialog" aria-modal="true" aria-label="${T('بحث سريع', 'Quick search')}">
        <div class="cmdk" role="document">
          <div class="cmdk-input-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" class="cmdk-input" id="cmdkInput" placeholder="${T('ابحث، روح لقسم، أو نفّذ إجراء…', 'Search, go to a section, or run an action…')}" autocomplete="off" />
            <span class="kbd">ESC</span>
          </div>
          <div class="cmdk-results" id="cmdkResults"></div>
          <div class="cmdk-hint">
            <span><span class="kbd">↑</span><span class="kbd">↓</span> ${T('تنقل', 'Navigate')}</span>
            <span><span class="kbd">↵</span> ${T('تنفيذ', 'Run')}</span>
            <span><span class="kbd">Ctrl K</span> ${T('فتح / إغلاق', 'Open / Close')}</span>
          </div>
        </div>
      </div>

      <div class="shortcut-overlay" id="shortcutOverlay" role="dialog" aria-modal="true">
        <div class="shortcut-card">
          <div class="sh-head">
            <h2>${T('اختصارات الكيبورد', 'Keyboard Shortcuts')}</h2>
            <button class="modal-close" type="button" data-close-shortcuts aria-label="${T('إغلاق', 'Close')}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="sh-body">
            <div class="shortcut-row"><span>${T('فتح البحث السريع', 'Open quick search')}</span><span class="kbd"><span>Ctrl</span><span>K</span></span></div>
            <div class="shortcut-row"><span>${T('الذهاب للرئيسية', 'Go to home')}</span><span class="kbd"><span>G</span><span>H</span></span></div>
            <div class="shortcut-row"><span>${T('الذهاب للحجوزات', 'Go to bookings')}</span><span class="kbd"><span>G</span><span>B</span></span></div>
            <div class="shortcut-row"><span>${T('الذهاب للأنشطة', 'Go to activities')}</span><span class="kbd"><span>G</span><span>A</span></span></div>
            <div class="shortcut-row"><span>${T('الذهاب للرسايل', 'Go to messages')}</span><span class="kbd"><span>G</span><span>C</span></span></div>
            <div class="shortcut-row"><span>${T('إضافة حجز', 'Add booking')}</span><span class="kbd"><span>N</span></span></div>
            <div class="shortcut-row"><span>${T('تأكيد الحجز المحدد', 'Confirm selected booking')}</span><span class="kbd"><span>X</span></span></div>
            <div class="shortcut-row"><span>${T('خروج', 'Log out')}</span><span class="kbd"><span>Q</span></span></div>
            <div class="shortcut-row"><span>${T('عرض الاختصارات', 'Show shortcuts')}</span><span class="kbd"><span>?</span></span></div>
          </div>
        </div>
      </div>
    `;
  }

  function admPageTitle(p) {
    if (p === 'index.html') return T('نظرة عامة', 'Overview');
    if (p === 'bookings.html') return T('الحجوزات', 'Bookings');
    if (p === 'activities.html') return T('الأنشطة', 'Activities');
    if (p === 'contacts.html') return T('رسايل الاتصال', 'Contact Messages');
    if (p === 'login.html') return T('دخول الموظف', 'Staff Login');
    return T('لوحة التحكم', 'Dashboard');
  }

  function adminStats() {
    if (typeof AquaDB === 'undefined') return { pending: 0, newContacts: 0 };
    const all = AquaDB.bookings ? AquaDB.bookings.all() : [];
    const pending = all.filter(b => b.status === 'pending').length;
    const newContacts = AquaDB.contact ? AquaDB.contact.all().length : 0;
    return { pending, newContacts };
  }

  function bindAdminShell() {
    const sidebar = $('#admSidebar');
    const scrim = $('#admScrim');
    const toggle = $('#admSidebarToggle');
    if (toggle && sidebar && scrim) {
      toggle.addEventListener('click', () => { sidebar.classList.toggle('open'); scrim.classList.toggle('open'); });
      scrim.addEventListener('click', () => { sidebar.classList.remove('open'); scrim.classList.remove('open'); });
    }
    const logout = $('#admLogout');
    if (logout) {
      logout.addEventListener('click', () => {
        AquaDB.admin.logout();
        toast(T('خرجت', 'Signed out'), 'success');
        setTimeout(() => location.href = adminBase() + 'login.html', 400);
      });
    }
  }

  function renderSplash() {
    return `
      <div id="splash" aria-hidden="true">
        <div class="splash-mark" id="splash-text">
          <h1>${T('أكوا لودو', 'Aqua Ludo')}</h1>
          <p>${T('بنشق الموج', 'We ride the waves')}</p>
        </div>
        <svg class="splash-svg" width="100%" height="100%">
          <defs>
            <mask id="tri-mask">
              <rect width="100%" height="100%" fill="white" />
              <polygon id="tri-path" points="" fill="black" />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="#FF5A3C" mask="url(#tri-mask)" />
          <line id="foam-l" class="foam" x1="0" y1="0" x2="0" y2="0" />
          <line id="foam-r" class="foam" x1="0" y1="0" x2="0" y2="0" />
        </svg>
        <div class="boat-glide" id="boat-glide">
          <img src="${BASE}assets/img/boat.png" alt="" />
        </div>
      </div>
    `;
  }

  function runSplash() {
    const splash = $('#splash');
    if (!splash) return;
    const nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || null;
    const isReload = !!(nav && nav.type === 'reload');
    const isBackForward = !!(nav && nav.type === 'back_forward');
    if (sessionStorage.getItem('aqualudo_splash_seen') && !isReload && !isBackForward) {
      splash.classList.add('hidden');
      document.body.classList.remove('loading');
      return;
    }
    if (isReload) sessionStorage.removeItem('aqualudo_splash_seen');
    const triPath = $('#tri-path', splash);
    const boat = $('#boat-glide', splash);
    const foamL = $('#foam-l', splash);
    const foamR = $('#foam-r', splash);
    const splashText = $('#splash-text', splash);
    const duration = 2600;
    let start = null;
    function tick(t) {
      if (!start) start = t;
      const elapsed = t - start;
      const p = Math.min(elapsed / duration, 1);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const W = window.innerWidth, H = window.innerHeight;
      const rect = boat.getBoundingClientRect();
      const bH = rect.height || 200, bW = rect.width || 60;
      const startY = -bH, endY = H + bH + 40;
      const y = startY + (endY - startY) * e;
      const x = W / 2;
      boat.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      if (p > 0.05 && p < 0.95 && Math.random() < 0.5) makeSpray(splash, x, y, bW);
      if (y > H * 0.28) {
        splashText.style.opacity = Math.max(0, 1 - (y - H * 0.28) / (H * 0.3));
      }
      const apexX = x;
      const apexY = y + bH * 0.46;
      const spread = Math.max(0, (y / H) * (W * 0.98) + 40);
      const tlx = apexX - spread, tly = -100;
      const trx = apexX + spread, tryY = -100;
      triPath.setAttribute('points', `${apexX},${apexY} ${tlx},${tly} ${trx},${tryY}`);
      foamL.setAttribute('x1', apexX); foamL.setAttribute('y1', apexY); foamL.setAttribute('x2', tlx); foamL.setAttribute('y2', tly);
      foamR.setAttribute('x1', apexX); foamR.setAttribute('y1', apexY); foamR.setAttribute('x2', trx); foamR.setAttribute('y2', tryY);
      if (p < 1) requestAnimationFrame(tick);
      else {
        splash.classList.add('hidden');
        document.body.classList.remove('loading');
        sessionStorage.setItem('aqualudo_splash_seen', '1');
      }
    }
    function makeSpray(parent, x, y, w) {
      const s = document.createElement('div');
      s.className = 'spray';
      const side = Math.random() > 0.5 ? 1 : -1;
      const offX = side * (w * 0.45 + Math.random() * 12);
      const size = Math.random() * 8 + 5;
      s.style.width = `${size}px`;
      s.style.height = `${size}px`;
      s.style.left = `${x + offX}px`;
      s.style.top = `${y}px`;
      parent.appendChild(s);
      setTimeout(() => s.remove(), 700);
    }
    setTimeout(() => requestAnimationFrame(tick), 200);
  }

  function bindHeader() {
    const header = $('#header');
    if (header) {
      const onScroll = () => {
        if (window.scrollY > 30) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
    const menuToggle = $('#menuToggle');
    const mobileMenu = $('#mobileMenu');
    if (menuToggle && mobileMenu) {
      menuToggle.addEventListener('click', () => {
        mobileMenu.classList.toggle('open');
        document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
      });
      mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      }));
    }
    const userBtn = $('#navUserBtn');
    const userMenu = $('#userMenu');
    if (userBtn && userMenu) {
      userBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userMenu.classList.toggle('open');
        userBtn.setAttribute('aria-expanded', userMenu.classList.contains('open'));
      });
      document.addEventListener('click', (e) => {
        if (!userMenu.contains(e.target) && !userBtn.contains(e.target)) {
          userMenu.classList.remove('open');
          userBtn.setAttribute('aria-expanded', 'false');
        }
      });
      const so = $('#signOutBtn', userMenu);
      if (so) so.addEventListener('click', () => {
        AquaDB.session.clear();
        toast(T('خرجت', 'Signed out'), 'success');
        setTimeout(() => location.reload(), 400);
      });
    }
    const hs = $('#headerSearch');
    if (hs) {
      hs.addEventListener('click', () => openCommandPalette());
    }
    $$('[data-qb]').forEach(b => b.addEventListener('click', () => openQuickBook()));
  }

  function bindAdminFloat() {
    const a = $('#adminFloat');
    if (!a || a._bound) return;
    a._bound = true;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      try {
        if (typeof AquaDB !== 'undefined' && !AquaDB.admin.isAuth()) {
          AquaDB.admin.login(AquaDB.ADMIN_PASSWORD);
        }
      } catch (err) { /* ignore */ }
      location.href = adminBase() + 'index.html';
    });
  }

  function bindFab() {
    const hub = $('#fabHub');
    const main = $('#fabMain');
    if (!hub || !main) return;
    main.addEventListener('click', (e) => {
      e.stopPropagation();
      hub.classList.toggle('open');
      main.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!hub.contains(e.target)) {
        hub.classList.remove('open');
        main.classList.remove('open');
      }
    });
    $$('.fab-action', hub).forEach(b => {
      b.addEventListener('click', (e) => {
        const act = b.getAttribute('data-fab');
        if (act === 'book') {
          e.preventDefault();
          openQuickBook();
        }
        hub.classList.remove('open');
        main.classList.remove('open');
      });
    });
  }

  const qbState = { activityId: null, sessionId: null, name: '', phone: '' };

  function openQuickBook(opts) {
    const modal = $('#qbModal');
    if (!modal) return;
    const acts = (typeof AquaDB !== 'undefined' && AquaDB.activities) ? AquaDB.activities.active() : [];
    const body = $('#qbBody');
    const session = (typeof AquaDB !== 'undefined' && AquaDB.session) ? AquaDB.session.get() : null;
    const customer = session ? AquaDB.customers.get(session.customerId) : null;
    qbState.activityId = (opts && opts.activityId) || qbState.activityId || (acts[0] && acts[0].id) || null;
    qbState.sessionId = null;
    qbState.name = customer ? customer.name : '';
    qbState.phone = customer ? (customer.phone || '') : '';
    renderQBBody(acts);
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeQuickBook() {
    const modal = $('#qbModal');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function renderQBBody(acts) {
    const body = $('#qbBody');
    if (!body) return;
    const EMOJIS = { rowing: '🚣', kayaking: '🛶', sup: '🏄', wake: '🎿', fit: '💪' };
    body.innerHTML = `
      <div>
        <p class="muted" style="margin-bottom: 12px;">${T('اختار النشاط', 'Choose an activity')}</p>
        <div class="qb-activity-grid">
          ${acts.map(a => `
            <div class="qb-activity ${qbState.activityId === a.id ? 'selected' : ''}" data-qb-act="${a.id}">
              <span class="qb-emoji">${EMOJIS[a.slug] || '🌊'}</span>
              <span>${a.name}</span>
              <span class="qb-num">${a.pricing[0].price} ${T('ج', 'EGP')}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div style="margin-top: 18px;">
        <p class="muted" style="margin-bottom: 12px;">${T('المواعيد المتاحة (الأسبوع ده)', 'Available times (this week)')}</p>
        <div class="qb-slots" id="qbSlots"></div>
      </div>
      <div class="form-row" style="margin-top: 18px;">
        <div class="field">
          <label>${T('اسمك', 'Your name')}</label>
          <input type="text" id="qbName" value="${qbState.name}" placeholder="${T('مثلاً: سلمى', 'e.g. Salma')}" />
        </div>
        <div class="field">
          <label>${T('موبايل أو واتساب', 'Mobile or WhatsApp')}</label>
          <input type="tel" id="qbPhone" value="${qbState.phone}" placeholder="+20 ..." />
        </div>
      </div>
    `;
    $$('.qb-activity', body).forEach(c => c.addEventListener('click', () => {
      qbState.activityId = c.getAttribute('data-qb-act');
      qbState.sessionId = null;
      $$('.qb-activity', body).forEach(x => x.classList.remove('selected'));
      c.classList.add('selected');
      renderQBSlots();
    }));
    const nameI = $('#qbName', body);
    const phoneI = $('#qbPhone', body);
    if (nameI) nameI.addEventListener('input', () => { qbState.name = nameI.value; });
    if (phoneI) phoneI.addEventListener('input', () => { qbState.phone = phoneI.value; });
    renderQBSlots();
  }

  function renderQBSlots() {
    const slots = $('#qbSlots');
    if (!slots) return;
    const allSessions = (typeof AquaDB !== 'undefined' && AquaDB.sessions) ? AquaDB.sessions.upcoming() : [];
    const acts = AquaDB.activities.active();
    const list = allSessions.filter(s => s.activityId === qbState.activityId).slice(0, 8);
    if (list.length === 0) {
      slots.innerHTML = `
        <div class="empty-state" style="padding: 30px 16px;">
          <p>${T('مفيش مواعيد متاحة. كلمنا على واتساب وهنرتبلك.', 'No times available. Message us on WhatsApp and we will arrange one.')}</p>
          <a class="btn btn-primary" style="margin-top: 12px;" href="https://wa.me/201011329642" target="_blank" rel="noopener">${T('كلمنا واتساب', 'WhatsApp Us')}</a>
        </div>
      `;
      const submit = $('#qbSubmit');
      if (submit) submit.disabled = true;
      return;
    }
    slots.innerHTML = list.map(s => {
      const a = acts.find(x => x.id === s.activityId);
      const d = new Date(s.startsAt);
      const day = (typeof AquaDB !== 'undefined' && AquaDB.dayName) ? AquaDB.dayName[d.getDay()] : '';
      const mon = (typeof AquaDB !== 'undefined' && AquaDB.monthName) ? AquaDB.monthName[d.getMonth()] : '';
      const time = d.toLocaleTimeString(LOC, { hour: 'numeric', minute: '2-digit' });
      return `
        <div class="qb-slot ${qbState.sessionId === s.id ? 'selected' : ''}" data-qb-slot="${s.id}">
          <div>
            <div class="qb-slot-time">${day} ${d.getDate()} ${mon} · ${time}</div>
            <div class="qb-slot-meta">${s.booked}/${s.capacity} ${T('محجوز', 'booked')} · ${a ? a.name : ''}</div>
          </div>
          <div class="qb-slot-price">${a ? a.pricing[0].price : 0} ${T('ج', 'EGP')}</div>
        </div>
      `;
    }).join('');
    $$('.qb-slot', slots).forEach(c => c.addEventListener('click', () => {
      qbState.sessionId = c.getAttribute('data-qb-slot');
      $$('.qb-slot', slots).forEach(x => x.classList.remove('selected'));
      c.classList.add('selected');
      const submit = $('#qbSubmit');
      if (submit) submit.disabled = !qbState.sessionId;
    }));
  }

  function submitQuickBook() {
    if (!qbState.activityId || !qbState.sessionId) { toast(T('اختار نشاط وموعد', 'Pick an activity and time'), 'error'); return; }
    if (!qbState.name.trim() || !qbState.phone.trim()) { toast(T('دخّل اسمك ورقمك', 'Enter your name and number'), 'error'); return; }
    const allSessions = AquaDB.sessions.upcoming();
    const session = allSessions.find(s => s.id === qbState.sessionId);
    if (!session) { toast(T('الموعد مش متاح', 'That time is not available'), 'error'); return; }
    const customer = AquaDB.customers.findOrCreate({ name: qbState.name.trim(), phone: qbState.phone.trim() });
    AquaDB.bookings.create({
      customerId: customer.id,
      sessionId: session.id,
      activityId: qbState.activityId,
      name: qbState.name.trim(),
      phone: qbState.phone.trim(),
      startAt: session.startsAt,
      partySize: 1,
      payment: 'unpaid',
    });
    AquaDB.session.set(customer.id);
    closeQuickBook();
    toast(T('استلمنا طلبك، هنكلمك على واتساب', 'Got your request — we will call you on WhatsApp'), 'success');
    setTimeout(() => location.href = pagesBase() + 'account.html', 800);
  }

  function openActivityModal(slug) {
    const modal = $('#activityModal');
    if (!modal) return;
    const a = (typeof AquaDB !== 'undefined' && AquaDB.activities) ? AquaDB.activities.get(slug) : null;
    if (!a) { toast(T('النشاط مش موجود', 'Activity not found'), 'error'); return; }
    const m = $('.modal', modal);
    m.innerHTML = `
      <div class="modal-head">
        <h2>${a.name}</h2>
        <button class="modal-close" type="button" data-close-activity aria-label="${T('إغلاق', 'Close')}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <img src="${a.hero}" alt="${a.name}" style="width:100%; border-radius: var(--r-md); aspect-ratio: 16/9; object-fit: cover; margin-bottom: 16px;" />
        <p class="muted" style="margin-bottom: 12px;">${a.tagline}</p>
        <p style="margin-bottom: 16px; line-height: 1.6;">${a.long}</p>
        <div class="qa-stack">
          <span class="qa-chip">${T('ابتداءً من', 'From')} ${a.pricing[0].price} ${T('ج', 'EGP')} / ${a.pricing[0].duration}</span>
          ${(a.included || []).slice(0, 3).map(x => `<span class="qa-chip">${x}</span>`).join('')}
        </div>
      </div>
      <div class="modal-foot">
        <a class="btn btn-ghost" href="${pagesBase()}activity.html?slug=${a.slug}">${T('صفحة النشاط', 'Activity Page')}</a>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-ghost" type="button" data-qb-from-modal="${a.id}">${T('احجز سيشن تاني', 'Book another session')}</button>
          <a class="btn btn-primary" href="${pagesBase()}booking.html?activity=${a.slug}">${T('احجز', 'Book')} ${a.name}</a>
        </div>
      </div>
    `;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    const close = m.querySelector('[data-close-activity]');
    if (close) close.addEventListener('click', closeActivityModal);
    const qbFromModal = m.querySelector('[data-qb-from-modal]');
    if (qbFromModal) qbFromModal.addEventListener('click', () => {
      closeActivityModal();
      openQuickBook({ activityId: a.id });
    });
  }

  function closeActivityModal() {
    const modal = $('#activityModal');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function buildCmdkData() {
    const isAdmin = isAdminPath();
    const acts = (typeof AquaDB !== 'undefined' && AquaDB.activities) ? AquaDB.activities.all() : [];
    const events = (typeof AquaDB !== 'undefined' && AquaDB.events) ? AquaDB.events.all() : [];
    const pkgs = (typeof AquaDB !== 'undefined' && AquaDB.packages) ? AquaDB.packages.all() : [];
    const mems = (typeof AquaDB !== 'undefined' && AquaDB.memberships) ? AquaDB.memberships.all() : [];
    const sessions = (typeof AquaDB !== 'undefined' && AquaDB.sessions) ? AquaDB.sessions.upcoming() : [];
    const nav = isAdmin ? [
      { kind: T('إجراء', 'Action'), title: T('الرئيسية', 'Home'), sub: T('نظرة عامة على الأكاديمية', 'Academy overview'), href: adminBase() + 'index.html', icon: 'home' },
      { kind: T('إجراء', 'Action'), title: T('الحجوزات', 'Bookings'), sub: T('كل حجوزات العملاء', 'All customer bookings'), href: adminBase() + 'bookings.html', icon: 'calendar' },
      { kind: T('إجراء', 'Action'), title: T('الأنشطة', 'Activities'), sub: T('إدارة الأنشطة والأسعار', 'Manage activities and pricing'), href: adminBase() + 'activities.html', icon: 'activity' },
      { kind: T('إجراء', 'Action'), title: T('الرسايل', 'Messages'), sub: T('رسايل نموذج التواصل', 'Contact form messages'), href: adminBase() + 'contacts.html', icon: 'mail' },
      { kind: T('إجراء', 'Action'), title: T('إضافة حجز', 'Add Booking'), sub: T('حجز جديد من الموظف', 'New booking by staff'), action: 'qb', icon: 'plus' },
      { kind: T('إجراء', 'Action'), title: T('تسجيل خروج', 'Sign Out'), sub: T('خروج من لوحة التحكم', 'Exit the dashboard'), action: 'logout', icon: 'logout' },
    ] : [
      { kind: T('صفحة', 'Page'), title: T('الرئيسية', 'Home'), sub: T('صفحة الهبوط', 'Landing page'), href: rootHome(), icon: 'home' },
      { kind: T('صفحة', 'Page'), title: T('الأنشطة', 'Activities'), sub: T('كل الرياضات المائية', 'All water sports'), href: pagesBase() + 'activities.html', icon: 'activity' },
      { kind: T('صفحة', 'Page'), title: T('الأسعار', 'Pricing'), sub: T('الباكدجز والـ memberships', 'Packages and memberships'), href: pagesBase() + 'pricing.html', icon: 'tag' },
      { kind: T('صفحة', 'Page'), title: T('الإيفنتات', 'Events'), sub: T('إيفنتات جاية', 'Upcoming events'), href: pagesBase() + 'events.html', icon: 'star' },
      { kind: T('صفحة', 'Page'), title: T('مين احنا', 'About'), sub: T('قصة الأكاديمية', 'The academy story'), href: pagesBase() + 'about.html', icon: 'info' },
      { kind: T('صفحة', 'Page'), title: T('تواصل', 'Contact'), sub: T('كل القنوات', 'All channels'), href: pagesBase() + 'contact.html', icon: 'phone' },
      { kind: T('صفحة', 'Page'), title: T('حسابي', 'My Account'), sub: T('حجوزاتي وبروفايلي', 'My bookings and profile'), href: pagesBase() + 'account.html', icon: 'user' },
      { kind: T('صفحة', 'Page'), title: T('لوحة التحكم', 'Dashboard'), sub: T('دخول الموظف', 'Staff login'), href: adminBase() + 'login.html', icon: 'lock' },
      { kind: T('إجراء', 'Action'), title: T('احجز سيشن', 'Book a Session'), sub: T('حجز سريع في نافذة', 'Quick book in a window'), action: 'qb', icon: 'plus' },
    ];
    const items = [
      ...nav,
      ...acts.filter(a => a.active).map(a => ({ kind: T('نشاط', 'Activity'), title: a.name, sub: a.tagline, href: pagesBase() + 'activity.html?slug=' + a.slug, action: a.slug, icon: 'activity' })),
      ...events.map(e => ({ kind: T('إيفنت', 'Event'), title: e.title, sub: e.tagline, href: pagesBase() + 'event.html?slug=' + e.slug, icon: 'star' })),
      ...pkgs.map(p => ({ kind: T('باكدج', 'Package'), title: p.name, sub: p.desc + ' · ' + EGP(p.price), href: pagesBase() + 'pricing.html#' + p.id, icon: 'tag' })),
      ...mems.map(m => ({ kind: 'Membership', title: m.name, sub: m.desc + ' · ' + EGP(m.price), href: pagesBase() + 'pricing.html#' + m.id, icon: 'tag' })),
      ...sessions.slice(0, 8).map(s => {
        const a = acts.find(x => x.id === s.activityId);
        const d = new Date(s.startsAt);
        const day = (typeof AquaDB !== 'undefined' && AquaDB.dayName) ? AquaDB.dayName[d.getDay()] : '';
        const time = d.toLocaleTimeString(LOC, { hour: 'numeric', minute: '2-digit' });
        return { kind: T('موعد', 'Session'), title: (a ? a.name : T('سيشن', 'Session')) + ' · ' + day + ' ' + d.getDate() + ' · ' + time, sub: s.booked + '/' + s.capacity + ' ' + T('محجوز', 'booked'), action: 'qbSession', id: s.id, activityId: s.activityId, icon: 'clock' };
      }),
    ];
    return items;
  }

  let cmdkData = [];
  let cmdkIndex = 0;

  function openCommandPalette() {
    const modal = $('#cmdk');
    if (!modal) return;
    cmdkData = buildCmdkData();
    cmdkIndex = 0;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    const input = $('#cmdkInput', modal);
    if (input) {
      input.value = '';
      input.focus();
    }
    renderCmdkResults('');
  }

  function closeCommandPalette() {
    const modal = $('#cmdk');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function renderCmdkResults(q) {
    const res = $('#cmdkResults');
    if (!res) return;
    q = (q || '').trim().toLowerCase();
    let list = cmdkData;
    if (q) {
      list = cmdkData.filter(it => (it.title || '').toLowerCase().includes(q) || (it.sub || '').toLowerCase().includes(q) || (it.kind || '').toLowerCase().includes(q));
    }
    if (list.length === 0) {
      res.innerHTML = `<div class="cmdk-empty">${T('مفيش نتائج لـ', 'No results for')} "<strong>${q}</strong>". ${T('جرّب كلمة تانية.', 'Try another word.')}</div>`;
      return;
    }
    const byKind = {};
    list.forEach(it => { (byKind[it.kind] = byKind[it.kind] || []).push(it); });
    let html = '';
    let flatIndex = 0;
    Object.keys(byKind).forEach(k => {
      html += `<div class="cmdk-group-label">${k}</div>`;
      byKind[k].forEach(it => {
        const isActive = flatIndex === cmdkIndex ? 'active' : '';
        html += `
          <div class="cmdk-item ${isActive}" data-cmdk-idx="${flatIndex}" data-cmdk-item='${escapeAttr(JSON.stringify(it))}'>
            <div class="ci-icon">${cmdkIcon(it.icon)}</div>
            <div class="ci-meta">
              <div class="ci-title">${escapeHTML(it.title)}</div>
              ${it.sub ? `<div class="ci-sub">${escapeHTML(it.sub)}</div>` : ''}
            </div>
            <div class="ci-kbd">↵</div>
          </div>
        `;
        flatIndex++;
      });
    });
    res.innerHTML = html;
    $$('.cmdk-item', res).forEach(elx => {
      elx.addEventListener('click', () => {
        const data = JSON.parse(elx.getAttribute('data-cmdk-item'));
        runCmdkItem(data);
      });
      elx.addEventListener('mouseenter', () => {
        cmdkIndex = parseInt(elx.getAttribute('data-cmdk-idx'), 10);
        $$('.cmdk-item', res).forEach(x => x.classList.remove('active'));
        elx.classList.add('active');
      });
    });
    res._flat = list;
  }

  function runCmdkItem(it) {
    if (it.action === 'qb') { closeCommandPalette(); openQuickBook(); return; }
    if (it.action === 'logout') {
      AquaDB.admin.logout();
      closeCommandPalette();
      toast(T('خرجت', 'Signed out'), 'success');
      setTimeout(() => location.href = adminBase() + 'login.html', 400);
      return;
    }
    if (it.action === 'qbSession') {
      closeCommandPalette();
      openQuickBook({ activityId: it.activityId });
      setTimeout(() => {
        const slot = document.querySelector(`[data-qb-slot="${it.id}"]`);
        if (slot) slot.click();
      }, 50);
      return;
    }
    if (it.href) { location.href = it.href; return; }
  }

  function cmdkIcon(name) {
    const map = {
      home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5 12 2l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z"/></svg>',
      activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.5" cy="6.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/><path d="M6.5 8.5v7M17.5 15.5v-7M6.5 15.5 17.5 8.5"/></svg>',
      tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5"/></svg>',
      star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.8 5.8 21 7 14 2 9.3 9 8.5 12 2"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
      phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
      user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
      plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
      logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
      calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
      mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
      clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    };
    return map[name] || map.info;
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function escapeAttr(s) {
    return String(s).replace(/'/g, '&#39;');
  }

  function bindGlobal() {
    document.addEventListener('keydown', (e) => {
      const inField = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target.tagName || ''));
      const modal = $('#cmdk');
      const isOpen = modal && modal.classList.contains('open');
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (isOpen) closeCommandPalette();
        else openCommandPalette();
        return;
      }
      if (e.key === 'Escape') {
        if (isOpen) { closeCommandPalette(); return; }
        const qb = $('#qbModal');
        if (qb && qb.classList.contains('open')) { closeQuickBook(); return; }
        const am = $('#activityModal');
        if (am && am.classList.contains('open')) { closeActivityModal(); return; }
        const sh = $('#shortcutOverlay');
        if (sh && sh.classList.contains('open')) { closeShortcuts(); return; }
      }
      if (isOpen) {
        if (e.key === 'ArrowDown') { e.preventDefault(); cmdkIndex = Math.min(cmdkIndex + 1, (modal._flat || cmdkData).length - 1); renderCmdkResults($('#cmdkInput').value); scrollActive(); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); cmdkIndex = Math.max(cmdkIndex - 1, 0); renderCmdkResults($('#cmdkInput').value); scrollActive(); return; }
        if (e.key === 'Enter') {
          e.preventDefault();
          const res = $('#cmdkResults');
          const flat = (res && res._flat) || cmdkData;
          if (flat[cmdkIndex]) runCmdkItem(flat[cmdkIndex]);
          return;
        }
      }
      if (inField) return;
      if (e.key === 'b' || e.key === 'B') { openQuickBook(); return; }
      if (e.key === '?') { e.preventDefault(); openShortcuts(); return; }
      if (e.key === 'g' || e.key === 'G') {
        window._gPressed = true;
        clearTimeout(window._gTimer);
        window._gTimer = setTimeout(() => { window._gPressed = false; }, 900);
        return;
      }
      if (window._gPressed) {
        window._gPressed = false;
        const k = e.key.toLowerCase();
        if (isAdminPath()) {
          if (k === 'h') location.href = adminBase() + 'index.html';
          else if (k === 'b') location.href = adminBase() + 'bookings.html';
          else if (k === 'a') location.href = adminBase() + 'activities.html';
          else if (k === 'c') location.href = adminBase() + 'contacts.html';
          else if (k === 'q') { AquaDB.admin.logout(); location.href = adminBase() + 'login.html'; }
        } else {
          if (k === 'h') location.href = rootHome();
          else if (k === 'a') location.href = pagesBase() + 'activities.html';
          else if (k === 'p') location.href = pagesBase() + 'pricing.html';
          else if (k === 'e') location.href = pagesBase() + 'events.html';
          else if (k === 'm') location.href = pagesBase() + 'account.html';
          else if (k === 'c') location.href = pagesBase() + 'contact.html';
        }
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        if (isAdminPath() && location.pathname.includes('bookings')) {
          const add = $('#toggleAdd');
          if (add) add.click();
        }
      }
      if (e.key === 'x' || e.key === 'X') {
        if (isAdminPath() && location.pathname.includes('bookings')) {
          const c = document.querySelector('[data-confirm]');
          if (c) c.click();
        }
      }
    });
    function scrollActive() {
      const a = $('.cmdk-item.active');
      if (a) a.scrollIntoView({ block: 'nearest' });
    }
    const qbModal = $('#qbModal');
    if (qbModal) {
      qbModal.addEventListener('click', (e) => { if (e.target === qbModal) closeQuickBook(); });
      $$('[data-close-qb]', qbModal).forEach(b => b.addEventListener('click', closeQuickBook));
      const submit = $('#qbSubmit');
      if (submit) submit.addEventListener('click', submitQuickBook);
    }
    const am = $('#activityModal');
    if (am) {
      am.addEventListener('click', (e) => { if (e.target === am) closeActivityModal(); });
    }
    const cmdk = $('#cmdk');
    if (cmdk) {
      cmdk.addEventListener('click', (e) => { if (e.target === cmdk) closeCommandPalette(); });
      const input = $('#cmdkInput', cmdk);
      if (input) input.addEventListener('input', () => { cmdkIndex = 0; renderCmdkResults(input.value); });
    }
    const sh = $('#shortcutOverlay');
    if (sh) {
      sh.addEventListener('click', (e) => { if (e.target === sh) closeShortcuts(); });
      $$('[data-close-shortcuts]', sh).forEach(b => b.addEventListener('click', closeShortcuts));
    }
    $$('[data-qb]').forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); openQuickBook(); }));
  }

  function openShortcuts() {
    const sh = $('#shortcutOverlay');
    if (sh) sh.classList.add('open');
  }
  function closeShortcuts() {
    const sh = $('#shortcutOverlay');
    if (sh) sh.classList.remove('open');
  }

  function bindActivityQuickView() {
    $$('.activity-card').forEach(card => {
      if (card._qvBound) return;
      card._qvBound = true;
      const href = card.getAttribute('href') || '';
      const m = href.match(/slug=([^&]+)/);
      if (!m) return;
      const slug = m[1];
      const btn = el('button', 'quick-view-btn', `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        ${T('عرض سريع', 'Quick View')}
      `);
      btn.type = 'button';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openActivityModal(slug);
      });
      card.appendChild(btn);
    });
  }

  function reveal() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  }

  function toast(message, kind) {
    let t = $('#toast');
    if (!t) {
      t = el('div', 'toast');
      t.id = 'toast';
      document.body.appendChild(t);
    }
    t.className = 'toast ' + (kind || '');
    const icon = kind === 'success'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
      : kind === 'error'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    t.innerHTML = icon + '<span>' + message + '</span>';
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), 3200);
  }

  function initBodyClass() {
    if (isAdminPath()) document.body.classList.add('is-admin');
    else document.body.classList.add('is-public');
  }

  global.Aqua = {
    $, $$, el,
    renderHeader, renderFooter, renderSplash, renderAdminShell, bindAdminShell,
    runSplash, bindHeader, bindAdminFloat, bindFab, bindGlobal, bindActivityQuickView,
    openCommandPalette, closeCommandPalette, openQuickBook, closeQuickBook,
    openActivityModal, closeActivityModal, openShortcuts, closeShortcuts,
    reveal, toast, initBodyClass, adminStats,
  };
  global.AQUA_BASE = BASE;
})(window);

document.addEventListener('DOMContentLoaded', () => {
  if (window.Aqua) {
    Aqua.initBodyClass();
    Aqua.bindAdminFloat();
    Aqua.bindFab();
    Aqua.bindGlobal();
    Aqua.bindActivityQuickView();
  }
});
