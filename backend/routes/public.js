import { all, one, run, uuid, now, getContent } from '../lib/db.js';
import { ok, fail, send, readJson, str, isEmail } from '../lib/http.js';
import { hashPassword, verifyPassword, sign, memberId } from '../lib/auth.js';
import { listPublished, getPublished, homeFeed } from '../lib/articles.js';
import { tick as autoblogTick } from '../lib/autoblog.js';

const cache = { 'Cache-Control': 'public, max-age=20' };

export function publicRoutes(r) {
  r.get('/api/health', (c) => ok(c.res, { ok: true, time: now() }));

  r.get('/api/home', async (c) => send(c.res, 200, await homeFeed(), cache));
  r.get('/api/articles', async (c) => {
    const q = c.query; const limit = Math.min(Number(q.get('limit')) || 50, 200);
    const articles = await listPublished({ category: q.get('category'), limit, exclude: q.get('exclude') });
    send(c.res, 200, { articles }, cache);
  });
  r.get('/api/articles/:slug', async (c) => {
    const article = await getPublished(c.params.slug);
    if (!article) return fail(c.res, 404, 'Article not found');
    const related = await listPublished({ category: article.category, limit: 3, exclude: article.slug });
    send(c.res, 200, { article, related }, cache);
  });

  // Published site content (draft versions never leave the admin).
  r.get('/api/content', async (c) => {
    const out = {};
    for (const row of await getContent()) { const v = JSON.parse(row.content_value); if (v !== null) out[row.content_key] = v; }
    // slugs of published builder pages: they replace the built-in page at the same address ("home" = "/")
    out._pages = (await all("SELECT slug FROM m1313_pages WHERE status = 'published'")).map((r) => r.slug);
    send(c.res, 200, out, cache);
  });

  // A published page built in the page builder.
  r.get('/api/pages/:slug', async (c) => {
    const p = await one("SELECT slug, title, tree, settings FROM m1313_pages WHERE slug = ? AND status = 'published'", [c.params.slug]);
    if (!p) return fail(c.res, 404, 'Page not found');
    send(c.res, 200, { slug: p.slug, title: p.title, tree: JSON.parse(p.tree || '{"sections":[]}'), settings: JSON.parse(p.settings || '{}') }, cache);
  });

  // A real cron job can call this so posts keep flowing even when the Node process was asleep:  curl "https://…/api/cron/autoblog?key=$CRON_KEY"
  const cron = async (c) => {
    const k = process.env.CRON_KEY; if (!k || c.query.get('key') !== k) return fail(c.res, 404, 'Not found');
    ok(c.res, await autoblogTick());
  };
  r.get('/api/cron/autoblog', cron); r.post('/api/cron/autoblog', cron);

  r.post('/api/newsletter', async (c) => {
    const b = await readJson(c.req); const email = str(b.email, 255).toLowerCase();
    if (!isEmail(email)) return fail(c.res, 400, 'Please enter a valid email address.');
    if (!(await one('SELECT id FROM m1313_newsletter WHERE email = ?', [email])))
      await run('INSERT INTO m1313_newsletter (id, email, source, created_at) VALUES (?, ?, ?, ?)', [uuid(), email, str(b.source, 60) || 'site', now()]);
    ok(c.res);
  });
  r.post('/api/contact', async (c) => {
    const b = await readJson(c.req);
    const name = str(b.name, 200), email = str(b.email, 255), message = str(b.message, 5000);
    if (!name || !isEmail(email) || !message) return fail(c.res, 400, 'Name, a valid email and a message are required.');
    await run('INSERT INTO m1313_contact_messages (id, name, email, topic, message, created_at) VALUES (?, ?, ?, ?, ?, ?)', [uuid(), name, email, str(b.topic, 100) || 'Something else', message, now()]);
    ok(c.res);
  });
  r.post('/api/song-requests', async (c) => {
    const text = str((await readJson(c.req)).request, 500);
    if (!text) return fail(c.res, 400, 'Tell us the song or artist you want to hear.');
    await run('INSERT INTO m1313_song_requests (id, request_text, created_at) VALUES (?, ?, ?)', [uuid(), text, now()]);
    ok(c.res);
  });

  // Visitor accounts
  r.post('/api/auth/register', async (c) => {
    const b = await readJson(c.req);
    const name = str(b.name, 200), email = str(b.email, 255).toLowerCase(), password = typeof b.password === 'string' ? b.password : '';
    if (!name || !isEmail(email)) return fail(c.res, 400, 'Name and a valid email are required.');
    if (password.length < 8) return fail(c.res, 400, 'Password must be at least 8 characters.');
    if (await one('SELECT id FROM m1313_members WHERE email = ?', [email])) return fail(c.res, 409, 'An account with this email already exists.');
    const id = uuid();
    await run('INSERT INTO m1313_members (id, name, email, password_hash, wants_briefing, created_at) VALUES (?, ?, ?, ?, ?, ?)', [id, name, email, hashPassword(password), b.briefing ? 1 : 0, now()]);
    if (b.briefing && !(await one('SELECT id FROM m1313_newsletter WHERE email = ?', [email])))
      await run('INSERT INTO m1313_newsletter (id, email, source, created_at) VALUES (?, ?, ?, ?)', [uuid(), email, 'signup', now()]);
    send(c.res, 201, { token: sign({ id }), member: { id, name, email } });
  });
  r.post('/api/auth/login', async (c) => {
    const b = await readJson(c.req);
    const m = await one('SELECT id, name, email, password_hash FROM m1313_members WHERE email = ?', [str(b.email, 255).toLowerCase()]);
    if (!m || typeof b.password !== 'string' || !verifyPassword(b.password, m.password_hash)) return fail(c.res, 401, 'Incorrect email or password.');
    ok(c.res, { token: sign({ id: m.id }), member: { id: m.id, name: m.name, email: m.email } });
  });
  r.get('/api/auth/me', async (c) => {
    const id = memberId(c.req);
    const m = id && (await one('SELECT id, name, email FROM m1313_members WHERE id = ?', [id]));
    m ? ok(c.res, { member: m }) : fail(c.res, 401, 'Not signed in');
  });
  r.get('/api/podcasts-follow', async (c) => {
    const id = memberId(c.req); if (!id) return fail(c.res, 401, 'Sign in to follow podcasts.');
    ok(c.res, { following: (await all('SELECT podcast FROM m1313_podcast_follows WHERE member_id = ?', [id])).map((x) => x.podcast) });
  });
  r.post('/api/podcasts-follow', async (c) => {
    const id = memberId(c.req); if (!id) return fail(c.res, 401, 'Sign in to follow podcasts.');
    const b = await readJson(c.req); const podcast = str(b.podcast, 200);
    if (!podcast) return fail(c.res, 400, 'Podcast is required.');
    const has = await one('SELECT id FROM m1313_podcast_follows WHERE member_id = ? AND podcast = ?', [id, podcast]);
    if (b.follow && !has) await run('INSERT INTO m1313_podcast_follows (id, member_id, podcast, created_at) VALUES (?, ?, ?, ?)', [uuid(), id, podcast, now()]);
    if (!b.follow && has) await run('DELETE FROM m1313_podcast_follows WHERE id = ?', [has.id]);
    ok(c.res);
  });
}
