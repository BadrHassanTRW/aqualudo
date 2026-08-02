// Quick repro: fresh profile, open homepage, click admin float, report what happens.
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const CHROME = process.env.CHROME || 'C:\\Users\\10\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE || 'http://localhost:3000';
const WIDTH = Number(process.env.WIDTH || 1440);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const profileDir = fs.mkdtempSync('F:\\aqualudo\\.next\\aql-admin-repro-');
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9233', `--user-data-dir=${profileDir}`,
  '--no-first-run', '--disable-extensions', '--disable-background-networking', '--disable-gpu',
  `--window-size=${WIDTH},900`, 'about:blank',
], { stdio: 'ignore' });

async function getTarget() {
  for (let i = 0; i < 100; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:9233/json/list')).json();
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
cdp.on('Network.responseReceived', (p) => { if (p.response.status >= 400) cdp.errors.push('HTTP ' + p.response.status + ': ' + p.response.url); });
cdp.on('Log.entryAdded', (p) => { if (p.entry.level === 'error') cdp.errors.push('LOG: ' + p.entry.text); });
await cdp.send('Log.enable');

const evalv = async (expr) => (await cdp.send('Runtime.evaluate', { returnByValue: true, expression: expr })).result.value;

await cdp.send('Page.navigate', { url: BASE + '/' });
await sleep(3000);
console.log('after /  ->', await evalv('location.href'));
console.log('lock icon?', await evalv(`!!document.querySelector('#adminFloat')`));
console.log('lock icon rect:', await evalv(`(() => { const el = document.querySelector('#adminFloat'); if (!el) return 'none'; const r = el.getBoundingClientRect(); return JSON.stringify({ x: r.x, y: r.y, w: r.width, h: r.height, opacity: getComputedStyle(el).opacity, z: getComputedStyle(el).zIndex, vis: getComputedStyle(el).visibility }); })()`));
console.log('wa-float rect:', await evalv(`(() => { const el = document.querySelector('.wa-float'); if (!el) return 'none'; const r = el.getBoundingClientRect(); return JSON.stringify({ x: r.x, y: r.y, w: r.width, h: r.height, z: getComputedStyle(el).zIndex }); })()`));

const click = await cdp.send('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => { const el = document.querySelector('#adminFloat'); if (!el) return 'no element'; el.click(); return 'clicked'; })()`,
});
console.log('click ->', click.result.value);
await sleep(2500);
console.log('after click ->', await evalv('location.href'));
console.log('admin session:', await evalv(`localStorage.getItem('aqualudo_admin_session')`));
console.log('admin shell:', await evalv(`!!document.querySelector('.adm-shell')`));
console.log('body classes:', await evalv(`document.body.className`));
console.log('errors:', cdp.errors.length ? cdp.errors.join(' | ') : 'none');

chrome.kill();
try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch {}
