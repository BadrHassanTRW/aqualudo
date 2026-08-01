// Conservative JS/CSS minifier: strips comments and collapses whitespace
// while preserving strings, template literals (with nesting), and regex literals.
// Usage: node bench/minify.mjs <in.js> <out.js>   (or .css)
import fs from 'node:fs';

const [inFile, outFile] = process.argv.slice(2);
if (!inFile || !outFile) { console.error('usage: node bench/minify.mjs <in> <out>'); process.exit(1); }
const src = fs.readFileSync(inFile, 'utf8');
const isCss = inFile.endsWith('.css');

function minifyJS(s) {
  let out = '';
  let i = 0;
  let prevSig = ''; // last significant char emitted
  const n = s.length;
  const isSpace = (c) => c === ' ' || c === '\t' || c === '\n' || c === '\r';
  const isIdentStart = (c) => /[A-Za-z_$]/.test(c);
  const isIdent = (c) => /[A-Za-z0-9_$]/.test(c);

  const flush = (c) => { out += c; prevSig = c; };

  while (i < n) {
    const c = s[i];

    // line/block comments
    if (c === '/' && s[i + 1] === '/') {
      while (i < n && s[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && s[i + 1] === '*') {
      i += 2;
      while (i < n && !(s[i] === '*' && s[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    // strings
    if (c === "'" || c === '"') {
      const q = c;
      out += q; i++;
      while (i < n) {
        const ch = s[i];
        if (ch === '\\') { out += s.slice(i, i + 2); i += 2; continue; }
        if (ch === q) { out += q; i++; break; }
        out += ch; i++;
      }
      prevSig = q;
      continue;
    }

    // template literal (handle ${} nesting)
    if (c === '`') {
      out += '`'; i++;
      let depth = 0;
      while (i < n) {
        const ch = s[i];
        if (ch === '\\') { out += s.slice(i, i + 2); i += 2; continue; }
        if (ch === '`' && depth === 0) { out += '`'; i++; break; }
        if (ch === '$' && s[i + 1] === '{') { depth++; out += '${'; i += 2; continue; }
        if (ch === '}' && depth > 0) { depth--; }
        if (depth === 0) { out += ch; i++; }
        else {
          // inside ${...}: recurse minify? keep simple - copy verbatim until matching close
          out += ch; i++;
        }
      }
      prevSig = '`';
      continue;
    }

    // regex literal
    if (c === '/' && prevSig !== '' && !isIdent(prevSig) && prevSig !== ')' && prevSig !== ']' && prevSig !== '}') {
      // looks like a regex start
      let j = i + 1;
      let inCls = false;
      while (j < n) {
        const ch = s[j];
        if (ch === '\\') { j += 2; continue; }
        if (ch === '[') inCls = true;
        if (ch === ']') inCls = false;
        if (ch === '/' && !inCls) { j++; break; }
        if (ch === '\n') break;
        j++;
      }
      // flags
      while (j < n && /[a-z]/i.test(s[j])) j++;
      out += s.slice(i, j);
      i = j;
      prevSig = '/';
      continue;
    }

    // whitespace: emit single space only when needed between ident-ish tokens
    if (isSpace(c)) {
      i++;
      while (i < n && isSpace(s[i])) i++;
      const next = s[i];
      if (next === undefined) break;
      if (/[A-Za-z0-9_$]/.test(prevSig) && /[A-Za-z0-9_$]/.test(next)) out += ' ';
      continue;
    }

    out += c;
    prevSig = c;
    i++;
  }
  return out;
}

function minifyCSS(s) {
  let out = '';
  let i = 0;
  const n = s.length;
  while (i < n) {
    const c = s[i];
    if (c === '/' && s[i + 1] === '*') {
      i += 2;
      while (i < n && !(s[i] === '*' && s[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'") {
      const q = c;
      out += q; i++;
      while (i < n) {
        if (s[i] === '\\') { out += s.slice(i, i + 2); i += 2; continue; }
        if (s[i] === q) { out += q; i++; break; }
        out += s[i]; i++;
      }
      continue;
    }
    if (c === '\n' || c === '\r' || c === '\t' || c === ' ' || c === '\f') {
      i++;
      while (i < n && (s[i] === '\n' || s[i] === '\r' || s[i] === '\t' || s[i] === ' ' || s[i] === '\f')) i++;
      // keep a single space only between two non-space tokens (never after ':' or '(')
      if (i < n) out += ' ';
      continue;
    }
    out += c;
    i++;
  }
  // tighten common patterns
  return out
    .replace(/ ?([{};:,]) ?/g, '$1')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();
}

const out = isCss ? minifyCSS(src) : minifyJS(src);
fs.writeFileSync(outFile, out, 'utf8');
console.log(`${inFile}: ${Buffer.byteLength(src)} -> ${Buffer.byteLength(out)} bytes`);
