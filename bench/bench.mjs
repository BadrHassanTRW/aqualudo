// Repeatable page-load benchmark for aqualudo.
//
// Conditions (fixed for every run):
//   - local HTTP server (no compression) on 127.0.0.1:8123
//   - headless Chrome, fresh user-data-dir, cache disabled via CDP
//   - external hosts (fonts.googleapis.com, fonts.gstatic.com, images.unsplash.com)
//     are blackholed to 127.0.0.1 so failures are instant and identical every run
//   - one shared profile: localStorage seeds once, all pages cold-cache
//   - median of RUNS full-suite passes (default 5)
//
// Metrics per page (ms, median): domContentLoaded (DCL), load, and transfer bytes.
//
// Usage: node bench/bench.mjs [runs] [--json]

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8123;
const RUNS = Math.max(1, parseInt(process.argv[2] || '5', 10));
const JSON_OUT = process.argv.includes('--json');
const CHROME = process.env.CHROME || 'C:\\Users\\10\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';

const PAGES = [
  { name: '01-home',                 url: '/index.html' },
  { name: '02-activities',           url: '/site/pages/activities.html' },
  { name: '03-activity-rowing',      url: '/site/pages/activity.html?slug=rowing' },
  { name: '04-activity-kayaking',    url: '/site/pages/activity.html?slug=kayaking' },
  { name: '05-activity-sup',         url: '/site/pages/activity.html?slug=sup' },
  { name: '06-activity-wake',        url: '/site/pages/activity.html?slug=wake' },
  { name: '07-activity-fit',         url: '/site/pages/activity.html?slug=fitness' },
  { name: '08-pricing',              url: '/site/pages/pricing.html' },
  { name: '09-booking',              url: '/site/pages/booking.html' },
  { name: '10-events',               url: '/site/pages/events.html' },
  { name: '11-event-run-row',        url: '/site/pages/event.html?slug=run-row-challenge' },
  { name: '12-event-sunset',         url: '/site/pages/event.html?slug=sunset-paddle' },
  { name: '13-event-regatta',        url: '/site/pages/event.html?slug=nationals-regatta-2026' },
  { name: '14-event-iftar',          url: '/site/pages/event.html?slug=ramadan-iftar' },
  { name: '15-about',                url: '/site/pages/about.html' },
  { name: '16-contact',              url: '/site/pages/contact.html' },
  { name: '17-404',                  url: '/site/pages/404.html' },
  { name: '18-sign-in',              url: '/site/pages/sign-in.html' },
  { name: '19-account',              url: '/site/pages/account.html' },
  { name: '20-account-profile',      url: '/site/pages/account-profile.html' },
  { name: '21-coach',                url: '/site/pages/coach.html?token=demo-youssef' },
  { name: '22-admin-login',          url: '/site/admin/login.html' },
  { name: '23-admin',                url: '/site/admin/index.html' },
  { name: '24-admin-bookings',       url: '/site/admin/bookings.html' },
  { name: '25-admin-activities',     url: '/site/admin/activities.html' },
  { name: '26-admin-contacts',       url: '/site/admin/contacts.html' },
];

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.txt': 'text/plain',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
};

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let url = decodeURIComponent(req.url.split('?')[0]);
      if (url === '/' || url === '') url = '/index.html';
      const fp = path.join(ROOT, url);
      if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || !fs.statSync(fp).isFile()) {
        res.writeHead(404); res.end('not found'); return;
      }
      const ext = path.extname(fp).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(res);
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

function launchChrome(profileDir) {
  return spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=9222',
    `--user-data-dir=${profileDir}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-background-networking', '--disable-default-apps', '--disable-sync',
    '--disable-gpu', '--disable-dev-shm-usage', '--disable-features=Translate',
    '--window-size=1440,900',
    '--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1, MAP fonts.gstatic.com 127.0.0.1, MAP images.unsplash.com 127.0.0.1',
    'about:blank',
  ], { stdio: 'ignore' });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function waitForDebugger(port, tries = 100) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await r.json();
      const page = list.find(t => t.type === 'page');
      if (page) return page;
    } catch { /* not up yet */ }
    await sleep(100);
  }
  throw new Error('Chrome DevTools endpoint did not come up');
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.listeners = new Map(); }
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws failed')); });
    const c = new CDP(ws);
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && c.pending.has(msg.id)) {
        const { res, rej } = c.pending.get(msg.id); c.pending.delete(msg.id);
        msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
      } else if (msg.method) {
        (c.listeners.get(msg.method) || []).forEach(fn => fn(msg.params));
      }
    };
    return c;
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, fn) {
    const a = this.listeners.get(method) || [];
    a.push(fn); this.listeners.set(method, a);
  }
  close() { try { this.ws.close(); } catch {} }
}

async function measurePage(cdp, pageUrl) {
  const loadFired = new Promise(res => cdp.on('Page.loadEventFired', () => res()));
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}${pageUrl}` });
  await loadFired;
  await sleep(60); // let post-load JS settle
  const r = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const n = performance.getEntriesByType('navigation')[0] || { startTime: 0, domContentLoadedEventEnd: 0, loadEventEnd: 0 };
      const res = performance.getEntriesByType('resource');
      const bytes = res.reduce((s, e) => s + (e.transferSize || 0), 0) + (n.transferSize || 0);
      const jsParse = res.filter(e => e.name.endsWith('.js')).reduce((s, e) => s + (e.transferSize || 0), 0);
      return {
        dcl: n.domContentLoadedEventEnd - n.startTime,
        load: n.loadEventEnd - n.startTime,
        bytes, jsParse,
        ttf: n.responseEnd - n.startTime,
        resources: res.length,
      };
    })()`,
  });
  return r.result.value;
}

const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

async function main() {
  const server = await serve();
  const profileDir = fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'aql-bench-'));
  const chrome = launchChrome(profileDir);
  let cdp;
  try {
    const page = await waitForDebugger(9222);
    cdp = await CDP.connect(page.webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.setItem('aqualudo_admin_session', JSON.stringify({ since: new Date().toISOString() }));`,
    });

    const results = PAGES.map(p => ({ name: p.name, url: p.url, runs: [] }));
    for (let run = 0; run < RUNS; run++) {
      for (const p of results) {
        const m = await measurePage(cdp, p.url);
        p.runs.push(m);
      }
    }
    const out = results.map(p => {
      const pick = (k) => Math.round(median(p.runs.map(r => r[k])) * 10) / 10;
      return {
        page: p.name, dcl: pick('dcl'), load: pick('load'), bytes: pick('bytes'),
        jsParse: pick('jsParse'), ttf: pick('ttf'), resources: pick('resources'),
        worstDcl: Math.round(Math.max(...p.runs.map(r => r.dcl)) * 10) / 10,
      };
    });

    if (JSON_OUT) { console.log(JSON.stringify(out, null, 2)); }
    else {
      console.log(`runs=${RUNS}  (median per page, ms; external hosts blackholed; cold cache)`);
      console.log('page'.padEnd(24), 'DCL'.padStart(8), 'load'.padStart(8), 'ttfb'.padStart(8), 'bytes'.padStart(10), 'JS kB'.padStart(8), 'reqs'.padStart(6), 'worstDCL'.padStart(10));
      let maxDcl = 0, maxLoad = 0;
      for (const r of out) {
        if (r.dcl > maxDcl) maxDcl = r.dcl;
        if (r.load > maxLoad) maxLoad = r.load;
        console.log(r.page.padEnd(24), String(r.dcl).padStart(8), String(r.load).padStart(8), String(r.ttf).padStart(8),
          String(r.bytes).padStart(10), String(Math.round(r.jsParse / 1024)).padStart(8), String(r.resources).padStart(6), String(r.worstDcl).padStart(10));
      }
      const pass = maxLoad < 200;
      console.log(`\nmax DCL ${maxDcl} ms | max load ${maxLoad} ms | target load < 200 ms -> ${pass ? 'PASS' : 'FAIL'}`);
    }
  } finally {
    if (cdp) cdp.close();
    chrome.kill();
    server.close();
    try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch {}
  }
}

main().catch(e => { console.error(e); process.exit(1); });
