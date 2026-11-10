import { run, uuid, now } from '../../lib/db.js';
import { json, bad, body, str } from '../../lib/http.js';
export const prerender = false;

// POST /api/song-requests { request }
export async function POST({ request }) {
  const text = str((await body(request)).request, 500);
  if (!text) return bad('Tell us the song or artist you want to hear.');
  await run('INSERT INTO m1313_song_requests (id, request_text, created_at) VALUES (?, ?, ?)', [uuid(), text, now()]);
  return json({ ok: true });
}
