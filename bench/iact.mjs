// Interaction test for the admin panel at mobile width.
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const CHROME = process.env.CHROME || 'C:\\Users\\10\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:3000';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const profileDir = fs.mkdtempSync('F:\\aqualudo\\.next\\aql-iact-');
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9236', `--user-data-dir=${profileDir}`,
  '--no-first-run', '--disable-extensions', '--disable-background-networking', '--disable-gpu',
  '--window-size=390,1200', 'about:blank',
], { stdio: 'ignore' });

async function getTarget() {
  for (let i = 0; i < 100; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:9236/json/list')).json();
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
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 1200, deviceScaleFactor: 2, mobile: true });
await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('aqualudo_admin_session', JSON.stringify({ since: new Date().toISOString() })); localStorage.setItem('aqualudo_lang', 'ar');` });

const evalv = async (expr) => (await cdp.send('Runtime.evaluate', { returnByValue: true, expression: expr })).result.value;
const visit = async (url) => {
  cdp.errors = [];
  await cdp.send('Page.navigate', { url: BASE + url });
  await new Promise(res => cdp.on('Page.loadEventFired', () => res()));
  await sleep(1500);
};

// 1. AR bookings on mobile
await visit('/site/admin/bookings.html');
console.log('path:', await evalv('location.pathname'), '| dir:', await evalv('document.documentElement.dir'));
console.log('table cards:', await evalv(`document.querySelectorAll('.admin-table tbody tr').length`));
console.log('card tds:', await evalv(`(() => { const tr = document.querySelector('.admin-table tbody tr'); return tr ? tr.children.length : -1; })()`));
console.log('first td label:', await evalv(`(() => { const td = document.querySelector('.admin-table tbody tr td'); return td ? td.dataset.label + ' => ' + td.textContent.trim().slice(0, 30) : 'none'; })()`));
console.log('actions visible:', await evalv(`(() => { const b = document.querySelector('[data-confirm]'); if (!b) return 'no confirm btn (none pending?)'; const r = b.getBoundingClientRect(); return JSON.stringify({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }); })()`));
console.log('tab scrollable:', await evalv(`(() => { const tb = document.querySelector('.tab-bar'); return tb.scrollWidth > tb.clientWidth; })()`));
console.log('quick buttons:', await evalv(`(() => { const q = document.querySelector('.adm-quick'); if (!q) return 'none'; return [...q.children].map(b => b.getBoundingClientRect().width > 0 ? b.textContent.trim() : 'HIDDEN:' + b.textContent.trim()).join(' | '); })()`));

// click confirm on first pending booking
const before = await evalv(`(() => { const b = document.querySelector('[data-confirm]'); return b ? b.closest('tr').textContent.slice(0, 40) : null; })()`);
const clickRes = await evalv(`(() => { const b = document.querySelector('[data-confirm]'); if (!b) return 'no button'; b.click(); return 'clicked'; })()`);
await sleep(500);
const pendingAfter = await evalv(`document.querySelectorAll('[data-confirm]').length`);
console.log('confirm click:', clickRes, '| pending buttons now:', pendingAfter, '| before:', before ? before.replace(/\s+/g, ' ').slice(0, 30) : null);

// 2. Drawer in RTL
await visit('/site/admin/index.html');
await evalv(`document.querySelector('#admSidebarToggle').click()`);
await sleep(500);
console.log('RTL drawer open x:', await evalv(`Math.round(document.querySelector('#admSidebar').getBoundingClientRect().x)`), '| open class:', await evalv(`document.querySelector('#admSidebar').classList.contains('open')`));
console.log('drawer link visible?', await evalv(`(() => { const l = document.querySelector('#admSidebar a[href*="bookings.html"]'); const r = l.getBoundingClientRect(); return r.width > 0 && r.height > 0; })()`));
// scrim closes it
await evalv(`document.querySelector('#admScrim').click()`);
await sleep(500);
console.log('after scrim click, open:', await evalv(`document.querySelector('#admSidebar').classList.contains('open')`));

// 3. Activities rows on mobile
await visit('/site/admin/activities.html');
console.log('activity rows:', await evalv(`document.querySelectorAll('.activity-row').length`));
console.log('activity row stacked:', await evalv(`(() => { const r = document.querySelector('.activity-row'); if (!r) return 'none'; const a = getComputedStyle(r); return a.flexDirection; })()`));
console.log('add button opens form:', await evalv(`(() => { document.querySelector('#toggleAdd').click(); const f = document.getElementById('addForm'); return f.style.display; })()`));

// 4. EN bookings cards (LTR)
await visit('/site/en/admin/bookings.html');
console.log('EN path ok:', await evalv('location.pathname'), '| dir:', await evalv('document.documentElement.dir'));
console.log('EN first td label:', await evalv(`(() => { const td = document.querySelector('.admin-table tbody tr td'); return td ? td.dataset.label : 'none'; })()`));
console.log('EN no overflow:', await evalv(`document.body.scrollWidth <= window.innerWidth`));
console.log('errors:', cdp.errors.length ? cdp.errors.join(' | ') : 'none');

chrome.kill();
try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch {}
