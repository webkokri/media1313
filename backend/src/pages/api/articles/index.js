import { listArticles } from '../../../lib/articles.js';
import { json } from '../../../lib/http.js';
export const prerender = false;

// GET /api/articles?category=Local&limit=12&exclude=some-slug
export async function GET({ url }) {
  const q = url.searchParams;
  const limit = Math.min(Number(q.get('limit')) || 50, 200);
  return json(await listArticles({ category: q.get('category'), limit, exclude: q.get('exclude') }), 200, { 'Cache-Control': 'public, max-age=30' });
}
