// Link previews + SEO. The website is a single-page app, but Facebook / WhatsApp / X / LinkedIn / Google's first pass
// don't run JavaScript — so the server writes the right <title>, description, Open Graph and Twitter-card tags into the
// HTML it sends for each article and builder page.
import { one, getContent } from './db.js';

const SITE_NAME = 'MEDIA 1313';
const DEFAULT_DESC = 'TV, radio and news in one place — live streams, local and world news, shows and podcasts.';
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const plain = (md) => String(md || '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#>*_`-]+/g, ' ').replace(/\s+/g, ' ').trim();
const clip = (s, n) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…`);

export const originOf = (req) => process.env.PUBLIC_URL || `${(req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http')).toString().split(',')[0]}://${req.headers['x-forwarded-host'] || req.headers.host}`;
const abs = (u, o) => (u ? (/^https?:/i.test(u) ? u : o + (u.startsWith('/') ? u : `/${u}`)) : null);

async function social() { try { const r = (await getContent()).find((x) => x.content_key === 'SOCIAL'); return r ? JSON.parse(r.content_value) : {}; } catch { return {}; } }

/** What this URL should look like when it's shared or crawled. */
export async function seoFor(req, pathname) {
  const o = originOf(req); const url = o + (pathname === '/' ? '/' : pathname.replace(/\/$/, ''));
  const base = { title: `${SITE_NAME} — TV, Radio & News`, description: DEFAULT_DESC, image: `${o}/og-default.png`, url, type: 'website' };
  const m = /^\/news\/([^/]+)\/?$/.exec(pathname);
  if (m) {
    const a = await one("SELECT slug, title, dek, content, hero_image, author, category, tags, published_at, created_at, updated_at FROM m1313_articles WHERE slug = ? AND status = 'published'", [m[1]]);
    if (a) {
      let tags = []; try { tags = JSON.parse(a.tags || '[]'); } catch { /* ignore */ }
      return { ...base, title: `${a.title} — ${SITE_NAME}`, ogTitle: a.title, description: clip(a.dek || plain(a.content), 200), image: abs(a.hero_image, o) || base.image, type: 'article', article: { published: a.published_at || a.created_at, modified: a.updated_at, author: a.author, section: a.category, tags }, found: true };
    }
    return { ...base, notFound: true };
  }
  const p = /^\/([a-z0-9-]+)\/?$/.exec(pathname);
  if (p) {
    const pg = await one("SELECT title, settings FROM m1313_pages WHERE slug = ? AND status = 'published'", [p[1]]);
    if (pg) { let st = {}; try { st = JSON.parse(pg.settings || '{}'); } catch { /* ignore */ } return { ...base, title: `${pg.title} — ${SITE_NAME}`, ogTitle: pg.title, description: st.description || base.description, found: true }; }
  }
  return base;
}

export async function injectMeta(html, m, req) {
  const s = await social(); const handle = String(s.handle || '').replace(/^@/, '');
  const ogTitle = m.ogTitle || m.title;
  const tags = [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}" />`,
    `<link rel="canonical" href="${esc(m.url)}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`, `<meta property="og:type" content="${m.type}" />`,
    `<meta property="og:title" content="${esc(ogTitle)}" />`, `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:url" content="${esc(m.url)}" />`, `<meta property="og:image" content="${esc(m.image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`, `<meta name="twitter:title" content="${esc(ogTitle)}" />`,
    `<meta name="twitter:description" content="${esc(m.description)}" />`, `<meta name="twitter:image" content="${esc(m.image)}" />`,
    ...(handle ? [`<meta name="twitter:site" content="@${esc(handle)}" />`] : []),
  ];
  if (m.article) {
    const a = m.article;
    tags.push(`<meta property="article:published_time" content="${esc(a.published)}" />`, `<meta property="article:modified_time" content="${esc(a.modified)}" />`);
    if (a.section) tags.push(`<meta property="article:section" content="${esc(a.section)}" />`);
    for (const t of a.tags || []) tags.push(`<meta property="article:tag" content="${esc(t)}" />`);
    const ld = { '@context': 'https://schema.org', '@type': 'NewsArticle', headline: ogTitle.slice(0, 110), description: m.description, image: [m.image], datePublished: a.published, dateModified: a.modified, author: { '@type': a.author ? 'Person' : 'Organization', name: a.author || SITE_NAME }, publisher: { '@type': 'Organization', name: SITE_NAME }, mainEntityOfPage: m.url };
    tags.push(`<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`);
  }
  const cleaned = html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+(?:property="og:[^"]*"|name="(?:description|twitter:[^"]*)")[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '');
  return cleaned.replace('</head>', `    ${tags.join('\n    ')}\n  </head>`);
}
