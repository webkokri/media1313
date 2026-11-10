// MEDIA 1313 server: JSON API + admin API + uploads + the React site (SPA fallback), in one Node process.
//   Settings come from process.env, filled from MEDIA1313_ENV / ~/media1313.env / ./.env (kept OUTSIDE git and the web root).
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
process.env.UPLOAD_DIR ||= path.join(here, 'uploads');

const { createRouter } = await import('./lib/router.js');
const { ensureSchema } = await import('./lib/db.js');
const { send, fail } = await import('./lib/http.js');
const { publicRoutes } = await import('./routes/public.js');
const { adminRoutes } = await import('./routes/admin.js');
const { UPLOAD_DIR } = await import('./lib/media.js');

const router = createRouter();
publicRoutes(router);
adminRoutes(router);
await ensureSchema();

const WEB = path.resolve(process.env.WEB_ROOT || path.join(here, '..', 'dist'));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.pdf': 'application/pdf', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml' };

function sendFile(root, urlPath, req, res, cache = 300) {
  const file = path.join(root, path.normalize(urlPath));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return false;
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': `public, max-age=${cache}`, 'X-Content-Type-Options': 'nosniff' });
  if (req.method === 'HEAD') res.end(); else fs.createReadStream(file).pipe(res);
  return true;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');   // the live editor frames the site from the same origin
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  const url = new URL(req.url, 'http://localhost');
  let pathname; try { pathname = decodeURIComponent(url.pathname); } catch { return fail(res, 400, 'Bad request'); }
  try {
    if (pathname.startsWith('/api/')) {
      const m = router.match(req.method, pathname);
      if (!m) return fail(res, pathname.startsWith('/api/admin') || req.method === 'GET' ? 404 : 405, 'Not found');
      res.setHeader('Cache-Control', 'no-store');
      return await m.handler({ req, res, params: m.params, query: url.searchParams });
    }
    if (pathname.startsWith('/uploads/')) { if (sendFile(UPLOAD_DIR(), pathname.slice(9), req, res, 86400)) return; return fail(res, 404, 'Not found'); }
    if (sendFile(WEB, pathname, req, res)) return;
    if ((req.method === 'GET' || req.method === 'HEAD') && !path.extname(pathname)) {
      res.setHeader('Cache-Control', 'no-cache');
      if (sendFile(WEB, '/index.html', req, res, 0)) return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found');
  } catch (e) {
    if (e.status) return fail(res, e.status, e.message);
    console.error('[error]', req.method, pathname, e);
    if (!res.headersSent) fail(res, 500, 'Something went wrong.');
  }
});

const port = parseInt(process.env.PORT, 10) || 4321;
server.listen(port, process.env.HOSTNAME || '0.0.0.0', () => console.log(`MEDIA 1313 listening on ${port}`));
