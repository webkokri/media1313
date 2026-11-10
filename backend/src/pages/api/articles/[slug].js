import { getArticle, listArticles } from '../../../lib/articles.js';
import { json, bad } from '../../../lib/http.js';
export const prerender = false;

// GET /api/articles/:slug -> { article, related[] }
export async function GET({ params }) {
  const article = await getArticle(params.slug);
  if (!article) return bad('Article not found', 404);
  const { articles } = await listArticles({ category: article.category, limit: 3, exclude: article.slug });
  return json({ article, related: articles }, 200, { 'Cache-Control': 'public, max-age=30' });
}
