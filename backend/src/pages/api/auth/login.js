import { one } from '../../../lib/db.js';
import { json, bad, body, str } from '../../../lib/http.js';
import { verifyPassword, signToken } from '../../../lib/auth.js';
export const prerender = false;

// POST /api/auth/login { email, password } -> { token, member }
export async function POST({ request }) {
  const b = await body(request);
  const m = await one('SELECT id, name, email, password_hash FROM m1313_members WHERE email = ?', [str(b.email, 255).toLowerCase()]);
  if (!m || typeof b.password !== 'string' || !verifyPassword(b.password, m.password_hash)) return bad('Incorrect email or password.', 401);
  return json({ token: signToken(m.id), member: { id: m.id, name: m.name, email: m.email } });
}
