import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';

const secret = () => process.env.CMS_ENCRYPTION_KEY || import.meta.env?.CMS_ENCRYPTION_KEY || 'dev-secret';

export function hashPassword(pw) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(pw, salt, 64).toString('hex')}`;
}
export function verifyPassword(pw, stored) {
  const [salt, hash] = stored.split(':');
  const a = Buffer.from(hash, 'hex'); const b = scryptSync(pw, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}
// Stateless signed token: base64(payload).signature
export function signToken(memberId, days = 30) {
  const p = Buffer.from(JSON.stringify({ id: memberId, exp: Date.now() + days * 864e5 })).toString('base64url');
  return `${p}.${createHmac('sha256', secret()).update(p).digest('base64url')}`;
}
export function readToken(request) {
  const t = (request.headers.get('authorization') || '').replace(/^Bearer /, '');
  const [p, sig] = t.split('.');
  if (!p || !sig) return null;
  const expect = createHmac('sha256', secret()).update(p).digest('base64url');
  if (sig.length !== expect.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  const data = JSON.parse(Buffer.from(p, 'base64url').toString());
  return data.exp > Date.now() ? data.id : null;
}
export const isAdmin = (request) => {
  const t = process.env.ADMIN_TOKEN || import.meta.env?.ADMIN_TOKEN;
  return !!t && request.headers.get('authorization') === `Bearer ${t}`;
};
