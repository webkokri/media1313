// Web Push notifications (browser / Android / installed iOS web apps). VAPID keys are created on first use and kept in the settings table.
import { createHash } from 'node:crypto';
import { sendNotification, generateVAPIDKeys } from 'web-push';
import { all, one, run, uuid, now, getSetting, setSetting } from './db.js';

// What visitors can choose to receive, and what the admin can switch on or off.
export const TOPICS = [
  { id: 'breaking', label: 'Breaking news', desc: 'Urgent headlines as they happen' },
  { id: 'news', label: 'New stories', desc: 'Every new article we publish' },
  { id: 'videos', label: 'New videos', desc: 'When a new video is added' },
  { id: 'live', label: 'Live & shows', desc: 'Going live on TV or radio, special programmes' },
];
export const DEFAULTS = {
  enabled: false,
  newArticle: true,            // a new article is published
  categories: [],              // empty = every category
  aiArticles: false,           // include articles written by the AI blog
  newVideo: true,              // a new video is added
  breaking: true,              // the breaking headline (Site content → Banner) changes
  dailyCap: 8,                 // most automatic notifications per day (manual ones are not counted)
  contact: '',                 // optional mailto: / https: contact for push services (defaults to the site address)
};

export async function getPush() { return { ...DEFAULTS, ...(await getSetting('push', {})) }; }
export async function savePush(b) {
  const cur = await getPush();
  const cats = Array.isArray(b.categories) ? b.categories.map((x) => String(x).slice(0, 80)).slice(0, 40) : cur.categories;
  const out = {
    enabled: !!b.enabled, newArticle: !!b.newArticle, categories: cats, aiArticles: !!b.aiArticles, newVideo: !!b.newVideo, breaking: !!b.breaking,
    dailyCap: Math.min(100, Math.max(1, parseInt(b.dailyCap) || cur.dailyCap)), contact: String(b.contact || '').trim().slice(0, 200),
  };
  await setSetting('push', out); return out;
}

async function vapid() {
  let k = await getSetting('push_vapid', null);
  if (!k?.publicKey) { k = generateVAPIDKeys(); await setSetting('push_vapid', k); }
  return k;
}
export async function publicKey() { return (await vapid()).publicKey; }

const hash = (e) => createHash('sha256').update(e).digest('hex');
const cleanTopics = (t) => [...new Set((Array.isArray(t) ? t : []).map(String).filter((x) => TOPICS.some((y) => y.id === x) || x === 'test'))];

export async function subscribe(sub, topics, agent = '') {
  const endpoint = String(sub?.endpoint || ''); const p256dh = String(sub?.keys?.p256dh || ''); const auth = String(sub?.keys?.auth || '');
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 1500 || !p256dh || !auth) throw Object.assign(new Error('That does not look like a valid push subscription.'), { status: 400 });
  const tp = cleanTopics(topics).join(',') || 'breaking,news';
  const h = hash(endpoint);
  if (await one('SELECT id FROM m1313_push_subs WHERE endpoint_hash = ?', [h])) await run('UPDATE m1313_push_subs SET topics = ?, p256dh = ?, auth = ?, fails = 0 WHERE endpoint_hash = ?', [tp, p256dh, auth, h]);
  else await run('INSERT INTO m1313_push_subs (id, endpoint_hash, endpoint, p256dh, auth, topics, agent, created_at) VALUES (?,?,?,?,?,?,?,?)', [uuid(), h, endpoint, p256dh, auth, tp, String(agent).slice(0, 200), now()]);
  return tp.split(',');
}
export const unsubscribe = (endpoint) => run('DELETE FROM m1313_push_subs WHERE endpoint_hash = ?', [hash(String(endpoint || ''))]);
export async function topicsFor(endpoint) { const r = await one('SELECT topics FROM m1313_push_subs WHERE endpoint_hash = ?', [hash(String(endpoint || ''))]); return r ? r.topics.split(',') : null; }

export async function stats() {
  const rows = await all('SELECT topics FROM m1313_push_subs'); const per = {};
  for (const r of rows) for (const t of r.topics.split(',')) per[t] = (per[t] || 0) + 1;
  return { total: rows.length, perTopic: per };
}
export const recentLog = (n = 30) => all(`SELECT * FROM m1313_push_log ORDER BY created_at DESC LIMIT ${Number(n) || 30}`);

/** Send to everyone who chose `topic` ('all' = every subscriber except test-only browsers). Returns { sent, failed }. */
export async function sendToTopic(topic, { title, body = '', url = '/', image = null, tag }, source = 'manual') {
  title = String(title || '').trim().slice(0, 120); if (!title) throw Object.assign(new Error('A title is required.'), { status: 400 });
  body = String(body || '').slice(0, 240); url = /^(\/|https?:\/\/)/.test(url || '') ? String(url).slice(0, 500) : '/';
  const keys = await vapid(); const cfg = await getPush();
  const subject = /^(mailto:|https:\/\/)/.test(cfg.contact) ? cfg.contact : (process.env.PUBLIC_URL || 'https://media1313.com');
  const rows = await all('SELECT * FROM m1313_push_subs');
  const targets = rows.filter((r) => { const t = r.topics.split(','); return topic === 'all' ? t.some((x) => x !== 'test') : t.includes(topic); });
  const payload = JSON.stringify({ title, body, url, image, tag: tag || `m1313-${topic}` });
  let sent = 0; let failed = 0;
  for (let i = 0; i < targets.length; i += 25) {                      // small batches so a big audience doesn't open hundreds of connections at once
    await Promise.all(targets.slice(i, i + 25).map(async (r) => {
      try {
        await sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, payload, { TTL: 86400, urgency: topic === 'breaking' ? 'high' : 'normal', vapidDetails: { subject, publicKey: keys.publicKey, privateKey: keys.privateKey } });
        sent++; await run('UPDATE m1313_push_subs SET last_ok = ?, fails = 0 WHERE id = ?', [now(), r.id]);
      } catch (e) {
        failed++;
        if (e.statusCode === 404 || e.statusCode === 410) await run('DELETE FROM m1313_push_subs WHERE id = ?', [r.id]);            // the visitor removed the permission
        else await run('UPDATE m1313_push_subs SET fails = fails + 1 WHERE id = ?', [r.id]);
      }
    }));
  }
  await run('INSERT INTO m1313_push_log (id, created_at, source, topic, title, body, url, sent, failed) VALUES (?,?,?,?,?,?,?,?,?)', [uuid(), now(), source, topic, title, body, url, sent, failed]);
  return { sent, failed, audience: targets.length };
}

// ---- automatic triggers (never throw into the caller) ----
async function underCap(cfg) {
  const since = new Date(Date.now() - 24 * 3600e3).toISOString();
  const n = (await one("SELECT COUNT(*) AS n FROM m1313_push_log WHERE source <> 'manual' AND created_at > ?", [since]))?.n ?? 0;
  return Number(n) < cfg.dailyCap;
}
const guard = (fn) => async (...a) => { try { const cfg = await getPush(); if (!cfg.enabled || !(await underCap(cfg))) return null; return await fn(cfg, ...a); } catch (e) { console.error('push trigger failed:', e.message); return null; } };

export const notifyArticle = guard(async (cfg, a) => {
  if (!cfg.newArticle) return null;
  if (!cfg.aiArticles && (a.tags || []).includes('ai-generated')) return null;
  if (cfg.categories.length && !cfg.categories.map((x) => x.toLowerCase()).includes(String(a.category).toLowerCase())) return null;
  return sendToTopic('news', { title: a.title, body: a.dek || '', url: `/news/${a.slug}`, image: a.heroImage || null, tag: `article-${a.slug}` }, 'article');
});
export const notifyVideo = guard(async (cfg, v) => (cfg.newVideo ? sendToTopic('videos', { title: `New video: ${v.title}`, body: v.show || '', url: '/', image: v.poster || null }, 'video') : null));
export const notifyBreaking = guard(async (cfg, headline) => (cfg.breaking && headline ? sendToTopic('breaking', { title: 'Breaking', body: headline, url: '/', tag: 'breaking' }, 'breaking') : null));
