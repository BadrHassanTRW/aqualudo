// Text-based DOM inspection of admin pages at a given width (model can't view images).
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const CHROME = process.env.CHROME || 'C:\\Users\\10\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:3000';
const WIDTH = Number(process.argv[2] || 390);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const profileDir = fs.mkdtempSync('F:\\aqualudo\\.next\\aql-inspect-');
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9235', `--user-data-dir=${profileDir}`,
  '--no-first-run', '--disable-extensions', '--disable-background-networking', '--disable-gpu',
  `--window-size=${WIDTH},1200`, 'about:blank',
], { stdio: 'ignore' });

async function getTarget() {
  for (let i = 0; i < 100; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:9235/json/list')).json();
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
await cdp.send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: 1200, deviceScaleFactor: 2, mobile: true });
await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('aqualudo_admin_session', JSON.stringify({ since: new Date().toISOString() }));` });

const evalv = async (expr) => (await cdp.send('Runtime.evaluate', { returnByValue: true, expression: expr })).result.value;

const geom = (sel) => `(() => {
  const out = {};
  document.querySelectorAll(${JSON.stringify(sel)}).forEach((el, i) => {
    const r = el.getBoundingClientRect();
    out[i] = JSON.stringify({ cls: (el.className || '').toString().slice(0, 40), x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height) });
  });
  return JSON.stringify(out);
})()`;

const visit = async (name, url) => {
  cdp.errors = [];
  await cdp.send('Page.navigate', { url: BASE + url });
  await new Promise(res => cdp.on('Page.loadEventFired', () => res()));
  await sleep(1500);
  const w = await evalv('window.innerWidth');
  const sw = await evalv('document.body.scrollWidth');
  console.log(`\n=== ${name}  (innerWidth=${w}, bodyScroll=${sw}, overflow=${sw > w})`);
  console.log('metrics   ', await evalv(geom('.metric-card')));
  console.log('dashCards ', await evalv(geom('.dashboard-card')));
  console.log('adminCards', await evalv(geom('.admin-card')));
  console.log('pageHead  ', await evalv(geom('.admin-page-head, .admin-page-head > div, .admin-page-head .actions')));
  console.log('tabs      ', await evalv(geom('.tab-bar, .tab-bar .tab')));
  console.log('table     ', await evalv(geom('.admin-table, .admin-table th, .admin-table td, .admin-table tbody tr')));
  console.log('forms     ', await evalv(geom('.admin-form, .admin-form .field, .admin-form input, .admin-form select')));
  console.log('kpis      ', await evalv(geom('.kpi-row, .kpi-row .kpi-label')));
  console.log('errs      ', cdp.errors.length ? cdp.errors.join(' | ') : 'none');
};

await visit('dashboard', '/site/admin/index.html');
await visit('bookings', '/site/admin/bookings.html');
await visit('activities', '/site/admin/activities.html');
await visit('contacts', '/site/admin/contacts.html');

// Test the sidebar toggle with a real click
await cdp.send('Page.navigate', { url: BASE + '/site/admin/index.html' });
await new Promise(res => cdp.on('Page.loadEventFired', () => res()));
await sleep(1500);
const toggleResult = await evalv(`(() => {
  const t = document.querySelector('#admSidebarToggle');
  if (!t) return 'no toggle';
  const before = document.querySelector('#admSidebar').classList.contains('open');
  t.click();
  const after = document.querySelector('#admSidebar').classList.contains('open');
  const r = document.querySelector('#admSidebar').getBoundingClientRect();
  return JSON.stringify({ before, after, sidebarW: Math.round(r.width), sidebarX: Math.round(r.x), vis: getComputedStyle(document.querySelector('#admSidebar')).visibility });
})()`);
console.log('\n=== sidebar toggle click:', toggleResult);
const drawerLinkTest = await evalv(`(() => {
  const link = document.querySelector('#admSidebar a[href*="bookings.html"]');
  if (!link) return 'no link';
  link.click();
  return 'clicked ' + link.getAttribute('href');
})()`);
await sleep(1500);
console.log('after drawer link click ->', await evalv('location.pathname'));
console.log('sidebar still open?', await evalv(`document.querySelector('#admSidebar').classList.contains('open')`));

chrome.kill();
try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch {}
