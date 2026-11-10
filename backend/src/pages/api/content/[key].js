import { one, upsertContent } from '../../../lib/db.js';
import { json, bad, body } from '../../../lib/http.js';
import { isAdmin } from '../../../lib/auth.js';
export const prerender = false;

export async function GET({ params }) {
  const row = await one('SELECT content_value FROM m1313_content WHERE content_key = ?', [params.key]);
  return row ? json(JSON.parse(row.content_value)) : bad('Not found', 404);
}

// PUT /api/content/:key  (Authorization: Bearer $ADMIN_TOKEN)  body = the new JSON value
export async function PUT({ params, request }) {
  if (!isAdmin(request)) return bad('Unauthorized', 401);
  const value = await body(request);
  await upsertContent(params.key, value);
  return json({ ok: true });
}
