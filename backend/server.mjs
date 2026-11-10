// Production server: StudioCMS/Astro (API + dashboard) + the React site's SPA fallback, in one Node process.
//   - Private settings are read from MEDIA1313_ENV (default ~/media1313.env), kept OUTSIDE the web root and git.
//   - WEB_ROOT = folder holding the built React site (Hostinger's public_html).
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

for (const file of [process.env.MEDIA1313_ENV, path.join(os.homedir(), 'media1313.env'), path.join(here, '.env')].filter(Boolean)) {
  try {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, '$2');
    }
    break;
  } catch { /* try next */ }
}
process.env.NODE_ENV = 'production';

const { handler } = await import('./dist/server/entry.mjs');

const CLIENT = path.join(here, 'dist', 'client');
const WEB = path.resolve(process.env.WEB_ROOT || path.join(here, '..', 'dist'));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain' };

function sendFile(root, urlPath, req, res) {
  const file = path.join(root, path.normalize(urlPath));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return false;
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': file.includes('_astro') ? 'public, max-age=31536000, immutable' : 'public, max-age=300' });
  if (req.method === 'HEAD') res.end(); else fs.createReadStream(file).pipe(res);
  return true;
}

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (sendFile(CLIENT, pathname, req, res)) return;               // CMS dashboard assets
  handler(req, res, () => {                                        // not a CMS/API route →
    if (pathname.startsWith('/api/')) {                            // unknown API route: JSON 404, never HTML
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end('{"error":"Not found"}');
    }
    if (sendFile(WEB, pathname, req, res)) return;                 // React build file
    if ((req.method === 'GET' || req.method === 'HEAD') && !path.extname(pathname)) { // React route (/news, /tv, ...) → index.html
      return sendFile(WEB, '/index.html', req, res) || (res.writeHead(404), res.end('Not found'));
    }
    res.writeHead(404); res.end('Not found');
  });
});

const port = parseInt(process.env.PORT, 10) || 3000;
server.listen(port, process.env.HOSTNAME || '0.0.0.0', () => console.log(`MEDIA 1313 listening on ${port}`));
