// Preview the packaged artifact, not Vite's development transform/fallback.
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { root } from './content-bundle.mjs';
const base = resolve(root, 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.xml': 'application/xml' };
createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    let path = resolve(base, '.' + decodeURIComponent(url.pathname));
    if (!path.startsWith(base + '/') && path !== base) throw new Error('Invalid path');
    if (statSync(path).isDirectory()) {
      if (!url.pathname.endsWith('/')) { res.writeHead(308, { Location: url.pathname + '/' + url.search }); res.end(); return; }
      path = resolve(path, 'index.html');
    }
    res.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    res.end(readFileSync(path));
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(43181, '127.0.0.1');
