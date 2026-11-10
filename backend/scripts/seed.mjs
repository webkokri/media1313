// Creates MEDIA 1313 tables and loads starter content. Safe to re-run (never overwrites existing content).
//   node --env-file=.env scripts/seed.mjs
import fs from 'node:fs';
import { all, one, run, uuid, now, ensureSchema, upsertContent, dialect } from '../src/lib/db.js';

const read = (f) => JSON.parse(fs.readFileSync(new URL(`../seed/${f}`, import.meta.url), 'utf8'));
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

await ensureSchema();

// --- site content (shows, schedule, podcasts, navigation, ...) ---
for (const [key, value] of Object.entries(read('content.json'))) {
  const exists = await one('SELECT content_key FROM m1313_content WHERE content_key = ?', [key]);
  if (!exists) await upsertContent(key, value);
}

// --- news articles are StudioCMS pages ---
const tables = await all(dialect() === 'mysql' ? 'SHOW TABLES' : "SELECT name FROM sqlite_master WHERE type='table'");
if (!JSON.stringify(tables).includes('StudioCMSPageData')) {
  console.log('StudioCMS tables missing — run `npm run migrate` first, then re-run the seed.');
  process.exit(1);
}

let author = await one("SELECT id FROM StudioCMSUsersTable WHERE username = 'newsroom'");
if (!author) {
  const id = uuid();
  // No password and no permissions row: this is a byline, not a login. Real editors sign up in the dashboard.
  await run('INSERT INTO StudioCMSUsersTable (id, name, username, updatedAt, createdAt, emailVerified) VALUES (?, ?, ?, ?, ?, 0)',
    [id, '1313 Newsroom', 'newsroom', now(), now()]);
  author = { id };
}

const catIds = {};
const articles = read('articles.json');
for (const name of new Set(articles.map((a) => a.cat))) {
  let c = await one('SELECT id FROM StudioCMSPageDataCategories WHERE slug = ?', [slugify(name)]);
  if (!c) {
    await run('INSERT INTO StudioCMSPageDataCategories (description, name, slug, meta) VALUES (?, ?, ?, ?)', [name, name, slugify(name), '{}']);
    c = await one('SELECT id FROM StudioCMSPageDataCategories WHERE slug = ?', [slugify(name)]);
  }
  catIds[name] = Number(c.id);
}

const tagIds = {};
for (const name of new Set(articles.flatMap((a) => a.tags || []))) {
  let t = await one('SELECT id FROM StudioCMSPageDataTags WHERE slug = ?', [slugify(name)]);
  if (!t) {
    await run('INSERT INTO StudioCMSPageDataTags (description, name, slug, meta) VALUES (?, ?, ?, ?)', [name, name, slugify(name), '{}']);
    t = await one('SELECT id FROM StudioCMSPageDataTags WHERE slug = ?', [slugify(name)]);
  }
  tagIds[name] = Number(t.id);
}

let n = 0;
const base = Date.now();
for (const [i, a] of articles.entries()) {
  const slug = slugify(a.title);
  if (await one('SELECT id FROM StudioCMSPageData WHERE slug = ?', [slug])) continue;
  const id = uuid();
  const published = new Date(base - i * 3600e3).toISOString();
  await run(
    `INSERT INTO StudioCMSPageData (id, package, title, description, showOnNav, publishedAt, updatedAt, slug, contentLang, categories, tags, authorId, contributorIds, showAuthor, showContributors, draft, augments)
     VALUES (?, 'studiocms', ?, ?, 0, ?, ?, ?, 'default', ?, ?, ?, '[]', 1, 0, 0, '[]')`,
    [id, a.title, a.dek, published, published, slug, JSON.stringify([catIds[a.cat]]), JSON.stringify((a.tags || []).map((t) => tagIds[t])), author.id]);
  await run('INSERT INTO StudioCMSPageContent (id, contentId, contentLang, content) VALUES (?, ?, ?, ?)', [uuid(), id, 'default', a.content]);
  n++;
}
console.log(`Seed complete (${dialect()}): ${n} new articles.`);
process.exit(0);
