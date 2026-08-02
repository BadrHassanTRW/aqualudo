(function () {
  var LANG_KEY = 'aqualudo_lang';
  var DEFAULT_LANG = 'en';
  var path = location.pathname || '';
  var pageLang = /\/en(\/|$)/.test(path) ? 'en' : 'ar';
  var pref = null;
  try { pref = localStorage.getItem(LANG_KEY) || DEFAULT_LANG; } catch (e) { pref = DEFAULT_LANG; }
  var want = pref === 'ar' ? 'ar' : 'en';

  function counterpart(p) {
    if (/\/site\/pages\//.test(p)) return p.replace('/site/pages/', '/site/en/pages/');
    if (/\/site\/admin\//.test(p)) return p.replace('/site/admin/', '/site/en/admin/');
    if (/\/en\//.test(p)) {
      if (/\/site\/en\/index\.html$/.test(p)) return p.replace(/\/site\/en\/index\.html$/, '/index.html');
      return p.replace('/en/', '/');
    }
    return p.replace(/\/(index\.html)?$/, '/site/en/index.html');
  }

  if (want !== pageLang) {
    try { localStorage.setItem(LANG_KEY, want); } catch (e) { /* ignore */ }
    document.documentElement.lang = want;
    location.replace(counterpart(path));
    return;
  }

  var lang = pageLang;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  window.AQUA_LANG = lang;
  window.AQUA_COUNTERPART = counterpart(path);
  window.AQUA_T = function (ar, en) { return lang === 'ar' ? ar : en; };
  window.AQUA_LS = function (href) {
    if (!href || /^(https?:|tel:|mailto:|#|wa\.me)/i.test(href)) return href;
    if (lang === 'en') {
      if (href.indexOf('site/en/') >= 0 || /^(\.\.\/)*en\//.test(href)) return href;
      if (href.indexOf('site/pages/') >= 0) return href.replace('site/pages/', 'site/en/pages/');
      if (href.indexOf('site/admin/') >= 0) return href.replace('site/admin/', 'site/en/admin/');
      if (href.indexOf('/index.html') >= 0) return href.replace('/index.html', '/en/index.html');
      if (href.indexOf('index.html') >= 0) return href.replace('index.html', 'en/index.html');
      return href;
    }
    if (href.indexOf('site/en/') >= 0) return href.replace('site/en/', 'site/');
    if (/^(\.\.\/)*en\//.test(href)) return href.replace(/^(\.\.\/)*en\//, '$1');
    if (href.indexOf('en/index.html') >= 0) return href.replace('en/index.html', 'index.html');
    return href;
  };

  var curDir = path.substring(0, path.lastIndexOf('/') + 1);
  function rel(targetDir) {
    var a = curDir.replace(/\/+$/, '').split('/').filter(Boolean);
    var b = targetDir.replace(/\/+$/, '').split('/').filter(Boolean);
    var i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    var s = '';
    for (var u = 0; u < a.length - i; u++) s += '../';
    var down = b.slice(i);
    return s + down.join('/') + (down.length ? '/' : '');
  }

  var homeDir = lang === 'en' ? '/site/en/' : '/';
  var pagesDir = lang === 'en' ? '/site/en/pages/' : '/site/pages/';
  var adminDir = lang === 'en' ? '/site/en/admin/' : '/site/admin/';
  window.AQUA_NAV = {
    home: function () { return rel(homeDir) + 'index.html'; },
    pages: function (f) { return rel(pagesDir) + (f || ''); },
    admin: function (f) { return rel(adminDir) + (f || ''); }
  };

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('[data-lang-switch]') : null;
    if (!a) return;
    e.preventDefault();
    var to = a.getAttribute('data-lang-switch') === 'ar' ? 'ar' : 'en';
    try { localStorage.setItem(LANG_KEY, to); } catch (err) { /* ignore */ }
    if (a.href) location.href = a.href;
  });
})();
