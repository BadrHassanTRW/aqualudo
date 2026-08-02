// Screenshot admin pages at a given width. Usage: node bench/shot.mjs <width> <outdir>
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = process.env.CHROME || 'C:\\Users\\10\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:3000';
const WIDTH = Number(process.argv[2] || 390);
const OUT = path.resolve(process.argv[3] || 'F:\\aqualudo\\.next\\shots');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const profileDir = fs.mkdtempSync('F:\\aqualudo\\.next\\aql-shots-');
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9234', `--user-data-dir=${profileDir}`,
  '--no-first-run', '--disable-extensions', '--disable-background-networking', '--disable-gpu',
  `--window-size=${WIDTH},1200`, 'about:blank',
], { stdio: 'ignore' });

async function getTarget() {
  for (let i = 0; i < 100; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:9234/json/list')).json();
      const p = list.find(t => t.type === 'page');
      if (p) return p;
    } catch {}
    await sleep(100);
  }
  throw new Error('no target');
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.listeners = new Map(); }
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
await cdp.send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: 1200, deviceScaleFactor: 2, mobile: true });
await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('aqualudo_admin_session', JSON.stringify({ since: new Date().toISOString() }));` });

const shot = async (name, url, closeSidebar = false) => {
  cdp.errors = [];
  cdp.on('Runtime.exceptionThrown', (p) => cdp.errors.push('EXC: ' + (p.exceptionDetails?.exception?.description || 'unknown')));
  await cdp.send('Page.navigate', { url: BASE + url });
  await new Promise(res => cdp.on('Page.loadEventFired', () => res()));
  await sleep(1800);
  if (closeSidebar) {
    await cdp.send('Runtime.evaluate', { expression: `(() => { const s = document.querySelector('.adm-sidebar'); if (s && s.classList.contains('open')) s.classList.remove('open'); })()` });
    await sleep(400);
  }
  await cdp.send('Page.captureScreenshot', { format: 'png' }).then(r => fs.writeFileSync(path.join(OUT, `${WIDTH}-${name}.png`), Buffer.from(r.data, 'base64')));
  const info = await cdp.send('Runtime.evaluate', { returnByValue: true, expression: `(() => ({
    href: location.pathname,
    errs: window.__errs || null,
    topbar: !!document.querySelector('.adm-topbar'),
    toggleVisible: (() => { const el = document.querySelector('.adm-sidebar-toggle'); if (!el) return false; const s = getComputedStyle(el); return s.display !== 'none' && el.getBoundingClientRect().width > 0; })(),
    sidebarOpen: !!(document.querySelector('.adm-sidebar') || {}).classList?.contains('open'),
    bodyW: document.body.scrollWidth,
    winW: window.innerWidth,
    horizontalScroll: document.body.scrollWidth > window.innerWidth,
  }))()` });
  console.log(`${name.padEnd(18)} ${JSON.stringify(info.result.value)} ${cdp.errors.length ? 'ERRS: ' + cdp.errors.join(' | ') : ''}`);
};

await shot('admin-dash', '/site/admin/index.html');
await shot('admin-dash-open', '/site/admin/index.html');
await shot('admin-bookings', '/site/admin/bookings.html');
await shot('admin-activities', '/site/admin/activities.html');
await shot('admin-contacts', '/site/admin/contacts.html');

chrome.kill();
try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch {}
