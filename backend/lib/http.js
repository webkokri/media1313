export const MAX_JSON = 2 * 1024 * 1024;

export function send(res, status, data, headers = {}) {
  const body = typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(body);
}
export const ok = (res, data = { ok: true }, headers) => send(res, 200, data, headers);
export const fail = (res, status, message) => send(res, status, { error: message });

export function readBuffer(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(Object.assign(new Error('Payload too large'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
export async function readJson(req) {
  const buf = await readBuffer(req, MAX_JSON);
  if (!buf.length) return {};
  try { return JSON.parse(buf.toString('utf8')); } catch { throw Object.assign(new Error('Invalid JSON'), { status: 400 }); }
}
export const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'untitled';

export function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
export const clientIp = (req) => (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
export const isHttps = (req) => (req.headers['x-forwarded-proto'] || '').toString().includes('https') || !!req.socket.encrypted;
