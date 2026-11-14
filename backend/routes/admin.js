import { all, one, run, uuid, now, getContent, setContent, logActivity } from '../lib/db.js';
import { ok, fail, send, readJson, readBuffer, str, isEmail, clientIp } from '../lib/http.js';
import { hashPassword, verifyPassword, adminCookie, currentAdmin } from '../lib/auth.js';
import * as articles from '../lib/articles.js';
import { saveUpload, removeUpload, MAX_UPLOAD } from '../lib/media.js';
import * as autoblog from '../lib/autoblog.js';
import { getCode, saveCode } from '../lib/inject.js';
import * as shows from '../lib/shows.js';
import { getAds, saveAds } from '../lib/ads.js';
import * as push from '../lib/push.js';
import * as fcm from '../lib/fcm.js';
import * as apiGate from '../lib/apiGate.js';
import { setSetting, delSetting } from '../lib/db.js';

// --- brute-force protection for the login form (per IP, in memory) ---
const attempts = new Map();
const tooMany = (ip) => { const a = attempts.get(ip); return a && a.n >= 8 && Date.now() - a.t < 15 * 60e3; };
const miss = (ip) => { const a = attempts.get(ip); attempts.set(ip, a && Date.now() - a.t < 15 * 60e3 ? { n: a.n + 1, t: a.t } : { n: 1, t: Date.now() }); };

export function adminRoutes(r) {
  r.post('/api/admin/login', async (c) => {
    const ip = clientIp(c.req);
    if (tooMany(ip)) return fail(c.res, 429, 'Too many attempts. Try again in 15 minutes.');
    const b = await readJson(c.req);
    const a = await one('SELECT * FROM m1313_admins WHERE email = ?', [str(b.email, 255).toLowerCase()]);
    if (!a || typeof b.password !== 'string' || !verifyPassword(b.password, a.password_hash)) { miss(ip); return fail(c.res, 401, 'Incorrect email or password.'); }
    attempts.delete(ip);
    await run('UPDATE m1313_admins SET last_login = ? WHERE id = ?', [now(), a.id]);
    await logActivity(a.email, 'login', 'session');
    ok(c.res, { admin: { id: a.id, email: a.email, name: a.name, role: a.role } }, { 'Set-Cookie': adminCookie(c.req, a) });
  });
  r.post('/api/admin/logout', async (c) => { ok(c.res, { ok: true }, { 'Set-Cookie': adminCookie(c.req, { id: '', password_hash: '' }, true) }); });

  const A = (h, role) => async (c) => {
    const admin = await currentAdmin(c.req);
    if (!admin) return fail(c.res, 401, 'Please sign in.');
    if (c.req.method !== 'GET' && c.req.headers['x-requested-with'] !== 'm1313') return fail(c.res, 403, 'Bad request origin.');
    if (role === 'admin' && admin.role !== 'admin') return fail(c.res, 403, 'Only administrators can do this.');
    c.admin = admin;
    return h(c);
  };
  const get = (p, h, role) => r.get(p, A(h, role)), post = (p, h, role) => r.post(p, A(h, role)),
    put = (p, h, role) => r.put(p, A(h, role)), del = (p, h, role) => r.del(p, A(h, role));
  const log = (c, action, target) => logActivity(c.admin.email, action, target);

  const newsCategories = async () => { const r = await one("SELECT content_value FROM m1313_content WHERE content_key = 'NEWS_CATEGORIES'"); try { return (JSON.parse(r.content_value) || []).filter((x) => x !== 'All'); } catch { return []; } };
  const PLACEHOLDER_BREAKING = /^Breaking alert headline appears here/i;
  const breakingOf = async () => { const r = await one("SELECT content_value FROM m1313_content WHERE content_key = 'SITE'"); try { return String(JSON.parse(r.content_value)?.breaking || ''); } catch { return ''; } };
  const watchBreaking = async (before) => { const now_ = await breakingOf(); if (now_ && now_ !== before && !PLACEHOLDER_BREAKING.test(now_)) push.notifyBreaking(now_); };   // a changed breaking headline notifies subscribers

  get('/api/admin/me', (c) => ok(c.res, { admin: { id: c.admin.id, email: c.admin.email, name: c.admin.name, role: c.admin.role } }));
  put('/api/admin/me/password', async (c) => {
    const b = await readJson(c.req);
    if (!verifyPassword(String(b.current || ''), c.admin.password_hash)) return fail(c.res, 400, 'Current password is incorrect.');
    if (String(b.next || '').length < 10) return fail(c.res, 400, 'New password must be at least 10 characters.');
    await run('UPDATE m1313_admins SET password_hash = ? WHERE id = ?', [hashPassword(b.next), c.admin.id]);
    await log(c, 'changed password', c.admin.email);
    const updated = { ...c.admin, password_hash: (await one('SELECT password_hash FROM m1313_admins WHERE id = ?', [c.admin.id])).password_hash };
    ok(c.res, { ok: true }, { 'Set-Cookie': adminCookie(c.req, updated) }); // keep this session signed in
  });

  // ---------- dashboard ----------
  get('/api/admin/stats', async (c) => {
    const n = async (t, w = '') => Number((await one(`SELECT COUNT(*) AS n FROM ${t} ${w}`)).n);
    ok(c.res, {
      articles: await n('m1313_articles'), published: await n('m1313_articles', "WHERE status = 'published'"),
      leads: await n('m1313_contact_messages'), unread: await n('m1313_contact_messages', "WHERE status = 'new'"),
      subscribers: await n('m1313_newsletter'), members: await n('m1313_members'), media: await n('m1313_media'), requests: await n('m1313_song_requests'),
      recentLeads: await all('SELECT id, name, email, topic, message, status, created_at FROM m1313_contact_messages ORDER BY created_at DESC LIMIT 5'),
      activity: await all('SELECT admin_email, action, target, created_at FROM m1313_activity ORDER BY created_at DESC LIMIT 10'),
    });
  });

  // ---------- articles ----------
  get('/api/admin/articles', async (c) => ok(c.res, { articles: await articles.adminList() }));
  get('/api/admin/articles/:id', async (c) => { const a = await articles.adminGet(c.params.id); a ? ok(c.res, { article: a }) : fail(c.res, 404, 'Not found'); });
  post('/api/admin/articles', async (c) => {
    const b = await readJson(c.req); if (!b.author) b.author = c.admin.name;
    const id = await articles.adminSave(b); await log(c, `created article (${b.status === 'published' ? 'published' : 'draft'})`, b.title);
    ok(c.res, { article: await articles.adminGet(id) });
  });
  put('/api/admin/articles/:id', async (c) => {
    const b = await readJson(c.req); await articles.adminSave(b, c.params.id); await log(c, 'updated article', b.title);
    ok(c.res, { article: await articles.adminGet(c.params.id) });
  });
  post('/api/admin/articles/:id/status', async (c) => {
    const b = await readJson(c.req); const s = b.status === 'published' ? 'published' : 'draft';
    await articles.setStatus(c.params.id, s); const a = await articles.adminGet(c.params.id);
    await log(c, s === 'published' ? 'published article' : 'unpublished article', a?.title); ok(c.res, { article: a });
  });
  del('/api/admin/articles/:id', async (c) => { const a = await articles.adminGet(c.params.id); await articles.adminDelete(c.params.id); await log(c, 'deleted article', a?.title); ok(c.res); });

  // ---------- site content blocks (draft → publish) ----------
  get('/api/admin/content', async (c) => {
    const blocks = {};
    for (const row of await getContent()) {
      const value = JSON.parse(row.content_value); const draft = row.draft_value ? JSON.parse(row.draft_value) : null;
      blocks[row.content_key] = { value, draft, hasDraft: draft !== null, updatedAt: row.updated_at };
    }
    ok(c.res, { blocks });
  });
  put('/api/admin/content/:key', async (c) => {
    const key = c.params.key; const b = await readJson(c.req);
    if (!(await one('SELECT content_key FROM m1313_content WHERE content_key = ?', [key]))) return fail(c.res, 404, 'Unknown content block.');
    if (b.value === undefined) return fail(c.res, 400, 'Missing value.');
    const before = key === 'SITE' && b.publish ? await breakingOf() : '';
    await setContent(key, b.value, { draft: !b.publish });
    if (key === 'SITE' && b.publish) watchBreaking(before);
    await log(c, b.publish ? 'published content' : 'saved draft of', key); ok(c.res);
  });
  post('/api/admin/content/:key/publish', async (c) => {
    const row = await one('SELECT draft_value FROM m1313_content WHERE content_key = ?', [c.params.key]);
    if (!row?.draft_value) return fail(c.res, 400, 'There is no draft to publish.');
    const before = c.params.key === 'SITE' ? await breakingOf() : '';
    await setContent(c.params.key, JSON.parse(row.draft_value)); if (c.params.key === 'SITE') watchBreaking(before); await log(c, 'published content', c.params.key); ok(c.res);
  });
  del('/api/admin/content/:key/draft', async (c) => { await run('UPDATE m1313_content SET draft_value = NULL WHERE content_key = ?', [c.params.key]); await log(c, 'discarded draft of', c.params.key); ok(c.res); });
  post('/api/admin/content-publish', async (c) => { // publish several drafts at once (live editor)
    const keys = (await readJson(c.req)).keys; let n = 0;
    for (const key of Array.isArray(keys) ? keys : []) {
      const row = await one('SELECT draft_value FROM m1313_content WHERE content_key = ?', [String(key)]);
      if (row?.draft_value) { const before = String(key) === 'SITE' ? await breakingOf() : ''; await setContent(String(key), JSON.parse(row.draft_value)); if (String(key) === 'SITE') watchBreaking(before); n++; }
    }
    await log(c, 'published content', `${n} block(s) from live editor`); ok(c.res, { published: n });
  });

  // ---------- pages (page builder) ----------
  const RESERVED = new Set(['admin', 'api', 'uploads', 'assets', '__pb']);
  const cleanSlug = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
  const emptyTree = { sections: [] };
  const pageOut = (p) => ({ id: p.id, slug: p.slug, title: p.title, status: p.status, hasDraft: !!p.draft_tree, tree: JSON.parse(p.draft_tree || p.tree || '{"sections":[]}'), liveTree: JSON.parse(p.tree || '{"sections":[]}'), settings: JSON.parse(p.settings || '{}'), updatedAt: p.updated_at });
  get('/api/admin/pages', async (c) => ok(c.res, { pages: (await all('SELECT id, slug, title, status, draft_tree, updated_at FROM m1313_pages ORDER BY updated_at DESC')).map((p) => ({ id: p.id, slug: p.slug, title: p.title, status: p.status, hasDraft: !!p.draft_tree, updatedAt: p.updated_at })) }));
  get('/api/admin/pages/:id', async (c) => { const p = await one('SELECT * FROM m1313_pages WHERE id = ?', [c.params.id]); p ? ok(c.res, { page: pageOut(p) }) : fail(c.res, 404, 'Not found'); });
  post('/api/admin/pages', async (c) => {
    const b = await readJson(c.req); const title = str(b.title, 300); const slug = cleanSlug(b.slug || title);
    if (!title || !slug) return fail(c.res, 400, 'A title is required.');
    if (RESERVED.has(slug)) return fail(c.res, 400, `“${slug}” is reserved. Choose another address.`);
    if (await one('SELECT id FROM m1313_pages WHERE slug = ?', [slug])) return fail(c.res, 409, 'A page with that address already exists.');
    const id = uuid(); const t = now();
    await run('INSERT INTO m1313_pages (id, slug, title, status, tree, draft_tree, settings, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, slug, title, 'draft', JSON.stringify(emptyTree), JSON.stringify(b.tree && Array.isArray(b.tree.sections) ? b.tree : emptyTree), JSON.stringify({ layout: 'default', description: '' }), t, t]);
    await log(c, 'created page', title); ok(c.res, { page: pageOut(await one('SELECT * FROM m1313_pages WHERE id = ?', [id])) });
  });
  put('/api/admin/pages/:id', async (c) => { // saves a DRAFT (and title / address / settings); publish is separate
    const b = await readJson(c.req); const cur = await one('SELECT * FROM m1313_pages WHERE id = ?', [c.params.id]);
    if (!cur) return fail(c.res, 404, 'Not found');
    const title = str(b.title, 300) || cur.title; const slug = b.slug ? cleanSlug(b.slug) : cur.slug;
    if (slug !== cur.slug) { if (RESERVED.has(slug)) return fail(c.res, 400, `“${slug}” is reserved.`); if (await one('SELECT id FROM m1313_pages WHERE slug = ? AND id <> ?', [slug, cur.id])) return fail(c.res, 409, 'A page with that address already exists.'); }
    if (b.tree && !Array.isArray(b.tree.sections)) return fail(c.res, 400, 'Invalid page layout.');
    const treeJson = b.tree ? JSON.stringify(b.tree) : null;
    if (treeJson && treeJson.length > 1500000) return fail(c.res, 413, 'This page is too large.');
    await run('UPDATE m1313_pages SET title = ?, slug = ?, draft_tree = ?, settings = ?, updated_at = ? WHERE id = ?', [title, slug, treeJson ?? cur.draft_tree, JSON.stringify(b.settings || JSON.parse(cur.settings || '{}')), now(), cur.id]);
    await log(c, 'saved draft of page', title); ok(c.res, { page: pageOut(await one('SELECT * FROM m1313_pages WHERE id = ?', [cur.id])) });
  });
  post('/api/admin/pages/:id/publish', async (c) => {
    const cur = await one('SELECT * FROM m1313_pages WHERE id = ?', [c.params.id]); if (!cur) return fail(c.res, 404, 'Not found');
    await run("UPDATE m1313_pages SET tree = ?, draft_tree = NULL, status = 'published', updated_at = ? WHERE id = ?", [cur.draft_tree || cur.tree, now(), cur.id]);
    await log(c, 'published page', cur.title); ok(c.res, { page: pageOut(await one('SELECT * FROM m1313_pages WHERE id = ?', [cur.id])) });
  });
  post('/api/admin/pages/:id/unpublish', async (c) => {
    const cur = await one('SELECT * FROM m1313_pages WHERE id = ?', [c.params.id]); if (!cur) return fail(c.res, 404, 'Not found');
    await run("UPDATE m1313_pages SET status = 'draft', draft_tree = ?, updated_at = ? WHERE id = ?", [cur.draft_tree || cur.tree, now(), cur.id]);
    await log(c, 'unpublished page', cur.title); ok(c.res);
  });
  post('/api/admin/pages/:id/duplicate', async (c) => {
    const cur = await one('SELECT * FROM m1313_pages WHERE id = ?', [c.params.id]); if (!cur) return fail(c.res, 404, 'Not found');
    let slug = `${cur.slug}-copy`, n = 2; while (await one('SELECT id FROM m1313_pages WHERE slug = ?', [slug])) slug = `${cur.slug}-copy-${n++}`;
    const id = uuid(); const t = now();
    await run('INSERT INTO m1313_pages (id, slug, title, status, tree, draft_tree, settings, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, slug, `${cur.title} (copy)`, 'draft', JSON.stringify(emptyTree), cur.draft_tree || cur.tree, cur.settings, t, t]);
    await log(c, 'duplicated page', cur.title); ok(c.res, { page: pageOut(await one('SELECT * FROM m1313_pages WHERE id = ?', [id])) });
  });
  del('/api/admin/pages/:id', async (c) => { const p = await one('SELECT title FROM m1313_pages WHERE id = ?', [c.params.id]); await run('DELETE FROM m1313_pages WHERE id = ?', [c.params.id]); await log(c, 'deleted page', p?.title); ok(c.res); });

  // ---------- AI auto-blog (administrators only) ----------
  for (const kind of ['shows', 'videos']) {
    const list = kind === 'shows' ? shows.listShows : shows.listVideos; const save = kind === 'shows' ? shows.saveShow : shows.saveVideo; const word = kind === 'shows' ? 'show' : 'video';
    get(`/api/admin/${kind}`, async (c) => ok(c.res, { items: await list({ all: true }) }));
    post(`/api/admin/${kind}`, async (c) => { const b = await readJson(c.req); try { const id = await save(null, b); await log(c, `added a ${word}`, str(b.title, 120)); if (kind === 'videos' && b.active !== false) push.notifyVideo({ title: str(b.title, 200), show: str(b.show, 200), poster: b.poster }); ok(c.res, { id, items: await list({ all: true }) }); } catch (e) { fail(c.res, e.status || 500, e.message); } });
    put(`/api/admin/${kind}/order`, async (c) => { const b = await readJson(c.req); if (Array.isArray(b.ids)) await shows.reorder(kind, b.ids.slice(0, 500)); ok(c.res, { items: await list({ all: true }) }); });
    put(`/api/admin/${kind}/:id`, async (c) => { const b = await readJson(c.req); try { await save(c.params.id, b); await log(c, `updated a ${word}`, str(b.title, 120)); ok(c.res, { items: await list({ all: true }) }); } catch (e) { fail(c.res, e.status || 500, e.message); } });
    del(`/api/admin/${kind}/:id`, async (c) => { await shows.delRow(kind, c.params.id); await log(c, `deleted a ${word}`, c.params.id); ok(c.res, { items: await list({ all: true }) }); });
  }
  get('/api/admin/push/firebase', async (c) => ok(c.res, await fcm.status()), 'admin');
  put('/api/admin/push/firebase', async (c) => { try { const r = await fcm.saveAccount((await readJson(c.req)).json); await log(c, 'saved the Firebase service-account key', r.projectId); ok(c.res, await fcm.status()); } catch (e) { fail(c.res, e.status || 500, e.message); } }, 'admin');
  del('/api/admin/push/firebase', async (c) => { await fcm.removeAccount(); await log(c, 'removed the Firebase service-account key', ''); ok(c.res, await fcm.status()); }, 'admin');
  post('/api/admin/push/firebase/test', async (c) => { try { ok(c.res, await fcm.test()); } catch (e) { send(c.res, 200, { ok: false, error: e.message }); } }, 'admin');
  get('/api/admin/push', async (c) => ok(c.res, { firebase: await fcm.status(), settings: await push.getPush(), stats: await push.stats(), log: await push.recentLog(30), topics: push.TOPICS, categories: await newsCategories(), publicKey: await push.publicKey() }), 'admin');
  put('/api/admin/push', async (c) => { const s = await push.savePush(await readJson(c.req)); await log(c, s.enabled ? 'updated notification settings (on)' : 'updated notification settings (off)', ''); ok(c.res, { firebase: await fcm.status(), settings: s, stats: await push.stats(), log: await push.recentLog(30), topics: push.TOPICS, categories: await newsCategories(), publicKey: await push.publicKey() }); }, 'admin');
  post('/api/admin/push/send', async (c) => {
    const b = await readJson(c.req); const topic = ['all', 'test', ...push.TOPICS.map((t) => t.id)].includes(b.topic) ? b.topic : 'all';
    try { const r = await push.sendToTopic(topic, { title: b.title, body: b.body, url: b.url }, 'manual'); await log(c, 'sent a push notification', `${str(b.title, 100)} → ${r.sent}`); ok(c.res, r); } catch (e) { fail(c.res, e.status || 500, e.message); }
  }, 'admin');
  get('/api/admin/ads', async (c) => ok(c.res, await getAds()), 'admin');
  put('/api/admin/ads', async (c) => { try { const a = await saveAds(await readJson(c.req)); await log(c, a.enabled ? 'updated ad slots (on)' : 'updated ad slots (off)', ''); ok(c.res, a); } catch (e) { fail(c.res, e.status || 500, e.message); } }, 'admin');
  get('/api/admin/code', async (c) => ok(c.res, await getCode()), 'admin');
  put('/api/admin/code', async (c) => { const s = await saveCode(await readJson(c.req)); await log(c, s.enabled ? 'updated header/footer code' : 'updated header/footer code (switched off)', `${s.head.length + s.bodyStart.length + s.footer.length} chars`); ok(c.res, s); }, 'admin');
  get('/api/admin/autoblog', async (c) => ok(c.res, await autoblog.status()), 'admin');
  put('/api/admin/autoblog', async (c) => {
    const b = await readJson(c.req); const s = await autoblog.saveSettings(b);
    if (s.enabled && !(await autoblog.getApiKey(s.provider))) { await autoblog.saveSettings({ ...s, enabled: false }); return fail(c.res, 400, `Add your ${s.provider === 'claude' ? 'Anthropic' : 'Gemini'} API key before turning the AI blog on.`); }
    if (s.enabled && !s.topics.some((t) => t.enabled)) { await autoblog.saveSettings({ ...s, enabled: false }); return fail(c.res, 400, 'Add at least one topic before turning the AI blog on.'); }
    await log(c, s.enabled ? 'AI blog settings saved (on)' : 'AI blog settings saved (off)', `${s.postsPerDay}/day`); ok(c.res, await autoblog.status());
  }, 'admin');
  put('/api/admin/autoblog/key', async (c) => {
    const b = await readJson(c.req); const provider = ['claude', 'pexels'].includes(b.provider) ? b.provider : 'gemini'; const k = str(b.apiKey, 300);
    if (provider === 'pexels') { if (!/^[A-Za-z0-9]{20,}$/.test(k)) return fail(c.res, 400, 'That does not look like a Pexels API key.'); await setSetting(autoblog.keySettingName('pexels'), k); await log(c, 'saved the Pexels API key', ''); return ok(c.res, await autoblog.status()); }
    if (provider === 'claude' && !/^sk-ant-/.test(k)) return fail(c.res, 400, 'That does not look like an Anthropic API key (it starts with sk-ant-).');
    if (provider === 'gemini' && !/^(AIza[\w-]{20,}|AQ\.[\w.-]{20,})$/.test(k)) return fail(c.res, 400, 'That does not look like a Gemini API key (it starts with AIza or AQ.). Create one in Google AI Studio.');
    await setSetting(autoblog.keySettingName(provider), k); if (provider === 'gemini') await autoblog.ensureGeminiModel(k); await log(c, `saved the ${provider === 'claude' ? 'Anthropic' : 'Gemini'} API key`, ''); ok(c.res, await autoblog.status());
  }, 'admin');
  del('/api/admin/autoblog/key', async (c) => {
    const provider = ['claude', 'pexels'].includes(c.query.get('provider')) ? c.query.get('provider') : 'gemini';
    if (provider === 'pexels') { await delSetting(autoblog.keySettingName('pexels')); return ok(c.res, await autoblog.status()); }
    await delSetting(autoblog.keySettingName(provider)); const cur = await autoblog.loadSettings(); if (cur.provider === provider) await autoblog.saveSettings({ ...cur, enabled: false });
    await log(c, `removed the ${provider === 'claude' ? 'Anthropic' : 'Gemini'} API key`, ''); ok(c.res, await autoblog.status());
  }, 'admin');
  get('/api/admin/autoblog/models', async (c) => { try { ok(c.res, { models: await autoblog.listGeminiModels(), imageModels: await autoblog.listGeminiModels(undefined, 'image') }); } catch (e) { send(c.res, 200, { error: e.message, models: [] }); } }, 'admin');
  post('/api/admin/autoblog/test-image', async (c) => { ok(c.res, { result: await autoblog.testImage() }); }, 'admin');
  post('/api/admin/autoblog/run', async (c) => { // "write one now" — does not count toward the daily schedule
    const b = await readJson(c.req);
    try { const r = await autoblog.generateOne({ source: 'manual', topicId: b.topicId }); await log(c, 'AI wrote an article', r.title); ok(c.res, { result: r, ...(await autoblog.status()) }); }
    catch (e) { send(c.res, 200, { error: e.message, ...(await autoblog.status()) }); }
  }, 'admin');

  // ---------- public API (administrators only) ----------
  const apiInfo = async (c) => ({ settings: await apiGate.apiSettings(), keys: await apiGate.listKeys(), baseUrl: `${process.env.PUBLIC_URL || `${(c.req.headers['x-forwarded-proto'] || (c.req.socket.encrypted ? 'https' : 'http')).toString().split(',')[0]}://${c.req.headers['x-forwarded-host'] || c.req.headers.host}`}/api/v1` });
  get('/api/admin/public-api', async (c) => ok(c.res, await apiInfo(c)), 'admin');
  put('/api/admin/public-api', async (c) => { await apiGate.saveApiSettings(await readJson(c.req)); await log(c, 'updated public API settings', ''); ok(c.res, await apiInfo(c)); }, 'admin');
  post('/api/admin/public-api/keys', async (c) => {
    const name = str((await readJson(c.req)).name, 120); if (!name) return fail(c.res, 400, 'Give the key a name (for example “iOS app”).');
    const k = await apiGate.createKey(name); await log(c, 'created an API key', name); ok(c.res, { created: { id: k.id, key: k.key }, ...(await apiInfo(c)) });
  }, 'admin');
  put('/api/admin/public-api/keys/:id/revoke', async (c) => { await apiGate.revokeKey(c.params.id); await log(c, 'revoked an API key', c.params.id); ok(c.res, await apiInfo(c)); }, 'admin');
  del('/api/admin/public-api/keys/:id', async (c) => { await apiGate.deleteKey(c.params.id); await log(c, 'deleted an API key', c.params.id); ok(c.res, await apiInfo(c)); }, 'admin');

  // ---------- media library ----------
  get('/api/admin/media', async (c) => ok(c.res, { media: await all('SELECT id, filename, url, mime, size_bytes, alt, created_at FROM m1313_media ORDER BY created_at DESC') }));
  post('/api/admin/media', async (c) => {
    const buf = await readBuffer(c.req, MAX_UPLOAD);
    if (!buf.length) return fail(c.res, 400, 'No file received.');
    const name = str(c.query.get('filename'), 200) || 'file';
    const f = saveUpload(buf, name); const id = uuid();
    await run('INSERT INTO m1313_media (id, filename, url, mime, size_bytes, alt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, name.slice(0, 255), f.url, f.mime, f.size, '', now()]);
    await log(c, 'uploaded media', name); ok(c.res, { item: await one('SELECT * FROM m1313_media WHERE id = ?', [id]) });
  });
  put('/api/admin/media/:id', async (c) => { const b = await readJson(c.req); await run('UPDATE m1313_media SET alt = ?, filename = ? WHERE id = ?', [str(b.alt, 300), str(b.filename, 255) || 'file', c.params.id]); ok(c.res); });
  del('/api/admin/media/:id', async (c) => {
    const m = await one('SELECT filename, url FROM m1313_media WHERE id = ?', [c.params.id]);
    if (m) { removeUpload(m.url.replace('/uploads/', '')); await run('DELETE FROM m1313_media WHERE id = ?', [c.params.id]); await log(c, 'deleted media', m.filename); }
    ok(c.res);
  });

  // ---------- inboxes ----------
  get('/api/admin/leads', async (c) => ok(c.res, { leads: await all('SELECT * FROM m1313_contact_messages ORDER BY created_at DESC') }));
  put('/api/admin/leads/:id', async (c) => { const b = await readJson(c.req); await run('UPDATE m1313_contact_messages SET status = ? WHERE id = ?', [b.status === 'new' ? 'new' : 'read', c.params.id]); ok(c.res); });
  del('/api/admin/leads/:id', async (c) => { await run('DELETE FROM m1313_contact_messages WHERE id = ?', [c.params.id]); await log(c, 'deleted enquiry', c.params.id); ok(c.res); });
  get('/api/admin/subscribers', async (c) => ok(c.res, { subscribers: await all('SELECT * FROM m1313_newsletter ORDER BY created_at DESC') }));
  del('/api/admin/subscribers/:id', async (c) => { await run('DELETE FROM m1313_newsletter WHERE id = ?', [c.params.id]); ok(c.res); });
  get('/api/admin/song-requests', async (c) => ok(c.res, { requests: await all('SELECT * FROM m1313_song_requests ORDER BY created_at DESC') }));
  del('/api/admin/song-requests/:id', async (c) => { await run('DELETE FROM m1313_song_requests WHERE id = ?', [c.params.id]); ok(c.res); });
  get('/api/admin/members', async (c) => ok(c.res, { members: await all('SELECT id, name, email, wants_briefing, created_at FROM m1313_members ORDER BY created_at DESC') }));
  del('/api/admin/members/:id', async (c) => { await run('DELETE FROM m1313_podcast_follows WHERE member_id = ?', [c.params.id]); await run('DELETE FROM m1313_members WHERE id = ?', [c.params.id]); await log(c, 'deleted member', c.params.id); ok(c.res); }, 'admin');
  get('/api/admin/activity', async (c) => ok(c.res, { activity: await all('SELECT * FROM m1313_activity ORDER BY created_at DESC LIMIT 200') }));

  // ---------- admin users (administrators only) ----------
  get('/api/admin/users', async (c) => ok(c.res, { users: await all('SELECT id, email, name, role, created_at, last_login FROM m1313_admins ORDER BY created_at') }), 'admin');
  post('/api/admin/users', async (c) => {
    const b = await readJson(c.req); const email = str(b.email, 255).toLowerCase();
    if (!isEmail(email) || !str(b.name, 200)) return fail(c.res, 400, 'Name and a valid email are required.');
    if (String(b.password || '').length < 10) return fail(c.res, 400, 'Password must be at least 10 characters.');
    if (await one('SELECT id FROM m1313_admins WHERE email = ?', [email])) return fail(c.res, 409, 'That email already has an account.');
    await run('INSERT INTO m1313_admins (id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)', [uuid(), email, str(b.name, 200), hashPassword(b.password), b.role === 'admin' ? 'admin' : 'editor', now()]);
    await log(c, 'added user', email); ok(c.res);
  }, 'admin');
  put('/api/admin/users/:id', async (c) => {
    const b = await readJson(c.req);
    if (b.role) await run('UPDATE m1313_admins SET role = ? WHERE id = ?', [b.role === 'admin' ? 'admin' : 'editor', c.params.id]);
    if (b.name) await run('UPDATE m1313_admins SET name = ? WHERE id = ?', [str(b.name, 200), c.params.id]);
    if (b.password) { if (String(b.password).length < 10) return fail(c.res, 400, 'Password must be at least 10 characters.'); await run('UPDATE m1313_admins SET password_hash = ? WHERE id = ?', [hashPassword(b.password), c.params.id]); }
    await log(c, 'updated user', c.params.id); ok(c.res);
  }, 'admin');
  del('/api/admin/users/:id', async (c) => {
    if (c.params.id === c.admin.id) return fail(c.res, 400, 'You cannot delete your own account.');
    await run('DELETE FROM m1313_admins WHERE id = ?', [c.params.id]); await log(c, 'deleted user', c.params.id); ok(c.res);
  }, 'admin');
}
