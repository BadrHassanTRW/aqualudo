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

  function renderHeader(active) {
    const path = location.pathname.split('/').pop() || 'index.html';
    const isAdmin = path.startsWith('admin') || location.pathname.includes('/admin/');
    if (isAdmin) return '';
    return `
      <header class="site-header" id="header">
        <div class="container row">
          <a href="${BASE}index.html" class="logo">
            <span class="logo-mark"><img src="${BASE}assets/img/boat.png" alt="أكوا لودو" /></span>
            <span>أكوا لودو</span>
          </a>
          <nav class="nav-links">
            <a href="${BASE}site/pages/activities.html"${active==='activities'?' class="active"':''}>الأنشطة</a>
            <a href="${BASE}site/pages/pricing.html"${active==='pricing'?' class="active"':''}>الأسعار</a>
            <a href="${BASE}site/pages/events.html"${active==='events'?' class="active"':''}>الإيفنتات</a>
            <a href="${BASE}site/pages/about.html"${active==='about'?' class="active"':''}>مين احنا</a>
            <a href="${BASE}site/pages/contact.html"${active==='contact'?' class="active"':''}>تواصل</a>
          </nav>
          <div class="nav-cta">
            <a href="${BASE}site/pages/account.html" class="btn btn-ghost" style="padding: 10px 18px; font-size: 0.88rem;">حسابي</a>
            <a href="${BASE}site/pages/booking.html" class="btn btn-primary" style="padding: 10px 18px; font-size: 0.88rem;">احجز دلوقتي</a>
            <button class="menu-toggle" id="menuToggle" aria-label="القائمة"><span></span></button>
          </div>
        </div>
      </header>
      <div class="mobile-menu" id="mobileMenu">
        <a href="${BASE}site/pages/activities.html">الأنشطة</a>
        <a href="${BASE}site/pages/pricing.html">الأسعار</a>
        <a href="${BASE}site/pages/events.html">الإيفنتات</a>
        <a href="${BASE}site/pages/about.html">مين احنا</a>
        <a href="${BASE}site/pages/contact.html">تواصل</a>
        <a href="${BASE}site/pages/account.html">حسابي</a>
        <a href="${BASE}site/pages/booking.html" class="btn btn-primary btn-lg" style="margin-top: 16px;">احجز سيشن</a>
      </div>
    `;
  }

  function renderFooter() {
    return `
      <footer>
        <div class="container">
          <div class="footer-grid">
            <div class="footer-brand">
              <a href="${BASE}index.html" class="logo">
                <span class="logo-mark"><img src="${BASE}assets/img/boat.png" alt="أكوا لودو" /></span>
                <span>أكوا لودو</span>
              </a>
              <p>أكوا لودو هو بيتك في القاهرة للتجديف، الكياك، SUP، ويك بورد، وفتنس على المية. على النيل، في الدقي، من 2017.</p>
              <div class="socials">
                <a href="https://instagram.com/oarnsail" target="_blank" rel="noopener" aria-label="انستجرام">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener" aria-label="فيسبوك">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg>
                </a>
                <a href="https://wa.me/201011329642" target="_blank" rel="noopener" aria-label="واتساب">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                </a>
                <a href="mailto:Oarnsail1@gmail.com" aria-label="إيميل">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </a>
              </div>
            </div>
            <div class="footer-col">
              <h4>زورنا</h4>
              <ul>
                <li><a href="${BASE}site/pages/activities.html">الأنشطة</a></li>
                <li><a href="${BASE}site/pages/pricing.html">الأسعار</a></li>
                <li><a href="${BASE}site/pages/events.html">الإيفنتات</a></li>
                <li><a href="${BASE}site/pages/about.html">مين احنا</a></li>
                <li><a href="${BASE}site/pages/contact.html">تواصل</a></li>
              </ul>
            </div>
            <div class="footer-col">
              <h4>الحساب</h4>
              <ul>
                <li><a href="${BASE}site/pages/booking.html">احجز سيشن</a></li>
                <li><a href="${BASE}site/pages/account.html">حجوزاتي</a></li>
                <li><a href="${BASE}site/pages/sign-in.html">دخول</a></li>
                <li><a href="${BASE}site/admin/login.html">دخول الموظفين</a></li>
              </ul>
            </div>
            <div class="footer-col">
              <h4>تواصل</h4>
              <ul>
                <li>114 شارع النيل، الدقي</li>
                <li>الدقي، الجيزة 3750432</li>
                <li><a href="tel:+201011329642">+20 101 132 9642</a></li>
                <li><a href="https://wa.me/201011329642" target="_blank" rel="noopener">كلمنا واتساب</a></li>
                <li><a href="mailto:Oarnsail1@gmail.com">Oarnsail1@gmail.com</a></li>
              </ul>
            </div>
          </div>
          <div class="footer-bottom">
            <p>© 2026 أكوا لودو. كل الحقوق محفوظة.</p>
            <p>متعمّل بحب على النيل.</p>
          </div>
        </div>
      </footer>
      <a class="wa-float" href="https://wa.me/201011329642?text=أهلاً%20أكوا%20لودو،%20عايز%20أحجز%20سيشن" target="_blank" rel="noopener" aria-label="كلمنا واتساب">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
      </a>
      <a class="admin-float" href="${BASE}site/admin/login.html" id="adminFloat" aria-label="لوحة التحكم" title="لوحة التحكم">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </a>
    `;
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
      } catch (err) {}
      location.href = BASE + 'site/admin/index.html';
    });
  }

  function renderSplash() {
    return `
      <div id="splash" aria-hidden="true">
        <div class="splash-mark" id="splash-text">
          <h1>أكوا لودو</h1>
          <p>بنشق الموج</p>
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
      s.style.width = `${size}px`; s.style.height = `${size}px`;
      s.style.left = `${x + offX}px`; s.style.top = `${y}px`;
      parent.appendChild(s);
      setTimeout(() => s.remove(), 700);
    }
    setTimeout(() => requestAnimationFrame(tick), 200);
  }

  function bindHeader() {
    const header = $('#header');
    if (!header) return;
    const onScroll = () => {
      if (window.scrollY > 30) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

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

  global.Aqua = { $, $$, el, renderHeader, renderFooter, renderSplash, runSplash, bindHeader, bindAdminFloat, reveal, toast };
  global.AQUA_BASE = BASE;
})(window);

document.addEventListener('DOMContentLoaded', () => {
  Aqua.bindAdminFloat();
});
