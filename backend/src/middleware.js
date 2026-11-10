// CORS for the public JSON API so the React site can call it from another origin
// (Vite dev server, or a different domain in production). Set CORS_ORIGIN to your site's URL.
import { defineMiddleware } from 'astro/middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = new URL(context.request.url);
  if (!pathname.startsWith('/api/')) return next();

  const allowed = (process.env.CORS_ORIGIN || '*').split(',').map((s) => s.trim());
  const origin = context.request.headers.get('origin');
  const allow = allowed.includes('*') ? '*' : allowed.includes(origin) ? origin : allowed[0];
  const cors = {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  };
  if (context.request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const res = await next();
  for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
  return res;
});
