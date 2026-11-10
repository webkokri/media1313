import { one, run, uuid, now } from '../../../lib/db.js';
import { json, bad, body, str, isEmail } from '../../../lib/http.js';
import { hashPassword, signToken } from '../../../lib/auth.js';
export const prerender = false;

// POST /api/auth/register { name, email, password, briefing? } -> { token, member }
export async function POST({ request }) {
  const b = await body(request);
  const name = str(b.name, 200), email = str(b.email, 255).toLowerCase(), password = typeof b.password === 'string' ? b.password : '';
  if (!name || !isEmail(email)) return bad('Name and a valid email are required.');
  if (password.length < 8) return bad('Password must be at least 8 characters.');
  if (await one('SELECT id FROM m1313_members WHERE email = ?', [email])) return bad('An account with this email already exists.', 409);
  const id = uuid();
  await run('INSERT INTO m1313_members (id, name, email, password_hash, wants_briefing, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name, email, hashPassword(password), b.briefing ? 1 : 0, now()]);
  if (b.briefing && !(await one('SELECT id FROM m1313_newsletter WHERE email = ?', [email])))
    await run('INSERT INTO m1313_newsletter (id, email, source, created_at) VALUES (?, ?, ?, ?)', [uuid(), email, 'signup', now()]);
  return json({ token: signToken(id), member: { id, name, email } }, 201);
}
