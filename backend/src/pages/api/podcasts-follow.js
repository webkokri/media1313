import { all, one, run, uuid, now } from '../../lib/db.js';
import { json, bad, body, str } from '../../lib/http.js';
import { readToken } from '../../lib/auth.js';
export const prerender = false;

// GET  /api/podcasts-follow             -> { following: ["The Briefing", ...] }   (signed-in members)
// POST /api/podcasts-follow { podcast, follow: true|false }
export async function GET({ request }) {
  const id = readToken(request);
  if (!id) return bad('Sign in to follow podcasts.', 401);
  const rows = await all('SELECT podcast FROM m1313_podcast_follows WHERE member_id = ?', [id]);
  return json({ following: rows.map((r) => r.podcast) });
}
export async function POST({ request }) {
  const id = readToken(request);
  if (!id) return bad('Sign in to follow podcasts.', 401);
  const b = await body(request); const podcast = str(b.podcast, 200);
  if (!podcast) return bad('Podcast is required.');
  const has = await one('SELECT id FROM m1313_podcast_follows WHERE member_id = ? AND podcast = ?', [id, podcast]);
  if (b.follow && !has) await run('INSERT INTO m1313_podcast_follows (id, member_id, podcast, created_at) VALUES (?, ?, ?, ?)', [uuid(), id, podcast, now()]);
  if (!b.follow && has) await run('DELETE FROM m1313_podcast_follows WHERE id = ?', [has.id]);
  return json({ ok: true });
}
