import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';
import { one } from './db.js';
import { parseCookies, isHttps } from './http.js';

const secret = () => process.env.APP_SECRET || process.env.CMS_ENCRYPTION_KEY || 'dev-secret-change-me';

export function hashPassword(pw) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(pw, salt, 64).toString('hex')}`;
}
export function verifyPassword(pw, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, 'hex'); const b = scryptSync(pw, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Stateless signed token: base64url(payload).signature
export function sign(payload, days = 30) {
  const p = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + days * 864e5 })).toString('base64url');
  return `${p}.${createHmac('sha256', secret()).update(p).digest('base64url')}`;
}
export function verify(token) {
  const [p, sig] = String(token || '').split('.');
  if (!p || !sig) return null;
  const expect = createHmac('sha256', secret()).update(p).digest('base64url');
  if (sig.length !== expect.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try { const d = JSON.parse(Buffer.from(p, 'base64url').toString()); return d.exp > Date.now() ? d : null; } catch { return null; }
}

// ---- site members (visitors): Bearer token ----
export const memberId = (req) => verify((req.headers.authorization || '').replace(/^Bearer /, ''))?.id ?? null;

// ---- admins: HttpOnly cookie. The token embeds a slice of the password hash, so changing the password signs everyone out. ----
export const ADMIN_COOKIE = 'm1313_admin';
export function adminCookie(req, admin, clear = false) {
  const base = `${ADMIN_COOKIE}=${clear ? '' : encodeURIComponent(sign({ a: admin.id, pv: admin.password_hash.slice(-10) }, 14))}; Path=/; HttpOnly; SameSite=Lax`;
  return base + (isHttps(req) ? '; Secure' : '') + (clear ? '; Max-Age=0' : '; Max-Age=1209600');
}
export async function currentAdmin(req) {
  const t = verify(parseCookies(req)[ADMIN_COOKIE]);
  if (!t?.a) return null;
  const a = await one('SELECT id, email, name, role, password_hash FROM m1313_admins WHERE id = ?', [t.a]);
  return a && a.password_hash.slice(-10) === t.pv ? a : null;
}
