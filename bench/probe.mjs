import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8126;
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

const profileDir = fs.mkdtempSync(path.join(process.env.TEMP, 'aql-probe-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9227', `--user-data-dir=${profileDir}`,
  '--no-first-run', '--disable-extensions', '--disable-background-networking', '--disable-gpu',
  '--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1, MAP fonts.gstatic.com 127.0.0.1, MAP images.unsplash.com 127.0.0.1',
  'about:blank',
], { stdio: 'ignore' });

async function getTarget() {
  for (let i = 0; i < 100; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:9227/json/list')).json();
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

await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/site/pages/activities.html` });
await new Promise(res => cdp.on('Page.loadEventFired', () => res()));
await sleep(300);

const expr = `(() => {
  const tags = [...document.querySelectorAll('script[src]')].map(s => s.getAttribute('src'));
  const db = document.querySelector('script[src*="db.js"]');
  const out = { tags };
  try { out.BASE = typeof BASE !== 'undefined' ? BASE : 'UNDEF'; } catch (e) { out.BASE = 'EXC'; }
  out.heroes = (typeof K !== 'undefined' && K.activities) ? K.activities.slice(0, 2).map(a => a.hero) : 'NO K';
  const imgs = [...document.querySelectorAll('#grid img')].map(i => i.getAttribute('src'));
  out.imgs = imgs;
  return out;
})()`;
const r = await cdp.send('Runtime.evaluate', { returnByValue: true, expression: expr });
console.log(JSON.stringify(r.result.value, null, 1));

chrome.kill();
server.close();
try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch {}
