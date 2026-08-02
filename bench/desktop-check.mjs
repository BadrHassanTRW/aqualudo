// Desktop regression assertions (no device emulation — plain 1440 window).
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const CHROME = process.env.CHROME || 'C:\\Users\\10\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:3000';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const profileDir = fs.mkdtempSync('F:\\aqualudo\\.next\\aql-desktop-');
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9237', `--user-data-dir=${profileDir}`,
  '--no-first-run', '--disable-extensions', '--disable-background-networking', '--disable-gpu',
  '--window-size=1440,900', 'about:blank',
], { stdio: 'ignore' });

async function getTarget() {
  for (let i = 0; i < 100; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:9237/json/list')).json();
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
await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('aqualudo_admin_session', JSON.stringify({ since: new Date().toISOString() }));` });

const evalv = async (expr) => (await cdp.send('Runtime.evaluate', { returnByValue: true, expression: expr })).result.value;

const visit = async (url) => {
  cdp.errors = [];
  await cdp.send('Page.navigate', { url: BASE + url });
  await new Promise(res => cdp.on('Page.loadEventFired', () => res()));
  await sleep(1400);
};

await visit('/site/admin/index.html');
console.log('dash sidebar:', await evalv(`(() => { const s = document.querySelector('.adm-sidebar'); const c = getComputedStyle(s); const r = s.getBoundingClientRect(); return JSON.stringify({ pos: c.position, transform: c.transform, w: Math.round(r.width), h: Math.round(r.height), toggleHidden: getComputedStyle(document.querySelector('.adm-sidebar-toggle')).display }); })()`));
console.log('dash grid cols:', await evalv(`getComputedStyle(document.querySelector('.dash-grid')).gridTemplateColumns`));
console.log('metric grid:', await evalv(`getComputedStyle(document.querySelector('.admin-metrics')).gridTemplateColumns`));

await visit('/site/admin/bookings.html');
console.log('table rows display:', await evalv(`getComputedStyle(document.querySelector('.admin-table tbody tr')).display`));
console.log('thead visible:', await evalv(`getComputedStyle(document.querySelector('.admin-table thead')).display`));
console.log('table width == content:', await evalv(`Math.round(document.querySelector('.admin-table').getBoundingClientRect().width)`));

await visit('/site/admin/activities.html');
console.log('activity row direction:', await evalv(`getComputedStyle(document.querySelector('.activity-row')).flexDirection`));

await visit('/site/admin/contacts.html');
console.log('contacts list items:', await evalv(`document.querySelectorAll('#list .dashboard-card').length`));

await visit('/site/en/admin/index.html');
console.log('EN dash cols:', await evalv(`getComputedStyle(document.querySelector('.dash-grid')).gridTemplateColumns`));
console.log('errors:', cdp.errors.length ? cdp.errors.join(' | ') : 'none');

chrome.kill();
try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch {}
