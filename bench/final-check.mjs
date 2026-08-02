// EN admin on mobile + desktop geometry after fixes.
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const CHROME = process.env.CHROME || 'C:\\Users\\10\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:3000';
const WIDTH = Number(process.argv[2] || 390);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const profileDir = fs.mkdtempSync('F:\\aqualudo\\.next\\aql-final-');
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9239', `--user-data-dir=${profileDir}`,
  '--no-first-run', '--disable-extensions', '--disable-background-networking', '--disable-gpu',
  `--window-size=${WIDTH},1200`, 'about:blank',
], { stdio: 'ignore' });

async function getTarget() {
  for (let i = 0; i < 100; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:9239/json/list')).json();
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
      } else if (msg.method) { try { (c.listeners.get(msg.method) || []).forEach(fn => fn(msg.params)); } catch {} }
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
await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('aqualudo_admin_session', JSON.stringify({ since: new Date().toISOString() })); localStorage.setItem('aqualudo_lang', 'en');` });

const evalv = async (expr) => (await cdp.send('Runtime.evaluate', { returnByValue: true, expression: expr })).result.value;
const visit = async (url) => {
  cdp.errors = [];
  await cdp.send('Page.navigate', { url: BASE + url });
  await new Promise(res => cdp.on('Page.loadEventFired', () => res()));
  await sleep(1500);
};

await visit('/site/admin/bookings.html');
console.log('EN bookings path:', await evalv('location.pathname'), '| dir:', await evalv('document.documentElement.dir'));
console.log('EN card label:', await evalv(`(() => { const td = document.querySelector('.admin-table tbody tr td'); return td ? td.dataset.label : 'none'; })()`));
console.log('EN card rows:', await evalv(`document.querySelectorAll('.admin-table tbody tr').length`));
console.log('EN actions clickable:', await evalv(`(() => { const b = document.querySelector('[data-confirm]'); if (!b) return 'no pending'; const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; })()`));
console.log('EN overflow:', await evalv(`document.body.scrollWidth > window.innerWidth`));
console.log('EN errors:', cdp.errors.length ? cdp.errors.join(' | ') : 'none');

await visit('/site/en/admin/index.html');
console.log('EN dash stacked:', await evalv(`getComputedStyle(document.querySelector('.dash-grid')).gridTemplateColumns`));
console.log('EN sidebar drawer left:', await evalv(`(() => { const s = document.querySelector('.adm-sidebar'); const c = getComputedStyle(s); return JSON.stringify({ pos: c.position, x: Math.round(s.getBoundingClientRect().x), w: Math.round(s.getBoundingClientRect().width) }); })()`));

chrome.kill();
try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch {}
