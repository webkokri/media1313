import { homeFeed } from '../../lib/articles.js';
import { json } from '../../lib/http.js';
export const prerender = false;

// GET /api/home -> { lead, secondary[], latest[], sections[] }
export const GET = async () => json(await homeFeed(), 200, { 'Cache-Control': 'public, max-age=30' });
