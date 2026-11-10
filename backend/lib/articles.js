// News articles live in m1313_articles. Editors manage them in /admin; the public site reads only published ones.
import { all, one, run, uuid, now } from './db.js';
import { slugify } from './http.js';

const words = (s) => (String(s || '').match(/\S+/g) || []).length;
const parseTags = (v) => { try { const t = JSON.parse(v || '[]'); return Array.isArray(t) ? t : []; } catch { return []; } };

export function shape(r, withContent = false) {
  const a = {
    id: r.id, slug: r.slug, title: r.title, dek: r.dek || '',
    category: r.category, kicker: String(r.category || '').toUpperCase(),
    tags: parseTags(r.tags), author: r.author || null, heroImage: r.hero_image || null,
    status: r.status, publishedAt: r.published_at || r.created_at, updatedAt: r.updated_at,
    readMinutes: Math.max(1, Math.round(words(r.content) / 220)),
  };
  if (withContent) a.content = r.content || '';
  return a;
}

const LIVE = "status = 'published' AND (published_at IS NULL OR published_at <= ?)";

export async function listPublished({ category, limit = 50, exclude } = {}) {
  const args = [now()]; let where = LIVE;
  if (category && category.toLowerCase() !== 'all') { where += ' AND LOWER(category) = ?'; args.push(category.toLowerCase()); }
  if (exclude) { where += ' AND slug <> ?'; args.push(exclude); }
  const rows = await all(`SELECT id, slug, title, dek, category, tags, hero_image, status, author, published_at, created_at, updated_at, content FROM m1313_articles WHERE ${where} ORDER BY published_at DESC, created_at DESC`, args);
  return rows.slice(0, limit).map((r) => shape(r));
}
export async function getPublished(slug) {
  const r = await one(`SELECT * FROM m1313_articles WHERE slug = ? AND ${LIVE}`, [slug, now()]);
  return r ? shape(r, true) : null;
}
export async function homeFeed() {
  const articles = await listPublished({ limit: 200 });
  const [lead, ...rest] = articles;
  const sections = ['Local', 'World', 'Business', 'Entertainment'].map((name) => {
    const items = articles.filter((a) => a.category === name);
    return { name, lead: items[0] ?? null, links: items.slice(1, 3) };
  }).filter((s) => s.lead);
  return { lead: lead ?? null, secondary: rest.slice(0, 3), latest: articles.slice(0, 6), sections };
}

// ---- admin ----
export async function adminList() {
  const rows = await all('SELECT id, slug, title, dek, category, tags, hero_image, status, author, published_at, created_at, updated_at, content FROM m1313_articles ORDER BY updated_at DESC');
  return rows.map((r) => shape(r));
}
export async function adminGet(id) {
  const r = await one('SELECT * FROM m1313_articles WHERE id = ?', [id]);
  return r ? shape(r, true) : null;
}
async function uniqueSlug(base, exceptId) {
  let slug = slugify(base), n = 2;
  for (;;) {
    const hit = await one('SELECT id FROM m1313_articles WHERE slug = ?', [slug]);
    if (!hit || hit.id === exceptId) return slug;
    slug = `${slugify(base)}-${n++}`;
  }
}
export async function adminSave(input, id) {
  const title = String(input.title || '').trim().slice(0, 300);
  if (!title) throw Object.assign(new Error('A title is required.'), { status: 400 });
  const status = input.status === 'published' ? 'published' : 'draft';
  const tags = JSON.stringify((Array.isArray(input.tags) ? input.tags : String(input.tags || '').split(',')).map((t) => String(t).trim()).filter(Boolean).slice(0, 20));
  const slug = await uniqueSlug(input.slug || title, id);
  const fields = [slug, title, String(input.dek || '').slice(0, 1000), String(input.category || 'Local').slice(0, 80), tags, String(input.content || ''), input.heroImage ? String(input.heroImage).slice(0, 500) : null, status, input.author ? String(input.author).slice(0, 200) : null];
  const t = now();
  if (id) {
    const prev = await one('SELECT status, published_at FROM m1313_articles WHERE id = ?', [id]);
    if (!prev) throw Object.assign(new Error('Article not found'), { status: 404 });
    const publishedAt = status === 'published' ? (input.publishedAt || prev.published_at || t) : prev.published_at;
    await run('UPDATE m1313_articles SET slug=?, title=?, dek=?, category=?, tags=?, content=?, hero_image=?, status=?, author=?, published_at=?, updated_at=? WHERE id=?', [...fields, publishedAt, t, id]);
    return id;
  }
  const newId = uuid();
  await run('INSERT INTO m1313_articles (id, slug, title, dek, category, tags, content, hero_image, status, author, published_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [newId, ...fields, status === 'published' ? (input.publishedAt || t) : null, t, t]);
  return newId;
}
export const adminDelete = (id) => run('DELETE FROM m1313_articles WHERE id = ?', [id]);
export async function setStatus(id, status) {
  const t = now();
  await run('UPDATE m1313_articles SET status = ?, published_at = CASE WHEN ? = \'published\' AND published_at IS NULL THEN ? ELSE published_at END, updated_at = ? WHERE id = ?', [status, status, t, t, id]);
}
