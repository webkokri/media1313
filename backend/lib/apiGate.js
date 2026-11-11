// Controls for the public API: on/off, CORS, rate limiting and optional API keys (managed in the admin).
import { createHash, randomBytes } from 'node:crypto';
import { all, one, run, uuid, now, getSetting, setSetting } from './db.js';
import { clientIp } from './http.js';

export const API_DEFAULTS = { enabled: true, requireKey: false, corsOrigins: '*', rateLimit: 120 };
export async function apiSettings() { return { ...API_DEFAULTS, ...(await getSetting('public_api', {})) }; }
export async function saveApiSettings(input) {
  const cur = await apiSettings();
  const s = {
    enabled: input.enabled !== false, requireKey: !!input.requireKey,
    corsOrigins: String(input.corsOrigins || '*').split(/[\s,]+/).filter(Boolean).slice(0, 30).join(',') || '*',
    rateLimit: Math.min(5000, Math.max(10, Math.round(Number(input.rateLimit)) || cur.rateLimit)),
  };
  await setSetting('public_api', s); cache = null; return s;
}
let cache = null; const cached = async () => { if (!cache || Date.now() - cache.t > 15e3) cache = { t: Date.now(), s: await apiSettings() }; return cache.s; };

const hash = (k) => createHash('sha256').update(k).digest('hex');
export async function createKey(name) {
  const key = `m13_${randomBytes(24).toString('base64url')}`; const id = uuid();
  await run('INSERT INTO m1313_api_keys (id, name, key_hash, key_prefix, created_at, requests, revoked) VALUES (?, ?, ?, ?, ?, 0, 0)', [id, String(name).slice(0, 120), hash(key), key.slice(0, 8), now()]);
  return { id, key };
}
export const listKeys = () => all('SELECT id, name, key_prefix, created_at, last_used, requests, revoked FROM m1313_api_keys ORDER BY created_at DESC');
export const revokeKey = (id) => run('UPDATE m1313_api_keys SET revoked = 1 WHERE id = ?', [id]);
export const deleteKey = (id) => run('DELETE FROM m1313_api_keys WHERE id = ?', [id]);

// ---- usage counters (flushed to the DB once a minute) ----
const usage = new Map();
setInterval(async () => {
  for (const [id, n] of [...usage]) { usage.delete(id); try { await run('UPDATE m1313_api_keys SET requests = requests + ?, last_used = ? WHERE id = ?', [n, now(), id]); } catch { /* ignore */ } }
}, 60e3).unref?.();

// ---- rate limit: fixed 1-minute window per key (or per IP) ----
const windows = new Map();
function limited(id, max) {
  const m = Math.floor(Date.now() / 60e3); const w = windows.get(id);
  if (!w || w.m !== m) { windows.set(id, { m, n: 1 }); if (windows.size > 5000) for (const [k, v] of windows) if (v.m !== m) windows.delete(k); return { over: false, left: max - 1, reset: 60 - (Date.now() / 1000) % 60 }; }
  w.n++; return { over: w.n > max, left: Math.max(0, max - w.n), reset: 60 - (Date.now() / 1000) % 60 };
}

/** CORS headers for a request (the public API may be called from any website / app). */
export async function corsHeaders(req) {
  const s = await cached(); const origin = req.headers.origin;
  const allowed = s.corsOrigins === '*' ? '*' : (origin && s.corsOrigins.split(',').includes(origin) ? origin : s.corsOrigins.split(',')[0]);
  return { 'Access-Control-Allow-Origin': allowed, 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, If-None-Match', 'Access-Control-Expose-Headers': 'ETag, X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
}

/** Returns null when the request may proceed, or { status, code, message, headers } when it must be refused. */
export async function gate(req, { write = false } = {}) {
  const s = await cached();
  if (!s.enabled) return { status: 503, code: 'api_disabled', message: 'The public API is currently turned off.' };
  let keyId = null;
  const given = req.headers['x-api-key'] || new URL(req.url, 'http://x').searchParams.get('api_key');
  if (given) {
    const row = await one('SELECT id, revoked FROM m1313_api_keys WHERE key_hash = ?', [hash(String(given))]);
    if (!row || row.revoked) return { status: 401, code: 'invalid_api_key', message: 'That API key is not valid.' };
    keyId = row.id; usage.set(keyId, (usage.get(keyId) || 0) + 1);
  } else if (s.requireKey) return { status: 401, code: 'api_key_required', message: 'Send your API key in the X-API-Key header.' };
  const max = write ? Math.min(s.rateLimit, 20) : s.rateLimit;
  const r = limited(`${write ? 'w' : 'r'}:${keyId || clientIp(req)}`, max);
  const headers = { 'X-RateLimit-Limit': String(max), 'X-RateLimit-Remaining': String(r.left) };
  if (r.over) return { status: 429, code: 'rate_limited', message: 'Too many requests. Slow down and try again shortly.', headers: { ...headers, 'Retry-After': String(Math.ceil(r.reset)) } };
  return { ok: true, headers };
}
