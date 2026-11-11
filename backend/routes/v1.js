// MEDIA 1313 public API, version 1  →  /api/v1/…   (documented at /api/docs, machine-readable at /api/v1/openapi.json)
//   Every endpoint is declared once in the list below; the router, the OpenAPI spec and the docs page are all built from it.
import { createHash } from 'node:crypto';
import { all, one, run, uuid, now, getContent } from '../lib/db.js';
import { send, readJson, str, isEmail, slugify } from '../lib/http.js';
import { hashPassword, verifyPassword, sign, memberId } from '../lib/auth.js';
import { corsHeaders, gate } from '../lib/apiGate.js';
import { markdownToHtml } from '../lib/markdown.js';

const VERSION = '1.0.0';
const LIVE = "status = 'published' AND (published_at IS NULL OR published_at <= ?)";
const COLS = 'id, slug, title, dek, category, tags, hero_image, author, published_at, created_at, updated_at, LENGTH(content) AS clen';
const parseTags = (v) => { try { const t = JSON.parse(v || '[]'); return Array.isArray(t) ? t : []; } catch { return []; } };

/* ---------------------------------------------------------------- helpers ---------------------------------------------------------------- */
const originOf = (req) => process.env.PUBLIC_URL || `${(req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http')).toString().split(',')[0]}://${req.headers['x-forwarded-host'] || req.headers.host}`;
const absUrl = (u, o) => (u ? (u.startsWith('/') ? o + u : u) : null);

function reply(c, status, body, ttl = 0) {
  const json = JSON.stringify(body); const headers = { ...c.h };
  if (status === 200 && ttl) {
    const etag = `"${createHash('sha1').update(json).digest('base64url').slice(0, 20)}"`;
    headers.ETag = etag; headers['Cache-Control'] = `public, max-age=${ttl}`;
    if (c.req.headers['if-none-match'] === etag) { c.res.writeHead(304, headers); return c.res.end(); }
  } else headers['Cache-Control'] = 'no-store';
  return send(c.res, status, json, headers);
}
const ok = (c, data, extra = {}, ttl = 60) => reply(c, 200, { data, ...extra }, ttl);
const fail = (c, status, code, message) => reply(c, status, { error: { code, message } });
const bad = (code, message, status = 400) => Object.assign(new Error(message), { status, code });

function paging(c, defaults = {}) {
  const q = c.query; const page = Math.max(1, parseInt(q.get('page')) || 1);
  const per = Math.min(50, Math.max(1, parseInt(q.get('per_page')) || defaults.per || 20));
  return { page, per, offset: (page - 1) * per };
}
function pageMeta(c, { page, per }, total) {
  const pages = Math.max(1, Math.ceil(total / per)); const mk = (p) => { const u = new URL(c.req.url, originOf(c.req)); u.searchParams.set('page', p); return u.pathname + u.search; };
  return { meta: { page, per_page: per, total, total_pages: pages }, links: { self: mk(page), next: page < pages ? mk(page + 1) : null, prev: page > 1 ? mk(page - 1) : null } };
}
const blocks = async () => { const out = {}; for (const r of await getContent()) { const v = JSON.parse(r.content_value); if (v !== null) out[r.content_key] = v; } return out; };

function articleOut(r, o, content) {
  const a = {
    id: r.id, slug: r.slug, title: r.title, excerpt: r.dek || '', category: r.category, category_slug: slugify(r.category), tags: parseTags(r.tags),
    author: r.author || null, image: absUrl(r.hero_image, o), url: `${o}/news/${r.slug}`,
    published_at: r.published_at || r.created_at, updated_at: r.updated_at, reading_minutes: Math.max(1, Math.round((Number(r.clen) || 0) / 6 / 220)),
  };
  if (content !== undefined) a.content = content;
  return a;
}
const contentFor = (r, mode, o) => (mode === 'html' ? markdownToHtml(r.content, o) : mode === 'markdown' ? r.content || '' : undefined);

async function categoryMap() {
  const names = ((await blocks()).NEWS_CATEGORIES || []).filter((x) => x !== 'All');
  return new Map(names.map((n) => [slugify(n), n]));
}

async function listArticles(c, { extra = '', args = [], from = '' } = {}) {
  const q = c.query; const p = paging(c); const o = c.o;
  let where = LIVE; const a = [now(), ...args];
  const cat = q.get('category'); if (cat) { const map = await categoryMap(); const name = map.get(slugify(cat)) || cat; where += ' AND LOWER(category) = ?'; a.push(name.toLowerCase()); }
  const tag = q.get('tag'); if (tag) { where += ' AND LOWER(tags) LIKE ?'; a.push(`%"${tag.toLowerCase().replace(/[%_"]/g, '')}"%`); }
  const term = q.get('q'); if (term) { const like = `%${term.toLowerCase().replace(/[%_]/g, '')}%`; where += ' AND (LOWER(title) LIKE ? OR LOWER(dek) LIKE ? OR LOWER(content) LIKE ?)'; a.push(like, like, like); }
  const since = q.get('updated_since'); if (since) { if (Number.isNaN(Date.parse(since))) throw bad('invalid_parameter', 'updated_since must be an ISO date, e.g. 2026-01-31T00:00:00Z.'); where += ' AND updated_at > ?'; a.push(new Date(since).toISOString()); }
  const order = q.get('sort') === 'oldest' ? 'ASC' : 'DESC';
  const tbl = from || 'm1313_articles';
  const total = Number((await one(`SELECT COUNT(*) AS n FROM ${tbl} WHERE ${where}${extra}`, a)).n);
  const rows = await all(`SELECT ${COLS} FROM ${tbl} WHERE ${where}${extra} ORDER BY published_at ${order}, created_at ${order} LIMIT ${p.per} OFFSET ${p.offset}`, a);
  return { items: rows.map((r) => articleOut(r, o)), ...pageMeta(c, p, total) };
}

const memberOr401 = (c) => { const id = memberId(c.req); if (!id) throw bad('unauthorized', 'Sign in required. Send the token as “Authorization: Bearer <token>”.', 401); return id; };

/* ---------------------------------------------------------------- endpoint definitions ---------------------------------------------------------------- */
const Q = (name, description, type = 'string', extra = {}) => ({ in: 'query', name, description, schema: { type, ...extra } });
const PATHP = (name, description) => ({ in: 'path', name, required: true, description, schema: { type: 'string' } });
const PAGE = [Q('page', 'Page number, starting at 1.', 'integer', { default: 1 }), Q('per_page', 'Items per page (1–50).', 'integer', { default: 20 })];

export const ENDPOINTS = [
  /* ---- discovery ---- */
  { m: 'GET', p: '/api/v1', tag: 'Meta', summary: 'API index', desc: 'Names the API, its version and where to find the docs.', h: async (c) => ok(c, { name: 'MEDIA 1313 public API', version: VERSION, docs: `${c.o}/api/docs`, openapi: `${c.o}/api/v1/openapi.json`, site: c.o }, {}, 300) },

  /* ---- news ---- */
  { m: 'GET', p: '/api/v1/home', tag: 'News', summary: 'Home feed', desc: 'Lead story, top stories, latest list and a block per category — everything a home screen needs in one request.',
    h: async (c) => {
      const rows = await all(`SELECT ${COLS} FROM m1313_articles WHERE ${LIVE} ORDER BY published_at DESC, created_at DESC LIMIT 60`, [now()]);
      const list = rows.map((r) => articleOut(r, c.o)); const [lead, ...rest] = list; const cats = [...(await categoryMap()).values()];
      return ok(c, { lead: lead || null, top_stories: rest.slice(0, 3), latest: list.slice(0, 8), sections: cats.map((n) => ({ category: n, category_slug: slugify(n), articles: list.filter((a) => a.category === n).slice(0, 4) })).filter((s) => s.articles.length) }, {}, 60);
    } },
  { m: 'GET', p: '/api/v1/articles', tag: 'News', summary: 'List articles', desc: 'Published articles, newest first. Filter by category, tag or search text; use `updated_since` to sync only what changed. Add `content=html` (or `markdown`) to include story bodies in the list.',
    params: [...PAGE, Q('category', 'Category name or slug, e.g. `local`.'), Q('tag', 'A tag, e.g. `transit`.'), Q('q', 'Search words (title, summary and story text).'), Q('sort', 'newest (default) or oldest.', 'string', { enum: ['newest', 'oldest'] }), Q('updated_since', 'Only articles updated after this ISO date-time.'), Q('content', 'Include the story body: `html` or `markdown`.', 'string', { enum: ['html', 'markdown'] })],
    h: async (c) => {
      const mode = c.query.get('content'); const r = await listArticles(c);
      if (mode === 'html' || mode === 'markdown') { for (const a of r.items) { const row = await one('SELECT content FROM m1313_articles WHERE id = ?', [a.id]); a.content = contentFor(row, mode, c.o); } }
      return ok(c, r.items, { meta: r.meta, links: r.links }, 60);
    } },
  { m: 'GET', p: '/api/v1/articles/{slug}', tag: 'News', summary: 'Get one article', desc: 'A full article with its body (HTML by default), plus related stories.',
    params: [PATHP('slug', 'The article slug.'), Q('content', '`html` (default) or `markdown`.', 'string', { enum: ['html', 'markdown'] })],
    h: async (c) => {
      const r = await one(`SELECT * FROM m1313_articles WHERE slug = ? AND ${LIVE}`, [c.params.slug, now()]);
      if (!r) throw bad('not_found', 'Article not found.', 404);
      const rel = await all(`SELECT ${COLS} FROM m1313_articles WHERE ${LIVE} AND category = ? AND id <> ? ORDER BY published_at DESC LIMIT 3`, [now(), r.category, r.id]);
      r.clen = (r.content || '').length;
      return ok(c, { ...articleOut(r, c.o, contentFor(r, c.query.get('content') === 'markdown' ? 'markdown' : 'html', c.o)), related: rel.map((x) => articleOut(x, c.o)) }, {}, 60);
    } },
  { m: 'GET', p: '/api/v1/categories', tag: 'News', summary: 'List categories', desc: 'News categories with the number of published articles in each.',
    h: async (c) => {
      const counts = await all(`SELECT category, COUNT(*) AS n FROM m1313_articles WHERE ${LIVE} GROUP BY category`, [now()]);
      return ok(c, [...(await categoryMap()).values()].map((name) => ({ name, slug: slugify(name), article_count: Number(counts.find((x) => x.category === name)?.n || 0) })), {}, 300);
    } },
  { m: 'GET', p: '/api/v1/tags', tag: 'News', summary: 'Popular tags', desc: 'The most used article tags.', params: [Q('limit', 'How many (1–100).', 'integer', { default: 30 })],
    h: async (c) => {
      const counts = new Map(); for (const r of await all(`SELECT tags FROM m1313_articles WHERE ${LIVE}`, [now()])) for (const t of parseTags(r.tags)) counts.set(t, (counts.get(t) || 0) + 1);
      const limit = Math.min(100, Math.max(1, parseInt(c.query.get('limit')) || 30));
      return ok(c, [...counts].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([tag, n]) => ({ tag, article_count: n })), {}, 300);
    } },
  { m: 'GET', p: '/api/v1/search', tag: 'News', summary: 'Search everything', desc: 'Searches articles, shows and podcasts at once.', params: [Q('q', 'Search words (at least 2 characters).', 'string', { minLength: 2 }), Q('limit', 'Max results per type (1–20).', 'integer', { default: 10 })],
    h: async (c) => {
      const term = (c.query.get('q') || '').trim(); if (term.length < 2) throw bad('invalid_parameter', 'q must be at least 2 characters.');
      const limit = Math.min(20, Math.max(1, parseInt(c.query.get('limit')) || 10)); const like = `%${term.toLowerCase().replace(/[%_]/g, '')}%`;
      const rows = await all(`SELECT ${COLS} FROM m1313_articles WHERE ${LIVE} AND (LOWER(title) LIKE ? OR LOWER(dek) LIKE ? OR LOWER(content) LIKE ?) ORDER BY published_at DESC LIMIT ${limit}`, [now(), like, like, like]);
      const b = await blocks(); const has = (x) => `${x.title} ${x.genre || ''} ${x.desc || ''}`.toLowerCase().includes(term.toLowerCase());
      return ok(c, { query: term, articles: rows.map((r) => articleOut(r, c.o)), shows: (b.SHOWS || []).filter(has).slice(0, limit).map(showOut), podcasts: (b.PODCASTS || []).filter(has).slice(0, limit).map(podcastOut) }, {}, 30);
    } },

  /* ---- live & programming ---- */
  { m: 'GET', p: '/api/v1/live', tag: 'Live', summary: 'Live TV & radio', desc: 'Everything a player needs: the live TV stream (HLS), the radio stream, what is on now and up next, and the breaking-news banner. Stream URLs are `null` when no stream is set.',
    h: async (c) => {
      const b = await blocks(); const P = b.PLAYER || {}; const S = b.SITE || {};
      return ok(c, {
        tv: { stream_url: P.streamUrl || null, stream_type: P.streamUrl ? (/\.m3u8/i.test(P.streamUrl) ? 'hls' : /youtu/i.test(P.streamUrl) ? 'youtube' : 'file') : null, poster: absUrl(P.poster, c.o), autoplay: !!P.autoplay, now: b.NOW_ON_TV || null, up_next: (b.TV_UP_NEXT || []).map(nextOut) },
        radio: { stream_url: S.radioStreamUrl || null, stream_type: S.radioStreamUrl ? (/\.m3u8/i.test(S.radioStreamUrl) ? 'hls' : 'direct') : null, fm: b.FM || null, now: b.NOW_ON_RADIO || null, up_next: (b.RADIO_UP_NEXT || []).map(nextOut), hosts: b.RADIO_HOSTS || [] },
        breaking: S.breaking || null, updates: b.LIVE_UPDATES || [],
      }, {}, 15);
    } },
  { m: 'GET', p: '/api/v1/schedule', tag: 'Live', summary: 'TV & radio schedule', desc: 'The programme line-up. Choose a channel and weekday/weekend.', params: [Q('channel', '`tv` or `radio` (default: both).', 'string', { enum: ['tv', 'radio'] }), Q('day', '`weekday` or `weekend` (default: today).', 'string', { enum: ['weekday', 'weekend'] })],
    h: async (c) => {
      const S = (await blocks()).SCHEDULE || {}; const dow = new Date().getDay(); const day = c.query.get('day') || (dow === 0 || dow === 6 ? 'weekend' : 'weekday'); const D = day === 'weekend' ? 'Weekend' : 'Weekday';
      const map = (rows) => (rows || []).map((r) => ({ time: r[0], title: r[1], description: r[2] || '', on_now: r[3] === true }));
      const ch = c.query.get('channel'); const data = { day };
      if (!ch || ch === 'tv') data.tv = map(S[`tv${D}`]); if (!ch || ch === 'radio') data.radio = map(S[`radio${D}`]);
      return ok(c, data, {}, 120);
    } },
  { m: 'GET', p: '/api/v1/shows', tag: 'Live', summary: 'Shows', desc: 'All TV, radio and podcast programmes.', params: [Q('type', '`tv`, `radio` or `podcast`.', 'string', { enum: ['tv', 'radio', 'podcast'] })],
    h: async (c) => { const t = (c.query.get('type') || '').toUpperCase(); return ok(c, ((await blocks()).SHOWS || []).filter((s) => !t || s.type === t).map(showOut), {}, 300); } },
  { m: 'GET', p: '/api/v1/podcasts', tag: 'Live', summary: 'Podcasts', desc: 'Podcast shows.', h: async (c) => ok(c, ((await blocks()).PODCASTS || []).map(podcastOut), {}, 300) },
  { m: 'GET', p: '/api/v1/episodes', tag: 'Live', summary: 'Latest podcast episodes', desc: 'Newest podcast episodes.', h: async (c) => ok(c, ((await blocks()).EPISODES || []).map((e) => ({ id: slugify(`${e.show}-${e.title}`), show: e.show, title: e.title, color: e.bg })), {}, 300) },
  { m: 'GET', p: '/api/v1/videos', tag: 'Live', summary: 'Featured videos', desc: 'Video cards from the home page.', h: async (c) => ok(c, ((await blocks()).VIDEOS || []).map((v) => ({ id: slugify(v.title), show: v.show, title: v.title, duration: v.dur })), {}, 300) },
  { m: 'GET', p: '/api/v1/sports', tag: 'Live', summary: 'Sports', desc: 'Scores strip, standings, top story and clips.', h: async (c) => ok(c, (await blocks()).SPORTS || {}, {}, 60) },

  /* ---- site ---- */
  { m: 'GET', p: '/api/v1/site', tag: 'Site', summary: 'Site configuration', desc: 'Navigation, footer, contact-form topics, categories and the radio frequency — useful for building app menus.',
    h: async (c) => { const b = await blocks(); const cats = [...(await categoryMap()).values()]; return ok(c, { name: 'MEDIA 1313', url: c.o, fm: b.FM || null, navigation: b.NAV || [], footer: b.FOOTER_COLS || [], contact_topics: b.CONTACT_TOPICS || [], categories: cats.map((n) => ({ name: n, slug: slugify(n) })), texts: b.CHROME || {} }, {}, 300); } },
  { m: 'GET', p: '/api/v1/pages', tag: 'Site', summary: 'List custom pages', desc: 'Pages built in the page builder and published.', h: async (c) => ok(c, (await all("SELECT slug, title, updated_at FROM m1313_pages WHERE status = 'published' ORDER BY title")).map((p) => ({ slug: p.slug, title: p.title, updated_at: p.updated_at, url: `${c.o}/${p.slug === 'home' ? '' : p.slug}` })), {}, 300) },
  { m: 'GET', p: '/api/v1/pages/{slug}', tag: 'Site', summary: 'Get a custom page', desc: 'A published page as a layout tree (sections → columns → widgets).', params: [PATHP('slug', 'Page address.')],
    h: async (c) => { const p = await one("SELECT slug, title, tree, settings, updated_at FROM m1313_pages WHERE slug = ? AND status = 'published'", [c.params.slug]); if (!p) throw bad('not_found', 'Page not found.', 404); return ok(c, { slug: p.slug, title: p.title, updated_at: p.updated_at, url: `${c.o}/${p.slug === 'home' ? '' : p.slug}`, settings: JSON.parse(p.settings || '{}'), layout: JSON.parse(p.tree || '{"sections":[]}') }, {}, 120); } },

  /* ---- forms ---- */
  { m: 'POST', p: '/api/v1/newsletter', tag: 'Forms', summary: 'Subscribe to the newsletter', body: { email: 'reader@example.com' },
    h: async (c) => { const b = await readJson(c.req); const email = str(b.email, 255).toLowerCase(); if (!isEmail(email)) throw bad('invalid_parameter', 'A valid email is required.'); if (!(await one('SELECT id FROM m1313_newsletter WHERE email = ?', [email]))) await run('INSERT INTO m1313_newsletter (id, email, source, created_at) VALUES (?, ?, ?, ?)', [uuid(), email, 'api', now()]); return reply(c, 200, { data: { subscribed: true } }); } },
  { m: 'POST', p: '/api/v1/contact', tag: 'Forms', summary: 'Send a message to the newsroom', body: { name: 'Sam', email: 'sam@example.com', topic: 'News tip', message: 'A story idea…' },
    h: async (c) => { const b = await readJson(c.req); const name = str(b.name, 200), email = str(b.email, 255), message = str(b.message, 5000); if (!name || !isEmail(email) || !message) throw bad('invalid_parameter', 'name, a valid email and message are required.'); await run('INSERT INTO m1313_contact_messages (id, name, email, topic, message, created_at) VALUES (?, ?, ?, ?, ?, ?)', [uuid(), name, email, str(b.topic, 100) || 'Something else', message, now()]); return reply(c, 200, { data: { sent: true } }); } },
  { m: 'POST', p: '/api/v1/song-requests', tag: 'Forms', summary: 'Request a song on the radio', body: { request: 'Song title — Artist' },
    h: async (c) => { const t = str((await readJson(c.req)).request, 500); if (!t) throw bad('invalid_parameter', 'request is required.'); await run('INSERT INTO m1313_song_requests (id, request_text, created_at) VALUES (?, ?, ?)', [uuid(), t, now()]); return reply(c, 200, { data: { sent: true } }); } },

  /* ---- app users ---- */
  { m: 'POST', p: '/api/v1/auth/register', tag: 'Accounts', summary: 'Create an account', desc: 'Returns a token (valid 30 days). Send it as `Authorization: Bearer <token>`.', body: { name: 'Sam Reader', email: 'sam@example.com', password: 'at-least-8-chars', newsletter: true },
    h: async (c) => {
      const b = await readJson(c.req); const name = str(b.name, 200), email = str(b.email, 255).toLowerCase(), password = typeof b.password === 'string' ? b.password : '';
      if (!name || !isEmail(email)) throw bad('invalid_parameter', 'name and a valid email are required.'); if (password.length < 8) throw bad('invalid_parameter', 'Password must be at least 8 characters.');
      if (await one('SELECT id FROM m1313_members WHERE email = ?', [email])) throw bad('email_taken', 'An account with this email already exists.', 409);
      const id = uuid(); await run('INSERT INTO m1313_members (id, name, email, password_hash, wants_briefing, created_at) VALUES (?, ?, ?, ?, ?, ?)', [id, name, email, hashPassword(password), b.newsletter ? 1 : 0, now()]);
      if (b.newsletter && !(await one('SELECT id FROM m1313_newsletter WHERE email = ?', [email]))) await run('INSERT INTO m1313_newsletter (id, email, source, created_at) VALUES (?, ?, ?, ?)', [uuid(), email, 'app', now()]);
      return reply(c, 201, { data: { token: sign({ id }), member: { id, name, email } } });
    } },
  { m: 'POST', p: '/api/v1/auth/login', tag: 'Accounts', summary: 'Sign in', body: { email: 'sam@example.com', password: '…' },
    h: async (c) => { const b = await readJson(c.req); const m = await one('SELECT id, name, email, password_hash FROM m1313_members WHERE email = ?', [str(b.email, 255).toLowerCase()]); if (!m || typeof b.password !== 'string' || !verifyPassword(b.password, m.password_hash)) throw bad('invalid_credentials', 'Incorrect email or password.', 401); return reply(c, 200, { data: { token: sign({ id: m.id }), member: { id: m.id, name: m.name, email: m.email } } }); } },
  { m: 'POST', p: '/api/v1/auth/refresh', tag: 'Accounts', summary: 'Get a fresh token', desc: 'Send the current token; get a new 30-day token.', auth: true,
    h: async (c) => { const id = memberOr401(c); return reply(c, 200, { data: { token: sign({ id }) } }); } },
  { m: 'GET', p: '/api/v1/me', tag: 'Accounts', summary: 'My profile', auth: true,
    h: async (c) => { const id = memberOr401(c); const m = await one('SELECT id, name, email, wants_briefing, created_at FROM m1313_members WHERE id = ?', [id]); if (!m) throw bad('unauthorized', 'Account no longer exists.', 401); return reply(c, 200, { data: { id: m.id, name: m.name, email: m.email, newsletter: !!Number(m.wants_briefing), created_at: m.created_at } }); } },
  { m: 'DELETE', p: '/api/v1/me', tag: 'Accounts', summary: 'Delete my account', desc: 'Permanently deletes the account, its saved articles and followed podcasts. (Required by the App Store and Google Play.)', auth: true,
    h: async (c) => { const id = memberOr401(c); await run('DELETE FROM m1313_bookmarks WHERE member_id = ?', [id]); await run('DELETE FROM m1313_podcast_follows WHERE member_id = ?', [id]); await run('DELETE FROM m1313_members WHERE id = ?', [id]); return reply(c, 200, { data: { deleted: true } }); } },
  { m: 'GET', p: '/api/v1/me/bookmarks', tag: 'Accounts', summary: 'My saved articles', params: PAGE, auth: true,
    h: async (c) => {
      const id = memberOr401(c); const p = paging(c); const o = c.o;
      const total = Number((await one("SELECT COUNT(*) AS n FROM m1313_bookmarks b JOIN m1313_articles a ON a.id = b.article_id WHERE b.member_id = ? AND a.status = 'published'", [id])).n);
      const rows = await all(`SELECT a.id, a.slug, a.title, a.dek, a.category, a.tags, a.hero_image, a.author, a.published_at, a.created_at, a.updated_at, LENGTH(a.content) AS clen FROM m1313_bookmarks b JOIN m1313_articles a ON a.id = b.article_id WHERE b.member_id = ? AND a.status = 'published' ORDER BY b.created_at DESC LIMIT ${p.per} OFFSET ${p.offset}`, [id]);
      return reply(c, 200, { data: rows.map((r) => articleOut(r, o)), ...pageMeta(c, p, total) });
    } },
  { m: 'PUT', p: '/api/v1/me/bookmarks/{slug}', tag: 'Accounts', summary: 'Save an article', params: [PATHP('slug', 'Article slug.')], auth: true,
    h: async (c) => { const id = memberOr401(c); const a = await one(`SELECT id FROM m1313_articles WHERE slug = ? AND ${LIVE}`, [c.params.slug, now()]); if (!a) throw bad('not_found', 'Article not found.', 404); if (!(await one('SELECT id FROM m1313_bookmarks WHERE member_id = ? AND article_id = ?', [id, a.id]))) await run('INSERT INTO m1313_bookmarks (id, member_id, article_id, created_at) VALUES (?, ?, ?, ?)', [uuid(), id, a.id, now()]); return reply(c, 200, { data: { saved: true } }); } },
  { m: 'DELETE', p: '/api/v1/me/bookmarks/{slug}', tag: 'Accounts', summary: 'Remove a saved article', params: [PATHP('slug', 'Article slug.')], auth: true,
    h: async (c) => { const id = memberOr401(c); const a = await one('SELECT id FROM m1313_articles WHERE slug = ?', [c.params.slug]); if (a) await run('DELETE FROM m1313_bookmarks WHERE member_id = ? AND article_id = ?', [id, a.id]); return reply(c, 200, { data: { saved: false } }); } },
  { m: 'GET', p: '/api/v1/me/follows', tag: 'Accounts', summary: 'Podcasts I follow', auth: true,
    h: async (c) => { const id = memberOr401(c); return reply(c, 200, { data: (await all('SELECT podcast FROM m1313_podcast_follows WHERE member_id = ? ORDER BY created_at DESC', [id])).map((r) => r.podcast) }); } },
  { m: 'PUT', p: '/api/v1/me/follows/{podcast}', tag: 'Accounts', summary: 'Follow a podcast', params: [PATHP('podcast', 'Podcast title (URL-encoded).')], auth: true,
    h: async (c) => { const id = memberOr401(c); const name = str(c.params.podcast, 200); if (!(await one('SELECT id FROM m1313_podcast_follows WHERE member_id = ? AND podcast = ?', [id, name]))) await run('INSERT INTO m1313_podcast_follows (id, member_id, podcast, created_at) VALUES (?, ?, ?, ?)', [uuid(), id, name, now()]); return reply(c, 200, { data: { following: true } }); } },
  { m: 'DELETE', p: '/api/v1/me/follows/{podcast}', tag: 'Accounts', summary: 'Unfollow a podcast', params: [PATHP('podcast', 'Podcast title (URL-encoded).')], auth: true,
    h: async (c) => { const id = memberOr401(c); await run('DELETE FROM m1313_podcast_follows WHERE member_id = ? AND podcast = ?', [id, str(c.params.podcast, 200)]); return reply(c, 200, { data: { following: false } }); } },
];

const showOut = (s) => ({ id: slugify(s.title), title: s.title, type: String(s.type || '').toLowerCase(), genre: s.genre || '', schedule: s.when || '', color: s.bg || null });
const podcastOut = (p) => ({ id: slugify(p.title), title: p.title, description: p.desc || '', color: p.bg || null });
const nextOut = (r) => ({ time: r.time, title: r.title, description: r.sub || '', tag: r.tag || null });

/* ---------------------------------------------------------------- OpenAPI ---------------------------------------------------------------- */
export function openApi(origin) {
  const paths = {};
  for (const e of ENDPOINTS) {
    const op = { tags: [e.tag], summary: e.summary, description: e.desc || undefined, operationId: `${e.m.toLowerCase()}_${e.p.replace(/[^a-z]+/gi, '_').replace(/^_|_$/g, '')}`, parameters: e.params, security: e.auth ? [{ memberToken: [] }] : undefined,
      responses: { 200: { description: 'Success', content: { 'application/json': { schema: { $ref: e.p.endsWith('/articles') ? '#/components/schemas/ArticleList' : '#/components/schemas/Envelope' } } } }, 401: e.auth ? { description: 'Missing or invalid token' } : undefined, 404: /\{/.test(e.p) ? { description: 'Not found' } : undefined, 429: { description: 'Rate limited', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } } } };
    if (e.body) op.requestBody = { required: true, content: { 'application/json': { schema: { type: 'object', example: e.body } } } };
    (paths[e.p] ||= {})[e.m.toLowerCase()] = JSON.parse(JSON.stringify(op));
  }
  const article = { type: 'object', properties: { id: { type: 'string' }, slug: { type: 'string' }, title: { type: 'string' }, excerpt: { type: 'string' }, category: { type: 'string' }, category_slug: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, author: { type: 'string', nullable: true }, image: { type: 'string', nullable: true, description: 'Absolute image URL' }, url: { type: 'string', description: 'Web address of the story' }, published_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' }, reading_minutes: { type: 'integer' }, content: { type: 'string', description: 'Present when requested (html or markdown)' } } };
  return {
    openapi: '3.0.3',
    info: { title: 'MEDIA 1313 public API', version: VERSION, description: 'Read news, live TV/radio info, schedules and shows, and let app users sign in, save articles and follow podcasts.\n\n**Responses** are JSON: `{ "data": …, "meta": …, "links": … }`; errors are `{ "error": { "code", "message" } }`.\n\n**Auth:** most endpoints are public. If the site owner turned on API keys, send `X-API-Key: <key>`. Account endpoints need `Authorization: Bearer <token>` from `/auth/login`.\n\n**Limits:** requests are rate limited per IP/key (see `X-RateLimit-*` headers). Responses carry `ETag` — send `If-None-Match` to get `304 Not Modified` and save data.' },
    servers: [{ url: origin }],
    tags: ['Meta', 'News', 'Live', 'Site', 'Forms', 'Accounts'].map((name) => ({ name })),
    paths,
    components: {
      securitySchemes: { apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' }, memberToken: { type: 'http', scheme: 'bearer' } },
      schemas: {
        Article: article,
        ArticleList: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Article' } }, meta: { type: 'object', properties: { page: { type: 'integer' }, per_page: { type: 'integer' }, total: { type: 'integer' }, total_pages: { type: 'integer' } } }, links: { type: 'object', properties: { self: { type: 'string' }, next: { type: 'string', nullable: true }, prev: { type: 'string', nullable: true } } } } },
        Envelope: { type: 'object', properties: { data: {} } },
        Error: { type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } } },
      },
    },
    security: [{}, { apiKey: [] }],
  };
}

/* ---------------------------------------------------------------- registration ---------------------------------------------------------------- */
export function v1Routes(r) {
  const wrap = (e) => async (c) => {
    const cors = await corsHeaders(c.req);
    const g = await gate(c.req, { write: e.m !== 'GET' });
    if (!g.ok) return send(c.res, g.status, { error: { code: g.code, message: g.message } }, { ...cors, ...(g.headers || {}) });
    c.h = { ...cors, ...g.headers }; c.o = originOf(c.req);
    try { return await e.h(c); }
    catch (err) {
      if (err.status) return fail(c, err.status, err.code || 'error', err.message);
      console.error('[api/v1]', e.m, e.p, err); return fail(c, 500, 'server_error', 'Something went wrong.');
    }
  };
  for (const e of ENDPOINTS) {
    const pattern = e.p.replace(/\{(\w+)\}/g, ':$1');
    ({ GET: r.get, POST: r.post, PUT: r.put, DELETE: r.del })[e.m](pattern, wrap(e));
  }
  r.get('/api/v1/openapi.json', async (c) => { const cors = await corsHeaders(c.req); send(c.res, 200, openApi(originOf(c.req)), { ...cors, 'Cache-Control': 'public, max-age=300' }); });
}
