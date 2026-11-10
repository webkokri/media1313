import { all } from '../../../lib/db.js';
import { json } from '../../../lib/http.js';
export const prerender = false;

// GET /api/content -> every content block (nav, shows, schedule, podcasts, ...) keyed by name
export async function GET() {
  const rows = await all('SELECT content_key, content_value FROM m1313_content');
  const out = {};
  for (const r of rows) out[r.content_key] = JSON.parse(r.content_value);
  return json(out, 200, { 'Cache-Control': 'public, max-age=30' });
}
