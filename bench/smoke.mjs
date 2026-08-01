// Smoke test: load key pages headless, assert expected DOM, dump console errors.
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8125;
const CHROME = process.env.CHROME || 'C:\\Users\\10\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const server = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') url = '/index.html';
  const fp = path.join(ROOT, url);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp)) { res.writeHead(404); res.end(); return; }
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4' };
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const profileDir = fs.mkdtempSync(path.join(process.env.TEMP, 'aql-smoke-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9226', `--user-data-dir=${profileDir}`,
  '--no-first-run', '--disable-extensions', '--disable-background-networking', '--disable-gpu',
  '--window-size=1440,900',
  '--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1, MAP fonts.gstatic.com 127.0.0.1, MAP images.unsplash.com 127.0.0.1',
  'about:blank',
], { stdio: 'ignore' });

async function getTarget() {
  for (let i = 0; i < 100; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:9226/json/list')).json();
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
await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('aqualudo_admin_session', JSON.stringify({ since: new Date().toISOString() }));` });

const checks = [
  ['home', '/index.html', `(() => {
    const q = (s) => document.querySelector(s);
    const acts = q('#home-activities') ? q('#home-activities').children.length : -1;
    const card = q('#home-activities .activity-card .num');
    return { header: !!q('#header'), footer: !!q('footer'), splash: !!q('#splash'), activities: acts, firstCard: card ? card.textContent : 'NONE', heroArt: (q('#hero-art') || {}).src ? 'SET' : 'EMPTY' };
  })()`],
  ['activities', '/site/pages/activities.html', `(() => { const g = document.querySelector('#grid'); return { grid: g ? g.children.length : -1, first: g ? g.children[0].querySelector('.num').textContent : 'NONE' }; })()`],
  ['activity', '/site/pages/activity.html?slug=rowing', `(() => { const d = document.querySelector('#detail'); return { title: document.title, detail: !!d && d.innerHTML.length > 100, hero: d ? !!d.querySelector('img') : false }; })()`],
  ['booking', '/site/pages/booking.html', `(() => { return { form: !!document.querySelector('#bookingForm, form'), selects: document.querySelectorAll('select').length }; })()`],
  ['pricing', '/site/pages/pricing.html', `(() => { return { cards: document.querySelectorAll('.price-card').length }; })()`],
  ['admin', '/site/admin/index.html', `(() => { return { shell: !!document.querySelector('.adm-shell'), metrics: document.querySelectorAll('.metric-card').length }; })()`],
  ['admin-bookings', '/site/admin/bookings.html', `(() => { return { shell: !!document.querySelector('.adm-shell'), rows: document.querySelectorAll('tbody tr, .booking-row').length }; })()`],
];

for (const [name, url, expr] of checks) {
  cdp.errors = [];
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}${url}` });
  await new Promise(res => cdp.on('Page.loadEventFired', () => res()));
  await sleep(120);
  const r = await cdp.send('Runtime.evaluate', { returnByValue: true, expression: expr });
  const ok = !cdp.errors.length;
  console.log(`[${ok ? 'OK ' : 'ERR'}] ${name.padEnd(16)} ${JSON.stringify(r.result.value)}${cdp.errors.length ? '  ' + cdp.errors.join(' | ') : ''}`);
}

chrome.kill();
server.close();
try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch {}
