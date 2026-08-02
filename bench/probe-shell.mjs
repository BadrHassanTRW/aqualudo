// Probe .adm-shell geometry on a real desktop window (no emulation).
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const CHROME = process.env.CHROME || 'C:\\Users\\10\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const dir = fs.mkdtempSync('F:\\aqualudo\\.next\\probe-');
const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9238', '--user-data-dir=' + dir, '--no-first-run', '--disable-gpu', '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });

let target;
for (let i = 0; i < 100; i++) {
  try { const l = await (await fetch('http://127.0.0.1:9238/json/list')).json(); target = l.find(t => t.type === 'page'); if (target) break; } catch {}
  await sleep(100);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pend = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable');
await send('Runtime.enable');
await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('aqualudo_admin_session', JSON.stringify({ since: new Date().toISOString() }));` });
await send('Page.navigate', { url: 'http://localhost:3000/site/admin/index.html' });
await new Promise(res => { const h = (ev) => { const m = JSON.parse(ev.data); if (m.method === 'Page.loadEventFired') { ws.removeEventListener('message', h); res(); } }; ws.addEventListener('message', h); });
await sleep(1500);
const r = await send('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const rect = (s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return Math.round(r.x) + ',' + Math.round(r.width); };
    const side = document.querySelector('.adm-sidebar');
    const cont = document.querySelector('.adm-content');
    return JSON.stringify({
      href: location.pathname,
      dir: document.documentElement.dir,
      win: window.innerWidth,
      shells: document.querySelectorAll('.adm-shell').length,
      sidebars: document.querySelectorAll('.adm-sidebar').length,
      contents: document.querySelectorAll('.adm-content').length,
      children: [...document.querySelector('.adm-shell').children].map(c => c.className.toString().split(' ')[0] + '(' + Math.round(c.getBoundingClientRect().width) + ')'),
      shellPos: getComputedStyle(document.querySelector('.adm-shell')).display,
      scrimPos: (() => { const s = document.querySelector('.adm-sidebar-scrim'); return s ? getComputedStyle(s).position : 'none'; })(),
      grid: getComputedStyle(document.querySelector('.adm-shell')).gridTemplateColumns
    });
  })()`,
});
console.log(r.result.value);
ch.kill();
try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
