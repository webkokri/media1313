import { run, uuid, now } from '../../lib/db.js';
import { json, bad, body, str, isEmail } from '../../lib/http.js';
export const prerender = false;

// POST /api/contact { name, email, topic, message }
export async function POST({ request }) {
  const b = await body(request);
  const name = str(b.name, 200), email = str(b.email, 255), message = str(b.message, 5000);
  if (!name || !isEmail(email) || !message) return bad('Name, a valid email and a message are required.');
  await run('INSERT INTO m1313_contact_messages (id, name, email, topic, message, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [uuid(), name, email, str(b.topic, 100) || 'Something else', message, now()]);
  return json({ ok: true });
}
