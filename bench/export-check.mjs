// Export feature check: button presence, preview modal content, workbook build, download.
// Runs against both locales (en/ and ar/).
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const PORT = 8127;
const CHROME = process.env.CHROME || 'C:\\Users\\10\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const server = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') url = '/index.html';
  const fp = path.join(ROOT, url);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp)) { res.writeHead(404); res.end(); return; }
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const profileDir = fs.mkdtempSync(path.join(process.env.TEMP, 'aql-exp-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9228', `--user-data-dir=${profileDir}`,
  '--no-first-run', '--disable-extensions', '--disable-background-networking', '--disable-gpu',
  '--window-size=1440,900',
  'about:blank',
], { stdio: 'ignore' });

async function getTarget() {
  for (let i = 0; i < 100; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:9228/json/list')).json();
      const p = list.find(t => t.type === 'page');
      if (p) return p;
    } catch {}
    await sleep(100);
  }
  throw new Error('no target');
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.listeners = new Map(); this.errors = []; }
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws')); });
    const c = new CDP(ws);
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && c.pending.has(msg.id)) {
        const { res, rej } = c.pending.get(msg.id); c.pending.delete(msg.id);
        msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
      } else if (msg.method) (c.listeners.get(msg.method) || []).forEach(fn => fn(msg.params));
    };
    return c;
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); });
  }
  on(method, fn) { const a = this.listeners.get(method) || []; a.push(fn); this.listeners.set(method, a); }
}

const page = await getTarget();
const cdp = await CDP.connect(page.webSocketDebuggerUrl);
await cdp.send('Page.enable');
await cdp.send('Runtime.enable');
await cdp.send('Network.enable');
cdp.on('Runtime.exceptionThrown', (p) => cdp.errors.push('EXC: ' + (p.exceptionDetails?.exception?.description || 'unknown')));
cdp.on('Log.entryAdded', (p) => { if (p.entry.level === 'error') cdp.errors.push('LOG: ' + p.entry.text); });
cdp.on('Network.responseReceived', (p) => { if (p.response.status >= 400) cdp.errors.push('HTTP ' + p.response.status + ': ' + p.response.url); });
await cdp.send('Log.enable');
await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('aqualudo_admin_session', JSON.stringify({ since: new Date().toISOString() })); localStorage.setItem('aqualudo_lang', /\\/site\\/admin\\//.test(location.pathname) ? 'ar' : 'en');` });

async function evalJS(expression) {
  const r = await cdp.send('Runtime.evaluate', { returnByValue: true, awaitPromise: true, expression });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
  return r.result.value;
}

async function nav(url) {
  cdp.errors = [];
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}${url}` });
  await new Promise(res => cdp.on('Page.loadEventFired', () => res()));
  await sleep(250);
}

const pages = [
  ['overview', 'index.html', 3],
  ['bookings', 'bookings.html', 1],
  ['activities', 'activities.html', 2],
  ['contacts', 'contacts.html', 1],
];

let failed = false;
for (const [locale, langPref, base] of [
  ['EN', 'en', '/site/en/admin/'],
  ['AR', 'ar', '/site/admin/'],
]) {
  for (const [name, rel, expectedSheets] of pages) {
    try {
      await nav(base + rel);

      const btn = await evalJS(`(() => {
        const b = document.querySelector('#exportBtn');
        return b ? { text: b.textContent.trim().replace(/\\s+/g, ' '), visible: b.offsetParent !== null } : null;
      })()`);
      if (!btn) throw new Error('export button missing');
      const wantLabel = langPref === 'ar' ? 'تصدير Excel' : 'Export Excel';
      if (btn.text !== wantLabel) throw new Error(`button label "${btn.text}" != "${wantLabel}"`);
      console.log(`[OK ] ${locale} ${name.padEnd(11)} button: "${btn.text}"`);

      await evalJS(`document.querySelector('#exportBtn').click(); true`);
      await sleep(150);
      const modal = await evalJS(`(() => {
        const m = document.querySelector('#exportModal');
        if (!m || !m.classList.contains('open')) return { open: false };
        return {
          open: true,
          chips: [...document.querySelectorAll('.export-chip')].map(c => c.textContent.trim().replace(/\\s+/g, ' ')),
          headCols: document.querySelectorAll('#exportPreviewHead th').length,
          previewRows: document.querySelectorAll('#exportPreviewBody tr').length,
          firstCell: (document.querySelector('#exportPreviewBody td') || {}).textContent || '',
          note: document.querySelector('#exportNote').textContent.trim(),
          go: document.querySelector('#exportGo').textContent.trim(),
          wrapOverflow: (() => {
            const w = document.querySelector('#exportPreviewWrap');
            const t = document.querySelector('#exportPreview');
            return t.scrollWidth - w.clientWidth;
          })(),
        };
      })()`);
      if (!modal.open) throw new Error('modal did not open');
      if (modal.chips.length !== expectedSheets) throw new Error(`expected ${expectedSheets} sheets, got ${modal.chips.length}`);
      const isEmpty = modal.chips[0].includes('0 rows') || modal.chips[0].includes('0 صف');
      if (!isEmpty && (modal.headCols < 2 || modal.previewRows < 1 || !modal.firstCell)) throw new Error('preview table empty');
      if (modal.headCols > 6) throw new Error(`preview should cap at 6 columns, got ${modal.headCols}`);
      if (modal.wrapOverflow > 1) throw new Error(`preview overflows its wrap by ${modal.wrapOverflow}px`);
      console.log(`[OK ] ${locale} ${name.padEnd(11)} modal: ${modal.chips.join(' | ')} | ${modal.headCols}x${modal.previewRows} first="${modal.firstCell.slice(0, 24)}"`);
      if (modal.note.includes('columns') || modal.note.includes('أعمدة')) console.log(`      note: ${modal.note}`);

      const wb = await evalJS(`(async () => {
        const vendor = document.querySelector('script[src*="export-excel.js"]').getAttribute('src').replace(/js\\/export-excel\\.js$/, 'vendor/exceljs.min.js');
        const script = document.createElement('script');
        script.src = vendor;
        await new Promise((res, rej) => { script.onload = res; script.onerror = rej; document.head.appendChild(script); });
        const bookings = JSON.parse(localStorage.getItem('aqualudo_db_bookings') || '[]');
        const sample = bookings.slice(0, 2).map((b, i) => ({ a: b.name, b: i + 1 }));
        const wb = Aqua.buildExportWorkbook([
          { name: 'Test', columns: [{ key: 'a', label: 'Col A' }, { key: 'b', label: 'Col B', type: 'number' }], rows: sample, totals: ['b'] },
        ]);
        const ws = wb.worksheets[0];
        const buf = await wb.xlsx.writeBuffer();
        const last = ws.lastRow.number;
        return {
          bytes: buf.byteLength,
          magic: Array.from(new Uint8Array(buf.slice(0, 4))).join(','),
          sheetName: ws.name,
          title: ws.getCell('A1').value,
          subtitle: ws.getCell('A2').value,
          header: [ws.getCell('A3').value, ws.getCell('B3').value],
          firstRow: [ws.getCell('A4').value, ws.getCell('B4').value],
          totalRow: ws.getCell(last, 2).value,
          totalLabel: ws.getCell(last, 1).value,
          headerFill: ws.getCell('A3').fill.fgColor.argb,
          rtl: ws.views[0].rightToLeft,
        };
      })()`);
      if (wb.magic !== '80,75,3,4') throw new Error('not a valid xlsx: ' + wb.magic);
      const wantTitle = `Test — ${langPref === 'ar' ? 'أكوا لودو' : 'Aqua Ludo'}`;
      if (wb.title !== wantTitle) throw new Error('title cell wrong: ' + wb.title);
      const wantTotal = langPref === 'ar' ? 'الإجمالي' : 'Total';
      if (wb.header[0] !== 'Col A' || wb.totalRow !== 3 || wb.totalLabel !== wantTotal) throw new Error('content wrong: ' + JSON.stringify(wb));
      console.log(`[OK ] ${locale} ${name.padEnd(11)} workbook: ${wb.bytes}b, title="${wb.title}", totals=${wb.totalRow}, fill=${wb.headerFill} rtl=${wb.rtl}`);

      const dl = await evalJS(`(async () => {
        const r = await new Promise((resolve) => {
          window.__dl = null;
          const orig = URL.createObjectURL;
          URL.createObjectURL = (b) => { window.__dl = { size: b.size, type: b.type }; return orig(b); };
          document.querySelector('#exportGo').click();
          setTimeout(() => {
            const t = document.querySelector('#toast');
            resolve({ blob: window.__dl, toast: t ? t.textContent.trim().replace(/\\s+/g, ' ') : null });
          }, 1500);
        });
        return r;
      })()`);
      if (isEmpty) {
        if (dl.blob) throw new Error('expected no download for empty sheet');
        const disabled = await evalJS(`document.querySelector('#exportGo').disabled`);
        if (!disabled) throw new Error('expected download button disabled');
        console.log(`[OK ] ${locale} ${name.padEnd(11)} empty sheet: blocked (button disabled)`);
      } else {
        if (!dl.blob) throw new Error('no download blob produced');
        console.log(`[OK ] ${locale} ${name.padEnd(11)} download: ${dl.blob.size} bytes (${dl.blob.type})`);
      }

      await evalJS(`Aqua.closeExport(); true`);
    } catch (e) {
      failed = true;
      console.log(`[ERR] ${locale} ${name.padEnd(11)} ${e.message}`);
    }
    if (cdp.errors.length) { failed = true; console.log(`      console errors: ${cdp.errors.join(' | ')}`); }
  }
}

// Real download: capture the actual file for EN overview (3 sheets) and AR bookings.
const DL_DIR = fs.mkdtempSync(path.join(process.env.TEMP, 'aql-dl-'));
await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DL_DIR });

await evalJS(`localStorage.setItem('aqualudo_lang', 'en'); true`);
await nav('/site/en/admin/index.html');
await evalJS(`document.querySelector('#exportBtn').click(); true`);
await sleep(150);
await evalJS(`document.querySelector('#exportGo').click(); true`);
await sleep(2000);
const enFiles = fs.readdirSync(DL_DIR);
console.log(`[DL ] EN overview file: ${enFiles.join(', ') || 'NONE'}`);

await evalJS(`localStorage.setItem('aqualudo_lang', 'ar'); true`);
await nav('/site/admin/bookings.html');
await evalJS(`document.querySelector('#exportBtn').click(); true`);
await sleep(150);
await evalJS(`document.querySelector('#exportGo').click(); true`);
await sleep(2000);
const arFiles = fs.readdirSync(DL_DIR).filter(f => !enFiles.includes(f));
console.log(`[DL ] AR bookings file: ${arFiles.join(', ') || 'NONE'}`);

// Mobile viewport check: preview stays a table, no page-level horizontal scroll.
await evalJS(`localStorage.setItem('aqualudo_lang', 'ar'); true`);
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await nav('/site/admin/bookings.html');
try {
  const mobile = await evalJS(`(async () => {
    document.querySelector('#exportBtn').click();
    await new Promise(r => setTimeout(r, 200));
    const m = document.querySelector('#exportModal');
    const card = document.querySelector('.export-card');
    const thead = getComputedStyle(document.querySelector('#exportPreviewHead'));
    const body = document.body;
    const wrap = document.querySelector('.export-preview-wrap');
    const r = {
      modalOpen: m.classList.contains('open'),
      pageScrollW: body.scrollWidth,
      innerW: window.innerWidth,
      cardW: card.getBoundingClientRect().width,
      theadDisplay: thead.display,
      headCols: document.querySelectorAll('#exportPreviewHead th').length,
      wrapScrollY: getComputedStyle(wrap).overflowY,
      cardBottom: card.getBoundingClientRect().bottom,
      innerH: window.innerHeight,
      exportBtnText: document.querySelector('#exportBtn').textContent.trim(),
      exportSpanHidden: getComputedStyle(document.querySelector('#exportBtn span')).display === 'none',
      wrapOverflow: (() => {
        const w = document.querySelector('#exportPreviewWrap');
        const t = document.querySelector('#exportPreview');
        return t.scrollWidth - w.clientWidth;
      })(),
    };
    Aqua.closeExport();
    return r;
  })()`);
  console.log(`[OK ] mobile preview: card=${mobile.cardW}px on ${mobile.innerW}px, thead=${mobile.theadDisplay}, wrap-y=${mobile.wrapScrollY}, cols=${mobile.headCols}`);
  if (!mobile.modalOpen) throw new Error('modal did not open on mobile');
  if (mobile.pageScrollW > mobile.innerW) throw new Error(`page scrolls horizontally: ${mobile.pageScrollW} > ${mobile.innerW}`);
  if (mobile.theadDisplay !== 'table-header-group') throw new Error(`preview thead hidden on mobile: ${mobile.theadDisplay}`);
  if (mobile.cardW > mobile.innerW) throw new Error(`card overflows viewport: ${mobile.cardW} > ${mobile.innerW}`);
  if (mobile.cardBottom > mobile.innerH + 1) throw new Error(`card taller than viewport: bottom=${mobile.cardBottom} vs ${mobile.innerH}`);
  if (mobile.exportSpanHidden && mobile.exportBtnText === 'تصدير Excel') console.log(`      export button: icon-only on mobile (span hidden)`);
  if (mobile.headCols > 4) throw new Error(`mobile should cap at 4 columns, got ${mobile.headCols}`);
  if (mobile.wrapOverflow > 1) throw new Error(`mobile preview overflows its wrap by ${mobile.wrapOverflow}px`);
} catch (e) {
  failed = true;
  console.log(`[ERR] mobile ${e.message}`);
}
await cdp.send('Emulation.clearDeviceMetricsOverride');

chrome.kill();
server.close();
try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch {}
process.exit(failed ? 1 : 0);
