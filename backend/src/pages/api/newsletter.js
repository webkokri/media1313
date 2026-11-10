import { one, run, uuid, now } from '../../lib/db.js';
import { json, bad, body, str, isEmail } from '../../lib/http.js';
export const prerender = false;

// POST /api/newsletter { email, source? }
export async function POST({ request }) {
  const b = await body(request);
  const email = str(b.email, 255).toLowerCase();
  if (!isEmail(email)) return bad('Please enter a valid email address.');
  if (!(await one('SELECT id FROM m1313_newsletter WHERE email = ?', [email])))
    await run('INSERT INTO m1313_newsletter (id, email, source, created_at) VALUES (?, ?, ?, ?)', [uuid(), email, str(b.source, 60) || 'site', now()]);
  return json({ ok: true });
}
