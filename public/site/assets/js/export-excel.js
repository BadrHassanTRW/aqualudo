/* Export admin page data to a styled Excel (.xlsx) workbook.
   Flow: "Export Excel" button in the admin topbar → preview modal
   (first rows of each sheet) → OK downloads a fully formatted file.
   Bilingual: picks labels per page locale (AQUA_LANG).
   ExcelJS is lazy-loaded from assets/vendor/exceljs.min.js. */
(function (global) {
  'use strict';

  var PAGE = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var EXCELJS_SRC = (function () {
    var s = document.querySelector('script[src*="export-excel.js"]');
    if (!s) return 'assets/vendor/exceljs.min.js';
    var src = s.getAttribute('src') || '';
    var base = src.substring(0, src.lastIndexOf('/') + 1);
    return base + '../vendor/exceljs.min.js';
  })();
  var PREVIEW_ROWS = 5;
  var PREVIEW_COLS = 6;
  var EN = global.AQUA_LANG === 'en';

  function T(ar, en) { return EN ? en : ar; }

  var BRAND = 'FF0B84C6';
  var INK = 'FF082B45';
  var INK_SOFT = 'FF31566E';
  var WARM = 'FFE6F3F8';
  var ALT = 'FFF0F7FB';
  var LINE = 'FFD5EAF3';
  var WHITE = 'FFFFFFFF';

  function A() { return global.Aqua || {}; }
  function toast(msg, kind) { var a = A(); if (a.toast) a.toast(msg, kind || 'success'); }
  function num(n) { return Number(n) || 0; }

  function fmtDT(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function fmtD(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function statusLabel(s) {
    return { confirmed: T('مؤكدة', 'Confirmed'), pending: T('معلقة', 'Pending'), cancelled: T('ملغية', 'Cancelled') }[s] || s || '';
  }
  function paymentLabel(p) {
    return { paid: T('مدفوع', 'Paid'), deposit_paid: T('عربون', 'Deposit'), refunded: T('مرتجع', 'Refunded'), unpaid: T('غير مدفوع', 'Unpaid') }[p] || p || '';
  }
  function dayLabel(d) {
    return (EN
      ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      : ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'])[d] || '';
  }

  function bookingPrice(b) {
    var a = AquaDB.activities.getById(b.activityId);
    return a && a.pricing && a.pricing[0] ? num(a.pricing[0].price) : 0;
  }

  /* ---------------- data builders ---------------- */

  function bookingRows(useFilter) {
    var all = AquaDB.bookings.all();
    var list = all;
    if (useFilter) {
      var f = 'all';
      var tab = document.querySelector('.tab-bar .tab.active');
      if (tab && tab.dataset.filter) f = tab.dataset.filter;
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      list = all.filter(function (b) {
        if (f === 'pending') return b.status === 'pending';
        if (f === 'confirmed') return b.status === 'confirmed';
        if (f === 'cancelled') return b.status === 'cancelled';
        if (f === 'today') { var s = new Date(b.startAt); return s >= today && s < tomorrow; }
        return true;
      });
    }
    return list.map(function (b) {
      var a = AquaDB.activities.getById(b.activityId);
      return {
        name: b.name || '',
        phone: b.phone || '',
        activity: a ? a.name : '—',
        when: fmtDT(b.startAt),
        party: num(b.partySize) || 1,
        payment: paymentLabel(b.payment),
        status: statusLabel(b.status),
        notes: b.notes || '',
        total: bookingPrice(b) * (num(b.partySize) || 1),
        createdAt: fmtDT(b.createdAt),
      };
    });
  }

  function bookingSheet(useFilter) {
    return {
      key: 'bookings',
      name: T('الحجوزات', 'Bookings'),
      columns: [
        { key: 'name', label: T('العميل', 'Customer') },
        { key: 'phone', label: T('الموبايل', 'Phone') },
        { key: 'activity', label: T('النشاط', 'Activity') },
        { key: 'when', label: T('الموعد', 'Date & Time') },
        { key: 'party', label: T('عدد الأفراد', 'Guests'), type: 'number' },
        { key: 'payment', label: T('الدفع', 'Payment') },
        { key: 'status', label: T('الحالة', 'Status') },
        { key: 'notes', label: T('ملاحظات', 'Notes') },
        { key: 'total', label: T('الإجمالي (ج)', 'Total (EGP)'), type: 'number' },
        { key: 'createdAt', label: T('تاريخ الحجز', 'Booked At') },
      ],
      rows: bookingRows(useFilter),
      totals: ['party', 'total'],
    };
  }

  function customerSheet() {
    var bookings = AquaDB.bookings.all();
    var rows = AquaDB.customers.all().map(function (c) {
      var mine = bookings.filter(function (b) { return b.customerId === c.id; });
      var conf = mine.filter(function (b) { return b.status === 'confirmed'; });
      var rev = conf.reduce(function (s, b) { return s + bookingPrice(b) * (num(b.partySize) || 1); }, 0);
      return {
        name: c.name || '',
        email: c.email || '',
        phone: c.phone || '',
        since: fmtD(c.createdAt),
        bookings: mine.length,
        revenue: rev,
      };
    });
    return {
      key: 'customers',
      name: T('العملاء', 'Customers'),
      columns: [
        { key: 'name', label: T('الاسم', 'Name') },
        { key: 'email', label: T('الإيميل', 'Email') },
        { key: 'phone', label: T('الموبايل', 'Phone') },
        { key: 'since', label: T('تاريخ التسجيل', 'Joined') },
        { key: 'bookings', label: T('عدد الحجوزات', 'Bookings'), type: 'number' },
        { key: 'revenue', label: T('إجمالي الإيراد (ج)', 'Total Revenue (EGP)'), type: 'number' },
      ],
      rows: rows,
      totals: ['bookings', 'revenue'],
    };
  }

  function contactSheet() {
    var rows = AquaDB.contact.all().map(function (c) {
      return {
        name: c.name || '',
        email: c.email || '',
        subject: c.subject || T('استفسار', 'Inquiry'),
        message: c.message || '',
        date: fmtDT(c.createdAt),
      };
    });
    return {
      key: 'contacts',
      name: T('رسايل الاتصال', 'Contact Messages'),
      columns: [
        { key: 'name', label: T('الاسم', 'Name') },
        { key: 'email', label: T('الإيميل', 'Email') },
        { key: 'subject', label: T('الموضوع', 'Subject') },
        { key: 'message', label: T('الرسالة', 'Message') },
        { key: 'date', label: T('التاريخ', 'Date') },
      ],
      rows: rows,
      totals: [],
    };
  }

  function activitySheet() {
    var rows = AquaDB.activities.all().map(function (a) {
      var p = a.pricing && a.pricing[0] ? a.pricing[0] : null;
      return {
        name: a.name || '',
        slug: a.slug || '',
        tagline: a.tagline || '',
        price: p ? num(p.price) : 0,
        duration: p ? p.duration : '',
        slots: AquaDB.schedules.for(a.id).length,
        active: a.active ? T('فعّال', 'Active') : T('مؤرشف', 'Archived'),
      };
    });
    return {
      key: 'activities',
      name: T('الأنشطة', 'Activities'),
      columns: [
        { key: 'name', label: T('الاسم', 'Name') },
        { key: 'slug', label: 'slug' },
        { key: 'tagline', label: T('الجملة التسويقية', 'Tagline') },
        { key: 'price', label: T('السعر الأساسي (ج)', 'Base Price (EGP)'), type: 'number' },
        { key: 'duration', label: T('المدة', 'Duration') },
        { key: 'slots', label: T('المواعيد الأسبوعية', 'Weekly Slots'), type: 'number' },
        { key: 'active', label: T('الحالة', 'Status') },
      ],
      rows: rows,
      totals: ['price', 'slots'],
    };
  }

  function scheduleSheet() {
    var rows = [];
    AquaDB.activities.all().forEach(function (a) {
      AquaDB.schedules.for(a.id).forEach(function (s) {
        rows.push({ activity: a.name, day: dayLabel(s.day), start: s.start, end: s.end, capacity: num(s.capacity) });
      });
    });
    return {
      key: 'schedules',
      name: T('المواعيد الأسبوعية', 'Weekly Schedules'),
      columns: [
        { key: 'activity', label: T('النشاط', 'Activity') },
        { key: 'day', label: T('اليوم', 'Day') },
        { key: 'start', label: T('من', 'From') },
        { key: 'end', label: T('إلى', 'To') },
        { key: 'capacity', label: T('السعة', 'Capacity'), type: 'number' },
      ],
      rows: rows,
      totals: ['capacity'],
    };
  }

  var PAGES = {
    'index.html': { sheets: function () { return [bookingSheet(false), customerSheet(), contactSheet()]; } },
    'bookings.html': { sheets: function () { return [bookingSheet(true)]; } },
    'activities.html': { sheets: function () { return [activitySheet(), scheduleSheet()]; } },
    'contacts.html': { sheets: function () { return [contactSheet()]; } },
  };

  /* ---------------- styled workbook (ExcelJS) ---------------- */

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function sheetWidths(s) {
    return s.columns.map(function (c) {
      var max = String(c.label).length;
      s.rows.slice(0, 40).forEach(function (r) {
        var v = r[c.key];
        var len = String(v === undefined || v === null ? '' : v).length;
        if (len > max) max = len;
      });
      return clamp(max + 6, 12, 50);
    });
  }

  var THIN = { style: 'thin', color: { argb: LINE } };
  function cellBorder() { return { top: THIN, left: THIN, bottom: THIN, right: THIN }; }
  function solid(color) { return { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }; }
  function textAlign() { return EN ? 'left' : 'right'; }

  function buildWorkbook(sheets) {
    var wb = new global.ExcelJS.Workbook();
    wb.creator = 'Aqua Ludo';
    wb.created = new Date();

    sheets.forEach(function (s) {
      var ws = wb.addWorksheet(s.name, { views: [{ rightToLeft: !EN, state: 'frozen', ySplit: 3 }] });
      var widths = sheetWidths(s);
      widths.forEach(function (w, i) { ws.getColumn(i + 1).width = w; });

      ws.mergeCells(1, 1, 1, s.columns.length);
      var title = ws.getCell(1, 1);
      title.value = s.name + T(' — أكوا لودو', ' — Aqua Ludo');
      title.font = { name: 'Arial', size: 14, bold: true, color: { argb: WHITE } };
      title.fill = solid(BRAND);
      title.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(1).height = 30;

      ws.mergeCells(2, 1, 2, s.columns.length);
      var sub = ws.getCell(2, 1);
      sub.value = T('عدد الصفوف: ', 'Rows: ') + s.rows.length + T(' • تم التصدير: ', ' • Exported: ') + new Date().toLocaleString('en-GB');
      sub.font = { name: 'Arial', size: 10, italic: true, color: { argb: INK_SOFT } };
      sub.fill = solid(WARM);
      sub.alignment = { horizontal: textAlign(), vertical: 'middle' };
      ws.getRow(2).height = 22;

      s.columns.forEach(function (c, i) {
        var cell = ws.getCell(3, i + 1);
        cell.value = c.label;
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: WHITE } };
        cell.fill = solid(INK);
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = cellBorder();
      });
      ws.getRow(3).height = 24;
      ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: s.columns.length } };

      s.rows.forEach(function (r, ri) {
        var row = ws.getRow(4 + ri);
        s.columns.forEach(function (c, ci) {
          var cell = row.getCell(ci + 1);
          var v = r[c.key];
          if (c.type === 'number') {
            cell.value = num(v);
            cell.numFmt = '#,##0';
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else {
            cell.value = (v === undefined || v === null) ? '' : String(v);
            cell.alignment = { horizontal: textAlign(), vertical: 'middle', wrapText: widths[ci] >= 34 };
          }
          cell.font = { name: 'Arial', size: 10, color: { argb: INK } };
          cell.border = cellBorder();
          if (ri % 2 === 1) cell.fill = solid(ALT);
        });
        row.height = 20;
      });

      if (s.totals && s.totals.length && s.rows.length > 0) {
        var tr = 4 + s.rows.length;
        s.columns.forEach(function (c, ci) {
          var cell = ws.getCell(tr, ci + 1);
          if (s.totals.indexOf(c.key) >= 0) {
            cell.value = s.rows.reduce(function (sum, r) { return sum + num(r[c.key]); }, 0);
            cell.numFmt = '#,##0';
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (ci === 0) {
            cell.value = T('الإجمالي', 'Total');
            cell.alignment = { horizontal: textAlign(), vertical: 'middle' };
          }
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: INK } };
          cell.fill = solid(WARM);
          cell.border = cellBorder();
        });
      }
    });
    return wb;
  }

  /* ---------------- preview modal ---------------- */

  var modal = null;
  var currentSheets = [];
  var previewIndex = 0;

  function sheetTotalRows() {
    return currentSheets.reduce(function (n, s) { return n + s.rows.length; }, 0);
  }

  function ensureModal() {
    if (modal) return;
    var div = document.createElement('div');
    div.className = 'export-backdrop';
    div.id = 'exportModal';
    div.innerHTML = [
      '<div class="export-card" role="document">',
      '  <div class="export-head">',
      '    <div><h2>' + T('تصدير Excel', 'Export to Excel') + '</h2><p class="muted">' + T('اتأكد من البيانات، وبعدين نزّل الملف.', 'Review the data, then download the file.') + '</p></div>',
      '    <button class="modal-close" type="button" data-export-close aria-label="Close">',
      '      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
      '    </button>',
      '  </div>',
      '  <div class="export-meta" id="exportMeta"></div>',
      '  <div class="admin-table-wrap export-preview-wrap" id="exportPreviewWrap"><table class="admin-table export-preview" id="exportPreview">',
      '    <thead id="exportPreviewHead"></thead><tbody id="exportPreviewBody"></tbody>',
      '  </table></div>',
      '  <p class="export-note" id="exportNote"></p>',
      '  <div class="export-foot">',
      '    <button class="btn btn-ghost" type="button" data-export-close>' + T('إلغاء', 'Cancel') + '</button>',
      '    <button class="btn btn-primary" type="button" id="exportGo"></button>',
      '  </div>',
      '</div>',
    ].join('');
    document.body.appendChild(div);
    modal = div;

    div.addEventListener('click', function (e) { if (e.target === div) closeExport(); });
    div.querySelectorAll('[data-export-close]').forEach(function (b) { b.addEventListener('click', closeExport); });
    div.querySelector('#exportGo').addEventListener('click', onDownload);
  }

  function renderExportMeta() {
    var el = document.getElementById('exportMeta');
    el.innerHTML = currentSheets.map(function (s, i) {
      return '<button type="button" class="export-chip ' + (i === previewIndex ? 'active' : '') + '" data-sheet="' + i + '">' +
        '<strong>' + s.name + '</strong><span>' + s.rows.length + T(' صف • ', ' rows • ') + s.columns.length + T(' عمود', ' cols') + '</span></button>';
    }).join('');
    el.querySelectorAll('[data-sheet]').forEach(function (b) {
      b.addEventListener('click', function () { previewIndex = +b.dataset.sheet; renderExportMeta(); renderPreview(); });
    });
  }

  function renderPreview() {
    var s = currentSheets[previewIndex];
    var head = document.getElementById('exportPreviewHead');
    var body = document.getElementById('exportPreviewBody');
    var note = document.getElementById('exportNote');
    var go = document.getElementById('exportGo');
    var total = sheetTotalRows();
    if (!s || s.rows.length === 0) {
      head.innerHTML = '';
      body.innerHTML = '<tr><td class="empty"><h3>' + T('مفيش بيانات', 'No data') + '</h3><p class="muted">' + T('مفيش صفوف تتصدر في الشيت ده.', 'No rows to export in this sheet.') + '</p></td></tr>';
      note.textContent = T('الملف النهائي هيكون فيه الشيتات اللي ليها بيانات بس.', 'The final file will only include sheets that have data.');
      go.disabled = total === 0;
      go.textContent = T('تنزيل الملف (', 'Download file (') + total + T(' صف)', ' rows)');
      return;
    }
    var wrap = document.getElementById('exportPreviewWrap');
    var maxCols = wrap && wrap.clientWidth < 560 ? 4 : PREVIEW_COLS;
    var cols = s.columns.slice(0, Math.min(PREVIEW_COLS, maxCols));
    var extraCols = s.columns.length - cols.length;
    head.innerHTML = '<tr>' + cols.map(function (c) { return '<th>' + c.label + '</th>'; }).join('') + '</tr>';
    body.innerHTML = s.rows.slice(0, PREVIEW_ROWS).map(function (r) {
      return '<tr>' + cols.map(function (c) {
        var v = r[c.key];
        var val = (v === undefined || v === null) ? '' : String(v);
        if (c.type === 'number') val = num(v).toLocaleString('en-EG');
        return '<td>' + val + '</td>';
      }).join('') + '</tr>';
    }).join('');
    var colNote = extraCols > 0
      ? T(' (أول ' + cols.length + ' أعمدة من أصل ' + s.columns.length + ')', ' (first ' + cols.length + ' of ' + s.columns.length + ' columns)')
      : '';
    note.textContent = T('دي أول ', 'Showing the first ') + PREVIEW_ROWS + T(' صفوف بس من أصل ', ' of ') + s.rows.length + colNote + T(' — الملف النهائي فيه كل البيانات.', ' — the final file includes everything.');
    go.disabled = total === 0;
    go.textContent = T('تنزيل الملف (', 'Download file (') + total + T(' صف)', ' rows)');
  }

  function openExport() {
    var cfg = PAGES[PAGE];
    if (!cfg) return;
    currentSheets = cfg.sheets().filter(function (s) { return s && s.rows; });
    previewIndex = 0;
    ensureModal();
    modal.classList.add('open');
    renderExportMeta();
    renderPreview();
  }

  function closeExport() {
    if (modal) modal.classList.remove('open');
  }

  /* ---------------- download ---------------- */

  var excelPromise = null;
  function loadExcelJS() {
    if (global.ExcelJS) return Promise.resolve();
    if (!excelPromise) {
      excelPromise = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = EXCELJS_SRC;
        s.onload = function () { resolve(); };
        s.onerror = function () { reject(new Error('exceljs load failed')); };
        document.head.appendChild(s);
      });
    }
    return excelPromise;
  }

  function onDownload() {
    var total = sheetTotalRows();
    if (total === 0) { toast(T('مفيش بيانات للتصدير', 'Nothing to export'), 'error'); return; }
    var go = document.getElementById('exportGo');
    go.disabled = true;
    var orig = go.textContent;
    go.textContent = T('بنجهّز الملف…', 'Preparing file…');
    loadExcelJS()
      .then(function () { return buildWorkbook(currentSheets).xlsx.writeBuffer(); })
      .then(function (buf) {
        var first = currentSheets[0];
        var blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'aqualudo-' + first.name + '-' + new Date().toISOString().slice(0, 10) + '.xlsx';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
        closeExport();
        toast(T('اتنزّل ملف Excel', 'Excel file downloaded'), 'success');
      })
      .catch(function () {
        toast(T('حصلت مشكلة في إنشاء الملف', 'Could not create the file'), 'error');
        go.disabled = false;
        go.textContent = orig;
      });
  }

  /* ---------------- boot ---------------- */

  function init() {
    var cfg = PAGES[PAGE];
    if (!cfg) return;
    if (typeof AquaDB === 'undefined' || !AquaDB.admin || !AquaDB.admin.isAuth()) return;
    var quick = document.getElementById('admQuick');
    if (!quick) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-ghost export-excel-btn';
    btn.id = 'exportBtn';
    btn.title = T('نزّل بيانات الصفحة كملف Excel', 'Download this page\'s data as an Excel file');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>' + T('تصدير Excel', 'Export Excel') + '</span>';
    btn.addEventListener('click', openExport);
    quick.appendChild(btn);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal && modal.classList.contains('open')) closeExport();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  global.Aqua = global.Aqua || {};
  global.Aqua.openExport = openExport;
  global.Aqua.closeExport = closeExport;
  global.Aqua.buildExportWorkbook = buildWorkbook;
})(window);
