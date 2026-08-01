(function(global){const $=(s,r)=>(r||document).querySelector(s);const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));const el=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;};const BASE=(function(){const s=document.querySelector('script[src*="assets/js/app.js"]');if(!s)return'';const src=s.getAttribute('src')||'';const i=src.indexOf('assets/js/');return i>=0?src.substring(0,i):'';})();const isAdminPath=()=>{const path=location.pathname;return path.includes('/admin/')||path.endsWith('/admin')||/\/admin(\/|$|\.)/.test(path);};const isPublicPath=()=>!isAdminPath();const ROOT=(BASE.startsWith('../')?'../'+BASE:'');const rootHome=()=>ROOT+'index.html';const pagesBase=()=>ROOT+'site/pages/';const adminBase=()=>ROOT+'site/admin/';function renderHeader(active){const isAdmin=isAdminPath();if(isAdmin)return'';const session=(typeof AquaDB!=='undefined'&&AquaDB.session)?AquaDB.session.get():null;const customer=session?AquaDB.customers.get(session.customerId):null;const userLabel=customer?(customer.name.split(' ')[0]):'حسابي';return`
      <header class="site-header" id="header">
        <div class="container row">
          <a href="${rootHome()}" class="logo">
            <span class="logo-mark"><img src="${BASE}assets/img/boat.png" alt="أكوا لودو" /></span>
            <span>أكوا لودو</span>
          </a>
          <nav class="nav-links">
            <a href="${pagesBase()}activities.html"${active==='activities'?' class="active"':''}>الأنشطة</a>
            <a href="${pagesBase()}pricing.html"${active==='pricing'?' class="active"':''}>الأسعار</a>
            <a href="${pagesBase()}events.html"${active==='events'?' class="active"':''}>الإيفنتات</a>
            <a href="${pagesBase()}about.html"${active==='about'?' class="active"':''}>مين احنا</a>
            <a href="${pagesBase()}contact.html"${active==='contact'?' class="active"':''}>تواصل</a>
          </nav>
          <div class="nav-cta">
            <button class="header-search" id="headerSearch" type="button" aria-label="ابحث">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="ابحث" readonly tabindex="-1" />
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
                  <a href="${pagesBase()}account.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>حجوزاتي</a>
                  <a href="${pagesBase()}account-profile.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>البروفايل</a>
                  <div class="divider"></div>
                ` : ''}
                <a href="${pagesBase()}sign-in.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>${customer ? 'تبديل الحساب' : 'دخول'}</a>
                <a href="${pagesBase()}booking.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/></svg>احجز سيشن</a>
                <div class="divider"></div>
                <a href="${adminBase()}login.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>دخول الموظف</a>
                ${customer ? `<button type="button" id="signOutBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>خروج</button>` : ''}
              </div>
            </div>
            <a href="${pagesBase()}booking.html" class="btn btn-primary" style="padding: 10px 18px; font-size: 0.88rem;">احجز دلوقتي</a>
            <button class="menu-toggle" id="menuToggle" aria-label="القائمة"><span></span></button>
          </div>
        </div>
      </header>
      <div class="mobile-menu" id="mobileMenu">
        <a href="${pagesBase()}activities.html">الأنشطة</a>
        <a href="${pagesBase()}pricing.html">الأسعار</a>
        <a href="${pagesBase()}events.html">الإيفنتات</a>
        <a href="${pagesBase()}about.html">مين احنا</a>
        <a href="${pagesBase()}contact.html">تواصل</a>
        <a href="${pagesBase()}account.html">حسابي</a>
        <a href="${pagesBase()}booking.html" class="btn btn-primary btn-lg" style="margin-top: 16px;">احجز سيشن</a>
      </div>
      <nav class="bottom-nav" id="bottomNav" aria-label="التنقل السريع">
        <a href="${rootHome()}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5 12 2l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z"/></svg>
          <span>الرئيسية</span>
        </a>
        <a href="${pagesBase()}activities.html">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.5" cy="6.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/><path d="M6.5 8.5v7M17.5 15.5v-7M6.5 15.5 17.5 8.5"/></svg>
          <span>الأنشطة</span>
        </a>
        <button type="button" data-qb="1" aria-label="احجز سيشن" class="bn-book">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <a href="${pagesBase()}events.html">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>الإيفنتات</span>
        </a>
        <a href="${pagesBase()}account.html">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>حسابي</span>
        </a>
      </nav>
    `;}function renderFooter(){return`
      <div class="footer-quickbar">
        <div class="container">
          <div class="footer-quickbar-inner">
            <div class="fqb-text">
              <span class="eyebrow" style="color: var(--coral);">جاهز تنزل المية؟</span>
              <h3>احجز سيشنك دلوقتي في 3 نقرات.</h3>
            </div>
            <div class="fqb-actions">
              <a href="${pagesBase()}booking.html" class="btn btn-primary">احجز سيشن</a>
              <a href="https://wa.me/201011329642?text=عايز%20استفسر" target="_blank" rel="noopener" class="btn" style="background:#25D366;color:#fff;">كلمنا واتساب</a>
              <a href="tel:+201011329642" class="btn btn-light">اتصل بينا</a>
            </div>
          </div>
        </div>
      </div>
      <footer>
        <div class="container">
          <div class="footer-grid">
            <div class="footer-brand">
              <a href="${rootHome()}" class="logo">
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
                <li><a href="${pagesBase()}activities.html">الأنشطة</a></li>
                <li><a href="${pagesBase()}pricing.html">الأسعار</a></li>
                <li><a href="${pagesBase()}events.html">الإيفنتات</a></li>
                <li><a href="${pagesBase()}about.html">مين احنا</a></li>
                <li><a href="${pagesBase()}contact.html">تواصل</a></li>
              </ul>
            </div>
            <div class="footer-col">
              <h4>الحساب</h4>
              <ul>
                <li><a href="${pagesBase()}booking.html">احجز سيشن</a></li>
                <li><a href="${pagesBase()}account.html">حجوزاتي</a></li>
                <li><a href="${pagesBase()}account-profile.html">البروفايل</a></li>
                <li><a href="${pagesBase()}sign-in.html">دخول</a></li>
                <li><a href="${adminBase()}login.html">دخول الموظفين</a></li>
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
      <a class="admin-float" href="${adminBase()}login.html" id="adminFloat" aria-label="لوحة التحكم" title="لوحة التحكم">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </a>

      <div class="fab-hub" id="fabHub">
        <button class="fab-main" id="fabMain" type="button" aria-label="إجراءات سريعة">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <div class="fab-actions" id="fabActions">
          <button type="button" class="fab-action primary" data-fab="book">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/></svg>
            احجز سيشن
          </button>
          <a class="fab-action wa" href="https://wa.me/201011329642?text=أهلاً%20أكوا%20لودو" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>
            واتساب
          </a>
          <a class="fab-action" href="tel:+201011329642">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            اتصل
          </a>
          <a class="fab-action" href="${pagesBase()}activities.html">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.5" cy="6.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/><path d="M6.5 8.5v7M17.5 15.5v-7M6.5 15.5 17.5 8.5"/></svg>
            الأنشطة
          </a>
          <a class="fab-action" href="${pagesBase()}events.html">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            الإيفنتات
          </a>
          <a class="fab-action" href="${pagesBase()}account.html">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            حسابي
          </a>
        </div>
      </div>

      <div class="cmdk-backdrop" id="cmdk" role="dialog" aria-modal="true" aria-label="بحث سريع">
        <div class="cmdk" role="document">
          <div class="cmdk-input-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" class="cmdk-input" id="cmdkInput" placeholder="ابحث في الأنشطة، الإيفنتات، الباكدجز… أو اكتب إجراء" autocomplete="off" />
            <span class="kbd">ESC</span>
          </div>
          <div class="cmdk-results" id="cmdkResults"></div>
          <div class="cmdk-hint">
            <span><span class="kbd">↑</span><span class="kbd">↓</span> تنقل</span>
            <span><span class="kbd">↵</span> تنفيذ</span>
            <span><span class="kbd">Ctrl K</span> فتح / إغلاق</span>
          </div>
        </div>
      </div>

      <div class="modal-backdrop" id="qbModal" role="dialog" aria-modal="true" aria-label="احجز سيشن سريع">
        <div class="modal" role="document">
          <div class="modal-head">
            <h2>احجز سيشن سريع</h2>
            <button class="modal-close" type="button" data-close-qb aria-label="إغلاق">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body" id="qbBody"></div>
          <div class="modal-foot">
            <small class="muted" id="qbHint">اختار نشاط وموعد وسيب الباقي علينا.</small>
            <div style="display: flex; gap: 8px;">
              <a href="${pagesBase()}booking.html" class="btn btn-ghost">الصفحة الكاملة</a>
              <button type="button" class="btn btn-primary" id="qbSubmit" disabled>ابعت الطلب</button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-backdrop" id="activityModal" role="dialog" aria-modal="true" aria-label="عرض النشاط">
        <div class="modal" role="document"></div>
      </div>

      <div class="shortcut-overlay" id="shortcutOverlay" role="dialog" aria-modal="true">
        <div class="shortcut-card">
          <div class="sh-head">
            <h2>اختصارات الكيبورد</h2>
            <button class="modal-close" type="button" data-close-shortcuts aria-label="إغلاق">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="sh-body">
            <div class="shortcut-row"><span>فتح البحث السريع</span><span class="kbd"><span>Ctrl</span><span>K</span></span></div>
            <div class="shortcut-row"><span>حجز سريع</span><span class="kbd"><span>B</span></span></div>
            <div class="shortcut-row"><span>فتح / إغلاق قائمة الإجراءات</span><span class="kbd"><span>.</span></span></div>
            <div class="shortcut-row"><span>الانتقال للرئيسية</span><span class="kbd"><span>G</span><span>H</span></span></div>
            <div class="shortcut-row"><span>الانتقال للأنشطة</span><span class="kbd"><span>G</span><span>A</span></span></div>
            <div class="shortcut-row"><span>الانتقال للحساب</span><span class="kbd"><span>G</span><span>M</span></span></div>
            <div class="shortcut-row"><span>الانتقال للأسعار</span><span class="kbd"><span>G</span><span>P</span></span></div>
            <div class="shortcut-row"><span>الانتقال للإيفنتات</span><span class="kbd"><span>G</span><span>E</span></span></div>
            <div class="shortcut-row"><span>إغلاق أي نافذة</span><span class="kbd"><span>ESC</span></span></div>
            <div class="shortcut-row"><span>عرض الاختصارات</span><span class="kbd"><span>?</span></span></div>
          </div>
        </div>
      </div>
    `;}function renderAdminShell(active){const isAuth=typeof AquaDB!=='undefined'&&AquaDB.admin&&AquaDB.admin.isAuth&&AquaDB.admin.isAuth();if(!isAuth)return'';const stats=adminStats();const path=location.pathname.split('/').pop()||'index.html';const adminHref=(p)=>adminBase()+p;return`
      <div class="adm-shell">
        <div class="adm-sidebar-scrim" id="admScrim"></div>
        <aside class="adm-sidebar" id="admSidebar" aria-label="تنقل الموظف">
          <a href="${adminHref('index.html')}" class="logo">
            <span class="logo-mark"><img src="${BASE}assets/img/boat.png" alt="أكوا لودو" /></span>
            <span>أكوا لودو · لوحة التحكم</span>
          </a>
          <div class="adm-nav">
            <div class="adm-section-label">الرئيسية</div>
            <a href="${adminHref('index.html')}" class="adm-link ${path==='index.html'?'active':''}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5 12 2l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z"/></svg>
              نظرة عامة
            </a>
            <a href="${adminHref('bookings.html')}" class="adm-link ${path==='bookings.html'?'active':''} ${stats.pending>0?'has-pulse':''}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              الحجوزات
              ${stats.pending>0?`<span class="badge">${stats.pending}</span>`:''}
            </a>
            <div class="adm-section-label">المحتوى</div>
            <a href="${adminHref('activities.html')}" class="adm-link ${path==='activities.html'?'active':''}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.5" cy="6.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/><path d="M6.5 8.5v7M17.5 15.5v-7M6.5 15.5 17.5 8.5"/></svg>
              الأنشطة
            </a>
            <a href="${pagesBase()}events.html" class="adm-link" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.8 5.8 21 7 14 2 9.3 9 8.5 12 2"/></svg>
              الإيفنتات
            </a>
            <div class="adm-section-label">العملاء</div>
            <a href="${adminHref('contacts.html')}" class="adm-link ${path==='contacts.html'?'active':''} ${stats.newContacts>0?'has-pulse':''}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              الرسايل
              ${stats.newContacts>0?`<span class="badge">${stats.newContacts}</span>`:''}
            </a>
            <div class="adm-section-label">أدوات</div>
            <a href="${pagesBase()}booking.html" target="_blank" rel="noopener" class="adm-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              حجز جديد
            </a>
            <a href="${rootHome()}" target="_blank" rel="noopener" class="adm-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              عرض الموقع
            </a>
          </div>
          <div class="adm-user">
            <div class="avatar">A</div>
            <div class="who">
              <strong>Admin</strong>
              <small>مرحباً 👋</small>
            </div>
            <button class="logout" id="admLogout" type="button" aria-label="خروج">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </aside>
        <div class="adm-content">
          <div class="adm-topbar">
            <div style="display: flex; align-items: center; gap: 12px;">
              <button class="adm-sidebar-toggle" id="admSidebarToggle" type="button" aria-label="القائمة">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
              <div class="adm-title" id="admPageTitle">${admPageTitle(path)}</div>
            </div>
            <div class="adm-quick" id="admQuick"></div>
          </div>
          <div class="adm-main" id="admMain"></div>
        </div>
      </div>

      <div class="cmdk-backdrop" id="cmdk" role="dialog" aria-modal="true" aria-label="بحث سريع">
        <div class="cmdk" role="document">
          <div class="cmdk-input-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" class="cmdk-input" id="cmdkInput" placeholder="ابحث، روح لقسم، أو نفّذ إجراء…" autocomplete="off" />
            <span class="kbd">ESC</span>
          </div>
          <div class="cmdk-results" id="cmdkResults"></div>
          <div class="cmdk-hint">
            <span><span class="kbd">↑</span><span class="kbd">↓</span> تنقل</span>
            <span><span class="kbd">↵</span> تنفيذ</span>
            <span><span class="kbd">Ctrl K</span> فتح / إغلاق</span>
          </div>
        </div>
      </div>

      <div class="shortcut-overlay" id="shortcutOverlay" role="dialog" aria-modal="true">
        <div class="shortcut-card">
          <div class="sh-head">
            <h2>اختصارات الكيبورد</h2>
            <button class="modal-close" type="button" data-close-shortcuts aria-label="إغلاق">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="sh-body">
            <div class="shortcut-row"><span>فتح البحث السريع</span><span class="kbd"><span>Ctrl</span><span>K</span></span></div>
            <div class="shortcut-row"><span>الذهاب للرئيسية</span><span class="kbd"><span>G</span><span>H</span></span></div>
            <div class="shortcut-row"><span>الذهاب للحجوزات</span><span class="kbd"><span>G</span><span>B</span></span></div>
            <div class="shortcut-row"><span>الذهاب للأنشطة</span><span class="kbd"><span>G</span><span>A</span></span></div>
            <div class="shortcut-row"><span>الذهاب للرسايل</span><span class="kbd"><span>G</span><span>C</span></span></div>
            <div class="shortcut-row"><span>إضافة حجز</span><span class="kbd"><span>N</span></span></div>
            <div class="shortcut-row"><span>تأكيد الحجز المحدد</span><span class="kbd"><span>X</span></span></div>
            <div class="shortcut-row"><span>خروج</span><span class="kbd"><span>Q</span></span></div>
            <div class="shortcut-row"><span>عرض الاختصارات</span><span class="kbd"><span>?</span></span></div>
          </div>
        </div>
      </div>
    `;}function admPageTitle(p){if(p==='index.html')return'نظرة عامة';if(p==='bookings.html')return'الحجوزات';if(p==='activities.html')return'الأنشطة';if(p==='contacts.html')return'رسايل الاتصال';if(p==='login.html')return'دخول الموظف';return'لوحة التحكم';}function adminStats(){if(typeof AquaDB==='undefined')return{pending:0,newContacts:0};const all=AquaDB.bookings?AquaDB.bookings.all():[];const pending=all.filter(b=>b.status==='pending').length;const newContacts=AquaDB.contact?AquaDB.contact.all().length:0;return{pending,newContacts};}function bindAdminShell(){const sidebar=$('#admSidebar');const scrim=$('#admScrim');const toggle=$('#admSidebarToggle');if(toggle&&sidebar&&scrim){toggle.addEventListener('click',()=>{sidebar.classList.toggle('open');scrim.classList.toggle('open');});scrim.addEventListener('click',()=>{sidebar.classList.remove('open');scrim.classList.remove('open');});}const logout=$('#admLogout');if(logout){logout.addEventListener('click',()=>{AquaDB.admin.logout();toast('خرجت','success');setTimeout(()=>location.href=adminBase()+'login.html',400);});}}function renderSplash(){return`
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
    `;}function runSplash(){const splash=$('#splash');if(!splash)return;const nav=(performance.getEntriesByType&&performance.getEntriesByType('navigation')[0])||null;const isReload=!!(nav&&nav.type==='reload');const isBackForward=!!(nav&&nav.type==='back_forward');if(sessionStorage.getItem('aqualudo_splash_seen')&&!isReload&&!isBackForward){splash.classList.add('hidden');document.body.classList.remove('loading');return;}if(isReload)sessionStorage.removeItem('aqualudo_splash_seen');const triPath=$('#tri-path',splash);const boat=$('#boat-glide',splash);const foamL=$('#foam-l',splash);const foamR=$('#foam-r',splash);const splashText=$('#splash-text',splash);const duration=2600;let start=null;function tick(t){if(!start)start=t;const elapsed=t-start;const p=Math.min(elapsed/duration,1);const e=p<0.5?2*p*p:1-Math.pow(-2*p+2,2)/2;const W=window.innerWidth,H=window.innerHeight;const rect=boat.getBoundingClientRect();const bH=rect.height||200,bW=rect.width||60;const startY=-bH,endY=H+bH+40;const y=startY+(endY-startY)*e;const x=W/2;boat.style.transform=`translate(${x}px, ${y}px) translate(-50%, -50%)`;if(p>0.05&&p<0.95&&Math.random()<0.5)makeSpray(splash,x,y,bW);if(y>H*0.28){splashText.style.opacity=Math.max(0,1-(y-H*0.28)/(H*0.3));}const apexX=x;const apexY=y+bH*0.46;const spread=Math.max(0,(y/H)*(W*0.98)+40);const tlx=apexX-spread,tly=-100;const trx=apexX+spread,tryY=-100;triPath.setAttribute('points',`${apexX},${apexY} ${tlx},${tly} ${trx},${tryY}`);foamL.setAttribute('x1',apexX);foamL.setAttribute('y1',apexY);foamL.setAttribute('x2',tlx);foamL.setAttribute('y2',tly);foamR.setAttribute('x1',apexX);foamR.setAttribute('y1',apexY);foamR.setAttribute('x2',trx);foamR.setAttribute('y2',tryY);if(p<1)requestAnimationFrame(tick);else{splash.classList.add('hidden');document.body.classList.remove('loading');sessionStorage.setItem('aqualudo_splash_seen','1');}}function makeSpray(parent,x,y,w){const s=document.createElement('div');s.className='spray';const side=Math.random()>0.5?1:-1;const offX=side*(w*0.45+Math.random()*12);const size=Math.random()*8+5;s.style.width=`${size}px`;s.style.height=`${size}px`;s.style.left=`${x + offX}px`;s.style.top=`${y}px`;parent.appendChild(s);setTimeout(()=>s.remove(),700);}setTimeout(()=>requestAnimationFrame(tick),200);}function bindHeader(){const header=$('#header');if(header){const onScroll=()=>{if(window.scrollY>30)header.classList.add('scrolled');else header.classList.remove('scrolled');};window.addEventListener('scroll',onScroll,{passive:true});onScroll();}const menuToggle=$('#menuToggle');const mobileMenu=$('#mobileMenu');if(menuToggle&&mobileMenu){menuToggle.addEventListener('click',()=>{mobileMenu.classList.toggle('open');document.body.style.overflow=mobileMenu.classList.contains('open')?'hidden':'';});mobileMenu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{mobileMenu.classList.remove('open');document.body.style.overflow='';}));}const userBtn=$('#navUserBtn');const userMenu=$('#userMenu');if(userBtn&&userMenu){userBtn.addEventListener('click',(e)=>{e.stopPropagation();userMenu.classList.toggle('open');userBtn.setAttribute('aria-expanded',userMenu.classList.contains('open'));});document.addEventListener('click',(e)=>{if(!userMenu.contains(e.target)&&!userBtn.contains(e.target)){userMenu.classList.remove('open');userBtn.setAttribute('aria-expanded','false');}});const so=$('#signOutBtn',userMenu);if(so)so.addEventListener('click',()=>{AquaDB.session.clear();toast('خرجت','success');setTimeout(()=>location.reload(),400);});}const hs=$('#headerSearch');if(hs){hs.addEventListener('click',()=>openCommandPalette());}$$('[data-qb]').forEach(b=>b.addEventListener('click',()=>openQuickBook()));}function bindAdminFloat(){const a=$('#adminFloat');if(!a||a._bound)return;a._bound=true;a.addEventListener('click',(e)=>{e.preventDefault();try{if(typeof AquaDB!=='undefined'&&!AquaDB.admin.isAuth()){AquaDB.admin.login(AquaDB.ADMIN_PASSWORD);}}catch(err){}location.href=adminBase()+'index.html';});}function bindFab(){const hub=$('#fabHub');const main=$('#fabMain');if(!hub||!main)return;main.addEventListener('click',(e)=>{e.stopPropagation();hub.classList.toggle('open');main.classList.toggle('open');});document.addEventListener('click',(e)=>{if(!hub.contains(e.target)){hub.classList.remove('open');main.classList.remove('open');}});$$('.fab-action',hub).forEach(b=>{b.addEventListener('click',(e)=>{const act=b.getAttribute('data-fab');if(act==='book'){e.preventDefault();openQuickBook();}hub.classList.remove('open');main.classList.remove('open');});});}const qbState={activityId:null,sessionId:null,name:'',phone:''};function openQuickBook(opts){const modal=$('#qbModal');if(!modal)return;const acts=(typeof AquaDB!=='undefined'&&AquaDB.activities)?AquaDB.activities.active():[];const body=$('#qbBody');const session=(typeof AquaDB!=='undefined'&&AquaDB.session)?AquaDB.session.get():null;const customer=session?AquaDB.customers.get(session.customerId):null;qbState.activityId=(opts&&opts.activityId)||qbState.activityId||(acts[0]&&acts[0].id)||null;qbState.sessionId=null;qbState.name=customer?customer.name:'';qbState.phone=customer?(customer.phone||''):'';renderQBBody(acts);modal.classList.add('open');document.body.style.overflow='hidden';}function closeQuickBook(){const modal=$('#qbModal');if(!modal)return;modal.classList.remove('open');document.body.style.overflow='';}function renderQBBody(acts){const body=$('#qbBody');if(!body)return;const EMOJIS={rowing:'🚣',kayaking:'🛶',sup:'🏄',wake:'🎿',fit:'💪'};body.innerHTML=`
      <div>
        <p class="muted" style="margin-bottom: 12px;">اختار النشاط</p>
        <div class="qb-activity-grid">
          ${acts.map(a => `
            <div class="qb-activity ${qbState.activityId===a.id?'selected':''}" data-qb-act="${a.id}">
              <span class="qb-emoji">${EMOJIS[a.slug] || '🌊'}</span>
              <span>${a.name}</span>
              <span class="qb-num">${a.pricing[0].price} ج</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div style="margin-top: 18px;">
        <p class="muted" style="margin-bottom: 12px;">المواعيد المتاحة (الأسبوع ده)</p>
        <div class="qb-slots" id="qbSlots"></div>
      </div>
      <div class="form-row" style="margin-top: 18px;">
        <div class="field">
          <label>اسمك</label>
          <input type="text" id="qbName" value="${qbState.name}" placeholder="مثلاً: سلمى" />
        </div>
        <div class="field">
          <label>موبايل أو واتساب</label>
          <input type="tel" id="qbPhone" value="${qbState.phone}" placeholder="+20 ..." />
        </div>
      </div>
    `;$$('.qb-activity',body).forEach(c=>c.addEventListener('click',()=>{qbState.activityId=c.getAttribute('data-qb-act');qbState.sessionId=null;$$('.qb-activity',body).forEach(x=>x.classList.remove('selected'));c.classList.add('selected');renderQBSlots();}));const nameI=$('#qbName',body);const phoneI=$('#qbPhone',body);if(nameI)nameI.addEventListener('input',()=>{qbState.name=nameI.value;});if(phoneI)phoneI.addEventListener('input',()=>{qbState.phone=phoneI.value;});renderQBSlots();}function renderQBSlots(){const slots=$('#qbSlots');if(!slots)return;const allSessions=(typeof AquaDB!=='undefined'&&AquaDB.sessions)?AquaDB.sessions.upcoming():[];const acts=AquaDB.activities.active();const list=allSessions.filter(s=>s.activityId===qbState.activityId).slice(0,8);if(list.length===0){slots.innerHTML=`
        <div class="empty-state" style="padding: 30px 16px;">
          <p>مفيش مواعيد متاحة. كلمنا على واتساب وهنرتبلك.</p>
          <a class="btn btn-primary" style="margin-top: 12px;" href="https://wa.me/201011329642" target="_blank" rel="noopener">كلمنا واتساب</a>
        </div>
      `;const submit=$('#qbSubmit');if(submit)submit.disabled=true;return;}slots.innerHTML=list.map(s=>{const a=acts.find(x=>x.id===s.activityId);const d=new Date(s.startsAt);const day=(typeof AquaDB!=='undefined'&&AquaDB.dayName)?AquaDB.dayName[d.getDay()]:'';const mon=(typeof AquaDB!=='undefined'&&AquaDB.monthName)?AquaDB.monthName[d.getMonth()]:'';const time=d.toLocaleTimeString('ar-EG',{hour:'numeric',minute:'2-digit'});return`
        <div class="qb-slot ${qbState.sessionId===s.id?'selected':''}" data-qb-slot="${s.id}">
          <div>
            <div class="qb-slot-time">${day} ${d.getDate()} ${mon} · ${time}</div>
            <div class="qb-slot-meta">${s.booked}/${s.capacity} محجوز · ${a ? a.name : ''}</div>
          </div>
          <div class="qb-slot-price">${a ? a.pricing[0].price : 0} ج</div>
        </div>
      `;}).join('');$$('.qb-slot',slots).forEach(c=>c.addEventListener('click',()=>{qbState.sessionId=c.getAttribute('data-qb-slot');$$('.qb-slot',slots).forEach(x=>x.classList.remove('selected'));c.classList.add('selected');const submit=$('#qbSubmit');if(submit)submit.disabled=!qbState.sessionId;}));}function submitQuickBook(){if(!qbState.activityId||!qbState.sessionId){toast('اختار نشاط وموعد','error');return;}if(!qbState.name.trim()||!qbState.phone.trim()){toast('دخّل اسمك ورقمك','error');return;}const allSessions=AquaDB.sessions.upcoming();const session=allSessions.find(s=>s.id===qbState.sessionId);if(!session){toast('الموعد مش متاح','error');return;}const customer=AquaDB.customers.findOrCreate({name:qbState.name.trim(),phone:qbState.phone.trim()});AquaDB.bookings.create({customerId:customer.id,sessionId:session.id,activityId:qbState.activityId,name:qbState.name.trim(),phone:qbState.phone.trim(),startAt:session.startsAt,partySize:1,payment:'unpaid',});AquaDB.session.set(customer.id);closeQuickBook();toast('استلمنا طلبك، هنكلمك على واتساب','success');setTimeout(()=>location.href=pagesBase()+'account.html',800);}function openActivityModal(slug){const modal=$('#activityModal');if(!modal)return;const a=(typeof AquaDB!=='undefined'&&AquaDB.activities)?AquaDB.activities.get(slug):null;if(!a){toast('النشاط مش موجود','error');return;}const m=$('.modal',modal);m.innerHTML=`
      <div class="modal-head">
        <h2>${a.name}</h2>
        <button class="modal-close" type="button" data-close-activity aria-label="إغلاق">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <img src="${a.hero}" alt="${a.name}" style="width:100%; border-radius: var(--r-md); aspect-ratio: 16/9; object-fit: cover; margin-bottom: 16px;" />
        <p class="muted" style="margin-bottom: 12px;">${a.tagline}</p>
        <p style="margin-bottom: 16px; line-height: 1.6;">${a.long}</p>
        <div class="qa-stack">
          <span class="qa-chip">ابتداءً من ${a.pricing[0].price} ج / ${a.pricing[0].duration}</span>
          ${(a.included || []).slice(0,3).map(x => `<span class="qa-chip">${x}</span>`).join('')}
        </div>
      </div>
      <div class="modal-foot">
        <a class="btn btn-ghost" href="${pagesBase()}activity.html?slug=${a.slug}">صفحة النشاط</a>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-ghost" type="button" data-qb-from-modal="${a.id}">احجز سيشن تاني</button>
          <a class="btn btn-primary" href="${pagesBase()}booking.html?activity=${a.slug}">احجز ${a.name}</a>
        </div>
      </div>
    `;modal.classList.add('open');document.body.style.overflow='hidden';const close=m.querySelector('[data-close-activity]');if(close)close.addEventListener('click',closeActivityModal);const qbFromModal=m.querySelector('[data-qb-from-modal]');if(qbFromModal)qbFromModal.addEventListener('click',()=>{closeActivityModal();openQuickBook({activityId:a.id});});}function closeActivityModal(){const modal=$('#activityModal');if(!modal)return;modal.classList.remove('open');document.body.style.overflow='';}function buildCmdkData(){const isAdmin=isAdminPath();const acts=(typeof AquaDB!=='undefined'&&AquaDB.activities)?AquaDB.activities.all():[];const events=(typeof AquaDB!=='undefined'&&AquaDB.events)?AquaDB.events.all():[];const pkgs=(typeof AquaDB!=='undefined'&&AquaDB.packages)?AquaDB.packages.all():[];const mems=(typeof AquaDB!=='undefined'&&AquaDB.memberships)?AquaDB.memberships.all():[];const sessions=(typeof AquaDB!=='undefined'&&AquaDB.sessions)?AquaDB.sessions.upcoming():[];const nav=isAdmin?[{kind:'إجراء',title:'الرئيسية',sub:'نظرة عامة على الأكاديمية',href:adminBase()+'index.html',icon:'home'},{kind:'إجراء',title:'الحجوزات',sub:'كل حجوزات العملاء',href:adminBase()+'bookings.html',icon:'calendar'},{kind:'إجراء',title:'الأنشطة',sub:'إدارة الأنشطة والأسعار',href:adminBase()+'activities.html',icon:'activity'},{kind:'إجراء',title:'الرسايل',sub:'رسايل نموذج التواصل',href:adminBase()+'contacts.html',icon:'mail'},{kind:'إجراء',title:'إضافة حجز',sub:'حجز جديد من الموظف',action:'qb',icon:'plus'},{kind:'إجراء',title:'تسجيل خروج',sub:'خروج من لوحة التحكم',action:'logout',icon:'logout'},]:[{kind:'صفحة',title:'الرئيسية',sub:'صفحة الهبوط',href:rootHome(),icon:'home'},{kind:'صفحة',title:'الأنشطة',sub:'كل الرياضات المائية',href:pagesBase()+'activities.html',icon:'activity'},{kind:'صفحة',title:'الأسعار',sub:'الباكدجز والـ memberships',href:pagesBase()+'pricing.html',icon:'tag'},{kind:'صفحة',title:'الإيفنتات',sub:'إيفنتات جاية',href:pagesBase()+'events.html',icon:'star'},{kind:'صفحة',title:'مين احنا',sub:'قصة الأكاديمية',href:pagesBase()+'about.html',icon:'info'},{kind:'صفحة',title:'تواصل',sub:'كل القنوات',href:pagesBase()+'contact.html',icon:'phone'},{kind:'صفحة',title:'حسابي',sub:'حجوزاتي وبروفايلي',href:pagesBase()+'account.html',icon:'user'},{kind:'صفحة',title:'لوحة التحكم',sub:'دخول الموظف',href:adminBase()+'login.html',icon:'lock'},{kind:'إجراء',title:'احجز سيشن',sub:'حجز سريع في نافذة',action:'qb',icon:'plus'},];const items=[...nav,...acts.filter(a=>a.active).map(a=>({kind:'نشاط',title:a.name,sub:a.tagline,href:pagesBase()+'activity.html?slug='+a.slug,action:a.slug,icon:'activity',})),...events.map(e=>({kind:'إيفنت',title:e.title,sub:e.tagline,href:pagesBase()+'event.html?slug='+e.slug,icon:'star',})),...pkgs.map(p=>({kind:'باكدج',title:p.name,sub:p.desc+' · '+p.price.toLocaleString()+' ج',href:pagesBase()+'pricing.html#'+p.id,icon:'tag',})),...mems.map(m=>({kind:'Membership',title:m.name,sub:m.desc+' · '+m.price.toLocaleString()+' ج',href:pagesBase()+'pricing.html#'+m.id,icon:'tag',})),...sessions.slice(0,8).map(s=>{const a=acts.find(x=>x.id===s.activityId);const d=new Date(s.startsAt);const day=(typeof AquaDB!=='undefined'&&AquaDB.dayName)?AquaDB.dayName[d.getDay()]:'';const time=d.toLocaleTimeString('ar-EG',{hour:'numeric',minute:'2-digit'});return{kind:'موعد',title:(a?a.name:'سيشن')+' · '+day+' '+d.getDate()+' · '+time,sub:s.booked+'/'+s.capacity+' محجوز',action:'qbSession',id:s.id,activityId:s.activityId,icon:'clock',};}),];return items;}let cmdkData=[];let cmdkIndex=0;function openCommandPalette(){const modal=$('#cmdk');if(!modal)return;cmdkData=buildCmdkData();cmdkIndex=0;modal.classList.add('open');document.body.style.overflow='hidden';const input=$('#cmdkInput',modal);if(input){input.value='';input.focus();}renderCmdkResults('');}function closeCommandPalette(){const modal=$('#cmdk');if(!modal)return;modal.classList.remove('open');document.body.style.overflow='';}function renderCmdkResults(q){const res=$('#cmdkResults');if(!res)return;q=(q||'').trim().toLowerCase();let list=cmdkData;if(q){list=cmdkData.filter(it=>(it.title||'').toLowerCase().includes(q)||(it.sub||'').toLowerCase().includes(q)||(it.kind||'').toLowerCase().includes(q));}if(list.length===0){res.innerHTML=`<div class="cmdk-empty">مفيش نتائج لـ "<strong>${q}</strong>". جرّب كلمة تانية.</div>`;return;}const byKind={};list.forEach(it=>{(byKind[it.kind]=byKind[it.kind]||[]).push(it);});let html='';let flatIndex=0;Object.keys(byKind).forEach(k=>{html+=`<div class="cmdk-group-label">${k}</div>`;byKind[k].forEach(it=>{const isActive=flatIndex===cmdkIndex?'active':'';html+=`
          <div class="cmdk-item ${isActive}" data-cmdk-idx="${flatIndex}" data-cmdk-item='${escapeAttr(JSON.stringify(it))}'>
            <div class="ci-icon">${cmdkIcon(it.icon)}</div>
            <div class="ci-meta">
              <div class="ci-title">${escapeHTML(it.title)}</div>
              ${it.sub ? `<div class="ci-sub">${escapeHTML(it.sub)}</div>` : ''}
            </div>
            <div class="ci-kbd">↵</div>
          </div>
        `;flatIndex++;});});res.innerHTML=html;$$('.cmdk-item',res).forEach(elx=>{elx.addEventListener('click',()=>{const data=JSON.parse(elx.getAttribute('data-cmdk-item'));runCmdkItem(data);});elx.addEventListener('mouseenter',()=>{cmdkIndex=parseInt(elx.getAttribute('data-cmdk-idx'),10);$$('.cmdk-item',res).forEach(x=>x.classList.remove('active'));elx.classList.add('active');});});res._flat=list;}function runCmdkItem(it){if(it.action==='qb'){closeCommandPalette();openQuickBook();return;}if(it.action==='logout'){AquaDB.admin.logout();closeCommandPalette();toast('خرجت','success');setTimeout(()=>location.href=adminBase()+'login.html',400);return;}if(it.action==='qbSession'){closeCommandPalette();openQuickBook({activityId:it.activityId});setTimeout(()=>{const slot=document.querySelector(`[data-qb-slot="${it.id}"]`);if(slot)slot.click();},50);return;}if(it.href){location.href=it.href;return;}}function cmdkIcon(name){const map={home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5 12 2l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z"/></svg>',activity:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.5" cy="6.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/><path d="M6.5 8.5v7M17.5 15.5v-7M6.5 15.5 17.5 8.5"/></svg>',tag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5"/></svg>',star:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.8 5.8 21 7 14 2 9.3 9 8.5 12 2"/></svg>',info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',phone:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',logout:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',calendar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',mail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',};return map[name]||map.info;}function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}function escapeAttr(s){return String(s).replace(/'/g,'&#39;');}function bindGlobal(){document.addEventListener('keydown',(e)=>{const inField=['INPUT','TEXTAREA','SELECT'].includes((e.target.tagName||''));const modal=$('#cmdk');const isOpen=modal&&modal.classList.contains('open');if((e.ctrlKey||e.metaKey)&&(e.key==='k'||e.key==='K')){e.preventDefault();if(isOpen)closeCommandPalette();else openCommandPalette();return;}if(e.key==='Escape'){if(isOpen){closeCommandPalette();return;}const qb=$('#qbModal');if(qb&&qb.classList.contains('open')){closeQuickBook();return;}const am=$('#activityModal');if(am&&am.classList.contains('open')){closeActivityModal();return;}const sh=$('#shortcutOverlay');if(sh&&sh.classList.contains('open')){closeShortcuts();return;}}if(isOpen){if(e.key==='ArrowDown'){e.preventDefault();cmdkIndex=Math.min(cmdkIndex+1,(modal._flat||cmdkData).length-1);renderCmdkResults($('#cmdkInput').value);scrollActive();return;}if(e.key==='ArrowUp'){e.preventDefault();cmdkIndex=Math.max(cmdkIndex-1,0);renderCmdkResults($('#cmdkInput').value);scrollActive();return;}if(e.key==='Enter'){e.preventDefault();const res=$('#cmdkResults');const flat=(res&&res._flat)||cmdkData;if(flat[cmdkIndex])runCmdkItem(flat[cmdkIndex]);return;}}if(inField)return;if(e.key==='b'||e.key==='B'){openQuickBook();return;}if(e.key==='?'){e.preventDefault();openShortcuts();return;}if(e.key==='g'||e.key==='G'){window._gPressed=true;clearTimeout(window._gTimer);window._gTimer=setTimeout(()=>{window._gPressed=false;},900);return;}if(window._gPressed){window._gPressed=false;const k=e.key.toLowerCase();if(isAdminPath()){if(k==='h')location.href=adminBase()+'index.html';else if(k==='b')location.href=adminBase()+'bookings.html';else if(k==='a')location.href=adminBase()+'activities.html';else if(k==='c')location.href=adminBase()+'contacts.html';else if(k==='q'){AquaDB.admin.logout();location.href=adminBase()+'login.html';}}else{if(k==='h')location.href=rootHome();else if(k==='a')location.href=pagesBase()+'activities.html';else if(k==='p')location.href=pagesBase()+'pricing.html';else if(k==='e')location.href=pagesBase()+'events.html';else if(k==='m')location.href=pagesBase()+'account.html';else if(k==='c')location.href=pagesBase()+'contact.html';}return;}if(e.key==='n'||e.key==='N'){if(isAdminPath()&&location.pathname.includes('bookings')){const add=$('#toggleAdd');if(add)add.click();}}if(e.key==='x'||e.key==='X'){if(isAdminPath()&&location.pathname.includes('bookings')){const c=document.querySelector('[data-confirm]');if(c)c.click();}}});function scrollActive(){const a=$('.cmdk-item.active');if(a)a.scrollIntoView({block:'nearest'});}const qbModal=$('#qbModal');if(qbModal){qbModal.addEventListener('click',(e)=>{if(e.target===qbModal)closeQuickBook();});$$('[data-close-qb]',qbModal).forEach(b=>b.addEventListener('click',closeQuickBook));const submit=$('#qbSubmit');if(submit)submit.addEventListener('click',submitQuickBook);}const am=$('#activityModal');if(am){am.addEventListener('click',(e)=>{if(e.target===am)closeActivityModal();});}const cmdk=$('#cmdk');if(cmdk){cmdk.addEventListener('click',(e)=>{if(e.target===cmdk)closeCommandPalette();});const input=$('#cmdkInput',cmdk);if(input)input.addEventListener('input',()=>{cmdkIndex=0;renderCmdkResults(input.value);});}const sh=$('#shortcutOverlay');if(sh){sh.addEventListener('click',(e)=>{if(e.target===sh)closeShortcuts();});$$('[data-close-shortcuts]',sh).forEach(b=>b.addEventListener('click',closeShortcuts));}$$('[data-qb]').forEach(b=>b.addEventListener('click',(e)=>{e.preventDefault();openQuickBook();}));}function openShortcuts(){const sh=$('#shortcutOverlay');if(sh)sh.classList.add('open');}function closeShortcuts(){const sh=$('#shortcutOverlay');if(sh)sh.classList.remove('open');}function bindActivityQuickView(){$$('.activity-card').forEach(card=>{if(card._qvBound)return;card._qvBound=true;const href=card.getAttribute('href')||'';const m=href.match(/slug=([^&]+)/);if(!m)return;const slug=m[1];const btn=el('button','quick-view-btn',`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        عرض سريع
      `);btn.type='button';btn.addEventListener('click',(e)=>{e.preventDefault();e.stopPropagation();openActivityModal(slug);});card.appendChild(btn);});}function reveal(){const io=new IntersectionObserver((entries)=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in');io.unobserve(entry.target);}});},{threshold:0.12,rootMargin:'0px 0px -60px 0px'});document.querySelectorAll('.reveal').forEach(el=>io.observe(el));}function toast(message,kind){let t=$('#toast');if(!t){t=el('div','toast');t.id='toast';document.body.appendChild(t);}t.className='toast '+(kind||'');const icon=kind==='success'?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>':kind==='error'?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';t.innerHTML=icon+'<span>'+message+'</span>';requestAnimationFrame(()=>t.classList.add('show'));clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),3200);}function initBodyClass(){if(isAdminPath())document.body.classList.add('is-admin');else document.body.classList.add('is-public');}global.Aqua={$,$$,el,renderHeader,renderFooter,renderSplash,renderAdminShell,bindAdminShell,runSplash,bindHeader,bindAdminFloat,bindFab,bindGlobal,bindActivityQuickView,openCommandPalette,closeCommandPalette,openQuickBook,closeQuickBook,openActivityModal,closeActivityModal,openShortcuts,closeShortcuts,reveal,toast,initBodyClass,adminStats,};global.AQUA_BASE=BASE;})(window);document.addEventListener('DOMContentLoaded',()=>{if(window.Aqua){Aqua.initBodyClass();Aqua.bindAdminFloat();Aqua.bindFab();Aqua.bindGlobal();Aqua.bindActivityQuickView();}});