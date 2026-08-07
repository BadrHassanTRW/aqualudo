// Screenshot the export preview modal on bookings (EN) and overview (AR).
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const PORT = 8130;
const CHROME = process.env.CHROME || 'C:\\Users\\10\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const server = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  const fp = path.join(ROOT, url);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp)) { res.writeHead(404); res.end(); return; }
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const profileDir = fs.mkdtempSync(path.join(process.env.TEMP, 'aql-shot-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9231', `--user-data-dir=${profileDir}`,
  '--no-first-run', '--disable-extensions', '--disable-background-networking', '--disable-gpu',
  '--window-size=1440,900',
  'about:blank',
], { stdio: 'ignore' });

async function getTarget() {
  for (let i = 0; i < 100; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:9231/json/list')).json();
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
await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('aqualudo_admin_session', JSON.stringify({ since: new Date().toISOString() })); localStorage.setItem('aqualudo_lang', 'en');` });
await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/site/en/admin/bookings.html` });
await new Promise(res => cdp.on('Page.loadEventFired', () => res()));
await sleep(400);
await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#exportBtn').click(); true` });
await sleep(400);
let shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'screenshots', 'export-modal-bookings-en.png'), Buffer.from(shot.data, 'base64'));
console.log('saved export-modal-bookings-en.png');

await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/site/admin/index.html` });
await new Promise(res => cdp.on('Page.loadEventFired', () => res()));
await sleep(400);
await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#exportBtn').click(); true` });
await sleep(400);
shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'screenshots', 'export-modal-overview-ar.png'), Buffer.from(shot.data, 'base64'));
console.log('saved export-modal-overview-ar.png');

await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/site/admin/bookings.html` });
await new Promise(res => cdp.on('Page.loadEventFired', () => res()));
await sleep(400);
await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#exportBtn').click(); true` });
await sleep(400);
shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'screenshots', 'export-modal-bookings-ar-mobile.png'), Buffer.from(shot.data, 'base64'));
console.log('saved export-modal-bookings-ar-mobile.png');

chrome.kill();
server.close();
try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch {}
