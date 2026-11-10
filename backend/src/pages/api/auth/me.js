import { one } from '../../../lib/db.js';
import { json, bad } from '../../../lib/http.js';
import { readToken } from '../../../lib/auth.js';
export const prerender = false;

// GET /api/auth/me (Authorization: Bearer <token>) -> { member }
export async function GET({ request }) {
  const id = readToken(request);
  const m = id && (await one('SELECT id, name, email FROM m1313_members WHERE id = ?', [id]));
  return m ? json({ member: m }) : bad('Not signed in', 401);
}
